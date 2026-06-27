
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS social_links jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS bio text;

CREATE TABLE IF NOT EXISTS public.admin_totp_secrets (
  user_id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  secret text NOT NULL,
  enabled boolean NOT NULL DEFAULT false,
  recovery_codes text[] NOT NULL DEFAULT '{}',
  last_verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_totp_secrets TO authenticated;
GRANT ALL ON public.admin_totp_secrets TO service_role;

ALTER TABLE public.admin_totp_secrets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage own TOTP"
  ON public.admin_totp_secrets
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (auth.uid() = user_id AND public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_admin_totp_updated
  BEFORE UPDATE ON public.admin_totp_secrets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Covers authenticated read"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'covers');

CREATE POLICY "Users upload own cover"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'covers' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users update own cover"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'covers' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users delete own cover"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'covers' AND auth.uid()::text = (storage.foldername(name))[1]);
