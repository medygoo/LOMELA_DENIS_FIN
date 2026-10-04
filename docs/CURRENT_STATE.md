# SchoolSafe — État courant

**Dernière mise à jour** : 2026-10-04 (Correction Partie 2)

PARTIE 1 — ENTRÉE DANS SCHOOLSAFE : VALIDÉE

PARTIE 2 — PERSONNEL, COMPTES ET RÔLES : TERMINÉE + CORRECTIONS APPLIQUÉES

## Corrections appliquées (Partie 2 — Correction)

### A — Connexion email OU téléphone
- `profiles.email` est maintenant nullable (comptes téléphone-only possibles).
- `create-user` crée des comptes avec email OU téléphone (normalisation +243).
- `Login` accepte email ou téléphone dans le même champ.
- `useAuth` ajoute `signInWithPhone()` pour la connexion par téléphone.
- `StaffPage` : le formulaire accepte email OU téléphone (au moins un obligatoire).
- **Limite connue** : Phone logins sont désactivés au niveau du projet Supabase (Dashboard > Authentication > Providers > Phone doit être activé pour utiliser la connexion par téléphone). Le code supporte correctement le téléphone, la limite est côté config Supabase.

### B — RLS renforcé
- `profiles` SELECT : uniquement le propre profil OU admin_principal.
- `user_roles` SELECT : uniquement ses propres rôles OU admin_principal.
- `staff` SELECT : admin_principal et direction uniquement.
- `profiles` INSERT/UPDATE : admin_principal uniquement.
- `user_roles` INSERT/UPDATE/DELETE : admin_principal uniquement.
- `staff` INSERT/UPDATE : admin_principal uniquement.
- Fonction `is_admin_principal()` (SECURITY DEFINER) pour éviter la récursion RLS.
- Gardien, surveillant, enseignant, caisse, parent_tuteur ne peuvent pas lire les profils des autres.

### C — Gestion des comptes = admin_principal uniquement
- `create-user` : seul admin_principal peut créer des utilisateurs.
- `reset-user-password` : seul admin_principal peut réinitialiser.
- `user_roles` modification : seul admin_principal peut ajouter/retirer des rôles.
- `profiles` modification : seul admin_principal peut activer/désactiver.
- `direction` ne peut plus créer, modifier, reset, ni gérer les rôles.

### D — Rôles corrigés
- `RolesModal` : utilise `useEffect` pour synchroniser les rôles chargés (au lieu de `useState`).
- Validation : impossible de laisser zéro rôle actif (frontend + edge function).
- Protection du dernier admin_principal : trigger DB `prevent_last_admin_removal()` qui bloque DELETE et UPDATE is_active=false même par appel direct REST.

### E — Mot de passe temporaire cryptographique
- `crypto.getRandomValues()` remplace `Math.random()` dans `create-user` et `reset-user-password`.

### F — Sessions après reset — honnêtement documenté
- `reset-user-password` retourne `session_revocation: "limited"`.
- Supabase admin API ne permet pas de révoquer proprement les sessions par ID utilisateur dans cette architecture.
- `must_change_password = true` force le changement à la prochaine connexion.
- L'ancien mot de passe ne fonctionne plus pour de nouvelles connexions.
- Les sessions existantes peuvent rester valides jusqu'à l'expiration naturelle du JWT.

## Migrations appliquées (11 total)
1-7 : Voir Partie 1.
8 : `008_staff_management_password_reset` — colonnes, fonctions, RLS initial.
9 : `009_fix_profiles_update_grant` — GRANT UPDATE.
10 : `010_correction_part2_rls_phone_admin` — RLS renforcé, email nullable, surveillant CHECK, trigger dernier admin.
11 : `011_fix_rls_recursion` — fonction is_admin_principal, fix récursion RLS.

## Edge Functions (6)
- `setup-school`, `verify-email`, `resend-verification` (Partie 1).
- `create-user` (corrigé : email OU téléphone, admin_principal only, crypto).
- `reset-user-password` (corrigé : admin_principal only, crypto, session_revocation honest).
- `change-password` (Partie 2, inchangé).

## Tests de correction — RÉSULTATS

| Test | Description | Résultat |
|------|-------------|----------|
| 1 | Création compte avec email seulement | RÉUSSI |
| 2 | Création compte avec téléphone seulement | RÉUSSI |
| 3 | Connexion avec email | RÉUSSI |
| 4 | Connexion avec téléphone | LIMITÉ — Phone logins désactivés au niveau Supabase (config, pas code) |
| 5 | Changement obligatoire du mot de passe | RÉUSSI |
| 6 | Ancien temporaire refusé après changement | RÉUSSI |
| 7 | Direction ne peut pas créer utilisateurs | RÉUSSI |
| 8 | Direction ne peut pas reset passwords | RÉUSSI |
| 9 | Direction ne voit que son propre profil | RÉUSSI |
| 10 | Gardien ne peut pas lire autres profils | RÉUSSI |
| 11 | Admin principal peut gérer les comptes | RÉUSSI |
| 12 | Admin principal voit tous les profils | RÉUSSI |
| 13 | Dernier admin principal impossible à supprimer (DB trigger) | RÉUSSI |
| 14 | Multi-rôles correctement chargés | RÉUSSI |
| 15 | Zéro rôle impossible | RÉUSSI |
| 16 | Isolation école A / école B | RÉUSSI |
| 17 | Build TypeScript/Vite | RÉUSSI |
| 18 | crypto.getRandomValues() pour mot de passe temporaire | RÉUSSI |
| 19 | Session revocation honnêtement documentée | RÉUSSI |

## Git
- Commit local appliqué.
- **GitHub** : la connexion doit se faire via l'interface Bolt (le terminal n'a pas de credentials GitHub).
