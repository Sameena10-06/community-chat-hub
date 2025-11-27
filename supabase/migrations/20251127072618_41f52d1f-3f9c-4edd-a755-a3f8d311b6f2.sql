-- Add RLS policies for campus chat files
-- Allow users to upload files to campus folder
CREATE POLICY "Users can upload campus chat files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'chat-files' 
  AND (storage.foldername(name))[1] = 'campus'
);

-- Allow everyone to view campus chat files
CREATE POLICY "Everyone can view campus chat files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'chat-files' 
  AND (storage.foldername(name))[1] = 'campus'
);