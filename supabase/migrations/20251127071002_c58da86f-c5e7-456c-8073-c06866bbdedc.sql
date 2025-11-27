-- Add edited field to connected_messages table
ALTER TABLE public.connected_messages 
ADD COLUMN IF NOT EXISTS edited boolean DEFAULT false;