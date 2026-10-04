/*
# Fix: infinite recursion in RLS policies

The user_roles SELECT policy queries user_roles itself, causing infinite recursion.
Fix: use a SECURITY DEFINER function to check admin status without RLS recursion.

Also fix profiles SELECT policy to use the same function.
*/

-- === Function: is_admin_principal ===
-- Returns true if the current user is an active admin_principal in the given school
-- SECURITY DEFINER so it bypasses RLS (avoids recursion)
CREATE OR REPLACE FUNCTION is_admin_principal(p_school_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.school_id = p_school_id
      AND ur.role = 'admin_principal'
      AND ur.is_active = true
  );
END;
$$;

-- === Fix profiles SELECT policy ===
DROP POLICY IF EXISTS "profiles_select_own_or_admin" ON profiles;
CREATE POLICY "profiles_select_own_or_admin"
ON profiles FOR SELECT
TO authenticated
USING (
  id = auth.uid()
  OR is_admin_principal(school_id)
);

-- === Fix user_roles SELECT policy ===
DROP POLICY IF EXISTS "user_roles_select_own_or_admin" ON user_roles;
CREATE POLICY "user_roles_select_own_or_admin"
ON user_roles FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR is_admin_principal(school_id)
);

-- === Fix user_roles INSERT/UPDATE/DELETE policies ===
DROP POLICY IF EXISTS "user_roles_insert_admin_principal" ON user_roles;
CREATE POLICY "user_roles_insert_admin_principal"
ON user_roles FOR INSERT
TO authenticated
WITH CHECK (
  school_id = get_current_school_id()
  AND is_admin_principal(school_id)
);

DROP POLICY IF EXISTS "user_roles_update_admin_principal" ON user_roles;
CREATE POLICY "user_roles_update_admin_principal"
ON user_roles FOR UPDATE
TO authenticated
USING (
  school_id = get_current_school_id()
  AND is_admin_principal(school_id)
)
WITH CHECK (
  school_id = get_current_school_id()
  AND is_admin_principal(school_id)
);

DROP POLICY IF EXISTS "user_roles_delete_admin_principal" ON user_roles;
CREATE POLICY "user_roles_delete_admin_principal"
ON user_roles FOR DELETE
TO authenticated
USING (
  school_id = get_current_school_id()
  AND is_admin_principal(school_id)
);

-- === Fix staff policies to use is_admin_principal ===
DROP POLICY IF EXISTS "staff_select_admin" ON staff;
CREATE POLICY "staff_select_admin_or_direction"
ON staff FOR SELECT
TO authenticated
USING (
  school_id = get_current_school_id()
  AND (
    is_admin_principal(school_id)
    OR EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.school_id = get_current_school_id()
        AND ur.role = 'direction'
        AND ur.is_active = true
    )
  )
);

-- Note: staff_select_admin_or_direction uses a subquery on user_roles for direction check.
-- This doesn't cause recursion because it only reads user_roles (not staff), and user_roles
-- SELECT policy uses is_admin_principal (SECURITY DEFINER, no RLS), not a staff subquery.

DROP POLICY IF EXISTS "staff_insert_admin_principal" ON staff;
CREATE POLICY "staff_insert_admin_principal"
ON staff FOR INSERT
TO authenticated
WITH CHECK (
  school_id = get_current_school_id()
  AND is_admin_principal(school_id)
);

DROP POLICY IF EXISTS "staff_update_admin_principal" ON staff;
CREATE POLICY "staff_update_admin_principal"
ON staff FOR UPDATE
TO authenticated
USING (
  school_id = get_current_school_id()
  AND is_admin_principal(school_id)
)
WITH CHECK (
  school_id = get_current_school_id()
  AND is_admin_principal(school_id)
);

-- === Fix profiles INSERT/UPDATE to use is_admin_principal ===
DROP POLICY IF EXISTS "profiles_insert_admin_principal" ON profiles;
CREATE POLICY "profiles_insert_admin_principal"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (
  school_id = get_current_school_id()
  AND is_admin_principal(school_id)
);

DROP POLICY IF EXISTS "profiles_update_admin_principal" ON profiles;
CREATE POLICY "profiles_update_admin_principal"
ON profiles FOR UPDATE
TO authenticated
USING (
  school_id = get_current_school_id()
  AND is_admin_principal(school_id)
)
WITH CHECK (
  school_id = get_current_school_id()
  AND is_admin_principal(school_id)
);
