
-- Storage policies for avatars bucket: each user has their own folder = their uid
CREATE POLICY "Avatars are viewable by everyone (signed urls)"
ON storage.objects FOR SELECT TO authenticated, anon
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Account deletion requests
CREATE TABLE public.account_delete_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

GRANT SELECT, INSERT ON public.account_delete_requests TO authenticated;
GRANT ALL ON public.account_delete_requests TO service_role;

ALTER TABLE public.account_delete_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own delete requests"
ON public.account_delete_requests FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own delete request"
ON public.account_delete_requests FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage delete requests"
ON public.account_delete_requests FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_account_delete_requests_updated_at
BEFORE UPDATE ON public.account_delete_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
