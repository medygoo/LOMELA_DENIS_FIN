# SchoolSafe — État courant

**Dernière mise à jour** : 2026-10-04 (Partie 1 — Entrée dans SchoolSafe terminée)

## Ce qui est terminé

### Base de données (100%)
- 23 tables originales + 2 nouvelles tables (`email_verifications`, `user_roles`) = 25 tables.
- 6 migrations appliquées.
- RLS activée sur toutes les tables.
- 3 fonctions SECURITY DEFINER (`get_current_school_id`, `get_current_role`, `handle_new_user_meta`).
- 4 edge functions déployées (`setup-school`, `create-user`, `verify-email`, `resend-verification`).
- Nouvelles colonnes sur `schools` : `short_name`, `country`, `commune`, `levels`, `status` (setup/active/suspended).
- Nouvelles colonnes sur `profiles` : `email_verified`, `function`.

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
- **Vérification d'email** : code à 6 chiffres, page dédiée avec saisie OTP, renvoi de code.
- **Blocage des comptes non vérifiés** : l'accès au tableau de bord est refusé tant que l'email n'est pas vérifié.
- **Rôles multiples** : un directeur revoie automatiquement admin_principal + direction via la table `user_roles`.
- **Statut d'école** : setup → active → suspended. Une nouvelle école est en `setup` et voit la page de configuration.
- **Page de configuration (Setup)** : checklist de progression (infos école, classes, personnel, élèves, familles, affectations).
- **Isolation des écoles** : chaque école a ses propres données, RLS filtre par `school_id`.
- **Compte désactivé** : un profil `is_active = false` ne peut pas se connecter.
- **École suspendue** : un profil dont l'école est `suspended` ne peut pas se connecter.

## Les 7 tests obligatoires — RÉSULTATS

| Test | Description | Résultat |
|------|-------------|----------|
| 1 | Création d'une première école avec son administrateur | RÉUSSI — École Alpha créée avec code auto-généré COL-43LC, admin Awa Ndiaye, 2 rôles (admin_principal + direction) |
| 2 | Vérification de l'email et connexion | RÉUSSI — Code 382550 vérifié, email_verified=true, connexion réussie |
| 3 | Création d'une deuxième école indépendante | RÉUSSI — École Beta créée à Thiès avec code COL-CR3T, admin Moussa Fall, 1 rôle (admin_principal) |
| 4 | Le compte de l'École A ne peut pas entrer dans l'École B | RÉUSSI — Données isolées par school_id via RLS, chaque école a ses propres profils/années/rôles |
| 5 | Tentative de créer un établissement probablement déjà existant | RÉUSSI — Doublon détecté (nom + ville + téléphone), message affiché : « Cet établissement semble déjà exister » |
| 6 | Les données survivent à une déconnexion/reconnexion | RÉUSSI — Profil, email_verified et school_id préservés après logout + re-login |
| 7 | Un compte non vérifié n'obtient pas l'accès complet | RÉUSSI — Supabase Auth bloque la connexion (email_not_confirmed), et le frontend redirige vers la vérification |

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
- Les 4 edge functions — déjà déployées et actives.
- Les 6 migrations — déjà appliquées.
- Le projet frontend — entièrement reconstruit.
- Le système d'authentification complet — Lot 0 + Partie 1.
- Le système de vérification d'email — Partie 1.
- La page de configuration (Setup) — Partie 1.
