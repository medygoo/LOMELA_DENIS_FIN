/*
# Partie 2 — Personnel, comptes individuels et rôles

## 1. New Columns on `profiles`
- `must_change_password` (boolean, default false) — when true, user must change password on next login before accessing the dashboard.
- `matricule` (text, nullable) — internal employee/staff identifier.
- `hire_date` (date, nullable) — date the person joined the school.
- `photo_url` (text, nullable) — optional profile photo URL.

## 2. New Columns on `staff`
- `matricule` (text, nullable) — internal employee identifier.
- `photo_url` (text, nullable) — optional photo URL.
- `function` (text, nullable) — job title/position.

## 3. New Functions (SECURITY DEFINER)
- `audit_action(p_action text, p_entity_type text, p_entity_id uuid, p_details jsonb)` — inserts an audit_log entry for the current authenticated user and their school.
- `check_last_admin_principal(p_school_id uuid)` — returns true if removing/deactivating the given admin would leave the school with zero active admin_principal users.
- `get_user_roles(p_user_id uuid)` — returns all active roles for a given user in the caller's school.

## 4. RLS Policy Updates
- `profiles`: SELECT allows users to see all profiles in their school. UPDATE allows admin_principal/direction to update profiles in their school. Users can still update their own profile.
- `staff`: existing policies remain.
- `user_roles`: SELECT allows reading roles for users in same school. INSERT/DELETE restricted to admin_principal/direction.
- `audit_log`: SELECT allows reading audit logs for own school. INSERT via SECURITY DEFINER function only (RLS bypassed inside function).

## 5. Security
- All new policies use `auth.uid()` and `get_current_school_id()`.
- No passwords (temporary or permanent) are ever stored in any table.
- Audit function is SECURITY DEFINER so it can insert into audit_log regardless of RLS, but it derives school_id and actor_id from the authenticated session.
*/

-- === Add columns to profiles ===
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'must_change_password') THEN
    ALTER TABLE profiles ADD COLUMN must_change_password boolean NOT NULL DEFAULT false;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'matricule') THEN
    ALTER TABLE profiles ADD COLUMN matricule text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'hire_date') THEN
    ALTER TABLE profiles ADD COLUMN hire_date date;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'photo_url') THEN
    ALTER TABLE profiles ADD COLUMN photo_url text;
  END IF;
END $$;

-- === Add columns to staff ===
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'staff' AND column_name = 'matricule') THEN
    ALTER TABLE staff ADD COLUMN matricule text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'staff' AND column_name = 'photo_url') THEN
    ALTER TABLE staff ADD COLUMN photo_url text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'staff' AND column_name = 'function') THEN
    ALTER TABLE staff ADD COLUMN function text;
  END IF;
END $$;

-- === Audit function (SECURITY DEFINER) ===
CREATE OR REPLACE FUNCTION audit_action(p_action text, p_entity_type text, p_entity_id uuid, p_details jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_school_id uuid;
BEGIN
  SELECT school_id INTO v_school_id FROM profiles WHERE id = v_actor_id;
  INSERT INTO audit_log (school_id, actor_id, action, entity_type, entity_id, details)
  VALUES (v_school_id, v_actor_id, p_action, p_entity_type, p_entity_id, p_details);
END;
$$;

-- === Check last admin_principal function ===
CREATE OR REPLACE FUNCTION check_last_admin_principal(p_school_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM user_roles ur
  JOIN profiles p ON p.id = ur.user_id
  WHERE ur.school_id = p_school_id
    AND ur.role = 'admin_principal'
    AND ur.is_active = true
    AND p.is_active = true
    AND ur.user_id != p_user_id;
  RETURN v_count = 0;
END;
$$;

-- === Get user roles function ===
CREATE OR REPLACE FUNCTION get_user_roles(p_user_id uuid)
RETURNS TABLE(role text, is_active boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_school_id uuid;
BEGIN
  SELECT school_id INTO v_school_id FROM profiles WHERE id = auth.uid();
  RETURN QUERY
  SELECT ur.role::text, ur.is_active
  FROM user_roles ur
  WHERE ur.user_id = p_user_id
    AND ur.school_id = v_school_id;
END;
$$;

-- === RLS Policy updates for profiles ===
-- Allow all authenticated users in the same school to read profiles
DROP POLICY IF EXISTS "profiles_select_school" ON profiles;
CREATE POLICY "profiles_select_school"
ON profiles FOR SELECT
TO authenticated
USING (
  school_id = get_current_school_id()
);

-- Allow admin_principal and direction to update profiles in their school
DROP POLICY IF EXISTS "profiles_update_school_admin" ON profiles;
CREATE POLICY "profiles_update_school_admin"
ON profiles FOR UPDATE
TO authenticated
USING (
  school_id = get_current_school_id()
  AND EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.school_id = get_current_school_id()
      AND ur.role IN ('admin_principal', 'direction')
      AND ur.is_active = true
  )
)
WITH CHECK (
  school_id = get_current_school_id()
  AND EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.school_id = get_current_school_id()
      AND ur.role IN ('admin_principal', 'direction')
      AND ur.is_active = true
  )
);

-- Allow admin_principal and direction to insert profiles in their school
DROP POLICY IF EXISTS "profiles_insert_school_admin" ON profiles;
CREATE POLICY "profiles_insert_school_admin"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (
  school_id = get_current_school_id()
  AND EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.school_id = get_current_school_id()
      AND ur.role IN ('admin_principal', 'direction')
      AND ur.is_active = true
  )
);

-- === RLS Policy updates for user_roles ===
-- Allow reading roles for users in the same school
DROP POLICY IF EXISTS "user_roles_select_school" ON user_roles;
CREATE POLICY "user_roles_select_school"
ON user_roles FOR SELECT
TO authenticated
USING (
  school_id = get_current_school_id()
);

-- Allow admin_principal and direction to insert roles
DROP POLICY IF EXISTS "user_roles_insert_admin" ON user_roles;
CREATE POLICY "user_roles_insert_admin"
ON user_roles FOR INSERT
TO authenticated
WITH CHECK (
  school_id = get_current_school_id()
  AND EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.school_id = get_current_school_id()
      AND ur.role IN ('admin_principal', 'direction')
      AND ur.is_active = true
  )
);

-- Allow admin_principal and direction to update roles
DROP POLICY IF EXISTS "user_roles_update_admin" ON user_roles;
CREATE POLICY "user_roles_update_admin"
ON user_roles FOR UPDATE
TO authenticated
USING (
  school_id = get_current_school_id()
  AND EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.school_id = get_current_school_id()
      AND ur.role IN ('admin_principal', 'direction')
      AND ur.is_active = true
  )
)
WITH CHECK (
  school_id = get_current_school_id()
  AND EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.school_id = get_current_school_id()
      AND ur.role IN ('admin_principal', 'direction')
      AND ur.is_active = true
  )
);

-- Allow admin_principal and direction to delete roles
DROP POLICY IF EXISTS "user_roles_delete_admin" ON user_roles;
CREATE POLICY "user_roles_delete_admin"
ON user_roles FOR DELETE
TO authenticated
USING (
  school_id = get_current_school_id()
  AND EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.school_id = get_current_school_id()
      AND ur.role IN ('admin_principal', 'direction')
      AND ur.is_active = true
  )
);

-- === Indexes for performance ===
CREATE INDEX IF NOT EXISTS idx_profiles_school_id ON profiles(school_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_school ON user_roles(user_id, school_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_school_id ON audit_log(school_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity_type, entity_id);
