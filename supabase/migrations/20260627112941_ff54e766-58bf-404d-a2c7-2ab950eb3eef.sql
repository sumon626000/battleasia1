
DROP FUNCTION IF EXISTS public.admin_save_feed_category(uuid, text, text, int, boolean);
DROP FUNCTION IF EXISTS public.admin_delete_feed_category(uuid);
DROP FUNCTION IF EXISTS public.admin_save_feed_post(uuid, uuid, text, text, text, text, text, boolean, boolean, timestamptz);
DROP FUNCTION IF EXISTS public.admin_delete_feed_post(uuid);
DROP FUNCTION IF EXISTS public.admin_send_notification(text, uuid, text, text, text, text);

CREATE OR REPLACE FUNCTION public.admin_save_feed_category(
  p_id bigint,
  p_name text,
  p_slug text
) RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id bigint; v_admin uuid := auth.uid();
BEGIN
  IF NOT public.has_role(v_admin, 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF p_id IS NULL THEN
    INSERT INTO feed_categories (name, slug) VALUES (p_name, p_slug) RETURNING id INTO v_id;
  ELSE
    UPDATE feed_categories SET name=p_name, slug=p_slug, updated_at=now() WHERE id=p_id RETURNING id INTO v_id;
  END IF;
  INSERT INTO admin_action_logs (admin_id, action, target_type, target_id_text, metadata)
  VALUES (v_admin, CASE WHEN p_id IS NULL THEN 'feed_category_create' ELSE 'feed_category_update' END,
          'feed_category', v_id::text, jsonb_build_object('name', p_name));
  RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public.admin_delete_feed_category(p_id bigint) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_admin uuid := auth.uid();
BEGIN
  IF NOT public.has_role(v_admin, 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  UPDATE feed_categories SET deleted_at = now() WHERE id = p_id;
  INSERT INTO admin_action_logs (admin_id, action, target_type, target_id_text)
  VALUES (v_admin, 'feed_category_delete', 'feed_category', p_id::text);
END $$;

CREATE OR REPLACE FUNCTION public.admin_save_feed_post(
  p_id bigint,
  p_category_id bigint,
  p_title text,
  p_description_html text,
  p_cover_image_url text,
  p_status text,
  p_premium_only boolean
) RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id bigint; v_admin uuid := auth.uid(); v_status feed_status;
BEGIN
  IF NOT public.has_role(v_admin, 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  v_status := p_status::feed_status;
  IF p_id IS NULL THEN
    INSERT INTO feed_posts (category_id, title, description_html, cover_image_url, status, premium_only, author_admin_id, published_at)
    VALUES (p_category_id, p_title, p_description_html, p_cover_image_url, v_status, p_premium_only, v_admin,
            CASE WHEN v_status = 'Published' THEN now() END)
    RETURNING id INTO v_id;
  ELSE
    UPDATE feed_posts SET
      category_id=p_category_id, title=p_title, description_html=p_description_html,
      cover_image_url=p_cover_image_url, status=v_status, premium_only=p_premium_only,
      published_at=CASE WHEN v_status='Published' AND published_at IS NULL THEN now() ELSE published_at END,
      updated_at=now()
    WHERE id=p_id RETURNING id INTO v_id;
  END IF;
  INSERT INTO admin_action_logs (admin_id, action, target_type, target_id_text, metadata)
  VALUES (v_admin, CASE WHEN p_id IS NULL THEN 'feed_post_create' ELSE 'feed_post_update' END,
          'feed_post', v_id::text, jsonb_build_object('title', p_title, 'status', p_status));
  RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public.admin_delete_feed_post(p_id bigint) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_admin uuid := auth.uid();
BEGIN
  IF NOT public.has_role(v_admin, 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  UPDATE feed_posts SET deleted_at = now() WHERE id = p_id;
  INSERT INTO admin_action_logs (admin_id, action, target_type, target_id_text)
  VALUES (v_admin, 'feed_post_delete', 'feed_post', p_id::text);
END $$;

CREATE OR REPLACE FUNCTION public.admin_send_notification(
  p_target text,
  p_user_id uuid,
  p_title text,
  p_message text,
  p_type text DEFAULT 'system'
) RETURNS int
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_admin uuid := auth.uid(); v_count int := 0;
BEGIN
  IF NOT public.has_role(v_admin, 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;

  IF p_target = 'user' AND p_user_id IS NOT NULL THEN
    INSERT INTO user_notifications (user_id, title, message, type)
    VALUES (p_user_id, p_title, p_message, p_type);
    v_count := 1;
  ELSIF p_target = 'all' THEN
    INSERT INTO user_notifications (user_id, title, message, type)
    SELECT id, p_title, p_message, p_type FROM profiles;
    GET DIAGNOSTICS v_count = ROW_COUNT;
  ELSIF p_target = 'premium' THEN
    INSERT INTO user_notifications (user_id, title, message, type)
    SELECT id, p_title, p_message, p_type FROM profiles
    WHERE premium_expires_at IS NOT NULL AND premium_expires_at > now();
    GET DIAGNOSTICS v_count = ROW_COUNT;
  END IF;

  INSERT INTO admin_action_logs (admin_id, action, target_type, target_id, metadata)
  VALUES (v_admin, 'notification_send', 'notification', p_user_id,
          jsonb_build_object('target', p_target, 'title', p_title, 'count', v_count));
  RETURN v_count;
END $$;
