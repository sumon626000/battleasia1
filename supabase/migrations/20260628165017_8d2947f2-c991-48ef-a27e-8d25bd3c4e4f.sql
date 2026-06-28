CREATE OR REPLACE FUNCTION public.sync_daily_quest_progress()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid UUID := auth.uid();
  _q RECORD;
  _val INTEGER;
BEGIN
  IF _uid IS NULL THEN RETURN; END IF;
  FOR _q IN SELECT * FROM public.daily_quests WHERE is_active = true LOOP
    _val := 0;
    IF _q.quest_type = 'login' THEN
      _val := 1;
    ELSIF _q.quest_type = 'play_match' THEN
      SELECT COUNT(*) INTO _val FROM public.match_participants
        WHERE user_id = _uid AND created_at::date = CURRENT_DATE;
    ELSIF _q.quest_type = 'win_match' THEN
      SELECT COUNT(*) INTO _val FROM public.match_participants
        WHERE user_id = _uid AND rank_position = 1 AND created_at::date = CURRENT_DATE;
    ELSIF _q.quest_type = 'kills' THEN
      SELECT COALESCE(SUM(kills),0) INTO _val FROM public.match_participants
        WHERE user_id = _uid AND created_at::date = CURRENT_DATE;
    ELSIF _q.quest_type = 'deposit' THEN
      SELECT COUNT(*) INTO _val FROM public.deposits
        WHERE user_id = _uid AND created_at::date = CURRENT_DATE AND status = 'approved';
    ELSIF _q.quest_type = 'feed_post' THEN
      SELECT COUNT(*) INTO _val FROM public.feed_posts
        WHERE user_id = _uid AND created_at::date = CURRENT_DATE;
    ELSIF _q.quest_type = 'referral' THEN
      SELECT COUNT(*) INTO _val FROM public.referral_transactions
        WHERE referrer_id = _uid AND created_at::date = CURRENT_DATE;
    ELSIF _q.quest_type = 'spin' THEN
      SELECT COUNT(*) INTO _val FROM public.spin_history
        WHERE user_id = _uid AND spin_date = CURRENT_DATE;
    END IF;

    INSERT INTO public.user_quest_progress(user_id, quest_id, quest_date, progress, is_completed)
      VALUES (_uid, _q.id, CURRENT_DATE, _val, _val >= _q.target_value)
    ON CONFLICT (user_id, quest_id, quest_date) DO UPDATE
      SET progress = GREATEST(public.user_quest_progress.progress, EXCLUDED.progress),
          is_completed = (GREATEST(public.user_quest_progress.progress, EXCLUDED.progress) >= _q.target_value);
  END LOOP;
END;$$;
GRANT EXECUTE ON FUNCTION public.sync_daily_quest_progress() TO authenticated;