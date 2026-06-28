CREATE OR REPLACE FUNCTION public.admin_publish_match_result(p_match_id bigint, p_results jsonb, p_result_description text DEFAULT NULL::text, p_result_image_url text DEFAULT NULL::text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_match public.matches%ROWTYPE;
  v_item jsonb; v_uid uuid; v_rank int; v_kills int;
  v_prize numeric; v_prize_override numeric; v_bal numeric; v_count int := 0;
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
    v_prize_override := NULLIF(v_item->>'prize','')::numeric;

    SELECT id INTO v_part_id FROM public.match_participants
      WHERE match_id = p_match_id AND user_id = v_uid;
    IF v_part_id IS NULL THEN CONTINUE; END IF;

    IF v_prize_override IS NOT NULL THEN
      v_prize := v_prize_override;
    ELSE
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

  UPDATE public.matches SET result_applied = true, status = 'Complete' WHERE id = p_match_id;

  IF p_result_description IS NOT NULL OR p_result_image_url IS NOT NULL THEN
    INSERT INTO public.match_result_media(match_id, result_description, result_image_url, uploaded_by_admin_id)
    VALUES (p_match_id, p_result_description, p_result_image_url, auth.uid());
  END IF;

  INSERT INTO public.admin_action_logs(admin_id, action, module, target_type, target_id, new_value)
  VALUES (auth.uid(), 'match_result_publish', 'matches', 'match', p_match_id::text,
          jsonb_build_object('rows', v_count));
  RETURN v_count;
END;
$function$;