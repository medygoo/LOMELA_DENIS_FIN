# SchoolSafe — État courant

**Dernière mise à jour** : 2026-10-04 (Lot 0 terminé)

## Ce qui est terminé

### Base de données (100%)
- 23 tables créées avec index et contraintes.
- 5 migrations appliquées avec succès.
- RLS activée sur toutes les tables (86 politiques).
- 3 fonctions SECURITY DEFINER (`get_current_school_id`, `get_current_role`, `handle_new_user_meta`).
- 2 edge functions déployées (`setup-school`, `create-user`).
- Données de démonstration : 2 écoles, 2 années scolaires, 2 profils, 1 élève, 1 classe, 1 matière, 1 structure de frais, 1 frais élève, 1 personne autorisée, 2 entrées d'audit.

### Code frontend — Lot 0 (100%)
- Projet Vite + React + TypeScript + Tailwind CSS initialisé.
- Client Supabase configuré avec variables d'environnement.
- Types TypeScript pour les 23 tables créés.
- Système d'authentification complet :
  - Page de connexion (login) avec branding SchoolSafe et slogan.
  - Page d'inscription d'école (register) avec edge function `setup-school`.
  - Hook `useAuth` avec gestion de session et profil.
  - Protection des routes par authentification.
- Layout principal avec :
  - Sidebar avec navigation filtrée par rôle (4 rôles).
  - Header avec slogan « Chaque enfant protégé, chaque parent informé ».
  - Logo SchoolSafe officiel (`public/schoolsafe-logo.jpg`).
  - Menu mobile responsive.
- Dashboard avec statistiques (élèves, classes, personnel) et accès rapide aux modules.
- Pages de modules créées :
  - **Élèves** : liste, recherche, inscription avec modal.
  - **Classes** : liste, création avec modal.
  - **Présences** : saisie par classe et date, 4 statuts (présent/absent/retard/excusé).
  - **Notes & Devoirs** : consultation des notes et devoirs, filtre par élève.
  - **Finances** : 3 onglets (frais par élève, structures de frais, paiements), résumé financier.
  - **Sécurité** : entrées/sorties récentes, personnes autorisées.
  - **Personnel** : liste, ajout avec modal.
  - **Paramètres** : infos école modifiables, années scolaires.
- Build TypeScript et Vite validés sans erreur.

## Ce qui est en cours

Rien — Lot 0 terminé.

## Le prochain travail logique

### Lot 1 — Module Élèves (approfondissement)
- Fiche détaillée par élève (page dédiée avec route /students/:id)
- Modification d'un élève
- Liaison élève↔parent (guardians + student_guardians)
- Génération QR code par élève
- Upload photo élève
- Filtrage par classe dans la liste

## Ce qui ne doit surtout pas être recréé

- **Les tables de base de données** — déjà créées et peuplées.
- **Les politiques RLS** — déjà appliquées et fonctionnelles.
- **Les fonctions SQL** — déjà déployées.
- **Les edge functions** — déjà déployées et actives (setup-school + create-user).
- **Les migrations** — déjà appliquées, ne pas réappliquer.
- **Le projet frontend** — entièrement reconstruit dans le Lot 0.
- **Le layout et la navigation** — complets avec gestion des rôles.
- **Les types TypeScript** — les 23 tables sont typées.
