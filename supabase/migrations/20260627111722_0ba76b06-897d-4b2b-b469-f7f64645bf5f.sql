
-- Admin match RPCs (Phase 19 + 20)

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
      sponsor, match_url, platform_fee_pct, created_by_admin_id
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
      p_payload->>'sponsor', p_payload->>'match_url',
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
      platform_fee_pct = COALESCE((p_payload->>'platform_fee_pct')::numeric, platform_fee_pct)
    WHERE id = p_match_id RETURNING id INTO v_id;
    IF v_id IS NULL THEN RAISE EXCEPTION 'Match not found'; END IF;
  END IF;
  INSERT INTO public.admin_action_logs(admin_id, action, module, target_type, target_id, new_value)
  VALUES (auth.uid(), CASE WHEN p_match_id IS NULL THEN 'match_create' ELSE 'match_update' END,
          'matches', 'match', v_id::text, p_payload);
  RETURN v_id;
END;$$;

CREATE OR REPLACE FUNCTION public.admin_delete_match(p_match_id bigint)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admins only'; END IF;
  UPDATE public.matches SET deleted_at = now(), status = 'Cancelled' WHERE id = p_match_id;
  INSERT INTO public.admin_action_logs(admin_id, action, module, target_type, target_id)
  VALUES (auth.uid(), 'match_delete', 'matches', 'match', p_match_id::text);
END;$$;

-- Cancel a match -> refund all joined participants
CREATE OR REPLACE FUNCTION public.admin_cancel_match(p_match_id bigint, p_reason text)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; v_bal numeric; v_count int := 0;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admins only'; END IF;
  FOR r IN SELECT id, user_id, entry_fee_bac FROM public.match_participants
           WHERE match_id = p_match_id AND status = 'joined' AND refund_processed = false
  LOOP
    IF r.entry_fee_bac > 0 THEN
      SELECT bac_coin_balance INTO v_bal FROM public.profiles WHERE id = r.user_id FOR UPDATE;
      UPDATE public.profiles SET bac_coin_balance = bac_coin_balance + r.entry_fee_bac WHERE id = r.user_id;
      INSERT INTO public.balance_logs(user_id, type, amount_bac, balance_before, balance_after, handled_by, note, reference_id, reference_type)
      VALUES (r.user_id, 'match_refund', r.entry_fee_bac, v_bal, v_bal + r.entry_fee_bac, 'admin',
              COALESCE(p_reason,'Match cancelled'), p_match_id, 'match');
    END IF;
    UPDATE public.match_participants SET status = 'refunded', refund_processed = true WHERE id = r.id;
    v_count := v_count + 1;
  END LOOP;
  UPDATE public.matches SET status = 'Cancelled' WHERE id = p_match_id;
  INSERT INTO public.admin_action_logs(admin_id, action, module, target_type, target_id, new_value)
  VALUES (auth.uid(), 'match_cancel', 'matches', 'match', p_match_id::text,
          jsonb_build_object('refunds', v_count, 'reason', p_reason));
  RETURN v_count;
END;$$;

-- Publish results: payload = [{user_id, rank, kills}]
CREATE OR REPLACE FUNCTION public.admin_publish_match_result(p_match_id bigint, p_results jsonb, p_result_description text DEFAULT NULL, p_result_image_url text DEFAULT NULL)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_match public.matches%ROWTYPE;
  v_item jsonb; v_uid uuid; v_rank int; v_kills int;
  v_prize numeric; v_bal numeric; v_count int := 0;
  v_part_id bigint;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admins only'; END IF;
  SELECT * INTO v_match FROM public.matches WHERE id = p_match_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Match not found'; END IF;
  IF v_match.result_applied THEN RAISE EXCEPTION 'Results already published'; END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_results)
  LOOP
    v_uid := (v_item->>'user_id')::uuid;
    v_rank := NULLIF(v_item->>'rank','')::int;
    v_kills := COALESCE((v_item->>'kills')::int, 0);

    SELECT id INTO v_part_id FROM public.match_participants
      WHERE match_id = p_match_id AND user_id = v_uid;
    IF v_part_id IS NULL THEN CONTINUE; END IF;

    v_prize := 0;
    IF v_match.reward_type IN ('KillBased','Mixed') THEN
      v_prize := v_prize + v_kills * COALESCE(v_match.per_kill_amount_bac,0);
    END IF;
    IF v_match.reward_type IN ('RankBased','Mixed') THEN
      IF v_rank = 1 THEN v_prize := v_prize + COALESCE(v_match.rank_1_prize_bac,0);
      ELSIF v_rank = 2 THEN v_prize := v_prize + COALESCE(v_match.rank_2_prize_bac,0);
      ELSIF v_rank = 3 THEN v_prize := v_prize + COALESCE(v_match.rank_3_prize_bac,0);
      END IF;
    END IF;

    UPDATE public.match_participants SET
      rank_position = v_rank, kills = v_kills,
      prize_bac = v_prize, status = 'completed', result_applied = true
    WHERE id = v_part_id;

    IF v_prize > 0 THEN
      SELECT bac_coin_balance INTO v_bal FROM public.profiles WHERE id = v_uid FOR UPDATE;
      UPDATE public.profiles SET bac_coin_balance = bac_coin_balance + v_prize WHERE id = v_uid;
      INSERT INTO public.balance_logs(user_id, type, amount_bac, balance_before, balance_after, handled_by, note, reference_id, reference_type)
      VALUES (v_uid, 'match_prize', v_prize, v_bal, v_bal + v_prize, 'admin',
              'Prize for ' || COALESCE(v_match.match_name,'match'), p_match_id, 'match');
    END IF;
    v_count := v_count + 1;
  END LOOP;

  UPDATE public.matches SET result_applied = true, status = 'Completed' WHERE id = p_match_id;

  IF p_result_description IS NOT NULL OR p_result_image_url IS NOT NULL THEN
    INSERT INTO public.match_result_media(match_id, result_description, result_image_url, uploaded_by_admin_id)
    VALUES (p_match_id, p_result_description, p_result_image_url, auth.uid());
  END IF;

  INSERT INTO public.admin_action_logs(admin_id, action, module, target_type, target_id, new_value)
  VALUES (auth.uid(), 'match_result_publish', 'matches', 'match', p_match_id::text,
          jsonb_build_object('rows', v_count));
  RETURN v_count;
END;$$;

REVOKE EXECUTE ON FUNCTION public.admin_save_match(bigint, jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_delete_match(bigint) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_cancel_match(bigint, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_publish_match_result(bigint, jsonb, text, text) FROM anon;

-- Admin read access to participants for results UI
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='match_participants' AND policyname='Admins view all participants') THEN
    CREATE POLICY "Admins view all participants" ON public.match_participants FOR SELECT TO authenticated USING (public.is_admin());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='matches' AND policyname='Admins manage matches') THEN
    CREATE POLICY "Admins manage matches" ON public.matches FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='match_result_media' AND policyname='Admins manage result media') THEN
    CREATE POLICY "Admins manage result media" ON public.match_result_media FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
  END IF;
END $$;
