-- Allow group creators to delete members from their groups
CREATE POLICY "Group creators can remove members"
ON public.group_members
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.groups
    WHERE groups.id = group_members.group_id
    AND groups.created_by = auth.uid()
  )
);