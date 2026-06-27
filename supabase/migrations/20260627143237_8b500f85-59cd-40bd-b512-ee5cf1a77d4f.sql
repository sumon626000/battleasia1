
-- Rate limit primitive
CREATE TABLE IF NOT EXISTS public.rate_limit_hits (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  action_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_rl_user_action_time ON public.rate_limit_hits(user_id, action_key, created_at DESC);
GRANT SELECT, INSERT ON public.rate_limit_hits TO authenticated;
GRANT ALL ON public.rate_limit_hits TO service_role;
ALTER TABLE public.rate_limit_hits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own rate hits" ON public.rate_limit_hits;
CREATE POLICY "own rate hits" ON public.rate_limit_hits FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.check_rate_limit(_action TEXT, _max INT, _window_secs INT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid UUID := auth.uid();
  _count INT;
BEGIN
  IF _uid IS NULL THEN RETURN; END IF;
  SELECT count(*) INTO _count
    FROM public.rate_limit_hits
    WHERE user_id = _uid
      AND action_key = _action
      AND created_at > now() - make_interval(secs => _window_secs);
  IF _count >= _max THEN
    RAISE EXCEPTION 'Rate limit exceeded for %. Try again in a moment.', _action
      USING ERRCODE = 'check_violation';
  END IF;
  INSERT INTO public.rate_limit_hits(user_id, action_key) VALUES (_uid, _action);
  -- best-effort cleanup
  DELETE FROM public.rate_limit_hits
    WHERE created_at < now() - INTERVAL '1 day';
END;
$$;

-- Trigger helpers per action
CREATE OR REPLACE FUNCTION public.rl_match_join() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN PERFORM public.check_rate_limit('match_join', 10, 60); RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION public.rl_shop_purchase() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN PERFORM public.check_rate_limit('shop_purchase', 5, 60); RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION public.rl_premium_buy() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN PERFORM public.check_rate_limit('premium_buy', 3, 60); RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION public.rl_support_ticket() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN PERFORM public.check_rate_limit('support_ticket', 3, 300); RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION public.rl_support_message() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN PERFORM public.check_rate_limit('support_message', 20, 60); RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION public.rl_feed_comment() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN PERFORM public.check_rate_limit('feed_comment', 10, 60); RETURN NEW; END; $$;

-- Wire triggers (idempotent: drop then create)
DROP TRIGGER IF EXISTS trg_rl_match_join ON public.match_participants;
CREATE TRIGGER trg_rl_match_join BEFORE INSERT ON public.match_participants
  FOR EACH ROW EXECUTE FUNCTION public.rl_match_join();

DROP TRIGGER IF EXISTS trg_rl_shop_purchase ON public.shop_purchases;
CREATE TRIGGER trg_rl_shop_purchase BEFORE INSERT ON public.shop_purchases
  FOR EACH ROW EXECUTE FUNCTION public.rl_shop_purchase();

DROP TRIGGER IF EXISTS trg_rl_premium_buy ON public.premium_histories;
CREATE TRIGGER trg_rl_premium_buy BEFORE INSERT ON public.premium_histories
  FOR EACH ROW EXECUTE FUNCTION public.rl_premium_buy();

DROP TRIGGER IF EXISTS trg_rl_support_ticket ON public.support_tickets;
CREATE TRIGGER trg_rl_support_ticket BEFORE INSERT ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.rl_support_ticket();

DROP TRIGGER IF EXISTS trg_rl_support_message ON public.support_messages;
CREATE TRIGGER trg_rl_support_message BEFORE INSERT ON public.support_messages
  FOR EACH ROW EXECUTE FUNCTION public.rl_support_message();

DROP TRIGGER IF EXISTS trg_rl_feed_comment ON public.feed_comments;
CREATE TRIGGER trg_rl_feed_comment BEFORE INSERT ON public.feed_comments
  FOR EACH ROW EXECUTE FUNCTION public.rl_feed_comment();
