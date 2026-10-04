# SchoolSafe — État courant

**Dernière mise à jour** : 2026-10-04 (Partie 2 — Personnel, comptes et rôles)

PARTIE 1 — ENTRÉE DANS SCHOOLSAFE : VALIDÉE

PARTIE 2 — PERSONNEL, COMPTES ET RÔLES : TERMINÉE

## Ce qui est terminé

### Base de données
- 25 tables + migrations 008 et 009 appliquées (total: 9 migrations).
- RLS activée sur toutes les tables.
- 5 fonctions SECURITY DEFINER :
  - `get_current_school_id`, `get_current_role`, `handle_new_user_meta` (existantes)
  - `audit_action` (nouvelle — journalisation automatique)
  - `check_last_admin_principal` (nouvelle — protection dernier admin)
  - `get_user_roles` (nouvelle — récupération des rôles d'un utilisateur)
- 6 edge functions déployées : `setup-school`, `verify-email`, `resend-verification`, `create-user`, `reset-user-password`, `change-password`.
- Nouvelles colonnes sur `profiles` : `must_change_password`, `matricule`, `hire_date`, `photo_url`.
- Nouvelles colonnes sur `staff` : `matricule`, `photo_url`, `function`.
- RLS mise à jour sur `profiles` et `user_roles` pour permettre aux admins de gérer les utilisateurs de leur école.
- GRANT UPDATE sur `profiles` pour le rôle `authenticated` (correction migration 009).

### Partie 1 — Entrée dans SchoolSafe (100%)
- Page d'entrée, inscription école en 3 étapes, vérification e-mail sécurisée, connexion, isolation, rôles multiples, statut setup.

### Partie 2 — Personnel, comptes et rôles (100%)
- **Module Personnel complet** : liste, ajout, modification, activation/désactivation, gestion des rôles, réinitialisation de mot de passe.
- **7 rôles supportés** : admin_principal, direction, enseignant, surveillant, gardien, caisse, parent_tuteur.
- **Création de comptes par l'administrateur** : l'admin saisit l'identité, l'email, le(s) rôle(s). Un mot de passe temporaire sécurisé est généré automatiquement (format: Ss-XXXXXX-XX).
- **Mot de passe temporaire affiché une seule fois** à l'administrateur, jamais stocké en clair.
- **must_change_password** : à la première connexion, l'utilisateur est forcé de changer son mot de passe avant d'accéder au tableau de bord.
- **Page de changement de mot de passe** : nouveau mot de passe + confirmation, règles de sécurité (min 8 caractères, 1 lettre, 1 chiffre).
- **Réinitialisation par l'administrateur** : génère un nouveau mot de passe temporaire, remet must_change_password = true, révoque les sessions.
- **Désactivation/Réactivation** : un compte désactivé ne peut plus se connecter. L'historique est conservé.
- **Protection du dernier admin_principal** : impossible de désactiver ou retirer le rôle du dernier administrateur principal actif.
- **Audit log** : création, modification, activation, désactivation, réinitialisation mot de passe, changement de rôles — tous journalisés avec acteur, action, cible, école, date.
- **Isolation RLS** : un admin de l'école A ne peut ni voir, ni créer, ni modifier, ni réinitialiser les utilisateurs de l'école B.
- **Multi-rôles** : une personne peut avoir plusieurs rôles (ex: direction + enseignant). Un seul compte, plusieurs rôles dans user_roles.
- **Navigation par rôles** : la sidebar affiche les modules selon les rôles de l'utilisateur (gardien → sécurité, caisse → finances, surveillant → présences + sécurité, etc.).

### Git
- Dépôt Git initialisé localement (branche `main`).
- **GitHub non connecté** : la connexion GitHub doit être effectuée via l'interface Bolt.

## Tests Partie 2 — RÉSULTATS (2026-10-04)

| Test | Description | Résultat |
|------|-------------|----------|
| 1 | Admin école A se connecte | RÉUSSI |
| 2 | Admin crée un enseignant, mot de passe temporaire généré | RÉUSSI |
| 3 | Enseignant se connecte avec mot de passe temporaire | RÉUSSI |
| 4 | must_change_password = true détecté | RÉUSSI |
| 5 | Enseignant change son mot de passe | RÉUSSI |
| 6 | Reconnexion avec nouveau mot de passe réussie | RÉUSSI |
| 7 | Ancien mot de passe temporaire refusé | RÉUSSI |
| 8 | Admin crée un gardien | RÉUSSI |
| 9 | Gardien ne peut pas modifier les profils (RLS) | RÉUSSI |
| 10 | Admin crée un surveillant | RÉUSSI |
| 11 | Admin crée une personne avec deux rôles (direction + enseignant) | RÉUSSI |
| 12 | Les deux rôles sont retrouvés après connexion | RÉUSSI |
| 13 | Admin réinitialise le mot de passe d'un utilisateur | RÉUSSI |
| 14 | Nouveau mot de passe temporaire fonctionne | RÉUSSI |
| 15 | must_change_password = true après reset | RÉUSSI |
| 16 | Désactivation bloque le profil (is_active = false) | RÉUSSI |
| 17 | Réactivation fonctionne (is_active = true) | RÉUSSI |
| 18 | École A ne peut pas gérer les utilisateurs de l'école B | RÉUSSI |
| 19 | Impossible de désactiver le dernier admin_principal | RÉUSSI |
| 20 | Build TypeScript/Vite réussi | RÉUSSI |

## Le prochain travail logique

En attente de l'autorisation de l'utilisateur. Les modules suivants sont prêts à être développés :
- Partie 3 — Classes, matières, affectation enseignant/classe/matière
- Partie 4 — Inscription complète des élèves, liaison parent/enfant
- Partie 5 — Présences (saisie, QR, statistiques)
- Partie 6 — Notes & Devoirs
- Partie 7 — Finances détaillées
- Partie 8 — Sécurité (QR, entrées/sorties, personnes autorisées)
- Partie 9 — Familles détaillées
- Partie 10 — Paramètres & Administration

## Ce qui ne doit surtout pas être recréé

- Les 25 tables de base de données — déjà créées et peuplées.
- Les 9 migrations — déjà appliquées.
- Les politiques RLS — déjà appliquées et fonctionnelles.
- Les 5 fonctions SQL — déjà déployées.
- Les 6 edge functions — déjà déployées et actives.
- Le projet frontend — entièrement reconstruit.
- Le système d'authentification complet — Partie 1.
- Le système de vérification d'email sécurisé — Partie 1.
- Le module Personnel complet avec création de comptes, rôles, mot de passe temporaire, changement forcé — Partie 2.
- Le système de gestion des rôles multi-rôles — Partie 2.
- Le système de réinitialisation de mot de passe par l'administrateur — Partie 2.
- La protection du dernier admin_principal — Partie 2.
- Le système d'audit — Partie 2.
- La page de changement de mot de passe forcé — Partie 2.
