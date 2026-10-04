/*
# SchoolSafe — Sécurisation de la vérification email

## Changements

### 1. Table email_verifications — nouvelles colonnes de sécurité
- `attempts` (integer, NOT NULL, default 0) — compte les tentatives de validation incorrectes
- `max_attempts` (integer, NOT NULL, default 5) — nombre maximum de tentatives autorisées
- `invalidated` (boolean, NOT NULL, default false) — marque un code comme invalidé (après renvoi)
- `resend_count` — non stocké par code mais calculé via requête

### 2. Sécurité
- RLS déjà activée sur email_verifications — conservée
- Politiques existantes conservées

### Notes
- L'expiration reste à 24h (gérée par l'edge function)
- L'usage unique est géré par `used = true` après validation
- L'invalidation des anciens codes se fait via `invalidated = true` lors d'un renvoi
- La limite de tentatives est `max_attempts` (5 par défaut)
- La limite de renvois est de 3 par 24h (calculée par l'edge function)
*/

ALTER TABLE email_verifications ADD COLUMN IF NOT EXISTS attempts integer NOT NULL DEFAULT 0;
ALTER TABLE email_verifications ADD COLUMN IF NOT EXISTS max_attempts integer NOT NULL DEFAULT 5;
ALTER TABLE email_verifications ADD COLUMN IF NOT EXISTS invalidated boolean NOT NULL DEFAULT false;
