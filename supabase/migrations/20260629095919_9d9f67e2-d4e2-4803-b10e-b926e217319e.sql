
CREATE OR REPLACE FUNCTION public.admin_update_profile(
  p_user_id uuid,
  p_username text DEFAULT NULL,
  p_in_game_username text DEFAULT NULL,
  p_pubg_id text DEFAULT NULL,
  p_country_code text DEFAULT NULL,
  p_mobile_number text DEFAULT NULL,
  p_game_server text DEFAULT NULL,
  p_referral_code text DEFAULT NULL,
  p_is_active boolean DEFAULT NULL,
  p_avatar_url text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'sub_admin')) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  UPDATE public.profiles SET
    username         = COALESCE(NULLIF(p_username, ''), username),
    in_game_username = COALESCE(NULLIF(p_in_game_username, ''), in_game_username),
    pubg_id          = COALESCE(NULLIF(p_pubg_id, ''), pubg_id),
    country_code     = COALESCE(NULLIF(p_country_code, ''), country_code),
    mobile_number    = COALESCE(NULLIF(p_mobile_number, ''), mobile_number),
    game_server      = COALESCE(NULLIF(p_game_server, '')::game_server, game_server),
    referral_code    = COALESCE(NULLIF(p_referral_code, ''), referral_code),
    is_active        = COALESCE(p_is_active, is_active),
    avatar_url       = COALESCE(NULLIF(p_avatar_url, ''), avatar_url),
    updated_at       = now()
  WHERE id = p_user_id;

  INSERT INTO public.admin_action_logs (admin_id, action_type, target_type, target_id, details)
  VALUES (auth.uid(), 'profile_update', 'user', p_user_id, jsonb_build_object(
    'fields', jsonb_strip_nulls(jsonb_build_object(
      'username', p_username, 'in_game_username', p_in_game_username, 'pubg_id', p_pubg_id,
      'country_code', p_country_code, 'mobile_number', p_mobile_number,
      'game_server', p_game_server, 'referral_code', p_referral_code,
      'is_active', p_is_active, 'avatar_url', p_avatar_url
    ))
  ));
END $$;

GRANT EXECUTE ON FUNCTION public.admin_update_profile(uuid, text, text, text, text, text, text, text, boolean, text) TO authenticated;
