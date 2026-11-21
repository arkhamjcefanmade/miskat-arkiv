---
name: preparer-fichiers
description: Transformer les zips téléchargés depuis Google Drive ou Discord en contenu d'item archive.org prêt à uploader (dist/print/ahlcg-fr-<id>/) via data/print-manifest.json et npm run build:print. À utiliser après la création de la fiche, avant tout upload.
---

# Préparer les fichiers d'un item

Résultat attendu, dans `dist/print/ahlcg-fr-<id>/` :

- `ahlcg-fr-<id>-guide.pdf` (si un guide existe) ;
- `ahlcg-fr-<id>-planche-a4.pdf` (planche d'impression A4, si disponible) ;
- un zip d'images : `-cartes-avec-bleed.zip`, `-cartes-sans-bleed.zip`, ou
  `-archive-complete.zip` pour une campagne (tout le dossier source).

Outils : `7z` (7-Zip) et `pdfunite` (poppler) doivent être disponibles. Si tu
travailles dans un environnement où ils manquent (VM sans 7-Zip), prépare le
manifeste puis donne à l'utilisateur la commande exacte à lancer dans son
terminal, et reprends avec son résultat.

## 1. Racine « telechargements »

Les zips Drive / Discord passent par la racine `telechargements` du manifeste.

- `data/print-manifest.json` → `roots.telechargements` est un placeholder.
- Le vrai chemin vit dans `data/print-manifest.local.json` (non versionné).
  S'il n'y a pas de `roots.telechargements`, **demande** à l'utilisateur quel
  dossier utiliser (ex. `C:/Users/<nom>/Documents/HaA/Fan-made/Telechargements`),
  puis ajoute-le.

## 2. Extraire

Pour chaque zip reçu, extraire dans `<telechargements>/<id>/` :

```bash
7z x "<zip téléchargé>" -o"<telechargements>/<id>/" -y
```

- Drive découpe les gros dossiers en plusieurs zips (`…-001.zip`,
  `…-002.zip`) : extrais-les **tous** au même endroit.
- Zips imbriqués (un zip par scénario dans le zip de campagne) : on les garde
  tels quels s'il s'agit d'une campagne `archive-complete` ; sinon on extrait
  celui qui contient les cartes.
- Ne supprime jamais les zips d'origine.

## 3. Inventaire

Liste l'arborescence extraite et identifie :

- **Guide** : PDF nommé « Guide … ». Préfère la version « avec couverture » et
  le format A4 ; prends US / Poker seulement s'il n'y a que ça.
- **Planche** : PDF A4 de cartes imposées (« Cartes (A4) », « Planche »…). Si
  plusieurs PDF, une liste (ils seront fusionnés). S'il n'y en a pas mais que
  les images sont nommées `<n> - <Nom>-Recto/-Verso`, une planche peut être
  imposée (`{ "impose": "<dossier>" }`, voir `tools/impose.mjs`).
- **Images de cartes** : dossier(s) PNG / JPG.
- **Bleed ou pas** : ne te fie pas au nom du dossier, mesure 2 ou 3 images
  (largeur / hauteur d'une carte portrait) :
  - ≈ 0,714 (63,5 × 88,9 mm, ex. 750 × 1050 px à 300 dpi) → **sans bleed** ;
  - ≈ 0,733 (69,9 × 95,3 mm avec 3,2 mm par bord, ex. 825 × 1125 px) → **avec bleed** ;
  - autre ratio (ex. « 8.3 marge ») → le signaler à l'utilisateur.
  Note le résultat : il servira pour `images.bleed` / `images.noBleed`.
- **Contenu FFG reproduit** (cartes officielles quasi identiques) : arrête-toi
  et signale-le (voir `TODO.md`, décision du 2026-09-17).

Présente l'inventaire à l'utilisateur en quelques lignes avant de continuer
s'il y a une ambiguïté (deux guides, deux jeux d'images…).

## 4. Entrée de manifeste

Ajoute `items["<id>"]` dans `data/print-manifest.json` (chemins relatifs à
la racine, donc commençant par `<id>/`) :

```json
"<id>": {
  "source": "telechargements",
  "guide": "<id>/Guide/… (A4).pdf",
  "planche": "<id>/Cartes/… (A4).pdf",
  "imagesDir": "<id>/Cartes/Cartes (Poker - 3.2 marge)",
  "imagesBleed": true,
  "creator": "<Auteur> (VO) ; <Traducteur> (trad.)"
}
```

- `imagesBleed: false` → zip nommé `-cartes-sans-bleed.zip`.
- **Campagne** : `"imagesDir": "<id>"` (tout le dossier), `"imagesSuffix":
  "archive-complete"`, `"planche": null`. Ajoute `"imagesExclude": [...]` pour
  écarter un sous-dossier inutile ou énorme (scan UHD…). `Pack OCTGN`,
  `Pack TTS` et `Sources EON` sont déjà exclus par défaut.
- `creator` est **lu par l'upload** pour la métadonnée archive.org : remplis-le.
- `note` : un avertissement affiché au build (ex. « Cartes 600 dpi »).

Édite le JSON par script (lecture → modification → écriture), UTF-8, sans
`\u` d'échappement.

## 5. Construire et contrôler

```bash
npm run build:print -- <id>
```

Puis vérifie le récapitulatif :

- aucune ligne `!` (source absente) ;
- tailles cohérentes (un zip de 0 Mo = mauvais chemin) ;
- ouvre le guide PDF (1re page) pour confirmer que c'est le bon fichier ;
- liste le zip (`7z l`) : les rectos et versos sont bien là.

**Taille** : si le total dépasse ~2 Go, c'est le cas T2 de `CONTRIBUTING.md` :
l'upload se fera fichier par fichier, et la fiche aura `images: null` ou
pointera vers la page de l'item. Signale-le avant l'upload.

Donne à l'utilisateur la liste finale des fichiers et leurs tailles : c'est
exactement ce qui sera rendu public à l'étape suivante.

## Cas particuliers (vus sur Métro 1933)

**PDF déjà prêts, sans zip d'images.** Quand le dossier reçu ne contient que
des PDF (guide + planches + export MBPrint), pas d'`imagesDir` : mets
`"imagesDir": null`, `"planche": null` et liste les PDF dans `extras` :

```json
"extras": [
  { "src": "<dossier>/xxx_no_bleed.pdf", "name": "planche-a4-sans-bleed.pdf" },
  { "src": "<dossier>/xxx - export Plain.pdf", "name": "planche-a4-avec-bleed.pdf" },
  { "src": "<dossier>/xxx - MB Print.pdf", "name": "mbprint.pdf" }
]
```

Chaque `extras` est copié sous `ahlcg-fr-<id>-<name>`. Les noms comptent : la
page détail du site libelle les fichiers d'après eux (`planche…sans-bleed`,
`planche…avec-bleed`, `mbprint`, voir `FILE_LABELS` dans `item.html`).
Dans la fiche : `archive.planche` = la planche sans bleed (la plus simple à
imprimer), `archive.images = null`, et `images.bleed` / `images.noBleed` à
`false` (ces drapeaux décrivent le zip d'images, absent ici). Reconnaître les
PDF : `pdfinfo` (nombre de pages, format) et un rendu `pdftoppm -r 30` regardé
avec Read (après `device_stage_files`) ; une planche A4 sans écart entre les
cartes est « avec bleed », une avec écarts est « sans bleed », un PDF d'une
carte par page est l'export MBPrint.

**Zip d'images fourni après coup (item déjà uploadé).** Ne relance pas
`build:print` : il vide `dist/print/<item>`. Zippe seulement les images, avec les
mêmes options que le build, sous le nom attendu, puis mets le manifeste à jour
(`imagesDir`, `imagesBleed`) pour qu'un futur build produise le même zip :

```bash
cd "<dossier d'images>" && 7z a -tzip -mx=0 -bso0 -bsp0 -r "<repo>/dist/print/ahlcg-fr-<id>/ahlcg-fr-<id>-cartes-avec-bleed.zip" .
```

Contrôle le bleed sur les pixels : à 300 dpi, 798×1111 ≈ 67,6 × 94 mm (≈ 2 mm de
bleed par bord), 825×1125 ≈ 69,9 × 95,3 mm (3,2 mm) ; le ratio seul ne tranche
pas (0,718 pour les deux cas vus). Comparer avec les images embarquées dans les
PDF (`pdfimages -list -f 1 -l 1`). Le zip s'ajoute ensuite à l'item avec
`npm run upload:print -- --run <id>` (voir upload-archive).

**Lancer le build depuis la VM de Claude.** Les racines du manifeste local sont
des chemins Windows qui n'existent pas dans la VM. Connecte le dossier source
(`device_request_folder_access`), il est monté sous `$HOME/mnt/<nom du dossier>`,
puis surcharge la racine :

```bash
PRINT_ROOT_TELECHARGEMENTS=$HOME/mnt npm run build:print -- <id>
```

avec des chemins de manifeste commençant par le nom du dossier
(`Metro_1933/…`). Sous Windows, la racine `telechargements` du manifeste local
pointe vers le dossier parent et les mêmes chemins fonctionnent.

**Relancer le build dans la VM échoue** : le script vide `dist/print/<item>`
avant de reconstruire et la suppression est interdite (`EPERM`). Soit
`mcp__remote-devices__device_request_delete_permission` (à demander une seule
fois), soit copier à la main les fichiers manquants sous leurs noms définitifs,
soit lancer `npm run build:print -- <id>` dans le terminal de l'utilisateur.

**Accents.** Les noms de fichiers venant de Windows ou d'un zip ont souvent le
« é » décomposé (e + accent combinant) : un chemin copié du chat ne correspond
pas. Le build essaie les deux formes ; pour une autre commande, passe par une
glob (`M*Plain.pdf`).

**Fichiers de contrôle.** Pour regarder des pages, écris les PNG dans
`dist/_review_<id>/` (dossier ignoré par git) et stage-les ; la VM ne peut pas
les supprimer ensuite, c'est sans conséquence.
