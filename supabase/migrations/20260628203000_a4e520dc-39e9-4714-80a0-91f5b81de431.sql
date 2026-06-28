ALTER TABLE public.profiles REPLICA IDENTITY FULL;
ALTER TABLE public.balance_logs REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER TABLE public.user_notifications REPLICA IDENTITY FULL;
ALTER TABLE public.deposits REPLICA IDENTITY FULL;
ALTER TABLE public.withdrawals REPLICA IDENTITY FULL;
ALTER TABLE public.matches REPLICA IDENTITY FULL;
ALTER TABLE public.match_participants REPLICA IDENTITY FULL;
ALTER TABLE public.shop_purchases REPLICA IDENTITY FULL;
ALTER TABLE public.spin_history REPLICA IDENTITY FULL;
ALTER TABLE public.daily_login_streaks REPLICA IDENTITY FULL;
ALTER TABLE public.user_quest_progress REPLICA IDENTITY FULL;
ALTER TABLE public.user_theme_purchases REPLICA IDENTITY FULL;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'profiles','balance_logs','notifications','user_notifications',
    'deposits','withdrawals','matches','match_participants',
    'shop_purchases','spin_history','daily_login_streaks',
    'user_quest_progress','user_theme_purchases'
  ] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
       WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename=t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END$$;