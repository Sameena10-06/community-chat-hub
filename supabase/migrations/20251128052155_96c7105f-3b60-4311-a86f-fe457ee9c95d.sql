-- Create open_chat_messages table for one-to-one messages with non-connected students
CREATE TABLE public.open_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES profiles(id),
  receiver_id uuid NOT NULL REFERENCES profiles(id),
  content text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  deleted boolean DEFAULT false,
  edited boolean DEFAULT false,
  CHECK (sender_id != receiver_id)
);

-- Enable RLS
ALTER TABLE public.open_chat_messages ENABLE ROW LEVEL SECURITY;

-- Users can view messages they sent or received
CREATE POLICY "Users can view messages they sent or received"
ON public.open_chat_messages FOR SELECT
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Users can send messages to non-connected students
CREATE POLICY "Users can send messages to non-connected students"
ON public.open_chat_messages FOR INSERT
WITH CHECK (
  auth.uid() = sender_id
  AND NOT EXISTS (
    SELECT 1 FROM connections
    WHERE status = 'accepted'
    AND (
      (requester_id = sender_id AND receiver_id = open_chat_messages.receiver_id)
      OR (requester_id = open_chat_messages.receiver_id AND receiver_id = sender_id)
    )
  )
);

-- Users can update their own messages
CREATE POLICY "Users can update their own messages"
ON public.open_chat_messages FOR UPDATE
USING (auth.uid() = sender_id);

-- Add index for performance
CREATE INDEX idx_open_chat_sender_receiver ON public.open_chat_messages(sender_id, receiver_id);
CREATE INDEX idx_open_chat_created_at ON public.open_chat_messages(created_at);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.open_chat_messages;