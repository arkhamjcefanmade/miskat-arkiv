# À faire

Idées et chantiers pas encore planifiés. Rien d'urgent ici.

## Site

- [x] **Filtres par chips d'en-tête** pour le Type (Campagne / Scénario
      indépendant / Investigateurs / Autres), à la place du dropdown. Le
      filtre Cycle reste un dropdown pour l'instant.
- [ ] **Iconographie « Dossiers d'Arkham Vol X »** : ajouter une iconographie
      dédiée pour identifier les scénarios issus des différents volumes
      « Dossiers d'Arkham ».
- [ ] **Cadrage des thumbnails sans exception au cas par cas** : `object-fit:
      cover` seul laisse le navigateur centrer le recadrage, ce qui coupe le
      haut des illustrations sur certaines fiches (d'où l'exception
      `object-position: top` codée en dur pour Pulsions Cynégétiques et Noël à
      Arkham dans index.html). Passer `object-position: top` en global casse à
      l'inverse les thumbnails qui sont des couvertures de guide complètes
      (bandeau logo en haut, illustration au milieu — cas d'Alice au Pays des
      Merveilles et Matière Noire) : le bandeau se retrouve affiché à la place
      de l'image. Deux pistes à trancher : (a) imposer un format thumb
      systématique — toujours un simple recadrage paysage de l'illustration
      seule, sans bandeau/texte (comme fait pour Circus Ex Mortis), ce qui
      permettrait `object-position: top` partout sans exception ; ou (b)
      ajouter un paramètre par fiche dans catalogue.json (ex. `imageAlign:
      "top" | "center" | "bottom"`) pour piloter `object-position` sans coder
      les ids en dur dans index.html.

## Contenu

- [ ] **Page / section « Comment imprimer le contenu »** : options d'impression
      des planches et images (MBPrint, Shoggoth Card Printing, etc.), format A4
      vs format carte, papier, fond perdu, recto/verso. Plan de travail détaillé
      (MBPrint en priorité, puis MPC) : [plan_impression_facilitee.md](plan_impression_facilitee.md).
- [ ] **Investiguer MPC Project Helper** : voir si l'outil permet de faciliter
      la préparation/commande d'impression du contenu du catalogue (à
      rapprocher du plan d'impression facilitée ci-dessus).
- [x] **Investigateurs parallèles** et **Cartes Tabou du chapitre 1** —
      tentés et retirés (2026-09-17). Les deux sont des reproductions quasi à
      l'identique du travail de FFG (gabarit officiel, texte officiel,
      parfois l'art officiel), contrairement au reste du catalogue qui est
      constitué de créations fan originales ou de traductions. Uploadés sur
      archive.org puis supprimés (`ia delete ... --all --no-backup`) sur
      décision explicite : risque de plainte jugé trop élevé pour ce type de
      contenu précis. Ne pas re-proposer sans clarifier d'abord la politique
      du site sur la reproduction de contenu officiel FFG.
      Précision (2026-09-18) : les dos de cartes génériques (joueur et
      rencontre) sont acceptés dans les zips MBPrint, pour que l'impression
      reste simple ; la décision ne concerne que ces dos, pas les cartes.
- [ ] **Torrent** : ajouter un torrent pour héberger le contenu — se souvenir
      de la proposition de Tokeeto sur le Discord d'héberger du contenu.
- [ ] **Section « Divers » par cycle** proposant en téléchargement à part :
      les séparateurs (intercalaires) et le guide au format cycle complet
      (non découpé par scénario) — ce dernier contient les crédits et
      remerciements globaux, absents des guides par scénario.
- [x] **Crédits (traduction, test, illustration...)** : section « Crédits »
      ajoutée sur la page détail (item.html), avec auteur original et
      traducteur (champ `traducteur` dans catalogue.json).
- [ ] **Pulsions Cynégétiques : préparer un PDF des images** — la fiche n'a pas
      de planche (celle-ci a été retirée), mais pourrait avoir un document
      montrant les cartes (galerie/imposé) pour faciliter la consultation avant
      impression. Pas encore fait à ce jour.
- [ ] **La Maison Vaudou (FS08) : retrouver les images individuelles** — le
      scénario n'a que guide + planche PDF imposée sur disque local, pas les
      images PNG/JPG avec bleed. Vérifier si elles sont sur le Google Drive
      (lien dans le .md de FS08), les télécharger si possible pour compléter
      l'archive archive.org.
- [ ] **L'Appel du Porte Peste : héberger sur archive.org** — campagne déjà
      référencée dans le catalogue (Cycle 6) mais non publiée (`publie: false`,
      `etat: inconnu`). Suivre la procédure d'upload de CONTRIBUTING.md une
      fois le contenu prêt, puis passer `publie` à `true`.
- [ ] **Les Ombres de Yog Sothoth : reprendre les ressources** — repassée en
      `etat: en-travaux` (`archive: null`, fiche visible mais marquée « À
      venir ») suite à un contrôle qualité insatisfaisant. Ancien item
      archive.org (à réutiliser ou remplacer une fois les ressources
      corrigées) : `ahlcg-fr-les-ombres-de-yog-sothoth` (guide :
      `ahlcg-fr-les-ombres-de-yog-sothoth-guide.pdf`, images :
      `ahlcg-fr-les-ombres-de-yog-sothoth-cartes.zip`).
- [ ] **Normaliser le format des images de cartes** (PNG vs JPG) : constaté que
      Shomm exporte tantôt en PNG (non compressé, ex. Matières Noires : 792
      cartes en PNG = 4,9 Go, vs Fondations/Alice en JPG = ~1,1 Go pour un
      nombre de cartes comparable). Reconvertir l'existant en PNG ne rattrape
      rien (la perte JPEG est déjà figée) — pas d'intérêt. Pour du contenu
      qu'on préparerait nous-mêmes à l'avenir : envisager un défaut JPEG
      qualité 90-95+ (standard accepté par les imprimeurs de cartes,
      différence visuelle négligeable à taille carte) plutôt que PNG
      systématique, sauf cas avec aplats/texte net où le PNG apporte un vrai
      plus.
