
CREATE POLICY "Admins can upload apk files" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'apk-files' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update apk files" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'apk-files' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete apk files" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'apk-files' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone can read apk files" ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'apk-files');
