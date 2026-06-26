/**
 * NEXOR — Seed de Dados para Testes de Segurança
 *
 * Execução: node tests/backend/seed-test-data.mjs
 *
 * O que este script faz (idempotente — pode rodar mais de uma vez):
 *  1. Vincula Cliente 1 e Cliente 2 ao Representante 2
 *  2. Garante estoque no Armazém 2 (Produto 1)
 *  3. Cria liberações em vários estados para cobrir todos os cenários de teste
 *
 * IDs fixos do ambiente Dev (vxidpkrsfqyjwwdbvtwc):
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { createClient } = require('../../node_modules/@supabase/supabase-js/dist/main/index.js');

const SUPABASE_URL  = 'https://vxidpkrsfqyjwwdbvtwc.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ4aWRwa3JzZnF5and3ZGJ2dHdjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNjAxMTQsImV4cCI6MjA5MDYzNjExNH0.HHTmcLP0zcOAfFm7JIWA-lJMawC6DgeqXcONxM5g8NY';

// IDs estáticos mapeados durante inspeção do banco
const IDS = {
  cliente1:       '3c3d58a1-6cef-4827-a235-edd4a8d154b5',
  cliente2:       '023531d0-fbc1-4441-8538-0f653c2390a0',
  cliente3:       'd24c6168-1eef-4259-ad64-9277431f6501',
  cliente4:       '97ad5fc4-c8be-4346-af77-08129fbe3404',
  representante1: '51f3c086-1b44-4741-a67e-600479fd194a',
  representante2: '133469f6-3c89-40e1-825b-94dfa07e2c8d',
  armazem1:       '76eab122-8fbf-4d46-9ab8-27a71ca8940e',
  armazem2:       'adf3c8b2-c025-4cbe-868c-d1ce940d8d40',
  produto1:       '0ba5a65a-f7f4-48d2-89a4-1433d8941816',
};

const sb = createClient(SUPABASE_URL, SUPABASE_ANON);

function ok(msg)   { console.log(`  ✅ ${msg}`); }
function info(msg) { console.log(`  ℹ️  ${msg}`); }
function fail(msg, err) { console.error(`  ❌ ${msg}`, err?.message ?? err); }

// ─── Login como admin ─────────────────────────────────────────────────────────

console.log('\n─── Autenticando como admin ───');
const { error: loginErr } = await sb.auth.signInWithPassword({
  email: 'administrador1@nexorops.com.br',
  password: 'DWJ_SHhsc3EN!F2',
});
if (loginErr) { console.error('Login falhou:', loginErr.message); process.exit(1); }
ok('Login como admin confirmado');

const { data: { user } } = await sb.auth.getUser();
const adminId = user.id;

// ─── 1. Vincular representantes aos clientes ──────────────────────────────────

console.log('\n─── 1. Vínculos representante → cliente ───');

for (const [clienteKey, representanteId, label] of [
  ['cliente1', IDS.representante2, 'Cliente 1 → Representante 2'],
  ['cliente2', IDS.representante2, 'Cliente 2 → Representante 2'],
]) {
  const { error } = await sb
    .from('clientes')
    .update({ representante_id: representanteId })
    .eq('id', IDS[clienteKey])
    .is('representante_id', null); // só atualiza se ainda não tiver vínculo

  if (error) {
    fail(`Vincular ${label}`, error);
  } else {
    ok(label);
  }
}

// Confirmar vínculos
const { data: clientes } = await sb
  .from('clientes')
  .select('nome, representante_id')
  .in('id', [IDS.cliente1, IDS.cliente2, IDS.cliente3, IDS.cliente4]);

for (const c of clientes ?? []) {
  info(`${c.nome}: representante_id = ${c.representante_id ?? 'null (sem representante)'}`);
}

// ─── 2. Garantir estoque no Armazém 2 ────────────────────────────────────────

console.log('\n─── 2. Estoque no Armazém 2 ───');

const { data: estoqueExistente } = await sb
  .from('estoque')
  .select('quantidade_disponivel')
  .eq('armazem_id', IDS.armazem2)
  .eq('produto_id', IDS.produto1)
  .single();

if (estoqueExistente) {
  info(`Armazém 2 já tem estoque: ${estoqueExistente.quantidade_disponivel}t — sem alteração`);
} else {
  const { error } = await sb.from('estoque').insert({
    armazem_id:           IDS.armazem2,
    produto_id:           IDS.produto1,
    quantidade_disponivel: 500,
    updated_by:           adminId,
  });
  if (error) fail('Inserir estoque Armazém 2', error);
  else ok('Estoque Armazém 2: 500t inseridos');
}

// ─── 3. Criar liberações de teste ────────────────────────────────────────────

console.log('\n─── 3. Liberações de teste ───');

// Definição dos cenários necessários
const liberacoesNecessarias = [
  // Cliente 1 (representante2) — Armazém 1 — para teste de visibilidade rep2
  {
    key: 'cli1_arm1_disponivel',
    cliente_id:          IDS.cliente1,
    armazem_id:          IDS.armazem1,
    produto_id:          IDS.produto1,
    quantidade_liberada: 100,
    status:              'disponivel',
    pedido_interno:      'TEST-CLI1-ARM1',
    data_liberacao:      '2026-07-01',
  },
  // Cliente 2 (representante2) — Armazém 1 — para teste de visibilidade rep2
  {
    key: 'cli2_arm1_disponivel',
    cliente_id:          IDS.cliente2,
    armazem_id:          IDS.armazem1,
    produto_id:          IDS.produto1,
    quantidade_liberada: 80,
    status:              'disponivel',
    pedido_interno:      'TEST-CLI2-ARM1',
    data_liberacao:      '2026-07-01',
  },
  // Cliente 3 (sem representante) — Armazém 1 — rep1 e rep2 NÃO devem ver
  {
    key: 'cli3_arm1_disponivel',
    cliente_id:          IDS.cliente3,
    armazem_id:          IDS.armazem1,
    produto_id:          IDS.produto1,
    quantidade_liberada: 60,
    status:              'disponivel',
    pedido_interno:      'TEST-CLI3-ARM1',
    data_liberacao:      '2026-07-01',
  },
  // Cliente 4 (representante1) — Armazém 1 — para teste de visibilidade rep1
  {
    key: 'cli4_arm1_disponivel',
    cliente_id:          IDS.cliente4,
    armazem_id:          IDS.armazem1,
    produto_id:          IDS.produto1,
    quantidade_liberada: 120,
    status:              'disponivel',
    pedido_interno:      'TEST-CLI4-ARM1',
    data_liberacao:      '2026-07-01',
  },
  // Cliente 1 — Armazém 2 — para teste de isolamento de armazém
  // armazem1 não deve ver; armazem2 deve ver
  {
    key: 'cli1_arm2_disponivel',
    cliente_id:          IDS.cliente1,
    armazem_id:          IDS.armazem2,
    produto_id:          IDS.produto1,
    quantidade_liberada: 50,
    status:              'disponivel',
    pedido_interno:      'TEST-CLI1-ARM2',
    data_liberacao:      '2026-07-01',
  },
];

const liberacoesIds = {};

for (const lib of liberacoesNecessarias) {
  // Verifica se já existe pelo pedido_interno (idempotência)
  const { data: existente } = await sb
    .from('liberacoes')
    .select('id, status')
    .eq('pedido_interno', lib.pedido_interno)
    .not('status', 'eq', 'cancelada')
    .single();

  if (existente) {
    info(`Liberação ${lib.pedido_interno} já existe (id: ${existente.id}) — pulando`);
    liberacoesIds[lib.key] = existente.id;
    continue;
  }

  const { key, ...payload } = lib;
  const { data, error } = await sb
    .from('liberacoes')
    .insert({ ...payload, created_by: adminId })
    .select('id')
    .single();

  if (error) {
    fail(`Criar liberação ${lib.pedido_interno}`, error);
  } else {
    ok(`Liberação ${lib.pedido_interno} criada (id: ${data.id})`);
    liberacoesIds[key] = data.id;
  }
}

// ─── Resumo ──────────────────────────────────────────────────────────────────

console.log('\n─── Resumo dos IDs criados ───');
for (const [key, id] of Object.entries(liberacoesIds)) {
  if (id) info(`${key}: ${id}`);
}

console.log('\n✅ Seed concluído. Execute agora: node tests/backend/rls-security.mjs\n');
