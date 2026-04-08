import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Menu,
  X,
  ArrowLeft,
  ArrowUp,
  Search,
  Home,
  UserPlus,
  Key,
  Compass,
  Calendar,
  Truck,
  Package,
  Smartphone,
  HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { UserAvatar } from "@/components/UserAvatar";
import { cn } from "@/lib/utils";
import { IntroducaoSection } from "./sections/IntroducaoSection";
import { PrimeiroAcessoSection } from "./sections/PrimeiroAcessoSection";
import { LoginRecuperacaoSection } from "./sections/LoginRecuperacaoSection";
import { NavegacaoSection } from "./sections/NavegacaoSection";
import { AgendamentosSection } from "./sections/AgendamentosSection";
import { CarregamentosSection } from "./sections/CarregamentosSection";
import { EstoqueSection } from "./sections/EstoqueSection";
import { AcessoMobileSection } from "./sections/AcessoMobileSection";
import { DicasSuporteSection } from "./sections/DicasSuporteSection";

const menuItems = [
  { id: "introducao", title: "Introdução", icon: Home },
  { id: "primeiro-acesso", title: "Primeiro Acesso", icon: UserPlus },
  { id: "login-recuperacao", title: "Login e Recuperação", icon: Key },
  { id: "navegacao", title: "Navegação no Sistema", icon: Compass },
  { id: "agendamentos", title: "Agendamentos", icon: Calendar },
  { id: "carregamentos", title: "Carregamentos", icon: Truck },
  { id: "estoque", title: "Estoque", icon: Package },
  { id: "acesso-mobile", title: "Acesso Mobile", icon: Smartphone },
  { id: "dicas-suporte", title: "Dicas e Suporte", icon: HelpCircle },
];

// Heights of the two sticky headers used to calculate scroll offset
const SYSTEM_HEADER_H = 56; // h-14 (3.5rem)
const PAGE_HEADER_H = 52;   // py-3 + two lines of text (~52px)
const SCROLL_OFFSET = SYSTEM_HEADER_H + PAGE_HEADER_H + 22; // extra buffer

const ManualArmazem = () => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState("introducao");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Scroll spy via IntersectionObserver
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      // Exclude top 20% and bottom 70% of viewport so the section
      // activates only when it occupies the upper-middle band of the screen.
      { rootMargin: "-20% 0px -70% 0px" }
    );

    const sections = document.querySelectorAll("section[id]");
    sections.forEach((section) => observer.observe(section));

    return () => observer.disconnect();
  }, []);

  // Show/hide "back to top" button
  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 500);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Scroll to section on initial hash load
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash) {
      // Small delay so that the DOM is fully rendered before measuring
      // element positions (relevant when the component mounts fresh).
      setTimeout(() => {
        const element = document.getElementById(hash);
        if (element) {
          const top = element.getBoundingClientRect().top + window.scrollY - SCROLL_OFFSET;
          window.scrollTo({ top, behavior: "smooth" });
          setActiveSection(hash);
        }
      }, 100);
    }
  }, []);

  const handleScrollToSection = useCallback((e: React.MouseEvent, sectionId: string) => {
    e.preventDefault();
    const element = document.getElementById(sectionId);
    if (element) {
      const top = element.getBoundingClientRect().top + window.scrollY - SCROLL_OFFSET;
      window.scrollTo({ top, behavior: "smooth" });
      window.history.pushState(null, "", `#${sectionId}`);
      setActiveSection(sectionId);
      setMobileMenuOpen(false);
    }
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  const SidebarNav = () => (
    <div className="rounded-lg border bg-muted/30 p-4 space-y-1">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-3">
        Seções
      </p>
      {menuItems.map((item) => (
        <a
          key={item.id}
          href={`#${item.id}`}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
            activeSection === item.id
              ? "bg-primary text-primary-foreground font-medium"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
          onClick={(e) => handleScrollToSection(e, item.id)}
        >
          <item.icon className="h-4 w-4 shrink-0" />
          {item.title}
        </a>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* System header – logo + user avatar */}
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

      {/* Page header – back button + title, fixed below system header */}
      <div className="border-b bg-card/95 backdrop-blur sticky top-14 z-40">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="gap-2 shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
          <div className="min-w-0">
            <h1 className="text-lg font-semibold leading-tight truncate">
              Manual do Usuário – Perfil Armazém
            </h1>
            <p className="text-xs text-muted-foreground">Guia completo de uso do sistema</p>
          </div>
        </div>
      </div>

      {/* Ctrl+F hint */}
      <div className="container mx-auto px-4 pt-4">
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
      </div>

      {/* Main content + sticky desktop sidebar */}
      <div className="container mx-auto px-4 py-6 flex gap-6 flex-1">
        {/* Desktop sidebar */}
        <aside className="hidden lg:block w-64 shrink-0">
          <nav className="sticky top-[8rem] max-h-[calc(100vh-9rem)] overflow-y-auto">
            <SidebarNav />
          </nav>
        </aside>

        {/* Sections */}
        <main className="flex-1 min-w-0">
          <IntroducaoSection />
          <Separator className="my-8" />
          <PrimeiroAcessoSection />
          <Separator className="my-8" />
          <LoginRecuperacaoSection />
          <Separator className="my-8" />
          <NavegacaoSection />
          <Separator className="my-8" />
          <AgendamentosSection />
          <Separator className="my-8" />
          <CarregamentosSection />
          <Separator className="my-8" />
          <EstoqueSection />
          <Separator className="my-8" />
          <AcessoMobileSection />
          <Separator className="my-8" />
          <DicasSuporteSection />
        </main>
      </div>

      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/40 z-40"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile sidebar drawer (slides up from bottom) */}
      <aside
        className={cn(
          "lg:hidden fixed bottom-0 left-0 right-0 bg-card border-t z-50 max-h-[70vh] overflow-y-auto transition-transform duration-300",
          mobileMenuOpen ? "translate-y-0" : "translate-y-full"
        )}
      >
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold">Seções</p>
            <Button size="icon" variant="ghost" onClick={() => setMobileMenuOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-1">
            {menuItems.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
                  activeSection === item.id
                    ? "bg-primary text-primary-foreground font-medium"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
                onClick={(e) => handleScrollToSection(e, item.id)}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {item.title}
              </a>
            ))}
          </div>
        </div>
      </aside>

      {/* Mobile floating menu button */}
      <div className="lg:hidden fixed bottom-4 right-4 z-40">
        <Button
          size="lg"
          className="h-12 w-12 rounded-full shadow-lg"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      {/* Back to top button */}
      {showScrollTop && (
        <Button
          size="icon"
          className={cn(
            "fixed right-4 rounded-full shadow-lg z-30",
            "bottom-20 lg:bottom-4"
          )}
          onClick={scrollToTop}
        >
          <ArrowUp className="h-5 w-5" />
        </Button>
      )}
    </div>
  );
};

export default ManualArmazem;
