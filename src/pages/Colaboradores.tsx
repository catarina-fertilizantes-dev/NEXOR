import { PasswordInput } from "@/components/ui/password-input";
import { useState, useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Users, UserPlus, Shield, BadgeCheck, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { passwordSchema } from "@/lib/validationSchemas";
import type { Database } from "@/integrations/supabase/types";
import { useScrollToTop } from "@/hooks/useScrollToTop";
import { ModalFooter } from "@/components/ui/modal-footer";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import { UnsavedChangesAlert } from "@/components/UnsavedChangesAlert";

type UserRole = Database['public']['Enums']['user_role'];

interface User {
  id: string;
  nome: string;
  email: string;
  created_at: string;
  role: string | null;
}

interface RpcUserData {
  id: string;
  nome: string;
  email: string;
  created_at: string;
  roles?: UserRole[];
  role?: UserRole;
}

const USERS_FUNCTION = 'get_users_with_roles';

const mapAndFilterColaboradores = (usersData: RpcUserData[]): User[] => {
  const usersMapped: User[] = (usersData || []).map(u => {
    let selectedRole: string | null = null;
    if (Array.isArray(u.roles)) {
      if (u.roles.includes('admin')) selectedRole = 'admin';
      else if (u.roles.includes('logistica')) selectedRole = 'logistica';
      else selectedRole = u.roles[0] ??  null;
    } else {
      selectedRole = u.role ??  null;
    }
    
    return {
      id: u.id,
      nome: u.nome,
      email: u.email,
      created_at: u.created_at,
      role: selectedRole
    };
  });
  
  return usersMapped.filter(u => u.role === 'admin' || u.role === 'logistica');
};

const Colaboradores = () => {
  useScrollToTop();
  
  // ✅ Hook para controle de mudanças não salvas
  const {
    hasUnsavedChanges,
    showAlert,
    markAsChanged,
    markAsSaved,
    reset: resetUnsavedChanges,
    handleClose,
    confirmClose,
    cancelClose
  } = useUnsavedChanges();
  
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserNome, setNewUserNome] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState<UserRole>("logistica");
  const [dialogOpen, setDialogOpen] = useState(false);
  
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdatingRole, setIsUpdatingRole] = useState<Record<string, boolean>>({});
  const [isRetrying, setIsRetrying] = useState(false);
  
  const { toast } = useToast();
  const { hasRole } = useAuth();

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: usersData, error: rpcError } = await supabase.rpc(USERS_FUNCTION) as { data: RpcUserData[] | null; error: Error | null };
      if (rpcError) {
        setError(rpcError.message);
        toast({ 
          variant: 'destructive', 
          title: 'Erro ao carregar colaboradores', 
          description: 'Verifique se a função get_users_with_roles foi atualizada (migration 20251120_update_get_users_function.sql)'
        });
        setLoading(false);
        return;
      }
      const colaboradoresFiltrados = mapAndFilterColaboradores(usersData || []);
      setUsers(colaboradoresFiltrados);
      setLoading(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      toast({ 
        variant: 'destructive', 
        title: 'Erro ao carregar colaboradores', 
        description: 'Não foi possível carregar colaboradores. Confirme se a função get_users_with_roles está atualizada.'
      });
      setLoading(false);
    }
  };

  const handleRetry = async () => {
    setIsRetrying(true);
    await fetchUsers();
    setIsRetrying(false);
  };

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetForm = () => {
    setNewUserEmail("");
    setNewUserNome("");
    setNewUserPassword("");
    setNewUserRole("logistica");
    resetUnsavedChanges(); // ✅ Limpar estado de mudanças
  };

  // ✅ Função para fechar modal com verificação
  const handleCloseModal = () => {
    handleClose(() => {
      setDialogOpen(false);
      resetForm(); // ✅ Limpar dados ao fechar
    });
  };

const handleCreateUser = async () => {
  if (!newUserEmail || !newUserNome || !newUserPassword || !newUserRole) {
    toast({
      variant: "destructive",
      title: "Erro",
      description: "Preencha todos os campos"
    });
    return;
  }

  const passwordValidation = passwordSchema.safeParse(newUserPassword);
  if (!passwordValidation.success) {
    const errorMessage = passwordValidation.error.issues[0]?.message || "Senha inválida";
    console.log('🔍 [DEBUG] Validação de senha falhou:', passwordValidation.error);
    toast({
      variant: "destructive",
      title: "Senha inválida",
      description: errorMessage
    });
    return;
  }

  setIsCreating(true);

  try {
    console.log('🔍 [DEBUG] Tentando criar colaborador:', { email: newUserEmail, nome: newUserNome, role: newUserRole });

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      toast({
        variant: "destructive",
        title: "Erro de configuração",
        description: "Variáveis de ambiente do Supabase não configuradas."
      });
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      toast({
        variant: "destructive",
        title: "Erro de autenticação",
        description: "Sessão expirada. Faça login novamente."
      });
      return;
    }

    const response = await fetch(`${supabaseUrl}/functions/v1/admin-users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': supabaseAnonKey
      },
      body: JSON.stringify({
        email: newUserEmail,
        password: newUserPassword,
        nome: newUserNome,
        role: newUserRole,
      })
    });

    let data = null;
    try {
      data = await response.json();
    } catch (parseError) {
      console.error('❌ [ERROR] Failed to parse response JSON:', parseError);
      toast({
        variant: "destructive",
        title: "Erro ao criar colaborador",
        description: "Resposta inválida do servidor. Verifique os logs para mais detalhes."
      });
      return;
    }

    console.log('🔍 [DEBUG] Resposta da Edge Function:', { status: response.status, data });

    if (!response.ok) {
      console.error('❌ [ERROR] Edge Function returned non-2xx status:', response.status);

      let errorMessage = "Erro ao criar colaborador";

      if (data) {
        if (
          typeof data.details === "object" &&
          data.details !== null &&
          "fieldErrors" in data.details
        ) {
          errorMessage = Object.values(data.details.fieldErrors)
            .flat()
            .map(msg => {
              if (msg === "Invalid email") return "Email inválido";
              if (msg === "Required") return "Campo obrigatório";
              if (msg.includes("at least")) return msg.replace("String must contain at least", "Mínimo de").replace("character(s)", "caracteres");
              return msg;
            })
            .join(" | ");
        } else {
          let rawDetails = data.details || data.error || "";

          if (typeof rawDetails === "string" &&
            (rawDetails.includes('already been registered') || rawDetails.includes('already exists'))) {
            errorMessage = "Este email já está cadastrado no sistema.";
          } else if (data.details) {
            errorMessage = String(data.details);
          } else if (data.error) {
            errorMessage = String(data.error);
          }

          if (data.stage === 'validation' && String(data.error).includes('Weak password')) {
            errorMessage = "Senha muito fraca. Use pelo menos 6 caracteres e evite senhas comuns.";
          } else if (data.stage === 'createUser') {
            if (String(rawDetails).includes('already been registered') ||
              String(rawDetails).includes('already exists')) {
              errorMessage = "Este email já está cadastrado no sistema.";
            }
          } else if (data.stage === 'createColaborador') {
            errorMessage = data.details || "Falha ao criar registro de colaborador.";
          } else if (data.stage === 'adminCheck' && String(data.error).includes('Forbidden')) {
            errorMessage = "Você não tem permissão para criar usuários.";
          }
        }
      }

      toast({
        variant: "destructive",
        title: "Erro ao criar colaborador",
        description: errorMessage
      });
      return;
    }

    if (!data) {
      toast({
        variant: "destructive",
        title: "Erro ao criar colaborador",
        description: "Resposta vazia do servidor."
      });
      return;
    }

    if (data.success) {
      console.log('✅ [SUCCESS] Colaborador criado com sucesso:', data);
      
      markAsSaved(); // ✅ Marcar como salvo ANTES de resetar
      
      toast({
        title: "Colaborador criado com sucesso!",
        description: `${newUserNome} foi adicionado ao sistema com a role ${newUserRole}`
      });
      resetForm();
      setDialogOpen(false);
      await new Promise(resolve => setTimeout(resolve, 500));
      fetchUsers();
    } else {
      toast({
        variant: "destructive",
        title: "Erro ao criar colaborador",
        description: data.error || data.details || "Resposta inesperada do servidor"
      });
    }
  } catch (err) {
    console.error('❌ [ERROR] Exceção ao criar colaborador:', err);
    const errorMessage = err instanceof Error ? err.message : JSON.stringify(err);
    toast({
      variant: "destructive",
      title: "Erro ao criar colaborador",
      description: errorMessage
    });
  } finally {
    setIsCreating(false);
  }
};

  const handleUpdateUserRole = async (userId: string, newRole: UserRole) => {
    setIsUpdatingRole(prev => ({ ...prev, [userId]: true }));

    try {
      const { error } = await supabase.rpc('update_user_role', { _user_id: userId, _role: newRole }) as { error: Error | null };

      if (error) {
        toast({
          variant: "destructive",
          title: "Erro ao atualizar role",
          description: error.message
        });
      } else {
        toast({
          title: "Role atualizada! ",
          description: "Permissões do usuário foram atualizadas"
        });
        fetchUsers();
      }
    } finally {
      setIsUpdatingRole(prev => ({ ...prev, [userId]: false }));
    }
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      admin: 'Administrador',
      logistica: 'Logística',
      armazem: 'Armazém',
      cliente: 'Cliente'
    };
    return labels[role] || role;
  };

  if (! hasRole('admin')) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="text-center">
              <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-lg font-semibold mb-2">Acesso Negado</h2>
              <p className="text-muted-foreground">
                Você não tem permissão para acessar esta página.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 space-y-4 md:space-y-6"> 
      
      {/* ✅ Componente de alerta */}
      <UnsavedChangesAlert 
        open={showAlert}
        onConfirm={confirmClose}
        onCancel={cancelClose}
      />

      <PageHeader
        title="Colaboradores"
        subtitle="Gerencie colaboradores do sistema (Admin e Logística)"
        icon={BadgeCheck}
        actions={
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            if (!open && isCreating) return; // Não fechar durante criação
            if (!open) {
              handleCloseModal(); // ✅ Usar nova função
            } else {
              setDialogOpen(open);
            }
          }}>
            <DialogTrigger asChild>
              <Button className="btn-primary min-h-[44px] max-md:min-h-[44px]">
                <UserPlus className="mr-2 h-4 w-4" />
                Novo Colaborador
              </Button>
            </DialogTrigger>
            
            {/* Modal de Criação - Mobile Otimizado */}
            <DialogContent className="max-w-[calc(100vw-2rem)] md:max-w-md max-h-[calc(100vh-8rem)] md:max-h-[calc(100vh-4rem)] overflow-y-auto my-4 md:my-8">
              <DialogHeader className="pt-2 pb-3 border-b border-border pr-8">
                <DialogTitle className="text-lg md:text-xl pr-2 mt-1">Criar Novo Colaborador</DialogTitle>
              </DialogHeader>
              
              <div className="py-4 px-1 space-y-6">
                {/* Formulário */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="nome" className="text-sm font-medium">Nome Completo</Label>
                    <Input
                      id="nome"
                      value={newUserNome}
                      onChange={(e) => {
                        setNewUserNome(e.target.value);
                        markAsChanged(); // ✅ Marcar como alterado
                      }}
                      placeholder="Nome do usuário"
                      disabled={isCreating}
                      className="min-h-[44px] max-md:min-h-[44px] text-base max-md:text-base"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-user-email" className="text-sm font-medium">Email</Label>
                    <Input
                      id="new-user-email"
                      name="new-user-email"
                      type="email"
                      value={newUserEmail}
                      onChange={(e) => {
                        setNewUserEmail(e.target.value);
                        markAsChanged(); // ✅ Marcar como alterado
                      }}
                      placeholder="email@exemplo.com"
                      disabled={isCreating}
                      autoComplete="new-password" // ✅ Evita preenchimento automático
                      className="min-h-[44px] max-md:min-h-[44px] text-base max-md:text-base"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-user-password" className="text-sm font-medium">Senha</Label>
                    <PasswordInput
                      id="new-user-password"
                      name="new-user-password"
                      value={newUserPassword}
                      onChange={(e) => {
                        setNewUserPassword(e.target.value);
                        markAsChanged();
                      }}
                      placeholder="Senha segura"
                      disabled={isCreating}
                      autoComplete="new-password"
                      className="min-h-[44px] max-md:min-h-[44px] text-base max-md:text-base"
                    />
                    <p className="text-xs text-muted-foreground">
                      Mínimo 6 caracteres. Evite senhas comuns como '123456' ou 'senha123'.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role" className="text-sm font-medium">Role</Label>
                    <Select 
                      value={newUserRole} 
                      onValueChange={(v) => {
                        setNewUserRole(v as UserRole);
                        markAsChanged(); // ✅ Marcar como alterado
                      }}
                      disabled={isCreating}
                    >
                      <SelectTrigger className="min-h-[44px] max-md:min-h-[44px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Administrador</SelectItem>
                        <SelectItem value="logistica">Logística</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Para criar usuários de armazém ou clientes, use as páginas específicas.
                    </p>
                  </div>
                </div>

                {/* Botões no final do conteúdo */}
                <ModalFooter 
                  variant="double"
                  onClose={() => handleCloseModal()}
                  onConfirm={handleCreateUser}
                  confirmText="Criar Colaborador"
                  confirmIcon={<UserPlus className="h-4 w-4" />}
                  isLoading={isCreating}
                />
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
            <Users className="h-5 w-5" />
            Usuários do Sistema
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-muted-foreground">Carregando colaboradores...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 md:p-6 max-w-md mx-auto">
                <Shield className="h-12 w-12 mx-auto mb-4 text-destructive" />
                <h3 className="text-base md:text-lg font-semibold mb-2 text-destructive">Erro ao Carregar Colaboradores</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Não foi possível carregar a lista de colaboradores. Verifique se a função get_users_with_roles foi atualizada para não usar a tabela profiles.
                </p>
                <p className="text-xs text-muted-foreground mb-4 break-words">
                  Execute a migration: <code className="bg-muted px-2 py-1 rounded text-xs">20251120_update_get_users_function.sql</code>
                </p>
                <Button 
                  onClick={handleRetry} 
                  disabled={isRetrying}
                  className="min-h-[44px] max-md:min-h-[44px] btn-secondary"
                >
                  {isRetrying ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Tentando...
                    </>
                  ) : (
                    'Tentar Novamente'
                  )}
                </Button>
              </div>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Nenhum colaborador encontrado.</p>
              <p className="text-sm text-muted-foreground mt-2">
                Apenas usuários com role "admin" ou "logistica" são exibidos aqui.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="flex flex-col md:flex-row md:items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors space-y-3 md:space-y-0 md:space-x-4"
                >
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground text-sm md:text-base break-words">{user.nome}</h3>
                    <p className="text-sm text-muted-foreground break-all">{user.email}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Criado em {new Date(user.created_at).toLocaleDateString('pt-BR')}
                    </p>
                    {!user.role && (
                      <p className="text-xs text-destructive mt-1">
                        ⚠️ Sem role - contate administrador
                      </p>
                    )}
                  </div>

                  <div className="relative w-full md:w-[180px] flex-shrink-0">
                    <Select
                      value={user.role || ''}
                      onValueChange={(value) => handleUpdateUserRole(user.id, value as UserRole)}
                      disabled={isUpdatingRole[user.id]}
                    >
                      <SelectTrigger className="w-full min-h-[44px] max-md:min-h-[44px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {!user.role && <SelectItem value="">Selecione uma role</SelectItem>}
                        <SelectItem value="admin">Administrador</SelectItem>
                        <SelectItem value="logistica">Logística</SelectItem>
                        <SelectItem value="armazem">Armazém</SelectItem>
                        <SelectItem value="cliente">Cliente</SelectItem>
                      </SelectContent>
                    </Select>
                    {isUpdatingRole[user.id] && (
                      <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-md">
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Colaboradores;
