
DO $$
DECLARE
  bots TEXT[][] := ARRAY[
    ARRAY['shadow47',   'SHADOW_47',    'BD', '+880', '1711000001', '511000001', 'Asia'],
    ARRAY['ghostking',  'GHOST_KING',   'IN', '+91',  '9810000002', '512000002', 'Asia'],
    ARRAY['novastrike', 'NOVA_STRIKE',  'PK', '+92',  '3000000003', '513000003', 'Asia'],
    ARRAY['ravenx',     'RAVEN_X',      'NP', '+977', '9810000004', '514000004', 'Asia'],
    ARRAY['titan07',    'TITAN_07',     'LK', '+94',  '7710000005', '515000005', 'Asia'],
    ARRAY['viperace',   'VIPER_ACE',    'MY', '+60',  '1110000006', '516000006', 'Asia'],
    ARRAY['blazeops',   'BLAZE_OPS',    'ID', '+62',  '8110000007', '517000007', 'Asia'],
    ARRAY['falcon22',   'FALCON_22',    'TH', '+66',  '8110000008', '518000008', 'Asia'],
    ARRAY['wraithzed',  'WRAITH_ZED',   'VN', '+84',  '9010000009', '519000009', 'Asia'],
    ARRAY['echoprime',  'ECHO_PRIME',   'PH', '+63',  '9170000010', '520000010', 'Asia']
  ];
  bot TEXT[];
  v_uid UUID; v_email TEXT; v_password TEXT := 'BotPlayer@2026';
  v_match_ids BIGINT[]; v_match_id BIGINT;
  v_kills INT; v_rank INT; v_prize INT;
  v_bal NUMERIC; v_amt INT; v_i INT;
BEGIN
  FOREACH bot SLICE 1 IN ARRAY bots LOOP
    v_email := bot[1] || '@bots.battleasia.com';
    v_uid := ('00000000-0000-4000-8000-' || lpad(abs(hashtext(bot[1]))::text, 12, '0'))::uuid;

    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', v_uid, 'authenticated', 'authenticated',
      v_email, crypt(v_password, gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('username', bot[1], 'in_game_username', bot[2],
        'country_code', bot[4], 'mobile_number', bot[5],
        'pubg_id', bot[6], 'game_server', bot[7]),
      now() - interval '60 days', now(), '', '', '', ''
    ) ON CONFLICT (id) DO UPDATE SET encrypted_password = EXCLUDED.encrypted_password;

    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), v_uid,
      jsonb_build_object('sub', v_uid::text, 'email', v_email, 'email_verified', true),
      'email', v_uid::text, now(), now(), now())
    ON CONFLICT (provider, provider_id) DO NOTHING;

    INSERT INTO public.profiles (id, username, display_name, in_game_username, country, country_code, mobile_number, pubg_id, game_server, bac_coin_balance, referral_code, bio, created_at, updated_at)
    VALUES (v_uid, bot[1], bot[2], bot[2], bot[3], bot[4], bot[5], bot[6], bot[7]::game_server,
      0, upper('BA' || substr(bot[6], 1, 8)),
      'Pro player from ' || bot[3] || ' • Squad leader • PUBG veteran', now() - interval '60 days', now())
    ON CONFLICT (id) DO UPDATE SET
      username = EXCLUDED.username, display_name = EXCLUDED.display_name,
      in_game_username = EXCLUDED.in_game_username, country = EXCLUDED.country,
      country_code = EXCLUDED.country_code, mobile_number = EXCLUDED.mobile_number,
      pubg_id = EXCLUDED.pubg_id, game_server = EXCLUDED.game_server, bio = EXCLUDED.bio;

    INSERT INTO public.user_roles (user_id, role) VALUES (v_uid, 'user') ON CONFLICT DO NOTHING;
  END LOOP;

  FOR v_i IN 1..6 LOOP
    INSERT INTO public.matches (game_id, match_name, map_name, match_type, game_mode, player_mode, reward_type, kill_rate_type, total_players, entry_fee_bac, per_kill_amount_bac, rank_1_prize_bac, rank_2_prize_bac, rank_3_prize_bac, schedule_at, status, description, room_id, room_password)
    VALUES (1,
      (ARRAY['Erangel Pro League','Miramar Showdown','Sanhok Sniper Cup','Vikendi Frost War','Karakin Quick Strike','Livik Lightning'])[v_i],
      (ARRAY['Erangel','Miramar','Sanhok','Vikendi','Karakin','Livik'])[v_i],
      'Paid','Classic','Squad','RankBased','Automatic', 100, 50, 10, 1500, 800, 400,
      now() - (v_i || ' days')::interval, 'Complete',
      'Completed tournament — seed', 'ROOM' || (1000+v_i), 'pass' || v_i);
  END LOOP;

  SELECT array_agg(id ORDER BY id DESC) INTO v_match_ids
  FROM (SELECT id FROM public.matches WHERE status = 'Complete' ORDER BY id DESC LIMIT 6) m;

  FOR v_i IN 1..array_length(bots, 1) LOOP
    v_uid := ('00000000-0000-4000-8000-' || lpad(abs(hashtext(bots[v_i][1]))::text, 12, '0'))::uuid;
    v_bal := 1000;
    UPDATE public.profiles SET bac_coin_balance = v_bal WHERE id = v_uid;
    INSERT INTO public.balance_logs (user_id, amount_bac, type, balance_before, balance_after, handled_by, note, created_at)
    VALUES (v_uid, 1000, 'admin_deposit', 0, 1000, 'admin', 'Initial bot deposit (seed)', now() - interval '50 days');

    FOREACH v_match_id IN ARRAY v_match_ids LOOP
      v_kills := GREATEST(0, (12 - v_i) + floor(random()*8)::int);
      v_rank := CASE WHEN v_i <= 3 THEN 1 + (v_i-1) WHEN v_i <= 6 THEN 4 + floor(random()*5)::int ELSE 10 + floor(random()*40)::int END;
      v_prize := CASE v_rank WHEN 1 THEN 1500 WHEN 2 THEN 800 WHEN 3 THEN 400 ELSE 0 END + v_kills * 10;

      INSERT INTO public.balance_logs (user_id, amount_bac, type, balance_before, balance_after, handled_by, note, reference_id, reference_type, created_at)
      VALUES (v_uid, -50, 'match_entry_fee', v_bal, v_bal - 50, 'system', 'Entry fee match #' || v_match_id, v_match_id, 'match', now() - interval '5 days' + (v_match_id || ' minutes')::interval);
      v_bal := v_bal - 50;

      IF v_prize > 0 THEN
        INSERT INTO public.balance_logs (user_id, amount_bac, type, balance_before, balance_after, handled_by, note, reference_id, reference_type, created_at)
        VALUES (v_uid, v_prize, 'match_prize', v_bal, v_bal + v_prize, 'system',
          'Prize — Rank #' || v_rank || ' + ' || v_kills || ' kills', v_match_id, 'match',
          now() - interval '5 days' + (v_match_id || ' minutes')::interval + interval '1 hour');
        v_bal := v_bal + v_prize;
      END IF;

      INSERT INTO public.match_participants (match_id, user_id, entry_fee_bac, status, kills, rank_position, prize_bac, result_applied, joined_at, created_at, updated_at)
      VALUES (v_match_id, v_uid, 50, 'joined', v_kills, v_rank, v_prize, true,
        now() - interval '5 days', now() - interval '5 days', now() - interval '4 days')
      ON CONFLICT (match_id, user_id) DO UPDATE SET
        kills = EXCLUDED.kills, rank_position = EXCLUDED.rank_position,
        prize_bac = EXCLUDED.prize_bac, result_applied = true;
    END LOOP;

    v_amt := 200 + floor(random()*800)::int;
    INSERT INTO public.balance_logs (user_id, amount_bac, type, balance_before, balance_after, handled_by, note, created_at)
    VALUES (v_uid, v_amt, 'admin_deposit', v_bal, v_bal + v_amt, 'admin', 'Welcome bonus', now() - interval '3 days');
    v_bal := v_bal + v_amt;
    UPDATE public.profiles SET bac_coin_balance = v_bal WHERE id = v_uid;
  END LOOP;

  FOR v_i IN 1..5 LOOP
    v_uid := ('00000000-0000-4000-8000-' || lpad(abs(hashtext(bots[v_i][1]))::text, 12, '0'))::uuid;
    INSERT INTO public.social_posts (user_id, caption, created_at)
    VALUES (v_uid,
      (ARRAY[
        'Just dropped a 12 kill chicken dinner 🐔🔥 #BattleAsia',
        'Squad up tonight at 9 PM. Who is in? 🎮',
        'New season grind starts now. Top 100 incoming 💪',
        'That last circle was insane. GG to everyone in the lobby!',
        'Sniper headshots only challenge — day 3 ✅'
      ])[v_i],
      now() - (v_i || ' hours')::interval);
  END LOOP;
END $$;
