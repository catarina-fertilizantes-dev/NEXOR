-- Fix: make insert_carregamento_from_agendamento SECURITY DEFINER
--
-- Without this, when a `cliente` creates an agendamento, the trigger that
-- auto-creates the carregamento row fires with the client's privileges.
-- Our RLS fix (20260626120000) blocked client INSERT on carregamentos,
-- which broke the entire agendamento creation flow.
--
-- SECURITY DEFINER means the trigger runs with the function owner's (postgres)
-- privileges, bypassing RLS for this internal system operation.

CREATE OR REPLACE FUNCTION "public"."insert_carregamento_from_agendamento"()
RETURNS "trigger"
LANGUAGE "plpgsql"
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cliente_id uuid;
  v_armazem_id uuid;
BEGIN
  -- Busca os FKs a partir do agendamento criado
  SELECT a.cliente_id, l.armazem_id
    INTO v_cliente_id, v_armazem_id
    FROM agendamentos a
         JOIN liberacoes l ON a.liberacao_id = l.id
    WHERE a.id = NEW.id;

  -- Insere novo carregamento a cada novo agendamento já com os campos populados
  INSERT INTO carregamentos (
    agendamento_id,
    etapa_atual,
    criado_por,
    created_at,
    updated_at,
    cliente_id,
    armazem_id
  ) VALUES (
    NEW.id,
    1,           -- Etapa inicial (1 = Chegada)
    NEW.created_by,
    now(),
    now(),
    v_cliente_id,
    v_armazem_id
  );
  RETURN NEW;
END;
$$;

ALTER FUNCTION "public"."insert_carregamento_from_agendamento"() OWNER TO "postgres";
