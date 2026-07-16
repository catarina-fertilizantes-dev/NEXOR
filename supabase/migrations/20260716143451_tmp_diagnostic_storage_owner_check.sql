-- Diagnóstico temporário: esqueci de checar o schema storage (storage.objects
-- tem uma coluna owner uuid, referenciando auth.users, que pode estar
-- bloqueando a exclusão via "Database error deleting user"). Também confirma
-- se o admin de destino (05dc0d2f...) existe e é admin de verdade.
CREATE OR REPLACE FUNCTION "public"."tmp_diag_storage_and_target"("_target_user_id" "uuid", "_new_admin_id" "uuid")
RETURNS "json"
LANGUAGE "plpgsql"
SECURITY DEFINER
AS $$
DECLARE
  storage_owner_count bigint;
  target_admin_roles "user_role"[];
  target_admin_email text;
BEGIN
  SELECT count(*) INTO storage_owner_count FROM storage.objects WHERE owner = _target_user_id;

  SELECT array_agg(role), (SELECT email FROM auth.users WHERE id = _new_admin_id)
  INTO target_admin_roles, target_admin_email
  FROM public.user_roles WHERE user_id = _new_admin_id;

  RETURN json_build_object(
    'storage_objects_owned_by_target', storage_owner_count,
    'new_admin_email', target_admin_email,
    'new_admin_roles', target_admin_roles
  );
END;
$$;
