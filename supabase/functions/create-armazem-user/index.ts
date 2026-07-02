// Edge Function: create-armazem-user (V3 - Corrigido e atualizado para salvar email, cep e cnpj_cpf)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { z } from 'https://deno.land/x/zod@v3.23.8/mod.ts';
// ---- Helpers ----
function uuidV4() {
  const buf = new Uint8Array(16);
  crypto.getRandomValues(buf);
  buf[6] = buf[6] & 0x0f | 0x40;
  buf[8] = buf[8] & 0x3f | 0x80;
  const hex = Array.from(buf).map((b)=>b.toString(16).padStart(2, '0'));
  return `${hex[0]}${hex[1]}${hex[2]}${hex[3]}-${hex[4]}${hex[5]}-${hex[6]}${hex[7]}-${hex[8]}${hex[9]}-${hex[10]}${hex[11]}${hex[12]}${hex[13]}${hex[14]}${hex[15]}`;
}
const WEAK_PASSWORDS = new Set([
  '123456',
  '12345678',
  'password',
  'senha123',
  'admin123',
  'qwerty',
  'Armazem123'
]);
const validatePassword = (password)=>{
  return password.length >= 6 && password.length <= 128 && !WEAK_PASSWORDS.has(password.toLowerCase());
};
// ATUALIZAÇÃO: BodySchema agora inclui email, cep e cnpj_cpf como campos opcionais ou obrigatórios.
const BodySchema = z.object({
  nome: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(255),
  cidade: z.string().trim().min(2).max(100),
  estado: z.string().length(2),
  capacidade_total: z.number().min(0).optional().nullable(),
  telefone: z.string().trim().optional().nullable(),
  endereco: z.string().trim().optional().nullable(),
  cep: z.string().trim().min(5).max(10).optional().nullable(),      // <-- novo campo
  cnpj_cpf: z.string().trim().min(11).max(18),                     // <-- novo campo, obrigatório (igual ao frontend)
});
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};
function jsonResponse(obj, status) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      'content-type': 'application/json',
      ...corsHeaders
    }
  });
}
Deno.serve(async (req)=>{
  const request_id = uuidV4();
  const timestamp = new Date().toISOString();
  const logPrefix = '[create-armazem-user]';
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  if (req.method !== 'POST') {
    return jsonResponse({
      error: 'Method not allowed',
      stage: 'validation',
      request_id,
      timestamp
    }, 405);
  }
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

  // EXTRAI OS NOVOS CAMPOS TAMBÉM
  const { nome, email, cidade, estado, capacidade_total, telefone, endereco, cep, cnpj_cpf } = parsedData;
  const emailLower = email.toLowerCase();
  console.log(logPrefix, 'Start request', {
    email: emailLower,
    nome,
    cidade,
    request_id,
    cep,
    cnpj_cpf
  });
  // Check permissions
  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: req.headers.get('Authorization') ?? ''
      }
    }
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
      email: emailLower
    }, 401);
  }
  console.log(logPrefix, 'Requester', {
    id: requester.id
  });
  const { data: hasPermission, error: roleCheckError } = await userClient.rpc('has_role', {
    _user_id: requester.id,
    _role: 'admin'
  });
  const { data: hasLogisticaRole } = await userClient.rpc('has_role', {
    _user_id: requester.id,
    _role: 'logistica'
  });
  if (roleCheckError || !hasPermission && !hasLogisticaRole) {
    return jsonResponse({
      error: 'Forbidden: Only admin or logistica can create armazem users',
      details: 'Requester lacks required role',
      stage: 'authCheck',
      request_id,
      timestamp,
      email: emailLower
    }, 403);
  }
  // Generate password
  const gerarSenha = ()=>{
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let senha = 'Armazem';
    for(let i = 0; i < 4; i++){
      senha += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return senha;
  };
  let senhaTemporaria = gerarSenha();
  let attempts = 0;
  const MAX_ATTEMPTS = 10;
  while(!validatePassword(senhaTemporaria) && attempts < MAX_ATTEMPTS){
    senhaTemporaria = gerarSenha();
    attempts++;
  }
  if (!validatePassword(senhaTemporaria)) {
    return jsonResponse({
      error: 'Nao foi possivel gerar uma senha valida',
      details: 'Password generation failed after multiple attempts',
      stage: 'validation',
      request_id,
      timestamp,
      email: emailLower
    }, 500);
  }
  const serviceClient = createClient(supabaseUrl, serviceRoleKey);
  // 1. Create Auth user
  console.log(logPrefix, 'Creating user', {
    email: emailLower
  });
  const { data: authUser, error: authError } = await serviceClient.auth.admin.createUser({
    email: emailLower,
    password: senhaTemporaria,
    email_confirm: true,
    user_metadata: {
      nome,
      cidade,
      estado,
      force_password_change: true
    }
  });
  if (authError || !authUser?.user) {
    const msg = authError?.message || 'Unknown creation error';
    const duplicate = /already exists|duplicate|already been registered/i.test(msg);
    const status = duplicate ? 409 : 500;
    console.error(logPrefix, 'Create user error', authError);
    let errorDetails = msg;
    if (duplicate) {
      errorDetails = 'Este email ja esta cadastrado no sistema. ';
    }
    return jsonResponse({
      error: 'Failed to create user',
      details: errorDetails,
      stage: 'createUser',
      request_id,
      timestamp,
      email: emailLower,
      supabase_error_code: authError?.status
    }, status);
  }
  const userId = authUser.user.id;
  console.log(logPrefix, 'User created', {
    userId
  });
  // Post-create verification with retry
  let verify = await serviceClient.auth.admin.getUserById(userId);
  if (!verify?.data?.user) {
    console.log(logPrefix, 'First verify failed, retrying.. .');
    await new Promise((resolve)=>setTimeout(resolve, 500));
    verify = await serviceClient.auth.admin.getUserById(userId);
  }
  if (!verify?.data?.user) {
    console.error(logPrefix, 'Post-create verification failed, rolling back.');
    await serviceClient.auth.admin.deleteUser(userId);
    return jsonResponse({
      error: 'Post creation verification failed',
      details: 'User not retrievable after creation',
      stage: 'postCreateVerify',
      request_id,
      timestamp,
      email: emailLower
    }, 500);
  }
  // 2.  Assign role "armazem" with rollback
  const { error: roleError } = await serviceClient.from('user_roles').insert({
    user_id: userId,
    role: 'armazem'
  });
  if (roleError) {
    console.error(logPrefix, 'Role error, rolling back', roleError);
    await serviceClient.auth.admin.deleteUser(userId);
    return jsonResponse({
      error: 'Failed to assign role',
      details: roleError.message,
      stage: 'assignRole',
      request_id,
      timestamp,
      email: emailLower
    }, 500);
  }
  console.log(logPrefix, 'Role assigned', {
    userId,
    role: 'armazem'
  });
  // 3. Create armazem record with rollback
  // ✅ MODIFICAÇÃO: INCLUA temp_password no insert!
  const { data: armazem, error: armazemError } = await serviceClient.from('armazens').insert({
    nome,
    cidade,
    estado,
    email: emailLower,
    capacidade_total: capacidade_total || null,
    capacidade_disponivel: capacidade_total || null,
    telefone: telefone || null,
    endereco: endereco || null,
    cep: cep || null,
    cnpj_cpf: cnpj_cpf,
    user_id: userId,
    ativo: true,
    temp_password: senhaTemporaria  // ✅ NOVA LINHA - Salvar senha temporária
  }).select().single();
  
  if (armazemError) {
    console.error(logPrefix, 'Armazem insert error, rolling back', armazemError);
    // Rollback: delete role and user
    await serviceClient.from('user_roles').delete().eq('user_id', userId);
    await serviceClient.auth.admin.deleteUser(userId);
    // Check if error is duplicate nome or cidade
    const isDuplicateNome = armazemError.message?.includes('armazens_nome_unique') || armazemError.message?.includes('armazens_nome_key');
    const isDuplicateCidade = armazemError.message?.includes('armazens_cidade_unique') || armazemError.message?.includes('armazens_cidade_key');
    let errorDetails = armazemError.message;
    if (isDuplicateNome) {
      errorDetails = 'Ja existe um armazem com este nome.';
    } else if (isDuplicateCidade) {
      errorDetails = 'Ja existe um armazem nesta cidade.';
    }
    return jsonResponse({
      error: 'Failed to create armazem record',
      details: errorDetails,
      stage: 'createArmazem',
      request_id,
      timestamp,
      email: emailLower,
      nome,
      cidade
    }, 500);
  }
  console.log(logPrefix, 'Armazem record created', {
    userId,
    nome,
    cidade,
    cep,
    cnpj_cpf
  });
  return jsonResponse({
    success: true,
    user_id: userId,
    armazem,
    senha: senhaTemporaria,
    timestamp,
    request_id
  }, 200);
});