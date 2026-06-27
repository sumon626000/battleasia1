
-- ============== SOCIAL POSTS ==============
CREATE TABLE IF NOT EXISTS public.social_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  caption TEXT,
  media_url TEXT,
  media_type TEXT NOT NULL DEFAULT 'none' CHECK (media_type IN ('none','image','video','gallery')),
  visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public','followers','private')),
  likes_count INT NOT NULL DEFAULT 0,
  comments_count INT NOT NULL DEFAULT 0,
  is_edited BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.social_posts TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.social_posts TO authenticated;
GRANT ALL ON public.social_posts TO service_role;
ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "social_posts read public" ON public.social_posts FOR SELECT USING (visibility = 'public' OR user_id = auth.uid());
CREATE POLICY "social_posts owner insert" ON public.social_posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "social_posts owner update" ON public.social_posts FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "social_posts owner delete" ON public.social_posts FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.is_admin());
CREATE INDEX IF NOT EXISTS social_posts_user_created_idx ON public.social_posts(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS social_posts_created_idx ON public.social_posts(created_at DESC);

-- ============== POST MEDIA (gallery) ==============
CREATE TABLE IF NOT EXISTS public.social_post_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.social_posts(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('image','video')),
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.social_post_media TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.social_post_media TO authenticated;
GRANT ALL ON public.social_post_media TO service_role;
ALTER TABLE public.social_post_media ENABLE ROW LEVEL SECURITY;
CREATE POLICY "social_post_media read" ON public.social_post_media FOR SELECT USING (true);
CREATE POLICY "social_post_media owner write" ON public.social_post_media FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.social_posts p WHERE p.id = post_id AND p.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.social_posts p WHERE p.id = post_id AND p.user_id = auth.uid()));
CREATE INDEX IF NOT EXISTS social_post_media_post_idx ON public.social_post_media(post_id, position);

-- ============== LIKES ==============
CREATE TABLE IF NOT EXISTS public.social_likes (
  post_id UUID NOT NULL REFERENCES public.social_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);
GRANT SELECT ON public.social_likes TO anon, authenticated;
GRANT INSERT, DELETE ON public.social_likes TO authenticated;
GRANT ALL ON public.social_likes TO service_role;
ALTER TABLE public.social_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "social_likes read" ON public.social_likes FOR SELECT USING (true);
CREATE POLICY "social_likes self insert" ON public.social_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "social_likes self delete" ON public.social_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============== COMMENTS ==============
CREATE TABLE IF NOT EXISTS public.social_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.social_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (length(body) BETWEEN 1 AND 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.social_comments TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.social_comments TO authenticated;
GRANT ALL ON public.social_comments TO service_role;
ALTER TABLE public.social_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "social_comments read" ON public.social_comments FOR SELECT USING (true);
CREATE POLICY "social_comments self insert" ON public.social_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "social_comments self delete" ON public.social_comments FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.is_admin());
CREATE INDEX IF NOT EXISTS social_comments_post_idx ON public.social_comments(post_id, created_at DESC);

-- Counters trigger
CREATE OR REPLACE FUNCTION public.social_counters() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF TG_TABLE_NAME = 'social_likes' THEN
    IF TG_OP = 'INSERT' THEN UPDATE public.social_posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id; END IF;
    IF TG_OP = 'DELETE' THEN UPDATE public.social_posts SET likes_count = GREATEST(0, likes_count - 1) WHERE id = OLD.post_id; END IF;
  ELSIF TG_TABLE_NAME = 'social_comments' THEN
    IF TG_OP = 'INSERT' THEN UPDATE public.social_posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id; END IF;
    IF TG_OP = 'DELETE' THEN UPDATE public.social_posts SET comments_count = GREATEST(0, comments_count - 1) WHERE id = OLD.post_id; END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END; $$;
DROP TRIGGER IF EXISTS social_likes_count ON public.social_likes;
CREATE TRIGGER social_likes_count AFTER INSERT OR DELETE ON public.social_likes
  FOR EACH ROW EXECUTE FUNCTION public.social_counters();
DROP TRIGGER IF EXISTS social_comments_count ON public.social_comments;
CREATE TRIGGER social_comments_count AFTER INSERT OR DELETE ON public.social_comments
  FOR EACH ROW EXECUTE FUNCTION public.social_counters();

-- ============== FOLLOWS ==============
CREATE TABLE IF NOT EXISTS public.user_follows (
  follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, following_id),
  CHECK (follower_id <> following_id)
);
GRANT SELECT ON public.user_follows TO anon, authenticated;
GRANT INSERT, DELETE ON public.user_follows TO authenticated;
GRANT ALL ON public.user_follows TO service_role;
ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "follows read" ON public.user_follows FOR SELECT USING (true);
CREATE POLICY "follows self insert" ON public.user_follows FOR INSERT TO authenticated WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "follows self delete" ON public.user_follows FOR DELETE TO authenticated USING (auth.uid() = follower_id);
CREATE INDEX IF NOT EXISTS follows_following_idx ON public.user_follows(following_id);

-- ============== BLOCKS ==============
CREATE TABLE IF NOT EXISTS public.user_blocks (
  blocker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);
GRANT SELECT, INSERT, DELETE ON public.user_blocks TO authenticated;
GRANT ALL ON public.user_blocks TO service_role;
ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "blocks owner read" ON public.user_blocks FOR SELECT TO authenticated USING (auth.uid() = blocker_id);
CREATE POLICY "blocks owner insert" ON public.user_blocks FOR INSERT TO authenticated WITH CHECK (auth.uid() = blocker_id);
CREATE POLICY "blocks owner delete" ON public.user_blocks FOR DELETE TO authenticated USING (auth.uid() = blocker_id);

CREATE OR REPLACE FUNCTION public.is_blocked_between(a UUID, b UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_blocks
    WHERE (blocker_id = a AND blocked_id = b) OR (blocker_id = b AND blocked_id = a)
  );
$$;

-- ============== DIRECT MESSAGES ==============
CREATE TABLE IF NOT EXISTS public.direct_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_b UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (user_a < user_b),
  UNIQUE (user_a, user_b)
);
GRANT SELECT, INSERT, UPDATE ON public.direct_threads TO authenticated;
GRANT ALL ON public.direct_threads TO service_role;
ALTER TABLE public.direct_threads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "threads participant read" ON public.direct_threads FOR SELECT TO authenticated
  USING (auth.uid() IN (user_a, user_b));
CREATE POLICY "threads participant insert" ON public.direct_threads FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IN (user_a, user_b) AND NOT public.is_blocked_between(user_a, user_b));
CREATE POLICY "threads participant update" ON public.direct_threads FOR UPDATE TO authenticated
  USING (auth.uid() IN (user_a, user_b));

CREATE TABLE IF NOT EXISTS public.direct_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES public.direct_threads(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT,
  image_url TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.direct_messages TO authenticated;
GRANT ALL ON public.direct_messages TO service_role;
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dm participant read" ON public.direct_messages FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.direct_threads t WHERE t.id = thread_id AND auth.uid() IN (t.user_a, t.user_b)));
CREATE POLICY "dm sender insert" ON public.direct_messages FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM public.direct_threads t
      WHERE t.id = thread_id
        AND auth.uid() IN (t.user_a, t.user_b)
        AND NOT public.is_blocked_between(t.user_a, t.user_b)
    )
  );
CREATE POLICY "dm recipient update" ON public.direct_messages FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.direct_threads t WHERE t.id = thread_id AND auth.uid() IN (t.user_a, t.user_b) AND auth.uid() <> sender_id));
CREATE INDEX IF NOT EXISTS dm_thread_idx ON public.direct_messages(thread_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.bump_thread_last_message()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.direct_threads SET last_message_at = NEW.created_at WHERE id = NEW.thread_id;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS dm_bump_thread ON public.direct_messages;
CREATE TRIGGER dm_bump_thread AFTER INSERT ON public.direct_messages
  FOR EACH ROW EXECUTE FUNCTION public.bump_thread_last_message();

CREATE OR REPLACE FUNCTION public.get_or_create_thread(other_user UUID)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE me UUID := auth.uid(); a UUID; b UUID; t UUID;
BEGIN
  IF me IS NULL OR other_user IS NULL OR me = other_user THEN RAISE EXCEPTION 'invalid users'; END IF;
  IF public.is_blocked_between(me, other_user) THEN RAISE EXCEPTION 'blocked'; END IF;
  IF me < other_user THEN a := me; b := other_user; ELSE a := other_user; b := me; END IF;
  SELECT id INTO t FROM public.direct_threads WHERE user_a = a AND user_b = b;
  IF t IS NULL THEN INSERT INTO public.direct_threads(user_a, user_b) VALUES (a, b) RETURNING id INTO t; END IF;
  RETURN t;
END; $$;
GRANT EXECUTE ON FUNCTION public.get_or_create_thread(UUID) TO authenticated;

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.social_posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.social_likes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.social_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_follows;
ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_messages;
