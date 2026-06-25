import { Info, AlertCircle, Users, Building, Package, UserCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

export const CadastrosSection = () => {
  return (
    <section id="cadastros" className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">🗂️ Cadastros</h2>
        <p className="text-muted-foreground">Gerencie os participantes do sistema: Armazéns, Clientes, Representantes e Produtos.</p>
      </div>

      <Card>
        <CardContent className="p-4 md:p-5">
          <p className="text-sm text-muted-foreground mb-2">
            Como Logística, você é responsável por cadastrar e gerenciar os participantes do sistema:
            Armazéns, Clientes, Representantes e Produtos.
          </p>
          <p className="text-sm text-muted-foreground">
            Esses cadastros são a base para todo o funcionamento do sistema – sem eles, não é possível
            criar liberações, agendamentos ou registrar movimentações de estoque.
          </p>
        </CardContent>
      </Card>

      <Alert className="border-orange-200 bg-orange-50 dark:bg-orange-950/20">
        <AlertCircle className="h-5 w-5 text-orange-600" />
        <div className="ml-2">
          <AlertTitle className="text-orange-900 dark:text-orange-100 font-semibold mb-1">
            ⚠️ Nota Importante
          </AlertTitle>
          <AlertDescription className="text-orange-800 dark:text-orange-200">
            Colaboradores só podem ser gerenciados pelo perfil <strong>Admin</strong>.
          </AlertDescription>
        </div>
      </Alert>

      {/* ARMAZÉNS */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Building className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Cadastro de Armazéns</h3>
        </div>

        <div className="space-y-2 mb-4">
          {[
            "Menu Cadastros → Armazéns",
            'Clique em "Novo Armazém"',
            "Preencha os campos obrigatórios (descritos abaixo)",
            'Clique em "Cadastrar Armazém"',
            "⚠️ Sistema cria usuário automaticamente via Edge Function",
            "Modal exibe: Email + Senha Temporária",
            "📋 COPIE E REPASSE as credenciais para o responsável do armazém",
          ].map((step, i) => (
            <div key={i} className="flex items-start gap-3 text-sm">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold shrink-0 text-xs mt-0.5">
                {i + 1}
              </span>
              <span className="text-foreground">{step}</span>
            </div>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left p-2 font-medium text-foreground">Campo</th>
                <th className="text-left p-2 font-medium text-foreground">Descrição</th>
              </tr>
            </thead>
            <tbody>
              {[
                { campo: "Nome *", desc: "Nome do armazém" },
                { campo: "Cidade *", desc: "Cidade onde está localizado" },
                { campo: "Estado *", desc: "Select (UF)" },
                { campo: "Email *", desc: "Email para login (único no sistema)" },
                { campo: "CNPJ/CPF *", desc: "Automático com máscara" },
                { campo: "Telefone", desc: "(XX) XXXXX-XXXX" },
                { campo: "Endereço", desc: "Endereço completo" },
                { campo: "Capacidade", desc: "Capacidade total" },
                { campo: "CEP", desc: "XXXXX-XXX" },
              ].map((row, i) => (
                <tr key={i} className="border-b border-border">
                  <td className="p-2 font-medium text-foreground">{row.campo}</td>
                  <td className="p-2 text-muted-foreground">{row.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="space-y-1 mt-2">
          {[
            { text: "Listar, Buscar, Filtrar por status", allowed: true },
            { text: "Ativar/Desativar armazéns", allowed: true },
            { text: "Excluir armazéns", allowed: false },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <span className={item.allowed ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
                {item.allowed ? "✅" : "❌"}
              </span>
              <span className="text-foreground">{item.text}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-border" />

      {/* CLIENTES */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Cadastro de Clientes</h3>
        </div>

        <div className="space-y-2 mb-4">
          {[
            "Menu Cadastros → Clientes",
            'Clique em "Novo Cliente"',
            "Preencha os campos obrigatórios (descritos abaixo)",
            'Clique em "Cadastrar Cliente"',
            "⚠️ Sistema cria usuário automaticamente",
            "Modal exibe credenciais",
            "📋 REPASSE ao cliente ou representante",
          ].map((step, i) => (
            <div key={i} className="flex items-start gap-3 text-sm">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold shrink-0 text-xs mt-0.5">
                {i + 1}
              </span>
              <span className="text-foreground">{step}</span>
            </div>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left p-2 font-medium text-foreground">Campo</th>
                <th className="text-left p-2 font-medium text-foreground">Descrição</th>
              </tr>
            </thead>
            <tbody>
              {[
                { campo: "Nome *", desc: "Razão social do cliente" },
                { campo: "CNPJ/CPF *", desc: "Automático com máscara" },
                { campo: "Email *", desc: "Email para login (único no sistema)" },
                { campo: "Telefone", desc: "Opcional" },
                { campo: "Endereço", desc: "Opcional" },
                { campo: "Cidade", desc: "Opcional" },
                { campo: "Estado", desc: "Select (UF)" },
                { campo: "CEP", desc: "Opcional" },
                { campo: "Representante", desc: "Select (opcional) – vincular a um representante" },
              ].map((row, i) => (
                <tr key={i} className="border-b border-border">
                  <td className="p-2 font-medium text-foreground">{row.campo}</td>
                  <td className="p-2 text-muted-foreground">{row.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="space-y-1 mt-2">
          {[
            { text: "Editar Representante vinculado ao cliente", allowed: true },
            { text: "Ativar/Desativar clientes", allowed: true },
            { text: "Excluir clientes", allowed: false },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <span className={item.allowed ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
                {item.allowed ? "✅" : "❌"}
              </span>
              <span className="text-foreground">{item.text}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-border" />

      {/* REPRESENTANTES */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <UserCheck className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Cadastro de Representantes</h3>
        </div>

        <div className="space-y-2 mb-4">
          {[
            "Menu Cadastros → Representantes",
            'Clique em "Novo Representante"',
            "Preencha os campos obrigatórios (descritos abaixo)",
            'Clique em "Cadastrar Representante"',
            "Sistema cria usuário automaticamente",
            "Modal exibe credenciais",
            "📋 REPASSE ao representante",
          ].map((step, i) => (
            <div key={i} className="flex items-start gap-3 text-sm">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold shrink-0 text-xs mt-0.5">
                {i + 1}
              </span>
              <span className="text-foreground">{step}</span>
            </div>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left p-2 font-medium text-foreground">Campo</th>
                <th className="text-left p-2 font-medium text-foreground">Descrição</th>
              </tr>
            </thead>
            <tbody>
              {[
                { campo: "Nome *", desc: "Nome completo" },
                { campo: "CPF *", desc: "CPF do representante" },
                { campo: "Email *", desc: "Email para login (único no sistema)" },
                { campo: "Telefone", desc: "Opcional" },
                { campo: "Região", desc: "Região de atuação (opcional)" },
              ].map((row, i) => (
                <tr key={i} className="border-b border-border">
                  <td className="p-2 font-medium text-foreground">{row.campo}</td>
                  <td className="p-2 text-muted-foreground">{row.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">Após o cadastro</h4>
                <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                  <li>• Vincule clientes ao representante na tela de Clientes</li>
                  <li>• A listagem de representantes mostra a contagem de clientes vinculados</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-1 mt-2">
          {[
            { text: "Ativar/Desativar representantes", allowed: true },
            { text: "Excluir representantes", allowed: false },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <span className={item.allowed ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
                {item.allowed ? "✅" : "❌"}
              </span>
              <span className="text-foreground">{item.text}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-border" />

      {/* PRODUTOS */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Cadastro de Produtos</h3>
        </div>

        <div className="space-y-2 mb-4">
          {[
            "Menu Cadastros → Produtos",
            'Clique em "Novo Produto"',
            "Preencha os campos obrigatórios (descritos abaixo)",
            'Clique em "Cadastrar Produto"',
          ].map((step, i) => (
            <div key={i} className="flex items-start gap-3 text-sm">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold shrink-0 text-xs mt-0.5">
                {i + 1}
              </span>
              <span className="text-foreground">{step}</span>
            </div>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left p-2 font-medium text-foreground">Campo</th>
                <th className="text-left p-2 font-medium text-foreground">Descrição</th>
              </tr>
            </thead>
            <tbody>
              {[
                { campo: "Nome *", desc: "Nome do produto (ex: Ureia)" },
                { campo: "Unidade *", desc: "Select: Toneladas (t) ou Quilos (kg)" },
              ].map((row, i) => (
                <tr key={i} className="border-b border-border">
                  <td className="p-2 font-medium text-foreground">{row.campo}</td>
                  <td className="p-2 text-muted-foreground">{row.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="space-y-1 mt-2">
          {[
            { text: "Listar, Buscar, Filtrar por status", allowed: true },
            { text: "Ativar/Desativar produtos", allowed: true },
            { text: "Excluir produtos", allowed: false },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <span className={item.allowed ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
                {item.allowed ? "✅" : "❌"}
              </span>
              <span className="text-foreground">{item.text}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-border" />

      {/* GESTÃO DE CREDENCIAIS */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground">Gestão de Usuários Criados</h3>

        <Alert className="border-orange-200 bg-orange-50 dark:bg-orange-950/20">
          <AlertCircle className="h-5 w-5 text-orange-600" />
          <div className="ml-2">
            <AlertTitle className="text-orange-900 dark:text-orange-100 font-semibold mb-2">
              ⚠️ IMPORTANTE: Credenciais Temporárias
            </AlertTitle>
            <AlertDescription className="text-orange-800 dark:text-orange-200 space-y-2">
              <p>Após criar Armazém, Cliente ou Representante:</p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Modal exibe Email + Senha Temporária</li>
                <li><strong>COPIE as credenciais imediatamente</strong></li>
                <li>REPASSE ao usuário criado</li>
                <li>Usuário DEVE trocar a senha no primeiro login</li>
              </ol>
            </AlertDescription>
          </div>
        </Alert>

        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">💡 Dica</h4>
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  Você pode visualizar a senha temporária na listagem do cadastro correspondente.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="border-t border-border" />

      {/* FILTROS */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground">Filtros e Buscas</h3>
        <p className="text-sm text-muted-foreground">Cada cadastro possui:</p>
        <div className="space-y-2">
          {[
            "Busca por texto (nome, email, cidade, etc.)",
            "Filtro por Status (Todos / Ativo / Inativo)",
            "Filtros específicos (ex: Clientes → filtrar por Representante)",
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-2 text-sm">
              <span className="text-primary shrink-0">•</span>
              <span className="text-foreground">{item}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-border" />

      {/* PERMISSÕES RESUMIDAS */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground">Permissões Resumidas</h3>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left p-2 font-medium text-foreground">Cadastro</th>
                <th className="text-left p-2 font-medium text-foreground">Criar</th>
                <th className="text-left p-2 font-medium text-foreground">Editar Rep.</th>
                <th className="text-left p-2 font-medium text-foreground">Ativar/Desativar</th>
                <th className="text-left p-2 font-medium text-foreground">Excluir</th>
                <th className="text-left p-2 font-medium text-foreground">Ver Senha Temp</th>
              </tr>
            </thead>
            <tbody>
              {[
                { tipo: "Armazéns", criar: true, editarRep: false, ativar: true, excluir: false, senha: true },
                { tipo: "Clientes", criar: true, editarRep: true, ativar: true, excluir: false, senha: true },
                { tipo: "Representantes", criar: true, editarRep: false, ativar: true, excluir: false, senha: true },
                { tipo: "Produtos", criar: true, editarRep: false, ativar: true, excluir: false, senha: false },
                { tipo: "Colaboradores", criar: false, editarRep: false, ativar: false, excluir: false, senha: false },
              ].map((row, i) => (
                <tr key={i} className="border-b border-border hover:bg-muted/30 transition-colors">
                  <td className="p-2 font-medium text-foreground">{row.tipo}</td>
                  <td className="p-2">
                    <Badge className={row.criar ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400" : "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"}>
                      {row.criar ? "✅" : "❌"}
                    </Badge>
                  </td>
                  <td className="p-2">
                    <Badge className={row.editarRep ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400" : "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"}>
                      {row.editarRep ? "✅" : "❌"}
                    </Badge>
                  </td>
                  <td className="p-2">
                    <Badge className={row.ativar ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400" : "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"}>
                      {row.ativar ? "✅" : "❌"}
                    </Badge>
                  </td>
                  <td className="p-2">
                    <Badge className={row.excluir ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400" : "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"}>
                      {row.excluir ? "✅" : "❌"}
                    </Badge>
                  </td>
                  <td className="p-2">
                    {row.senha === false && row.tipo === "Produtos" ? (
                      <span className="text-xs text-muted-foreground">N/A</span>
                    ) : row.senha === false ? (
                      <Badge className="bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">❌</Badge>
                    ) : (
                      <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">✅</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Alert className="border-orange-200 bg-orange-50 dark:bg-orange-950/20">
          <AlertCircle className="h-5 w-5 text-orange-600" />
          <div className="ml-2">
            <AlertTitle className="text-orange-900 dark:text-orange-100 font-semibold mb-1">
              ⚠️ Nota
            </AlertTitle>
            <AlertDescription className="text-orange-800 dark:text-orange-200">
              Colaboradores são gerenciados <strong>EXCLUSIVAMENTE pelo Admin</strong>.
            </AlertDescription>
          </div>
        </Alert>
      </div>
    </section>
  );
};
