-- ============================================================
-- ENUMS
-- ============================================================
CREATE TYPE public.game_server AS ENUM ('Europe','Asia','SouthAmerica','MiddleEast','KRJP');
CREATE TYPE public.match_game_mode AS ENUM ('Classic','TDM');
CREATE TYPE public.match_player_mode AS ENUM ('Solo','Duo','Squad');
CREATE TYPE public.match_type AS ENUM ('Free','Paid');
CREATE TYPE public.match_kill_rate_type AS ENUM ('Automatic','Manual');
CREATE TYPE public.match_reward_type AS ENUM ('KillBased','RankBased');
CREATE TYPE public.match_status AS ENUM ('Upcoming','Active','Ongoing','Complete','Cancelled');
CREATE TYPE public.participant_status AS ENUM ('joined','pending','win','loss','refunded','cancelled');
CREATE TYPE public.entity_status AS ENUM ('active','inactive');
CREATE TYPE public.balance_log_type AS ENUM (
  'deposit','withdraw','match_entry_fee','match_prize','refund',
  'shop_purchase','premium_purchase','admin_deposit','admin_withdraw','referral_bonus'
);
CREATE TYPE public.handler_type AS ENUM ('system','admin');
CREATE TYPE public.deposit_status AS ENUM ('Pending','Approved','Rejected');
CREATE TYPE public.withdraw_status AS ENUM ('Pending','Processing','Paid','Cancelled','Rejected');
CREATE TYPE public.withdraw_fee_type AS ENUM ('none','fixed','percentage');
CREATE TYPE public.feed_status AS ENUM ('Draft','Published');
CREATE TYPE public.notification_category AS ENUM ('General','Match','Payment','Reward','Warning','System','Promotion');
CREATE TYPE public.audience_type AS ENUM ('all','selected');
CREATE TYPE public.referral_source_type AS ENUM ('signup','deposit','paid_match');
CREATE TYPE public.referral_txn_status AS ENUM ('pending','processed','failed');
CREATE TYPE public.premium_event_type AS ENUM ('activate','extend');
CREATE TYPE public.ticket_status AS ENUM ('Open','Pending','Replied','Closed');
CREATE TYPE public.sender_type AS ENUM ('user','admin');
CREATE TYPE public.setting_value_type AS ENUM ('string','image','boolean','json','html');
CREATE TYPE public.security_alert_type AS ENUM (
  'brute_force','duplicate_transaction','unusual_withdraw',
  'multiple_accounts_same_ip','banned_login_attempt','rate_limit_abuse','permission_abuse'
);

-- ============================================================
-- EXTEND PROFILES
-- ============================================================
ALTER TABLE public.profiles
  ADD COLUMN in_game_username TEXT,
  ADD COLUMN country_code TEXT,
  ADD COLUMN mobile_number TEXT,
  ADD COLUMN pubg_id TEXT UNIQUE,
  ADD COLUMN game_server public.game_server,
  ADD COLUMN cover_url TEXT,
  ADD COLUMN is_premium BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN premium_expires_at TIMESTAMPTZ,
  ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN is_suspended BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN suspension_reason TEXT,
  ADD COLUMN language_preference TEXT NOT NULL DEFAULT 'en';

CREATE INDEX idx_profiles_pubg_id ON public.profiles (pubg_id);
CREATE INDEX idx_profiles_referral_code ON public.profiles (referral_code);

-- ============================================================
-- HELPER: is_admin shortcut
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT public.has_role(auth.uid(), 'admin') $$;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- ============================================================
-- GAMES
-- ============================================================
CREATE TABLE public.games (
  id BIGSERIAL PRIMARY KEY,
  game_name TEXT NOT NULL,
  package_name TEXT,
  image_url TEXT,
  id_prefix TEXT,
  can_create_match BOOLEAN NOT NULL DEFAULT true,
  status public.entity_status NOT NULL DEFAULT 'active',
  coming_soon BOOLEAN NOT NULL DEFAULT false,
  sort_order INT NOT NULL DEFAULT 0,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.games TO anon, authenticated;
GRANT ALL ON public.games TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.games TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE games_id_seq TO authenticated, service_role;
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Games are public" ON public.games FOR SELECT TO anon, authenticated USING (deleted_at IS NULL);
CREATE POLICY "Admins manage games" ON public.games FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ============================================================
-- MATCHES
-- ============================================================
CREATE TABLE public.matches (
  id BIGSERIAL PRIMARY KEY,
  game_id BIGINT NOT NULL REFERENCES public.games(id) ON DELETE RESTRICT,
  match_name TEXT NOT NULL,
  game_mode public.match_game_mode NOT NULL,
  map_name TEXT NOT NULL,
  map_image_url TEXT,
  player_mode public.match_player_mode NOT NULL,
  match_type public.match_type NOT NULL,
  total_players SMALLINT NOT NULL,
  entry_fee_bac BIGINT NOT NULL DEFAULT 0,
  platform_fee_pct SMALLINT NOT NULL DEFAULT 0,
  per_kill_amount_bac BIGINT NOT NULL DEFAULT 0,
  kill_rate_type public.match_kill_rate_type NOT NULL DEFAULT 'Automatic',
  reward_type public.match_reward_type NOT NULL DEFAULT 'KillBased',
  rank_1_prize_bac BIGINT NOT NULL DEFAULT 0,
  rank_2_prize_bac BIGINT NOT NULL DEFAULT 0,
  rank_3_prize_bac BIGINT NOT NULL DEFAULT 0,
  premium_only BOOLEAN NOT NULL DEFAULT false,
  room_id TEXT,
  room_password TEXT,
  match_url TEXT,
  schedule_at TIMESTAMPTZ NOT NULL,
  banner_image_url TEXT,
  prize_description TEXT,
  sponsor TEXT,
  description TEXT,
  private_description TEXT,
  status public.match_status NOT NULL DEFAULT 'Upcoming',
  result_applied BOOLEAN NOT NULL DEFAULT false,
  created_by_admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.matches TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.matches TO authenticated;
GRANT ALL ON public.matches TO service_role;
GRANT USAGE, SELECT ON SEQUENCE matches_id_seq TO authenticated, service_role;
CREATE INDEX idx_matches_game ON public.matches (game_id);
CREATE INDEX idx_matches_status ON public.matches (status);
CREATE INDEX idx_matches_schedule ON public.matches (schedule_at);
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Matches are public" ON public.matches FOR SELECT TO anon, authenticated USING (deleted_at IS NULL);
CREATE POLICY "Admins manage matches" ON public.matches FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ============================================================
-- MATCH PARTICIPANTS
-- ============================================================
CREATE TABLE public.match_participants (
  id BIGSERIAL PRIMARY KEY,
  match_id BIGINT NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entry_fee_bac BIGINT NOT NULL DEFAULT 0,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status public.participant_status NOT NULL DEFAULT 'joined',
  kills SMALLINT NOT NULL DEFAULT 0,
  rank_position SMALLINT,
  prize_bac BIGINT NOT NULL DEFAULT 0,
  result_applied BOOLEAN NOT NULL DEFAULT false,
  refund_processed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (match_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.match_participants TO authenticated;
GRANT SELECT ON public.match_participants TO anon;
GRANT ALL ON public.match_participants TO service_role;
GRANT USAGE, SELECT ON SEQUENCE match_participants_id_seq TO authenticated, service_role;
CREATE INDEX idx_mp_match ON public.match_participants (match_id);
CREATE INDEX idx_mp_user ON public.match_participants (user_id);
ALTER TABLE public.match_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view participants" ON public.match_participants FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Users can join matches" ON public.match_participants FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins manage participants" ON public.match_participants FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ============================================================
-- MATCH RESULT MEDIA
-- ============================================================
CREATE TABLE public.match_result_media (
  id BIGSERIAL PRIMARY KEY,
  match_id BIGINT NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  result_image_url TEXT,
  result_description TEXT,
  uploaded_by_admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.match_result_media TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.match_result_media TO authenticated;
GRANT ALL ON public.match_result_media TO service_role;
GRANT USAGE, SELECT ON SEQUENCE match_result_media_id_seq TO authenticated, service_role;
ALTER TABLE public.match_result_media ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Result media public" ON public.match_result_media FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage result media" ON public.match_result_media FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ============================================================
-- BALANCE LOGS (audit, insert/select only via server)
-- ============================================================
CREATE TABLE public.balance_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_bac BIGINT NOT NULL,
  type public.balance_log_type NOT NULL,
  balance_before BIGINT NOT NULL,
  balance_after BIGINT NOT NULL,
  handled_by public.handler_type NOT NULL DEFAULT 'system',
  admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reference_type TEXT,
  reference_id BIGINT,
  note TEXT,
  idempotency_key TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.balance_logs TO authenticated;
GRANT ALL ON public.balance_logs TO service_role;
GRANT USAGE, SELECT ON SEQUENCE balance_logs_id_seq TO service_role;
CREATE INDEX idx_balance_logs_user ON public.balance_logs (user_id);
CREATE INDEX idx_balance_logs_type ON public.balance_logs (type);
CREATE INDEX idx_balance_logs_created ON public.balance_logs (created_at);
ALTER TABLE public.balance_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own balance" ON public.balance_logs FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_admin());

-- ============================================================
-- PAYMENT CHANNELS
-- ============================================================
CREATE TABLE public.payment_channels (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon_url TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.payment_channels TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.payment_channels TO authenticated;
GRANT ALL ON public.payment_channels TO service_role;
GRANT USAGE, SELECT ON SEQUENCE payment_channels_id_seq TO authenticated, service_role;
ALTER TABLE public.payment_channels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Channels public" ON public.payment_channels FOR SELECT TO anon, authenticated USING (deleted_at IS NULL AND is_active = true);
CREATE POLICY "Admins manage channels" ON public.payment_channels FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ============================================================
-- BUSINESS WALLETS
-- ============================================================
CREATE TABLE public.business_wallets (
  id BIGSERIAL PRIMARY KEY,
  payment_channel_id BIGINT NOT NULL REFERENCES public.payment_channels(id) ON DELETE CASCADE,
  wallet_address TEXT NOT NULL,
  currency TEXT NOT NULL,
  instruction TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.business_wallets TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.business_wallets TO authenticated;
GRANT ALL ON public.business_wallets TO service_role;
GRANT USAGE, SELECT ON SEQUENCE business_wallets_id_seq TO authenticated, service_role;
ALTER TABLE public.business_wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Wallets public" ON public.business_wallets FOR SELECT TO anon, authenticated USING (deleted_at IS NULL AND is_active = true);
CREATE POLICY "Admins manage wallets" ON public.business_wallets FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ============================================================
-- DEPOSITS
-- ============================================================
CREATE TABLE public.deposits (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  payment_channel_id BIGINT NOT NULL REFERENCES public.payment_channels(id),
  business_wallet_id BIGINT REFERENCES public.business_wallets(id),
  currency TEXT NOT NULL,
  fiat_amount BIGINT NOT NULL,
  bac_amount BIGINT NOT NULL,
  sender_number_or_addr TEXT NOT NULL,
  transaction_id TEXT NOT NULL UNIQUE,
  status public.deposit_status NOT NULL DEFAULT 'Pending',
  reviewed_by_admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  reject_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.deposits TO authenticated;
GRANT UPDATE, DELETE ON public.deposits TO authenticated;
GRANT ALL ON public.deposits TO service_role;
GRANT USAGE, SELECT ON SEQUENCE deposits_id_seq TO authenticated, service_role;
CREATE INDEX idx_deposits_user ON public.deposits (user_id);
CREATE INDEX idx_deposits_status ON public.deposits (status);
ALTER TABLE public.deposits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own deposits" ON public.deposits FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "Users create own deposits" ON public.deposits FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins manage deposits" ON public.deposits FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins delete deposits" ON public.deposits FOR DELETE TO authenticated USING (public.is_admin());

-- ============================================================
-- WITHDRAWALS
-- ============================================================
CREATE TABLE public.withdrawals (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  payment_channel_id BIGINT NOT NULL REFERENCES public.payment_channels(id),
  currency TEXT NOT NULL,
  bac_amount BIGINT NOT NULL,
  fiat_amount BIGINT,
  fee_bac BIGINT NOT NULL DEFAULT 0,
  final_payout_amount BIGINT,
  wallet_address TEXT NOT NULL,
  status public.withdraw_status NOT NULL DEFAULT 'Pending',
  reviewed_by_admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  cancel_reason TEXT,
  balance_held BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.withdrawals TO authenticated;
GRANT ALL ON public.withdrawals TO service_role;
GRANT USAGE, SELECT ON SEQUENCE withdrawals_id_seq TO authenticated, service_role;
CREATE INDEX idx_withdrawals_user ON public.withdrawals (user_id);
CREATE INDEX idx_withdrawals_status ON public.withdrawals (status);
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own withdrawals" ON public.withdrawals FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "Users create withdrawals" ON public.withdrawals FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins update withdrawals" ON public.withdrawals FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins delete withdrawals" ON public.withdrawals FOR DELETE TO authenticated USING (public.is_admin());

-- ============================================================
-- COIN RATES
-- ============================================================
CREATE TABLE public.coin_rates (
  id BIGSERIAL PRIMARY KEY,
  region TEXT NOT NULL,
  currency TEXT NOT NULL UNIQUE,
  rate_per_coin BIGINT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.coin_rates TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.coin_rates TO authenticated;
GRANT ALL ON public.coin_rates TO service_role;
GRANT USAGE, SELECT ON SEQUENCE coin_rates_id_seq TO authenticated, service_role;
ALTER TABLE public.coin_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Rates public" ON public.coin_rates FOR SELECT TO anon, authenticated USING (is_active = true);
CREATE POLICY "Admins manage rates" ON public.coin_rates FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ============================================================
-- WITHDRAW CONFIGS (singleton)
-- ============================================================
CREATE TABLE public.withdraw_configs (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  min_bac BIGINT NOT NULL DEFAULT 0,
  max_bac BIGINT NOT NULL DEFAULT 0,
  withdraw_percentage SMALLINT NOT NULL DEFAULT 70,
  fee_type public.withdraw_fee_type NOT NULL DEFAULT 'none',
  fee_value BIGINT NOT NULL DEFAULT 0,
  updated_by_admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.withdraw_configs TO anon, authenticated;
GRANT INSERT, UPDATE ON public.withdraw_configs TO authenticated;
GRANT ALL ON public.withdraw_configs TO service_role;
ALTER TABLE public.withdraw_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Withdraw config public" ON public.withdraw_configs FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage withdraw config" ON public.withdraw_configs FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ============================================================
-- SHOP CATEGORIES
-- ============================================================
CREATE TABLE public.shop_categories (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  sort_order INT NOT NULL DEFAULT 0,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.shop_categories TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.shop_categories TO authenticated;
GRANT ALL ON public.shop_categories TO service_role;
GRANT USAGE, SELECT ON SEQUENCE shop_categories_id_seq TO authenticated, service_role;
ALTER TABLE public.shop_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Shop categories public" ON public.shop_categories FOR SELECT TO anon, authenticated USING (deleted_at IS NULL);
CREATE POLICY "Admins manage shop categories" ON public.shop_categories FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ============================================================
-- SHOP PACKAGES
-- ============================================================
CREATE TABLE public.shop_packages (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  bac_amount BIGINT NOT NULL,
  image_url TEXT,
  price_currency TEXT NOT NULL DEFAULT 'USD',
  price_value NUMERIC(18,2) NOT NULL DEFAULT 0,
  discount_percentage SMALLINT NOT NULL DEFAULT 0,
  category_id BIGINT REFERENCES public.shop_categories(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.shop_packages TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.shop_packages TO authenticated;
GRANT ALL ON public.shop_packages TO service_role;
GRANT USAGE, SELECT ON SEQUENCE shop_packages_id_seq TO authenticated, service_role;
ALTER TABLE public.shop_packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Shop packages public" ON public.shop_packages FOR SELECT TO anon, authenticated USING (deleted_at IS NULL AND is_active = true);
CREATE POLICY "Admins manage shop packages" ON public.shop_packages FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ============================================================
-- PREMIUM SETTINGS (singleton)
-- ============================================================
CREATE TABLE public.premium_settings (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  duration_days SMALLINT NOT NULL DEFAULT 30,
  price_bac BIGINT NOT NULL DEFAULT 0,
  benefits_text TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.premium_settings TO anon, authenticated;
GRANT INSERT, UPDATE ON public.premium_settings TO authenticated;
GRANT ALL ON public.premium_settings TO service_role;
ALTER TABLE public.premium_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Premium settings public" ON public.premium_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage premium settings" ON public.premium_settings FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ============================================================
-- PREMIUM HISTORIES
-- ============================================================
CREATE TABLE public.premium_histories (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type public.premium_event_type NOT NULL,
  price_bac BIGINT NOT NULL,
  duration_days SMALLINT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  balance_log_id BIGINT REFERENCES public.balance_logs(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.premium_histories TO authenticated;
GRANT ALL ON public.premium_histories TO service_role;
GRANT USAGE, SELECT ON SEQUENCE premium_histories_id_seq TO service_role;
CREATE INDEX idx_premium_hist_user ON public.premium_histories (user_id);
ALTER TABLE public.premium_histories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own premium history" ON public.premium_histories FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_admin());

-- ============================================================
-- REFERRAL CONFIGS (singleton)
-- ============================================================
CREATE TABLE public.referral_configs (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  signup_bonus_bac BIGINT NOT NULL DEFAULT 0,
  paid_match_commission SMALLINT NOT NULL DEFAULT 0,
  deposit_commission SMALLINT NOT NULL DEFAULT 0,
  min_paid_match_fee BIGINT NOT NULL DEFAULT 0,
  updated_by_admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.referral_configs TO anon, authenticated;
GRANT INSERT, UPDATE ON public.referral_configs TO authenticated;
GRANT ALL ON public.referral_configs TO service_role;
ALTER TABLE public.referral_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Referral config public" ON public.referral_configs FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage referral config" ON public.referral_configs FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ============================================================
-- REFERRAL TRANSACTIONS
-- ============================================================
CREATE TABLE public.referral_transactions (
  id BIGSERIAL PRIMARY KEY,
  referrer_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_type public.referral_source_type NOT NULL,
  source_reference_id BIGINT,
  commission_rate SMALLINT NOT NULL DEFAULT 0,
  bonus_bac BIGINT NOT NULL DEFAULT 0,
  status public.referral_txn_status NOT NULL DEFAULT 'pending',
  idempotency_key TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.referral_transactions TO authenticated;
GRANT ALL ON public.referral_transactions TO service_role;
GRANT USAGE, SELECT ON SEQUENCE referral_transactions_id_seq TO service_role;
CREATE INDEX idx_ref_txn_referrer ON public.referral_transactions (referrer_user_id);
ALTER TABLE public.referral_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own referrals" ON public.referral_transactions FOR SELECT TO authenticated USING (auth.uid() = referrer_user_id OR auth.uid() = referred_user_id OR public.is_admin());

-- ============================================================
-- FEED CATEGORIES
-- ============================================================
CREATE TABLE public.feed_categories (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.feed_categories TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.feed_categories TO authenticated;
GRANT ALL ON public.feed_categories TO service_role;
GRANT USAGE, SELECT ON SEQUENCE feed_categories_id_seq TO authenticated, service_role;
ALTER TABLE public.feed_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Feed categories public" ON public.feed_categories FOR SELECT TO anon, authenticated USING (deleted_at IS NULL);
CREATE POLICY "Admins manage feed categories" ON public.feed_categories FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ============================================================
-- FEED POSTS
-- ============================================================
CREATE TABLE public.feed_posts (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description_html TEXT NOT NULL,
  category_id BIGINT REFERENCES public.feed_categories(id) ON DELETE SET NULL,
  status public.feed_status NOT NULL DEFAULT 'Draft',
  premium_only BOOLEAN NOT NULL DEFAULT false,
  cover_image_url TEXT,
  author_admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  views_count INT NOT NULL DEFAULT 0,
  likes_count INT NOT NULL DEFAULT 0,
  comments_count INT NOT NULL DEFAULT 0,
  shares_count INT NOT NULL DEFAULT 0,
  published_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.feed_posts TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.feed_posts TO authenticated;
GRANT ALL ON public.feed_posts TO service_role;
GRANT USAGE, SELECT ON SEQUENCE feed_posts_id_seq TO authenticated, service_role;
CREATE INDEX idx_feed_status ON public.feed_posts (status);
CREATE INDEX idx_feed_published ON public.feed_posts (published_at);
ALTER TABLE public.feed_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Published posts public" ON public.feed_posts FOR SELECT TO anon, authenticated USING (deleted_at IS NULL AND status = 'Published');
CREATE POLICY "Admins view all posts" ON public.feed_posts FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "Admins manage posts" ON public.feed_posts FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ============================================================
-- FEED LIKES
-- ============================================================
CREATE TABLE public.feed_likes (
  id BIGSERIAL PRIMARY KEY,
  post_id BIGINT NOT NULL REFERENCES public.feed_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.feed_likes TO authenticated;
GRANT SELECT ON public.feed_likes TO anon;
GRANT ALL ON public.feed_likes TO service_role;
GRANT USAGE, SELECT ON SEQUENCE feed_likes_id_seq TO authenticated, service_role;
ALTER TABLE public.feed_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Likes public" ON public.feed_likes FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Users like posts" ON public.feed_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users unlike own" ON public.feed_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- FEED COMMENTS
-- ============================================================
CREATE TABLE public.feed_comments (
  id BIGSERIAL PRIMARY KEY,
  post_id BIGINT NOT NULL REFERENCES public.feed_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_id BIGINT REFERENCES public.feed_comments(id) ON DELETE CASCADE,
  comment_text TEXT NOT NULL,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.feed_comments TO authenticated;
GRANT SELECT ON public.feed_comments TO anon;
GRANT ALL ON public.feed_comments TO service_role;
GRANT USAGE, SELECT ON SEQUENCE feed_comments_id_seq TO authenticated, service_role;
CREATE INDEX idx_feed_comments_post ON public.feed_comments (post_id);
ALTER TABLE public.feed_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Comments public" ON public.feed_comments FOR SELECT TO anon, authenticated USING (deleted_at IS NULL);
CREATE POLICY "Users comment" ON public.feed_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users edit own comments" ON public.feed_comments FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own comments" ON public.feed_comments FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.is_admin());

-- ============================================================
-- NOTIFICATIONS (broadcast/admin)
-- ============================================================
CREATE TABLE public.notifications (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  category public.notification_category NOT NULL DEFAULT 'General',
  type TEXT,
  premium_only BOOLEAN NOT NULL DEFAULT false,
  audience_type public.audience_type NOT NULL DEFAULT 'all',
  created_by_admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.notifications TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
GRANT USAGE, SELECT ON SEQUENCE notifications_id_seq TO authenticated, service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Notifications visible to all auth" ON public.notifications FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage notifications" ON public.notifications FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ============================================================
-- USER NOTIFICATIONS (per-user inbox)
-- ============================================================
CREATE TABLE public.user_notifications (
  id BIGSERIAL PRIMARY KEY,
  notification_id BIGINT REFERENCES public.notifications(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT,
  read_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.user_notifications TO authenticated;
GRANT ALL ON public.user_notifications TO service_role;
GRANT USAGE, SELECT ON SEQUENCE user_notifications_id_seq TO service_role;
CREATE INDEX idx_user_notif_user ON public.user_notifications (user_id);
CREATE INDEX idx_user_notif_read ON public.user_notifications (read_at);
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own notifications" ON public.user_notifications FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "Users update own notifications" ON public.user_notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- NOTIFICATION TEMPLATES
-- ============================================================
CREATE TABLE public.notification_templates (
  id BIGSERIAL PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title_template TEXT NOT NULL,
  message_template TEXT NOT NULL,
  email_subject TEXT,
  email_body_html TEXT,
  is_email_enabled BOOLEAN NOT NULL DEFAULT true,
  is_inapp_enabled BOOLEAN NOT NULL DEFAULT true,
  updated_by_admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.notification_templates TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.notification_templates TO authenticated;
GRANT ALL ON public.notification_templates TO service_role;
GRANT USAGE, SELECT ON SEQUENCE notification_templates_id_seq TO authenticated, service_role;
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Templates auth view" ON public.notification_templates FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "Admins manage templates" ON public.notification_templates FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ============================================================
-- SUPPORT TICKETS
-- ============================================================
CREATE TABLE public.support_tickets (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status public.ticket_status NOT NULL DEFAULT 'Open',
  subject TEXT NOT NULL,
  unread_user INT NOT NULL DEFAULT 0,
  unread_admin INT NOT NULL DEFAULT 0,
  last_message_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.support_tickets TO authenticated;
GRANT ALL ON public.support_tickets TO service_role;
GRANT USAGE, SELECT ON SEQUENCE support_tickets_id_seq TO authenticated, service_role;
CREATE INDEX idx_tickets_user ON public.support_tickets (user_id);
CREATE INDEX idx_tickets_status ON public.support_tickets (status);
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own tickets" ON public.support_tickets FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "Users create tickets" ON public.support_tickets FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Update own or admin" ON public.support_tickets FOR UPDATE TO authenticated USING (auth.uid() = user_id OR public.is_admin()) WITH CHECK (auth.uid() = user_id OR public.is_admin());

-- ============================================================
-- SUPPORT MESSAGES
-- ============================================================
CREATE TABLE public.support_messages (
  id BIGSERIAL PRIMARY KEY,
  ticket_id BIGINT NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_type public.sender_type NOT NULL,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  attachment_url TEXT,
  attachment_type TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.support_messages TO authenticated;
GRANT ALL ON public.support_messages TO service_role;
GRANT USAGE, SELECT ON SEQUENCE support_messages_id_seq TO authenticated, service_role;
CREATE INDEX idx_support_msg_ticket ON public.support_messages (ticket_id);
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View messages on owned tickets" ON public.support_messages FOR SELECT TO authenticated USING (
  public.is_admin() OR EXISTS (SELECT 1 FROM public.support_tickets t WHERE t.id = ticket_id AND t.user_id = auth.uid())
);
CREATE POLICY "Send messages on owned tickets" ON public.support_messages FOR INSERT TO authenticated WITH CHECK (
  auth.uid() = sender_id AND (
    public.is_admin() OR EXISTS (SELECT 1 FROM public.support_tickets t WHERE t.id = ticket_id AND t.user_id = auth.uid())
  )
);

-- ============================================================
-- WEBSITE SETTINGS (key/value)
-- ============================================================
CREATE TABLE public.website_settings (
  id BIGSERIAL PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT,
  type public.setting_value_type NOT NULL DEFAULT 'string',
  label TEXT,
  updated_by_admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.website_settings TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.website_settings TO authenticated;
GRANT ALL ON public.website_settings TO service_role;
GRANT USAGE, SELECT ON SEQUENCE website_settings_id_seq TO authenticated, service_role;
ALTER TABLE public.website_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Site settings public" ON public.website_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage settings" ON public.website_settings FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ============================================================
-- STATIC PAGES
-- ============================================================
CREATE TABLE public.static_pages (
  id BIGSERIAL PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  content_html TEXT NOT NULL,
  updated_by_admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.static_pages TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.static_pages TO authenticated;
GRANT ALL ON public.static_pages TO service_role;
GRANT USAGE, SELECT ON SEQUENCE static_pages_id_seq TO authenticated, service_role;
ALTER TABLE public.static_pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Pages public" ON public.static_pages FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage pages" ON public.static_pages FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ============================================================
-- APK VERSIONS
-- ============================================================
CREATE TABLE public.apk_versions (
  id BIGSERIAL PRIMARY KEY,
  app_name TEXT NOT NULL,
  version_name TEXT NOT NULL,
  version_code INT NOT NULL,
  apk_file_url TEXT NOT NULL,
  file_size_bytes BIGINT NOT NULL DEFAULT 0,
  changelog TEXT,
  force_update BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT false,
  download_count INT NOT NULL DEFAULT 0,
  uploaded_by_admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.apk_versions TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.apk_versions TO authenticated;
GRANT ALL ON public.apk_versions TO service_role;
GRANT USAGE, SELECT ON SEQUENCE apk_versions_id_seq TO authenticated, service_role;
ALTER TABLE public.apk_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "APKs public" ON public.apk_versions FOR SELECT TO anon, authenticated USING (deleted_at IS NULL);
CREATE POLICY "Admins manage APKs" ON public.apk_versions FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ============================================================
-- ADMIN ACTION LOGS
-- ============================================================
CREATE TABLE public.admin_action_logs (
  id BIGSERIAL PRIMARY KEY,
  admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  admin_name TEXT NOT NULL,
  action TEXT NOT NULL,
  module TEXT NOT NULL,
  target_type TEXT,
  target_id BIGINT,
  old_value JSONB,
  new_value JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.admin_action_logs TO authenticated;
GRANT ALL ON public.admin_action_logs TO service_role;
GRANT USAGE, SELECT ON SEQUENCE admin_action_logs_id_seq TO service_role;
CREATE INDEX idx_admin_logs_admin ON public.admin_action_logs (admin_id);
ALTER TABLE public.admin_action_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view action logs" ON public.admin_action_logs FOR SELECT TO authenticated USING (public.is_admin());

-- ============================================================
-- SECURITY ALERTS
-- ============================================================
CREATE TABLE public.security_alerts (
  id BIGSERIAL PRIMARY KEY,
  alert_type public.security_alert_type NOT NULL,
  description TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ip_address TEXT,
  is_resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_by_admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.security_alerts TO authenticated;
GRANT ALL ON public.security_alerts TO service_role;
GRANT USAGE, SELECT ON SEQUENCE security_alerts_id_seq TO service_role;
CREATE INDEX idx_sec_alert_type ON public.security_alerts (alert_type);
ALTER TABLE public.security_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view alerts" ON public.security_alerts FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "Admins resolve alerts" ON public.security_alerts FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ============================================================
-- UPDATED_AT TRIGGERS for mutable tables
-- ============================================================
DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'games','matches','match_participants','match_result_media',
    'payment_channels','business_wallets','deposits','withdrawals','coin_rates',
    'shop_categories','shop_packages','premium_histories','referral_transactions',
    'feed_categories','feed_posts','feed_comments','notifications','user_notifications',
    'notification_templates','support_tickets','support_messages','apk_versions'
  ])
  LOOP
    EXECUTE format(
      'CREATE TRIGGER trg_%I_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();',
      t, t
    );
  END LOOP;
END$$;

-- ============================================================
-- SEED singleton config rows + default settings/pages/templates
-- ============================================================
INSERT INTO public.premium_settings (id, duration_days, price_bac, benefits_text)
VALUES (1, 30, 5000, 'Ad-free experience, premium-only tournaments, priority support, premium badge');

INSERT INTO public.referral_configs (id, signup_bonus_bac, paid_match_commission, deposit_commission, min_paid_match_fee)
VALUES (1, 100, 5, 3, 100);

INSERT INTO public.withdraw_configs (id, min_bac, max_bac, withdraw_percentage, fee_type, fee_value)
VALUES (1, 500, 100000, 70, 'none', 0);

INSERT INTO public.website_settings (key, value, type, label) VALUES
  ('site_name','Battle Asia','string','Site Name'),
  ('logo_url','','image','Logo'),
  ('favicon_url','','image','Favicon'),
  ('home_banner_url','','image','Home Banner'),
  ('auth_bg_url','','image','Auth Background'),
  ('shop_banner_url','','image','Shop Banner'),
  ('app_download_link','','string','App Download Link'),
  ('youtube_live_link','','string','YouTube Live Link'),
  ('social_facebook','','string','Facebook'),
  ('social_tiktok','','string','TikTok'),
  ('social_instagram','','string','Instagram'),
  ('social_twitter','','string','Twitter'),
  ('social_youtube','','string','YouTube'),
  ('social_discord','','string','Discord'),
  ('social_telegram','','string','Telegram'),
  ('coin_icon_url','','image','BAC Coin Icon'),
  ('footer_content','','html','Footer Content'),
  ('email_verification_enabled','true','boolean','Require email verification'),
  ('referral_enabled','true','boolean','Referral system enabled'),
  ('premium_enabled','true','boolean','Premium enabled');

INSERT INTO public.static_pages (slug, title, content_html) VALUES
  ('about-us','About Us','<p>About Battle Asia.</p>'),
  ('how-to-play','How To Play','<p>How to play guide.</p>'),
  ('rules','Rules','<p>General rules.</p>'),
  ('privacy-policy','Privacy Policy','<p>Privacy policy.</p>'),
  ('terms-conditions','Terms & Conditions','<p>Terms and conditions.</p>'),
  ('tournament-rules','Tournament Rules','<p>Tournament rules.</p>');

INSERT INTO public.notification_templates (slug, title_template, message_template) VALUES
  ('deposit_submitted','Deposit Submitted','Your deposit of {amount} BAC has been submitted for review.'),
  ('deposit_approved','Deposit Approved','Your deposit of {amount} BAC has been approved.'),
  ('deposit_rejected','Deposit Rejected','Your deposit was rejected. Reason: {reason}'),
  ('withdraw_requested','Withdraw Requested','Your withdraw request of {amount} BAC was submitted.'),
  ('withdraw_paid','Withdraw Paid','Your withdraw of {amount} BAC has been paid.'),
  ('withdraw_rejected','Withdraw Rejected','Your withdraw was rejected. Reason: {reason}'),
  ('match_joined','Match Joined','You joined match: {match_name}'),
  ('match_cancelled','Match Cancelled','Match {match_name} has been cancelled.'),
  ('match_refund_completed','Refund Completed','Refund of {amount} BAC for {match_name} completed.'),
  ('result_published','Results Published','Results for {match_name} are out.'),
  ('prize_received','Prize Received','You won {amount} BAC in {match_name}.'),
  ('premium_activated','Premium Activated','Your premium membership is now active until {expires_at}.'),
  ('premium_extended','Premium Extended','Premium extended until {expires_at}.'),
  ('premium_expiring','Premium Expiring','Your premium expires on {expires_at}.'),
  ('premium_expired','Premium Expired','Your premium membership has expired.'),
  ('referral_bonus','Referral Bonus','You earned {amount} BAC referral bonus from {referred_name}.'),
  ('support_reply','Support Reply','New reply on ticket: {subject}'),
  ('account_suspended','Account Suspended','Your account has been suspended. Reason: {reason}');