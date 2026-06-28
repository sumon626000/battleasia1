-- Daily Quests
CREATE TABLE public.daily_quests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  quest_type TEXT NOT NULL, -- 'play_match','win_match','kills','deposit','login','referral','feed_post','spin'
  target_value INTEGER NOT NULL DEFAULT 1,
  reward_bac NUMERIC NOT NULL DEFAULT 0,
  icon TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.daily_quests TO anon, authenticated;
GRANT ALL ON public.daily_quests TO service_role;
ALTER TABLE public.daily_quests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "quests readable" ON public.daily_quests FOR SELECT USING (is_active = true OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "quests admin manage" ON public.daily_quests FOR ALL USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin')) WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

CREATE TABLE public.user_quest_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quest_id UUID NOT NULL REFERENCES public.daily_quests(id) ON DELETE CASCADE,
  quest_date DATE NOT NULL DEFAULT CURRENT_DATE,
  progress INTEGER NOT NULL DEFAULT 0,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  is_claimed BOOLEAN NOT NULL DEFAULT false,
  claimed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, quest_id, quest_date)
);
GRANT SELECT, INSERT, UPDATE ON public.user_quest_progress TO authenticated;
GRANT ALL ON public.user_quest_progress TO service_role;
ALTER TABLE public.user_quest_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own quest progress" ON public.user_quest_progress FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "own quest insert" ON public.user_quest_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own quest update" ON public.user_quest_progress FOR UPDATE USING (auth.uid() = user_id);

-- Spin Wheel
CREATE TABLE public.spin_wheel_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL,
  reward_type TEXT NOT NULL DEFAULT 'bac', -- 'bac','nothing','bonus'
  reward_amount NUMERIC NOT NULL DEFAULT 0,
  weight INTEGER NOT NULL DEFAULT 10, -- probability weight
  color TEXT NOT NULL DEFAULT '#FFD700',
  icon TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.spin_wheel_config TO anon, authenticated;
GRANT ALL ON public.spin_wheel_config TO service_role;
ALTER TABLE public.spin_wheel_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "spin readable" ON public.spin_wheel_config FOR SELECT USING (true);
CREATE POLICY "spin admin manage" ON public.spin_wheel_config FOR ALL USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin')) WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

CREATE TABLE public.spin_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  free_spins_per_day INTEGER NOT NULL DEFAULT 1,
  spin_cost_bac NUMERIC NOT NULL DEFAULT 0,
  extra_spin_cost_bac NUMERIC NOT NULL DEFAULT 50,
  max_spins_per_day INTEGER NOT NULL DEFAULT 5,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT spin_settings_single CHECK (id = 1)
);
GRANT SELECT ON public.spin_settings TO anon, authenticated;
GRANT ALL ON public.spin_settings TO service_role;
ALTER TABLE public.spin_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "spin settings readable" ON public.spin_settings FOR SELECT USING (true);
CREATE POLICY "spin settings admin" ON public.spin_settings FOR ALL USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin')) WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));
INSERT INTO public.spin_settings (id) VALUES (1) ON CONFLICT DO NOTHING;

CREATE TABLE public.spin_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  segment_id UUID REFERENCES public.spin_wheel_config(id) ON DELETE SET NULL,
  reward_type TEXT NOT NULL,
  reward_amount NUMERIC NOT NULL DEFAULT 0,
  spin_cost NUMERIC NOT NULL DEFAULT 0,
  is_free BOOLEAN NOT NULL DEFAULT true,
  spin_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.spin_history TO authenticated;
GRANT ALL ON public.spin_history TO service_role;
ALTER TABLE public.spin_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own spin history" ON public.spin_history FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

-- update trigger
CREATE TRIGGER trg_daily_quests_updated BEFORE UPDATE ON public.daily_quests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_user_quest_progress_updated BEFORE UPDATE ON public.user_quest_progress FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_spin_wheel_config_updated BEFORE UPDATE ON public.spin_wheel_config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Claim quest RPC
CREATE OR REPLACE FUNCTION public.claim_quest_reward(_quest_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  UPDATE public.profiles SET balance_bac = COALESCE(balance_bac,0) + _quest.reward_bac
    WHERE id = _uid RETURNING balance_bac INTO _new_balance;
  UPDATE public.user_quest_progress SET is_claimed = true, is_completed = true, claimed_at = now()
    WHERE id = _progress.id;
  INSERT INTO public.balance_logs(user_id, amount, type, description, balance_after)
    VALUES (_uid, _quest.reward_bac, 'quest_reward', 'Daily quest: '||_quest.title, _new_balance);
  RETURN jsonb_build_object('success', true, 'reward', _quest.reward_bac, 'balance', _new_balance);
END;$$;

-- Spin RPC
CREATE OR REPLACE FUNCTION public.perform_spin()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    SELECT balance_bac INTO _balance FROM public.profiles WHERE id = _uid;
    IF COALESCE(_balance,0) < _cost THEN RAISE EXCEPTION 'Insufficient balance'; END IF;
    UPDATE public.profiles SET balance_bac = balance_bac - _cost WHERE id = _uid RETURNING balance_bac INTO _new_balance;
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
    UPDATE public.profiles SET balance_bac = COALESCE(balance_bac,0) + _chosen.reward_amount
      WHERE id = _uid RETURNING balance_bac INTO _new_balance;
    INSERT INTO public.balance_logs(user_id, amount, type, description, balance_after)
      VALUES (_uid, _chosen.reward_amount, 'spin_reward', 'Spin wheel: '||_chosen.label, _new_balance);
  END IF;

  INSERT INTO public.spin_history(user_id, segment_id, reward_type, reward_amount, spin_cost, is_free)
    VALUES (_uid, _chosen.id, _chosen.reward_type, _chosen.reward_amount, _cost, _is_free);

  -- quest progress for spin
  INSERT INTO public.user_quest_progress(user_id, quest_id, quest_date, progress, is_completed)
    SELECT _uid, q.id, CURRENT_DATE, 1, (1 >= q.target_value)
    FROM public.daily_quests q WHERE q.quest_type = 'spin' AND q.is_active = true
    ON CONFLICT (user_id, quest_id, quest_date) DO UPDATE SET
      progress = public.user_quest_progress.progress + 1,
      is_completed = (public.user_quest_progress.progress + 1) >= (SELECT target_value FROM public.daily_quests WHERE id = public.user_quest_progress.quest_id);

  RETURN jsonb_build_object(
    'success', true,
    'segment_id', _chosen.id,
    'label', _chosen.label,
    'reward_type', _chosen.reward_type,
    'reward_amount', _chosen.reward_amount,
    'is_free', _is_free,
    'cost', _cost
  );
END;$$;

GRANT EXECUTE ON FUNCTION public.claim_quest_reward(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.perform_spin() TO authenticated;

-- Seed default quests
INSERT INTO public.daily_quests (code,title,description,quest_type,target_value,reward_bac,icon,sort_order) VALUES
('daily_login','Daily Login','Log in today','login',1,10,'🎯',1),
('play_1_match','Play 1 Match','Join any tournament match','play_match',1,25,'🎮',2),
('get_5_kills','Get 5 Kills','Achieve 5 kills total today','kills',5,50,'💀',3),
('daily_spin','Spin the Wheel','Use your daily spin','spin',1,15,'🎡',4)
ON CONFLICT (code) DO NOTHING;

-- Seed default spin segments
INSERT INTO public.spin_wheel_config (label,reward_type,reward_amount,weight,color,icon,sort_order) VALUES
('10 BAC','bac',10,30,'#FFD700','💰',1),
('Try Again','nothing',0,25,'#6B7280','😢',2),
('25 BAC','bac',25,20,'#10B981','💎',3),
('5 BAC','bac',5,15,'#3B82F6','🪙',4),
('100 BAC','bac',100,7,'#EF4444','🔥',5),
('50 BAC','bac',50,10,'#A855F7','⭐',6),
('500 BAC JACKPOT','bac',500,1,'#F59E0B','👑',7),
('15 BAC','bac',15,20,'#06B6D4','🎁',8)
ON CONFLICT DO NOTHING;