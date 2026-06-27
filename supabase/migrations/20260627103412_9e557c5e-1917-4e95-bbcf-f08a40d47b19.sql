
-- Shop purchase requests + admin approval flow
CREATE TABLE IF NOT EXISTS public.shop_purchases (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL,
  package_id bigint NOT NULL REFERENCES public.shop_packages(id),
  payment_channel_id bigint REFERENCES public.payment_channels(id),
  business_wallet_id bigint REFERENCES public.business_wallets(id),
  bac_amount bigint NOT NULL,
  price_currency text NOT NULL,
  price_value numeric NOT NULL,
  transaction_id text NOT NULL,
  sender_number_or_addr text NOT NULL,
  status text NOT NULL DEFAULT 'Pending',
  admin_note text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT shop_purchases_tx_unique UNIQUE (payment_channel_id, transaction_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.shop_purchases TO authenticated;
GRANT ALL ON public.shop_purchases TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.shop_purchases_id_seq TO authenticated;

ALTER TABLE public.shop_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users view own purchases" ON public.shop_purchases
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "users insert own purchases" ON public.shop_purchases
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "admin update purchases" ON public.shop_purchases
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TRIGGER shop_purchases_updated_at BEFORE UPDATE ON public.shop_purchases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_shop_purchases_user ON public.shop_purchases(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_shop_purchases_status ON public.shop_purchases(status);

-- RPC: submit a purchase request
CREATE OR REPLACE FUNCTION public.submit_shop_purchase(
  p_package_id bigint,
  p_payment_channel_id bigint,
  p_business_wallet_id bigint,
  p_transaction_id text,
  p_sender text
) RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user uuid := auth.uid();
  v_pkg public.shop_packages%ROWTYPE;
  v_id bigint;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF length(coalesce(p_transaction_id,'')) < 4 THEN RAISE EXCEPTION 'Transaction ID required'; END IF;

  SELECT * INTO v_pkg FROM public.shop_packages WHERE id = p_package_id AND is_active = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'Package not found or inactive'; END IF;

  IF (SELECT count(*) FROM public.shop_purchases
      WHERE user_id = v_user AND created_at > now() - interval '1 minute') >= 3 THEN
    RAISE EXCEPTION 'Too many purchase requests. Try again shortly.';
  END IF;

  INSERT INTO public.shop_purchases(
    user_id, package_id, payment_channel_id, business_wallet_id,
    bac_amount, price_currency, price_value, transaction_id, sender_number_or_addr, status
  ) VALUES (
    v_user, p_package_id, p_payment_channel_id, p_business_wallet_id,
    v_pkg.bac_amount, v_pkg.price_currency, v_pkg.price_value, p_transaction_id, p_sender, 'Pending'
  ) RETURNING id INTO v_id;

  RETURN v_id;
EXCEPTION WHEN unique_violation THEN
  RAISE EXCEPTION 'This transaction ID was already submitted';
END;
$$;

REVOKE EXECUTE ON FUNCTION public.submit_shop_purchase(bigint, bigint, bigint, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_shop_purchase(bigint, bigint, bigint, text, text) TO authenticated;
