# SchoolSafe — Changelog

## 2026-10-04 — Partie 1 : Entrée dans SchoolSafe

### Migration de base de données (006_school_setup_email_verification.sql)
- Ajout colonnes `schools` : `short_name`, `country`, `commune`, `levels`, `status` (default 'setup').
- Ajout colonnes `profiles` : `email_verified` (default false), `function`.
- Nouvelle table `email_verifications` (code à 6 chiffres, expiration 24h).
- Nouvelle table `user_roles` (rôles multiples par utilisateur, unicité user+school+role).
- RLS + politiques sur les 2 nouvelles tables.
- Index sur `email_verifications.user_id` et `user_roles.user_id/school_id`.

### Edge functions
- **setup-school** (refonte) : 3 étapes (école, année, responsable), génération auto du code école, détection de doublons (nom+ville+téléphone/email), code de vérification email, rôles multiples (Directeur → admin_principal + direction), rollback en cas d'erreur, `email_confirm: false` pour forcer la vérification.
- **verify-email** (nouvelle) : validation du code à 6 chiffres, marquage `email_verified = true` dans profiles, `email_confirm: true` dans Supabase Auth.
- **resend-verification** (nouvelle) : génère et envoie un nouveau code, renvoie l'email Supabase.

### Frontend
- **Register** : refonte en 3 étapes avec stepper visuel (Établissement → Année → Responsable), nouveaux champs (pays, commune, niveaux, nom court, fonction, confirmation mot de passe), redirection vers la page de vérification.
- **VerifyEmail** : nouvelle page avec saisie OTP à 6 chiffres, gestion du paste, renvoi de code, affichage du code en mode développement.
- **Login** : ajout de la vérification `email_verified` et `is_active` après connexion, message et redirection vers verify-email si non vérifié, message si compte désactivé ou école suspendue.
- **useAuth** : ajout de `school` dans le contexte, vérification email_verified/is_active/status école lors du signIn, signOut automatique si accès refusé.
- **Setup** : nouvelle page d'accueil de configuration avec checklist de progression (6 étapes), message de bienvenue, barre de progression.
- **AppLayout** : ajout du nom de l'école et badge de statut dans le header, entrée "Configuration" dans la sidebar.
- **App.tsx** : routes pour /verify-email et /setup, redirection automatique vers /setup si école en statut 'setup'.
- **types.ts** : ajout de `SchoolStatus`, `EmailVerification`, `UserRoleEntry`, nouveaux champs sur `School` et `Profile`.

### Tests
- 7 tests obligatoires exécutés et tous réussis (voir CURRENT_STATE.md pour le détail).

## 2026-10-04 — Lot 0 : Reconstruction de l'application

(Voir version précédente — reconstruction complète après perte de code)
