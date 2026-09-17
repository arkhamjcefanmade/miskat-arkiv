# Backlog — Interface d'administration

Analyse produit (posture PM) pour permettre à des personnes **non
techniciennes** d'administrer le contenu du site — y compris l'upload vers
archive.org — sans dépendre d'une seule personne qui maîtrise git, JSON,
la CLI `ia` et un terminal.

Document vivant : à réviser au fur et à mesure des décisions. Rien ici n'est
engagé — c'est une proposition de séquencement, pas un engagement de delivery.

## Le problème

Aujourd'hui, ajouter ou corriger une fiche nécessite de :

1. Préparer les fichiers à la main (renommer, zipper, vérifier bleed/no-bleed) ;
2. Éditer `data/catalogue.json` et `data/synopsis.json` à la main (JSON brut,
   16 champs par fiche, schéma strict) ;
3. Lancer `npm run validate` en CLI ;
4. Committer et pousser sur git (déclenche le déploiement GitHub Pages) ;
5. Lancer `ia upload` en CLI avec les bonnes metadata, depuis une machine où
   le compte archive.org partagé est configuré ;
6. Vérifier manuellement que l'upload s'est bien terminé côté serveur
   (propagation asynchrone d'archive.org — observée plusieurs fois cette
   session, de quelques secondes à plusieurs minutes selon la taille).

Chacune de ces étapes suppose des compétences techniques (terminal, git,
JSON, CLI tierce) qu'un contributeur bénévole "éditorial" n'a probablement
pas. Tant que ça reste vrai, une seule personne peut réellement faire vivre
le site.

## Personas

- **Éditeur de contenu** (cible principale) : connaît bien le jeu et la
  communauté FR, sait écrire un résumé sans spoil et vérifier des crédits,
  ne sait pas coder ni utiliser git/CLI. Doit pouvoir ajouter/corriger une
  fiche et lancer un upload archive.org en autonomie.
- **Admin technique** (rôle actuel) : garde la main sur l'infra, la
  gouvernance archive.org, les cas complexes (fichiers énormes, formats
  exotiques, résolution de conflits).

## Contraintes à respecter

- Le site reste un **site statique** servi par GitHub Pages — pas de vraie
  base de données côté front, tout part de `data/catalogue.json` /
  `data/synopsis.json` versionnés dans le repo.
- `data/catalogue.schema.json` est déjà la source de vérité du format ; toute
  UI doit s'appuyer dessus plutôt que dupliquer les règles.
- Le compte archive.org est **partagé** — un outil d'upload doit gérer les
  identifiants côté serveur/fonction, jamais les exposer côté client.
- **Incident de référence** (cette session) : un item complet a disparu
  d'archive.org, vraisemblablement via un `ia delete` mal ciblé lors d'un
  nettoyage antérieur. Toute interface d'admin doit rendre ce genre d'erreur
  difficile par construction (voir Phase 3).
- `tools/upload-print-items.mjs` fait déjà une partie du travail (génère/lance
  les commandes `ia upload` depuis `dist/print/`) — à réutiliser/exposer
  plutôt que réécrire.

## Principes directeurs

1. **Aucune action destructive par défaut.** Dépublier (`publie: false`)
   doit toujours être l'option proposée en premier ; la suppression
   définitive sur archive.org doit être un chemin séparé, plus lent,
   confirmé explicitement.
2. **Le schema JSON reste la source de vérité.** L'UI se génère/valide à
   partir de `catalogue.schema.json`, pas l'inverse.
3. **Pas de secret côté client.** Les identifiants archive.org vivent dans
   une fonction serveur (secret d'environnement), jamais dans le navigateur.
4. **Chaque sauvegarde reste un commit git lisible.** On garde l'historique
   et la possibilité de revert — l'UI ne doit pas casser ça.
5. **Dégrader proprement.** Le workflow CLI actuel doit continuer à
   fonctionner pour les cas complexes, même une fois l'UI en place.

## Phase 0 — Fondations & décisions à trancher

- [x] **Choix d'architecture pour l'UI d'édition** : sur-mesure, pas de CMS
  headless (type Decap CMS). Raison : la contrainte de rester 100% sur
  GitHub Pages rend l'auth d'un CMS existant plus coûteuse que l'app
  elle-même (voir point auth ci-dessous) — pour ~5 utilisateurs et un
  périmètre Phase 1 limité (16 champs connus), une mini-app maison reste
  plus simple qu'un CMS générique à configurer/maintenir.
- [ ] **Auth / qui a le droit de faire quoi** — exploré, mis de côté pour
  l'instant (à reprendre avant de coder la Phase 1). Deux pistes identifiées,
  toutes deux compatibles "zéro backend" :
  - *PAT fine-grained GitHub* (un token par éditeur, créé à la main sur
    GitHub, collé une fois dans l'admin) : fonctionne aujourd'hui, mais
    procédure de création réellement fastidieuse pour un non-technicien
    (Developer settings caché, choix Resource owner = l'org, sélection de
    permissions parmi ~15 catégories, et possible étape d'approbation par un
    owner de l'org `arkhamjcefanmade` pour les tokens scopés à l'org).
  - *GitHub App + Device Flow* : setup unique par l'admin (créer l'App,
    l'installer sur le repo), puis pour chaque éditeur juste "va sur
    github.com/login/device, entre ce code" — pas de menu de permissions à
    naviguer côté éditeur, pas de secret client nécessaire (device flow
    conçu pour clients publics). Meilleure UX répétée, mais plus de setup
    initial, et un point technique à valider (le token obtenu suffit-il
    seul, ou faut-il aussi que l'éditeur soit collaborateur GitHub du repo).
  - Dans les deux cas, "gestion des users" = gestion des collaborateurs/
    accès GitHub du repo, pas de système d'utilisateurs custom à construire.
  - Une 3e piste (Google SSO) a été écartée pour la Phase 1 : elle ne
    résout que l'identification, pas le droit d'écrire sur GitHub — il
    faudrait quand même un token/mécanisme séparé pour l'écriture, donc soit
    ça n'apporte rien (SSO + PAT à côté), soit ça réintroduit un backend
    (SSO + fonction serveur détenant un token partagé). Cette 2e option
    redevient pertinente en Phase 3, où un backend existera de toute façon
    pour l'upload archive.org — Google SSO pourrait alors servir de login
    unifié pour toute l'admin à ce moment-là, sans coût d'infra
    supplémentaire puisque le backend sera déjà là pour une autre raison.
- [ ] **Collection archive.org dédiée** (`ahlcg-fanmade-fr`, déjà notée dans
  `CONTRIBUTING.md`) avec plusieurs comptes admin — indépendant de l'UI mais
  prérequis pour ne plus dépendre d'un seul compte email partagé.
- [ ] **Choix d'hébergement pour la partie "backend"** (fonction d'upload
  archive.org, éventuel stockage temporaire de fichiers en cours de
  préparation) — doit rester gratuit/quasi-gratuit vu l'échelle du projet
  (Cloudflare Workers, Netlify/Vercel functions, etc. sont candidats).

## Phase 1 — MVP : éditer une fiche existante sans toucher au JSON

Le gain le plus rapide : permettre les corrections (le gros du volume de
travail observé cette session — crédits, typo de titre, cycle, tags) sans
JSON ni git.

- [ ] Formulaire d'édition d'une fiche, un champ par propriété du schema
  (`titre`, `titreVO`, `type`, `cycle`, `etat`, `langue`, `publie`, `liens`,
  `images.bleed/noBleed`, `contactPanierPartage`, `commentaire`, `creator`,
  `traducteur`, `datePublication`) avec les bonnes contraintes (enums en
  listes déroulantes, dates au bon format, etc.).
- [ ] Édition du résumé (`synopsis.json`) en zone de texte multi-paragraphes
  (équivalent des `\n\n` actuels), aperçu du rendu avant sauvegarde.
- [ ] Validation automatique contre `catalogue.schema.json` avant
  sauvegarde — bloque l'enregistrement plutôt que de casser le site.
- [ ] Sauvegarde = commit git automatique (message généré), pas de manip
  manuelle. Historique conservé nativement par git.
- [ ] Prévisualisation de la fiche (rendu `item.html` réel) avant publication.
- [ ] Bouton "Dépublier" bien visible et séparé de toute action destructive.

## Phase 2 — Fichiers & miniatures

- [ ] Upload direct d'une image de miniature (remplace le dépôt manuel dans
  `img/thumbs/` + renommage à la main observés cette session) : redimension/
  format géré par l'outil, respect de la convention `img/thumbs/<id>.<ext>`.
- [ ] Détection des thumbnails orphelines (fiche supprimée mais image
  restée) — nettoyage assisté plutôt que manuel comme fait cette session
  pour Investigateurs Parallèles.
- [ ] Reprise du chantier déjà identifié dans `TODO.md` : cadrage des
  thumbnails (top/center/bottom) piloté par un champ plutôt que codé en dur
  par id dans `index.html` — pertinent à faire au même moment que l'UI
  d'upload de miniature.

## Phase 3 — Upload archive.org sans CLI

La partie la plus engageante techniquement, et celle qui débloque vraiment
l'autonomie complète (sinon l'éditeur reste dépendant de quelqu'un qui sait
lancer `ia upload`).

- [ ] Zone de dépôt de fichiers (guide/planche/images) avec renommage
  automatique selon la convention `ahlcg-fr-<id>-<suffixe>.<ext>`, en
  s'appuyant sur `tools/build-print-items.mjs`/`upload-print-items.mjs`
  comme brique existante à exposer plutôt qu'à réécrire.
- [ ] Fonction serveur qui exécute l'upload (identifiants archive.org en
  secret d'environnement, jamais transmis au navigateur).
- [ ] Barre de progression pour les gros fichiers — cette session a
  manipulé des uploads de 86 Mo à 1,2 Go ; certains ont pris plusieurs
  minutes, avec un délai de propagation serveur supplémentaire après la fin
  de l'upload lui-même (observé sur presque tous les uploads volumineux).
- [ ] Vérification post-upload automatisée : interroger
  `archive.org/metadata/<id>` jusqu'à confirmation que les fichiers
  attendus sont bien listés (on a fait ce polling à la main plusieurs fois
  cette session — à industrialiser).
- [ ] Remplissage semi-automatique des metadata archive.org (title,
  subject, description) à partir des champs déjà saisis dans la fiche,
  pour éviter la ressaisie.

## Phase 4 — Sécurité & gouvernance

- [ ] Rôles distincts "éditeur" (propose des modifications) et "admin"
  (peut publier / supprimer sur archive.org) — cohérent avec le principe
  "aucune action destructive par défaut".
- [ ] Suppression archive.org (`ia delete`) : jamais en un clic depuis l'UI
  courante. Passage obligé par une confirmation explicite à double étape et,
  idéalement, réservé au rôle admin uniquement.
- [ ] Historique des modifications visible dans l'UI (qui a changé quoi,
  quand) — pas besoin de réinventer, git log suffit si on l'expose proprement.
- [ ] Alerte / rappel si un item catalogue.json pointe vers un
  `archive.id` introuvable côté archive.org (aurait détecté plus tôt
  l'incident Renouveau Conspiration d'Innsmouth de cette session, au lieu
  d'attendre qu'un utilisateur signale un lien mort).

## Phase 5 — Confort (une fois le socle en place)

- [ ] Détection automatique bleed/no-bleed à partir des dimensions/DPI des
  images uploadées (heuristique utilisée manuellement cette session : 750×1050
  @ 300dpi = format trim/no-bleed pour une carte AHLCG standard).
- [ ] Extraction assistée de la page de crédits d'un guide PDF (texte ou
  OCR) pour pré-remplir `creator`/`traducteur` — spéculatif, à valider sur
  un échantillon de guides avant d'investir dessus.
- [ ] Tableau de bord des fiches non publiées / incomplètes (`archive: null`,
  `etat: inconnu`, thumbnail manquante) — remplace le suivi actuel fait à la
  main dans `TODO.md`.
- [ ] Génération assistée d'un premier jet de résumé sans spoil à partir du
  guide (rôle actuellement tenu par Claude en session interactive) — à ne
  considérer qu'une fois le reste du socle stable, et toujours avec relecture
  humaine avant publication.

## Hors scope / tranché

- **Reproduction de contenu officiel FFG** (cartes parallèles, listes Tabou,
  etc.) : décision prise cette session de retirer ce type de contenu du
  catalogue et de ne pas le reproposer sans clarifier d'abord la politique du
  site sur ce point (voir `TODO.md`). Une UI d'admin ne doit pas faciliter la
  republication de ce type de contenu sans que cette question soit tranchée.

## Périmètre actuel

Focus explicite sur la **Phase 1 uniquement** pour le moment (édition de
fiche + résumé, sans upload archive.org ni gestion de fichiers). Les phases
2 à 5 restent documentées pour la vision d'ensemble mais ne sont pas à
lancer avant que la Phase 1 ait fait ses preuves.

## Questions ouvertes

- Auth Phase 1 : PAT fine-grained vs GitHub App + Device Flow (voir Phase 0)
  — à trancher avant de coder l'écriture vers GitHub.
- Qui, concrètement, sont les 2-3 premières personnes candidates au rôle
  "éditeur" ? Ça cadre le niveau d'accompagnement/documentation nécessaire.
- Budget de temps réaliste : ce backlog est large — vaut mieux livrer la
  Phase 1 seule et la faire vivre un moment avant d'attaquer l'upload
  archive.org (Phase 3), plutôt que viser le grand soir.
