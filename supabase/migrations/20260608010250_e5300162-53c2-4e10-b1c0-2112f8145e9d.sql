CREATE POLICY "Users update own client docs in storage"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'client-documents'
  AND (auth.uid())::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'client-documents'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);