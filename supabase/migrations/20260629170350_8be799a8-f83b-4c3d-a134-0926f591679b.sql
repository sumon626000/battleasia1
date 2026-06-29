
CREATE INDEX IF NOT EXISTS social_likes_post_idx ON public.social_likes(post_id);
CREATE INDEX IF NOT EXISTS social_likes_user_post_idx ON public.social_likes(user_id, post_id);
CREATE INDEX IF NOT EXISTS social_comments_post_created_idx ON public.social_comments(post_id, created_at DESC);
CREATE INDEX IF NOT EXISTS user_follows_follower_idx ON public.user_follows(follower_id);
CREATE INDEX IF NOT EXISTS social_posts_visibility_created_idx ON public.social_posts(visibility, created_at DESC);
CREATE INDEX IF NOT EXISTS social_stories_expires_idx ON public.social_stories(expires_at DESC);

DELETE FROM public.social_story_views a
USING public.social_story_views b
WHERE a.ctid < b.ctid AND a.story_id = b.story_id AND a.viewer_id = b.viewer_id;

ALTER TABLE public.social_story_views DROP CONSTRAINT IF EXISTS social_story_views_unique;
ALTER TABLE public.social_story_views ADD CONSTRAINT social_story_views_unique UNIQUE (story_id, viewer_id);

CREATE TABLE IF NOT EXISTS public.social_hashtags (
  id BIGSERIAL PRIMARY KEY,
  tag TEXT NOT NULL UNIQUE,
  posts_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.social_hashtags TO anon, authenticated;
GRANT ALL ON public.social_hashtags TO service_role;
ALTER TABLE public.social_hashtags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "hashtags public read" ON public.social_hashtags;
CREATE POLICY "hashtags public read" ON public.social_hashtags FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS public.social_post_hashtags (
  post_id UUID NOT NULL REFERENCES public.social_posts(id) ON DELETE CASCADE,
  hashtag_id BIGINT NOT NULL REFERENCES public.social_hashtags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, hashtag_id)
);
GRANT SELECT ON public.social_post_hashtags TO anon, authenticated;
GRANT ALL ON public.social_post_hashtags TO service_role;
ALTER TABLE public.social_post_hashtags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "post hashtags public read" ON public.social_post_hashtags;
CREATE POLICY "post hashtags public read" ON public.social_post_hashtags FOR SELECT USING (true);
CREATE INDEX IF NOT EXISTS sph_hashtag_idx ON public.social_post_hashtags(hashtag_id);
CREATE INDEX IF NOT EXISTS sph_post_idx ON public.social_post_hashtags(post_id);

CREATE OR REPLACE FUNCTION public.sync_post_hashtags()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE m text; tag_id bigint;
BEGIN
  IF TG_OP IN ('UPDATE','DELETE') THEN
    DELETE FROM public.social_post_hashtags WHERE post_id = OLD.id;
  END IF;
  IF TG_OP IN ('INSERT','UPDATE') AND NEW.caption IS NOT NULL THEN
    FOR m IN
      SELECT DISTINCT lower(t[1])
      FROM regexp_matches(NEW.caption, '#([[:alnum:]_]{1,50})', 'g') AS t
    LOOP
      INSERT INTO public.social_hashtags(tag) VALUES (m)
        ON CONFLICT (tag) DO UPDATE SET tag = EXCLUDED.tag
        RETURNING id INTO tag_id;
      INSERT INTO public.social_post_hashtags(post_id, hashtag_id)
        VALUES (NEW.id, tag_id) ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;
  RETURN COALESCE(NEW, OLD);
END $fn$;

DROP TRIGGER IF EXISTS trg_sync_post_hashtags ON public.social_posts;
CREATE TRIGGER trg_sync_post_hashtags
AFTER INSERT OR UPDATE OF caption OR DELETE ON public.social_posts
FOR EACH ROW EXECUTE FUNCTION public.sync_post_hashtags();

INSERT INTO public.social_hashtags(tag)
SELECT DISTINCT lower(t[1])
FROM public.social_posts p, regexp_matches(coalesce(p.caption,''), '#([[:alnum:]_]{1,50})', 'g') t
ON CONFLICT (tag) DO NOTHING;

INSERT INTO public.social_post_hashtags(post_id, hashtag_id)
SELECT p.id, h.id
FROM public.social_posts p
CROSS JOIN LATERAL regexp_matches(coalesce(p.caption,''), '#([[:alnum:]_]{1,50})', 'g') AS t
JOIN public.social_hashtags h ON h.tag = lower(t[1])
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.bump_hashtag_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $fn$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.social_hashtags SET posts_count = posts_count + 1 WHERE id = NEW.hashtag_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.social_hashtags SET posts_count = GREATEST(0, posts_count - 1) WHERE id = OLD.hashtag_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END $fn$;

DROP TRIGGER IF EXISTS trg_bump_hashtag_count ON public.social_post_hashtags;
CREATE TRIGGER trg_bump_hashtag_count
AFTER INSERT OR DELETE ON public.social_post_hashtags
FOR EACH ROW EXECUTE FUNCTION public.bump_hashtag_count();

UPDATE public.social_hashtags h
SET posts_count = sub.c
FROM (SELECT hashtag_id, count(*) c FROM public.social_post_hashtags GROUP BY hashtag_id) sub
WHERE h.id = sub.hashtag_id;
