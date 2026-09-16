# À faire

Idées et chantiers pas encore planifiés. Rien d'urgent ici.

## Site

- [x] **Filtres par chips d'en-tête** pour le Type (Campagne / Scénario
      indépendant / Investigateurs / Autres), à la place du dropdown. Le
      filtre Cycle reste un dropdown pour l'instant.
- [ ] **Lien Discord** de la communauté FR dans l'en-tête (à côté de « À propos »).
- [ ] **Page « Archives »** : référencer l'ensemble des liens archive.org pour
      accès direct aux téléchargements (une ligne par item avec titre, type,
      lien direct archive.org).
- [ ] **Thumbnails couvertures pour campagnes majeures** : utiliser les
      couvertures des guides PDF pour les thumbnails des campagnes (comme fait
      pour Circus Ex Mortis). À appliquer à : Matière Noire, Fondations
      Cyclopéennes, Alice au Pays des Merveilles, Au Coeur des Ténèbres, Les
      Disparus de Killineq.
- [ ] **Iconographie « Dossiers d'Arkham Vol X »** : ajouter une iconographie
      dédiée pour identifier les scénarios issus des différents volumes
      « Dossiers d'Arkham ».

## Contenu

- [ ] **Page / section « Comment imprimer le contenu »** : options d'impression
      des planches et images (MBPrint, Shoggoth Card Printing, etc.), format A4
      vs format carte, papier, fond perdu, recto/verso. Plan de travail détaillé
      (MBPrint en priorité, puis MPC) : [plan_impression_facilitee.md](plan_impression_facilitee.md).
- [ ] **Investiguer MPC Project Helper** : voir si l'outil permet de faciliter
      la préparation/commande d'impression du contenu du catalogue (à
      rapprocher du plan d'impression facilitée ci-dessus).
- [ ] **Investigateurs parallèles** : ajouter les investigateurs parallèles au
      catalogue.
- [ ] **Cartes Tabou du chapitre 1** : ajouter les cartes Tabou du chapitre 1.
- [ ] **Torrent** : ajouter un torrent pour héberger le contenu — se souvenir
      de la proposition de Tokeeto sur le Discord d'héberger du contenu.
- [ ] **Section « Divers » par cycle** proposant en téléchargement à part :
      les séparateurs (intercalaires) et le guide au format cycle complet
      (non découpé par scénario) — ce dernier contient les crédits et
      remerciements globaux, absents des guides par scénario.
- [x] **Crédits (traduction, test, illustration...)** : section « Crédits »
      ajoutée sur la page détail (item.html), avec auteur original et
      traducteur (champ `traducteur` dans catalogue.json).
- [ ] **Vérifier auteurs/traducteurs de tout le catalogue** : plusieurs erreurs
      trouvées (La Guerre des Mondes marquée à tort « Création originale FR. »,
      La Maison Vaudou sans creator à cause d'un id différent entre
      catalogue.json et print-manifest.json — corrigés). Repasser sur
      l'ensemble des fiches pour vérifier creator/traducteur, notamment les
      items sans traducteur renseigné (peut-être manquant plutôt qu'absent).
- [ ] **Pulsions Cynégétiques : préparer un PDF des images** — la fiche n'a pas
      de planche (celle-ci a été retirée), mais pourrait avoir un document
      montrant les cartes (galerie/imposé) pour faciliter la consultation avant
      impression. Pas encore fait à ce jour.
- [ ] **La Maison Vaudou (FS08) : retrouver les images individuelles** — le
      scénario n'a que guide + planche PDF imposée sur disque local, pas les
      images PNG/JPG avec bleed. Vérifier si elles sont sur le Google Drive
      (lien dans le .md de FS08), les télécharger si possible pour compléter
      l'archive archive.org.
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
