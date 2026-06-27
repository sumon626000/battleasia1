
CREATE OR REPLACE FUNCTION public.buy_premium(p_plan_id smallint)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_plan public.premium_settings%ROWTYPE;
  v_balance numeric;
  v_current_exp timestamptz;
  v_started timestamptz := now();
  v_expires timestamptz;
  v_event premium_event_type := 'activate';
  v_log_id bigint;
  v_hist_id bigint;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO v_plan FROM public.premium_settings WHERE id = p_plan_id AND is_active = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'Plan not found or inactive'; END IF;

  SELECT bac_coin_balance, premium_expires_at INTO v_balance, v_current_exp
    FROM public.profiles WHERE id = v_user FOR UPDATE;
  IF v_balance IS NULL THEN RAISE EXCEPTION 'Profile not found'; END IF;
  IF v_balance < v_plan.price_bac THEN RAISE EXCEPTION 'Insufficient BAC balance'; END IF;

  IF v_current_exp IS NOT NULL AND v_current_exp > now() THEN
    v_started := v_current_exp;
    v_event := 'extend';
  END IF;
  v_expires := v_started + (v_plan.duration_days || ' days')::interval;

  UPDATE public.profiles
    SET bac_coin_balance = bac_coin_balance - v_plan.price_bac,
        premium_expires_at = v_expires
    WHERE id = v_user;

  INSERT INTO public.balance_logs(user_id, type, amount_bac, balance_before, balance_after, handled_by, note, reference_type)
  VALUES (v_user, 'premium_purchase', -v_plan.price_bac, v_balance, v_balance - v_plan.price_bac,
          'system', 'Premium plan #' || p_plan_id, 'premium')
  RETURNING id INTO v_log_id;

  INSERT INTO public.premium_histories(user_id, type, price_bac, duration_days, started_at, expires_at, balance_log_id)
  VALUES (v_user, v_event, v_plan.price_bac, v_plan.duration_days, v_started, v_expires, v_log_id)
  RETURNING id INTO v_hist_id;

  RETURN v_hist_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.buy_premium(smallint) FROM anon;
GRANT EXECUTE ON FUNCTION public.buy_premium(smallint) TO authenticated;
