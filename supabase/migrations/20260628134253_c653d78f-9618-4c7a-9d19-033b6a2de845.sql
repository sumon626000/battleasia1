
CREATE OR REPLACE FUNCTION public.admin_reset_user_history(
  p_user_id uuid,
  p_scopes text[]
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_is_admin boolean;
  v_result jsonb := '{}'::jsonb;
  v_count int;
  v_scope text;
  v_all boolean;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  SELECT public.is_admin() INTO v_is_admin;
  IF NOT COALESCE(v_is_admin, false) THEN
    RAISE EXCEPTION 'Admin only';
  END IF;
  IF p_user_id IS NULL OR p_scopes IS NULL OR array_length(p_scopes,1) IS NULL THEN
    RAISE EXCEPTION 'Invalid arguments';
  END IF;

  v_all := 'all' = ANY(p_scopes);

  FOREACH v_scope IN ARRAY (CASE WHEN v_all THEN ARRAY[
    'balance_logs','matches','deposits','withdrawals','shop','referrals',
    'login_history','notifications','feed','stories','messages','security','online_sessions','support'
  ] ELSE p_scopes END)
  LOOP
    v_count := 0;
    IF v_scope = 'balance_logs' THEN
      DELETE FROM public.balance_logs WHERE user_id = p_user_id;
      GET DIAGNOSTICS v_count = ROW_COUNT;
    ELSIF v_scope = 'matches' THEN
      DELETE FROM public.match_result_media WHERE participant_id IN (
        SELECT id FROM public.match_participants WHERE user_id = p_user_id
      );
      DELETE FROM public.match_participants WHERE user_id = p_user_id;
      GET DIAGNOSTICS v_count = ROW_COUNT;
    ELSIF v_scope = 'deposits' THEN
      DELETE FROM public.deposits WHERE user_id = p_user_id;
      GET DIAGNOSTICS v_count = ROW_COUNT;
    ELSIF v_scope = 'withdrawals' THEN
      DELETE FROM public.withdrawals WHERE user_id = p_user_id;
      GET DIAGNOSTICS v_count = ROW_COUNT;
    ELSIF v_scope = 'shop' THEN
      DELETE FROM public.shop_purchases WHERE user_id = p_user_id;
      GET DIAGNOSTICS v_count = ROW_COUNT;
    ELSIF v_scope = 'referrals' THEN
      DELETE FROM public.referral_transactions WHERE referrer_id = p_user_id OR referred_id = p_user_id;
      GET DIAGNOSTICS v_count = ROW_COUNT;
    ELSIF v_scope = 'login_history' THEN
      DELETE FROM public.login_history WHERE user_id = p_user_id;
      GET DIAGNOSTICS v_count = ROW_COUNT;
    ELSIF v_scope = 'notifications' THEN
      DELETE FROM public.notifications WHERE user_id = p_user_id;
      DELETE FROM public.user_notifications WHERE user_id = p_user_id;
      GET DIAGNOSTICS v_count = ROW_COUNT;
    ELSIF v_scope = 'feed' THEN
      DELETE FROM public.social_likes WHERE user_id = p_user_id;
      DELETE FROM public.social_comments WHERE user_id = p_user_id;
      DELETE FROM public.social_post_media WHERE post_id IN (SELECT id FROM public.social_posts WHERE user_id = p_user_id);
      DELETE FROM public.social_posts WHERE user_id = p_user_id;
      DELETE FROM public.feed_likes WHERE user_id = p_user_id;
      DELETE FROM public.feed_comments WHERE user_id = p_user_id;
      DELETE FROM public.feed_posts WHERE author_id = p_user_id;
      GET DIAGNOSTICS v_count = ROW_COUNT;
    ELSIF v_scope = 'stories' THEN
      DELETE FROM public.social_stories WHERE user_id = p_user_id;
      GET DIAGNOSTICS v_count = ROW_COUNT;
    ELSIF v_scope = 'messages' THEN
      DELETE FROM public.direct_messages WHERE sender_id = p_user_id;
      DELETE FROM public.direct_threads WHERE user_a = p_user_id OR user_b = p_user_id;
      GET DIAGNOSTICS v_count = ROW_COUNT;
    ELSIF v_scope = 'security' THEN
      DELETE FROM public.security_alerts WHERE user_id = p_user_id;
      GET DIAGNOSTICS v_count = ROW_COUNT;
    ELSIF v_scope = 'online_sessions' THEN
      DELETE FROM public.online_sessions WHERE user_id = p_user_id;
      GET DIAGNOSTICS v_count = ROW_COUNT;
    ELSIF v_scope = 'support' THEN
      DELETE FROM public.support_messages WHERE ticket_id IN (SELECT id FROM public.support_tickets WHERE user_id = p_user_id);
      DELETE FROM public.support_tickets WHERE user_id = p_user_id;
      GET DIAGNOSTICS v_count = ROW_COUNT;
    ELSE
      CONTINUE;
    END IF;
    v_result := v_result || jsonb_build_object(v_scope, v_count);
  END LOOP;

  INSERT INTO public.admin_action_logs (admin_id, action, target_type, target_id, details)
  VALUES (v_caller, 'reset_user_history', 'profile', p_user_id::text, v_result);

  RETURN v_result;
EXCEPTION WHEN undefined_table OR undefined_column THEN
  RAISE EXCEPTION 'Reset failed: %', SQLERRM;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_reset_user_history(uuid, text[]) TO authenticated;
