// hooks/useUnsavedChanges.js
import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export const useUnsavedChanges = (options = {}) => {
  const { 
    enableBrowserWarnings = false, // ✅ Novo: habilitar verificações de navegador
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

  // ✅ NOVO: Interceptar navegação do navegador (back/forward)
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

  // ✅ NOVO: Função para interceptar navegação programática
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
    handleNavigation, // ✅ Nova função para navegação
  };
};
