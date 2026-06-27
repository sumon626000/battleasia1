
-- Seed coin rates
INSERT INTO public.coin_rates (currency, region, rate_per_coin, is_active)
SELECT 'BDT', 'BD', 1, true
WHERE NOT EXISTS (SELECT 1 FROM public.coin_rates WHERE currency = 'BDT');
INSERT INTO public.coin_rates (currency, region, rate_per_coin, is_active)
SELECT 'INR', 'IN', 1.25, true
WHERE NOT EXISTS (SELECT 1 FROM public.coin_rates WHERE currency = 'INR');
INSERT INTO public.coin_rates (currency, region, rate_per_coin, is_active)
SELECT 'USD', 'GLOBAL', 110, true
WHERE NOT EXISTS (SELECT 1 FROM public.coin_rates WHERE currency = 'USD');

-- Seed payment channels
INSERT INTO public.payment_channels (name, description, is_active, sort_order)
SELECT v.name, v.description, true, v.sort
FROM (VALUES
  ('bKash', 'Mobile Financial Service - Bangladesh', 1),
  ('Nagad', 'Mobile Financial Service - Bangladesh', 2),
  ('Rocket', 'DBBL Mobile Banking - Bangladesh', 3),
  ('USDT (TRC20)', 'Tether on Tron network', 4),
  ('Binance Pay', 'Binance Pay ID transfers', 5)
) AS v(name, description, sort)
WHERE NOT EXISTS (SELECT 1 FROM public.payment_channels WHERE payment_channels.name = v.name);

-- Seed business wallets
INSERT INTO public.business_wallets (payment_channel_id, currency, wallet_address, instruction, is_active)
SELECT pc.id, 'BDT', '01700000000', 'Send Money to this number, then submit Transaction ID', true
FROM public.payment_channels pc
WHERE pc.name IN ('bKash','Nagad','Rocket')
  AND NOT EXISTS (SELECT 1 FROM public.business_wallets bw WHERE bw.payment_channel_id = pc.id);
INSERT INTO public.business_wallets (payment_channel_id, currency, wallet_address, instruction, is_active)
SELECT pc.id, 'USD', 'TXyz000000000000000000000000000000', 'Send USDT (TRC20) only. Wrong network funds are lost.', true
FROM public.payment_channels pc
WHERE pc.name = 'USDT (TRC20)'
  AND NOT EXISTS (SELECT 1 FROM public.business_wallets bw WHERE bw.payment_channel_id = pc.id);
INSERT INTO public.business_wallets (payment_channel_id, currency, wallet_address, instruction, is_active)
SELECT pc.id, 'USD', 'battleasia@binance', 'Send via Binance Pay ID', true
FROM public.payment_channels pc
WHERE pc.name = 'Binance Pay'
  AND NOT EXISTS (SELECT 1 FROM public.business_wallets bw WHERE bw.payment_channel_id = pc.id);

-- Seed withdraw config (70% withdrawable, 2% fee, 100..100000 BAC range)
INSERT INTO public.withdraw_configs (id, fee_type, fee_value, withdraw_percentage, min_bac, max_bac)
SELECT 1, 'percentage'::withdraw_fee_type, 2, 70, 100, 100000
WHERE NOT EXISTS (SELECT 1 FROM public.withdraw_configs);

-- Ensure deposit transaction_id is unique (prompt: BALANCE SECURITY)
CREATE UNIQUE INDEX IF NOT EXISTS deposits_transaction_id_uniq
  ON public.deposits (transaction_id)
  WHERE transaction_id IS NOT NULL;

-- RPC: submit deposit (creates pending row)
CREATE OR REPLACE FUNCTION public.submit_deposit(
  p_payment_channel_id BIGINT,
  p_business_wallet_id BIGINT,
  p_bac_amount NUMERIC,
  p_currency TEXT,
  p_fiat_amount NUMERIC,
  p_transaction_id TEXT,
  p_sender_number TEXT
) RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_id BIGINT;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_bac_amount IS NULL OR p_bac_amount <= 0 THEN RAISE EXCEPTION 'Invalid amount'; END IF;
  IF length(coalesce(p_transaction_id,'')) < 4 THEN RAISE EXCEPTION 'Transaction ID required'; END IF;

  -- Rate limit: 3 per minute per user
  IF (SELECT count(*) FROM public.deposits
      WHERE user_id = v_user AND created_at > now() - interval '1 minute') >= 3 THEN
    RAISE EXCEPTION 'Too many deposit submissions. Try again in a minute.';
  END IF;

  INSERT INTO public.deposits(
    user_id, payment_channel_id, business_wallet_id,
    bac_amount, currency, fiat_amount, transaction_id, sender_number, status
  )
  VALUES (
    v_user, p_payment_channel_id, p_business_wallet_id,
    p_bac_amount, p_currency, p_fiat_amount, p_transaction_id, p_sender_number, 'Pending'
  )
  RETURNING id INTO v_id;

  RETURN v_id;
EXCEPTION WHEN unique_violation THEN
  RAISE EXCEPTION 'This transaction ID was already submitted';
END;
$$;
GRANT EXECUTE ON FUNCTION public.submit_deposit(BIGINT, BIGINT, NUMERIC, TEXT, NUMERIC, TEXT, TEXT) TO authenticated;

-- RPC: submit withdrawal (atomic balance hold)
CREATE OR REPLACE FUNCTION public.submit_withdrawal(
  p_bac NUMERIC,
  p_payment_channel_id BIGINT,
  p_wallet_address TEXT,
  p_currency TEXT
) RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_balance NUMERIC;
  v_cfg public.withdraw_configs%ROWTYPE;
  v_fee NUMERIC := 0;
  v_withdrawable NUMERIC;
  v_avg NUMERIC;
  v_wd_id BIGINT;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_bac IS NULL OR p_bac <= 0 THEN RAISE EXCEPTION 'Amount must be positive'; END IF;
  IF length(coalesce(p_wallet_address,'')) < 4 THEN RAISE EXCEPTION 'Wallet address required'; END IF;

  -- Rate limit: 3/min
  IF (SELECT count(*) FROM public.withdrawals
      WHERE user_id = v_user AND created_at > now() - interval '1 minute') >= 3 THEN
    RAISE EXCEPTION 'Too many withdrawal requests. Try again shortly.';
  END IF;

  SELECT * INTO v_cfg FROM public.withdraw_configs ORDER BY id LIMIT 1;
  IF v_cfg.min_bac IS NOT NULL AND p_bac < v_cfg.min_bac THEN
    RAISE EXCEPTION 'Minimum withdrawal is % BAC', v_cfg.min_bac;
  END IF;
  IF v_cfg.max_bac IS NOT NULL AND p_bac > v_cfg.max_bac THEN
    RAISE EXCEPTION 'Maximum withdrawal is % BAC', v_cfg.max_bac;
  END IF;

  IF v_cfg.fee_type = 'fixed' THEN
    v_fee := v_cfg.fee_value;
  ELSIF v_cfg.fee_type = 'percentage' THEN
    v_fee := round((p_bac * coalesce(v_cfg.fee_value,0) / 100.0)::numeric, 2);
  END IF;

  -- Lock profile, check withdrawable cap
  SELECT bac_coin_balance INTO v_balance FROM public.profiles WHERE id = v_user FOR UPDATE;
  IF v_balance IS NULL THEN RAISE EXCEPTION 'Profile not found'; END IF;
  v_withdrawable := round((v_balance * coalesce(v_cfg.withdraw_percentage, 100) / 100.0)::numeric, 2);
  IF p_bac > v_withdrawable THEN
    RAISE EXCEPTION 'Only % BAC is currently withdrawable', v_withdrawable;
  END IF;
  IF v_balance < p_bac THEN RAISE EXCEPTION 'Insufficient balance'; END IF;

  UPDATE public.profiles SET bac_coin_balance = bac_coin_balance - p_bac WHERE id = v_user;

  INSERT INTO public.balance_logs(user_id, type, amount_bac, balance_before, balance_after, handled_by, note)
  VALUES (v_user, 'withdraw', -p_bac, v_balance, v_balance - p_bac, 'system', 'Withdrawal hold');

  INSERT INTO public.withdrawals(user_id, payment_channel_id, bac_amount, fee_bac, currency, wallet_address, balance_held, status)
  VALUES (v_user, p_payment_channel_id, p_bac, v_fee, p_currency, p_wallet_address, true, 'Pending')
  RETURNING id INTO v_wd_id;

  -- Unusual withdrawal alert (> 3x average of last 30 days)
  SELECT avg(bac_amount) INTO v_avg
  FROM public.withdrawals
  WHERE user_id = v_user AND created_at > now() - interval '30 days';
  IF v_avg IS NOT NULL AND p_bac > v_avg * 3 THEN
    INSERT INTO public.security_alerts(user_id, alert_type, severity, message, metadata)
    VALUES (v_user, 'unusual_withdraw', 'high',
            'Withdrawal exceeds 3x of recent average',
            jsonb_build_object('amount', p_bac, 'avg30d', v_avg, 'withdrawal_id', v_wd_id));
  END IF;

  RETURN v_wd_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.submit_withdrawal(NUMERIC, BIGINT, TEXT, TEXT) TO authenticated;
