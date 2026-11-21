---
name: upload-archive
description: Uploader un item préparé (dist/print/ahlcg-fr-<id>/) sur archive.org avec le compte partagé, puis vérifier qu'il est bien en ligne. À utiliser après preparer-fichiers. Toujours dry-run puis accord explicite ; ne supprime jamais rien.
---

# Upload archive.org

L'identifiant `ahlcg-fr-<id>` est **global et définitif** : une fois créé, il
ne peut pas être renommé ni réutilisé. Les fichiers deviennent publics.

## Règles absolues

- **Jamais** `ia delete`, ni `ia metadata … -m` destructif, ni rien qui
  supprime. Le dry-run de `upload-print-items.mjs` affiche un rappel
  `ia delete` (Face au Wendigo) : **ne pas l'exécuter**, il est historique.
  Un incident passé (item entier disparu) vient d'un `delete` mal ciblé.
  Si un fichier doit être remplacé ou retiré, décris la commande et laisse
  l'utilisateur la lancer lui-même.
- Ne jamais afficher, copier ni écrire les identifiants du compte partagé.
  Ils sont dans la config `ia` de la machine (`ia configure`).
- Un seul item à la fois, toujours avec son `<id>` en argument.

## 1. Pré-vérifications

- `dist/print/ahlcg-fr-<id>/` existe et a été contrôlé (skill preparer-fichiers).
- La fiche existe dans `data/catalogue.json` (titre, type et cycle servent aux
  métadonnées). `creator` est dans l'entrée du manifeste.
- L'identifiant est libre ou bien le nôtre :
  ```bash
  ia metadata ahlcg-fr-<id>
  ```
  `{}` = libre. S'il existe déjà, vérifie que c'est un item du projet (titre,
  `subject: fan-made`) avant de continuer : l'upload complètera l'item.

## 2. Dry-run

```bash
npm run upload:print -- <id>
```

Montre à l'utilisateur : identifiant, liste des fichiers et taille totale,
titre et description qui seront publiés. Corrige la fiche ou le manifeste si
un libellé est faux, puis relance le dry-run.

## 3. Accord

Demande un « oui » explicite, en rappelant que l'identifiant est définitif et
le contenu public. Sans réponse, arrête-toi ici.

## 4. Upload

```bash
npm run upload:print -- --run <id>
```

- `--checksum` est déjà passé : relancer la même commande reprend là où ça
  s'est arrêté, sans renvoyer les fichiers déjà en ligne.
- Gros items (> 1 Go) : prévenir que ça peut durer longtemps ; si
  l'environnement coupe les commandes longues, donner la commande à lancer
  dans le terminal de l'utilisateur.

## 5. Vérifier (archive.org est asynchrone)

La propagation prend de quelques secondes à plusieurs minutes. Vérifie, en
réessayant toutes les 30 s pendant une dizaine de minutes au plus :

```bash
ia list ahlcg-fr-<id>
```

Chaque fichier de `dist/print/ahlcg-fr-<id>/` doit apparaître (les fichiers
`_meta.xml`, `_files.xml`… générés par archive.org sont normaux). Si un
fichier manque après ce délai, relance l'upload (reprise), ne supprime rien.

**Si rien n'apparaît après 10 minutes** : regarde la file d'archive.org avant
de relancer quoi que ce soit.

```bash
ia tasks ahlcg-fr-<id>
```

Des tâches `s3-put` en `queued` / `running` signifient que le serveur est en
retard (vu : ~1 h pour 886 Mo, alors que le client avait terminé en succès).
**Ne relance pas l'upload** : `--checksum` compare à la liste des fichiers déjà
publiés, il renverrait donc tout. Attends que les fichiers soient listés.
Pour ajouter ensuite un fichier à l'item, relance la même commande : les
fichiers déjà en ligne sont sautés (« already exists, skipping »).

Termine en donnant `https://archive.org/details/ahlcg-fr-<id>` et les noms
exacts des fichiers, à reporter dans le bloc `archive` de la fiche
(skill fiche-catalogue).

## Depuis la VM de Claude

`ia` n'est pas installé dans la VM de Claude : le dry-run (`npm run upload:print
-- <id>`) y fonctionne, mais l'upload réel doit être lancé par l'utilisateur
dans son terminal Windows, depuis le dossier du dépôt :

```
npm run upload:print -- --run <id>
```

Donne-lui cette commande après le dry-run et son accord ; la ligne `ia upload`
du dry-run affiche un chemin de VM, ne la lui donne pas telle quelle. Une fois
qu'il confirme que c'est fait, vérifie l'item (WebFetch sur
`https://archive.org/metadata/ahlcg-fr-<id>` si l'URL a été citée, sinon demande
le résultat de `ia list ahlcg-fr-<id>`) puis renseigne le bloc `archive`.
