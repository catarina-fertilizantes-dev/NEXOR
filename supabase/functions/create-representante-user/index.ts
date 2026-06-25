// Deno Edge Function: create-representante-user
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { z } from 'https://deno.land/x/zod@v3.23.8/mod.ts';

// ---- Helpers ----
function uuidV4() {
  const buf = new Uint8Array(16);
  crypto.getRandomValues(buf);
  buf[6] = buf[6] & 0x0f | 0x40;
  buf[8] = buf[8] & 0x3f | 0x80;
  const hex = Array.from(buf).map((b) => b.toString(16).padStart(2, '0'));
  return `${hex[0]}${hex[1]}${hex[2]}${hex[3]}-${hex[4]}${hex[5]}-${hex[6]}${hex[7]}-${hex[8]}${hex[9]}-${hex[10]}${hex[11]}${hex[12]}${hex[13]}${hex[14]}${hex[15]}`;
}

const WEAK_PASSWORDS = new Set([
  '123456', '12345678', 'password','senha123','admin123','qwerty','Representante123'
]);

const BodySchema = z.object({
  nome: z.string().trim().min(2).max(100),
  cpf: z.string().trim().min(11).max(14),
  email: z.string().trim().email().max(255),
  telefone: z.string().trim().optional().nullable(),
  regiao_atuacao: z.string().trim().optional().nullable(),
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

function jsonResponse(obj, status) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'content-type': 'application/json', ...corsHeaders }
  });
}

// ---- MAIN ----
Deno.serve(async (req) => {
  const request_id = uuidV4();
  const timestamp = new Date().toISOString();
  const logPrefix = '[create-representante-user]';

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return jsonResponse({
      error: 'Method not allowed',
      stage: 'validation',
      request_id,
      timestamp
    }, 405);
  }

  // --- ENV VARS ---
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_PUBLISHABLE_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    return jsonResponse({
      error: 'Server not configured',
      stage: 'env',
      request_id,
      timestamp
    }, 500);
  }

  // --- VALIDATION ---
  let parsedData = null;
  try {
    const raw = await req.json();
    const parsed = BodySchema.safeParse(raw);
    if (!parsed.success) {
      return jsonResponse({
        error: 'Invalid payload',
        details: parsed.error.flatten(),
        stage: 'validation',
        request_id,
        timestamp
      }, 400);
    }
    parsedData = parsed.data;
  } catch (e) {
    return jsonResponse({
      error: 'Invalid JSON body',
      details: String(e),
      stage: 'validation',
      request_id,
      timestamp
    }, 400);
  }

  // --- BODY FIELDS ---
  const nome = parsedData.nome;
  const cpf_raw = parsedData.cpf;
  const cpf = cpf_raw.replace(/\D/g, ''); // NORMALIZAÇÃO
  const email = parsedData.email.toLowerCase();
  const telefone = parsedData.telefone ?? null;
  const regiao_atuacao = parsedData.regiao_atuacao ?? null;

  // --- PASSWORD ---
  function gerarSenha() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let senha = 'Representante';
    for (let i = 0; i < 4; i++) senha += chars.charAt(Math.floor(Math.random() * chars.length));
    return senha;
  }
  
  let senhaTemporaria = gerarSenha();
  let attempts = 0;
  while ((!senhaTemporaria || WEAK_PASSWORDS.has(senhaTemporaria)) && attempts < 10) {
    senhaTemporaria = gerarSenha();
    attempts++;
  }
  
  if (!senhaTemporaria || WEAK_PASSWORDS.has(senhaTemporaria)) {
    return jsonResponse({
      error: 'Não foi possível gerar uma senha válida',
      stage: 'validation',
      request_id,
      timestamp
    }, 500);
  }

  try {
    // --- AUTH CHECK (admin ou logistica) ---
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } }
    });
    
    const { data: userInfo } = await userClient.auth.getUser();
    const requester = userInfo?.user;
    if (!requester) {
      return jsonResponse({
        error: 'Unauthorized',
        details: 'Missing or invalid auth token',
        stage: 'authCheck',
        request_id,
        timestamp,
        email
      }, 401);
    }
    
    const [{ data: isAdmin, error: roleError1 }, { data: isLogistica, error: roleError2 }] = await Promise.all([
      userClient.rpc('has_role', { _user_id: requester.id, _role: 'admin' }),
      userClient.rpc('has_role', { _user_id: requester.id, _role: 'logistica' }),
    ]);
    
    if (roleError1 || roleError2 || (!isAdmin && !isLogistica)) {
      return jsonResponse({
        error: 'Forbidden: Only admin or logistica can create representantes',
        details: 'Requester lacks required role',
        stage: 'authCheck',
        request_id,
        timestamp,
        email
      }, 403);
    }

    // --- CREATE USER ---
    const serviceClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: authUser, error: authError } = await serviceClient.auth.admin.createUser({
      email,
      password: senhaTemporaria,
      email_confirm: true,
      user_metadata: { nome, cpf, force_password_change: true }
    });
    
    if (authError || !authUser?.user) {
      const msg = authError?.message || 'Unknown creation error';
      const duplicate = /already exists|already been registered|duplicate/i.test(msg);
      const status = duplicate ? 409 : 500;
      return jsonResponse({
        error: duplicate ? 'Duplicidade' : 'Failed to create user',
        details: duplicate ? 'Já existe um usuário com este email.' : msg,
        stage: 'createUser',
        request_id,
        timestamp,
        email
      }, status);
    }
    
    const userId = authUser.user.id;

    // --- ASSIGN ROLE ---
    const { error: roleAssignError } = await serviceClient.from('user_roles').insert({ 
      user_id: userId, 
      role: 'representante' 
    });
    
    if (roleAssignError) {
      await serviceClient.auth.admin.deleteUser(userId);
      return jsonResponse({
        error: 'Failed to assign role',
        details: roleAssignError.message,
        stage: 'assignRole',
        request_id,
        timestamp,
        email
      }, 500);
    }

    // --- CREATE REPRESENTANTE ---
    const { error: representanteError, data: representante } = await serviceClient.from('representantes').insert({
      user_id: userId,
      nome,
      cpf,
      email,
      telefone,
      regiao_atuacao,
      ativo: true,
      temp_password: senhaTemporaria
    }).select().single();
    
    if (representanteError) {
      await serviceClient.from('user_roles').delete().eq('user_id', userId);
      await serviceClient.auth.admin.deleteUser(userId);
      
      const isDuplicateKey = representanteError.code === '23505';
      const isDuplicateEmail = /representantes_email(_unique)?|_email_key/i.test(representanteError.message || '');
      
      let status = 500, errorLabel = 'Failed to create representante record', errorDetails = representanteError.message;
      if (isDuplicateKey && isDuplicateEmail) {
        status = 409;
        errorLabel = 'Duplicidade';
        errorDetails = 'Já existe um representante com este email.';
      }
      
      return jsonResponse({
        error: errorLabel,
        details: errorDetails,
        stage: 'createRepresentante',
        request_id,
        timestamp,
        email,
        cpf,
        nome
      }, status);
    }

    // --- SUCCESS ---
    return jsonResponse({
      success: true,
      user_id: userId,
      representante,
      senha: senhaTemporaria,
      request_id,
      timestamp
    }, 200);

  } catch (err) {
    console.error(logPrefix, 'Unexpected error:', err);
    return jsonResponse({
      error: "Unexpected error",
      details: String(err),
      stage: 'unexpected',
      request_id,
      timestamp
    }, 500);
  }
});