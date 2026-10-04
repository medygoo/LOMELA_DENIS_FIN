# SchoolSafe — Description du projet

## Concept

SchoolSafe est une plateforme de gestion scolaire multi-écoles, conçue pour le contexte sénégalais/francophone. Elle permet à une école de gérer ses élèves, leur sécurité (entrées/sorties avec QR codes), leur scolarité (classes, notes, devoirs), leurs finances (frais de scolarité, paiements, reçus) et son personnel.

## Objectifs principaux

1. **Gestion des élèves** — inscription, données démographiques, photos, QR codes d'identification.
2. **Sécurité** — suivi des entrées/sorties, personnes autorisées à récupérer les enfants, QR codes.
3. **Scolarité** — classes, matières, affectations enseignants, notes, devoirs, présences.
4. **Finances** — structures de frais, frais par élève, paiements, reçus, statut de paiement.
5. **Personnel** — enseignants et staff, présences du personnel, rôles.
6. **Multi-écoles** — chaque école est isolée via `school_id`, RLS au niveau base de données.
7. **Multi-rôles** — admin/direction, enseignant, parent/tuteur, chacun avec des permissions distinctes.

## Personas / Rôles

| Rôle | Code | Accès |
|------|------|-------|
| Admin / Directeur | `admin_principal` | Tout, toutes les sections |
| Direction | `direction` | Tout sauf gestion financière avancée |
| Enseignant | `enseignant` | Ses classes, notes, devoirs, présences de ses classes |
| Parent / Tuteur | `parent_tuteur` | Ses enfants uniquement : notes, présences, finances, devoirs |

## Écoles de démonstration en base

1. **École Démonstration** (code: `DEMO001`) — Dakar
2. **École Secondaire** (code: `ESC002`)

## Nom du projet

**SchoolSafe** — gestion scolaire sécurisée.
