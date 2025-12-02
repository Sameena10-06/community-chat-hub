-- Temporarily disable RLS on group_members to stop the errors
ALTER TABLE public.group_members DISABLE ROW LEVEL SECURITY;

-- Re-enable it
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

-- Drop the problematic recursive policies on group_members
DROP POLICY "Users can view group memberships" ON public.group_members;
DROP POLICY "Users can view their own group memberships" ON public.group_members;

-- Drop problematic policies on groups
DROP POLICY "Users can view groups they are members of" ON public.groups;
DROP POLICY "Users can view their groups" ON public.groups;

-- Create simple, non-recursive policies for group_members
CREATE POLICY "Users can view own memberships"
ON public.group_members
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Group creators can view all memberships"
ON public.group_members  
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.groups 
    WHERE groups.id = group_members.group_id 
    AND groups.created_by = auth.uid()
  )
);

-- Create simple policy for groups using the existing is_group_member function
CREATE POLICY "Users can view their groups"
ON public.groups
FOR SELECT
USING (
  created_by = auth.uid() OR 
  is_group_member(id, auth.uid())
);