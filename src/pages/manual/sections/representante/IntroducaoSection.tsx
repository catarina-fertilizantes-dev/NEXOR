import { Info, BookOpen, ClipboardList, Calendar, Truck, CheckCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export const IntroducaoSection = () => {
  return (
    <section id="introducao" className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">👤 Introdução</h2>
        <p className="text-muted-foreground">Bem-vindo ao manual do usuário do sistema NEXOR – Perfil Representante.</p>
      </div>

      <Card>
        <CardContent className="p-4 md:p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-r from-primary to-primary/80 shrink-0">
              <Info className="h-5 w-5 text-white" />
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-foreground">Sobre o Sistema NEXOR</h3>
              <p className="text-sm text-muted-foreground">
                O Sistema NEXOR é uma plataforma completa de gestão logística desenvolvida para otimizar e controlar
                todo o fluxo de operações de armazém, carregamentos, agendamentos e estoque da Catarina Fertilizantes.
              </p>
              <p className="text-sm text-muted-foreground">
                Este manual foi desenvolvido especificamente para usuários com perfil <strong>Representante</strong>, apresentando
                todas as funcionalidades disponíveis para este nível de acesso.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground">Objetivo deste Manual</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                <span className="text-sm">Acessar o sistema de forma segura</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                <span className="text-sm">Navegar pelas diferentes telas</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                <span className="text-sm">Criar agendamentos e acompanhar carregamentos</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                <span className="text-sm">Compreender suas permissões e responsabilidades</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                <span className="text-sm">Utilizar o sistema em computadores e dispositivos móveis</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-foreground mb-3">O que você pode fazer como Representante</h3>
        <p className="text-sm text-muted-foreground mb-3">
          Como representante, você atua em nome de um ou mais clientes no sistema. Suas responsabilidades incluem:
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {[
            { icon: ClipboardList, text: "Visualizar liberações de todos os clientes que você representa e acompanhar a disponibilidade para retirada" },
            { icon: Calendar, text: "Criar agendamentos de retirada em nome dos clientes, informando dados do veículo, motorista e transportadora" },
            { icon: Truck, text: "Acompanhar carregamentos em tempo real de todos os seus clientes, visualizar as 6 etapas e baixar fotos e documentos" },
          ].map((item, i) => (
            <Card key={i}>
              <CardContent className="p-3 flex items-center gap-3">
                <item.icon className="h-4 w-4 text-primary shrink-0" />
                <span className="text-sm text-foreground">{item.text}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950/20">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-orange-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-orange-900 dark:text-orange-100 mb-2">🔑 Diferença Principal</h4>
              <p className="text-sm text-orange-800 dark:text-orange-200 mb-2">
                A principal diferença entre o perfil Cliente e Representante é o escopo de visualização:
              </p>
              <ul className="text-sm text-orange-800 dark:text-orange-200 space-y-1">
                <li>• Um <strong>Cliente</strong> vê apenas suas próprias liberações, agendamentos e carregamentos</li>
                <li>• Um <strong>Representante</strong> vê as liberações, agendamentos e carregamentos de <strong>TODOS os clientes que representa</strong></li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">💡 Dica Importante</h4>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Use os filtros de busca para localizar rapidamente informações de um cliente específico quando você representa múltiplos clientes.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Acesso ao Sistema</h4>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Acesse o sistema pelo link fornecido pela sua equipe de Logística. 
                Recomendamos salvar o link nos favoritos do seu navegador para acesso rápido.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/20 p-4">
        <div className="flex items-center gap-2 text-blue-800 dark:text-blue-200 mb-2">
          <BookOpen className="h-5 w-5" />
          <span className="font-medium">Fluxo Geral</span>
        </div>
        <p className="text-sm text-blue-700 dark:text-blue-300">
          Sua jornada no sistema começa quando a <strong>Logística cadastra uma liberação</strong> para o cliente que você representa. A partir daí,
          você cria <strong>agendamentos</strong> de retirada em nome do cliente e acompanha os <strong>carregamentos</strong> em tempo real
          até a conclusão com download dos documentos.
        </p>
      </div>
    </section>
  );
};
