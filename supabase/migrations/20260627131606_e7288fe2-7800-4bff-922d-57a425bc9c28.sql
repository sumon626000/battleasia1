
CREATE OR REPLACE FUNCTION public.admin_review_delete_request(p_id uuid, p_approve boolean, p_note text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE r public.account_delete_requests%ROWTYPE;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admins only'; END IF;
  SELECT * INTO r FROM public.account_delete_requests WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Request not found'; END IF;
  IF r.status <> 'pending' THEN RAISE EXCEPTION 'Already processed'; END IF;

  IF p_approve THEN
    UPDATE public.profiles
      SET is_active = false, is_suspended = true,
          suspension_reason = COALESCE(p_note, 'Account deletion approved')
      WHERE id = r.user_id;
    UPDATE public.account_delete_requests
      SET status = 'approved', admin_note = p_note, resolved_at = now()
      WHERE id = p_id;
  ELSE
    UPDATE public.account_delete_requests
      SET status = 'rejected', admin_note = p_note, resolved_at = now()
      WHERE id = p_id;
  END IF;

  INSERT INTO public.admin_action_logs(admin_id, action, module, target_type, target_id, new_value)
  VALUES (auth.uid(),
          CASE WHEN p_approve THEN 'account_delete_approve' ELSE 'account_delete_reject' END,
          'users', 'delete_request', p_id::text,
          jsonb_build_object('note', p_note, 'user_id', r.user_id));

  PERFORM public.notify_user(
    r.user_id,
    CASE WHEN p_approve THEN 'account_delete_approved' ELSE 'account_delete_rejected' END,
    CASE WHEN p_approve THEN 'Account deletion approved' ELSE 'Account deletion rejected' END,
    COALESCE(p_note,
      CASE WHEN p_approve THEN 'Your deletion request has been approved and your account is now deactivated.'
           ELSE 'Your account deletion request was rejected. Contact support for details.' END),
    'account');
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_review_delete_request(uuid, boolean, text) TO authenticated;
