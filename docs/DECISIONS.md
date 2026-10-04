# SchoolSafe — Décisions verrouillées

Les décisions ci-dessous sont prioritaires et ne doivent pas être contredites sans demande explicite de l'utilisateur.

## D1 — Stack technique
- React + Vite + TypeScript + Tailwind CSS.
- Supabase pour tout le backend (DB, Auth, Edge Functions, Storage).
- Pas de backend custom en dehors des Edge Functions Supabase.

## D2 — Authentification
- Email/mot de passe uniquement (pas de magic link, pas de réseaux sociaux).
- Email confirmation désactivée.
- Le profil est créé automatiquement via trigger `handle_new_user_meta`.

## D3 — Multi-écoles
- Chaque table a un `school_id`.
- L'isolation est enforced par RLS (`school_id = get_current_school_id()`).
- Une école = un `school_id`. Un utilisateur = un profil = un school_id.

## D4 — Rôles
- 7 rôles : `admin_principal`, `direction`, `enseignant`, `surveillant`, `gardien`, `caisse`, `parent_tuteur`.
- Un utilisateur peut avoir plusieurs rôles dans la même école (table `user_roles`).
- Un seul compte Supabase Auth par personne, même avec plusieurs fonctions.
- Les permissions sont gérées au niveau RLS, pas dans le frontend.
- Le frontend masque/affiche les sections selon les rôles mais la sécurité est en base.
- Protection du dernier admin_principal actif (fonction `check_last_admin_principal`).
- Les comptes sont créés par l'administrateur (pas d'inscription autonome pour le personnel).
- Mot de passe temporaire généré automatiquement, changement forcé à la première connexion.

## D5 — Langue et devise
- Interface en français.
- Devise FCFA (XOF).
- Format de date français.

## D6 — Edge Functions
- `setup-school` : publique (verify_jwt: false), crée école + admin.
- `create-user` : authentifiée (verify_jwt: true), crée utilisateurs.
- Toutes les réponses incluent les headers CORS.

## D7 — Pas de récursion RLS
- Les tables de liaison (student_guardians, class_students, etc.) ont un `school_id` direct pour éviter la récursion RLS.
- Ne pas supprimer ce pattern.

## D8 — Git comme mémoire
- Git est initialisé dans le projet.
- Chaque lot de travail est commité avec un message descriptif.
- La documentation dans `docs/` est la source de vérité pour la reprise.
- Ne jamais `git reset --hard` ou `git push --force`.

## D9 — Ne jamais supprimer de données
- Pas de DROP TABLE, DROP COLUMN, DELETE de colonnes.
- Les migrations sont additives uniquement.
- Les données existantes en base sont précieuses et non récupérables.


## D10 — Logo officiel
- Le logo officiel SchoolSafe est `public/schoolsafe-logo.jpg`.
- Bolt doit utiliser cet asset pour l'identité visuelle principale de SchoolSafe.
- Ne pas substituer un autre logo sans décision explicite de l'utilisateur.
