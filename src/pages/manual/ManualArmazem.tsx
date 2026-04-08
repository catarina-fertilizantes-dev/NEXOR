import { useState, useEffect, useRef, useCallback } from "react";
import { BookOpen, Menu, X, Home, UserPlus, Key, Navigation, Calendar, Truck, Package, Smartphone, HelpCircle } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { IntroducaoSection } from "./sections/IntroducaoSection";
import { PrimeiroAcessoSection } from "./sections/PrimeiroAcessoSection";
import { LoginRecuperacaoSection } from "./sections/LoginRecuperacaoSection";
import { NavegacaoSection } from "./sections/NavegacaoSection";
import { AgendamentosSection } from "./sections/AgendamentosSection";
import { CarregamentosSection } from "./sections/CarregamentosSection";
import { EstoqueSection } from "./sections/EstoqueSection";
import { AcessoMobileSection } from "./sections/AcessoMobileSection";
import { DicasSuporteSection } from "./sections/DicasSuporteSection";

const sections = [
  { id: "introducao", label: "Introdução", icon: Home, emoji: "🏠" },
  { id: "primeiro-acesso", label: "Primeiro Acesso", icon: UserPlus, emoji: "🆕" },
  { id: "login-recuperacao", label: "Login e Recuperação", icon: Key, emoji: "🔑" },
  { id: "navegacao", label: "Navegação no Sistema", icon: Navigation, emoji: "🧭" },
  { id: "agendamentos", label: "Agendamentos", icon: Calendar, emoji: "📅" },
  { id: "carregamentos", label: "Carregamentos", icon: Truck, emoji: "🚚" },
  { id: "estoque", label: "Estoque", icon: Package, emoji: "📦" },
  { id: "acesso-mobile", label: "Acesso Mobile", icon: Smartphone, emoji: "📱" },
  { id: "dicas-suporte", label: "Dicas e Suporte", icon: HelpCircle, emoji: "🆘" },
];

const ManualArmazem = () => {
  const [activeSection, setActiveSection] = useState("introducao");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const isScrollingRef = useRef(false);

  const scrollToSection = useCallback((sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      isScrollingRef.current = true;
      setActiveSection(sectionId);
      setSidebarOpen(false);
      element.scrollIntoView({ behavior: "smooth", block: "start" });
      setTimeout(() => {
        isScrollingRef.current = false;
      }, 1000);
    }
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (isScrollingRef.current) return;

      const scrollPosition = window.scrollY + 120;

      for (let i = sections.length - 1; i >= 0; i--) {
        const element = document.getElementById(sections[i].id);
        if (element && element.offsetTop <= scrollPosition) {
          setActiveSection(sections[i].id);
          break;
        }
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const NavSidebar = () => (
    <nav className="space-y-1">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-3">
        Seções
      </p>
      {sections.map((section) => {
        const isActive = activeSection === section.id;
        return (
          <button
            key={section.id}
            onClick={() => scrollToSection(section.id)}
            className={`w-full text-left px-3 py-2 rounded-md text-sm transition-all duration-200 flex items-center gap-2 ${
              isActive
                ? "bg-gradient-to-r from-primary/20 to-primary/10 text-primary font-semibold border-r-2 border-primary"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            }`}
          >
            <span className="text-base leading-none">{section.emoji}</span>
            <span className="truncate">{section.label}</span>
          </button>
        );
      })}
    </nav>
  );

  return (
    <div className="flex flex-col min-h-full">
      <PageHeader
        title="Manual do Usuário - Perfil Armazém"
        subtitle="Guia completo para uso do sistema NEXOR"
        icon={BookOpen}
      />

      <div className="flex flex-1 relative">
        {/* Mobile sidebar toggle */}
        <div className="md:hidden fixed bottom-6 right-6 z-50">
          <Button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="h-12 w-12 rounded-full shadow-lg bg-primary text-primary-foreground"
            size="icon"
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div
            className="md:hidden fixed inset-0 bg-black/40 z-40"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={`
            fixed md:sticky md:top-0 z-40 md:z-auto
            w-64 md:w-56 lg:w-64
            bg-card md:bg-transparent
            border-r border-border
            h-screen md:h-[calc(100vh-3.5rem)]
            overflow-y-auto
            transition-transform duration-300 md:transition-none
            md:translate-x-0
            md:self-start
            pt-4 pb-6 px-2
            shrink-0
            top-0 left-0
            ${sidebarOpen ? "translate-x-0 shadow-xl" : "-translate-x-full"}
          `}
        >
          <NavSidebar />
        </aside>

        {/* Main content */}
        <main ref={contentRef} className="flex-1 p-4 md:p-6 lg:p-8 max-w-4xl space-y-16 min-w-0">
          <IntroducaoSection />
          <div className="border-t border-border" />
          <PrimeiroAcessoSection />
          <div className="border-t border-border" />
          <LoginRecuperacaoSection />
          <div className="border-t border-border" />
          <NavegacaoSection />
          <div className="border-t border-border" />
          <AgendamentosSection />
          <div className="border-t border-border" />
          <CarregamentosSection />
          <div className="border-t border-border" />
          <EstoqueSection />
          <div className="border-t border-border" />
          <AcessoMobileSection />
          <div className="border-t border-border" />
          <DicasSuporteSection />
        </main>
      </div>
    </div>
  );
};

export default ManualArmazem;
