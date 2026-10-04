# SchoolSafe — Changelog

## 2026-10-04 — Session de reprise après perte de code

### Contexte
- Le code source de l'application a été perdu (projet réinitialisé).
- La base de données Supabase est intacte : 23 tables, 86 politiques RLS, 3 fonctions, 2 edge functions, 5 migrations.
- Données de démonstration préservées : 2 écoles, 2 profils, 1 élève, 1 classe, 1 matière, 1 structure de frais.

### Actions effectuées
- Audit complet de la base de données (tables, colonnes, clés étrangères, RLS, fonctions, index, migrations, edge functions).
- Création de la documentation de reprise :
  - `AGENTS.md` — règle permanente de reprise.
  - `docs/PROJECT.md` — description du projet.
  - `docs/ARCHITECTURE.md` — stack technique et structure de la base.
  - `docs/DECISIONS.md` — décisions verrouillées.
  - `docs/CURRENT_STATE.md` — état courant et prochain travail.
  - `docs/ROADMAP.md` — plan par lots.
  - `docs/CHANGELOG.md` — cet fichier.
- Initialisation de Git comme système de mémoire permanent.

### État
- Base de données : 100% opérationnelle.
- Application frontend : 0% — à reconstruire (Lot 0).
