-- Add file support and edit functionality to group_messages
ALTER TABLE public.group_messages 
ADD COLUMN IF NOT EXISTS file_url text,
ADD COLUMN IF NOT EXISTS file_name text,
ADD COLUMN IF NOT EXISTS edited boolean DEFAULT false;

-- Update RLS policies to allow users to update and delete their own messages
DROP POLICY IF EXISTS "Group members can update their messages" ON public.group_messages;
DROP POLICY IF EXISTS "Group members can delete their messages" ON public.group_messages;

CREATE POLICY "Group members can update their messages"
ON public.group_messages
FOR UPDATE
USING (
  auth.uid() = user_id AND 
  EXISTS (
    SELECT 1 FROM public.group_members 
    WHERE group_members.group_id = group_messages.group_id 
    AND group_members.user_id = auth.uid()
  )
);

CREATE POLICY "Group members can delete their messages"
ON public.group_messages
FOR DELETE
USING (
  auth.uid() = user_id AND 
  EXISTS (
    SELECT 1 FROM public.group_members 
    WHERE group_members.group_id = group_messages.group_id 
    AND group_members.user_id = auth.uid()
  )
);

-- Allow group creators to delete groups
DROP POLICY IF EXISTS "Group creators can delete groups" ON public.groups;

CREATE POLICY "Group creators can delete groups"
ON public.groups
FOR DELETE
USING (auth.uid() = created_by);