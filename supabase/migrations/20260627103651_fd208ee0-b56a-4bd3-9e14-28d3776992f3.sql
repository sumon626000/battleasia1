
CREATE INDEX IF NOT EXISTS idx_matches_status_sched ON public.matches(status, schedule_at);
CREATE INDEX IF NOT EXISTS idx_match_participants_match ON public.match_participants(match_id);
CREATE INDEX IF NOT EXISTS idx_match_participants_user ON public.match_participants(user_id, joined_at DESC);

CREATE OR REPLACE FUNCTION public.join_match(p_match_id bigint)
RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user uuid := auth.uid();
  v_match public.matches%ROWTYPE;
  v_count int;
  v_balance numeric;
  v_fee bigint;
  v_is_premium boolean;
  v_part_id bigint;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO v_match FROM public.matches WHERE id = p_match_id AND deleted_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'Match not found'; END IF;
  IF v_match.status NOT IN ('Upcoming','Active') THEN
    RAISE EXCEPTION 'Match is not open for joining';
  END IF;
  IF v_match.schedule_at IS NOT NULL AND v_match.schedule_at < now() - interval '5 minutes' THEN
    RAISE EXCEPTION 'Match has already started';
  END IF;

  -- Duplicate check
  IF EXISTS (SELECT 1 FROM public.match_participants WHERE match_id = p_match_id AND user_id = v_user) THEN
    RAISE EXCEPTION 'You have already joined this match';
  END IF;

  -- Capacity check (lock match row)
  PERFORM 1 FROM public.matches WHERE id = p_match_id FOR UPDATE;
  SELECT count(*) INTO v_count FROM public.match_participants
    WHERE match_id = p_match_id AND status NOT IN ('refunded','cancelled');
  IF v_match.total_players IS NOT NULL AND v_count >= v_match.total_players THEN
    RAISE EXCEPTION 'Match is full';
  END IF;

  -- Premium gate
  IF v_match.premium_only THEN
    SELECT (premium_expires_at IS NOT NULL AND premium_expires_at > now())
      INTO v_is_premium FROM public.profiles WHERE id = v_user;
    IF NOT COALESCE(v_is_premium, false) THEN
      RAISE EXCEPTION 'Premium membership required to join this match';
    END IF;
  END IF;

  v_fee := COALESCE(v_match.entry_fee_bac, 0);

  -- Paid match: deduct
  IF v_match.match_type = 'Paid' AND v_fee > 0 THEN
    SELECT bac_coin_balance INTO v_balance FROM public.profiles WHERE id = v_user FOR UPDATE;
    IF v_balance IS NULL THEN RAISE EXCEPTION 'Profile not found'; END IF;
    IF v_balance < v_fee THEN RAISE EXCEPTION 'Insufficient BAC balance for entry fee'; END IF;

    UPDATE public.profiles SET bac_coin_balance = bac_coin_balance - v_fee WHERE id = v_user;

    INSERT INTO public.balance_logs(user_id, type, amount_bac, balance_before, balance_after, handled_by, note, reference_id, reference_type)
    VALUES (v_user, 'match_entry_fee', -v_fee, v_balance, v_balance - v_fee, 'system',
            'Entry fee for ' || COALESCE(v_match.match_name, 'match #' || p_match_id), p_match_id, 'match');
  END IF;

  INSERT INTO public.match_participants(match_id, user_id, entry_fee_bac, status)
  VALUES (p_match_id, v_user, v_fee, 'joined')
  RETURNING id INTO v_part_id;

  RETURN v_part_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.join_match(bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.join_match(bigint) TO authenticated;
