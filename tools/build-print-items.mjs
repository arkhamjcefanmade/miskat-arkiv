// Prépare le contenu des items archive.org à partir des dossiers sources.
//
// Lit data/print-manifest.json et produit, par fiche :
//   dist/print/ahlcg-fr-<id>/
//     ahlcg-fr-<id>-guide.pdf          (si présent)
//     ahlcg-fr-<id>-planche-a4.pdf     (si présent)
//     ahlcg-fr-<id>-cartes-avec-bleed.zip
//     ahlcg-fr-<id>-<name>             (une par entrée de "extras", si présent)
//
// Usage :
//   node tools/build-print-items.mjs                 -> toutes les entrées du manifeste
//   node tools/build-print-items.mjs face-au-wendigo le-festival
//
// Dépendances : 7-Zip (`7z`) sur le PATH (ou var SEVENZIP).

import { existsSync, mkdirSync, copyFileSync, statSync, rmSync, readdirSync } from "node:fs";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const OUT = path.join(ROOT, "dist", "print");
const MANIFEST = path.join(ROOT, "data", "print-manifest.json");

const HOME = process.env.USERPROFILE || process.env.HOME || "";
const SEVENZIP_CANDIDATES = [
  process.env.SEVENZIP,
  "7z",
  HOME && path.join(HOME, "scoop/shims/7z.exe"),
  "C:/Program Files/7-Zip/7z.exe",
].filter(Boolean);

function runFrom(candidates, args, opts) {
  for (const bin of candidates.filter(Boolean)) {
    try {
      return execFileSync(bin, args, { stdio: ["ignore", "ignore", "inherit"], ...opts });
    } catch (e) {
      if (e.code !== "ENOENT") throw e;
    }
  }
  throw new Error(`binaire introuvable (essayé : ${candidates.filter(Boolean).join(", ")})`);
}
const sevenzip = (args, opts) => runFrom(SEVENZIP_CANDIDATES, args, opts);
const pdfunite = (args, opts) =>
  runFrom(
    [process.env.PDFUNITE, "pdfunite", HOME && path.join(HOME, "scoop/shims/pdfunite.exe")],
    args,
    opts,
  );

const mo = (n) => (n / 1048576).toFixed(1).padStart(7) + " Mo";
const dirSize = (d) =>
  readdirSync(d, { withFileTypes: true }).reduce((s, e) => {
    const p = path.join(d, e.name);
    return s + (e.isDirectory() ? dirSize(p) : statSync(p).size);
  }, 0);

const manifest = JSON.parse(readFileSync(MANIFEST, "utf8"));
const LOCAL_MANIFEST = path.join(ROOT, "data", "print-manifest.local.json");
if (existsSync(LOCAL_MANIFEST)) {
  const local = JSON.parse(readFileSync(LOCAL_MANIFEST, "utf8"));
  Object.assign(manifest.roots, local.roots);
}
// Surcharge par variable d'environnement : PRINT_ROOT_<NOM EN MAJUSCULES>
// (ex. PRINT_ROOT_TELECHARGEMENTS=/chemin). Utile quand les chemins du
// manifeste local (Windows) n'existent pas dans le shell utilisé.
for (const name of Object.keys(manifest.roots)) {
  const env = process.env[`PRINT_ROOT_${name.toUpperCase()}`];
  if (env) manifest.roots[name] = env;
}
const only = process.argv.slice(2);
const entries = Object.entries(manifest.items).filter(([id]) => !only.length || only.includes(id));
if (!entries.length) {
  console.error(only.length ? `Aucune entrée : ${only.join(", ")}` : "Manifeste vide.");
  process.exit(1);
}

mkdirSync(OUT, { recursive: true });
let grand = 0;
const summary = [];

for (const [id, it] of entries) {
  const root = manifest.roots[it.source];
  if (!root) { console.error(`! ${id} : source "${it.source}" inconnue`); continue; }
  const itemDir = path.join(OUT, `ahlcg-fr-${id}`);
  rmSync(itemDir, { recursive: true, force: true });
  mkdirSync(itemDir, { recursive: true });

  const files = [];
  const put = (relSrc, destName) => {
    if (!relSrc) return;
    let src = path.resolve(root, relSrc);
    // Les noms de fichiers venant d'un zip ou d'un autre système peuvent avoir
    // leurs accents décomposés (NFD) : on essaie les deux formes.
    if (!existsSync(src)) {
      src = [src.normalize("NFD"), src.normalize("NFC")].find((p) => existsSync(p)) || src;
    }
    if (!existsSync(src)) { console.error(`! ${id} : source absente ${relSrc}`); return; }
    const dest = path.join(itemDir, destName);
    copyFileSync(src, dest);
    files.push([destName, statSync(dest).size]);
  };

  put(it.guide, `ahlcg-fr-${id}-guide.pdf`);

  // planche :
  //   "chemin"            -> un PDF copié
  //   ["a.pdf","b.pdf"]   -> PDF fusionnés (pdfunite)
  //   { impose: "dir" }   -> images de cartes imposées en A4 (tools/impose.mjs)
  if (it.planche && typeof it.planche === "object" && !Array.isArray(it.planche) && it.planche.impose) {
    const dir = path.resolve(root, it.planche.impose);
    const dest = path.join(itemDir, `ahlcg-fr-${id}-planche-a4.pdf`);
    if (!existsSync(dir)) console.error(`! ${id} : dossier à imposer absent ${it.planche.impose}`);
    else {
      execFileSync("node", [path.join(ROOT, "tools/impose.mjs"), dir, dest], { stdio: "inherit" });
      files.push([path.basename(dest), statSync(dest).size]);
    }
  } else if (Array.isArray(it.planche)) {
    const srcs = it.planche.map((rel) => path.resolve(root, rel));
    const missing = srcs.filter((p) => !existsSync(p));
    if (missing.length) {
      console.error(`! ${id} : ${missing.length} PDF planche absent(s), ex. ${path.basename(missing[0])}`);
    } else {
      // pdfunite (poppler Windows) plante sur les chemins accentués :
      // on recopie d'abord les sources sous des noms ASCII dans un dossier temp.
      const tmp = path.join(itemDir, "_merge");
      mkdirSync(tmp, { recursive: true });
      const ascii = srcs.map((s, i) => {
        const d = path.join(tmp, `${String(i).padStart(3, "0")}.pdf`);
        copyFileSync(s, d);
        return d;
      });
      const dest = path.join(itemDir, `ahlcg-fr-${id}-planche-a4.pdf`);
      pdfunite([...ascii, dest]);
      rmSync(tmp, { recursive: true, force: true });
      files.push([path.basename(dest), statSync(dest).size]);
    }
  } else {
    put(it.planche, `ahlcg-fr-${id}-planche-a4.pdf`);
  }

  // extras : fichiers supplémentaires copiés tels quels dans l'item, sous le nom
  // ahlcg-fr-<id>-<name> (ex. { "src": "dossier/Planche.pdf", "name": "planche-a4-sans-bleed.pdf" }).
  for (const ex of it.extras || []) put(ex.src, `ahlcg-fr-${id}-${ex.name}`);

  if (it.imagesDir) {
    // un seul dossier, ou une liste (ex. cartes taille normale + cartes minis)
    // zippés ensemble dans un même zip. `imagesSuffix` permet de nommer le zip
    // autrement que "cartes-avec/sans-bleed" (ex. campagnes : "archive-complete",
    // le zip contenant alors tout le dossier source, pas que des images).
    // `imagesExclude` : motifs 7-Zip (-x!) exclus du zip, ex. un sous-dossier trop
    // lourd (scan UHD) qu'on ne veut pas embarquer. Par défaut, on exclut toujours
    // Pack OCTGN, Pack TTS et Sources EON (offline/online tools, pas pertinents pour l'archive).
    const DEFAULT_EXCLUDE = ["Pack OCTGN", "Pack TTS", "Sources EON"];
    const imgDirs = Array.isArray(it.imagesDir) ? it.imagesDir : [it.imagesDir];
    const suffix = it.imagesSuffix || (it.imagesBleed === false ? "cartes-sans-bleed" : "cartes-avec-bleed");
    const allExcludes = [...DEFAULT_EXCLUDE, ...(it.imagesExclude || [])];
    const excludes = allExcludes.map((p) => `-x!${p}`);
    const zip = path.join(itemDir, `ahlcg-fr-${id}-${suffix}.zip`);
    let anyOk = false;
    for (const rel of imgDirs) {
      const imgSrc = path.resolve(root, rel);
      if (!existsSync(imgSrc)) { console.error(`! ${id} : dossier images absent ${rel}`); continue; }
      sevenzip(["a", "-tzip", "-mx=0", "-bso0", "-bsp0", "-r", zip, ".", ...excludes], { cwd: imgSrc });
      anyOk = true;
    }
    if (anyOk) files.push([path.basename(zip), statSync(zip).size]);
  }

  const total = files.reduce((s, [, n]) => s + n, 0);
  grand += total;
  summary.push([id, files, total, it.note]);
}

console.log(`\nStaging -> ${path.relative(ROOT, OUT)}\n`);
for (const [id, files, total, note] of summary) {
  console.log(`ahlcg-fr-${id}`);
  for (const [n, s] of files) console.log(`   ${mo(s)}  ${n}`);
  if (!files.length) console.log("   (aucun fichier !)");
  if (note) console.log(`   ⚠ ${note}`);
  console.log(`   ${"".padStart(7)}${"".padStart(4)}------  total ${mo(total)}\n`);
}
console.log(`TOTAL : ${mo(grand)} pour ${summary.length} item(s)`);
