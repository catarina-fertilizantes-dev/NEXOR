// Deno Edge Function: create-customer-user (alinhada com admin-users)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { z } from 'https://deno.land/x/zod@v3.23.8/mod.ts';

// Helpers  
function uuidV4() {
  const buf = new Uint8Array(16);
  crypto.getRandomValues(buf);
  buf[6] = buf[6] & 0x0f | 0x40;
  buf[8] = buf[8] & 0x3f | 0x80;
  const hex = Array.from(buf).map((b) => b.toString(16).padStart(2, '0'));
  return `${hex[0]}${hex[1]}${hex[2]}${hex[3]}-${hex[4]}${hex[5]}-${hex[6]}${hex[7]}-${hex[8]}${hex[9]}-${hex[10]}${hex[11]}${hex[12]}${hex[13]}${hex[14]}${hex[15]}`;
}
const WEAK_PASSWORDS = new Set([
  '123456', '12345678', 'password','senha123','admin123','qwerty','Cliente123'
]);
const BodySchema = z.object({
  nome: z.string().trim().min(2).max(100),
  cnpj_cpf: z.string().trim().min(11).max(18),
  email: z.string().trim().email().max(255),
  telefone: z.string().trim().optional().nullable(),
  endereco: z.string().trim().optional().nullable(),
  cidade: z.string().trim().optional().nullable(),
  estado: z.string().length(2).optional().nullable(),
  cep: z.string().trim().optional().nullable(),
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
  const logPrefix = '[create-customer-user]';

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return jsonResponse({
      error: 'Method not allowed',
      details: 'Only POST allowed.',
      stage: 'validation',
      request_id,
      timestamp
    }, 405);
  }

  // --- ENV VARS ---
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_PUBLISHABLE_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const envStatus = {
    hasUrl: !!supabaseUrl,
    hasAnon: !!supabaseAnonKey,
    hasServiceRole: !!serviceRoleKey
  };
  if (!envStatus.hasUrl || !envStatus.hasAnon || !envStatus.hasServiceRole) {
    console.error(logPrefix, 'Missing env vars', envStatus);
    return jsonResponse({
      error: 'Server not configured',
      details: envStatus,
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
    console.error(logPrefix, 'JSON parse error', e);
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
  const cnpj_cpf_raw = parsedData.cnpj_cpf;
  const cnpj_cpf = cnpj_cpf_raw.replace(/\D/g, ''); // NORMALIZAÇÃO
  const email = parsedData.email.toLowerCase();
  const telefone = parsedData.telefone ?? null;
  const endereco = parsedData.endereco ?? null;
  const cidade = parsedData.cidade ?? null;
  const estado = parsedData.estado ?? null;
  const cep = parsedData.cep ?? null;

  // --- PASSWORD ---
  function gerarSenha() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let senha = 'Cliente';
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
      error: 'Nao foi possivel gerar uma senha valida',
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
        error: 'Forbidden: Only admin or logistica can create customers',
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
      user_metadata: { nome, cnpj_cpf, force_password_change: true }
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
    const { error: roleAssignError } = await serviceClient.from('user_roles').insert({ user_id: userId, role: 'cliente' });
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

    // --- CREATE CLIENTE/ROLLBACK DUPLICITY ---
    const { error: clienteError, data: cliente } = await serviceClient.from('clientes').insert({
      user_id: userId,
      nome,
      cnpj_cpf,
      email,
      telefone,
      endereco,
      cidade,
      estado,
      cep,
      ativo: true,
      temp_password: senhaTemporaria  // ✅ NOVA LINHA - Salvar senha temporária
    }).select().single();
    
    if (clienteError) {
      await serviceClient.from('user_roles').delete().eq('user_id', userId);
      await serviceClient.auth.admin.deleteUser(userId);
      // Consistente e robusta para duplicidade
      const isDuplicateKey = clienteError.code === '23505';
      const isDuplicateEmail = /clientes_email(_unique)?|_email_key/i.test(clienteError.message || '');
      const isDuplicateCNPJ = /clientes_cnpj_cpf(_unique)?|_cnpj_cpf_key/i.test(clienteError.message || '');
      let status = 500, errorLabel = 'Failed to create cliente record', errorDetails = clienteError.message;
      if (isDuplicateKey && (isDuplicateEmail || isDuplicateCNPJ)) {
        status = 409;
        errorLabel = 'Duplicidade';
        if (isDuplicateEmail) errorDetails = 'Já existe um cliente com este email.';
        else if (isDuplicateCNPJ) errorDetails = 'Já existe um cliente com este CNPJ/CPF.';
        else errorDetails = 'Já existe um cliente com dados duplicados.';
      }
      return jsonResponse({
        error: errorLabel,
        details: errorDetails,
        stage: 'createCliente',
        request_id,
        timestamp,
        email,
        cnpj_cpf,
        nome
      }, status);
    }

    // --- SUCCESS ---
    return jsonResponse({
      success: true,
      user_id: userId,
      cliente,
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