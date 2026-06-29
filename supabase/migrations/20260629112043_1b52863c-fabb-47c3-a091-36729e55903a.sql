CREATE OR REPLACE FUNCTION public.admin_publish_match_result(p_match_id bigint, p_results jsonb, p_result_description text DEFAULT NULL::text, p_result_image_url text DEFAULT NULL::text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_match public.matches%ROWTYPE;
  v_item jsonb; v_uid uuid;
  v_status text; v_rank int; v_kills int;
  v_part_status participant_status;
  v_kill_prize numeric; v_win_prize numeric; v_bonus numeric; v_total numeric;
  v_per_kill numeric; v_team_size int; v_kill_count int;
  v_prize_pool numeric; v_total_income numeric; v_rank_sum numeric;
  v_bal numeric; v_count int := 0;
  v_part_id bigint;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admins only'; END IF;
  SELECT * INTO v_match FROM public.matches WHERE id = p_match_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Match not found'; END IF;
  IF v_match.result_applied THEN RAISE EXCEPTION 'Results already published'; END IF;

  v_team_size := CASE v_match.player_mode::text
    WHEN 'Solo' THEN 1 WHEN 'Duo' THEN 2 WHEN 'Squad' THEN 4 ELSE 1 END;
  v_total_income := COALESCE(v_match.entry_fee_bac,0) * COALESCE(v_match.total_players,0);
  v_prize_pool := v_total_income - (v_total_income * COALESCE(v_match.platform_fee_pct,0) / 100.0);
  v_rank_sum := COALESCE(v_match.rank_1_prize_bac,0) + COALESCE(v_match.rank_2_prize_bac,0) + COALESCE(v_match.rank_3_prize_bac,0);
  -- Free match support: use admin-configured rank prize sum as floor
  v_prize_pool := GREATEST(v_prize_pool, v_rank_sum);
  v_kill_count := GREATEST(COALESCE(v_match.total_players,0) - v_team_size, 1);
  v_per_kill := CASE WHEN COALESCE(v_match.per_kill_amount_bac,0) > 0
                     THEN v_match.per_kill_amount_bac::numeric
                     ELSE round(v_prize_pool / v_kill_count, 2) END;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_results)
  LOOP
    v_uid := (v_item->>'user_id')::uuid;
    v_status := COALESCE(v_item->>'status', '');
    v_rank := CASE WHEN v_status = 'Winner' THEN 1
                   WHEN v_status = 'Loser' THEN 2
                   ELSE NULLIF(v_item->>'rank','')::int END;
    v_kills := COALESCE(NULLIF(v_item->>'kills','')::int, 0);
    v_win_prize := COALESCE(NULLIF(v_item->>'win_prize','')::numeric, 0);
    v_bonus := COALESCE(NULLIF(v_item->>'bonus','')::numeric, 0);
    v_part_status := CASE WHEN v_status = 'Winner' THEN 'win'::participant_status
                          ELSE 'loss'::participant_status END;

    SELECT id INTO v_part_id FROM public.match_participants
      WHERE match_id = p_match_id AND user_id = v_uid;
    IF v_part_id IS NULL THEN CONTINUE; END IF;

    v_kill_prize := v_kills * v_per_kill;
    v_total := v_kill_prize + v_win_prize + v_bonus;

    UPDATE public.match_participants SET
      rank_position = v_rank,
      kills = v_kills,
      kill_prize_bac = v_kill_prize,
      win_prize_bac = v_win_prize,
      bonus_bac = v_bonus,
      prize_bac = v_total,
      status = v_part_status,
      result_applied = true
    WHERE id = v_part_id;

    IF v_total > 0 THEN
      SELECT balance_bac INTO v_bal FROM public.profiles WHERE id = v_uid FOR UPDATE;
      UPDATE public.profiles SET balance_bac = COALESCE(balance_bac,0) + v_total WHERE id = v_uid;
      INSERT INTO public.balance_logs (user_id, type, amount_bac, balance_before, balance_after,
        handled_by, note, reference_type, reference_id)
      VALUES (v_uid, 'match_prize'::balance_log_type, v_total, COALESCE(v_bal,0), COALESCE(v_bal,0) + v_total,
        'admin'::balance_handler, format('Match #%s prize (kill:%s + win:%s + bonus:%s)',
          p_match_id, v_kill_prize, v_win_prize, v_bonus),
        'match', p_match_id);
    END IF;

    v_count := v_count + 1;
  END LOOP;

  UPDATE public.matches SET result_applied = true, status = 'Complete'::match_status, updated_at = now()
    WHERE id = p_match_id;

  IF p_result_description IS NOT NULL OR p_result_image_url IS NOT NULL THEN
    INSERT INTO public.match_result_media (match_id, description, image_url, uploaded_by)
    VALUES (p_match_id, p_result_description, p_result_image_url, auth.uid())
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN v_count;
END;
$function$;