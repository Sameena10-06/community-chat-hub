-- Drop the problematic RLS policies on group_members and groups
DROP POLICY IF EXISTS "Group members viewable by members" ON public.group_members;
DROP POLICY IF EXISTS "Groups are viewable by members" ON public.groups;

-- Create a simple policy for group_members that doesn't cause recursion
CREATE POLICY "Users can view group memberships"
ON public.group_members
FOR SELECT
USING (
  user_id = auth.uid() OR 
  group_id IN (
    SELECT group_id FROM public.group_members WHERE user_id = auth.uid()
  )
);

-- Create a simple policy for groups that doesn't cause recursion
CREATE POLICY "Users can view their groups"
ON public.groups
FOR SELECT
USING (
  created_by = auth.uid() OR
  id IN (
    SELECT group_id FROM public.group_members WHERE user_id = auth.uid()
  )
);