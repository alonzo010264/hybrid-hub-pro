CREATE POLICY "Authenticated read product images" ON storage.objects FOR SELECT
  TO authenticated USING (bucket_id = 'products');
CREATE POLICY "Staff upload product images" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (bucket_id = 'products' AND is_staff(auth.uid()));
CREATE POLICY "Staff update product images" ON storage.objects FOR UPDATE
  TO authenticated USING (bucket_id = 'products' AND is_staff(auth.uid()));
CREATE POLICY "Staff delete product images" ON storage.objects FOR DELETE
  TO authenticated USING (bucket_id = 'products' AND is_staff(auth.uid()));