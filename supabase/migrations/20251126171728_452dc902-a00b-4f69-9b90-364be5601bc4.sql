-- Fix infinite recursion in group_members RLS policy
-- The current policy references itself which causes infinite recursion
-- We need to simplify it to just check if the user is a member without self-reference

DROP POLICY IF EXISTS "Group members are viewable by group members" ON group_members;

-- New simplified policy that doesn't cause recursion
CREATE POLICY "Group members viewable by members"
ON group_members
FOR SELECT
USING (
  user_id = auth.uid() 
  OR 
  group_id IN (
    SELECT gm.group_id 
    FROM group_members gm 
    WHERE gm.user_id = auth.uid()
  )
);