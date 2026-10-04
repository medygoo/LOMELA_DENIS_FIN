# SchoolSafe — Règle permanente de reprise

## Procédure obligatoire à chaque nouvelle session

Avant toute création ou modification de code :

1. Vérifier `git log --oneline -10` et `git status`.
2. Lire tous les fichiers du dossier `docs/` :
   - `PROJECT.md` — description du projet, objectifs, personas.
   - `ARCHITECTURE.md` — stack technique, structure du code, conventions.
   - `DECISIONS.md` — décisions verrouillées (ne pas contredire).
   - `CURRENT_STATE.md` — ce qui est terminé, en cours, et le prochain lot.
   - `ROADMAP.md` — plan global et lots restants.
   - `CHANGELOG.md` — historique des changements par lot.
3. Examiner le code réellement présent dans `src/`.
4. Comparer la documentation avec le code réel.
5. Identifier exactement :
   - ce qui est terminé ;
   - ce qui est partiellement terminé ;
   - ce qui reste à faire ;
   - le dernier lot terminé ;
   - le lot actuellement en cours ;
   - le prochain travail logique.

## Règle absolue

- Ne JAMAIS recommencer SchoolSafe depuis zéro.
- Ne JAMAIS recréer une fonction, page, table, composant, route, politique RLS ou module qui existe déjà.
- Si quelque chose existe mais est incomplet, continuer et améliorer l'existant.
- Le dépôt Git et le code réel sont la preuve de ce qui a déjà été réalisé.
- Les décisions les plus récentes dans `DECISIONS.md` sont prioritaires et verrouillées.

## Avant de coder

Bolt doit pouvoir répondre intérieurement à :

- Où le projet s'est-il arrêté ?
- Quel est le dernier commit ?
- Quel travail existe déjà ?
- Quel lot est en cours ?
- Qu'est-ce qui ne doit surtout pas être recréé ?
- Quelle est exactement la prochaine tâche ?

## Fin de chaque lot

Après un lot terminé :

1. Vérifier que l'existant n'a pas été cassé (build, tests si disponibles).
2. Mettre à jour `CURRENT_STATE.md`.
3. Mettre à jour `CHANGELOG.md`.
4. Mettre à jour `ROADMAP.md` si nécessaire.
5. `git add -A && git commit -m "lot X: description"`.
6. Indiquer clairement le prochain lot.

Ainsi, une nouvelle session peut reprendre exactement là où la précédente s'est arrêtée, sans dépendre de la mémoire de conversation.


## Identité visuelle officielle

- Le logo officiel SchoolSafe à utiliser par Bolt et par l'application est `public/schoolsafe-logo.jpg`.
- Ne pas recréer, remplacer ou redessiner ce logo sans demande explicite de l'utilisateur.
- Si un ancien visuel ou une photo générique existe dans `public/`, ce fichier officiel est prioritaire pour l'identité SchoolSafe.
