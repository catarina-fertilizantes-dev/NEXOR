-- produtos tinha duas policies de SELECT simultâneas: produtos_select_por_role
-- (restrita a admin/logistica/cliente/armazem/representante) e produtos_select_auth
-- (USING (true), sobra de uma migration antiga nunca removida). Como policies se
-- combinam por OR, a permissiva vencia e tornava a restrição inócua — qualquer
-- autenticado lia produtos, mesmo sem role.
--
-- Confirmado seguro: toda conta real recebe sua role em user_roles na mesma chamada
-- de auth.admin.createUser (edge functions create-*-user), antes de poder logar —
-- não existe usuário autenticado sem role nos fluxos atuais do sistema.

DROP POLICY IF EXISTS "produtos_select_auth" ON "public"."produtos";
