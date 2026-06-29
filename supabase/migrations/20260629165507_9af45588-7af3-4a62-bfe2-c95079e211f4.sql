
-- ============ Phase 5: story views & reactions ============
CREATE TABLE IF NOT EXISTS public.social_story_views (
  story_id uuid NOT NULL REFERENCES public.social_stories(id) ON DELETE CASCADE,
  viewer_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (story_id, viewer_id)
);
GRANT SELECT, INSERT, DELETE ON public.social_story_views TO authenticated;
GRANT ALL ON public.social_story_views TO service_role;
ALTER TABLE public.social_story_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "viewers can mark themselves" ON public.social_story_views
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = viewer_id);

-- Story owner can see all viewers; a viewer can see their own row
CREATE POLICY "owner or self read" ON public.social_story_views
  FOR SELECT TO authenticated USING (
    auth.uid() = viewer_id
    OR EXISTS (SELECT 1 FROM public.social_stories s WHERE s.id = story_id AND s.user_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_story_views_story ON public.social_story_views(story_id);

CREATE TABLE IF NOT EXISTS public.social_story_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid NOT NULL REFERENCES public.social_stories(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  emoji text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.social_story_reactions TO authenticated;
GRANT ALL ON public.social_story_reactions TO service_role;
ALTER TABLE public.social_story_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "react as self" ON public.social_story_reactions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete own reaction" ON public.social_story_reactions
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "owner or self read reactions" ON public.social_story_reactions
  FOR SELECT TO authenticated USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM public.social_stories s WHERE s.id = story_id AND s.user_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_story_reactions_story ON public.social_story_reactions(story_id);

-- ============ Phase 6: notifications ============
ALTER TABLE public.user_notifications
  ADD COLUMN IF NOT EXISTS actor_id uuid,
  ADD COLUMN IF NOT EXISTS entity_type text,
  ADD COLUMN IF NOT EXISTS entity_id text,
  ADD COLUMN IF NOT EXISTS link text;

CREATE INDEX IF NOT EXISTS idx_user_notifications_user_unread
  ON public.user_notifications(user_id, read_at);

-- Function: like creates a notification for the post author
CREATE OR REPLACE FUNCTION public.notify_on_social_like()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_author uuid;
  v_actor_name text;
BEGIN
  SELECT user_id INTO v_author FROM public.social_posts WHERE id = NEW.post_id;
  IF v_author IS NULL OR v_author = NEW.user_id THEN RETURN NEW; END IF;
  SELECT COALESCE(username, display_name, 'Someone') INTO v_actor_name FROM public.profiles WHERE id = NEW.user_id;
  INSERT INTO public.user_notifications (user_id, title, message, type, actor_id, entity_type, entity_id, link)
  VALUES (v_author, 'New like', COALESCE(v_actor_name,'Someone') || ' liked your post', 'like',
          NEW.user_id, 'post', NEW.post_id::text, '/post/' || NEW.post_id::text);
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_social_like ON public.social_likes;
CREATE TRIGGER trg_notify_social_like AFTER INSERT ON public.social_likes
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_social_like();

-- Function: comment creates a notification for the post author
CREATE OR REPLACE FUNCTION public.notify_on_social_comment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_author uuid;
  v_actor_name text;
BEGIN
  SELECT user_id INTO v_author FROM public.social_posts WHERE id = NEW.post_id;
  IF v_author IS NULL OR v_author = NEW.user_id THEN RETURN NEW; END IF;
  SELECT COALESCE(username, display_name, 'Someone') INTO v_actor_name FROM public.profiles WHERE id = NEW.user_id;
  INSERT INTO public.user_notifications (user_id, title, message, type, actor_id, entity_type, entity_id, link)
  VALUES (v_author, 'New comment', COALESCE(v_actor_name,'Someone') || ' commented: ' || left(NEW.body, 80), 'comment',
          NEW.user_id, 'post', NEW.post_id::text, '/post/' || NEW.post_id::text);
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_social_comment ON public.social_comments;
CREATE TRIGGER trg_notify_social_comment AFTER INSERT ON public.social_comments
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_social_comment();

-- Function: follow creates a notification for the followed user
CREATE OR REPLACE FUNCTION public.notify_on_follow()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_actor_name text;
  v_actor_handle text;
BEGIN
  IF NEW.follower_id = NEW.following_id THEN RETURN NEW; END IF;
  SELECT username, COALESCE(username, display_name, 'Someone')
    INTO v_actor_handle, v_actor_name
    FROM public.profiles WHERE id = NEW.follower_id;
  INSERT INTO public.user_notifications (user_id, title, message, type, actor_id, entity_type, entity_id, link)
  VALUES (NEW.following_id, 'New follower', COALESCE(v_actor_name,'Someone') || ' started following you', 'follow',
          NEW.follower_id, 'user', NEW.follower_id::text,
          '/u/' || COALESCE(v_actor_handle, NEW.follower_id::text));
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_on_follow ON public.user_follows;
CREATE TRIGGER trg_notify_on_follow AFTER INSERT ON public.user_follows
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_follow();

-- Realtime for stories already enabled likely; add notifications & story views
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.user_notifications;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.social_story_views;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.social_story_reactions;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
