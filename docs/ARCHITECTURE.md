# SchoolSafe — Architecture technique

## Stack

- **Frontend** : React + Vite + TypeScript
- **UI** : Tailwind CSS + composants shadcn/ui (à confirmer au moment de la reconstruction)
- **Backend** : Supabase (Postgres + Auth + Edge Functions + Storage)
- **State** : React Query (TanStack Query) pour les données serveur, useState/local pour l'UI
- **Routing** : React Router

## Structure du code (cible)

```
src/
  lib/
    supabase.ts          — client Supabase
    auth.ts              — helpers d'authentification
    types.ts             — types TypeScript générés du schéma
  components/
    ui/                  — composants réutilisables (boutons, inputs, modals)
    layout/              — layout principal, sidebar, header
  pages/
    Login.tsx
    Dashboard.tsx
    students/            — liste, détail, inscription
    classes/             — liste, détail
    attendance/          — présences
    grades/              — notes
    finance/             — frais, paiements, reçus
    staff/               — personnel
    security/            — entrées/sorties, personnes autorisées
    settings/            — paramètres école
  hooks/
    useAuth.ts
    useSchool.ts
    useStudents.ts
    ...
  App.tsx
  main.tsx
```

## Base de données Supabase

### Tables (23)

| Table | Rôle | Colonnes clés |
|-------|------|---------------|
| `schools` | Écoles | id, name, code, address, city, phone, email, logo_url, is_active |
| `school_years` | Années scolaires | id, school_id, name, start_date, end_date, is_current |
| `profiles` | Profils utilisateurs | id (= auth.uid), school_id, email, first_name, last_name, role, is_active |
| `staff` | Personnel | id, school_id, user_id, first_name, last_name, role, hire_date |
| `students` | Élèves | id, school_id, first_name, last_name, birth_date, gender, enrollment_number, qr_token, photo_url |
| `guardians` | Parents/tuteurs | id, school_id, user_id, first_name, last_name, relationship, phone, email |
| `student_guardians` | Lien élève↔parent | student_id, guardian_id, relationship_type, is_primary |
| `classes` | Classes | id, school_id, school_year_id, name, level, capacity, room |
| `class_students` | Lien élève↔classe | class_id, student_id, enrolled_at, is_active |
| `subjects` | Matières | id, school_id, name, code, coefficient |
| `teacher_assignments` | Affectations | teacher_id, class_id, subject_id, school_year_id |
| `attendance` | Présences élèves | student_id, class_id, date, status, recorded_by |
| `grades` | Notes | student_id, subject_id, class_id, teacher_id, score, max_score, grade_type, term |
| `homework` | Devoirs à faire | class_id, subject_id, teacher_id, title, description, due_date |
| `fee_structures` | Structures de frais | school_id, school_year_id, name, amount, fee_type, due_date, is_recurring |
| `student_fees` | Frais par élève | student_id, fee_structure_id, amount, amount_paid, status |
| `payments` | Paiements | student_fee_id, student_id, amount, payment_method, payment_date, reference |
| `receipts` | Reçus | payment_id, receipt_number, issued_at, issued_by |
| `entries_exits` | Entrées/sorties | student_id, type (entry/exit), timestamp, authorized_person_id, method |
| `authorized_persons` | Personnes autorisées | student_id, first_name, last_name, relationship, phone, id_number, photo_url, qr_code |
| `qr_codes` | QR codes élèves | student_id, token, is_active, expires_at |
| `staff_attendance` | Présences personnel | staff_id, date, check_in_time, check_out_time, status |
| `audit_log` | Journal d'audit | actor_id, action, entity_type, entity_id, details (jsonb) |

### Fonctions SQL (SECURITY DEFINER)

- `get_current_school_id()` — retourne le school_id du profil de l'utilisateur connecté
- `get_current_role()` — retourne le rôle du profil de l'utilisateur connecté
- `handle_new_user_meta()` — trigger qui crée un profil à partir des métadonnées d'inscription

### RLS (Row Level Security)

- **23 tables** avec RLS activé.
- **86 politiques** au total (4 par table CRUD, 2 pour schools/audit_log/entries_exits/receipts).
- Toutes les politiques filtrent par `school_id = get_current_school_id()`.
- Les rôles déterminent les permissions (SELECT/INSERT/UPDATE/DELETE) par table.
- `TO authenticated` sur toutes les politiques.

### Migrations appliquées (5)

1. `001_create_tables.sql` — création des 23 tables + index
2. `002_rls_policies.sql` — RLS + politiques
3. `003_auto_app_metadata.sql` — fonction `handle_new_user_meta` + trigger
4. `004_fix_students_recursion.sql` — correction récursion RLS students
5. `005_fix_recursion_add_school_id.sql` — ajout school_id aux tables de liaison

### Edge Functions déployées (2)

1. `setup-school` (verify_jwt: false) — crée une école + année scolaire + profil admin
2. `create-user` (verify_jwt: true) — crée un utilisateur Supabase Auth + profil

### Index (32 index secondaires)

Index sur school_id, student_id, class_id, teacher_id, token, code, dates — pour performance des requêtes filtrées.

## Authentification

- Supabase Auth email/mot de passe.
- Email confirmation désactivée.
- À l'inscription, `handle_new_user_meta()` crée automatiquement un profil.
- L'edge function `setup-school` crée l'école + l'admin initial.
- L'edge function `create-user` crée des utilisateurs supplémentaires (enseignants, parents).

## Conventions

- **Langue** : interface en français.
- **Devise** : FCFA (XOF).
- **Format dates** : JJ/MM/AAAA.
- **Nommage tables** : snake_case, pluriel.
- **Nommage composants** : PascalCase.
- **Nommage fonctions/hooks** : camelCase, préfixe `use` pour les hooks.
