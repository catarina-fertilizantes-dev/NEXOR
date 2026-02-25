// hooks/useUnsavedChanges.js
import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export const useUnsavedChanges = (options = {}) => {
  const { 
    enableBrowserWarnings = false,
    warningMessage = "Você tem alterações não salvas. Tem certeza que deseja sair?" 
  } = options;

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const pendingActionRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  const markAsChanged = useCallback(() => {
    setHasUnsavedChanges(true);
  }, []);

  const markAsSaved = useCallback(() => {
    setHasUnsavedChanges(false);
  }, []);

  const reset = useCallback(() => {
    setHasUnsavedChanges(false);
    setShowAlert(false);
    pendingActionRef.current = null;
  }, []);

  const handleClose = useCallback((closeAction) => {
    if (hasUnsavedChanges) {
      pendingActionRef.current = closeAction;
      setShowAlert(true);
    } else {
      closeAction();
    }
  }, [hasUnsavedChanges]);

  const confirmClose = useCallback(() => {
    if (pendingActionRef.current) {
      pendingActionRef.current();
    }
    reset();
  }, [reset]);

  const cancelClose = useCallback(() => {
    setShowAlert(false);
    pendingActionRef.current = null;
  }, []);

  // ✅ Interceptar navegação do navegador (back/forward/refresh)
  useEffect(() => {
    if (!enableBrowserWarnings) return;

    const handleBeforeUnload = (event) => {
      if (hasUnsavedChanges) {
        event.preventDefault();
        event.returnValue = warningMessage;
        return warningMessage;
      }
    };

    const handlePopState = (event) => {
      if (hasUnsavedChanges) {
        // Impedir a navegação
        window.history.pushState(null, '', location.pathname + location.search);
        
        // Mostrar alerta customizado
        pendingActionRef.current = () => {
          window.history.back();
        };
        setShowAlert(true);
      }
    };

    // Adicionar state inicial para detectar mudanças
    window.history.pushState(null, '', location.pathname + location.search);

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [hasUnsavedChanges, enableBrowserWarnings, warningMessage, location]);

  // ✅ NOVO: Interceptar cliques em links e botões de navegação
  useEffect(() => {
    if (!enableBrowserWarnings || !hasUnsavedChanges) return;

    const handleClick = (event) => {
      const target = event.target.closest('a, button');
      if (!target) return;

      // Verificar se é um link de navegação
      const href = target.getAttribute('href');
      const onClick = target.getAttribute('onclick');
      
      // Links externos ou com  - permitir
      if (target.getAttribute('target') === '_blank') return;
      
      // Links de navegação interna ou botões que navegam
      if (href || 
          target.textContent?.includes('Sair') ||
          target.textContent?.includes('Configurações') ||
          target.closest('[data-navigation]') ||
          target.closest('.sidebar') ||
          target.closest('[role="menuitem"]')) {
        
        event.preventDefault();
        event.stopPropagation();
        
        pendingActionRef.current = () => {
          if (href) {
            window.location.href = href;
          } else if (onClick) {
            target.click();
          } else {
            // Para botões sem href, tentar executar o onClick original
            const originalHandler = target.__originalClick;
            if (originalHandler) {
              originalHandler();
            }
          }
        };
        
        setShowAlert(true);
      }
    };

    // Capturar cliques em toda a página
    document.addEventListener('click', handleClick, true);

    return () => {
      document.removeEventListener('click', handleClick, true);
    };
  }, [hasUnsavedChanges, enableBrowserWarnings]);

  // ✅ Função para navegação programática
  const handleNavigation = useCallback((path) => {
    if (hasUnsavedChanges) {
      pendingActionRef.current = () => navigate(path);
      setShowAlert(true);
    } else {
      navigate(path);
    }
  }, [hasUnsavedChanges, navigate]);

  return {
    hasUnsavedChanges,
    showAlert,
    markAsChanged,
    markAsSaved,
    reset,
    handleClose,
    confirmClose,
    cancelClose,
    handleNavigation,
  };
};
