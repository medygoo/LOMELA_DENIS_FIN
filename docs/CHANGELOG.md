# SchoolSafe — Changelog

## 2026-10-04 — Lot 0 : Reconstruction de l'application

### Contexte
- Le code source de l'application avait été perdu (projet réinitialisé).
- La base de données Supabase était intacte : 23 tables, 86 politiques RLS, 3 fonctions, 2 edge functions, 5 migrations.
- Données de démonstration préservées : 2 écoles, 2 profils, 1 élève, 1 classe, 1 matière, 1 structure de frais.

### Actions effectuées
- Audit complet de la base de données (tables, colonnes, clés étrangères, RLS, fonctions, index, migrations, edge functions).
- Création de la documentation de reprise (AGENTS.md + 6 fichiers dans docs/).
- Initialisation de Git comme système de mémoire permanent.
- Initialisation du projet Vite + React + TypeScript + Tailwind CSS.
- Installation des dépendances : @supabase/supabase-js, @tanstack/react-query, react-router-dom, lucide-react, date-fns.
- Création du client Supabase (src/lib/supabase.ts).
- Création des types TypeScript pour les 23 tables (src/lib/types.ts).
- Création des constantes et utilitaires (rôles, libellés, formatage FCFA/dates) (src/lib/constants.ts).
- Création du hook d'authentification useAuth avec gestion de session et profil (src/hooks/useAuth.tsx).
- Création des hooks de données useData (stats, students, classes, staff, school year) (src/hooks/useData.ts).
- Création du layout principal avec sidebar filtrée par rôle, header avec slogan, logo officiel (src/components/layout/AppLayout.tsx).
- Création de la page de connexion avec branding SchoolSafe et slogan (src/pages/Login.tsx).
- Création de la page d'inscription d'école via edge function setup-school (src/pages/Register.tsx).
- Création du Dashboard avec statistiques et accès rapide (src/pages/Dashboard.tsx).
- Création de la page Élèves avec recherche et inscription (src/pages/students/StudentsPage.tsx).
- Création de la page Classes avec création (src/pages/classes/ClassesPage.tsx).
- Création de la page Présences avec saisie par classe (src/pages/attendance/AttendancePage.tsx).
- Création de la page Notes & Devoirs (src/pages/grades/GradesPage.tsx).
- Création de la page Finances avec 3 onglets (src/pages/finance/FinancePage.tsx).
- Création de la page Sécurité (entrées/sorties + personnes autorisées) (src/pages/security/SecurityPage.tsx).
- Création de la page Personnel avec ajout (src/pages/staff/StaffPage.tsx).
- Création de la page Paramètres (infos école + années scolaires) (src/pages/settings/SettingsPage.tsx).
- Déploiement de l'edge function setup-school.
- Configuration de l'alias @/ dans Vite et TypeScript.
- Validation : TypeScript compile sans erreur, build Vite réussit.

### État
- Base de données : 100% opérationnelle.
- Application frontend : Lot 0 terminé, 9 pages fonctionnelles.
- Prochain lot : Lot 1 — approfondissement du module Élèves.
