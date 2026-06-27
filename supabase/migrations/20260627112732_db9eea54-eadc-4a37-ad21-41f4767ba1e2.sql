
-- Admin: Feed category management
CREATE OR REPLACE FUNCTION public.admin_save_feed_category(
  p_id uuid,
  p_name text,
  p_slug text,
  p_sort_order int DEFAULT 0,
  p_is_active boolean DEFAULT true
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid; v_admin uuid := auth.uid();
BEGIN
  IF NOT public.has_role(v_admin, 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF p_id IS NULL THEN
    INSERT INTO feed_categories (name, slug, sort_order, is_active)
    VALUES (p_name, p_slug, p_sort_order, p_is_active) RETURNING id INTO v_id;
  ELSE
    UPDATE feed_categories SET name=p_name, slug=p_slug, sort_order=p_sort_order, is_active=p_is_active, updated_at=now()
    WHERE id=p_id RETURNING id INTO v_id;
  END IF;
  INSERT INTO admin_action_logs (admin_id, action, target_type, target_id, metadata)
  VALUES (v_admin, CASE WHEN p_id IS NULL THEN 'feed_category_create' ELSE 'feed_category_update' END, 'feed_category', v_id, jsonb_build_object('name', p_name));
  RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public.admin_delete_feed_category(p_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_admin uuid := auth.uid();
BEGIN
  IF NOT public.has_role(v_admin, 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  DELETE FROM feed_categories WHERE id = p_id;
  INSERT INTO admin_action_logs (admin_id, action, target_type, target_id)
  VALUES (v_admin, 'feed_category_delete', 'feed_category', p_id);
END $$;

-- Admin: Feed post management
CREATE OR REPLACE FUNCTION public.admin_save_feed_post(
  p_id uuid,
  p_category_id uuid,
  p_title text,
  p_slug text,
  p_excerpt text,
  p_body text,
  p_cover_url text,
  p_is_published boolean,
  p_is_pinned boolean,
  p_published_at timestamptz
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid; v_admin uuid := auth.uid();
BEGIN
  IF NOT public.has_role(v_admin, 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF p_id IS NULL THEN
    INSERT INTO feed_posts (category_id, title, slug, excerpt, body, cover_url, is_published, is_pinned, published_at, author_id)
    VALUES (p_category_id, p_title, p_slug, p_excerpt, p_body, p_cover_url, p_is_published, p_is_pinned,
            COALESCE(p_published_at, CASE WHEN p_is_published THEN now() END), v_admin)
    RETURNING id INTO v_id;
  ELSE
    UPDATE feed_posts SET
      category_id=p_category_id, title=p_title, slug=p_slug, excerpt=p_excerpt, body=p_body,
      cover_url=p_cover_url, is_published=p_is_published, is_pinned=p_is_pinned,
      published_at=COALESCE(p_published_at, published_at, CASE WHEN p_is_published THEN now() END),
      updated_at=now()
    WHERE id=p_id RETURNING id INTO v_id;
  END IF;
  INSERT INTO admin_action_logs (admin_id, action, target_type, target_id, metadata)
  VALUES (v_admin, CASE WHEN p_id IS NULL THEN 'feed_post_create' ELSE 'feed_post_update' END, 'feed_post', v_id, jsonb_build_object('title', p_title, 'published', p_is_published));
  RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public.admin_delete_feed_post(p_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_admin uuid := auth.uid();
BEGIN
  IF NOT public.has_role(v_admin, 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  DELETE FROM feed_posts WHERE id = p_id;
  INSERT INTO admin_action_logs (admin_id, action, target_type, target_id)
  VALUES (v_admin, 'feed_post_delete', 'feed_post', p_id);
END $$;

-- Admin: Send notifications
CREATE OR REPLACE FUNCTION public.admin_send_notification(
  p_target text, -- 'user' | 'all' | 'premium'
  p_user_id uuid,
  p_title text,
  p_body text,
  p_link text DEFAULT NULL,
  p_type text DEFAULT 'system'
) RETURNS int
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_admin uuid := auth.uid(); v_count int := 0;
BEGIN
  IF NOT public.has_role(v_admin, 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;

  IF p_target = 'user' AND p_user_id IS NOT NULL THEN
    INSERT INTO user_notifications (user_id, title, body, link, type)
    VALUES (p_user_id, p_title, p_body, p_link, p_type);
    v_count := 1;
  ELSIF p_target = 'all' THEN
    INSERT INTO user_notifications (user_id, title, body, link, type)
    SELECT id, p_title, p_body, p_link, p_type FROM profiles;
    GET DIAGNOSTICS v_count = ROW_COUNT;
  ELSIF p_target = 'premium' THEN
    INSERT INTO user_notifications (user_id, title, body, link, type)
    SELECT id, p_title, p_body, p_link, p_type FROM profiles
    WHERE premium_expires_at IS NOT NULL AND premium_expires_at > now();
    GET DIAGNOSTICS v_count = ROW_COUNT;
  END IF;

  INSERT INTO admin_action_logs (admin_id, action, target_type, target_id, metadata)
  VALUES (v_admin, 'notification_send', 'notification', p_user_id,
          jsonb_build_object('target', p_target, 'title', p_title, 'count', v_count));
  RETURN v_count;
END $$;

-- Notification template CRUD
CREATE OR REPLACE FUNCTION public.admin_save_notification_template(
  p_id uuid,
  p_key text,
  p_title text,
  p_body text,
  p_type text,
  p_is_active boolean
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid; v_admin uuid := auth.uid();
BEGIN
  IF NOT public.has_role(v_admin, 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF p_id IS NULL THEN
    INSERT INTO notification_templates (key, title, body, type, is_active)
    VALUES (p_key, p_title, p_body, p_type, p_is_active) RETURNING id INTO v_id;
  ELSE
    UPDATE notification_templates SET key=p_key, title=p_title, body=p_body, type=p_type, is_active=p_is_active, updated_at=now()
    WHERE id=p_id RETURNING id INTO v_id;
  END IF;
  RETURN v_id;
END $$;
