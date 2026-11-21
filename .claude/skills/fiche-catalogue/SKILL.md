---
name: fiche-catalogue
description: Créer ou mettre à jour une fiche dans data/catalogue.json (et la description de son cycle, sa miniature) en respectant le schéma et les conventions du site. À utiliser pour toute modification d'une fiche du catalogue, y compris renseigner le bloc archive après un upload.
---

# Fiche du catalogue

Source de vérité du format : `data/catalogue.schema.json`. Relis-le si un
champ te semble ambigu ; ne duplique pas ses règles de mémoire.

## Modifier le fichier

- Édite `data/catalogue.json` avec un petit script (node ou python :
  lecture → modification → écriture), **jamais** en recopiant le fichier.
- Écris en UTF-8, indentation 2 espaces, `ensure_ascii=False`, sans changer
  l'ordre des fiches existantes. Ajoute une nouvelle fiche en fin de tableau
  `items` (l'affichage trie par `sortKey`).
- Mets `meta.miseAJour` à la date du jour.

## Champs d'une fiche

| Champ | Règle |
|---|---|
| `id` | slug `[a-z0-9-]` du titre FR, sans accents ni apostrophes (`L'Hôtel du Grand Chêne` → `lhotel-du-grand-chene`). Vérifie qu'il n'existe pas déjà. **Immuable une fois publié.** |
| `titre` / `titreVO` | `titreVO: null` si création francophone. |
| `type` | `scenario`, `campagne`, `investigateurs`, `cartes-joueur`, `autre`. |
| `cycle` | `"Cycle N"` existant dans `cycles`, ou `null`. |
| `etat` | `en-travaux` tant que pas hébergé ; `disponible` une fois `archive` rempli. |
| `langue` | `"fr"`. |
| `publie` | `false` jusqu'à l'étape publier-site. |
| `image` | `"img/thumbs/<id>.jpg"` une fois la miniature générée, sinon `null`. |
| `liens` | `{ "source": <URL du fil ou null>, "fichier": null }` (`fichier` est obsolète : toujours `null`). |
| `images` | `{ "noBleed": bool, "bleed": bool }` d'après le **contenu réel** du zip (voir preparer-fichiers). |
| `contactPanierPartage` | pseudo Discord ou `null`. |
| `commentaire` | `null` sauf information utile au visiteur. |
| `archive` | `null`, ou `{ "id": "ahlcg-fr-<id>", "guide", "planche", "images" }` avec les **noms exacts** des fichiers de `dist/print/ahlcg-fr-<id>/` (`null` pour ceux absents). |
| `datePublication` | `"AAAA-MM"` ou `null`. |
| `sortKey` | titre sans article initial (`Le `, `La `, `Les `, `L'`), ex. `Hôtel du Grand Chêne`. |
| `creator` / `traducteur` | **omettre** le champ si inconnu (ne pas mettre `null`). Pas de `traducteur` pour une création FR. |

## Description du cycle

Si la fiche appartient à un cycle, vérifie que `cycles["Cycle N"].description`
la mentionne. Règle (voir `CLAUDE.md`) : la description décrit **uniquement le
contenu** du cycle (scénarios / campagnes qui le composent), jamais un statut
d'avancement (traduction, relecture, impression…). Un cycle nouveau doit aussi
être ajouté à la liste de référence de `CLAUDE.md`.

## Miniature

1. Récupère une couverture (souvent dans le guide ou un dossier « Couverture »
   du zip) et copie-la dans `img/covers/<dossier du cycle>/<id>.jpg`. Les
   dossiers existants sont `S1`, `S2`… (`S<numéro du cycle>`), ex. `S12`. Si la
   seule couverture est la page 1 du guide PDF, rends-la avec
   `pdftoppm -r 150 -f 1 -l 1 -png -singlefile <guide.pdf> img/covers/S<n>/<id>`
   (le PNG obtenu est accepté par `MAP`).
2. Ajoute l'entrée dans l'objet `MAP` de `tools/make-thumbs.mjs`. Préférer un
   recadrage de l'**illustration seule**, sans bandeau ni titre (piste (a) de
   `TODO.md`) : règle `top` / `bottom` / `left` / `right` pour isoler l'image.
3. `npm run thumbs`, puis **regarde** `img/thumbs/<id>.jpg` avant de la valider.
   Attention : la commande régénère **toutes** les miniatures de `MAP` et
   réécrit celles déjà versionnées (vu sur Cycle 2 : 7 jpg modifiés sans
   rapport). Lance ensuite `git status img/thumbs` et restaure les autres avec
   `git checkout -- img/thumbs/<autre>.jpg` pour ne garder que la nouvelle.
4. Renseigne `image` dans la fiche.

## Toujours terminer par

```bash
npm run validate
```

Zéro erreur, et **aucun nouvel avertissement** (l'outil signale aussi les `id`
en double, les cycles absents et un `archive.id` hors convention). Corrige
avant de continuer.

Deux avertissements sont connus et volontaires : `la-maison-voodoo` et
`renouveau-conspiration-dinnsmouth` ont un item archive.org créé sous un autre
nom, et les identifiants archive.org sont immuables. Ne pas « corriger » ces
deux fiches.
