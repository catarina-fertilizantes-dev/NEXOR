/**
 * NEXOR — Testes Completos de Segurança e Lógica de Negócio (Backend)
 *
 * Execução: node tests/backend/rls-full.mjs
 *
 * Cobre:
 *  Suite 1 — Integridade e isolamento de Estoque
 *  Suite 2 — Isolamento de Agendamentos
 *  Suite 3 — Isolamento de Carregamentos
 *  Suite 4 — Escritas não autorizadas em Produtos
 *  Suite 5 — Leitura não autorizada de Colaboradores e Clientes
 *  Suite 6 — Escritas não autorizadas em Carregamentos (cliente/representante)
 *  Suite 7 — RPCs sensíveis (alterar_armazem, cancelar)
 *  Suite 8 — Lógica de estoque (criação → liberação → cancelamento → invariantes)
 *  Suite 8 — editar_agendamento / cancelar_agendamento (role e trava de etapa)
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { createClient } = require('../../node_modules/@supabase/supabase-js/dist/main/index.js');

const SUPABASE_URL  = 'https://vxidpkrsfqyjwwdbvtwc.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ4aWRwa3JzZnF5and3ZGJ2dHdjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNjAxMTQsImV4cCI6MjA5MDYzNjExNH0.HHTmcLP0zcOAfFm7JIWA-lJMawC6DgeqXcONxM5g8NY';

// Atualizado em 2026-07-15 a partir dos dados reais em Dev (base foi limpa para
// testes de criação de usuário — ver memória project-nexor-test-credentials-churn).
// representante2 (Representante Teste 2) foi criado via UI real especificamente
// para restaurar a cobertura de isolamento entre representantes deste suite.
const IDS = {
  cliente1:       'cdf69e74-7ed8-48ae-b0ce-9de409728cdd', // Cliente 1 — representado por representante2
  cliente2:       'a17ccf3d-e4bb-40e6-b9b4-1a97dff4514a', // Fazenda São João — representado por representante2
  cliente3:       'f3768e10-0abe-4001-87f3-5533f3104d85', // Agro Centro-Oeste Ltda — representado por representante1
  cliente4:       'eb15e1f9-4f7d-4c9e-98f3-9050a17ef4df', // Fazenda Serra Verde — representado por representante1
  representante1: '9a7b2594-7468-4817-966a-4a3304b6c480', // João Representações
  representante2: '2455ae16-4b91-44a7-be44-cb457f78ae92', // Representante Teste 2
  armazem1:       '1249e35e-7df5-4228-a319-93ae1fbff8f6', // Armazém Joinville
  armazem2:       '18606706-f260-40e9-ad9f-118954728346', // Armazém Porto Alegre
  produto1:       '15cf2cd4-7284-44fd-94e0-61618a3958e5', // Ureia 46% (o que tem estoque/liberação reais)
};

// Credenciais vêm de tests/backend/.env.local (gitignored) — nunca hardcode
// email/senha aqui. Rodar com: node --env-file=tests/backend/.env.local ...
function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Variável de ambiente ${name} não definida (ver tests/backend/.env.local)`);
  return value;
}
const CREDS = {
  admin:          { email: requireEnv('TEST_ADMIN_EMAIL'),           password: requireEnv('TEST_ADMIN_PASSWORD') },
  colaborador:    { email: requireEnv('TEST_COLABORADOR_EMAIL'),     password: requireEnv('TEST_COLABORADOR_PASSWORD') },
  cliente1:       { email: requireEnv('TEST_CLIENTE1_EMAIL'),        password: requireEnv('TEST_CLIENTE1_PASSWORD') },
  cliente2:       { email: requireEnv('TEST_CLIENTE_FAZENDA_SJ_EMAIL'), password: requireEnv('TEST_CLIENTE_FAZENDA_SJ_PASSWORD') },
  cliente3:       { email: requireEnv('TEST_CLIENTE_AGRO_EMAIL'),    password: requireEnv('TEST_CLIENTE_AGRO_PASSWORD') },
  representante1: { email: requireEnv('TEST_REPRESENTANTE1_EMAIL'), password: requireEnv('TEST_REPRESENTANTE1_PASSWORD') },
  representante2: { email: requireEnv('TEST_REPRESENTANTE2_EMAIL'), password: requireEnv('TEST_REPRESENTANTE2_PASSWORD') },
  armazem1:       { email: requireEnv('TEST_ARMAZEM1_EMAIL'),       password: requireEnv('TEST_ARMAZEM1_PASSWORD') },
  armazem2:       { email: requireEnv('TEST_ARMAZEM2_EMAIL'),       password: requireEnv('TEST_ARMAZEM2_PASSWORD') },
};

// ─── Contadores globais ──────────────────────────────────────────────────────

let passed = 0;
let failed = 0;
const failures = [];

function assert(cond, label) {
  if (cond) {
    console.log(`    ✅ ${label}`);
    passed++;
  } else {
    console.error(`    ❌ ${label}`);
    failed++;
    failures.push(label);
  }
}

function suite(name) {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`Suite: ${name}`);
  console.log('─'.repeat(60));
}

function info(msg) { console.log(`  ℹ️  ${msg}`); }

async function login(email, password) {
  const sb = createClient(SUPABASE_URL, SUPABASE_ANON);
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`Login falhou para ${email}: ${error.message}`);
  return sb;
}

// ─── Autenticar todos os usuários ───────────────────────────────────────────

console.log('\n🔐 Autenticando usuários...');
const clients = {};
for (const [key, cred] of Object.entries(CREDS)) {
  try {
    clients[key] = await login(cred.email, cred.password);
    console.log(`  ✅ ${key}`);
  } catch (e) {
    console.error(`  ❌ ${key}: ${e.message}`);
    process.exit(1);
  }
}

// ─── Carregar dados existentes para referência ──────────────────────────────

console.log('\n📋 Carregando dados de referência...');
const sbAdmin = clients.admin;

// Estoque atual
const { data: estoqueInicial } = await sbAdmin.from('estoque')
  .select('armazem_id, produto_id, quantidade, quantidade_disponivel');

// Liberações ativas
const { data: liberacoesAtivas } = await sbAdmin.from('liberacoes')
  .select('id, pedido_interno, cliente_id, armazem_id, status, quantidade_liberada, quantidade_retirada')
  .not('status', 'eq', 'cancelada');

// Agendamentos existentes
const { data: agendamentosExistentes } = await sbAdmin.from('agendamentos')
  .select('id, cliente_id, armazem_id, liberacao_id, status')
  .not('status', 'eq', 'cancelado');

// Carregamentos existentes
const { data: carregamentosExistentes } = await sbAdmin.from('carregamentos')
  .select('id, agendamento_id, armazem_id, cliente_id, etapa_atual');

info(`Estoque: ${estoqueInicial?.length ?? 0} registros`);
info(`Liberações ativas: ${liberacoesAtivas?.length ?? 0}`);
info(`Agendamentos ativos: ${agendamentosExistentes?.length ?? 0}`);
info(`Carregamentos: ${carregamentosExistentes?.length ?? 0}`);

const estoqueArm1 = estoqueInicial?.find(e => e.armazem_id === IDS.armazem1);
const estoqueArm2 = estoqueInicial?.find(e => e.armazem_id === IDS.armazem2);

const agendamentosArm1 = agendamentosExistentes?.filter(a => a.armazem_id === IDS.armazem1) ?? [];
const agendamentosArm2 = agendamentosExistentes?.filter(a => a.armazem_id === IDS.armazem2) ?? [];
const agendamentosCli1 = agendamentosExistentes?.filter(a => a.cliente_id === IDS.cliente1) ?? [];
const agendamentosCli2 = agendamentosExistentes?.filter(a => a.cliente_id === IDS.cliente2) ?? [];

const carregamentosArm1 = carregamentosExistentes?.filter(c => c.armazem_id === IDS.armazem1) ?? [];
const carregamentosArm2 = carregamentosExistentes?.filter(c => c.armazem_id === IDS.armazem2) ?? [];
const carregamentosCli1 = carregamentosExistentes?.filter(c => c.cliente_id === IDS.cliente1) ?? [];

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 1 — ESTOQUE: integridade de dados e isolamento por role
// ══════════════════════════════════════════════════════════════════════════════

suite('1 — Estoque: integridade e isolamento por role');

// 1.1 Invariante: disponível ≤ físico
if (estoqueArm1) {
  assert(
    estoqueArm1.quantidade_disponivel <= estoqueArm1.quantidade,
    `Armazém 1 — disponível (${estoqueArm1.quantidade_disponivel}t) ≤ físico (${estoqueArm1.quantidade}t)`
  );
}
if (estoqueArm2) {
  assert(
    estoqueArm2.quantidade_disponivel <= estoqueArm2.quantidade,
    `Armazém 2 — disponível (${estoqueArm2.quantidade_disponivel}t) ≤ físico (${estoqueArm2.quantidade}t)`
  );
  if (estoqueArm2.quantidade_disponivel > estoqueArm2.quantidade) {
    console.log(`    ⚠️  BUG DETECTADO: Armazém 2 tem disponível > físico — dado corrompido pelo seed`);
  }
}

// 1.2 Armazém 1 vê apenas o próprio estoque
const { data: estArm1 } = await clients.armazem1.from('estoque').select('armazem_id, quantidade, quantidade_disponivel');
assert(
  estArm1?.length === 1 && estArm1[0].armazem_id === IDS.armazem1,
  `armazem1 vê apenas 1 registro de estoque (o seu)`
);
assert(
  !estArm1?.some(e => e.armazem_id === IDS.armazem2),
  `armazem1 não vê estoque do armazem2`
);

// 1.3 Armazém 2 vê apenas o próprio estoque
const { data: estArm2 } = await clients.armazem2.from('estoque').select('armazem_id');
assert(
  estArm2?.every(e => e.armazem_id === IDS.armazem2),
  `armazem2 vê apenas o próprio estoque`
);

// 1.4 Cliente não deve conseguir ler estoque
const { data: estCli } = await clients.cliente1.from('estoque').select('armazem_id');
assert(
  !estCli || estCli.length === 0,
  `cliente1 não consegue ler a tabela estoque`
);

// 1.5 Representante não deve conseguir ler estoque
const { data: estRep } = await clients.representante1.from('estoque').select('armazem_id');
assert(
  !estRep || estRep.length === 0,
  `representante1 não consegue ler a tabela estoque`
);

// 1.6 Admin e logistica vêem todos
const { data: estAdmin } = await clients.admin.from('estoque').select('armazem_id');
assert(estAdmin && estAdmin.length >= 2, `admin vê todos os registros de estoque`);

const { data: estColab } = await clients.colaborador.from('estoque').select('armazem_id');
assert(estColab && estColab.length >= 2, `logistica vê todos os registros de estoque`);

// 1.7 Cliente NÃO pode fazer INSERT direto em estoque (BUG ESPERADO — confirma a falha)
const { error: insertEstoqueCli, data: insertEstoqueCliData } = await clients.cliente1
  .from('estoque')
  .insert({ armazem_id: IDS.armazem1, produto_id: IDS.produto1, quantidade: 999, quantidade_disponivel: 999 })
  .select('id');
const estoqueInsertBloqueado = !!insertEstoqueCli || !insertEstoqueCliData?.length;
assert(
  estoqueInsertBloqueado,
  `cliente1 NÃO consegue fazer INSERT direto em estoque`
);
if (!estoqueInsertBloqueado) {
  console.log(`    ⚠️  FALHA DE SEGURANÇA: cliente1 inseriu linha em estoque com 999t!`);
  // Limpar se inseriu
  await clients.admin.from('estoque').delete().eq('armazem_id', IDS.armazem1).eq('produto_id', IDS.produto1).neq('id', estoqueArm1?.id ?? '');
}

// 1.8 Armazém NÃO pode fazer UPDATE direto em estoque (BUG ESPERADO — confirma a falha)
const qtdOriginalArm1 = estoqueArm1?.quantidade ?? 0;
const { data: updateEstoqueArm } = await clients.armazem1
  .from('estoque')
  .update({ quantidade: 9999 })
  .eq('armazem_id', IDS.armazem1)
  .select('quantidade');
const estoqueUpdateBloqueado = !updateEstoqueArm?.length || updateEstoqueArm[0]?.quantidade === qtdOriginalArm1;
assert(
  estoqueUpdateBloqueado,
  `armazem1 NÃO consegue fazer UPDATE direto em estoque`
);
if (!estoqueUpdateBloqueado) {
  console.log(`    ⚠️  FALHA DE SEGURANÇA: armazem1 atualizou estoque para 9999t!`);
  // Reverter o dano
  await sbAdmin.from('estoque').update({ quantidade: qtdOriginalArm1 }).eq('armazem_id', IDS.armazem1);
}

// 1.9 Representante NÃO pode fazer UPDATE direto em estoque
const { data: updateEstoqueRep } = await clients.representante2
  .from('estoque')
  .update({ quantidade_disponivel: 99999 })
  .eq('armazem_id', IDS.armazem1)
  .select('quantidade_disponivel');
assert(
  !updateEstoqueRep?.length,
  `representante2 NÃO consegue fazer UPDATE direto em estoque`
);

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 2 — AGENDAMENTOS: isolamento por role
// ══════════════════════════════════════════════════════════════════════════════

suite('2 — Agendamentos: isolamento por role');

// 2.1 Armazem1 vê apenas agendamentos do seu armazém
const { data: agArm1 } = await clients.armazem1.from('agendamentos').select('id, armazem_id');
if (agArm1 && agArm1.length > 0) {
  assert(
    agArm1.every(a => a.armazem_id === IDS.armazem1),
    `armazem1 vê apenas agendamentos do próprio armazém`
  );
  assert(
    !agArm1.some(a => a.armazem_id === IDS.armazem2),
    `armazem1 não vê agendamentos do armazem2`
  );
} else {
  info('Sem agendamentos para armazem1 — teste de isolamento de armazem pulado');
}

// 2.2 Armazem2 vê apenas agendamentos do seu armazém
const { data: agArm2 } = await clients.armazem2.from('agendamentos').select('id, armazem_id');
if (agArm2 && agArm2.length > 0) {
  assert(
    agArm2.every(a => a.armazem_id === IDS.armazem2),
    `armazem2 vê apenas agendamentos do próprio armazém`
  );
}

// 2.3 Cliente1 vê apenas agendamentos do cliente1
const { data: agCli1 } = await clients.cliente1.from('agendamentos').select('id, cliente_id');
if (agCli1 && agCli1.length > 0) {
  assert(
    agCli1.every(a => a.cliente_id === IDS.cliente1),
    `cliente1 vê apenas os próprios agendamentos`
  );
  assert(
    !agCli1.some(a => a.cliente_id === IDS.cliente2),
    `cliente1 não vê agendamentos do cliente2`
  );
} else {
  info('Sem agendamentos para cliente1 — teste de isolamento de cliente pulado');
}

// 2.4 Cliente2 não vê agendamentos do cliente1
const { data: agCli2 } = await clients.cliente2.from('agendamentos').select('id, cliente_id');
if (agCli2 && agCli2.length > 0) {
  assert(
    !agCli2.some(a => a.cliente_id === IDS.cliente1),
    `cliente2 não vê agendamentos do cliente1`
  );
}

// 2.5 Representante2 vê apenas agendamentos de clientes que representa (cli1 e cli2)
const { data: agRep2 } = await clients.representante2.from('agendamentos').select('id, cliente_id');
if (agRep2 && agRep2.length > 0) {
  const clientesRep2 = [IDS.cliente1, IDS.cliente2];
  assert(
    agRep2.every(a => clientesRep2.includes(a.cliente_id)),
    `representante2 vê apenas agendamentos dos clientes que representa (cli1 e cli2)`
  );
  assert(
    !agRep2.some(a => a.cliente_id === IDS.cliente3),
    `representante2 não vê agendamentos do cliente3 (sem representante)`
  );
  assert(
    !agRep2.some(a => a.cliente_id === IDS.cliente4),
    `representante2 não vê agendamentos do cliente4 (representante1)`
  );
} else {
  info('Sem agendamentos visíveis para representante2 — OK se não há agendamentos de cli1/cli2');
}

// 2.6 Representante1 não vê agendamentos de clientes do representante2
const { data: agRep1 } = await clients.representante1.from('agendamentos').select('id, cliente_id');
if (agRep1 && agRep1.length > 0) {
  assert(
    !agRep1.some(a => a.cliente_id === IDS.cliente1),
    `representante1 não vê agendamentos do cliente1 (rep2)`
  );
  assert(
    !agRep1.some(a => a.cliente_id === IDS.cliente2),
    `representante1 não vê agendamentos do cliente2 (rep2)`
  );
}

// 2.7 Admin e logística vêem tudo
const { data: agAdmin } = await clients.admin.from('agendamentos').select('id, cliente_id, armazem_id');
const { data: agColab } = await clients.colaborador.from('agendamentos').select('id');
const totalAgendamentos = agendamentosExistentes?.length ?? 0;
if (totalAgendamentos > 0) {
  assert(
    agAdmin && agAdmin.length >= totalAgendamentos,
    `admin vê todos os agendamentos (${agAdmin?.length ?? 0} ≥ ${totalAgendamentos})`
  );
  assert(
    agColab && agColab.length >= totalAgendamentos,
    `logistica vê todos os agendamentos (${agColab?.length ?? 0} ≥ ${totalAgendamentos})`
  );
} else {
  info('Sem agendamentos ativos — assertivas de admin/logistica puladas');
}

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 3 — CARREGAMENTOS: isolamento e escritas não autorizadas
// ══════════════════════════════════════════════════════════════════════════════

suite('3 — Carregamentos: isolamento e escritas não autorizadas');

// 3.1 Armazém1 vê apenas os próprios carregamentos
const { data: carrArm1 } = await clients.armazem1.from('carregamentos').select('id, armazem_id');
if (carrArm1 && carrArm1.length > 0) {
  assert(
    carrArm1.every(c => c.armazem_id === IDS.armazem1),
    `armazem1 vê apenas carregamentos do próprio armazém`
  );
  assert(
    !carrArm1.some(c => c.armazem_id === IDS.armazem2),
    `armazem1 não vê carregamentos do armazem2`
  );
} else {
  info('Sem carregamentos para armazem1 — teste de isolamento pulado');
}

// 3.2 Armazém2 não vê carregamentos do armazem1
const { data: carrArm2 } = await clients.armazem2.from('carregamentos').select('id, armazem_id');
if (carrArm2 && carrArm2.length > 0) {
  assert(
    !carrArm2.some(c => c.armazem_id === IDS.armazem1),
    `armazem2 não vê carregamentos do armazem1`
  );
}

// 3.3 Cliente1 vê apenas os próprios carregamentos (read-only)
const { data: carrCli1 } = await clients.cliente1.from('carregamentos').select('id, cliente_id');
if (carrCli1 && carrCli1.length > 0) {
  assert(
    carrCli1.every(c => c.cliente_id === IDS.cliente1),
    `cliente1 vê apenas carregamentos vinculados a si`
  );
  assert(
    !carrCli1.some(c => c.cliente_id === IDS.cliente2),
    `cliente1 não vê carregamentos do cliente2`
  );
}

// 3.4 Cliente NÃO pode fazer INSERT em carregamentos (BUG ESPERADO)
const agCli1Qualquer = agendamentosCli1[0];
if (agCli1Qualquer) {
  const { error: insertCarrCli, data: insertCarrCliData } = await clients.cliente1
    .from('carregamentos')
    .insert({
      agendamento_id: agCli1Qualquer.id,
      armazem_id:     agCli1Qualquer.armazem_id ?? IDS.armazem1,
      cliente_id:     IDS.cliente1,
      etapa_atual:    1,
    })
    .select('id');
  const carrInsertBloqueado = !!insertCarrCli || !insertCarrCliData?.length;
  assert(carrInsertBloqueado, `cliente1 NÃO pode fazer INSERT em carregamentos`);
  if (!carrInsertBloqueado) {
    console.log(`    ⚠️  FALHA DE SEGURANÇA: cliente1 inseriu carregamento!`);
    await clients.admin.from('carregamentos').delete().in('id', insertCarrCliData.map(r => r.id));
  }
} else {
  info('Sem agendamentos do cliente1 para testar INSERT em carregamentos');
}

// 3.5 Representante NÃO pode fazer UPDATE em carregamentos (BUG ESPERADO)
const carrQualquer = carregamentosExistentes?.[0];
if (carrQualquer) {
  const { data: updateCarrRep } = await clients.representante2
    .from('carregamentos')
    .update({ etapa_atual: 6 })
    .eq('id', carrQualquer.id)
    .select('etapa_atual');
  assert(
    !updateCarrRep?.length || updateCarrRep[0].etapa_atual === carrQualquer.etapa_atual,
    `representante2 NÃO pode fazer UPDATE em carregamentos`
  );
  if (updateCarrRep?.length && updateCarrRep[0].etapa_atual !== carrQualquer.etapa_atual) {
    console.log(`    ⚠️  FALHA DE SEGURANÇA: representante2 atualizou etapa do carregamento!`);
    // Reverter
    await sbAdmin.from('carregamentos').update({ etapa_atual: carrQualquer.etapa_atual }).eq('id', carrQualquer.id);
  }
}

// 3.6 Representante2 vê apenas carregamentos dos clientes que representa
const { data: carrRep2 } = await clients.representante2.from('carregamentos').select('id, cliente_id');
if (carrRep2 && carrRep2.length > 0) {
  const clientesRep2 = [IDS.cliente1, IDS.cliente2];
  assert(
    carrRep2.every(c => clientesRep2.includes(c.cliente_id)),
    `representante2 vê apenas carregamentos de cli1 e cli2`
  );
}

// 3.7 Admin vê todos os carregamentos
const { data: carrAdmin } = await clients.admin.from('carregamentos').select('id');
const totalCarreg = carregamentosExistentes?.length ?? 0;
if (totalCarreg > 0) {
  assert(
    carrAdmin && carrAdmin.length >= totalCarreg,
    `admin vê todos os carregamentos (${carrAdmin?.length ?? 0} ≥ ${totalCarreg})`
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 4 — PRODUTOS: escritas não autorizadas
// ══════════════════════════════════════════════════════════════════════════════

suite('4 — Produtos: escritas não autorizadas');

// 4.1 Cliente NÃO pode fazer INSERT em produtos (BUG ESPERADO)
const { error: insertProdCli, data: insertProdCliData } = await clients.cliente1
  .from('produtos')
  .insert({ nome: 'PRODUTO_HACK_CLI1', unidade: 'kg' })
  .select('id');
const prodInsertBloqueadoCli = !!insertProdCli || !insertProdCliData?.length;
assert(prodInsertBloqueadoCli, `cliente1 NÃO pode inserir produtos`);
if (!prodInsertBloqueadoCli) {
  console.log(`    ⚠️  FALHA DE SEGURANÇA: cliente1 inseriu produto!`);
  await clients.admin.from('produtos').delete().in('id', insertProdCliData.map(r => r.id));
}

// 4.2 Armazem NÃO pode fazer INSERT em produtos (BUG ESPERADO)
const { error: insertProdArm, data: insertProdArmData } = await clients.armazem1
  .from('produtos')
  .insert({ nome: 'PRODUTO_HACK_ARM1', unidade: 't' })
  .select('id');
const prodInsertBloqueadoArm = !!insertProdArm || !insertProdArmData?.length;
assert(prodInsertBloqueadoArm, `armazem1 NÃO pode inserir produtos`);
if (!prodInsertBloqueadoArm) {
  console.log(`    ⚠️  FALHA DE SEGURANÇA: armazem1 inseriu produto!`);
  await clients.admin.from('produtos').delete().in('id', insertProdArmData.map(r => r.id));
}

// 4.3 Representante NÃO pode fazer UPDATE em produtos (BUG ESPERADO)
const { data: updateProdRep } = await clients.representante1
  .from('produtos')
  .update({ nome: 'HACK_REP1' })
  .eq('id', IDS.produto1)
  .select('nome');
assert(
  !updateProdRep?.length || updateProdRep[0].nome !== 'HACK_REP1',
  `representante1 NÃO pode atualizar nome do produto`
);
if (updateProdRep?.length && updateProdRep[0].nome === 'HACK_REP1') {
  console.log(`    ⚠️  FALHA DE SEGURANÇA: representante1 renomeou produto!`);
  await sbAdmin.from('produtos').update({ nome: 'Ureia' }).eq('id', IDS.produto1);
}

// 4.4 Admin pode gerenciar produtos
const { error: insertProdAdmin } = await clients.admin
  .from('produtos')
  .insert({ nome: 'PRODUTO_TESTE_TEMP', unidade: 'kg' });
assert(!insertProdAdmin, `admin pode inserir produtos`);
// Limpar
await clients.admin.from('produtos').delete().eq('nome', 'PRODUTO_TESTE_TEMP');

// 4.5 Logística pode inserir produtos
const { error: insertProdColab } = await clients.colaborador
  .from('produtos')
  .insert({ nome: 'PRODUTO_LOGISTICA_TEMP', unidade: 't' });
assert(!insertProdColab, `logistica pode inserir produtos`);
await clients.admin.from('produtos').delete().eq('nome', 'PRODUTO_LOGISTICA_TEMP');

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 5 — COLABORADORES E CLIENTES: leitura não autorizada
// ══════════════════════════════════════════════════════════════════════════════

suite('5 — Colaboradores e Clientes: leitura não autorizada');

// 5.1 Cliente NÃO deve ver colaboradores (BUG ESPERADO)
const { data: colabCli } = await clients.cliente1.from('colaboradores').select('id, nome');
assert(
  !colabCli || colabCli.length === 0,
  `cliente1 NÃO consegue listar colaboradores`
);
if (colabCli && colabCli.length > 0) {
  console.log(`    ⚠️  FALHA DE PRIVACIDADE: cliente1 vê ${colabCli.length} colaboradores (equipe interna exposta)`);
}

// 5.2 Armazem NÃO deve ver colaboradores
const { data: colabArm } = await clients.armazem1.from('colaboradores').select('id, nome');
assert(
  !colabArm || colabArm.length === 0,
  `armazem1 NÃO consegue listar colaboradores`
);

// 5.3 Representante NÃO deve ver colaboradores
const { data: colabRep } = await clients.representante1.from('colaboradores').select('id, nome');
assert(
  !colabRep || colabRep.length === 0,
  `representante1 NÃO consegue listar colaboradores`
);

// 5.4 Admin vê todos os colaboradores
const { data: colabAdmin, error: colabAdminErr } = await clients.admin.from('colaboradores').select('id, nome');
assert(
  !colabAdminErr && colabAdmin && colabAdmin.length > 0,
  `admin consegue listar colaboradores`
);

// 5.5 Logística vê colaboradores (necessário para administração interna)
const { data: colabColab } = await clients.colaborador.from('colaboradores').select('id, nome');
assert(
  colabColab && colabColab.length > 0,
  `logistica consegue listar colaboradores`
);

// 5.6 Cliente1 NÃO deve ver dados do cliente2 diretamente
const { data: cliRead } = await clients.cliente1.from('clientes').select('id, nome').eq('id', IDS.cliente2);
assert(
  !cliRead || cliRead.length === 0,
  `cliente1 NÃO consegue ler dados do cliente2`
);
if (cliRead && cliRead.length > 0) {
  console.log(`    ⚠️  FALHA DE PRIVACIDADE: cliente1 vê dados do cliente2 (${cliRead[0].nome})`);
}

// 5.7 Representante2 vê apenas seus clientes, não clientes de outros representantes
const { data: cliRep2All } = await clients.representante2.from('clientes').select('id, nome');
if (cliRep2All && cliRep2All.length > 0) {
  assert(
    !cliRep2All.some(c => c.id === IDS.cliente4),
    `representante2 não vê cliente4 (representante1)`
  );
  assert(
    !cliRep2All.some(c => c.id === IDS.cliente3),
    `representante2 não vê cliente3 (sem representante)`
  );
}

// 5.8 Admin vê todos os clientes
const { data: cliAdmin } = await clients.admin.from('clientes').select('id, nome');
assert(cliAdmin && cliAdmin.length >= 4, `admin vê todos os clientes`);

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 6 — RPCs SENSÍVEIS
// ══════════════════════════════════════════════════════════════════════════════

suite('6 — RPCs sensíveis');

// Pegar liberação ativa para usar no teste de cancelamento
const libAtiva = liberacoesAtivas?.[0];
const { data: meData } = await clients.cliente1.auth.getUser();
const cli1UserId = meData?.user?.id;

// 6.1 cancelar_liberacao bloqueada para cliente
if (libAtiva) {
  const { data: resCancelCli } = await clients.cliente1.rpc('cancelar_liberacao', {
    p_liberacao_id: libAtiva.id,
    p_user_id: cli1UserId,
  });
  assert(
    resCancelCli?.success === false,
    `cliente1 NÃO pode cancelar liberação via RPC`
  );
}

// 6.2 cancelar_liberacao bloqueada para armazem
if (libAtiva) {
  const { data: meArm } = await clients.armazem1.auth.getUser();
  const { data: resCancelArm } = await clients.armazem1.rpc('cancelar_liberacao', {
    p_liberacao_id: libAtiva.id,
    p_user_id: meArm?.user?.id,
  });
  assert(
    resCancelArm?.success === false,
    `armazem1 NÃO pode cancelar liberação via RPC`
  );
}

// 6.3 cancelar_liberacao bloqueada para representante
if (libAtiva) {
  const { data: meRep } = await clients.representante1.auth.getUser();
  const { data: resCancelRep } = await clients.representante1.rpc('cancelar_liberacao', {
    p_liberacao_id: libAtiva.id,
    p_user_id: meRep?.user?.id,
  });
  assert(
    resCancelRep?.success === false,
    `representante1 NÃO pode cancelar liberação via RPC`
  );
}

// 6.4 alterar_armazem_liberacao bloqueada para cliente (via RLS — função SECURITY DEFINER mas usa armazem_id do owner)
// Tentativa direta de UPDATE no campo armazem_id
if (libAtiva) {
  const { data: altArm } = await clients.cliente1
    .from('liberacoes')
    .update({ armazem_id: IDS.armazem2 })
    .eq('id', libAtiva.id)
    .select('armazem_id');
  assert(
    !altArm?.length || altArm[0].armazem_id === libAtiva.armazem_id,
    `cliente1 NÃO pode alterar armazem_id de liberação diretamente`
  );
}

// 6.5 Admin pode chamar cancelar_liberacao (só verificamos que não é bloqueado por role — não cancela de fato)
const { data: resCancelPreview } = await clients.admin.rpc('calcular_cancelamento_liberacao', {
  p_liberacao_id: libAtiva?.id ?? '00000000-0000-0000-0000-000000000000',
});
if (libAtiva) {
  assert(
    resCancelPreview?.success === true,
    `admin pode chamar calcular_cancelamento_liberacao`
  );
}

// 6.6 get_quantidade_disponivel_liberacao acessível para admin
if (libAtiva) {
  const { data: qtdDisp, error: errQtd } = await clients.admin.rpc('get_quantidade_disponivel_liberacao', {
    liberacao_uuid: libAtiva.id,
  });
  assert(!errQtd && typeof qtdDisp === 'number', `admin acessa get_quantidade_disponivel_liberacao`);
}

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 7 — LÓGICA DE ESTOQUE
// ══════════════════════════════════════════════════════════════════════════════

suite('7 — Lógica de estoque: consistência entre liberações e disponível');

// 7.1 Disponível do Armazém 1 = físico - soma das liberações ativas comprometidas
if (estoqueArm1) {
  const liberacoesArm1Ativas = liberacoesAtivas?.filter(l => l.armazem_id === IDS.armazem1) ?? [];
  const totalComprometido = liberacoesArm1Ativas.reduce(
    (sum, l) => sum + (l.quantidade_liberada - l.quantidade_retirada), 0
  );
  const dispEsperado = estoqueArm1.quantidade - totalComprometido;
  const tolerancia = 0.01;
  assert(
    Math.abs(estoqueArm1.quantidade_disponivel - dispEsperado) < tolerancia,
    `Armazém 1 — disponível (${estoqueArm1.quantidade_disponivel}t) = físico (${estoqueArm1.quantidade}t) − comprometido (${totalComprometido}t) = ${dispEsperado}t`
  );
}

// 7.2 Disponível do Armazém 2 = físico - soma das liberações ativas comprometidas
if (estoqueArm2) {
  const liberacoesArm2Ativas = liberacoesAtivas?.filter(l => l.armazem_id === IDS.armazem2) ?? [];
  const totalComprometidoArm2 = liberacoesArm2Ativas.reduce(
    (sum, l) => sum + (l.quantidade_liberada - l.quantidade_retirada), 0
  );
  const dispEsperadoArm2 = estoqueArm2.quantidade - totalComprometidoArm2;
  const tolerancia = 0.01;
  assert(
    Math.abs(estoqueArm2.quantidade_disponivel - dispEsperadoArm2) < tolerancia,
    `Armazém 2 — disponível (${estoqueArm2.quantidade_disponivel}t) = físico (${estoqueArm2.quantidade}t) − comprometido (${totalComprometidoArm2}t) = ${dispEsperadoArm2}t`
  );
  if (estoqueArm2.quantidade === 0 && estoqueArm2.quantidade_disponivel > 0) {
    console.log(`    ⚠️  BUG: físico=0 mas disponível=${estoqueArm2.quantidade_disponivel}t — dado corrompido pelo seed`);
  }
}

// 7.3 Criar nova liberação reduz disponível (teste transacional como admin)
const dispAntes = estoqueArm1?.quantidade_disponivel ?? 0;
const fisicoBefore = estoqueArm1?.quantidade ?? 0;
const { data: novaLib, error: errNovaLib } = await sbAdmin
  .from('liberacoes')
  .insert({
    cliente_id:         IDS.cliente1,
    armazem_id:         IDS.armazem1,
    produto_id:         IDS.produto1,
    quantidade_liberada: 10,
    status:             'disponivel',
    pedido_interno:     'TEST-LOGICA-ESTOQUE-TMP',
    data_liberacao:     '2026-07-15',
    created_by:         (await sbAdmin.auth.getUser()).data.user?.id,
  })
  .select('id')
  .single();

if (errNovaLib) {
  info(`Não foi possível criar liberação de teste de lógica: ${errNovaLib.message}`);
} else {
  // Ler estoque pós-liberação
  const { data: estPost } = await sbAdmin.from('estoque')
    .select('quantidade, quantidade_disponivel')
    .eq('armazem_id', IDS.armazem1).eq('produto_id', IDS.produto1).single();

  assert(
    estPost && Math.abs(estPost.quantidade_disponivel - (dispAntes - 10)) < 0.01,
    `Criar liberação de 10t reduziu disponível: ${dispAntes}t → ${estPost?.quantidade_disponivel}t (esperado ${dispAntes - 10}t)`
  );
  assert(
    estPost && estPost.quantidade === fisicoBefore,
    `Criar liberação NÃO alterou estoque físico: físico manteve ${estPost?.quantidade}t`
  );

  // 7.4 Cancelar a liberação restaura disponível
  const { data: meAdm } = await sbAdmin.auth.getUser();
  const { data: resCancel } = await sbAdmin.rpc('cancelar_liberacao', {
    p_liberacao_id: novaLib.id,
    p_user_id: meAdm.user.id,
  });

  const { data: estPostCancel } = await sbAdmin.from('estoque')
    .select('quantidade, quantidade_disponivel')
    .eq('armazem_id', IDS.armazem1).eq('produto_id', IDS.produto1).single();

  assert(
    resCancel?.success === true,
    `cancelar_liberacao retornou success=true`
  );
  assert(
    resCancel?.quantidade_devolvida === 10,
    `cancelar_liberacao devolveu 10t (quantidade_devolvida=${resCancel?.quantidade_devolvida})`
  );
  assert(
    estPostCancel && Math.abs(estPostCancel.quantidade_disponivel - dispAntes) < 0.01,
    `Cancelar liberação restaurou disponível: ${estPostCancel?.quantidade_disponivel}t (esperado ${dispAntes}t)`
  );
  assert(
    estPostCancel && estPostCancel.quantidade === fisicoBefore,
    `Cancelar liberação NÃO alterou físico: ${estPostCancel?.quantidade}t`
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 8 — editar_agendamento / cancelar_agendamento (RPCs sensíveis)
// ══════════════════════════════════════════════════════════════════════════════

suite('8 — editar_agendamento / cancelar_agendamento: role e trava de etapa');

// 8.0 Fixture: liberação + agendamento próprios deste suite (carregamento etapa 1 é
// criado automaticamente pelo trigger insert_carregamento_from_agendamento)
const { data: meAdmin8 } = await sbAdmin.auth.getUser();
const { data: libAgdTeste, error: errLibAgdTeste } = await sbAdmin
  .from('liberacoes')
  .insert({
    cliente_id:          IDS.cliente1,
    armazem_id:          IDS.armazem2,
    produto_id:          IDS.produto1,
    quantidade_liberada: 20,
    status:              'disponivel',
    pedido_interno:      'TEST-EDITAR-CANCELAR-AGD-TMP',
    data_liberacao:      '2026-07-30',
    created_by:          meAdmin8.user.id,
  })
  .select('id')
  .single();

let agdTeste = null;
let carrTeste = null;

if (errLibAgdTeste) {
  info(`Não foi possível criar liberação de teste para editar/cancelar agendamento: ${errLibAgdTeste.message}`);
} else {
  const { data: agdInsert, error: errAgdInsert } = await sbAdmin
    .from('agendamentos')
    .insert({
      liberacao_id:        libAgdTeste.id,
      cliente_id:          IDS.cliente1,
      armazem_id:          IDS.armazem2,
      quantidade:          10,
      data_retirada:       '2026-08-01',
      motorista_nome:      'Motorista Teste RLS',
      motorista_documento: '11111111111',
      placa_caminhao:      'TST1A11',
      placa_carreta_1:     'TST1A12',
      transportadora:      'Transportadora Teste RLS',
      cnpj_transportadora: '11111111000111',
      created_by:          meAdmin8.user.id,
    })
    .select('id')
    .single();

  if (errAgdInsert) {
    info(`Não foi possível criar agendamento de teste: ${errAgdInsert.message}`);
  } else {
    agdTeste = agdInsert;
    const { data: carr } = await sbAdmin.from('carregamentos')
      .select('id, etapa_atual').eq('agendamento_id', agdTeste.id).single();
    carrTeste = carr;
  }
}

if (agdTeste) {
  const payloadEdicaoBase = (overrides = {}) => ({
    p_agendamento_id:      agdTeste.id,
    p_quantidade:          10,
    p_data_retirada:       '2026-08-01',
    p_placa_caminhao:      'TST1A11',
    p_placa_carreta_1:     'TST1A12',
    p_placa_carreta_2:     null,
    p_motorista_nome:      'Motorista Teste RLS',
    p_motorista_documento: '11111111111',
    p_transportadora:      'Transportadora Teste RLS',
    p_cnpj_transportadora: '11111111000111',
    ...overrides,
  });

  // 8.1–8.3 editar_agendamento bloqueada para cliente/armazem/representante
  const { data: meCli } = await clients.cliente1.auth.getUser();
  const { data: resEditCli } = await clients.cliente1.rpc('editar_agendamento', payloadEdicaoBase({ p_user_id: meCli?.user?.id }));
  assert(resEditCli?.success === false, `cliente1 NÃO pode editar agendamento via RPC`);

  const { data: meArm } = await clients.armazem1.auth.getUser();
  const { data: resEditArm } = await clients.armazem1.rpc('editar_agendamento', payloadEdicaoBase({ p_user_id: meArm?.user?.id }));
  assert(resEditArm?.success === false, `armazem1 NÃO pode editar agendamento via RPC`);

  const { data: meRep } = await clients.representante1.auth.getUser();
  const { data: resEditRep } = await clients.representante1.rpc('editar_agendamento', payloadEdicaoBase({ p_user_id: meRep?.user?.id }));
  assert(resEditRep?.success === false, `representante1 NÃO pode editar agendamento via RPC`);

  // 8.4–8.6 cancelar_agendamento bloqueada para cliente/armazem/representante
  const { data: resCancelCli } = await clients.cliente1.rpc('cancelar_agendamento', { p_agendamento_id: agdTeste.id, p_user_id: meCli?.user?.id });
  assert(resCancelCli?.success === false, `cliente1 NÃO pode cancelar agendamento via RPC`);

  const { data: resCancelArm } = await clients.armazem1.rpc('cancelar_agendamento', { p_agendamento_id: agdTeste.id, p_user_id: meArm?.user?.id });
  assert(resCancelArm?.success === false, `armazem1 NÃO pode cancelar agendamento via RPC`);

  const { data: resCancelRep } = await clients.representante1.rpc('cancelar_agendamento', { p_agendamento_id: agdTeste.id, p_user_id: meRep?.user?.id });
  assert(resCancelRep?.success === false, `representante1 NÃO pode cancelar agendamento via RPC`);

  // 8.7 admin PODE editar agendamento via RPC (quantidade + demais campos persistem)
  const { data: resEditAdmin } = await sbAdmin.rpc('editar_agendamento', payloadEdicaoBase({
    p_quantidade:          12,
    p_motorista_nome:      'Motorista Editado RLS',
    p_motorista_documento: '22222222222',
    p_user_id:             meAdmin8.user.id,
  }));
  assert(resEditAdmin?.success === true, `admin pode editar agendamento via RPC`);

  const { data: agdPosEdit } = await sbAdmin.from('agendamentos')
    .select('quantidade, motorista_nome').eq('id', agdTeste.id).single();
  assert(agdPosEdit?.quantidade === 12, `editar_agendamento persistiu nova quantidade (12t)`);
  assert(agdPosEdit?.motorista_nome === 'Motorista Editado RLS', `editar_agendamento persistiu novo motorista`);

  // 8.8 Trava de etapa: carregamento em etapa 2 bloqueia editar/cancelar mesmo para admin
  if (carrTeste) {
    await sbAdmin.from('carregamentos').update({ etapa_atual: 2 }).eq('id', carrTeste.id);

    const { data: resEditEtapa2 } = await sbAdmin.rpc('editar_agendamento', payloadEdicaoBase({ p_quantidade: 12, p_user_id: meAdmin8.user.id }));
    assert(resEditEtapa2?.success === false, `editar_agendamento bloqueado quando etapa_atual != 1 (mesmo para admin)`);

    const { data: resCancelEtapa2 } = await sbAdmin.rpc('cancelar_agendamento', { p_agendamento_id: agdTeste.id, p_user_id: meAdmin8.user.id });
    assert(resCancelEtapa2?.success === false, `cancelar_agendamento bloqueado quando etapa_atual != 1 (mesmo para admin)`);

    // Reverter para etapa 1 para poder testar o cancelamento efetivo em 8.9
    await sbAdmin.from('carregamentos').update({ etapa_atual: 1 }).eq('id', carrTeste.id);
  }

  // 8.9 admin PODE cancelar agendamento via RPC (etapa 1) — saldo volta pra liberação
  const { data: libAntesCancel } = await sbAdmin.from('liberacoes')
    .select('quantidade_liberada').eq('id', libAgdTeste.id).single();

  const { data: resCancelAdmin } = await sbAdmin.rpc('cancelar_agendamento', { p_agendamento_id: agdTeste.id, p_user_id: meAdmin8.user.id });
  assert(resCancelAdmin?.success === true, `admin pode cancelar agendamento via RPC`);

  const { data: agdPosCancel } = await sbAdmin.from('agendamentos')
    .select('status, cancelado_em').eq('id', agdTeste.id).single();
  assert(agdPosCancel?.status === 'cancelado', `agendamento marcado como cancelado`);
  assert(!!agdPosCancel?.cancelado_em, `cancelado_em foi preenchido`);

  const { data: carrPosCancel } = await sbAdmin.from('carregamentos').select('id').eq('agendamento_id', agdTeste.id);
  assert((carrPosCancel?.length ?? 0) === 0, `carregamento vinculado foi removido ao cancelar`);

  const { data: saldoPosCancel } = await sbAdmin.rpc('get_quantidade_disponivel_liberacao', { liberacao_uuid: libAgdTeste.id });
  assert(
    Math.abs(Number(saldoPosCancel) - Number(libAntesCancel.quantidade_liberada)) < 0.01,
    `saldo da liberação voltou ao total liberado após cancelar o único agendamento (${saldoPosCancel}t)`
  );

  // Limpeza: cancelar a liberação de teste (mesmo padrão de TEST-LOGICA-ESTOQUE-TMP)
  await sbAdmin.rpc('cancelar_liberacao', { p_liberacao_id: libAgdTeste.id, p_user_id: meAdmin8.user.id });
}

// ══════════════════════════════════════════════════════════════════════════════
// RESULTADO FINAL
// ══════════════════════════════════════════════════════════════════════════════

console.log(`\n${'═'.repeat(60)}`);
console.log(`RESULTADO: ${passed} passed, ${failed} failed`);
console.log('═'.repeat(60));

if (failures.length > 0) {
  console.log('\nFalhas:');
  failures.forEach(f => console.log(`  ❌ ${f}`));
}

if (failed > 0) process.exit(1);
