# SchoolSafe — État courant

**Dernière mise à jour** : 2026-10-04 (session de reprise après perte de code)

## Ce qui est terminé

### Base de données (100%)
- 23 tables créées avec index et contraintes.
- 5 migrations appliquées avec succès.
- RLS activée sur toutes les tables (86 politiques).
- 3 fonctions SECURITY DEFINER (`get_current_school_id`, `get_current_role`, `handle_new_user_meta`).
- 2 edge functions déployées (`setup-school`, `create-user`).
- Données de démonstration : 2 écoles, 2 années scolaires, 2 profils, 1 élève, 1 classe, 1 matière, 1 structure de frais, 1 frais élève, 1 personne autorisée, 2 entrées d'audit.

### Code frontend (0%)
- **PERDU** — le code source a été réinitialisé. Aucun fichier React/TypeScript ne subsiste.
- Le projet ne contient que : README.md, package-lock.json (vide), .env, 1 photo dans public/.

## Ce qui est en cours

### Lot 0 — Reconstruction de l'application
- **Statut** : à démarrer.
- **Objectif** : reconstruire l'application React depuis zéro en se basant sur le schéma de base de données existant.
- **Étapes** :
  1. Initialiser le projet Vite + React + TypeScript + Tailwind.
  2. Configurer le client Supabase.
  3. Créer les types TypeScript depuis le schéma.
  4. Construire l'authentification (login, inscription école via `setup-school`).
  5. Construire le layout (sidebar, header, navigation par rôle).
  6. Construire le Dashboard.
  7. Construire les pages par module (élèves, classes, présences, notes, finances, sécurité, personnel, paramètres).

## Le prochain travail logique

1. **Initialiser le projet** — `npm create vite`, installer dépendances, Tailwind, React Router, TanStack Query.
2. **Créer `src/lib/supabase.ts`** — client Supabase avec les variables d'environnement.
3. **Créer `src/lib/types.ts`** — types TypeScript pour les 23 tables.
4. **Créer le système d'auth** — page de login, page d'enregistrement d'école, hook `useAuth`.
5. **Créer le layout principal** — sidebar avec navigation par rôle, header avec infos utilisateur.
6. **Créer le Dashboard** — statistiques générales selon le rôle.
7. Puis enchaîner les modules par ordre de priorité (voir ROADMAP.md).

## Ce qui ne doit surtout pas être recréé

- **Les tables de base de données** — déjà créées et peuplées.
- **Les politiques RLS** — déjà appliquées et fonctionnelles.
- **Les fonctions SQL** — déjà déployées.
- **Les edge functions** — déjà déployées et actives.
- **Les migrations** — déjà appliquées, ne pas réappliquer.
