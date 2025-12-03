-- Fix infinite recursion by using security definer function
DROP POLICY IF EXISTS "Group members can view all group members" ON public.group_members;

-- Create policy using the existing security definer function
CREATE POLICY "Group members can view all group members"
ON public.group_members
FOR SELECT
USING (
  public.is_group_member(auth.uid(), group_id)
);