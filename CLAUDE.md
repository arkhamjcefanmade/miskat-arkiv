# Les Archives Miskatoniques — contexte projet

Catalogue communautaire de contenu fan-made francophone pour *Horreur à Arkham :
le Jeu de Cartes*. Voir [`README.md`](README.md) pour l'architecture générale.

## Structure des cycles fan-made

Le contenu est organisé en « cycles » (`data/catalogue.json` → `cycles`). Un
cycle est soit un assemblage de scénarios/mini-campagnes fan-made hétérogènes
regroupés pour reproduire la taille d'une campagne officielle, soit une unique
campagne fan-made cohérente. Le site n'utilise pas la notion de « Dossiers
d'Arkham » : l'en-tête n'affiche que « Cycle N — description ».

Les descriptions de `Cycle 1` à `Cycle 16` dans `catalogue.json` se limitent
volontairement au contenu de chaque cycle (scénarios et campagnes qui le
composent), avec les titres français des fiches, sans indication de statut
d'avancement (traduction, relecture, impression...) ni mention des fiches
d'enquêteurs ou de cartes joueur. Pour un cycle à campagne unique, la
description donne le titre, le nombre de scénarios et une brève accroche
d'ambiance sans spoiler (tirée du résumé de `data/synopsis.json`). L'en-tête
étant du texte brut, pas de balisage Markdown (italique) dans les descriptions.
Contenu réel de chaque cycle, pour référence future :

- **Cycle 1** : huit scénarios fan-made indépendants — Face au Wendigo, Jouet
  d'une illusion, Le Festival, Le Palais du Rire, Le Pont des Soupirs, Le Wyrm de
  Pensher, Les Seuils de la Croyance, Pulsions cynégétiques.
- **Cycle 2** : huit scénarios indépendants — Désolation à bord du
  Constellation, La Symphonie d'Erich Zann, Les Chiens de Tindalos, Au bord du
  gouffre, Sang versé à Salem, La Couleur tombée du ciel, L'Événement de
  Svalbard, L'Hôtel du Grand Chêne.
- **Cycle 3** : huit scénarios répartis en une campagne de 4 scénarios (Les
  Disparus de Killineq), une campagne de 3 scénarios (Au Cœur des ténèbres) et
  un scénario indépendant (La Maison vaudou).
- **Cycle 4** : campagne fan-made de 8 scénarios, *Matière noire*.
- **Cycle 5** : campagne fan-made de 10 scénarios, *Dimensions étranges*.
- **Cycle 6** : campagne fan-made de 8 scénarios, *L'Appel du Porte-Peste*.
- **Cycle 7** : campagne fan-made de 8 scénarios, *Fondations cyclopéennes*.
- **Cycle 8** : regroupement totalisant 8 scénarios —
  La Guerre des mondes (mini-campagne de 3 scénarios), La Légende du Cavalier
  sans tête (scénario indépendant), L'Étrange Cas du docteur Jekyll et de
  M. Hyde (scénario indépendant), La Sororité des secrets (scénario
  indépendant), De profundis (mini-campagne de 2 scénarios).
- **Cycle 9** : campagne fan-made de 8 scénarios, *Alice au pays des merveilles*.
- **Cycle 10** : campagne fan-made de 8 scénarios, *Les Ombres de Yog-Sothoth*.
- **Cycle 11** : trois extensions fan-made de
  campagnes officielles — Renouveau Dévoreurs des Rêves, Renouveau
  Conspiration d'Innsmouth, et Quête onirique étendue (extension de Renouveau
  Dévoreurs des Rêves).
- **Cycle 12** : deux scénarios fan-made, *Noël à
  Arkham* et *Métro 1933*.
- **Cycle 13** : campagne fan-made de 8 scénarios, *La Cité de l'Invisible*.
- **Cycle 14** : campagne fan-made de 8 scénarios, *Circus Ex Mortis*.
- **Cycle 15** : campagne fan-made de 9 scénarios, *L'Ombre des Grands Anciens*.
- **Cycle 16** : campagne fan-made de 8 scénarios, *Ages Unwound*.

## Ajouter du contenu : skills du dépôt

Le flux d'ajout d'un contenu est découpé en skills dans `.claude/skills/`.
Point d'entrée : **`ajouter-contenu`**, qui enchaîne `fiche-catalogue`,
`preparer-fichiers`, `upload-archive`, `resume-sans-spoil`,
`preparer-impression` et `publier-site`. Les zips Google Drive / Discord sont
extraits sous la racine `telechargements` du manifeste (chemin réel dans
`data/print-manifest.local.json`). Jamais d'upload archive.org, de push git ni
de suppression sans accord explicite ; jamais de `ia delete`.
