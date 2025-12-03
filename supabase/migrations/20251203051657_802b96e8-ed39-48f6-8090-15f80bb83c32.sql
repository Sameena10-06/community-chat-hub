-- Fix RLS policy to allow group members to see all members in their groups
DROP POLICY IF EXISTS "Users can view own memberships" ON public.group_members;
DROP POLICY IF EXISTS "Group creators can view all memberships" ON public.group_members;

-- Allow any group member to see all members in groups they belong to
CREATE POLICY "Group members can view all group members"
ON public.group_members
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = group_members.group_id
    AND gm.user_id = auth.uid()
  )
);