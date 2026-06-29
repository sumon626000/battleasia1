-- MATCHES
REVOKE ALL ON public.matches FROM anon, authenticated;
GRANT SELECT (id, game_id, match_name, game_mode, map_name, map_image_url, player_mode, match_type, total_players, entry_fee_bac, platform_fee_pct, per_kill_amount_bac, kill_rate_type, reward_type, rank_1_prize_bac, rank_2_prize_bac, rank_3_prize_bac, premium_only, match_url, schedule_at, banner_image_url, prize_description, sponsor, description, status, result_applied, created_by_admin_id, deleted_at, created_at, updated_at, live_stream_url)
  ON public.matches TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.matches TO authenticated;
GRANT ALL ON public.matches TO service_role;

-- PROFILES
REVOKE ALL ON public.profiles FROM anon, authenticated;
GRANT SELECT (id, username, display_name, avatar_url, country, bac_coin_balance, referral_code, referred_by, created_at, updated_at, in_game_username, country_code, pubg_id, game_server, cover_url, is_premium, premium_expires_at, is_active, is_suspended, suspension_reason, language_preference, social_links, bio, active_theme)
  ON public.profiles TO anon;
GRANT SELECT (id, username, display_name, avatar_url, country, bac_coin_balance, referral_code, referred_by, created_at, updated_at, in_game_username, country_code, mobile_number, pubg_id, game_server, cover_url, is_premium, premium_expires_at, is_active, is_suspended, suspension_reason, language_preference, social_links, bio, active_theme)
  ON public.profiles TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

-- CHATBOT SETTINGS
REVOKE ALL ON public.chatbot_settings FROM anon, authenticated;
GRANT SELECT (id, enabled, welcome_message, bubble_title) ON public.chatbot_settings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chatbot_settings TO authenticated;
GRANT ALL ON public.chatbot_settings TO service_role;