// Convertit un zip `*-cartes-avec-bleed.zip` / `*-cartes-sans-bleed.zip`
// (convention interne du site : "NN - Nom de la carte-Recto.png" /
// "-Verso.png") en zip "talie" au format attendu par le bouton
// "Importuj talię (ZIP / JSON)" du générateur MBPrint
// (generator.mbprint.pl) : un fichier deck.json à la racine + les images,
// associant explicitement chaque recto à son verso (le bouton "+ Dodaj
// karty" ne fait aucun appariement automatique, il ajoute chaque image
// comme une carte recto seule).
//
// Les cartes paysage (Intrigue/Acte) sont détectées via les pixels réels
// du recto. Le recto reçoit un mbprint_rotation: 270 dans le deck.json
// (le générateur applique cette rotation à l'import) ; mais ce champ ne
// s'applique qu'au recto — l'import ne connaît pas de rotation dos
// indépendante (voir js/upload.js de generator.mbprint.pl : le retour de
// parseImportZip ne renvoie qu'un seul `rotation`, jamais de
// `backRotation`). Le verso est donc pré-tourné nous-mêmes à 270° avec
// sharp avant d'être empaqueté, pour qu'il s'affiche correct même sans
// métadonnée de rotation côté dos.
//
//   node tools/prep-mbprint.mjs <entrée.zip> <sortie.zip> [nom de la talie]

import path from "node:path";
import AdmZip from "adm-zip";
import iconv from "iconv-lite";
import sharp from "sharp";

const [, , inPath, outPath, deckName] = process.argv;
if (!inPath || !outPath) {
  console.error("Usage: node tools/prep-mbprint.mjs <entrée.zip> <sortie.zip> [nom de la talie]");
  process.exit(1);
}

const LANDSCAPE_ROTATION = 270;

// "01 - Couv-Recto.png", "05 bis - Conclusion 3-Verso.png", ...
const NAME_RE = /^(\d+)\s*(bis|ter)?\s*-\s*(.+)-(Recto|Verso)\.(png|jpe?g)$/i;

const slugify = (s) =>
  s
    .normalize("NFD").replace(/[̀-ͯ]/g, "") // accents
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const zip = new AdmZip(inPath);
const entries = zip.getEntries().filter((e) => !e.isDirectory);

// Nos zips sont généralement créés sans le bit UTF-8 (flag 0x800) posé sur
// les entrées ; adm-zip décode alors leur nom en latin1 par défaut, ce qui
// corrompt les accents. On redécode depuis les octets bruts en CP437 dans
// ce cas (voir tools/prep-mpc.mjs).
const decodeName = (e) => {
  const utf8Flag = !!(e.header.flags & 0x800);
  return utf8Flag ? e.entryName : iconv.decode(e.rawEntryName, "cp437");
};

// Regroupe par carte (numéro + suffixe bis/ter), garde le recto et le verso.
const cards = new Map();
const unmatched = [];

for (const e of entries) {
  const base = path.basename(decodeName(e));
  const m = base.match(NAME_RE);
  if (!m) { unmatched.push(base); continue; }
  const [, num, suffix, name, side, ext] = m;
  const key = `${num.padStart(4, "0")}${suffix ? "-" + suffix.toLowerCase() : ""}-${name.trim()}`;
  if (!cards.has(key)) {
    cards.set(key, { order: Number(num), suffix: suffix || "", name: name.trim(), ext: ext.toLowerCase() });
  }
  const rec = cards.get(key);
  if (/recto/i.test(side)) rec.recto = e;
  else rec.verso = e;
}

if (unmatched.length) {
  console.log(`! ${unmatched.length} fichier(s) hors convention, ignorés :`);
  unmatched.slice(0, 20).forEach((n) => console.log("  -", n));
  if (unmatched.length > 20) console.log(`  ... et ${unmatched.length - 20} de plus.`);
}

const sorted = [...cards.values()].sort((a, b) => a.order - b.order || a.suffix.localeCompare(b.suffix));

// Détecte l'orientation via les pixels réels du recto (à défaut, du verso).
async function isLandscape(c) {
  const src = c.recto || c.verso;
  if (!src) return false;
  const { width, height } = await sharp(src.getData()).metadata();
  return width > height;
}

const out = new AdmZip();
const deckCards = [];
let idx = 0;
let missing = 0;
let landscapeCount = 0;

for (const c of sorted) {
  idx++;
  const n = String(idx).padStart(3, "0");
  const slug = slugify(c.name) || "carte";
  const frontName = `${n}-${slug}-a.${c.ext}`;
  const backName = `${n}-${slug}-b.${c.ext}`;

  const landscape = await isLandscape(c);

  if (c.recto) out.addFile(`images/${frontName}`, c.recto.getData());
  else { console.warn(`! Recto manquant pour "${c.name}" (#${c.order}${c.suffix ? " " + c.suffix : ""})`); missing++; }
  if (c.verso) {
    // Le champ mbprint_rotation de l'import ne tourne que le recto ; on
    // pré-tourne le verso nous-mêmes pour qu'il soit droit sans métadonnée.
    const backData = landscape
      ? await sharp(c.verso.getData()).rotate(LANDSCAPE_ROTATION).toBuffer()
      : c.verso.getData();
    out.addFile(`images/${backName}`, backData);
  } else { console.warn(`! Verso manquant pour "${c.name}" (#${c.order}${c.suffix ? " " + c.suffix : ""})`); missing++; }

  const entry = { count: 1, front: { Name: frontName } };
  if (c.verso) entry.back = { Name: backName };
  if (landscape) {
    entry.mbprint_rotation = LANDSCAPE_ROTATION;
    landscapeCount++;
  }
  deckCards.push(entry);
}

const deck = {
  version: 3,
  mbprint: { card_width: 63.5, card_height: 89 },
  parts: [{
    code: "arkham-vault",
    name: deckName || path.basename(inPath, path.extname(inPath)),
    cards: deckCards,
  }],
};
out.addFile("deck.json", Buffer.from(JSON.stringify(deck, null, 2)));

out.writeZip(outPath);
console.log(`\n✓ ${sorted.length} carte(s) -> ${outPath}`);
if (landscapeCount) console.log(`  dont ${landscapeCount} paysage(s) (mbprint_rotation: ${LANDSCAPE_ROTATION}).`);
console.log(`  Import sur generator.mbprint.pl via "Importuj talię (ZIP / JSON)".`);
if (missing) console.log(`! ${missing} face(s) manquante(s) au total.`);
