CREATE OR REPLACE FUNCTION public.claim_quest_reward(_quest_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid UUID := auth.uid();
  _quest RECORD;
  _progress RECORD;
  _new_balance NUMERIC;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  SELECT * INTO _quest FROM public.daily_quests WHERE id = _quest_id AND is_active = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'Quest not found'; END IF;
  SELECT * INTO _progress FROM public.user_quest_progress
    WHERE user_id = _uid AND quest_id = _quest_id AND quest_date = CURRENT_DATE;
  IF NOT FOUND OR _progress.progress < _quest.target_value THEN
    RAISE EXCEPTION 'Quest not completed';
  END IF;
  IF _progress.is_claimed THEN RAISE EXCEPTION 'Already claimed'; END IF;

  UPDATE public.profiles SET bac_coin_balance = COALESCE(bac_coin_balance,0) + _quest.reward_bac
    WHERE id = _uid RETURNING bac_coin_balance INTO _new_balance;
  UPDATE public.user_quest_progress SET is_claimed = true, is_completed = true, claimed_at = now()
    WHERE id = _progress.id;
  INSERT INTO public.balance_logs(user_id, amount, type, description, balance_after)
    VALUES (_uid, _quest.reward_bac, 'quest_reward', 'Daily quest: '||_quest.title, _new_balance);
  RETURN jsonb_build_object('success', true, 'reward', _quest.reward_bac, 'balance', _new_balance);
END;$$;

CREATE OR REPLACE FUNCTION public.perform_spin()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid UUID := auth.uid();
  _settings RECORD;
  _today_count INTEGER;
  _free_used INTEGER;
  _is_free BOOLEAN := false;
  _cost NUMERIC := 0;
  _balance NUMERIC;
  _total_weight INTEGER;
  _r INTEGER;
  _cum INTEGER := 0;
  _seg RECORD;
  _chosen RECORD;
  _new_balance NUMERIC;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  SELECT * INTO _settings FROM public.spin_settings WHERE id = 1;
  IF NOT _settings.is_enabled THEN RAISE EXCEPTION 'Spin wheel disabled'; END IF;

  SELECT COUNT(*) INTO _today_count FROM public.spin_history
    WHERE user_id = _uid AND spin_date = CURRENT_DATE;
  IF _today_count >= _settings.max_spins_per_day THEN
    RAISE EXCEPTION 'Daily spin limit reached';
  END IF;

  SELECT COUNT(*) INTO _free_used FROM public.spin_history
    WHERE user_id = _uid AND spin_date = CURRENT_DATE AND is_free = true;
  IF _free_used < _settings.free_spins_per_day THEN
    _is_free := true; _cost := 0;
  ELSE
    _cost := _settings.extra_spin_cost_bac;
    SELECT bac_coin_balance INTO _balance FROM public.profiles WHERE id = _uid;
    IF COALESCE(_balance,0) < _cost THEN RAISE EXCEPTION 'Insufficient balance'; END IF;
    UPDATE public.profiles SET bac_coin_balance = bac_coin_balance - _cost WHERE id = _uid RETURNING bac_coin_balance INTO _new_balance;
    INSERT INTO public.balance_logs(user_id, amount, type, description, balance_after)
      VALUES (_uid, -_cost, 'spin_cost', 'Spin wheel cost', _new_balance);
  END IF;

  SELECT COALESCE(SUM(weight),0) INTO _total_weight FROM public.spin_wheel_config WHERE is_active = true;
  IF _total_weight <= 0 THEN RAISE EXCEPTION 'No spin segments configured'; END IF;
  _r := floor(random() * _total_weight)::INTEGER;
  FOR _seg IN SELECT * FROM public.spin_wheel_config WHERE is_active = true ORDER BY sort_order, created_at LOOP
    _cum := _cum + _seg.weight;
    IF _r < _cum THEN _chosen := _seg; EXIT; END IF;
  END LOOP;

  IF _chosen.reward_amount > 0 AND _chosen.reward_type = 'bac' THEN
    UPDATE public.profiles SET bac_coin_balance = COALESCE(bac_coin_balance,0) + _chosen.reward_amount
      WHERE id = _uid RETURNING bac_coin_balance INTO _new_balance;
    INSERT INTO public.balance_logs(user_id, amount, type, description, balance_after)
      VALUES (_uid, _chosen.reward_amount, 'spin_reward', 'Spin wheel: '||_chosen.label, _new_balance);
  END IF;

  INSERT INTO public.spin_history(user_id, segment_id, reward_type, reward_amount, spin_cost, is_free)
    VALUES (_uid, _chosen.id, _chosen.reward_type, _chosen.reward_amount, _cost, _is_free);

  INSERT INTO public.user_quest_progress(user_id, quest_id, quest_date, progress, is_completed)
    SELECT _uid, q.id, CURRENT_DATE, 1, (1 >= q.target_value)
    FROM public.daily_quests q WHERE q.quest_type = 'spin' AND q.is_active = true
    ON CONFLICT (user_id, quest_id, quest_date) DO UPDATE SET
      progress = public.user_quest_progress.progress + 1,
      is_completed = (public.user_quest_progress.progress + 1 >= (SELECT target_value FROM public.daily_quests WHERE id = public.user_quest_progress.quest_id));

  RETURN jsonb_build_object('success', true, 'segment_id', _chosen.id, 'label', _chosen.label, 'reward_type', _chosen.reward_type, 'reward_amount', _chosen.reward_amount, 'is_free', _is_free, 'cost', _cost);
END;$$;