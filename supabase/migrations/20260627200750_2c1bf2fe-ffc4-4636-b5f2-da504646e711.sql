
-- Notify followed user on new follow
CREATE OR REPLACE FUNCTION public.notify_on_follow()
RETURNS TRIGGER AS $$
DECLARE
  v_name TEXT;
BEGIN
  IF NEW.follower_id = NEW.following_id THEN RETURN NEW; END IF;
  SELECT COALESCE(in_game_username, username, 'Someone') INTO v_name
  FROM public.profiles WHERE id = NEW.follower_id;
  INSERT INTO public.user_notifications (user_id, title, message, type)
  VALUES (NEW.following_id, 'New follower', COALESCE(v_name,'Someone') || ' started following you', 'follow');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_notify_on_follow ON public.user_follows;
CREATE TRIGGER trg_notify_on_follow
AFTER INSERT ON public.user_follows
FOR EACH ROW EXECUTE FUNCTION public.notify_on_follow();

-- Notify recipient on new direct message
CREATE OR REPLACE FUNCTION public.notify_on_dm()
RETURNS TRIGGER AS $$
DECLARE
  v_recipient UUID;
  v_user_a UUID;
  v_user_b UUID;
  v_name TEXT;
  v_preview TEXT;
BEGIN
  SELECT user_a, user_b INTO v_user_a, v_user_b
  FROM public.direct_threads WHERE id = NEW.thread_id;
  v_recipient := CASE WHEN NEW.sender_id = v_user_a THEN v_user_b ELSE v_user_a END;
  IF v_recipient IS NULL OR v_recipient = NEW.sender_id THEN RETURN NEW; END IF;

  SELECT COALESCE(in_game_username, username, 'Someone') INTO v_name
  FROM public.profiles WHERE id = NEW.sender_id;

  v_preview := COALESCE(LEFT(NEW.body, 80), '');
  INSERT INTO public.user_notifications (user_id, title, message, type)
  VALUES (v_recipient, 'New message from ' || COALESCE(v_name,'Someone'), v_preview, 'dm');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_notify_on_dm ON public.direct_messages;
CREATE TRIGGER trg_notify_on_dm
AFTER INSERT ON public.direct_messages
FOR EACH ROW EXECUTE FUNCTION public.notify_on_dm();
