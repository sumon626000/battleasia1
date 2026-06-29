
-- Phase B: Denormalized counts + safer realtime

-- 1) Triggers to keep likes_count / comments_count accurate on social_posts
CREATE OR REPLACE FUNCTION public.bump_post_likes()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.social_posts SET likes_count = COALESCE(likes_count,0) + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.social_posts SET likes_count = GREATEST(COALESCE(likes_count,0) - 1, 0) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_bump_post_likes_ins ON public.social_likes;
DROP TRIGGER IF EXISTS trg_bump_post_likes_del ON public.social_likes;
CREATE TRIGGER trg_bump_post_likes_ins AFTER INSERT ON public.social_likes
  FOR EACH ROW EXECUTE FUNCTION public.bump_post_likes();
CREATE TRIGGER trg_bump_post_likes_del AFTER DELETE ON public.social_likes
  FOR EACH ROW EXECUTE FUNCTION public.bump_post_likes();

CREATE OR REPLACE FUNCTION public.bump_post_comments()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.social_posts SET comments_count = COALESCE(comments_count,0) + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.social_posts SET comments_count = GREATEST(COALESCE(comments_count,0) - 1, 0) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_bump_post_comments_ins ON public.social_comments;
DROP TRIGGER IF EXISTS trg_bump_post_comments_del ON public.social_comments;
CREATE TRIGGER trg_bump_post_comments_ins AFTER INSERT ON public.social_comments
  FOR EACH ROW EXECUTE FUNCTION public.bump_post_comments();
CREATE TRIGGER trg_bump_post_comments_del AFTER DELETE ON public.social_comments
  FOR EACH ROW EXECUTE FUNCTION public.bump_post_comments();

-- 2) Backfill counts from current data
UPDATE public.social_posts p SET
  likes_count = (SELECT COUNT(*) FROM public.social_likes WHERE post_id = p.id),
  comments_count = (SELECT COUNT(*) FROM public.social_comments WHERE post_id = p.id);

-- 3) Remove social_posts from realtime publication (broadcast to every user is expensive).
-- Counts will refresh on navigation / refetch; per-post detail page can re-fetch on focus.
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'social_posts'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.social_posts';
  END IF;
END $$;
