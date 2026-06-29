INSERT INTO public.website_settings (key, value, type, label)
VALUES ('single_device_login', 'false', 'boolean', 'Enforce single device login (sign out other devices on new login)')
ON CONFLICT (key) DO NOTHING;