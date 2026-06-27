
CREATE POLICY "social-media public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'social-media');

CREATE POLICY "social-media auth upload own folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'social-media' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "social-media owner update"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'social-media' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "social-media owner delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'social-media' AND (storage.foldername(name))[1] = auth.uid()::text);
