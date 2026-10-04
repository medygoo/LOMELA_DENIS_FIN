# SchoolSafe — État courant

**Dernière mise à jour** : 2026-10-04 (Partie 1 — Correction vérification e-mail)

## Ce qui est terminé

### Base de données (100%)
- 23 tables originales + 2 nouvelles tables (`email_verifications`, `user_roles`) = 25 tables.
- 7 migrations appliquées (dont 007_email_verification_security.sql).
- RLS activée sur toutes les tables.
- 3 fonctions SECURITY DEFINER (`get_current_school_id`, `get_current_role`, `handle_new_user_meta`).
- 3 edge functions déployées (`setup-school`, `verify-email`, `resend-verification`).
- Nouvelles colonnes sur `schools` : `short_name`, `country`, `commune`, `levels`, `status` (setup/active/suspended).
- Nouvelles colonnes sur `profiles` : `email_verified`, `function`.
- Nouvelles colonnes sur `email_verifications` : `attempts`, `max_attempts`, `invalidated`.

### Code frontend — Lot 0 (100%)
- Projet Vite + React + TypeScript + Tailwind CSS.
- Client Supabase, types TypeScript (25 tables).
- Layout avec sidebar par rôle, header avec slogan et logo.
- 9 pages de modules (dashboard, élèves, classes, présences, notes, finances, sécurité, personnel, paramètres).

### Partie 1 — Entrée dans SchoolSafe (100%)
- **Page d'entrée** : page de connexion avec logo, slogan, deux actions (Se connecter / Créer mon école).
- **Inscription d'école en 3 étapes** : Établissement → Année scolaire → Premier responsable.
- **Génération automatique du code école** (l'utilisateur ne saisit plus de code manuel).
- **Détection de doublons** : nom + ville + téléphone/email.
- **Vérification d'email sécurisée** :
  - Code à 6 chiffres stocké en base, jamais retourné dans les réponses API.
  - Email réel envoyé via Supabase Auth (lien de confirmation cliquable).
  - Expiration : 24h.
  - Usage unique : `used = true` après validation réussie.
  - Invalidation des anciens codes après renvoi (`invalidated = true`).
  - Limite de tentatives : 5 par code, avec décompte affiché à l'utilisateur.
  - Limite de renvois : 3 codes par 24h.
  - Aucun code de vérification exposé dans le frontend, les réponses API ou les messages.
- **Blocage des comptes non vérifiés** : Supabase Auth bloque (`email_not_confirmed`), le frontend redirige vers la vérification.
- **Synchronisation** : si Supabase Auth confirme l'email (via lien), `profiles.email_verified` est synchronisé à la connexion.
- **Rôles multiples** : un directeur revoie automatiquement admin_principal + direction via la table `user_roles`.
- **Statut d'école** : setup → active → suspended. Une nouvelle école est en `setup` et voit la page de configuration.
- **Page de configuration (Setup)** : checklist de progression (infos école, classes, personnel, élèves, familles, affectations).
- **Isolation des écoles** : chaque école a ses propres données, RLS filtre par `school_id`.
- **Compte désactivé** : un profil `is_active = false` ne peut pas se connecter.
- **École suspendue** : un profil dont l'école est `suspended` ne peut pas se connecter.

## Tests de sécurité — RÉSULTATS (2026-10-04)

| Test | Description | Résultat |
|------|-------------|----------|
| 1 | Code non exposé dans la réponse API | RÉUSSI — `verificationCode` absent de toutes les réponses |
| 2 | Mauvais code refusé | RÉUSSI — « Code incorrect. 4 tentative(s) restante(s). » |
| 3 | Code correct validé | RÉUSSI — `verified: true`, `email_verified: true` |
| 4 | Code déjà utilisé refusé | RÉUSSI — `alreadyVerified: true` (compte déjà vérifié) |
| 5 | Ancien code invalidé après renvoi | RÉUSSI — Anciens codes marqués `invalidated: true` |
| 6 | Limite de tentatives (5 max) | RÉUSSI — Après 5 tentatives, code invalidé |
| 7 | Limite de renvois (3 par 24h) | RÉUSSI — « Trop de demandes de renvoi (3 maximum par 24h) » |
| 8 | Compte non vérifié ne peut pas se connecter | RÉUSSI — Supabase Auth retourne `email_not_confirmed` |
| 9 | Compte vérifié peut se connecter | RÉUSSI — Login réussi, accès au dashboard |
| 10 | Isolation des écoles | RÉUSSI — RLS filtre par `school_id`, pas de fuite |

## Le prochain travail logique

En attente de l'autorisation de l'utilisateur. Les modules suivants sont prêts à être développés :
- Lot 1 — Module Élèves (approfondissement)
- Lot 2 — Module Classes & Matières
- Lot 3 — Module Présences
- Lot 4 — Module Notes & Devoirs
- Lot 5 — Module Finances
- Lot 6 — Module Sécurité
- Lot 7 — Module Personnel
- Lot 8 — Paramètres & Administration
- Lot 9 — Optimisations & Polish

## Ce qui ne doit surtout pas être recréé

- Les 25 tables de base de données — déjà créées et peuplées.
- Les politiques RLS — déjà appliquées et fonctionnelles.
- Les fonctions SQL — déjà déployées.
- Les 3 edge functions — déjà déployées et actives.
- Les 7 migrations — déjà appliquées.
- Le projet frontend — entièrement reconstruit.
- Le système d'authentification complet — Lot 0 + Partie 1.
- Le système de vérification d'email sécurisé — Partie 1 (corrigé).
- La page de configuration (Setup) — Partie 1.
