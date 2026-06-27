
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, anon;

-- Storage policies for admin-assets bucket
CREATE POLICY "admin_assets_admin_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'admin-assets' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_assets_admin_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'admin-assets' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_assets_admin_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'admin-assets' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_assets_authenticated_read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'admin-assets');
