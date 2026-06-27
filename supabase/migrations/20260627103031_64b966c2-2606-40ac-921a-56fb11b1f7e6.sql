
DROP FUNCTION IF EXISTS public.submit_deposit(BIGINT, BIGINT, NUMERIC, TEXT, NUMERIC, TEXT, TEXT);

CREATE FUNCTION public.submit_deposit(
  p_payment_channel_id BIGINT,
  p_business_wallet_id BIGINT,
  p_bac_amount NUMERIC,
  p_currency TEXT,
  p_fiat_amount NUMERIC,
  p_transaction_id TEXT,
  p_sender TEXT
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

  IF (SELECT count(*) FROM public.deposits
      WHERE user_id = v_user AND created_at > now() - interval '1 minute') >= 3 THEN
    RAISE EXCEPTION 'Too many deposit submissions. Try again in a minute.';
  END IF;

  INSERT INTO public.deposits(
    user_id, payment_channel_id, business_wallet_id,
    bac_amount, currency, fiat_amount, transaction_id, sender_number_or_addr, status
  )
  VALUES (
    v_user, p_payment_channel_id, p_business_wallet_id,
    p_bac_amount, p_currency, p_fiat_amount, p_transaction_id, p_sender, 'Pending'
  )
  RETURNING id INTO v_id;
  RETURN v_id;
EXCEPTION WHEN unique_violation THEN
  RAISE EXCEPTION 'This transaction ID was already submitted';
END;
$$;
REVOKE EXECUTE ON FUNCTION public.submit_deposit(BIGINT, BIGINT, NUMERIC, TEXT, NUMERIC, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_deposit(BIGINT, BIGINT, NUMERIC, TEXT, NUMERIC, TEXT, TEXT) TO authenticated;
