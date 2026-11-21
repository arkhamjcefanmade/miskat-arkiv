---
name: publier-site
description: Mettre en ligne une fiche sur le site GitHub Pages des Archives Miskatoniques (publie: true, validation, commit ciblé, push) puis vérifier l'affichage. À utiliser en dernière étape d'ajout de contenu, ou pour publier toute modification des fichiers data/.
---

# Publier sur le site

Le site est statique : tout `git push` sur la branche principale part en ligne
via GitHub Pages (https://arkhamjcefanmade.github.io/miskat-arkiv/).

## 1. Préparer

- Passe la fiche en `publie: true` (et `etat: "disponible"` si `archive` est
  rempli) — skill fiche-catalogue.
- `npm run validate` : zéro erreur, aucun avertissement nouveau (deux sont
  connus, voir le skill fiche-catalogue).
- Vérifie que chaque fichier cité dans `archive` existe bien sur archive.org
  (`ia list ahlcg-fr-<id>`) et que `img/thumbs/<id>.jpg` existe si `image` est
  renseigné.
- Facultatif mais conseillé : servir le site en local (`npx serve -l 4321 .`,
  config `.claude/launch.json`) et ouvrir `index.html` et
  `item.html?id=<id>` pour voir la fiche.

## 2. Commit ciblé

```bash
git status --short
git diff -- data/ tools/make-thumbs.mjs CLAUDE.md
```

- N'ajoute **que** les fichiers de cette fiche : `data/catalogue.json`,
  `data/synopsis.json`, `data/print-manifest.json`, `data/mbprint-rules.json`,
  `img/thumbs/<id>.jpg`, `img/covers/…`, `tools/make-thumbs.mjs`, `CLAUDE.md`
  si besoin. Jamais `git add -A` / `git add .` : le dépôt contient souvent des
  fichiers non suivis sans rapport (PDF, zips d'outils).
- Ne versionne jamais `data/print-manifest.local.json`, `dist/`, ni un fichier
  d'identifiants (`.gitignore` les couvre ; vérifie quand même).
- Message en français, à l'impératif, sur le modèle de l'historique
  (`git log --oneline -10`), ex. `Ajoute la fiche Le Festival (Cycle 1)`.

## 3. Accord puis push

Montre le résumé du diff (fiches ajoutées / modifiées) et demande un accord
explicite avant `git push`. Pas de `--force`.

Si le shell utilisé ne peut pas supprimer de fichiers (git laisse alors des
`.lock` dans `.git`), ne force rien : donne à l'utilisateur les commandes
`git add … && git commit -m "…" && git push` à lancer dans son terminal.

## 4. Vérifier en ligne

GitHub Pages met une à quelques minutes à se mettre à jour. Ensuite :

- `https://arkhamjcefanmade.github.io/miskat-arkiv/data/catalogue.json`
  contient la fiche avec `publie: true` ;
- la fiche apparaît sur la page d'accueil et son bouton de téléchargement
  pointe vers `archive.org/download/ahlcg-fr-<id>/…`.

Termine en donnant le lien de la fiche.

## Git depuis la VM de Claude

Dans le dossier, les fichiers sont en CRLF (extraction Windows) alors que le
dépôt est en LF. Sans réglage, `git diff` / `git status` dans la VM montrent des
fichiers entiers modifiés. Utilise toujours :

```bash
git -c core.autocrlf=input diff --stat
```

(et le même `-c` pour `git add`). Ne committe pas depuis la VM : un commit y
écrirait du CRLF dans le dépôt, et la suppression de fichiers y est interdite
(verrous `.git/*.lock`). Prépare le `git add` ciblé et le message, et laisse
l'utilisateur les lancer dans son terminal Windows.
