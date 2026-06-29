
CREATE OR REPLACE FUNCTION public.admin_delete_user(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Only super admins can delete users';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.user_roles r
    WHERE r.user_id = p_user_id
      AND r.role IN ('admin','super_admin','sub_admin','moderator')
  ) THEN
    RAISE EXCEPTION 'Cannot delete admin/moderator accounts';
  END IF;
  DELETE FROM auth.users WHERE id = p_user_id;
  INSERT INTO public.admin_action_logs(admin_id, action, module, target_type, target_id)
  VALUES (auth.uid(), 'user_delete', 'users', 'user', p_user_id::text);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_all_matches()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count integer;
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Only super admins can perform this action';
  END IF;
  UPDATE public.matches
     SET deleted_at = now(),
         status = 'Cancelled'
   WHERE deleted_at IS NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  INSERT INTO public.admin_action_logs(admin_id, action, module, target_type, target_id)
  VALUES (auth.uid(), 'match_delete_all', 'matches', 'match', v_count::text);
  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_delete_user(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_all_matches() TO authenticated;
