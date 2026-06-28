
CREATE OR REPLACE FUNCTION public.admin_delete_all_non_admin_users()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer := 0;
  v_uid uuid;
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Only super admins can perform this action';
  END IF;
  FOR v_uid IN
    SELECT p.id FROM public.profiles p
    WHERE NOT EXISTS (
      SELECT 1 FROM public.user_roles r
      WHERE r.user_id = p.id AND r.role IN ('admin','super_admin','sub_admin','moderator')
    )
  LOOP
    DELETE FROM auth.users WHERE id = v_uid;
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_delete_all_non_admin_users() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_delete_all_non_admin_users() TO authenticated;
