import { Info, BookOpen, Calendar, Truck, Package } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export const IntroducaoSection = () => {
  return (
    <section id="introducao" className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">🏠 Introdução</h2>
        <p className="text-muted-foreground">Bem-vindo ao manual do usuário do sistema NEXOR.</p>
      </div>

      <Card>
        <CardContent className="p-4 md:p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-r from-primary to-primary/80 shrink-0">
              <Info className="h-5 w-5 text-white" />
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold text-foreground">Sobre o Sistema NEXOR</h3>
              <p className="text-sm text-muted-foreground">
                O Sistema NEXOR é uma plataforma completa de gestão logística desenvolvida para otimizar e controlar 
                todo o fluxo de operações de armazém, carregamentos, agendamentos e estoque da Catarina Fertilizantes.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div>
        <h3 className="text-lg font-semibold text-foreground mb-3">Objetivo deste Manual</h3>
        <div className="grid gap-2">
          {[
            "Acessar o sistema de forma segura",
            "Navegar pelas diferentes telas",
            "Executar suas atividades diárias com eficiência",
            "Compreender suas permissões e responsabilidades",
            "Utilizar o sistema em computadores e dispositivos móveis",
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-2 text-sm text-foreground">
              <span className="text-green-600 dark:text-green-400 font-bold">✅</span>
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-foreground mb-3">O que você pode fazer como Armazém</h3>
        <div className="grid gap-2 sm:grid-cols-2">
          {[
            { icon: Calendar, text: "Visualizar agendamentos de carregamento" },
            { icon: Truck, text: "Gerenciar carregamentos completos" },
            { icon: Package, text: "Visualizar estoque do seu armazém" },
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

      <div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/20 p-4">
        <div className="flex items-center gap-2 text-blue-800 dark:text-blue-200 mb-2">
          <BookOpen className="h-5 w-5" />
          <span className="font-medium">Acesso ao Sistema</span>
        </div>
        <p className="text-sm text-blue-700 dark:text-blue-300">
          Acesse o sistema pelo link fornecido pela sua equipe de Logística. 
          Recomendamos salvar o link nos favoritos do seu navegador para acesso rápido.
        </p>
      </div>
    </section>
  );
};
