-- Fix the group_messages SELECT policy to use security definer function
DROP POLICY IF EXISTS "Group messages viewable by group members" ON public.group_messages;

CREATE POLICY "Group messages viewable by group members"
ON public.group_messages
FOR SELECT
USING (public.is_group_member(auth.uid(), group_id));

-- Also fix the groups SELECT policy which has parameter order reversed
DROP POLICY IF EXISTS "Users can view their groups" ON public.groups;

CREATE POLICY "Users can view their groups"
ON public.groups
FOR SELECT
USING ((created_by = auth.uid()) OR public.is_group_member(auth.uid(), id));