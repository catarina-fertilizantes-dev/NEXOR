import { Info, BookOpen, ClipboardList, Calendar, Truck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export const IntroducaoSection = () => {
  return (
    <section id="introducao" className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">👤 Introdução</h2>
        <p className="text-muted-foreground">Bem-vindo ao manual do usuário do sistema NEXOR – Perfil Cliente.</p>
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
                Este manual foi desenvolvido especificamente para usuários com perfil <strong>Cliente</strong>, apresentando
                todas as funcionalidades disponíveis para este nível de acesso.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div>
        <h3 className="text-lg font-semibold text-foreground mb-3">O que você pode fazer como Cliente</h3>
        <div className="grid gap-2 sm:grid-cols-2">
          {[
            { icon: ClipboardList, text: "Visualizar suas liberações cadastradas pela Logística e acompanhar a disponibilidade para retirada" },
            { icon: Calendar, text: "Criar agendamentos de retirada informando dados do veículo, motorista e transportadora" },
            { icon: Truck, text: "Acompanhar carregamentos em tempo real, visualizar as 6 etapas e baixar fotos e documentos" },
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

      <div>
        <h3 className="text-lg font-semibold text-foreground mb-3">O que você NÃO pode fazer</h3>
        <div className="grid gap-2">
          {[
            "Criar ou editar liberações (apenas Logística)",
            "Atualizar etapas de carregamento (apenas Armazém)",
            "Gerenciar estoque (apenas Armazém e Logística)",
            "Cancelar ou editar agendamentos após criação (solicite à Logística)",
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-2 text-sm text-foreground">
              <span className="text-red-600 dark:text-red-400 font-bold">❌</span>
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/20 p-4">
        <div className="flex items-center gap-2 text-blue-800 dark:text-blue-200 mb-2">
          <BookOpen className="h-5 w-5" />
          <span className="font-medium">Fluxo Geral</span>
        </div>
        <p className="text-sm text-blue-700 dark:text-blue-300">
          Sua jornada no sistema começa quando a <strong>Logística cadastra uma liberação</strong> para você. A partir daí,
          você cria <strong>agendamentos</strong> de retirada e acompanha os <strong>carregamentos</strong> em tempo real
          até a conclusão com download dos documentos.
        </p>
      </div>
    </section>
  );
};
