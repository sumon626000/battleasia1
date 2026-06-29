
DO $$
DECLARE
  v_uid uuid;
  v_username text := 'superadmin_' || substr(md5(random()::text), 1, 6);
BEGIN
  SELECT id INTO v_uid FROM auth.users WHERE email = 'admin@gmail.com';

  IF v_uid IS NULL THEN
    v_uid := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', v_uid, 'authenticated', 'authenticated',
      'admin@gmail.com', crypt('12345678', gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('username', v_username, 'display_name', 'Super Admin'),
      '', '', '', ''
    );

    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), v_uid,
      jsonb_build_object('sub', v_uid::text, 'email', 'admin@gmail.com', 'email_verified', true),
      'email', v_uid::text, now(), now(), now());
  ELSE
    UPDATE auth.users
    SET encrypted_password = crypt('12345678', gen_salt('bf')),
        email_confirmed_at = COALESCE(email_confirmed_at, now()),
        updated_at = now()
    WHERE id = v_uid;
  END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (v_uid, 'admin') ON CONFLICT (user_id, role) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (v_uid, 'super_admin') ON CONFLICT (user_id, role) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (v_uid, 'user') ON CONFLICT (user_id, role) DO NOTHING;
END $$;
