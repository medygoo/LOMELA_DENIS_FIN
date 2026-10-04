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
- 4 rôles : `admin_principal`, `direction`, `enseignant`, `parent_tuteur`.
- Les permissions sont gérées au niveau RLS, pas dans le frontend.
- Le frontend masque/affiche les sections selon le rôle mais la sécurité est en base.

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
