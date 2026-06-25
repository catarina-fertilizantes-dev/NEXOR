export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      agendamentos: {
        Row: {
          armazem_id: string | null
          cliente_id: string | null
          cnpj_transportadora: string
          created_at: string | null
          created_by: string
          data_retirada: string | null
          id: string
          liberacao_id: string
          motorista_documento: string
          motorista_nome: string
          observacoes: string | null
          placa_caminhao: string
          placa_carreta_1: string
          placa_carreta_2: string | null
          quantidade: number
          status: Database["public"]["Enums"]["agendamento_status"] | null
          transportadora: string
          updated_at: string | null
        }
        Insert: {
          armazem_id?: string | null
          cliente_id?: string | null
          cnpj_transportadora: string
          created_at?: string | null
          created_by: string
          data_retirada?: string | null
          id?: string
          liberacao_id: string
          motorista_documento: string
          motorista_nome: string
          observacoes?: string | null
          placa_caminhao: string
          placa_carreta_1: string
          placa_carreta_2?: string | null
          quantidade: number
          status?: Database["public"]["Enums"]["agendamento_status"] | null
          transportadora: string
          updated_at?: string | null
        }
        Update: {
          armazem_id?: string | null
          cliente_id?: string | null
          cnpj_transportadora?: string
          created_at?: string | null
          created_by?: string
          data_retirada?: string | null
          id?: string
          liberacao_id?: string
          motorista_documento?: string
          motorista_nome?: string
          observacoes?: string | null
          placa_caminhao?: string
          placa_carreta_1?: string
          placa_carreta_2?: string | null
          quantidade?: number
          status?: Database["public"]["Enums"]["agendamento_status"] | null
          transportadora?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agendamentos_armazem_id_fkey"
            columns: ["armazem_id"]
            isOneToOne: false
            referencedRelation: "armazens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agendamentos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agendamentos_liberacao_id_fkey"
            columns: ["liberacao_id"]
            isOneToOne: false
            referencedRelation: "liberacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      armazens: {
        Row: {
          ativo: boolean | null
          capacidade_disponivel: number | null
          capacidade_total: number | null
          cep: string | null
          cidade: string
          cnpj_cpf: string | null
          created_at: string | null
          email: string | null
          endereco: string | null
          estado: string
          id: string
          nome: string
          telefone: string | null
          temp_password: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          ativo?: boolean | null
          capacidade_disponivel?: number | null
          capacidade_total?: number | null
          cep?: string | null
          cidade: string
          cnpj_cpf?: string | null
          created_at?: string | null
          email?: string | null
          endereco?: string | null
          estado: string
          id?: string
          nome: string
          telefone?: string | null
          temp_password?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          ativo?: boolean | null
          capacidade_disponivel?: number | null
          capacidade_total?: number | null
          cep?: string | null
          cidade?: string
          cnpj_cpf?: string | null
          created_at?: string | null
          email?: string | null
          endereco?: string | null
          estado?: string
          id?: string
          nome?: string
          telefone?: string | null
          temp_password?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      carregamentos: {
        Row: {
          agendamento_id: string
          armazem_id: string | null
          atualizado_por: string | null
          cliente_id: string | null
          created_at: string | null
          criado_por: string | null
          data_carregando: string | null
          data_chegada: string | null
          data_documentacao: string | null
          data_finalizacao: string | null
          data_inicio: string | null
          docs_remessa_url: string | null
          docs_remessa_xml_url: string | null
          docs_retorno_url: string | null
          docs_retorno_xml_url: string | null
          docs_venda_url: string | null
          docs_venda_xml_url: string | null
          etapa_5a_status: string | null
          etapa_5b_status: string | null
          etapa_5c_status: string | null
          etapa_atual: number
          id: string
          numero_nf: string | null
          observacao_carregando: string | null
          observacao_chegada: string | null
          observacao_documentacao: string | null
          observacao_finalizacao: string | null
          observacao_inicio: string | null
          updated_at: string | null
          updated_by: string | null
          url_foto_carregando: string | null
          url_foto_chegada: string | null
          url_foto_finalizacao: string | null
          url_foto_inicio: string | null
        }
        Insert: {
          agendamento_id: string
          armazem_id?: string | null
          atualizado_por?: string | null
          cliente_id?: string | null
          created_at?: string | null
          criado_por?: string | null
          data_carregando?: string | null
          data_chegada?: string | null
          data_documentacao?: string | null
          data_finalizacao?: string | null
          data_inicio?: string | null
          docs_remessa_url?: string | null
          docs_remessa_xml_url?: string | null
          docs_retorno_url?: string | null
          docs_retorno_xml_url?: string | null
          docs_venda_url?: string | null
          docs_venda_xml_url?: string | null
          etapa_5a_status?: string | null
          etapa_5b_status?: string | null
          etapa_5c_status?: string | null
          etapa_atual?: number
          id?: string
          numero_nf?: string | null
          observacao_carregando?: string | null
          observacao_chegada?: string | null
          observacao_documentacao?: string | null
          observacao_finalizacao?: string | null
          observacao_inicio?: string | null
          updated_at?: string | null
          updated_by?: string | null
          url_foto_carregando?: string | null
          url_foto_chegada?: string | null
          url_foto_finalizacao?: string | null
          url_foto_inicio?: string | null
        }
        Update: {
          agendamento_id?: string
          armazem_id?: string | null
          atualizado_por?: string | null
          cliente_id?: string | null
          created_at?: string | null
          criado_por?: string | null
          data_carregando?: string | null
          data_chegada?: string | null
          data_documentacao?: string | null
          data_finalizacao?: string | null
          data_inicio?: string | null
          docs_remessa_url?: string | null
          docs_remessa_xml_url?: string | null
          docs_retorno_url?: string | null
          docs_retorno_xml_url?: string | null
          docs_venda_url?: string | null
          docs_venda_xml_url?: string | null
          etapa_5a_status?: string | null
          etapa_5b_status?: string | null
          etapa_5c_status?: string | null
          etapa_atual?: number
          id?: string
          numero_nf?: string | null
          observacao_carregando?: string | null
          observacao_chegada?: string | null
          observacao_documentacao?: string | null
          observacao_finalizacao?: string | null
          observacao_inicio?: string | null
          updated_at?: string | null
          updated_by?: string | null
          url_foto_carregando?: string | null
          url_foto_chegada?: string | null
          url_foto_finalizacao?: string | null
          url_foto_inicio?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "carregamentos_agendamento_id_fkey"
            columns: ["agendamento_id"]
            isOneToOne: false
            referencedRelation: "agendamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "carregamentos_agendamento_id_fkey"
            columns: ["agendamento_id"]
            isOneToOne: false
            referencedRelation: "agendamentos_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "carregamentos_armazem_id_fkey"
            columns: ["armazem_id"]
            isOneToOne: false
            referencedRelation: "armazens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "carregamentos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes: {
        Row: {
          ativo: boolean | null
          cep: string | null
          cidade: string | null
          cnpj_cpf: string
          created_at: string | null
          email: string
          endereco: string | null
          estado: string | null
          id: string
          nome: string
          representante_id: string | null
          telefone: string | null
          temp_password: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          ativo?: boolean | null
          cep?: string | null
          cidade?: string | null
          cnpj_cpf: string
          created_at?: string | null
          email: string
          endereco?: string | null
          estado?: string | null
          id?: string
          nome: string
          representante_id?: string | null
          telefone?: string | null
          temp_password?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          ativo?: boolean | null
          cep?: string | null
          cidade?: string | null
          cnpj_cpf?: string
          created_at?: string | null
          email?: string
          endereco?: string | null
          estado?: string | null
          id?: string
          nome?: string
          representante_id?: string | null
          telefone?: string | null
          temp_password?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clientes_representante_id_fkey"
            columns: ["representante_id"]
            isOneToOne: false
            referencedRelation: "representantes"
            referencedColumns: ["id"]
          },
        ]
      }
      colaboradores: {
        Row: {
          created_at: string | null
          email: string
          id: string
          nome: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          nome: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          nome?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      estoque: {
        Row: {
          armazem_id: string
          id: string
          produto_id: string
          quantidade: number
          quantidade_disponivel: number
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          armazem_id: string
          id?: string
          produto_id: string
          quantidade?: number
          quantidade_disponivel: number
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          armazem_id?: string
          id?: string
          produto_id?: string
          quantidade?: number
          quantidade_disponivel?: number
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "estoque_armazem_id_fkey"
            columns: ["armazem_id"]
            isOneToOne: false
            referencedRelation: "armazens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estoque_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      estoque_remessas: {
        Row: {
          armazem_id: string
          created_at: string | null
          created_by: string | null
          data_remessa: string
          id: string
          numero_remessa: string
          observacoes: string | null
          produto_id: string
          quantidade_original: number
          updated_at: string | null
          url_nota_remessa: string | null
          url_xml_remessa: string | null
        }
        Insert: {
          armazem_id: string
          created_at?: string | null
          created_by?: string | null
          data_remessa?: string
          id?: string
          numero_remessa: string
          observacoes?: string | null
          produto_id: string
          quantidade_original: number
          updated_at?: string | null
          url_nota_remessa?: string | null
          url_xml_remessa?: string | null
        }
        Update: {
          armazem_id?: string
          created_at?: string | null
          created_by?: string | null
          data_remessa?: string
          id?: string
          numero_remessa?: string
          observacoes?: string | null
          produto_id?: string
          quantidade_original?: number
          updated_at?: string | null
          url_nota_remessa?: string | null
          url_xml_remessa?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "estoque_remessas_armazem_id_fkey"
            columns: ["armazem_id"]
            isOneToOne: false
            referencedRelation: "armazens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estoque_remessas_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      liberacoes: {
        Row: {
          armazem_id: string
          cliente_id: string
          created_at: string | null
          created_by: string
          data_liberacao: string | null
          id: string
          pedido_interno: string
          produto_id: string
          quantidade_liberada: number
          quantidade_retirada: number
          status: Database["public"]["Enums"]["liberacao_status"] | null
          updated_at: string | null
        }
        Insert: {
          armazem_id: string
          cliente_id: string
          created_at?: string | null
          created_by: string
          data_liberacao?: string | null
          id?: string
          pedido_interno: string
          produto_id: string
          quantidade_liberada: number
          quantidade_retirada?: number
          status?: Database["public"]["Enums"]["liberacao_status"] | null
          updated_at?: string | null
        }
        Update: {
          armazem_id?: string
          cliente_id?: string
          created_at?: string | null
          created_by?: string
          data_liberacao?: string | null
          id?: string
          pedido_interno?: string
          produto_id?: string
          quantidade_liberada?: number
          quantidade_retirada?: number
          status?: Database["public"]["Enums"]["liberacao_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "liberacoes_armazem_id_fkey"
            columns: ["armazem_id"]
            isOneToOne: false
            referencedRelation: "armazens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "liberacoes_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "liberacoes_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      produtos: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          id: string
          nome: string
          unidade: string | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          id?: string
          nome: string
          unidade?: string | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          id?: string
          nome?: string
          unidade?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      representantes: {
        Row: {
          ativo: boolean | null
          cpf: string
          created_at: string | null
          email: string
          id: string
          nome: string
          regiao_atuacao: string | null
          telefone: string | null
          temp_password: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          ativo?: boolean | null
          cpf: string
          created_at?: string | null
          email: string
          id?: string
          nome: string
          regiao_atuacao?: string | null
          telefone?: string | null
          temp_password?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          ativo?: boolean | null
          cpf?: string
          created_at?: string | null
          email?: string
          id?: string
          nome?: string
          regiao_atuacao?: string | null
          telefone?: string | null
          temp_password?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          can_create: boolean | null
          can_delete: boolean | null
          can_read: boolean | null
          can_update: boolean | null
          created_at: string | null
          id: string
          resource: string
          role: string
        }
        Insert: {
          can_create?: boolean | null
          can_delete?: boolean | null
          can_read?: boolean | null
          can_update?: boolean | null
          created_at?: string | null
          id?: string
          resource: string
          role: string
        }
        Update: {
          can_create?: boolean | null
          can_delete?: boolean | null
          can_read?: boolean | null
          can_update?: boolean | null
          created_at?: string | null
          id?: string
          resource?: string
          role?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      agendamentos_view: {
        Row: {
          armazem_nome: string | null
          cliente_cnpj: string | null
          cliente_id: string | null
          cliente_nome: string | null
          cnpj_transportadora: string | null
          created_at: string | null
          data_retirada: string | null
          id: string | null
          liberacao_id: string | null
          motorista_documento: string | null
          motorista_nome: string | null
          observacoes: string | null
          pedido_interno: string | null
          placa_caminhao: string | null
          placa_carreta_1: string | null
          placa_carreta_2: string | null
          produto_nome: string | null
          quantidade: number | null
          status: Database["public"]["Enums"]["agendamento_status"] | null
          transportadora: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agendamentos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agendamentos_liberacao_id_fkey"
            columns: ["liberacao_id"]
            isOneToOne: false
            referencedRelation: "liberacoes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      alterar_armazem_liberacao: {
        Args: {
          p_liberacao_id: string
          p_novo_armazem_id: string
          p_user_id: string
        }
        Returns: Json
      }
      can_upload_documento_for_carregamento: {
        Args: { _carregamento_id: string; _user_id: string }
        Returns: boolean
      }
      can_upload_foto_for_carregamento: {
        Args: { _carregamento_id: string; _user_id: string }
        Returns: boolean
      }
      check_user_active_status: { Args: { user_uuid: string }; Returns: Json }
      clear_user_temp_password: { Args: { user_email: string }; Returns: Json }
      get_agendamentos_by_representante_backup: {
        Args: { p_representante_id: string }
        Returns: {
          armazem_cidade: string
          armazem_estado: string
          armazem_id: string
          armazem_nome: string
          carregamento_id: string
          cliente_cnpj_cpf: string
          cliente_id: string
          cliente_nome: string
          created_at: string
          created_by: string
          data_liberacao: string
          data_retirada: string
          etapa_atual: number
          id: string
          liberacao_id: string
          motorista_documento: string
          motorista_nome: string
          observacoes: string
          pedido_interno: string
          placa_caminhao: string
          produto_id: string
          produto_nome: string
          produto_unidade: string
          quantidade: number
          quantidade_liberada: number
          quantidade_retirada: number
          status: Database["public"]["Enums"]["agendamento_status"]
          status_liberacao: Database["public"]["Enums"]["liberacao_status"]
          tipo_caminhao: string
          updated_at: string
        }[]
      }
      get_agendamentos_universal: {
        Args: {
          p_armazem_id?: string
          p_cliente_id?: string
          p_representante_id?: string
          p_user_id?: string
          p_user_role: string
        }
        Returns: {
          armazem_cidade: string
          armazem_estado: string
          armazem_id: string
          armazem_nome: string
          carregamento_id: string
          cliente_cnpj_cpf: string
          cliente_id: string
          cliente_nome: string
          cnpj_transportadora: string
          created_at: string
          created_by: string
          data_liberacao: string
          data_retirada: string
          etapa_atual: number
          finalizado: boolean
          id: string
          liberacao_id: string
          motorista_documento: string
          motorista_nome: string
          observacoes: string
          pedido_interno: string
          percentual_carregamento: number
          placa_caminhao: string
          placa_carreta_1: string
          placa_carreta_2: string
          produto_id: string
          produto_nome: string
          produto_unidade: string
          quantidade: number
          quantidade_liberada: number
          quantidade_retirada: number
          status: Database["public"]["Enums"]["agendamento_status"]
          status_carregamento: string
          status_liberacao: Database["public"]["Enums"]["liberacao_status"]
          tooltip_carregamento: string
          transportadora: string
          updated_at: string
        }[]
      }
      get_carregamento_detalhe_by_representante_backup: {
        Args: { p_carregamento_id: string; p_representante_id: string }
        Returns: {
          agendamento_data_retirada: string
          agendamento_id: string
          agendamento_motorista_documento: string
          agendamento_motorista_nome: string
          agendamento_placa_caminhao: string
          agendamento_quantidade: number
          armazem_id: string
          cliente_id: string
          cliente_nome: string
          created_at: string
          data_carregando: string
          data_chegada: string
          data_documentacao: string
          data_finalizacao: string
          data_inicio: string
          docs_retorno_url: string
          docs_retorno_xml_url: string
          etapa_atual: number
          id: string
          liberacao_pedido_interno: string
          numero_nf: string
          observacao_carregando: string
          observacao_chegada: string
          observacao_documentacao: string
          observacao_finalizacao: string
          observacao_inicio: string
          produto_nome: string
          url_foto_carregando: string
          url_foto_chegada: string
          url_foto_finalizacao: string
          url_foto_inicio: string
        }[]
      }
      get_carregamento_detalhe_universal: {
        Args: {
          p_armazem_id?: string
          p_carregamento_id: string
          p_cliente_id?: string
          p_representante_id?: string
          p_user_id?: string
          p_user_role: string
        }
        Returns: {
          agendamento_cnpj_transportadora: string
          agendamento_data_retirada: string
          agendamento_id: string
          agendamento_motorista_documento: string
          agendamento_motorista_nome: string
          agendamento_placa_caminhao: string
          agendamento_placa_carreta_1: string
          agendamento_placa_carreta_2: string
          agendamento_quantidade: number
          agendamento_transportadora: string
          armazem_id: string
          cliente_id: string
          cliente_nome: string
          created_at: string
          data_carregando: string
          data_chegada: string
          data_documentacao: string
          data_finalizacao: string
          data_inicio: string
          docs_remessa_url: string
          docs_remessa_xml_url: string
          docs_retorno_url: string
          docs_retorno_xml_url: string
          docs_venda_url: string
          docs_venda_xml_url: string
          etapa_5a_status: string
          etapa_5b_status: string
          etapa_5c_status: string
          etapa_atual: number
          id: string
          liberacao_pedido_interno: string
          numero_nf: string
          observacao_carregando: string
          observacao_chegada: string
          observacao_documentacao: string
          observacao_finalizacao: string
          observacao_inicio: string
          produto_nome: string
          url_foto_carregando: string
          url_foto_chegada: string
          url_foto_finalizacao: string
          url_foto_inicio: string
        }[]
      }
      get_carregamentos_by_representante_backup: {
        Args: { p_representante_id: string }
        Returns: {
          agendamento_id: string
          armazem_cidade: string
          armazem_estado: string
          armazem_id: string
          armazem_nome: string
          cliente_id: string
          cliente_nome: string
          created_at: string
          data_chegada: string
          data_retirada: string
          etapa_atual: number
          id: string
          motorista_documento: string
          motorista_nome: string
          numero_nf: string
          pedido_interno: string
          placa_caminhao: string
          produto_nome: string
          quantidade: number
          url_foto_carregando: string
          url_foto_chegada: string
          url_foto_finalizacao: string
          url_foto_inicio: string
        }[]
      }
      get_carregamentos_universal: {
        Args: {
          p_armazem_id?: string
          p_cliente_id?: string
          p_representante_id?: string
          p_user_id?: string
          p_user_role?: string
        }
        Returns: {
          agendamento_id: string
          armazem_cidade: string
          armazem_estado: string
          armazem_id: string
          armazem_nome: string
          cliente_id: string
          cliente_nome: string
          cor_carregamento: string
          created_at: string
          data_chegada: string
          data_retirada: string
          etapa_atual: number
          finalizado: boolean
          fotos_total: number
          id: string
          motorista_documento: string
          motorista_nome: string
          numero_nf: string
          pedido_interno: string
          percentual_carregamento: number
          placa_caminhao: string
          produto_nome: string
          quantidade: number
          status_carregamento: string
          tooltip_carregamento: string
          transportadora: string
          url_foto_carregando: string
          url_foto_chegada: string
          url_foto_finalizacao: string
          url_foto_inicio: string
        }[]
      }
      get_colaboradores: {
        Args: never
        Returns: {
          created_at: string
          email: string
          id: string
          nome: string
          role: Database["public"]["Enums"]["user_role"]
        }[]
      }
      get_liberacoes_by_representante_backup: {
        Args: { p_representante_id: string }
        Returns: {
          armazem_cidade: string
          armazem_estado: string
          armazem_id: string
          armazem_nome: string
          cliente_id: string
          cliente_nome: string
          created_at: string
          data_liberacao: string
          id: string
          pedido_interno: string
          produto_id: string
          produto_nome: string
          quantidade_disponivel: number
          quantidade_liberada: number
          quantidade_retirada: number
          status: Database["public"]["Enums"]["liberacao_status"]
        }[]
      }
      get_liberacoes_disponiveis_universal: {
        Args: {
          p_cliente_id?: string
          p_representante_id?: string
          p_user_id?: string
          p_user_role?: string
        }
        Returns: {
          armazem_cidade: string
          armazem_estado: string
          armazem_id: string
          armazem_nome: string
          cliente_id: string
          cliente_nome: string
          id: string
          pedido_interno: string
          produto_nome: string
          quantidade_disponivel_real: number
          quantidade_liberada: number
          quantidade_retirada: number
          status: string
        }[]
      }
      get_liberacoes_universal: {
        Args: {
          p_armazem_id?: string
          p_cliente_id?: string
          p_representante_id?: string
          p_user_id?: string
          p_user_role?: string
        }
        Returns: {
          armazem_cidade: string
          armazem_endereco: string
          armazem_estado: string
          armazem_id: string
          armazem_nome: string
          cliente_cnpj_cpf: string
          cliente_id: string
          cliente_nome: string
          created_at: string
          data_liberacao: string
          finalizada: boolean
          id: string
          pedido_interno: string
          percentual_agendado: number
          percentual_retirado: number
          produto_id: string
          produto_nome: string
          produto_unidade: string
          quantidade_agendada: number
          quantidade_disponivel: number
          quantidade_liberada: number
          quantidade_retirada: number
          status: Database["public"]["Enums"]["liberacao_status"]
        }[]
      }
      get_quantidade_disponivel_liberacao: {
        Args: { liberacao_uuid: string }
        Returns: number
      }
      get_users_with_roles: {
        Args: never
        Returns: {
          created_at: string
          email: string
          id: string
          nome: string
          roles: Database["public"]["Enums"]["user_role"][]
        }[]
      }
      has_role:
        | {
            Args: {
              _role: Database["public"]["Enums"]["user_role"]
              _user_id: string
            }
            Returns: boolean
          }
        | { Args: { p_role: string }; Returns: boolean }
      is_representante_of_cliente: {
        Args: { cliente_uuid: string }
        Returns: boolean
      }
      update_user_role: {
        Args: {
          _role: Database["public"]["Enums"]["user_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      agendamento_status:
        | "pendente"
        | "em_andamento"
        | "concluido"
        | "cancelado"
      liberacao_status:
        | "disponivel"
        | "parcialmente_agendada"
        | "totalmente_agendada"
        | "finalizada"
      status_carregamento:
        | "aguardando"
        | "liberado"
        | "carregando"
        | "carregado"
        | "nf_entregue"
      tipo_documento_carregamento: "nf" | "xml" | "cte" | "outro"
      user_role: "admin" | "logistica" | "armazem" | "cliente" | "representante"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      agendamento_status: [
        "pendente",
        "em_andamento",
        "concluido",
        "cancelado",
      ],
      liberacao_status: [
        "disponivel",
        "parcialmente_agendada",
        "totalmente_agendada",
        "finalizada",
      ],
      status_carregamento: [
        "aguardando",
        "liberado",
        "carregando",
        "carregado",
        "nf_entregue",
      ],
      tipo_documento_carregamento: ["nf", "xml", "cte", "outro"],
      user_role: ["admin", "logistica", "armazem", "cliente", "representante"],
    },
  },
} as const
