
-- 1. theme_config table
CREATE TABLE public.theme_config (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text,
  preview_color text NOT NULL DEFAULT '#d4af37',
  price_bac numeric NOT NULL DEFAULT 0 CHECK (price_bac >= 0),
  is_active boolean NOT NULL DEFAULT true,
  is_default boolean NOT NULL DEFAULT false,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.theme_config TO anon, authenticated;
GRANT ALL ON public.theme_config TO service_role;

ALTER TABLE public.theme_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active themes" ON public.theme_config
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage themes" ON public.theme_config
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TRIGGER theme_config_updated_at
  BEFORE UPDATE ON public.theme_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. user_theme_purchases table
CREATE TABLE public.user_theme_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  theme_id text NOT NULL REFERENCES public.theme_config(id) ON DELETE CASCADE,
  price_paid_bac numeric NOT NULL DEFAULT 0,
  purchased_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, theme_id)
);

GRANT SELECT, INSERT ON public.user_theme_purchases TO authenticated;
GRANT ALL ON public.user_theme_purchases TO service_role;

ALTER TABLE public.user_theme_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own purchases" ON public.user_theme_purchases
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Admins manage purchases" ON public.user_theme_purchases
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 3. profiles.active_theme
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS active_theme text DEFAULT 'amber';

-- 4. Seed themes
INSERT INTO public.theme_config (id, name, description, preview_color, price_bac, is_active, is_default, sort_order)
VALUES
  ('amber', 'Tactical Amber', 'The original PUBG-inspired tactical HUD with amber/gold accents.', '#d4af37', 0, true, true, 0),
  ('cyber', 'Cyber Neon', 'Futuristic Valorant-style neon with electric cyan and magenta glow.', '#00f0ff', 500, true, false, 1),
  ('blood', 'Blood Crimson', 'Aggressive blood-red battle royale aesthetic with sharp edges.', '#dc143c', 500, true, false, 2);

-- 5. purchase_theme RPC
CREATE OR REPLACE FUNCTION public.purchase_theme(p_theme_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_theme public.theme_config%ROWTYPE;
  v_balance numeric;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO v_theme FROM public.theme_config WHERE id = p_theme_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Theme not found'; END IF;
  IF NOT v_theme.is_active THEN RAISE EXCEPTION 'Theme is not available'; END IF;

  IF EXISTS (SELECT 1 FROM public.user_theme_purchases WHERE user_id = v_user AND theme_id = p_theme_id) THEN
    RAISE EXCEPTION 'You already own this theme';
  END IF;

  IF v_theme.price_bac > 0 THEN
    SELECT bac_coin_balance INTO v_balance FROM public.profiles WHERE id = v_user FOR UPDATE;
    IF v_balance IS NULL THEN RAISE EXCEPTION 'Profile not found'; END IF;
    IF v_balance < v_theme.price_bac THEN
      RAISE EXCEPTION 'Insufficient BAC balance. Need % BAC, you have %.', v_theme.price_bac, v_balance;
    END IF;

    UPDATE public.profiles
      SET bac_coin_balance = bac_coin_balance - v_theme.price_bac
      WHERE id = v_user;

    INSERT INTO public.balance_logs(user_id, type, amount_bac, balance_before, balance_after, handled_by, note, reference_type)
    VALUES (v_user, 'theme_purchase', -v_theme.price_bac, v_balance, v_balance - v_theme.price_bac, 'system',
            'Theme unlock: ' || v_theme.name, 'theme');
  END IF;

  INSERT INTO public.user_theme_purchases(user_id, theme_id, price_paid_bac)
  VALUES (v_user, p_theme_id, v_theme.price_bac);

  -- Auto-apply newly purchased theme
  UPDATE public.profiles SET active_theme = p_theme_id WHERE id = v_user;

  RETURN jsonb_build_object(
    'success', true,
    'theme_id', p_theme_id,
    'theme_name', v_theme.name,
    'price_paid', v_theme.price_bac,
    'new_balance', COALESCE(v_balance - v_theme.price_bac, (SELECT bac_coin_balance FROM public.profiles WHERE id = v_user))
  );
END;
$$;

-- 6. admin_save_theme RPC
CREATE OR REPLACE FUNCTION public.admin_save_theme(p_payload jsonb)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_id text;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admins only'; END IF;
  v_id := p_payload->>'id';
  IF v_id IS NULL OR length(v_id) < 1 THEN RAISE EXCEPTION 'Theme id required'; END IF;

  INSERT INTO public.theme_config (id, name, description, preview_color, price_bac, is_active, sort_order)
  VALUES (
    v_id,
    COALESCE(p_payload->>'name', v_id),
    p_payload->>'description',
    COALESCE(p_payload->>'preview_color', '#d4af37'),
    COALESCE((p_payload->>'price_bac')::numeric, 0),
    COALESCE((p_payload->>'is_active')::boolean, true),
    COALESCE((p_payload->>'sort_order')::int, 0)
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    preview_color = EXCLUDED.preview_color,
    price_bac = EXCLUDED.price_bac,
    is_active = EXCLUDED.is_active,
    sort_order = EXCLUDED.sort_order,
    updated_at = now();

  INSERT INTO public.admin_action_logs(admin_id, action, module, target_type, target_id, new_value)
  VALUES (auth.uid(), 'theme_save', 'themes', 'theme', v_id, p_payload);

  RETURN v_id;
END;
$$;
