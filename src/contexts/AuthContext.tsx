import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { emailSchema, passwordSchema, nomeSchema } from "@/lib/validationSchemas";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, nome: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  userRole: string | null;
  hasRole: (role: string) => boolean;
  needsPasswordChange: boolean;
  recoveryMode: boolean;
  clearRecoveryMode: () => void;
  getDefaultRouteForRole: (role: string | null) => string; // 🆕 FUNÇÃO TEMPORÁRIA
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 🔒 Função para verificar status ativo do usuário
const checkUserActiveStatus = async (userId: string): Promise<{ active: boolean; role: string | null; message: string }> => {
  try {
    console.log('🔍 [DEBUG] Verificando status ativo para usuário:', userId);
    
    const { data, error } = await supabase.rpc('check_user_active_status', {
      user_uuid: userId
    });

    if (error) {
      console.error('❌ [ERROR] Erro na RPC check_user_active_status:', error);
      // 🛡️ FALLBACK SEGURO: Em caso de erro, permitir acesso (não bloquear sistema)
      return { active: true, role: null, message: 'Erro na verificação - acesso permitido' };
    }

    console.log('✅ [DEBUG] Status check resultado:', data);
    return data || { active: true, role: null, message: 'Sem dados - acesso permitido' };
  } catch (err) {
    console.error('❌ [ERROR] Erro inesperado na verificação de status:', err);
    // 🛡️ FALLBACK SEGURO: Em caso de erro, permitir acesso
    return { active: true, role: null, message: 'Erro inesperado - acesso permitido' };
  }
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [needsPasswordChange, setNeedsPasswordChange] = useState(false);
  const [recoveryMode, setRecoveryMode] = useState(false);
  const { toast } = useToast();

  const fetchUserRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('❌ [ERROR] Erro ao buscar role:', error);
        setUserRole(null);
        return;
      }

      setUserRole(data?.role ?? null);
      console.log('✅ [DEBUG] Role definida:', data?.role);
    } catch (err) {
      console.error('❌ [ERROR] Erro inesperado ao buscar role:', err);
      setUserRole(null);
    }
  };

  // 🚧 FUNÇÃO TEMPORÁRIA: Redirecionamento por role enquanto Dashboard não está implementado
  // TODO: REMOVER esta função quando os dashboards personalizados forem implementados
  // Após implementação dos dashboards, todos os perfis devem ser redirecionados para "/" (Dashboard)
  const getDefaultRouteForRole = (role: string | null): string => {
    console.log('🚧 [TEMP] Redirecionamento temporário para role:', role);
    
    if (!role) {
      console.log('🚧 [TEMP] Role não definida, redirecionando para /agendamentos');
      return "/agendamentos"; // Fallback padrão
    }
    
    switch (role) {
      case "admin":
      case "logistica":
      case "cliente":        // 🆕 CORRIGIDO: Cliente tem acesso a Liberações
      case "representante":  // �� CORRIGIDO: Representante tem acesso a Liberações
        console.log('🚧 [TEMP] Admin/Logística/Cliente/Representante → /liberacoes');
        return "/liberacoes"; // Primeira página disponível para estes perfis
      
      case "armazem":
        console.log('🚧 [TEMP] Armazém → /agendamentos');
        return "/agendamentos"; // Primeira página disponível para armazém (excluído de liberações)
      
      default:
        console.log('🚧 [TEMP] Role desconhecida, redirecionando para /agendamentos');
        return "/agendamentos"; // Fallback padrão
    }
  };

  useEffect(() => {
    // 🔄 MANTÉM O CÓDIGO ORIGINAL - SEM VALIDAÇÃO DE STATUS AQUI
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('🔍 [DEBUG] Auth state change event:', event);
        
        // Handle password recovery event
        if (event === 'PASSWORD_RECOVERY') {
          setRecoveryMode(true);
          console.log('🔍 [DEBUG] Password recovery mode activated');
        }
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          fetchUserRole(session.user.id);
          // Check if user needs to change password
          const forceChange = session.user.user_metadata?.force_password_change === true;
          setNeedsPasswordChange(forceChange);
          console.log('🔍 [DEBUG] Force password change:', forceChange);
        } else {
          setUserRole(null);
          setNeedsPasswordChange(false);
          setRecoveryMode(false);
        }
      }
    );

    // 🔄 MANTÉM O CÓDIGO ORIGINAL - SEM VALIDAÇÃO DE STATUS AQUI
    const initializeAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        await fetchUserRole(session.user.id);
        // Check if user needs to change password
        const forceChange = session.user.user_metadata?.force_password_change === true;
        setNeedsPasswordChange(forceChange);
        console.log('🔍 [DEBUG] Force password change:', forceChange);
      }
      
      setLoading(false);
    };

    initializeAuth();

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      
      const emailResult = emailSchema.safeParse(email);
      const passwordResult = passwordSchema.safeParse(password);
      
      if (!emailResult.success || !passwordResult.success) {
        toast({
          variant: "destructive",
          title: "Erro de validação",
          description: "Email ou senha inválidos"
        });
        return { error: new Error("Validation failed") };
      }
      
      const { data, error } = await supabase.auth.signInWithPassword({ 
        email: emailResult.data, 
        password: passwordResult.data 
      });

      if (error) {
        let errorMessage = "Erro ao fazer login";
        
        if (error.message === "Invalid login credentials") {
          errorMessage = "Email ou senha incorretos";
        } else if (error.message === "Email not confirmed") {
          errorMessage = "Email não confirmado";
        } else if (error.message === "Too many requests") {
          errorMessage = "Muitas tentativas. Tente novamente mais tarde";
        }
        
        toast({
          variant: "destructive",
          title: "Erro no login",
          description: errorMessage,
        });
        
        return { error };
      } 
      
      if (data.user) {
        console.log('✅ [DEBUG] Login bem-sucedido, verificando status ativo...');
        
        // 🔒 VALIDAÇÃO DE USUÁRIO ATIVO - APENAS NO LOGIN ATIVO
        const statusCheck = await checkUserActiveStatus(data.user.id);
        
        if (!statusCheck.active) {
          console.log('🚫 [DEBUG] Usuário inativo detectado - bloqueando acesso');
          
          // Fazer logout imediato SEM disparar auth state change loop
          await supabase.auth.signOut();
          
          toast({
            variant: "destructive",
            title: "Não foi possível acessar o sistema",
            description: "Entre em contato com o suporte (Código: USR001).",
          });
          
          return { error: new Error("User inactive") };
        }
        
        console.log('✅ [DEBUG] Usuário ativo - prosseguindo com login');
        
        // Verificar se precisa trocar senha
        const needsChange = data.user.user_metadata?.force_password_change === true;
        
        if (needsChange) {
          setNeedsPasswordChange(true);
        }
        
        // Verificar se está em modo recovery
        if (data.user.recovery_sent_at) {
          setRecoveryMode(true);
        }
        
        toast({
          title: "Login realizado com sucesso!",
          description: `Bem-vindo${needsChange ? '. Você deve alterar sua senha.' : '!'}`,
        });
      }
      
      return { error };
    } catch (err) {
      console.error("❌ [ERROR] Erro inesperado no login:", err);
      toast({
        variant: "destructive",
        title: "Erro inesperado",
        description: "Tente novamente ou entre em contato com o suporte",
      });
      return { error: err };
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, nome: string) => {
    const emailResult = emailSchema.safeParse(email);
    const passwordResult = passwordSchema.safeParse(password);
    const nomeResult = nomeSchema.safeParse(nome);
    
    if (!emailResult.success || !passwordResult.success || !nomeResult.success) {
      toast({
        variant: "destructive",
        title: "Erro de validação",
        description: "Por favor, verifique os dados informados"
      });
      return { error: new Error("Validation failed") };
    }
    
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email: emailResult.data,
      password: passwordResult.data,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          nome: nomeResult.data
        }
      }
    });

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao criar conta",
        description: error.message
      });
    } else {
      toast({
        title: "Conta criada com sucesso!",
        description: "Você já pode fazer login com a role padrão de cliente."
      });
    }

    return { error };
  };

  const signOut = async () => {
    try {
      console.log('🚪 [DEBUG] Iniciando logout...');
      
      // 1. Logout do Supabase
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('❌ [ERROR] Erro no logout do Supabase:', error);
      }
      
      // 2. Limpar estados locais FORÇADAMENTE
      setUser(null);
      setSession(null);
      setUserRole(null);
      setNeedsPasswordChange(false);
      setRecoveryMode(false);
      
      // 3. Limpar localStorage/sessionStorage (se houver cache customizado)
      try {
        localStorage.removeItem('supabase.auth.token');
        sessionStorage.clear();
      } catch (storageError) {
        console.warn('⚠️ [WARN] Erro ao limpar storage:', storageError);
      }
      
      // 4. Forçar redirecionamento
      window.location.href = '/auth';
      
      console.log('✅ [SUCCESS] Logout concluído');
      
      toast({
        title: "Logout realizado",
        description: "Até logo!"
      });
      
    } catch (err) {
      console.error('❌ [ERROR] Erro inesperado no logout:', err);
      
      // 5. FALLBACK: Forçar limpeza mesmo com erro
      setUser(null);
      setSession(null);
      setUserRole(null);
      setNeedsPasswordChange(false);
      setRecoveryMode(false);
      
      // Forçar redirecionamento mesmo com erro
      window.location.href = '/auth';
    }
  };

  const hasRole = (role: string) => userRole === role;

  const clearRecoveryMode = () => {
    setRecoveryMode(false);
    console.log('🔍 [DEBUG] Recovery mode cleared');
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      signIn,
      signUp,
      signOut,
      userRole,
      hasRole,
      needsPasswordChange,
      recoveryMode,
      clearRecoveryMode,
      getDefaultRouteForRole // 🆕 FUNÇÃO TEMPORÁRIA
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
