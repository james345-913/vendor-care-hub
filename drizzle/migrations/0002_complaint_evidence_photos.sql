ALTER TABLE public.complaints ADD COLUMN evidence_paths text[] NOT NULL DEFAULT '{}';

CREATE POLICY "Vendors upload own evidence" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'complaint-evidence' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Owners and admins view evidence" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'complaint-evidence' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(), 'admin')));

CREATE POLICY "Owners delete own evidence" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'complaint-evidence' AND (storage.foldername(name))[1] = auth.uid()::text);