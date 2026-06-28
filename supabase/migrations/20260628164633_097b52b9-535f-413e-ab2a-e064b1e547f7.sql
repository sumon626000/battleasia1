
-- Streak table
CREATE TABLE public.daily_login_streaks (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_claim_date DATE,
  total_claims INTEGER NOT NULL DEFAULT 0,
  total_bac_earned NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.daily_login_streaks TO authenticated;
GRANT ALL ON public.daily_login_streaks TO service_role;

ALTER TABLE public.daily_login_streaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own streak"
  ON public.daily_login_streaks FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Claim RPC
CREATE OR REPLACE FUNCTION public.claim_daily_login()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_today DATE := (now() AT TIME ZONE 'UTC')::DATE;
  v_row public.daily_login_streaks%ROWTYPE;
  v_new_streak INTEGER;
  v_day_in_cycle INTEGER;
  v_reward NUMERIC;
  v_rewards NUMERIC[] := ARRAY[10, 20, 30, 50, 75, 100, 200];
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_row FROM public.daily_login_streaks WHERE user_id = v_uid FOR UPDATE;

  IF FOUND AND v_row.last_claim_date = v_today THEN
    RETURN jsonb_build_object(
      'success', false,
      'already_claimed', true,
      'current_streak', v_row.current_streak,
      'next_claim_in_hours',
        EXTRACT(EPOCH FROM ((v_today + 1)::timestamp - (now() AT TIME ZONE 'UTC'))) / 3600
    );
  END IF;

  -- Compute new streak
  IF NOT FOUND THEN
    v_new_streak := 1;
  ELSIF v_row.last_claim_date = v_today - 1 THEN
    v_new_streak := v_row.current_streak + 1;
  ELSE
    v_new_streak := 1; -- reset
  END IF;

  v_day_in_cycle := ((v_new_streak - 1) % 7) + 1;
  v_reward := v_rewards[v_day_in_cycle];

  -- Upsert streak
  INSERT INTO public.daily_login_streaks
    (user_id, current_streak, longest_streak, last_claim_date, total_claims, total_bac_earned, updated_at)
  VALUES
    (v_uid, v_new_streak, v_new_streak, v_today, 1, v_reward, now())
  ON CONFLICT (user_id) DO UPDATE SET
    current_streak    = v_new_streak,
    longest_streak    = GREATEST(public.daily_login_streaks.longest_streak, v_new_streak),
    last_claim_date   = v_today,
    total_claims      = public.daily_login_streaks.total_claims + 1,
    total_bac_earned  = public.daily_login_streaks.total_bac_earned + v_reward,
    updated_at        = now();

  -- Credit balance
  UPDATE public.profiles
    SET bac_coin_balance = COALESCE(bac_coin_balance, 0) + v_reward
    WHERE id = v_uid;

  -- Log
  INSERT INTO public.balance_logs (user_id, amount, type, description, created_at)
  VALUES (v_uid, v_reward, 'daily_login_bonus',
          'Daily login bonus - Day ' || v_day_in_cycle || ' (streak: ' || v_new_streak || ')',
          now());

  RETURN jsonb_build_object(
    'success', true,
    'reward', v_reward,
    'day_in_cycle', v_day_in_cycle,
    'current_streak', v_new_streak,
    'longest_streak', GREATEST(COALESCE(v_row.longest_streak,0), v_new_streak)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_daily_login() TO authenticated;
