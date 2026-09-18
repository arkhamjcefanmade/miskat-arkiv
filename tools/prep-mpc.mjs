// Convertit un zip `*-cartes-avec-bleed.zip` (convention interne du site :
// "NN - Nom de la carte-Recto.png" / "-Verso.png") vers la convention
// attendue par l'extension Chrome MPC Project Helper : "NNN-nom-a.png"
// (recto) / "NNN-nom-b.png" (verso), numérotation séquentielle sur 3
// chiffres. Voir plan_impression_facilitee.md, section MPC, étape 1.
//
//   node tools/prep-mpc.mjs <entrée.zip> <sortie.zip>

import path from "node:path";
import AdmZip from "adm-zip";
import iconv from "iconv-lite";

const [, , inPath, outPath] = process.argv;
if (!inPath || !outPath) {
  console.error("Usage: node tools/prep-mpc.mjs <entrée.zip> <sortie.zip>");
  process.exit(1);
}

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

// Regroupe par carte (numéro + suffixe bis/ter), garde le recto et le verso.
const cards = new Map(); // key: "12-bis" -> { order, name, recto, verso, ext }
const unmatched = [];

// Nos zips sont généralement créés sans le bit UTF-8 (flag 0x800) posé sur
// les entrées ; adm-zip décode alors leur nom en latin1 par défaut, ce qui
// corrompt les accents (ex. "è" -> "Ã¨"). On redécode depuis les octets
// bruts en CP437 (page de code OEM historique des zips Windows) dans ce cas.
const decodeName = (e) => {
  const utf8Flag = !!(e.header.flags & 0x800);
  return utf8Flag ? e.entryName : iconv.decode(e.rawEntryName, "cp437");
};

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

// Ordre stable : numéro, puis bis/ter après la base.
const sorted = [...cards.values()].sort((a, b) => a.order - b.order || a.suffix.localeCompare(b.suffix));

const out = new AdmZip();
let idx = 0;
let missing = 0;
for (const c of sorted) {
  idx++;
  const n = String(idx).padStart(3, "0");
  const slug = slugify(c.name) || "carte";
  if (c.recto) out.addFile(`${n}-${slug}-a.${c.ext}`, c.recto.getData());
  else { console.warn(`! Recto manquant pour "${c.name}" (#${c.order}${c.suffix ? " " + c.suffix : ""})`); missing++; }
  if (c.verso) out.addFile(`${n}-${slug}-b.${c.ext}`, c.verso.getData());
  else { console.warn(`! Verso manquant pour "${c.name}" (#${c.order}${c.suffix ? " " + c.suffix : ""})`); missing++; }
}

out.writeZip(outPath);
console.log(`\n✓ ${sorted.length} carte(s) converties -> ${outPath}`);
if (missing) console.log(`! ${missing} face(s) manquante(s) au total.`);
