---
name: resume-sans-spoil
description: Rédiger le résumé sans spoiler (et les illustrations) d'une fiche dans data/synopsis.json à partir du guide PDF, et relever les crédits. À utiliser quand une fiche n'a pas encore de page détail, ou pour réécrire un résumé.
---

# Résumé sans spoil

`data/synopsis.json` → `items["<id>"] = { "resume": "...", "illustrations": [...] }`.
Une fiche absente de ce fichier n'a **pas** de page détail (`item.html`) ni de
lien « En savoir plus ».

## 1. Lire la source

- Le guide est dans `dist/print/ahlcg-fr-<id>/ahlcg-fr-<id>-guide.pdf` (ou dans
  le dossier extrait). Lis l'introduction, la mise en place et la page de
  crédits — **pas** les résolutions, interludes ni le contenu des actes /
  intrigues au-delà du premier.
- Les crédits relevés (auteur VO, traduction, relecture, illustrations, date)
  servent à compléter `creator`, `traducteur`, `datePublication` de la fiche
  (skill fiche-catalogue) : propose-les à l'utilisateur.

## 2. Écrire

- **Français**, 1 à 3 paragraphes, 80 à 200 mots. Séparer les paragraphes
  par `\n\n` (affichés avec `white-space: pre-line`).
- On peut ouvrir par un court extrait d'ambiance du texte d'introduction
  (quelques lignes, entre guillemets « »), puis présenter la situation de
  départ, le lieu, l'époque, l'enjeu pour les investigateurs.
- Pour une campagne ou une extension : nombre de scénarios, et ce qu'il faut
  pour jouer (ex. « se joue par-dessus la campagne officielle X »).
- **Interdit** : l'identité de l'antagoniste si elle est une révélation, les
  retournements, les fins, les noms de lieux/cartes qu'on ne découvre qu'en
  cours de partie, toute mention de résolution.
- Ton neutre de quatrième de couverture, pas de jugement (« génial »,
  « incontournable »).
- Ne recopie pas de longs passages : au-delà de l'extrait d'ouverture, tout est
  reformulé.

Inspire-toi du ton des résumés existants dans `data/synopsis.json`.

## 3. Illustrations (facultatif)

`illustrations` = liste de chemins d'images relatifs à la racine du site,
affichées en galerie. Liste vide `[]` par défaut. Si on en ajoute : quelques
illustrations de cartes **sans spoil** (lieux de départ, investigateurs),
recadrées et compressées (JPG, ~800 px de large) dans `img/illustrations/<id>/`.

## 4. Valider avec l'utilisateur

Montre le texte avant de l'écrire dans le fichier. Une fois validé :
ajoute l'entrée par script (lecture → modification → écriture, UTF-8, indentation
2 espaces, `ensure_ascii=False`) et vérifie que le fichier reste un JSON valide.
