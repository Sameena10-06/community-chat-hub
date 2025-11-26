-- Add about_me field to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS about_me TEXT;

-- Add index on notifications for better query performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON public.notifications(user_id, read);

-- Create storage bucket for chat files if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-files', 'chat-files', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for chat-files bucket
DROP POLICY IF EXISTS "Authenticated users can upload chat files" ON storage.objects;
CREATE POLICY "Authenticated users can upload chat files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'chat-files' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can view files in their chats" ON storage.objects;
CREATE POLICY "Users can view files in their chats"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'chat-files' AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR
    EXISTS (
      SELECT 1 FROM connections
      WHERE status = 'accepted'
      AND (
        (requester_id = auth.uid() AND receiver_id::text = (storage.foldername(name))[1])
        OR
        (receiver_id = auth.uid() AND requester_id::text = (storage.foldername(name))[1])
      )
    )
  )
);

-- Add RLS policy for inserting notifications
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
CREATE POLICY "System can insert notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;