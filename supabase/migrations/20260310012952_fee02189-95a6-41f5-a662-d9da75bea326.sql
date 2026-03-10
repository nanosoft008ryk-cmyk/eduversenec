-- Fix: Allow users to read their own membership row (prevents circular RLS issues)
CREATE POLICY "Users read own membership"
  ON public.school_memberships
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Fix: Allow users to read their own roles
CREATE POLICY "Users read own roles"  
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());