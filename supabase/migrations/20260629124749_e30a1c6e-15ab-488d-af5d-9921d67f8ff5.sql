CREATE OR REPLACE FUNCTION public.admin_unpublish_match_result(p_match_id bigint)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_count integer := 0;
  r record;
BEGIN
  IF v_caller IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT (public.has_role(v_caller, 'admin') OR public.has_role(v_caller, 'super_admin')) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  -- Reverse credited prizes for each applied participant
  FOR r IN
    SELECT id, user_id, COALESCE(prize_bac,0) + COALESCE(kill_prize_bac,0) AS total_credited
    FROM public.match_participants
    WHERE match_id = p_match_id AND result_applied = true
  LOOP
    IF r.total_credited > 0 THEN
      UPDATE public.profiles
      SET bac_coin_balance = GREATEST(0, COALESCE(bac_coin_balance,0) - r.total_credited)
      WHERE id = r.user_id;

      INSERT INTO public.balance_logs (user_id, amount_bac, handler_type, note)
      VALUES (r.user_id, -r.total_credited, 'admin'::handler_type,
              'Result unpublished/edited for match #' || p_match_id);
    END IF;
    v_count := v_count + 1;
  END LOOP;

  -- Reset participants
  UPDATE public.match_participants
  SET result_applied = false,
      prize_bac = 0,
      kill_prize_bac = 0,
      kills = 0,
      status = 'joined'::participant_status,
      rank_position = NULL
  WHERE match_id = p_match_id;

  -- Reset match
  UPDATE public.matches
  SET result_applied = false,
      status = 'Active'::match_status
  WHERE id = p_match_id;

  -- Remove existing result media
  DELETE FROM public.match_result_media WHERE match_id = p_match_id;

  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_unpublish_match_result(bigint) TO authenticated;