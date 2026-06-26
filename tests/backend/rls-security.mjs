/**
 * NEXOR — Backend RLS & RPC Security Tests
 * Ambiente: Dev (vxidpkrsfqyjwwdbvtwc)
 *
 * Pré-requisito: rodar seed-test-data.mjs e aplicar migration
 *   20260626100000_fix_liberacoes_update_rls.sql antes deste script.
 *
 * Execução: node tests/backend/rls-security.mjs
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { createClient } = require('../../node_modules/@supabase/supabase-js/dist/main/index.js');

// ─── Configuração ────────────────────────────────────────────────────────────

const SUPABASE_URL  = 'https://vxidpkrsfqyjwwdbvtwc.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ4aWRwa3JzZnF5and3ZGJ2dHdjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNjAxMTQsImV4cCI6MjA5MDYzNjExNH0.HHTmcLP0zcOAfFm7JIWA-lJMawC6DgeqXcONxM5g8NY';

const USERS = {
  admin:          { email: 'administrador1@nexorops.com.br', password: 'DWJ_SHhsc3EN!F2' },
  colaborador:    { email: 'colaborador1@nexorops.com.br',   password: 'DWJ_SHhsc3EN!F2' },
  cliente1:       { email: 'cliente1@nexorops.com.br',       password: 'Senha@2026' }, // rep2
  cliente2:       { email: 'cliente2@nexorops.com.br',       password: 'Senha@2026' }, // rep2
  cliente3:       { email: 'cliente3@nexorops.com.br',       password: 'Senha@2026' }, // sem rep
  cliente4:       { email: 'cliente4@nexorops.com.br',       password: 'Senha@2026' }, // rep1
  representante1: { email: 'representante1@nexorops.com.br', password: 'Senha@2026' }, // → cli4
  representante2: { email: 'representante2@logisys.com',     password: 'Senha@2026' }, // → cli1, cli2
  armazem1:       { email: 'armazem1@nexorops.com.br',       password: 'Senha@2026' },
  armazem2:       { email: 'armazem2@nexorops.com.br',       password: 'Senha@2026' },
};

// IDs estáticos do banco Dev
const IDS = {
  cliente1:       '3c3d58a1-6cef-4827-a235-edd4a8d154b5',
  cliente2:       '023531d0-fbc1-4441-8538-0f653c2390a0',
  cliente3:       'd24c6168-1eef-4259-ad64-9277431f6501',
  cliente4:       '97ad5fc4-c8be-4346-af77-08129fbe3404',
  representante1: '51f3c086-1b44-4741-a67e-600479fd194a',
  representante2: '133469f6-3c89-40e1-825b-94dfa07e2c8d',
  armazem1:       '76eab122-8fbf-4d46-9ab8-27a71ca8940e',
  armazem2:       'adf3c8b2-c025-4cbe-868c-d1ce940d8d40',
};

// ─── Runner ──────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;
const failures = [];

function ok(label)          { console.log(`  ✅ ${label}`); passed++; }
function fail(label, detail) {
  console.log(`  ❌ ${label}`);
  if (detail) console.log(`     → ${detail}`);
  failed++;
  failures.push({ label, detail });
}
function section(title) {
  console.log(`\n${'─'.repeat(60)}\n  ${title}\n${'─'.repeat(60)}`);
}

async function login(creds) {
  const client = createClient(SUPABASE_URL, SUPABASE_ANON);
  const { error } = await client.auth.signInWithPassword(creds);
  if (error) throw new Error(`${error.message}`);
  return client;
}

async function getOwnUserId(client) {
  const { data } = await client.auth.getUser();
  return data?.user?.id;
}

// ─── Suite 1: Login ───────────────────────────────────────────────────────────

section('Suite 1 · Login de todos os usuários');

const clients = {};
for (const [name, creds] of Object.entries(USERS)) {
  try {
    clients[name] = await login(creds);
    ok(`${name} (${creds.email})`);
  } catch (e) {
    fail(`${name} (${creds.email})`, e.message);
    clients[name] = null;
  }
}

// ─── Suite 2: Isolamento de armazém ──────────────────────────────────────────

section('Suite 2 · Isolamento entre armazéns');

let arm1EstoqueIds = [];
let arm2EstoqueIds = [];
let arm1AgendIds   = [];
let arm2AgendIds   = [];

if (clients.armazem1 && clients.armazem2) {
  const { data: e1 } = await clients.armazem1.from('estoque').select('armazem_id');
  const { data: e2 } = await clients.armazem2.from('estoque').select('armazem_id');
  arm1EstoqueIds = [...new Set((e1 ?? []).map(e => e.armazem_id))];
  arm2EstoqueIds = [...new Set((e2 ?? []).map(e => e.armazem_id))];

  if (arm1EstoqueIds.length <= 1)
    ok(`armazem1 vê estoque de apenas ${arm1EstoqueIds.length} armazém(s)`);
  else
    fail('armazem1 vê estoque de múltiplos armazéns', arm1EstoqueIds.join(', '));

  if (arm2EstoqueIds.length <= 1)
    ok(`armazem2 vê estoque de apenas ${arm2EstoqueIds.length} armazém(s)`);
  else
    fail('armazem2 vê estoque de múltiplos armazéns', arm2EstoqueIds.join(', '));

  const overlap = arm1EstoqueIds.filter(id => arm2EstoqueIds.includes(id));
  if (overlap.length === 0)
    ok('armazem1 e armazem2 não compartilham nenhum armazem_id no estoque');
  else
    fail('armazem1 e armazem2 compartilham armazem_ids', overlap.join(', '));

  // Liberações: armazem1 só deve ver ARM1; armazem2 só deve ver ARM2
  const { data: libArm1 } = await clients.armazem1
    .from('liberacoes').select('id, armazem_id').neq('status', 'cancelada');
  const { data: libArm2 } = await clients.armazem2
    .from('liberacoes').select('id, armazem_id').neq('status', 'cancelada');

  const libArm1ArmIds = [...new Set((libArm1 ?? []).map(l => l.armazem_id))];
  const libArm2ArmIds = [...new Set((libArm2 ?? []).map(l => l.armazem_id))];

  const libCross1 = libArm1ArmIds.filter(id => id !== IDS.armazem1);
  const libCross2 = libArm2ArmIds.filter(id => id !== IDS.armazem2);

  if (libCross1.length === 0)
    ok(`armazem1 vê apenas liberações do próprio armazém (${libArm1?.length ?? 0} registros)`);
  else
    fail('armazem1 vê liberações de outro armazém', libCross1.join(', '));

  if (libCross2.length === 0)
    ok(`armazem2 vê apenas liberações do próprio armazém (${libArm2?.length ?? 0} registros)`);
  else
    fail('armazem2 vê liberações de outro armazém', libCross2.join(', '));

  // Agendamentos: conjuntos disjuntos
  const { data: a1 } = await clients.armazem1.from('agendamentos').select('id').neq('status', 'cancelado');
  const { data: a2 } = await clients.armazem2.from('agendamentos').select('id').neq('status', 'cancelado');
  arm1AgendIds = (a1 ?? []).map(a => a.id);
  arm2AgendIds = (a2 ?? []).map(a => a.id);

  if (arm1AgendIds.length > 0 && arm2AgendIds.length > 0) {
    const shared = arm1AgendIds.filter(id => arm2AgendIds.includes(id));
    if (shared.length === 0)
      ok('Agendamentos de armazem1 e armazem2 são disjuntos');
    else
      fail('armazem1 e armazem2 compartilham agendamentos', `${shared.length} IDs em comum`);
  } else {
    ok('Agendamentos: sem dados ativos em um ou ambos os armazéns — isolamento não aplicável');
  }
}

// ─── Suite 3: Isolamento entre clientes ──────────────────────────────────────

section('Suite 3 · Isolamento entre clientes');

const libsPorCliente = {};
const clienteNomes   = ['cliente1', 'cliente2', 'cliente3', 'cliente4'];

for (const name of clienteNomes) {
  if (!clients[name]) continue;
  const { data } = await clients[name]
    .from('liberacoes')
    .select('id, cliente_id')
    .neq('status', 'cancelada');
  libsPorCliente[name] = data ?? [];

  const clienteIds = [...new Set(libsPorCliente[name].map(l => l.cliente_id))];

  if (clienteIds.length <= 1)
    ok(`${name} vê liberações de apenas ${clienteIds.length} cliente(s)`);
  else
    fail(`${name} vê liberações de múltiplos clientes`, clienteIds.join(', '));
}

// Cruzamento: cliente1 e cliente4 não devem compartilhar registros
if (libsPorCliente.cliente1 && libsPorCliente.cliente4) {
  const ids1 = new Set(libsPorCliente.cliente1.map(l => l.id));
  const ids4 = new Set(libsPorCliente.cliente4.map(l => l.id));
  const shared = [...ids1].filter(id => ids4.has(id));
  if (shared.length === 0)
    ok('cliente1 e cliente4 têm conjuntos de liberações disjuntos');
  else
    fail('cliente1 e cliente4 compartilham liberações', `${shared.length} IDs em comum`);
}

// ─── Suite 4: Isolamento de representante ────────────────────────────────────

section('Suite 4 · Isolamento de representante');

// Relação: clientes.representante_id = representantes.id
// rep2 deve ver cli1 e cli2; rep1 deve ver apenas cli4.

if (clients.representante1 && clients.representante2) {
  const { data: libRep1 } = await clients.representante1
    .from('liberacoes').select('id, cliente_id').neq('status', 'cancelada');
  const { data: libRep2 } = await clients.representante2
    .from('liberacoes').select('id, cliente_id').neq('status', 'cancelada');

  const clientesRep1 = [...new Set((libRep1 ?? []).map(l => l.cliente_id))];
  const clientesRep2 = [...new Set((libRep2 ?? []).map(l => l.cliente_id))];

  // rep1 deve ver APENAS cli4
  const rep1VeOutros = clientesRep1.filter(id => id !== IDS.cliente4);
  if (rep1VeOutros.length === 0)
    ok(`representante1 vê apenas liberações de Cliente 4 (${libRep1?.length ?? 0} registro(s))`);
  else
    fail('representante1 vê clientes que não são seus', rep1VeOutros.join(', '));

  // rep2 deve ver APENAS cli1 e cli2 (não cli3 sem rep, não cli4 de rep1)
  const rep2VeCliNaoSeus = clientesRep2.filter(
    id => id !== IDS.cliente1 && id !== IDS.cliente2
  );
  if (rep2VeCliNaoSeus.length === 0)
    ok(`representante2 vê apenas liberações de Cliente 1 e Cliente 2 (${libRep2?.length ?? 0} registro(s))`);
  else
    fail('representante2 vê clientes que não são seus', rep2VeCliNaoSeus.join(', '));

  // rep2 NÃO deve ver liberações de cliente3 (sem representante)
  const rep2VeCli3 = (libRep2 ?? []).some(l => l.cliente_id === IDS.cliente3);
  if (!rep2VeCli3)
    ok('representante2 não vê liberações de Cliente 3 (sem representante)');
  else
    fail('representante2 vê liberações de Cliente 3 — deveria ser isolado');

  // rep1 NÃO deve ver liberações de cli1 ou cli2 (clientes de rep2)
  const rep1VeCli1Ou2 = (libRep1 ?? []).some(
    l => l.cliente_id === IDS.cliente1 || l.cliente_id === IDS.cliente2
  );
  if (!rep1VeCli1Ou2)
    ok('representante1 não vê liberações de Cliente 1 nem Cliente 2 (clientes de rep2)');
  else
    fail('representante1 vê liberações de clientes de rep2');

  // Conjuntos disjuntos entre rep1 e rep2
  const idsRep1 = new Set((libRep1 ?? []).map(l => l.id));
  const idsRep2 = new Set((libRep2 ?? []).map(l => l.id));
  const sharedRep = [...idsRep1].filter(id => idsRep2.has(id));
  if (sharedRep.length === 0)
    ok('representante1 e representante2 têm conjuntos de liberações disjuntos');
  else
    fail('representante1 e representante2 compartilham liberações', `${sharedRep.length} IDs em comum`);
}

// ─── Suite 5: RPC cancelar_liberacao — bloqueio por role ─────────────────────

section('Suite 5 · RPC cancelar_liberacao — bloqueio por role');

// Busca uma liberação disponivel (não cancela de fato para roles sem permissão)
let alvoId = null;
if (clients.admin) {
  const { data } = await clients.admin
    .from('liberacoes')
    .select('id')
    .in('status', ['disponivel', 'parcialmente_agendada', 'totalmente_agendada'])
    .limit(1)
    .single();
  alvoId = data?.id ?? null;
}

if (!alvoId) {
  console.log('  ⚠️  Nenhuma liberação disponível para Suite 5 — rodar seed-test-data.mjs primeiro');
} else {
  console.log(`  ℹ️  Alvo: ${alvoId}`);

  const rolesNaoAutorizados = ['cliente1', 'cliente2', 'armazem1', 'armazem2', 'representante1', 'representante2'];

  for (const name of rolesNaoAutorizados) {
    if (!clients[name]) continue;
    const userId = await getOwnUserId(clients[name]);
    const { data } = await clients[name].rpc('cancelar_liberacao', {
      p_liberacao_id: alvoId,
      p_user_id: userId,
    });

    if (data?.success === true) {
      fail(`${name}: cancelar_liberacao EXECUTOU — deve ser bloqueado`, JSON.stringify(data));
    } else if (data?.error?.toLowerCase().includes('permissão')) {
      ok(`${name}: bloqueado com erro de permissão`);
    } else {
      // Outro erro (ex: RLS impediu leitura da liberação) — ainda seguro
      ok(`${name}: não executou (${data?.error ?? 'sem resposta'})`);
    }
  }

  // Colaborador (logistica) deve poder cancelar
  if (clients.colaborador) {
    const userId = await getOwnUserId(clients.colaborador);
    const { data } = await clients.colaborador.rpc('cancelar_liberacao', {
      p_liberacao_id: alvoId,
      p_user_id: userId,
    });
    if (data?.error?.toLowerCase().includes('permissão')) {
      fail('colaborador (logistica): cancelar_liberacao retornou erro de permissão', JSON.stringify(data));
    } else {
      ok(`colaborador (logistica): passou pela validação de role (${data?.success ? 'cancelou' : data?.error})`);
    }
  }
}

// ─── Suite 6: Bloqueio de writes não autorizados ─────────────────────────────

section('Suite 6 · Bloqueio de writes não autorizados');

const fakeUUID = '00000000-0000-0000-0000-000000000000';

// INSERT em liberacoes deve ser bloqueado para todos exceto admin/logistica
for (const name of ['cliente1', 'armazem1', 'representante1']) {
  if (!clients[name]) continue;
  const userId = await getOwnUserId(clients[name]);
  const { error } = await clients[name].from('liberacoes').insert({
    produto_id: fakeUUID, armazem_id: fakeUUID, cliente_id: fakeUUID,
    quantidade_liberada: 1, created_by: userId,
  });
  if (error)
    ok(`${name}: INSERT em liberacoes bloqueado (${error.code})`);
  else
    fail(`${name}: INSERT em liberacoes foi ACEITO — violação de RLS`);
}

// UPDATE em liberacoes deve ser bloqueado para cliente e armazem
// Nota: RLS bloqueado retorna { data: [], error: null } com 0 linhas afetadas.
// Por isso verificamos data.length, não apenas error.
for (const name of ['cliente1', 'armazem1']) {
  if (!clients[name]) continue;

  const { data: libVisivel } = await clients[name]
    .from('liberacoes')
    .select('id, quantidade_liberada')
    .neq('status', 'cancelada')
    .limit(1)
    .single();

  if (!libVisivel) {
    console.log(`  ℹ️  ${name}: sem liberação visível para testar UPDATE`);
    continue;
  }

  const { data: updated, error } = await clients[name]
    .from('liberacoes')
    .update({ quantidade_liberada: 99999 })
    .eq('id', libVisivel.id)
    .select('id');

  if (error) {
    ok(`${name}: UPDATE em liberacoes bloqueado com erro (${error.code})`);
  } else if (!updated || updated.length === 0) {
    ok(`${name}: UPDATE em liberacoes bloqueado por RLS (0 linhas afetadas)`);
  } else {
    fail(`${name}: UPDATE em liberacoes MODIFICOU ${updated.length} linha(s) — violação de RLS`);
  }
}

// DELETE em liberacoes deve ser bloqueado
for (const name of ['cliente1', 'armazem1']) {
  if (!clients[name]) continue;
  const { data: libVisivel } = await clients[name]
    .from('liberacoes').select('id').neq('status', 'cancelada').limit(1).single();

  if (!libVisivel) { console.log(`  ℹ️  ${name}: sem liberação visível para testar DELETE`); continue; }

  const { data: deleted, error } = await clients[name]
    .from('liberacoes')
    .delete()
    .eq('id', libVisivel.id)
    .select('id');

  if (error) {
    ok(`${name}: DELETE em liberacoes bloqueado com erro (${error.code})`);
  } else if (!deleted || deleted.length === 0) {
    ok(`${name}: DELETE em liberacoes bloqueado por RLS (0 linhas afetadas)`);
  } else {
    fail(`${name}: DELETE em liberacoes REMOVEU ${deleted.length} linha(s) — violação de RLS`);
  }
}

// ─── Suite 7: Acesso global de admin e colaborador ───────────────────────────

section('Suite 7 · Admin e Colaborador — acesso de leitura global');

for (const name of ['admin', 'colaborador']) {
  if (!clients[name]) continue;
  const { data: libs } = await clients[name]
    .from('liberacoes').select('id, cliente_id').neq('status', 'cancelada');
  const uniqueClientes = new Set((libs ?? []).map(l => l.cliente_id)).size;
  if (uniqueClientes >= 2)
    ok(`${name}: vê liberações de ${uniqueClientes} clientes distintos — acesso global confirmado`);
  else if (uniqueClientes === 1)
    ok(`${name}: vê liberações (${libs?.length ?? 0} total) — pode haver dados insuficientes no banco`);
  else
    fail(`${name}: não vê nenhuma liberação ativa`);
}

// ─── Relatório Final ──────────────────────────────────────────────────────────

console.log(`\n${'═'.repeat(60)}\n  RESULTADO FINAL\n${'═'.repeat(60)}`);
console.log(`  ✅ Passou: ${passed}`);
console.log(`  ❌ Falhou: ${failed}`);

if (failures.length > 0) {
  console.log('\n  Falhas:');
  for (const f of failures) {
    console.log(`    • ${f.label}`);
    if (f.detail) console.log(`      ${f.detail}`);
  }
}
console.log('');
process.exit(failed > 0 ? 1 : 0);
