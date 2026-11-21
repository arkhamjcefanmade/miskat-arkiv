---
name: preparer-impression
description: Produire les fichiers d'impression facilitée d'un item (zips « talie » MBPrint, zip MPC Project Helper) à partir de son staging dist/print/. À utiliser après preparer-fichiers, quand on veut proposer l'impression MBPrint ou MPC pour une fiche.
---

# Fichiers d'impression facilitée

Contexte et objectifs : `plan_impression_facilitee.md`. Pré-requis : la fiche
existe dans `data/catalogue.json` et `dist/print/ahlcg-fr-<id>/` contient un
zip de cartes (hors planche).

## MBPrint (prioritaire)

```bash
npm run build:mbprint -- <id>
```

Sortie : `dist/mbprint/ahlcg-fr-<id>/` (un ou plusieurs zips importables via
« Importuj talię (ZIP / JSON) » sur generator.mbprint.pl) et un rapport
`dist/mbprint/_review/<id>.txt`.

### Relire le rapport

Le rapport liste les cartes recto seul et le dos qui leur a été attribué
(`JOUEUR` / `RENCONTRE`). Les erreurs typiques :

- soutiens d'histoire ou faiblesses rangés dans un dossier de scénario, qui
  reçoivent à tort le dos rencontre ;
- un dossier de cartes joueur mal détecté ;
- quantités : toutes les cartes à 1 alors que le zip contient un fichier texte
  du type « Nombres de Cartes à Faire ».

Corrige via `data/mbprint-rules.json` → `items["<id>"]` :

```json
"<id>": {
  "quantitiesFile": "Nombres de Cartes à Faire.txt",
  "playerBack": ["^91 Lame de la Sororit"],
  "playerDir": "(?!)"
}
```

- `quantitiesFile` : fichier du zip listant les exemplaires (« En 3x : - Nom ») ;
- `playerBack` : regex (sur le nom de fichier) des cartes recto seul qui
  prennent le dos joueur ;
- `playerDir` : regex qui remplace la détection des dossiers joueur
  (`"(?!)"` = aucun dossier joueur).

Relance le build et relis le rapport jusqu'à ce qu'il soit juste. Présente à
l'utilisateur les cas où tu as hésité plutôt que de trancher seul.

Les dos génériques joueur / rencontre sont acceptés dans ces zips (décision du
2026-09-18, `TODO.md`) ; aucune autre carte officielle FFG.

## MPC Project Helper (optionnel)

Uniquement pour un zip au format interne `NN - Nom-Recto.png` / `-Verso.png` :

```bash
npm run prep:mpc -- dist/print/ahlcg-fr-<id>/ahlcg-fr-<id>-cartes-avec-bleed.zip dist/mpc/ahlcg-fr-<id>-mpc.zip
```

## Mise à disposition

Ces fichiers ne sont pas encore servis par le site. Si l'utilisateur veut les
publier, ils s'ajoutent à l'item archive.org (skill upload-archive : copier le
zip dans `dist/print/ahlcg-fr-<id>/` puis upload, avec le même accord
explicite). Sinon, les laisser dans `dist/` et le noter dans `TODO.md`.
