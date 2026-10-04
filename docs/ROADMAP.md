# SchoolSafe — Roadmap

## Lots de travail

### Lot 0 — Reconstruction de l'application (À DÉMARRER)
- Initialisation Vite + React + TypeScript + Tailwind
- Client Supabase + types
- Authentification (login + setup école)
- Layout + navigation par rôle
- Dashboard

### Lot 1 — Module Élèves
- Liste des élèves (avec recherche, filtre par classe)
- Fiche élève (informations, photo, QR code)
- Inscription d'un élève
- Modification d'un élève
- Liaison élève↔parent
- Génération QR code

### Lot 2 — Module Classes & Matières
- Liste des classes
- Création/édition de classe
- Affectation élèves↔classes
- Liste des matières
- Affectation enseignants↔classes↔matières

### Lot 3 — Module Présences
- Saisie des présences par classe et par date
- Vue calendrier
- Statistiques de présence par élève
- Présences du personnel

### Lot 4 — Module Notes & Devoirs
- Saisie des notes par matière et par classe
- Bulletin de notes par élève
- Devoirs à faire (création, visualisation par classe)
- Moyennes et classements

### Lot 5 — Module Finances
- Structures de frais (création, récurrent/ponctuel)
- Frais par élève (génération automatique)
- Paiements (encaissement, méthode, référence)
- Reçus (génération, impression)
- Statut de paiement (payé/partiel/non payé)
- Tableau de bord financier

### Lot 6 — Module Sécurité
- Entrées/sorties (enregistrement manuel et par QR)
- Personnes autorisées à récupérer les enfants
- QR codes élèves (génération, activation, expiration)
- Historique des entrées/sorties
- Alertes (sortie par personne non autorisée)

### Lot 7 — Module Personnel
- Liste du personnel
- Ajout/édition d'un membre du personnel
- Rôles et permissions
- Présences du personnel (pointage)

### Lot 8 — Paramètres & Administration
- Paramètres de l'école (nom, logo, contact)
- Années scolaires (création, activation)
- Journal d'audit
- Gestion des utilisateurs (création, désactivation)

### Lot 9 — Optimisations & Polish
- Responsive mobile complet
- Mode sombre (optionnel)
- Export PDF (bulletins, reçus, listes)
- Notifications
- Performance (lazy loading, pagination)

## Ordre de priorité

Lot 0 → Lot 1 → Lot 2 → Lot 3 → Lot 4 → Lot 5 → Lot 6 → Lot 7 → Lot 8 → Lot 9

## Statut global

- **Lots terminés** : 0 (base de données uniquement, hors application)
- **Lot en cours** : Lot 0 (reconstruction)
- **Prochain lot** : Lot 0 — initialisation du projet
