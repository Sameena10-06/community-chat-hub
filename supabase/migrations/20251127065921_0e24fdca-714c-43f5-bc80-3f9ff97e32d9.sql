-- Add edited field to messages table
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS edited boolean DEFAULT false;

-- Add edited field to campus_messages table
ALTER TABLE public.campus_messages 
ADD COLUMN IF NOT EXISTS edited boolean DEFAULT false;