import { useState, useRef, useEffect } from "react";
import { LogOut, ChevronDown, BookOpen, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { CHANGELOG } from "@/data/changelog";

export const UserAvatar = () => {
  const { user, userRole, signOut } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isChangelogOpen, setIsChangelogOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // 🎯 BUSCAR NOME CORRETO DA TABELA (armazens/clientes/representantes)
  const { data: userDisplayName } = useQuery({
    queryKey: ["user-display-name", user?.id, userRole],
    queryFn: async () => {
      if (!user?.id || !userRole) return null;
      
      if (userRole === 'armazem') {
        const { data, error } = await supabase
          .from('armazens')
          .select('nome')
          .eq('user_id', user.id)
          .single();
        
        if (error) {
          console.error('Erro ao buscar nome do armazém:', error);
          return null;
        }
        return data?.nome;
      }
      
      if (userRole === 'cliente') {
        const { data, error } = await supabase
          .from('clientes')
          .select('nome')
          .eq('user_id', user.id)
          .single();
        
        if (error) {
          console.error('Erro ao buscar nome do cliente:', error);
          return null;
        }
        return data?.nome;
      }
      
      if (userRole === 'representante') {
        const { data, error } = await supabase
          .from('representantes')
          .select('nome')
          .eq('user_id', user.id)
          .single();
        
        if (error) {
          console.error('Erro ao buscar nome do representante:', error);
          return null;
        }
        return data?.nome;
      }
      
      return null;
    },
    enabled: !!user && !!userRole && ['armazem', 'cliente', 'representante'].includes(userRole),
  });

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Não renderizar se não há usuário logado
  if (!user) return null;

  // 🎯 Priorizar nome da tabela específica, depois user_metadata, depois email
  const userName = userDisplayName || user.user_metadata?.nome || user.email?.split('@')[0] || 'Usuário';
  const userEmail = user.email || '';
  
  // Gerar iniciais para o avatar
  const getInitials = (name: string, email: string) => {
    if (name && name !== email.split('@')[0]) {
      const nameParts = name.split(' ');
      if (nameParts.length >= 2) {
        return (nameParts[0][0] + nameParts[1][0]).toUpperCase();
      }
      return name.substring(0, 2).toUpperCase();
    }
    return email.substring(0, 2).toUpperCase();
  };

  const initials = getInitials(userName, userEmail);

  // Mapear roles para labels amigáveis
  const getRoleLabel = (role: string | null) => {
    switch (role) {
      case 'admin': return 'Administrador';
      case 'logistica': return 'Logística';
      case 'armazem': return 'Armazém';
      case 'cliente': return 'Cliente';
      case 'representante': return 'Representante';
      default: return 'Usuário';
    }
  };

  const getRoleColor = (role: string | null) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300';
      case 'logistica': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300';
      case 'armazem': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
      case 'cliente': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300';
      case 'representante': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
    }
  };

  const handleSignOut = async () => {
    setIsOpen(false);
    await signOut();
  };

  const handleManualClick = () => {
    setIsOpen(false);
    navigate("/manual/armazem");
  };

  const handleManualClienteClick = () => {
    setIsOpen(false);
    navigate("/manual/cliente");
  };

  const handleManualRepresentanteClick = () => {
    setIsOpen(false);
    navigate("/manual/representante");
  };

  const handleManualLogisticaClick = () => {
    setIsOpen(false);
    navigate("/manual/logistica");
  };

  const handleChangelogClick = () => {
    setIsOpen(false);
    setIsChangelogOpen(true);
  };

  // 🚧 TEMPORARIAMENTE DESABILITADO
  // TODO: Reativar quando a página de configurações for implementada
  /*
  const handleConfigurationsClick = () => {
    setIsOpen(false);
    // TODO: Implementar página de configurações
  };
  */

  return (
    <div className="relative" ref={dropdownRef}>
      {/* 📱 AVATAR BUTTON RESPONSIVO */}
      <Button
        variant="ghost"
        className="relative h-11 md:h-10 w-auto px-2 md:px-3 rounded-full hover:bg-sidebar-accent/50 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2">
          {/* Avatar Circle */}
          <div className="h-9 w-9 md:h-8 md:w-8 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-white font-semibold text-sm">
            {initials}
          </div>
          
          {/* Nome (apenas desktop) */}
          <span className="hidden md:block text-sm font-medium text-sidebar-foreground max-w-[120px] truncate">
            {userName}
          </span>
          
          {/* Chevron */}
          <ChevronDown className={`h-4 w-4 text-sidebar-foreground/70 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </Button>

      {/* 📱 DROPDOWN RESPONSIVO */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-[calc(100vw-1rem)] max-w-80 md:w-80 bg-card border border-border rounded-lg shadow-lg z-[70] overflow-hidden">
          {/* Header do usuário */}
          <div className="p-3 md:p-4 bg-muted/30">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-white font-semibold text-base md:text-lg flex-shrink-0">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground truncate text-sm md:text-base">{userName}</p>
                <p className="text-xs md:text-sm text-muted-foreground truncate">{userEmail}</p>
                <div className="mt-1 md:mt-2">
                  <Badge 
                    variant="secondary" 
                    className={`text-xs ${getRoleColor(userRole)}`}
                  >
                    {getRoleLabel(userRole)}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* 📱 MENU ITEMS COM CORES AJUSTADAS */}
          <div className="p-2">
            {/* 📘 MANUAL DE AJUDA (apenas para perfil armazem) */}
            {userRole === "armazem" && (
              <>
                <Button
                  variant="ghost"
                  className="w-full justify-start min-h-[44px] p-3 text-left rounded-md transition-all duration-200 hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:shadow-sm group"
                  data-navigation="true"
                  onClick={handleManualClick}
                >
                  <BookOpen className="h-4 w-4 mr-3 text-blue-500 dark:text-blue-400 group-hover:text-blue-700 dark:group-hover:text-blue-300 flex-shrink-0 transition-colors duration-200" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-blue-600 dark:text-blue-400 group-hover:text-blue-800 dark:group-hover:text-blue-200">Manual</p>
                    <p className="text-xs text-blue-500 dark:text-blue-500 group-hover:text-blue-600 dark:group-hover:text-blue-400">Guia do usuário Armazém</p>
                  </div>
                </Button>
                <Separator className="my-2" />
              </>
            )}

            {/* 📘 MANUAL DE AJUDA (apenas para perfil cliente) */}
            {userRole === "cliente" && (
              <>
                <Button
                  variant="ghost"
                  className="w-full justify-start min-h-[44px] p-3 text-left rounded-md transition-all duration-200 hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:shadow-sm group"
                  data-navigation="true"
                  onClick={handleManualClienteClick}
                >
                  <BookOpen className="h-4 w-4 mr-3 text-blue-500 dark:text-blue-400 group-hover:text-blue-700 dark:group-hover:text-blue-300 flex-shrink-0 transition-colors duration-200" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-blue-600 dark:text-blue-400 group-hover:text-blue-800 dark:group-hover:text-blue-200">Manual</p>
                    <p className="text-xs text-blue-500 dark:text-blue-500 group-hover:text-blue-600 dark:group-hover:text-blue-400">Guia do usuário Cliente</p>
                  </div>
                </Button>
                <Separator className="my-2" />
              </>
            )}

            {/* 📘 MANUAL DE AJUDA (apenas para perfil representante) */}
            {userRole === "representante" && (
              <>
                <Button
                  variant="ghost"
                  className="w-full justify-start min-h-[44px] p-3 text-left rounded-md transition-all duration-200 hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:shadow-sm group"
                  data-navigation="true"
                  onClick={handleManualRepresentanteClick}
                >
                  <BookOpen className="h-4 w-4 mr-3 text-blue-500 dark:text-blue-400 group-hover:text-blue-700 dark:group-hover:text-blue-300 flex-shrink-0 transition-colors duration-200" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-blue-600 dark:text-blue-400 group-hover:text-blue-800 dark:group-hover:text-blue-200">Manual</p>
                    <p className="text-xs text-blue-500 dark:text-blue-500 group-hover:text-blue-600 dark:group-hover:text-blue-400">Guia do usuário Representante</p>
                  </div>
                </Button>
                <Separator className="my-2" />
              </>
            )}

            {/* 📘 MANUAL DE AJUDA (perfis logistica e admin) */}
            {(userRole === "logistica" || userRole === "admin") && (
              <>
                <Button
                  variant="ghost"
                  className="w-full justify-start min-h-[44px] p-3 text-left rounded-md transition-all duration-200 hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:shadow-sm group"
                  data-navigation="true"
                  onClick={handleManualLogisticaClick}
                >
                  <BookOpen className="h-4 w-4 mr-3 text-blue-500 dark:text-blue-400 group-hover:text-blue-700 dark:group-hover:text-blue-300 flex-shrink-0 transition-colors duration-200" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-blue-600 dark:text-blue-400 group-hover:text-blue-800 dark:group-hover:text-blue-200">Manual</p>
                    <p className="text-xs text-blue-500 dark:text-blue-500 group-hover:text-blue-600 dark:group-hover:text-blue-400">Guia do usuário Logística</p>
                  </div>
                </Button>
                <Separator className="my-2" />
              </>
            )}

            {/* 📱 LOGOUT COM CORES AJUSTADAS */}
            <Button
              variant="ghost"
              className="w-full justify-start min-h-[44px] p-3 text-left rounded-md transition-all duration-200 hover:bg-red-100 dark:hover:bg-red-900/30 hover:shadow-sm group"
              data-navigation="true"
              onClick={handleSignOut}
            >
              <LogOut className="h-4 w-4 mr-3 text-red-500 dark:text-red-400 group-hover:text-red-700 dark:group-hover:text-red-300 flex-shrink-0 transition-colors duration-200" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-red-600 dark:text-red-400 group-hover:text-red-800 dark:group-hover:text-red-200">Sair</p>
                <p className="text-xs text-red-500 dark:text-red-500 group-hover:text-red-600 dark:group-hover:text-red-400">Encerrar sessão</p>
              </div>
            </Button>
          </div>

          <Separator />

          {/* 🏷️ VERSÃO DO SISTEMA (todos os perfis) */}
          <button
            type="button"
            onClick={handleChangelogClick}
            className="w-full flex items-center justify-center gap-1.5 py-2.5 text-xs text-muted-foreground hover:text-foreground transition-colors duration-200"
          >
            <span>NEXOR v{__APP_VERSION__}</span>
            <span aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1 underline underline-offset-2">
              <Sparkles className="h-3 w-3" />
              Ver novidades
            </span>
          </button>
        </div>
      )}

      {/* 📜 MODAL DE NOVIDADES / CHANGELOG */}
      <Dialog open={isChangelogOpen} onOpenChange={setIsChangelogOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novidades do NEXOR</DialogTitle>
            <DialogDescription>
              Versão atual: v{__APP_VERSION__}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5">
            {CHANGELOG.map((entry, index) => (
              <div key={entry.version}>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant={index === 0 ? "default" : "secondary"}>
                    v{entry.version}
                  </Badge>
                  <span className="text-sm font-semibold text-foreground">{entry.title}</span>
                  <span className="text-xs text-muted-foreground ml-auto">{entry.date}</span>
                </div>
                <ul className="mt-2 ml-1 space-y-1 list-disc list-inside text-sm text-muted-foreground">
                  {entry.highlights.map((highlight, i) => (
                    <li key={i}>{highlight}</li>
                  ))}
                </ul>
                {index < CHANGELOG.length - 1 && <Separator className="mt-4" />}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
