/*
# Correction Partie 2 — RLS, contraintes, protection dernier admin

## 1. profiles.email devient nullable
Pour supporter les comptes téléphone-only, email ne doit plus être NOT NULL.

## 2. Ajout de 'surveillant' au CHECK constraint de profiles.role
L'ancien constraint manquait 'surveillant'.

## 3. RLS profiles — restriction SELECT
- Chaque utilisateur peut lire SON PROPRE profil.
- admin_principal peut lire tous les profils de son école.
- Les autres rôles (direction, enseignant, surveillant, gardien, caisse, parent_tuteur) ne peuvent PAS lire tous les profils.
- direction peut lire les profils pour voir le personnel mais pas modifier/comptes.

## 4. RLS profiles — UPDATE/INSERT restreints à admin_principal uniquement
- Seul admin_principal peut créer, modifier, activer/désactiver des profils.

## 5. RLS user_roles — INSERT/UPDATE/DELETE restreints à admin_principal uniquement

## 6. Trigger DB: empêcher la suppression du dernier admin_principal
Crée un trigger sur user_roles qui bloque DELETE ou UPDATE is_active=false
si c'est le dernier admin_principal actif de cette école.

## 7. RLS staff — SELECT pour admin_principal et direction, pas pour les autres

## 8. RLS staff — INSERT/UPDATE restreints à admin_principal
*/

-- === 1. Make profiles.email nullable ===
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'email' AND is_nullable = 'NO') THEN
    ALTER TABLE profiles ALTER COLUMN email DROP NOT NULL;
  END IF;
END $$;

-- === 2. Fix role check constraint to include 'surveillant' ===
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_role_check' AND conrelid = 'profiles'::regclass) THEN
    ALTER TABLE profiles DROP CONSTRAINT profiles_role_check;
  END IF;
END $$;

ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
CHECK (role = ANY (ARRAY['admin_principal', 'direction', 'enseignant', 'surveillant', 'gardien', 'caisse', 'parent_tuteur']));

-- === 3. RLS profiles SELECT — own profile OR admin_principal ===
DROP POLICY IF EXISTS "profiles_select_school" ON profiles;
DROP POLICY IF EXISTS "profiles_select_own_school" ON profiles;

CREATE POLICY "profiles_select_own_or_admin"
ON profiles FOR SELECT
TO authenticated
USING (
  id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.school_id = profiles.school_id
      AND ur.role = 'admin_principal'
      AND ur.is_active = true
  )
);

-- === 4. RLS profiles INSERT/UPDATE — admin_principal only ===
DROP POLICY IF EXISTS "profiles_insert_school_admin" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_own_school" ON profiles;
CREATE POLICY "profiles_insert_admin_principal"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (
  school_id = get_current_school_id()
  AND EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.school_id = get_current_school_id()
      AND ur.role = 'admin_principal'
      AND ur.is_active = true
  )
);

DROP POLICY IF EXISTS "profiles_update_school_admin" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own_school" ON profiles;
CREATE POLICY "profiles_update_admin_principal"
ON profiles FOR UPDATE
TO authenticated
USING (
  school_id = get_current_school_id()
  AND EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.school_id = get_current_school_id()
      AND ur.role = 'admin_principal'
      AND ur.is_active = true
  )
)
WITH CHECK (
  school_id = get_current_school_id()
  AND EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.school_id = get_current_school_id()
      AND ur.role = 'admin_principal'
      AND ur.is_active = true
  )
);

-- Allow users to update their own profile (for password change flow)
CREATE POLICY "profiles_update_self"
ON profiles FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- === 5. RLS user_roles — admin_principal only for INSERT/UPDATE/DELETE ===
DROP POLICY IF EXISTS "user_roles_insert_admin" ON profiles;
DROP POLICY IF EXISTS "user_roles_update_admin" ON profiles;
DROP POLICY IF EXISTS "user_roles_delete_admin" ON profiles;

CREATE POLICY "user_roles_insert_admin_principal"
ON user_roles FOR INSERT
TO authenticated
WITH CHECK (
  school_id = get_current_school_id()
  AND EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.school_id = get_current_school_id()
      AND ur.role = 'admin_principal'
      AND ur.is_active = true
  )
);

CREATE POLICY "user_roles_update_admin_principal"
ON user_roles FOR UPDATE
TO authenticated
USING (
  school_id = get_current_school_id()
  AND EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.school_id = get_current_school_id()
      AND ur.role = 'admin_principal'
      AND ur.is_active = true
  )
)
WITH CHECK (
  school_id = get_current_school_id()
  AND EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.school_id = get_current_school_id()
      AND ur.role = 'admin_principal'
      AND ur.is_active = true
  )
);

CREATE POLICY "user_roles_delete_admin_principal"
ON user_roles FOR DELETE
TO authenticated
USING (
  school_id = get_current_school_id()
  AND EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.school_id = get_current_school_id()
      AND ur.role = 'admin_principal'
      AND ur.is_active = true
  )
);

-- SELECT: users can see their own roles, admin_principal can see all in school
DROP POLICY IF EXISTS "user_roles_select_school" ON user_roles;
CREATE POLICY "user_roles_select_own_or_admin"
ON user_roles FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM user_roles ur2
    WHERE ur2.user_id = auth.uid()
      AND ur2.school_id = user_roles.school_id
      AND ur2.role = 'admin_principal'
      AND ur2.is_active = true
  )
);

-- === 6. DB trigger: prevent removing last admin_principal ===
CREATE OR REPLACE FUNCTION prevent_last_admin_removal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_school_id uuid;
  v_active_count int;
BEGIN
  -- Get school_id from the role being deleted/deactivated
  v_school_id := OLD.school_id;

  -- Only check for admin_principal role
  IF OLD.role = 'admin_principal' THEN
    -- For DELETE: count remaining active admin_principals (excluding the one being deleted)
    -- For UPDATE: count if the update sets is_active to false
    IF TG_OP = 'DELETE' THEN
      SELECT COUNT(*) INTO v_active_count
      FROM user_roles ur
      JOIN profiles p ON p.id = ur.user_id
      WHERE ur.school_id = v_school_id
        AND ur.role = 'admin_principal'
        AND ur.is_active = true
        AND p.is_active = true
        AND ur.user_id != OLD.user_id;
      
      IF v_active_count = 0 THEN
        RAISE EXCEPTION 'Impossible de supprimer le dernier administrateur principal actif de l''école.';
      END IF;
    ELSIF TG_OP = 'UPDATE' AND NEW.is_active = false AND OLD.is_active = true THEN
      SELECT COUNT(*) INTO v_active_count
      FROM user_roles ur
      JOIN profiles p ON p.id = ur.user_id
      WHERE ur.school_id = v_school_id
        AND ur.role = 'admin_principal'
        AND ur.is_active = true
        AND p.is_active = true
        AND ur.user_id != OLD.user_id;
      
      IF v_active_count = 0 THEN
        RAISE EXCEPTION 'Impossible de désactiver le dernier administrateur principal actif de l''école.';
      END IF;
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_last_admin_delete ON user_roles;
CREATE TRIGGER trg_prevent_last_admin_delete
BEFORE DELETE ON user_roles
FOR EACH ROW EXECUTE FUNCTION prevent_last_admin_removal();

DROP TRIGGER IF EXISTS trg_prevent_last_admin_update ON user_roles;
CREATE TRIGGER trg_prevent_last_admin_update
BEFORE UPDATE ON user_roles
FOR EACH ROW EXECUTE FUNCTION prevent_last_admin_removal();

-- === 7. RLS staff — SELECT for admin_principal and direction ===
DROP POLICY IF EXISTS "staff_select_own" ON staff;
CREATE POLICY "staff_select_admin"
ON staff FOR SELECT
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

-- === 8. RLS staff INSERT/UPDATE — admin_principal only ===
DROP POLICY IF EXISTS "staff_insert_own" ON staff;
CREATE POLICY "staff_insert_admin_principal"
ON staff FOR INSERT
TO authenticated
WITH CHECK (
  school_id = get_current_school_id()
  AND EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.school_id = get_current_school_id()
      AND ur.role = 'admin_principal'
      AND ur.is_active = true
  )
);

DROP POLICY IF EXISTS "staff_update_own" ON staff;
CREATE POLICY "staff_update_admin_principal"
ON staff FOR UPDATE
TO authenticated
USING (
  school_id = get_current_school_id()
  AND EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.school_id = get_current_school_id()
      AND ur.role = 'admin_principal'
      AND ur.is_active = true
  )
)
WITH CHECK (
  school_id = get_current_school_id()
  AND EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.school_id = get_current_school_id()
      AND ur.role = 'admin_principal'
      AND ur.is_active = true
  )
);
