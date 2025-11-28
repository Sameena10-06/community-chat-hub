-- Fix infinite recursion in group_members RLS policy
-- Drop existing policies that may cause recursion
DROP POLICY IF EXISTS "Users can view groups they are members of" ON group_members;
DROP POLICY IF EXISTS "Users can insert themselves into groups" ON group_members;
DROP POLICY IF EXISTS "Users can view their own group memberships" ON group_members;

-- Create security definer function to check group membership
CREATE OR REPLACE FUNCTION public.is_group_member(_user_id uuid, _group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.group_members
    WHERE user_id = _user_id
      AND group_id = _group_id
  )
$$;

-- Create new policies using the security definer function
CREATE POLICY "Users can view their own group memberships"
ON group_members FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert group memberships"
ON group_members FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Update groups table policies to use the security definer function
DROP POLICY IF EXISTS "Users can view groups they are members of" ON groups;

CREATE POLICY "Users can view groups they are members of"
ON groups FOR SELECT
USING (public.is_group_member(auth.uid(), id) OR created_by = auth.uid());