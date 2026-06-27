ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS live_stream_url TEXT;

CREATE OR REPLACE FUNCTION public.admin_save_match(p_match_id bigint, p_payload jsonb)
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id bigint;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admins only'; END IF;
  IF p_match_id IS NULL THEN
    INSERT INTO public.matches(
      game_id, match_name, map_name, match_type, game_mode, player_mode, reward_type,
      kill_rate_type, total_players, entry_fee_bac, per_kill_amount_bac,
      rank_1_prize_bac, rank_2_prize_bac, rank_3_prize_bac,
      schedule_at, premium_only, status, description, prize_description,
      private_description, room_id, room_password, banner_image_url, map_image_url,
      sponsor, match_url, live_stream_url, platform_fee_pct, created_by_admin_id
    )
    VALUES (
      COALESCE((p_payload->>'game_id')::bigint, 1),
      p_payload->>'match_name',
      COALESCE(p_payload->>'map_name','Erangel'),
      COALESCE((p_payload->>'match_type')::match_type,'Free'::match_type),
      COALESCE((p_payload->>'game_mode')::match_game_mode,'Classic'::match_game_mode),
      COALESCE((p_payload->>'player_mode')::match_player_mode,'Squad'::match_player_mode),
      COALESCE((p_payload->>'reward_type')::match_reward_type,'RankBased'::match_reward_type),
      COALESCE((p_payload->>'kill_rate_type')::match_kill_rate_type,'PerKill'::match_kill_rate_type),
      COALESCE((p_payload->>'total_players')::int, 100),
      COALESCE((p_payload->>'entry_fee_bac')::numeric, 0),
      COALESCE((p_payload->>'per_kill_amount_bac')::numeric, 0),
      COALESCE((p_payload->>'rank_1_prize_bac')::numeric, 0),
      COALESCE((p_payload->>'rank_2_prize_bac')::numeric, 0),
      COALESCE((p_payload->>'rank_3_prize_bac')::numeric, 0),
      COALESCE((p_payload->>'schedule_at')::timestamptz, now() + interval '1 day'),
      COALESCE((p_payload->>'premium_only')::boolean, false),
      COALESCE((p_payload->>'status')::match_status,'Upcoming'::match_status),
      p_payload->>'description', p_payload->>'prize_description',
      p_payload->>'private_description', p_payload->>'room_id', p_payload->>'room_password',
      p_payload->>'banner_image_url', p_payload->>'map_image_url',
      p_payload->>'sponsor', p_payload->>'match_url', p_payload->>'live_stream_url',
      COALESCE((p_payload->>'platform_fee_pct')::numeric, 0),
      auth.uid()
    ) RETURNING id INTO v_id;
  ELSE
    UPDATE public.matches SET
      game_id = COALESCE((p_payload->>'game_id')::bigint, game_id),
      match_name = COALESCE(p_payload->>'match_name', match_name),
      map_name = COALESCE(p_payload->>'map_name', map_name),
      match_type = COALESCE((p_payload->>'match_type')::match_type, match_type),
      game_mode = COALESCE((p_payload->>'game_mode')::match_game_mode, game_mode),
      player_mode = COALESCE((p_payload->>'player_mode')::match_player_mode, player_mode),
      reward_type = COALESCE((p_payload->>'reward_type')::match_reward_type, reward_type),
      kill_rate_type = COALESCE((p_payload->>'kill_rate_type')::match_kill_rate_type, kill_rate_type),
      total_players = COALESCE((p_payload->>'total_players')::int, total_players),
      entry_fee_bac = COALESCE((p_payload->>'entry_fee_bac')::numeric, entry_fee_bac),
      per_kill_amount_bac = COALESCE((p_payload->>'per_kill_amount_bac')::numeric, per_kill_amount_bac),
      rank_1_prize_bac = COALESCE((p_payload->>'rank_1_prize_bac')::numeric, rank_1_prize_bac),
      rank_2_prize_bac = COALESCE((p_payload->>'rank_2_prize_bac')::numeric, rank_2_prize_bac),
      rank_3_prize_bac = COALESCE((p_payload->>'rank_3_prize_bac')::numeric, rank_3_prize_bac),
      schedule_at = COALESCE((p_payload->>'schedule_at')::timestamptz, schedule_at),
      premium_only = COALESCE((p_payload->>'premium_only')::boolean, premium_only),
      status = COALESCE((p_payload->>'status')::match_status, status),
      description = COALESCE(p_payload->>'description', description),
      prize_description = COALESCE(p_payload->>'prize_description', prize_description),
      private_description = COALESCE(p_payload->>'private_description', private_description),
      room_id = COALESCE(p_payload->>'room_id', room_id),
      room_password = COALESCE(p_payload->>'room_password', room_password),
      banner_image_url = COALESCE(p_payload->>'banner_image_url', banner_image_url),
      map_image_url = COALESCE(p_payload->>'map_image_url', map_image_url),
      sponsor = COALESCE(p_payload->>'sponsor', sponsor),
      match_url = COALESCE(p_payload->>'match_url', match_url),
      live_stream_url = COALESCE(p_payload->>'live_stream_url', live_stream_url),
      platform_fee_pct = COALESCE((p_payload->>'platform_fee_pct')::numeric, platform_fee_pct)
    WHERE id = p_match_id RETURNING id INTO v_id;
    IF v_id IS NULL THEN RAISE EXCEPTION 'Match not found'; END IF;
  END IF;
  INSERT INTO public.admin_action_logs(admin_id, action, module, target_type, target_id, new_value)
  VALUES (auth.uid(), CASE WHEN p_match_id IS NULL THEN 'match_create' ELSE 'match_update' END,
          'matches', 'match', v_id::text, p_payload);
  RETURN v_id;
END;$$;

REVOKE EXECUTE ON FUNCTION public.admin_save_match(bigint, jsonb) FROM anon;