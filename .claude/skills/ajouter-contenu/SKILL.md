---
name: ajouter-contenu
description: Point d'entrée pour ajouter (ou compléter) un contenu fan-made au catalogue des Archives Miskatoniques, depuis un zip Drive ou Discord jusqu'à la mise en ligne. À utiliser quand on demande « ajoute X au site », « publie ce scénario », « nouvelle fiche », ou pour reprendre une fiche à moitié faite.
---

# Ajouter un contenu au catalogue

Orchestre les autres skills du dépôt dans l'ordre. Chaque étape a son propre
skill : lis-le au moment d'y arriver, pas avant.

## 0. Recueillir les infos (une seule série de questions)

Demande uniquement ce qui manque, en un seul message :

- **Titre FR** (et titre VO si traduction).
- **Type** : `scenario`, `campagne`, `investigateurs`, `cartes-joueur`, `autre`.
- **Cycle** (`Cycle N`) ou hors cycle (`null`).
- **Fichiers source** : chemin du ou des zips téléchargés (Drive / Discord).
- **Crédits** : auteur VO (`creator`), traducteur FR (`traducteur`), date de
  publication (`AAAA-MM`), lien du fil forum/Discord (`liens.source`).
- **Contact panier MPC** (pseudo Discord) si connu.

Ce qui peut se lire dans le guide PDF (crédits, date) : propose-le plutôt que
de le demander.

**Refus de principe** : si le contenu reproduit quasi à l'identique des cartes
FFG (texte + gabarit + art officiels, ex. investigateurs parallèles, cartes
Tabou), arrête-toi et signale-le (décision du 2026-09-17 dans `TODO.md`). Les
dos génériques joueur / rencontre restent acceptés.

## 1. Reprise d'une fiche existante

Avant tout, regarde l'état actuel de l'`id` :
`data/catalogue.json`, `data/print-manifest.json`, `dist/print/ahlcg-fr-<id>/`,
`data/synopsis.json`, `img/thumbs/<id>.jpg`. Saute les étapes déjà faites et
dis lesquelles.

## 2. Étapes

Tiens une liste de tâches avec ces étapes :

1. **fiche-catalogue** — créer la fiche en brouillon (`publie: false`,
   `etat: "en-travaux"`, `archive: null`) et `npm run validate`.
2. **preparer-fichiers** — extraire les zips, entrée de manifeste,
   `npm run build:print`, contrôle du staging.
3. **upload-archive** — dry-run, **accord explicite**, upload, vérification.
4. **fiche-catalogue** (2e passage) — renseigner `archive`, `images`,
   `etat: "disponible"`, miniature.
5. **resume-sans-spoil** — résumé pour `data/synopsis.json` (validé par
   l'utilisateur).
6. **preparer-impression** — facultatif : zips MBPrint / MPC.
7. **publier-site** — `publie: true`, validate, diff, **accord**, commit, push.

## 3. Points d'arrêt obligatoires

Ne jamais enchaîner sans réponse explicite de l'utilisateur sur :

- l'upload archive.org (identifiant **immuable**, fichiers publics) ;
- le push git (met le site en ligne) ;
- tout ce qui supprimerait un fichier ou un item.

## 4. Fin

Résume en quelques lignes : URL archive.org, ce qui est en ligne, ce qui reste
(ex. résumé à relire, MBPrint non fait), et ajoute ces restes dans `TODO.md`
s'ils ne seront pas faits tout de suite.
