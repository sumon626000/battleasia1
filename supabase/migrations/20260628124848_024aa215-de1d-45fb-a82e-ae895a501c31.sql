
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT public.has_role(auth.uid(), 'super_admin') $$;

-- Seed initial super admin
INSERT INTO public.user_roles(user_id, role)
SELECT id, 'super_admin'::app_role FROM auth.users WHERE lower(email) = 'nixhyip@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- Replace admin_set_user_role: only super_admin can change roles; supports multiple roles per user
CREATE OR REPLACE FUNCTION public.admin_set_user_role(p_user_id uuid, p_role app_role)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Only super admins can change roles';
  END IF;
  IF p_user_id = auth.uid() AND p_role <> 'super_admin' THEN
    RAISE EXCEPTION 'You cannot demote yourself';
  END IF;
  DELETE FROM public.user_roles WHERE user_id = p_user_id;
  INSERT INTO public.user_roles(user_id, role) VALUES (p_user_id, p_role);
  INSERT INTO public.admin_action_logs(admin_id, action, module, target_type, target_id, new_value)
  VALUES (auth.uid(), 'role_change', 'users', 'user', p_user_id::text,
    jsonb_build_object('role', p_role));
END;$$;
