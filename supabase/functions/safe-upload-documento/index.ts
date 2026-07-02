// Deno Edge Function: safe-upload-documento
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { z } from 'https://deno.land/x/zod@v3.23.8/mod.ts';

const BodySchema = z.object({
  carregamento_id: z.string().uuid(),
  file_ext: z.string().max(10),
  file_type: z.string().max(50),
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

Deno.serve(async (req) => {
  const timestamp = new Date().toISOString();
  const request_id = crypto.randomUUID();

  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Only POST allowed.', request_id }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) {
    return jsonResponse({ error: 'Server improperly configured', request_id, timestamp }, 500);
  }
  const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY'), {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } }
  });
  const serviceClient = createClient(supabaseUrl, serviceKey);

  let parsed;
  try {
    const raw = await req.json();
    const res = BodySchema.safeParse(raw);
    if (!res.success) {
      return jsonResponse({ error: 'Invalid payload', details: res.error.flatten(), request_id }, 400);
    }
    parsed = res.data;
  } catch (e) {
    return jsonResponse({ error: 'Invalid JSON payload', request_id }, 400);
  }
  const { carregamento_id, file_ext, file_type } = parsed;

  const { data: userInfo } = await userClient.auth.getUser();
  const user = userInfo?.user;
  if (!user) {
    return jsonResponse({ error: 'Unauthorized', request_id }, 401);
  }

  // RBAC: admin, logistica, ou armazem vinculado pode subir documento
  const { data: pode, error: roleError } = await serviceClient.rpc('can_upload_documento_for_carregamento', {
    _user_id: user.id,
    _carregamento_id: carregamento_id
  });
  if (roleError) {
    return jsonResponse({ error: 'RBAC lookup error', details: roleError.message, request_id }, 500);
  }
  if (!pode) {
    return jsonResponse({ error: 'Forbidden. User cannot upload documentos for this carregamento.', request_id }, 403);
  }

  const filePath = `${carregamento_id}/${user.id}_${Date.now()}.${file_ext}`;
  const { data: signedUrlObj, error: signedUrlError } = await serviceClient
    .storage
    .from('carregamentos-documentos')
    .createSignedUploadUrl(filePath, 600);

  if (signedUrlError || !signedUrlObj) {
    return jsonResponse({ error: 'Failed to create signed upload URL', details: signedUrlError?.message, request_id }, 500);
  }

  return jsonResponse({
    success: true,
    signed_url: signedUrlObj.url,
    filePath,
    request_id,
    expires_in: 600
  }, 200);
});