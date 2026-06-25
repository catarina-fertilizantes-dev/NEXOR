import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, Menu, X, ArrowLeft, ArrowUp, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/UserAvatar";
import { IntroducaoSection } from "./sections/logistica/IntroducaoSection";
import { NavegacaoSection } from "./sections/logistica/NavegacaoSection";
import { LiberacoesSection } from "./sections/logistica/LiberacoesSection";
import { AgendamentosSection } from "./sections/logistica/AgendamentosSection";
import { CarregamentosSection } from "./sections/logistica/CarregamentosSection";
import { EstoqueSection } from "./sections/logistica/EstoqueSection";
import { CadastrosSection } from "./sections/logistica/CadastrosSection";
import { PrimeiroAcessoSection } from "./sections/usuarios/PrimeiroAcessoSection";
import { LoginRecuperacaoSection } from "./sections/shared/LoginRecuperacaoSection";
import { AcessoMobileSection } from "./sections/shared/AcessoMobileSection";
import { DicasSuporteSection } from "./sections/shared/DicasSuporteSection";

const sections = [
  { id: "introducao", label: "Introdução", emoji: "🏭" },
  { id: "primeiro-acesso", label: "Primeiro Acesso", emoji: "🆕" },
  { id: "login-recuperacao", label: "Login e Recuperação", emoji: "🔑" },
  { id: "navegacao", label: "Navegação no Sistema", emoji: "🧭" },
  { id: "liberacoes", label: "Liberações", emoji: "📋" },
  { id: "agendamentos", label: "Agendamentos", emoji: "📅" },
  { id: "carregamentos", label: "Carregamentos", emoji: "🚚" },
  { id: "estoque", label: "Estoque", emoji: "📦" },
  { id: "cadastros", label: "Cadastros", emoji: "🗂️" },
  { id: "acesso-mobile", label: "Acesso Mobile", emoji: "📱" },
  { id: "dicas-suporte", label: "Dicas e Suporte", emoji: "🆘" },
];

const ManualLogistica = () => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState("introducao");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const isScrollingRef = useRef(false);

  const scrollToSection = useCallback((sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      isScrollingRef.current = true;
      setActiveSection(sectionId);
      setSidebarOpen(false);

      // Calcular posição considerando headers fixos
      const headerSystemHeight = 56;  // h-14 = 56px
      const headerPageHeight = 61;    // ~61px (py-3 + textos)
      const offset = headerSystemHeight + headerPageHeight + 20; // +20px de margem

      const elementPosition = element.getBoundingClientRect().top + window.scrollY;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth"
      });

      // Atualizar URL com hash
      window.history.pushState(null, "", `#${sectionId}`);

      // Disparar evento de scroll após navegação para ativar o botão "Voltar ao Topo"
      setTimeout(() => {
        window.dispatchEvent(new Event('scroll'));
      }, 100);

      setTimeout(() => {
        isScrollingRef.current = false;
      }, 1000);
    }
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      // Mostrar/esconder botão voltar ao topo (sempre atualizado, independente de scroll programático)
      setShowScrollTop(window.scrollY > 500);

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

  // Scroll para seção ao carregar página com hash
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash) {
      setTimeout(() => {
        const element = document.getElementById(hash);
        if (element) {
          const headerSystemHeight = 56;
          const headerPageHeight = 61;
          const offset = headerSystemHeight + headerPageHeight + 20;

          const elementPosition = element.getBoundingClientRect().top + window.scrollY;
          const offsetPosition = elementPosition - offset;

          window.scrollTo({
            top: offsetPosition,
            behavior: "smooth"
          });

          setActiveSection(hash);
        }
      }, 100);
    }
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

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
    <div className="min-h-screen bg-background flex flex-col">
      {/* ✅ Header do sistema (logo + avatar) */}
      <header className="h-14 bg-sidebar border-b border-sidebar-border flex items-center px-4 sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <img
            src="/nexor-logo.png"
            alt="NEXOR"
            className="h-8 w-8 object-contain"
          />
          <span className="font-bold text-sidebar-foreground">NEXOR</span>
        </div>
        <div className="ml-auto">
          <UserAvatar />
        </div>
      </header>

      {/* ✅ Header da página (fixo abaixo do header do sistema) */}
      <div className="border-b bg-card/95 backdrop-blur sticky top-14 z-40">
        <div className="px-4 py-3 flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/liberacoes')}
            className="gap-2 shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
          <div className="min-w-0">
            <h1 className="text-lg font-semibold leading-tight">
              Manual do Usuário – Perfil Logística
            </h1>
            <p className="text-xs text-muted-foreground">Guia completo de uso do sistema</p>
          </div>
        </div>
      </div>

      {/* ✅ Layout principal (largura total, sem container centralizado) */}
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

        {/* ✅ Sidebar */}
        <aside
          className={`
            fixed md:sticky md:top-[7.5rem] z-40 md:z-auto
            w-64 md:w-56 lg:w-64
            bg-card md:bg-transparent
            border-r border-border
            h-screen md:h-[calc(100vh-7.5rem)]
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

        {/* ✅ Main content */}
        <main ref={contentRef} className="flex-1 p-4 md:p-6 lg:p-8 max-w-4xl space-y-8 min-w-0">
          {/* ✅ Dica Ctrl+F */}
          <div className="rounded-lg border bg-muted/50 p-3">
            <p className="text-sm text-muted-foreground flex items-center gap-2 flex-wrap">
              <Search className="h-4 w-4 shrink-0" />
              💡 <strong>Dica:</strong> Use{" "}
              <kbd className="px-2 py-0.5 bg-background border rounded text-xs">Ctrl+F</kbd>
              {" "}(ou{" "}
              <kbd className="px-2 py-0.5 bg-background border rounded text-xs">Cmd+F</kbd>
              {" "}no Mac) para buscar qualquer termo neste manual.
            </p>
          </div>

          {/* ✅ Seções com IDs para navegação */}
          <section id="introducao">
            <IntroducaoSection />
          </section>
          <div className="border-t border-border" />

          <section id="primeiro-acesso">
            <PrimeiroAcessoSection />
          </section>
          <div className="border-t border-border" />

          <section id="login-recuperacao">
            <LoginRecuperacaoSection />
          </section>
          <div className="border-t border-border" />

          <section id="navegacao">
            <NavegacaoSection />
          </section>
          <div className="border-t border-border" />

          <section id="liberacoes">
            <LiberacoesSection />
          </section>
          <div className="border-t border-border" />

          <section id="agendamentos">
            <AgendamentosSection />
          </section>
          <div className="border-t border-border" />

          <section id="carregamentos">
            <CarregamentosSection />
          </section>
          <div className="border-t border-border" />

          <section id="estoque">
            <EstoqueSection />
          </section>
          <div className="border-t border-border" />

          <section id="cadastros">
            <CadastrosSection />
          </section>
          <div className="border-t border-border" />

          <section id="acesso-mobile">
            <AcessoMobileSection />
          </section>
          <div className="border-t border-border" />

          <section id="dicas-suporte">
            <DicasSuporteSection userProfile="logistica" />
          </section>
        </main>
      </div>

      {/* ✅ Botão voltar ao topo */}
      {showScrollTop && (
        <Button
          size="icon"
          className="fixed bottom-20 md:bottom-6 right-6 rounded-full shadow-lg z-30"
          onClick={scrollToTop}
        >
          <ArrowUp className="h-5 w-5" />
        </Button>
      )}
    </div>
  );
};

export default ManualLogistica;
