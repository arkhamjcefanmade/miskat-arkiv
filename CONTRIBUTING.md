# Contribuer — héberger un contenu sur archive.org

Ce dépôt ne stocke pas les fichiers de jeu : ils vivent sur **archive.org**, le
catalogue (`data/catalogue.json`) ne fait qu'y pointer.

## Principe

**1 fiche du catalogue = 1 item archive.org.** Dans l'item, on met **un `.zip`
« tout compris »** (T1). Le catalogue affiche alors un bouton de téléchargement
direct.

Repli (T2) : si le contenu est trop volumineux pour un seul zip (grosses
campagnes de plusieurs Go), on dépose plusieurs fichiers dans l'item tels quels,
on met `"zip": null` dans la fiche, et le catalogue renvoie vers la **page** de
l'item (l'utilisateur choisit quoi télécharger sur archive.org).

## Avec Claude

Le dépôt contient des skills qui automatisent cette procédure (préparation des
fichiers, upload, fiche, résumé, publication). Dans Claude, demande par exemple
« ajoute <titre> au catalogue » en joignant le chemin des zips téléchargés :
le skill `ajouter-contenu` (`.claude/skills/`) guide les étapes et demande ton
accord avant l'upload et le push.

## Prérequis

```bash
pipx install internetarchive      # ou : pip install --user internetarchive
ia configure                      # e-mail + mot de passe du compte archive.org PARTAGÉ
```

> Le compte archive.org est **partagé par la communauté** (voir gouvernance plus
> bas). Ne mets jamais tes identifiants perso.

## Identifiant de l'item

Convention : **`ahlcg-fr-` + l'`id` de la fiche** dans `catalogue.json`.

| Fiche (`id`) | Identifiant archive.org | Zip |
|---|---|---|
| `face-au-wendigo` | `ahlcg-fr-face-au-wendigo` | `ahlcg-fr-face-au-wendigo.zip` |
| `matiere-noire` | `ahlcg-fr-matiere-noire` | *(trop lourd → `zip: null`)* |

Règles archive.org : `[a-z0-9-]`, unique **globalement**, **immuable** une fois
créé. `npm run validate` vérifie que `archive.id` respecte la convention.

## T1 — exemple : « Face au Wendigo »

1. Rassembler **tout** le contenu de la fiche dans un seul dossier, puis le
   zipper sous le nom `ahlcg-fr-face-au-wendigo.zip` (guide, PDF d'impression,
   images de cartes avec et sans marges…). Peu importe l'arborescence interne.

   > La compression n'apporte rien sur des PNG/JPEG/PDF : le zip est juste un
   > conteneur. archive.org sait en lister le contenu et servir un fichier
   > interne isolément (`download/<id>/<zip>/<fichier>`).

2. Uploader :

   ```bash
   ia upload ahlcg-fr-face-au-wendigo ahlcg-fr-face-au-wendigo.zip \
     --metadata="title:Face au Wendigo — scénario fan-made (Cycle 1)" \
     --metadata="mediatype:data" \
     --metadata="language:fre" \
     --metadata="creator:Ligue des Joueurs Francophones d'Arkham JCE" \
     --metadata="subject:Arkham Horror LCG" \
     --metadata="subject:fan-made" \
     --metadata="subject:français" \
     --metadata="subject:Cycle 1" \
     --metadata="date:2024" \
     --metadata="description:Scénario indépendant fan-made pour «Horreur à Arkham : le JCE». Cycle 1 de la Ligue des Joueurs Francophones. Source : https://arkhamhorrorfr.forumactif.com/t2401-cycle-1-de-scenarios-fan-made — Fiche : https://arkhamjcefanmade.github.io/miskat-arkiv/" \
     --retries 5
   ```

   - L'upload reprend là où il s'est arrêté si on relance la commande.

3. Vérifier : `ia metadata ahlcg-fr-face-au-wendigo` puis ouvrir
   `https://archive.org/details/ahlcg-fr-face-au-wendigo`.

4. Renseigner la fiche dans `data/catalogue.json` :

   ```json
   "archive": { "id": "ahlcg-fr-face-au-wendigo", "zip": "ahlcg-fr-face-au-wendigo.zip" }
   ```

   puis `npm run validate`, commit, push.

## T2 — repli pour une grosse campagne (« Matière Noire »)

Plusieurs Go : pas de zip unique. On dépose les fichiers **tels quels** dans
l'item (les zips par scénario existent déjà côté source), sans renommage
canonique obligatoire.

```bash
ia upload ahlcg-fr-matiere-noire \
  "Mantière Noire Guide.pdf" "Matière Noire Guide UHD.pdf" \
  "Scenario 1 (The Tatterdemalion).zip" "Scenario 2 (Electric Nightmare).zip" \
  "Sets Matière Noire.zip" "Ext_Lola.zip" "Ext_Science.zip" project_fr.json \
  --metadata="title:Matière Noire — campagne fan-made" \
  --metadata="mediatype:texts" \
  --metadata="language:fre" \
  --metadata="creator:..." \
  --metadata="subject:Arkham Horror LCG" --metadata="subject:fan-made" --metadata="subject:campagne" \
  --metadata="description:Campagne fan-made complète pour «Horreur à Arkham : le JCE». Source : Discord de la communauté. Fiche : https://arkhamjcefanmade.github.io/miskat-arkiv/" \
  --no-derive --retries 8
```

- `--no-derive` **obligatoire** ici (guides UHD ~1 Go : évite des heures de
  dérivés).
- `mediatype:texts` → lecteur PDF en ligne pour les guides.
- Relancer la commande en cas de coupure (reprise auto).

Fiche :

```json
"archive": { "id": "ahlcg-fr-matiere-noire", "zip": null }
```

## Collection & gouvernance

- Demander à archive.org une **collection dédiée** (`ahlcg-fanmade-fr`). Les
  admins de collection peuvent gérer / restaurer tous les items — c'est le point
  de contrôle partagé contre la perte de contenu.
- En attendant : uploader sans `collection` (ou `collection:opensource` si le
  compte y est autorisé), puis rattacher plus tard :
  `ia metadata ahlcg-fr-<id> -m collection:ahlcg-fanmade-fr`.
- Garder **une copie reconstructible hors archive.org** (le Drive reste le
  master). Si un item est retiré sur plainte, on ré-uploade.

## Droits

Le guide (texte original) = risque quasi nul. Les fichiers d'impression et les
images de cartes utilisent le gabarit + le logo officiels → contenu le plus
exposé à une plainte. Rien de bloquant, mais ne jamais dépendre uniquement
d'archive.org pour ces fichiers.

## Vérification périodique

Prévoir un contrôle annuel : tous les liens `archive.org/details/<id>` du
catalogue répondent-ils encore ? (script à ajouter dans `tools/`.)
