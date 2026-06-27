
-- Seed feed categories
INSERT INTO public.feed_categories(name, slug) VALUES
  ('News','news'),('Updates','updates'),('Guides','guides'),('Events','events'),('Community','community')
ON CONFLICT DO NOTHING;

-- Toggle like RPC
CREATE OR REPLACE FUNCTION public.toggle_feed_like(p_post_id bigint)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_user uuid := auth.uid(); v_exists boolean;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT EXISTS(SELECT 1 FROM public.feed_likes WHERE post_id=p_post_id AND user_id=v_user) INTO v_exists;
  IF v_exists THEN
    DELETE FROM public.feed_likes WHERE post_id=p_post_id AND user_id=v_user;
    UPDATE public.feed_posts SET likes_count = GREATEST(likes_count-1,0) WHERE id=p_post_id;
    RETURN false;
  ELSE
    INSERT INTO public.feed_likes(post_id,user_id) VALUES(p_post_id,v_user);
    UPDATE public.feed_posts SET likes_count = likes_count+1 WHERE id=p_post_id;
    RETURN true;
  END IF;
END;$$;

-- Add comment RPC
CREATE OR REPLACE FUNCTION public.add_feed_comment(p_post_id bigint, p_text text, p_parent bigint DEFAULT NULL)
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_user uuid := auth.uid(); v_id bigint;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF length(coalesce(p_text,''))<1 THEN RAISE EXCEPTION 'Empty comment'; END IF;
  IF length(p_text)>1000 THEN RAISE EXCEPTION 'Comment too long'; END IF;
  IF (SELECT count(*) FROM public.feed_comments WHERE user_id=v_user AND created_at>now()-interval '1 minute')>=10 THEN
    RAISE EXCEPTION 'Too many comments. Slow down.';
  END IF;
  INSERT INTO public.feed_comments(post_id,user_id,comment_text,parent_id)
  VALUES(p_post_id,v_user,p_text,p_parent) RETURNING id INTO v_id;
  UPDATE public.feed_posts SET comments_count = comments_count+1 WHERE id=p_post_id;
  RETURN v_id;
END;$$;

-- Increment view (best effort, no auth required)
CREATE OR REPLACE FUNCTION public.increment_feed_view(p_post_id bigint)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
  UPDATE public.feed_posts SET views_count = views_count+1 WHERE id=p_post_id AND status='Published';
$$;

-- Mark notifications read
CREATE OR REPLACE FUNCTION public.mark_notifications_read(p_ids bigint[] DEFAULT NULL)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_user uuid := auth.uid(); v_count integer;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_ids IS NULL THEN
    UPDATE public.user_notifications SET read_at=now() WHERE user_id=v_user AND read_at IS NULL;
  ELSE
    UPDATE public.user_notifications SET read_at=now() WHERE user_id=v_user AND id = ANY(p_ids) AND read_at IS NULL;
  END IF;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;$$;

-- Archive notification
CREATE OR REPLACE FUNCTION public.archive_notification(p_id bigint)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_user uuid := auth.uid();
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  UPDATE public.user_notifications SET archived_at=now() WHERE user_id=v_user AND id=p_id;
END;$$;

-- Seed a few demo posts (idempotent by title)
INSERT INTO public.feed_posts(category_id, title, description_html, status, published_at, premium_only)
SELECT c.id, t.title, t.body, 'Published'::feed_status, now() - (t.days || ' days')::interval, t.prem
FROM (VALUES
  ('news','Season 12 Arena Opens', '<p>The new <strong>Season 12</strong> arena is now live. Compete for the Apex crown.</p>', 1, false),
  ('updates','Wallet v2 Released', '<p>New deposit channels added: <em>Binance Pay</em>, USDT BEP20.</p>', 2, false),
  ('guides','Erangel Hot Drops 101', '<p>Top loot zones, rotation paths, and zone prediction tips.</p>', 5, false),
  ('events','Weekend Kill Race', '<p>Top 10 killers split <strong>50,000 BAC</strong>. Premium tier rewards included.</p>', 0, true),
  ('community','Clan Recruitment Threads Open', '<p>Find squads, post your tag, recruit operatives.</p>', 7, false)
) AS t(slug,title,body,days,prem)
JOIN public.feed_categories c ON c.slug = t.slug
WHERE NOT EXISTS(SELECT 1 FROM public.feed_posts WHERE title=t.title);
