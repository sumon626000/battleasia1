
-- Shop category / package CRUD
CREATE OR REPLACE FUNCTION public.admin_save_shop_category(p_id bigint, p_name text, p_slug text, p_sort_order int DEFAULT 0)
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id bigint;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admins only'; END IF;
  IF p_id IS NULL THEN
    INSERT INTO public.shop_categories(name, slug, sort_order) VALUES (p_name, p_slug, p_sort_order) RETURNING id INTO v_id;
  ELSE
    UPDATE public.shop_categories SET name = p_name, slug = p_slug, sort_order = p_sort_order WHERE id = p_id RETURNING id INTO v_id;
  END IF;
  INSERT INTO public.admin_action_logs(admin_id, action, module, target_type, target_id, new_value)
  VALUES (auth.uid(), 'shop_category_save', 'shop', 'shop_category', v_id::text, jsonb_build_object('name', p_name, 'slug', p_slug));
  RETURN v_id;
END;$$;

CREATE OR REPLACE FUNCTION public.admin_delete_shop_category(p_id bigint)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admins only'; END IF;
  UPDATE public.shop_categories SET deleted_at = now() WHERE id = p_id;
  INSERT INTO public.admin_action_logs(admin_id, action, module, target_type, target_id)
  VALUES (auth.uid(), 'shop_category_delete', 'shop', 'shop_category', p_id::text);
END;$$;

CREATE OR REPLACE FUNCTION public.admin_save_shop_package(p_id bigint, p_payload jsonb)
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id bigint;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admins only'; END IF;
  IF p_id IS NULL THEN
    INSERT INTO public.shop_packages(title, bac_amount, price_currency, price_value, discount_percentage, category_id, image_url, is_active, sort_order)
    VALUES (
      p_payload->>'title',
      COALESCE((p_payload->>'bac_amount')::numeric, 0),
      COALESCE(p_payload->>'price_currency', 'BDT'),
      COALESCE((p_payload->>'price_value')::numeric, 0),
      COALESCE((p_payload->>'discount_percentage')::numeric, 0),
      NULLIF(p_payload->>'category_id','')::bigint,
      p_payload->>'image_url',
      COALESCE((p_payload->>'is_active')::boolean, true),
      COALESCE((p_payload->>'sort_order')::int, 0)
    ) RETURNING id INTO v_id;
  ELSE
    UPDATE public.shop_packages SET
      title = COALESCE(p_payload->>'title', title),
      bac_amount = COALESCE((p_payload->>'bac_amount')::numeric, bac_amount),
      price_currency = COALESCE(p_payload->>'price_currency', price_currency),
      price_value = COALESCE((p_payload->>'price_value')::numeric, price_value),
      discount_percentage = COALESCE((p_payload->>'discount_percentage')::numeric, discount_percentage),
      category_id = COALESCE(NULLIF(p_payload->>'category_id','')::bigint, category_id),
      image_url = COALESCE(p_payload->>'image_url', image_url),
      is_active = COALESCE((p_payload->>'is_active')::boolean, is_active),
      sort_order = COALESCE((p_payload->>'sort_order')::int, sort_order)
    WHERE id = p_id RETURNING id INTO v_id;
  END IF;
  INSERT INTO public.admin_action_logs(admin_id, action, module, target_type, target_id, new_value)
  VALUES (auth.uid(), CASE WHEN p_id IS NULL THEN 'shop_package_create' ELSE 'shop_package_update' END, 'shop', 'shop_package', v_id::text, p_payload);
  RETURN v_id;
END;$$;

CREATE OR REPLACE FUNCTION public.admin_delete_shop_package(p_id bigint)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admins only'; END IF;
  UPDATE public.shop_packages SET deleted_at = now(), is_active = false WHERE id = p_id;
  INSERT INTO public.admin_action_logs(admin_id, action, module, target_type, target_id)
  VALUES (auth.uid(), 'shop_package_delete', 'shop', 'shop_package', p_id::text);
END;$$;

-- Shop purchase approval (credits BAC to user)
CREATE OR REPLACE FUNCTION public.admin_review_shop_purchase(p_id bigint, p_approve boolean, p_note text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.shop_purchases%ROWTYPE; v_bal numeric;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admins only'; END IF;
  SELECT * INTO r FROM public.shop_purchases WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Purchase not found'; END IF;
  IF r.status <> 'Pending' THEN RAISE EXCEPTION 'Already processed'; END IF;
  IF p_approve THEN
    SELECT bac_coin_balance INTO v_bal FROM public.profiles WHERE id = r.user_id FOR UPDATE;
    UPDATE public.profiles SET bac_coin_balance = bac_coin_balance + r.bac_amount WHERE id = r.user_id;
    INSERT INTO public.balance_logs(user_id, type, amount_bac, balance_before, balance_after, handled_by, note, reference_id, reference_type)
    VALUES (r.user_id, 'shop_purchase', r.bac_amount, v_bal, v_bal + r.bac_amount, 'admin', COALESCE(p_note,'Shop purchase approved'), p_id, 'shop_purchase');
    UPDATE public.shop_purchases SET status = 'Approved', reviewed_at = now(), reviewed_by = auth.uid(), admin_note = p_note WHERE id = p_id;
  ELSE
    UPDATE public.shop_purchases SET status = 'Rejected', reviewed_at = now(), reviewed_by = auth.uid(), admin_note = p_note WHERE id = p_id;
  END IF;
  INSERT INTO public.admin_action_logs(admin_id, action, module, target_type, target_id, new_value)
  VALUES (auth.uid(), CASE WHEN p_approve THEN 'shop_approve' ELSE 'shop_reject' END, 'shop', 'shop_purchase', p_id::text, jsonb_build_object('note', p_note));
END;$$;

-- Deposit approval
CREATE OR REPLACE FUNCTION public.admin_review_deposit(p_id bigint, p_approve boolean, p_reason text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.deposits%ROWTYPE; v_bal numeric;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admins only'; END IF;
  SELECT * INTO r FROM public.deposits WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Deposit not found'; END IF;
  IF r.status <> 'Pending' THEN RAISE EXCEPTION 'Already processed'; END IF;
  IF p_approve THEN
    SELECT bac_coin_balance INTO v_bal FROM public.profiles WHERE id = r.user_id FOR UPDATE;
    UPDATE public.profiles SET bac_coin_balance = bac_coin_balance + r.bac_amount WHERE id = r.user_id;
    INSERT INTO public.balance_logs(user_id, type, amount_bac, balance_before, balance_after, handled_by, note, reference_id, reference_type)
    VALUES (r.user_id, 'deposit', r.bac_amount, v_bal, v_bal + r.bac_amount, 'admin', COALESCE(p_reason,'Deposit approved'), p_id, 'deposit');
    UPDATE public.deposits SET status = 'Approved', reviewed_at = now(), reviewed_by_admin_id = auth.uid() WHERE id = p_id;
  ELSE
    UPDATE public.deposits SET status = 'Rejected', reject_reason = p_reason, reviewed_at = now(), reviewed_by_admin_id = auth.uid() WHERE id = p_id;
  END IF;
  INSERT INTO public.admin_action_logs(admin_id, action, module, target_type, target_id, new_value)
  VALUES (auth.uid(), CASE WHEN p_approve THEN 'deposit_approve' ELSE 'deposit_reject' END, 'wallet', 'deposit', p_id::text, jsonb_build_object('reason', p_reason));
END;$$;

-- Withdrawal review (approve = mark paid; reject = refund held BAC)
CREATE OR REPLACE FUNCTION public.admin_review_withdrawal(p_id bigint, p_approve boolean, p_reason text DEFAULT NULL, p_fiat_amount numeric DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.withdrawals%ROWTYPE; v_bal numeric; v_payout numeric;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admins only'; END IF;
  SELECT * INTO r FROM public.withdrawals WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Withdrawal not found'; END IF;
  IF r.status <> 'Pending' THEN RAISE EXCEPTION 'Already processed'; END IF;
  IF p_approve THEN
    v_payout := COALESCE(p_fiat_amount, r.bac_amount - COALESCE(r.fee_bac,0));
    UPDATE public.withdrawals SET
      status = 'Approved', balance_held = false,
      final_payout_amount = v_payout, fiat_amount = COALESCE(p_fiat_amount, fiat_amount),
      reviewed_at = now(), reviewed_by_admin_id = auth.uid()
    WHERE id = p_id;
  ELSE
    -- Refund held balance
    IF r.balance_held THEN
      SELECT bac_coin_balance INTO v_bal FROM public.profiles WHERE id = r.user_id FOR UPDATE;
      UPDATE public.profiles SET bac_coin_balance = bac_coin_balance + r.bac_amount WHERE id = r.user_id;
      INSERT INTO public.balance_logs(user_id, type, amount_bac, balance_before, balance_after, handled_by, note, reference_id, reference_type)
      VALUES (r.user_id, 'withdraw_refund', r.bac_amount, v_bal, v_bal + r.bac_amount, 'admin', COALESCE(p_reason,'Withdrawal rejected'), p_id, 'withdrawal');
    END IF;
    UPDATE public.withdrawals SET
      status = 'Rejected', balance_held = false, cancel_reason = p_reason,
      reviewed_at = now(), reviewed_by_admin_id = auth.uid()
    WHERE id = p_id;
  END IF;
  INSERT INTO public.admin_action_logs(admin_id, action, module, target_type, target_id, new_value)
  VALUES (auth.uid(), CASE WHEN p_approve THEN 'withdraw_approve' ELSE 'withdraw_reject' END, 'wallet', 'withdrawal', p_id::text, jsonb_build_object('reason', p_reason, 'fiat', p_fiat_amount));
END;$$;

REVOKE EXECUTE ON FUNCTION public.admin_save_shop_category(bigint, text, text, int) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_delete_shop_category(bigint) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_save_shop_package(bigint, jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_delete_shop_package(bigint) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_review_shop_purchase(bigint, boolean, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_review_deposit(bigint, boolean, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_review_withdrawal(bigint, boolean, text, numeric) FROM anon;

-- Admin RLS read/manage policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='shop_categories' AND policyname='Admins manage shop categories') THEN
    CREATE POLICY "Admins manage shop categories" ON public.shop_categories FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='shop_packages' AND policyname='Admins manage shop packages') THEN
    CREATE POLICY "Admins manage shop packages" ON public.shop_packages FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='shop_purchases' AND policyname='Admins view shop purchases') THEN
    CREATE POLICY "Admins view shop purchases" ON public.shop_purchases FOR SELECT TO authenticated USING (public.is_admin());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='deposits' AND policyname='Admins view deposits') THEN
    CREATE POLICY "Admins view deposits" ON public.deposits FOR SELECT TO authenticated USING (public.is_admin());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='withdrawals' AND policyname='Admins view withdrawals') THEN
    CREATE POLICY "Admins view withdrawals" ON public.withdrawals FOR SELECT TO authenticated USING (public.is_admin());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profiles' AND policyname='Admins read all profiles for ops') THEN
    CREATE POLICY "Admins read all profiles for ops" ON public.profiles FOR SELECT TO authenticated USING (public.is_admin());
  END IF;
END $$;
