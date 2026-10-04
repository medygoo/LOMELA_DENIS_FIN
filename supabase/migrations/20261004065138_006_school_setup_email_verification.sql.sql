/*
# SchoolSafe — Partie 1: Entrée dans SchoolSafe

## Changements

### 1. Table schools — nouvelles colonnes
- short_name (text, nullable) — nom court facultatif
- country (text, nullable) — pays
- commune (text, nullable) — commune/arrondissement
- levels (text, nullable) — niveaux enseignés
- status (text, NOT NULL, default 'setup') — statut: setup, active, suspended

### 2. Table profiles — nouvelles colonnes
- email_verified (boolean, NOT NULL, default false) — email vérifié
- function (text, nullable) — fonction du responsable

### 3. Nouvelle table email_verifications
- Stocke les codes de vérification envoyés par email
- id, user_id, code, expires_at, used, created_at

### 4. Nouvelle table user_roles
- Permet plusieurs rôles pour un même utilisateur
- id, user_id, school_id, role, is_active, created_at
- Unicite sur (user_id, school_id, role)

### 5. Securite
- RLS sur email_verifications et user_roles
- Politiques par utilisateur

### Notes
- La colonne code de schools est generee automatiquement par l edge function
- Le statut par defaut d une nouvelle ecole est setup
*/

-- 1. Ajouter colonnes à schools
ALTER TABLE schools ADD COLUMN IF NOT EXISTS short_name text;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS country text;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS commune text;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS levels text;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'setup';

-- 2. Ajouter colonnes à profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email_verified boolean NOT NULL DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS function text;

-- 3. Table email_verifications
CREATE TABLE IF NOT EXISTS email_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  code text NOT NULL,
  expires_at timestamptz NOT NULL,
  used boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE email_verifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ev_select_own" ON email_verifications;
CREATE POLICY "ev_select_own"
ON email_verifications FOR SELECT
TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "ev_insert_own" ON email_verifications;
CREATE POLICY "ev_insert_own"
ON email_verifications FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "ev_update_own" ON email_verifications;
CREATE POLICY "ev_update_own"
ON email_verifications FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- 4. Table user_roles
CREATE TABLE IF NOT EXISTS user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  role text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, school_id, role)
);

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ur_select_own" ON user_roles;
CREATE POLICY "ur_select_own"
ON user_roles FOR SELECT
TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "ur_insert_own" ON user_roles;
CREATE POLICY "ur_insert_own"
ON user_roles FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "ur_update_own" ON user_roles;
CREATE POLICY "ur_update_own"
ON user_roles FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- 5. Index
CREATE INDEX IF NOT EXISTS idx_ev_user_id ON email_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_ur_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_ur_school_id ON user_roles(school_id);
