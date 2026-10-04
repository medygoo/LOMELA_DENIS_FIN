# SchoolSafe — Changelog

## 2026-10-04 — Partie 1 : Correction vérification e-mail

### Migration de base de données (007_email_verification_security.sql)
- Ajout colonnes `email_verifications` : `attempts` (int, default 0), `max_attempts` (int, default 5), `invalidated` (boolean, default false).

### Edge functions — sécurisation
- **setup-school** : le code de vérification n'est plus retourné dans la réponse API. Le code est stocké en base et un email de confirmation Supabase est envoyé.
- **verify-email** : ajout du comptage des tentatives. Après chaque code incorrect, `attempts` est incrémenté. À 5 tentatives, le code est invalidé. Messages d'erreur avec décompte des tentatives restantes. Code trouvé uniquement si `used=false`, `invalidated=false`, non expiré.
- **resend-verification** : le code n'est plus retourné dans la réponse. Invalidation de tous les codes précédents actifs (`invalidated=true`). Limite de 3 renvois par 24h. Nouveau code généré avec `attempts=0`.

### Frontend
- **Register** : `verificationCode` n'est plus passé à la page de vérification. Les dates de début et fin d'année scolaire sont maintenant obligatoires (la base de données les requiert).
- **VerifyEmail** : suppression de l'affichage du code en mode développement. Ajout d'une info box expliquant la vérification par lien. Les inputs OTP sont responsive (plus petits sur mobile). Message de confirmation après renvoi.
- **Login** : le message de non-vérification mentionne le lien ET le code.
- **useAuth** : détection de l'erreur `email_not_confirmed` de Supabase Auth → redirection vers verify-email. Synchronisation de `profiles.email_verified` si Supabase Auth a confirmé l'email via le lien.

### Tests
- 10 tests de sécurité exécutés et tous réussis (voir CURRENT_STATE.md).

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
