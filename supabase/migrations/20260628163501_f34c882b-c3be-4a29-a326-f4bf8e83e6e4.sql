INSERT INTO public.website_settings (key, value, type, label)
VALUES ('play_hero_live_url', '', 'string', 'Play Match hero — YouTube Live URL (LIVE button)')
ON CONFLICT (key) DO NOTHING;