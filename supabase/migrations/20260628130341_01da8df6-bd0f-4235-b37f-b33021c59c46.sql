
ALTER TABLE public.social_posts ADD COLUMN IF NOT EXISTS views_count INT NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.increment_social_post_view(p_post_id UUID)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v INT;
BEGIN
  UPDATE public.social_posts
    SET views_count = views_count + 1
    WHERE id = p_post_id
    RETURNING views_count INTO v;
  RETURN COALESCE(v, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_social_post_view(UUID) TO anon, authenticated;
