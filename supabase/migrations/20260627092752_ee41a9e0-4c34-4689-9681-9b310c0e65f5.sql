
-- Unique pubg_id when not null
CREATE UNIQUE INDEX IF NOT EXISTS profiles_pubg_id_unique
  ON public.profiles (pubg_id)
  WHERE pubg_id IS NOT NULL;

-- Updated trigger reading all signup metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_username TEXT;
  v_pubg_id TEXT;
  v_ref_code TEXT;
  v_ref_input TEXT;
  v_referrer UUID;
BEGIN
  v_username := COALESCE(
    NEW.raw_user_meta_data ->> 'username',
    NEW.raw_user_meta_data ->> 'in_game_username',
    split_part(NEW.email, '@', 1)
  );
  v_pubg_id := NULLIF(NEW.raw_user_meta_data ->> 'pubg_id', '');

  -- Referral code derived from PUBG ID when available, else random
  IF v_pubg_id IS NOT NULL THEN
    v_ref_code := upper('BA' || substr(regexp_replace(v_pubg_id, '[^0-9A-Za-z]', '', 'g'), 1, 8));
  ELSE
    v_ref_code := upper(substr(md5(NEW.id::text || clock_timestamp()::text), 1, 8));
  END IF;

  -- Resolve optional referrer from ?ref=CODE
  v_ref_input := NULLIF(NEW.raw_user_meta_data ->> 'referral_code_input', '');
  IF v_ref_input IS NOT NULL THEN
    SELECT id INTO v_referrer
    FROM public.profiles
    WHERE upper(referral_code) = upper(v_ref_input)
    LIMIT 1;
  END IF;

  INSERT INTO public.profiles (
    id, username, display_name, avatar_url,
    in_game_username, country_code, mobile_number,
    pubg_id, game_server, referral_code, referred_by
  )
  VALUES (
    NEW.id,
    v_username,
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', v_username),
    NEW.raw_user_meta_data ->> 'avatar_url',
    NULLIF(NEW.raw_user_meta_data ->> 'in_game_username', ''),
    NULLIF(NEW.raw_user_meta_data ->> 'country_code', ''),
    NULLIF(NEW.raw_user_meta_data ->> 'mobile_number', ''),
    v_pubg_id,
    NULLIF(NEW.raw_user_meta_data ->> 'game_server', '')::game_server,
    v_ref_code,
    v_referrer
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$function$;

-- Ensure trigger exists on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
