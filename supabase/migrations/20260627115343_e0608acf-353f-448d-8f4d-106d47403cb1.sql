
-- Premium plan upsert/delete
CREATE OR REPLACE FUNCTION public.admin_save_premium_plan(p_id smallint, p_duration_days smallint, p_price_bac bigint, p_benefits_text text, p_is_active boolean)
RETURNS smallint LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_id smallint;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admins only'; END IF;
  IF p_id IS NULL THEN
    INSERT INTO premium_settings(duration_days, price_bac, benefits_text, is_active)
    VALUES (p_duration_days, p_price_bac, p_benefits_text, COALESCE(p_is_active,true))
    RETURNING id INTO v_id;
  ELSE
    UPDATE premium_settings SET duration_days=p_duration_days, price_bac=p_price_bac,
      benefits_text=p_benefits_text, is_active=COALESCE(p_is_active,true), updated_at=now()
    WHERE id=p_id RETURNING id INTO v_id;
  END IF;
  INSERT INTO admin_action_logs(admin_id, action, module, target_type, target_id, new_value)
  VALUES (auth.uid(), CASE WHEN p_id IS NULL THEN 'premium_create' ELSE 'premium_update' END,
    'premium','premium_plan', v_id::text,
    jsonb_build_object('duration_days',p_duration_days,'price_bac',p_price_bac));
  RETURN v_id;
END;$$;

CREATE OR REPLACE FUNCTION public.admin_delete_premium_plan(p_id smallint)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admins only'; END IF;
  DELETE FROM premium_settings WHERE id=p_id;
  INSERT INTO admin_action_logs(admin_id, action, module, target_type, target_id)
  VALUES (auth.uid(),'premium_delete','premium','premium_plan',p_id::text);
END;$$;

-- Referral config upsert
CREATE OR REPLACE FUNCTION public.admin_save_referral_config(p_payload jsonb)
RETURNS smallint LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_id smallint;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admins only'; END IF;
  SELECT id INTO v_id FROM referral_configs ORDER BY id LIMIT 1;
  IF v_id IS NULL THEN
    INSERT INTO referral_configs(is_enabled, signup_bonus_bac, paid_match_commission, deposit_commission, min_paid_match_fee, updated_by_admin_id)
    VALUES (
      COALESCE((p_payload->>'is_enabled')::boolean,true),
      COALESCE((p_payload->>'signup_bonus_bac')::bigint,0),
      COALESCE((p_payload->>'paid_match_commission')::smallint,0),
      COALESCE((p_payload->>'deposit_commission')::smallint,0),
      COALESCE((p_payload->>'min_paid_match_fee')::bigint,0),
      auth.uid()
    ) RETURNING id INTO v_id;
  ELSE
    UPDATE referral_configs SET
      is_enabled=COALESCE((p_payload->>'is_enabled')::boolean,is_enabled),
      signup_bonus_bac=COALESCE((p_payload->>'signup_bonus_bac')::bigint,signup_bonus_bac),
      paid_match_commission=COALESCE((p_payload->>'paid_match_commission')::smallint,paid_match_commission),
      deposit_commission=COALESCE((p_payload->>'deposit_commission')::smallint,deposit_commission),
      min_paid_match_fee=COALESCE((p_payload->>'min_paid_match_fee')::bigint,min_paid_match_fee),
      updated_by_admin_id=auth.uid(),
      updated_at=now()
    WHERE id=v_id;
  END IF;
  INSERT INTO admin_action_logs(admin_id, action, module, target_type, target_id, new_value)
  VALUES (auth.uid(),'referral_config_update','referral','referral_config',v_id::text,p_payload);
  RETURN v_id;
END;$$;

-- Replace mismatched notification template RPC with schema-correct one
DROP FUNCTION IF EXISTS public.admin_save_notification_template(uuid, text, text, text, text, boolean);
CREATE OR REPLACE FUNCTION public.admin_save_notification_template(p_id bigint, p_payload jsonb)
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_id bigint;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admins only'; END IF;
  IF p_id IS NULL THEN
    INSERT INTO notification_templates(slug, title_template, message_template, email_subject, email_body_html, is_email_enabled, is_inapp_enabled, updated_by_admin_id)
    VALUES (
      p_payload->>'slug',
      p_payload->>'title_template',
      p_payload->>'message_template',
      p_payload->>'email_subject',
      p_payload->>'email_body_html',
      COALESCE((p_payload->>'is_email_enabled')::boolean,false),
      COALESCE((p_payload->>'is_inapp_enabled')::boolean,true),
      auth.uid()
    ) RETURNING id INTO v_id;
  ELSE
    UPDATE notification_templates SET
      slug=COALESCE(p_payload->>'slug',slug),
      title_template=COALESCE(p_payload->>'title_template',title_template),
      message_template=COALESCE(p_payload->>'message_template',message_template),
      email_subject=COALESCE(p_payload->>'email_subject',email_subject),
      email_body_html=COALESCE(p_payload->>'email_body_html',email_body_html),
      is_email_enabled=COALESCE((p_payload->>'is_email_enabled')::boolean,is_email_enabled),
      is_inapp_enabled=COALESCE((p_payload->>'is_inapp_enabled')::boolean,is_inapp_enabled),
      updated_by_admin_id=auth.uid(),
      updated_at=now()
    WHERE id=p_id RETURNING id INTO v_id;
  END IF;
  INSERT INTO admin_action_logs(admin_id, action, module, target_type, target_id, new_value)
  VALUES (auth.uid(), CASE WHEN p_id IS NULL THEN 'notif_tpl_create' ELSE 'notif_tpl_update' END,
    'notifications','notification_template',v_id::text,p_payload);
  RETURN v_id;
END;$$;

CREATE OR REPLACE FUNCTION public.admin_delete_notification_template(p_id bigint)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admins only'; END IF;
  DELETE FROM notification_templates WHERE id=p_id;
  INSERT INTO admin_action_logs(admin_id, action, module, target_type, target_id)
  VALUES (auth.uid(),'notif_tpl_delete','notifications','notification_template',p_id::text);
END;$$;

-- Security alerts admin actions
CREATE OR REPLACE FUNCTION public.admin_resolve_security_alert(p_id bigint)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admins only'; END IF;
  UPDATE security_alerts SET is_resolved=true, resolved_by_admin_id=auth.uid(), resolved_at=now() WHERE id=p_id;
  INSERT INTO admin_action_logs(admin_id, action, module, target_type, target_id)
  VALUES (auth.uid(),'security_resolve','security','security_alert',p_id::text);
END;$$;
