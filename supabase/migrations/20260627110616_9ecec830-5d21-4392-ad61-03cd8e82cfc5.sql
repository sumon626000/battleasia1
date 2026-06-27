
-- Admin RPCs: role management, suspend/unsuspend, balance adjust

CREATE OR REPLACE FUNCTION public.admin_set_user_role(p_user_id uuid, p_role app_role)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admins only'; END IF;
  IF p_user_id = auth.uid() AND p_role <> 'admin' THEN
    RAISE EXCEPTION 'You cannot demote yourself';
  END IF;
  DELETE FROM public.user_roles WHERE user_id = p_user_id;
  INSERT INTO public.user_roles(user_id, role) VALUES (p_user_id, p_role);
  INSERT INTO public.admin_action_logs(admin_id, action_type, target_type, target_id, description)
  VALUES (auth.uid(), 'role_change', 'user', p_user_id::text,
    'Role set to ' || p_role::text);
END;$$;

CREATE OR REPLACE FUNCTION public.admin_suspend_user(p_user_id uuid, p_reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admins only'; END IF;
  IF p_user_id = auth.uid() THEN RAISE EXCEPTION 'You cannot suspend yourself'; END IF;
  UPDATE public.profiles
    SET is_suspended = true, suspension_reason = p_reason, is_active = false
    WHERE id = p_user_id;
  INSERT INTO public.admin_action_logs(admin_id, action_type, target_type, target_id, description)
  VALUES (auth.uid(), 'user_suspend', 'user', p_user_id::text, COALESCE(p_reason,'Suspended'));
END;$$;

CREATE OR REPLACE FUNCTION public.admin_unsuspend_user(p_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admins only'; END IF;
  UPDATE public.profiles
    SET is_suspended = false, suspension_reason = NULL, is_active = true
    WHERE id = p_user_id;
  INSERT INTO public.admin_action_logs(admin_id, action_type, target_type, target_id, description)
  VALUES (auth.uid(), 'user_unsuspend', 'user', p_user_id::text, 'Restored');
END;$$;

CREATE OR REPLACE FUNCTION public.admin_adjust_balance(p_user_id uuid, p_delta numeric, p_note text)
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_balance numeric; v_log bigint;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admins only'; END IF;
  IF p_delta = 0 THEN RAISE EXCEPTION 'Delta must be non-zero'; END IF;
  SELECT bac_coin_balance INTO v_balance FROM public.profiles WHERE id = p_user_id FOR UPDATE;
  IF v_balance IS NULL THEN RAISE EXCEPTION 'User not found'; END IF;
  IF v_balance + p_delta < 0 THEN RAISE EXCEPTION 'Resulting balance would be negative'; END IF;
  UPDATE public.profiles SET bac_coin_balance = bac_coin_balance + p_delta WHERE id = p_user_id;
  INSERT INTO public.balance_logs(user_id, type, amount_bac, balance_before, balance_after, handled_by, note)
  VALUES (p_user_id, 'admin_adjust', p_delta, v_balance, v_balance + p_delta, 'admin', p_note)
  RETURNING id INTO v_log;
  INSERT INTO public.admin_action_logs(admin_id, action_type, target_type, target_id, description)
  VALUES (auth.uid(), 'balance_adjust', 'user', p_user_id::text,
    'Adjusted ' || p_delta::text || ' BAC: ' || COALESCE(p_note,''));
  RETURN v_log;
END;$$;

REVOKE EXECUTE ON FUNCTION public.admin_set_user_role(uuid, app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_suspend_user(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_unsuspend_user(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_adjust_balance(uuid, numeric, text) FROM anon;

-- Allow admins to read all profiles + roles for management
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
CREATE POLICY "Admins can read all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can read all roles" ON public.user_roles;
CREATE POLICY "Admins can read all roles" ON public.user_roles
  FOR SELECT TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can read admin logs" ON public.admin_action_logs;
CREATE POLICY "Admins can read admin logs" ON public.admin_action_logs
  FOR SELECT TO authenticated USING (public.is_admin());
