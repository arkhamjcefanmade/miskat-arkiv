// Construit les zips "talie" importables dans le générateur MBPrint
// (generator.mbprint.pl -> "Importuj talię (ZIP / JSON)") à partir du zip de
// cartes d'un item, sans renommer les images (le générateur retrouve les
// fichiers par leur nom exact dans deck.json).
//
//   node tools/build-mbprint.mjs <id> [--out dist/mbprint] [--keep-tmp]
//
// Pour chaque item : extrait le zip source (7-Zip, gère > 2 Go), apparie
// recto/verso selon les conventions de nommage rencontrées (Recto/Verso,
// Face/Dos, Front/Back, a/b, -1/-2), affecte un dos générique (joueur ou
// rencontre) aux cartes recto seul, pivote les cartes paysage (mbprint_rotation
// sur le recto, verso pré-tourné : l'import ne gère qu'une rotation par carte),
// puis découpe en un deck par dossier de premier niveau si l'item est gros.
// Un contrôle final rejoue la résolution de noms du générateur.
// Dépendances : sharp, 7-Zip.

import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync, copyFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import AdmZip from "adm-zip";

const ROOT = path.resolve(import.meta.dirname, "..");
const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const opt = (n, d) => (args.includes(n) ? args[args.indexOf(n) + 1] : d);
const id = args.find((a) => !a.startsWith("--") && a !== opt("--out"));
if (!id) { console.error("Usage: node tools/build-mbprint.mjs <id> [--out dist/mbprint] [--keep-tmp]"); process.exit(1); }
const OUT = path.resolve(ROOT, opt("--out", "dist/mbprint"));

const HOME = process.env.USERPROFILE || process.env.HOME || "";
const SEVENZIP = [process.env.SEVENZIP, "7z", HOME && path.join(HOME, "scoop/shims/7z.exe"), "C:/Program Files/7-Zip/7z.exe"].filter(Boolean);
function sevenzip(a, opts) {
  for (const bin of SEVENZIP) {
    try { return execFileSync(bin, a, { stdio: ["ignore", "ignore", "inherit"], maxBuffer: 1 << 28, ...opts }); }
    catch (e) { if (e.code !== "ENOENT") throw e; }
  }
  throw new Error("7-Zip introuvable");
}

const cat = JSON.parse(readFileSync(path.join(ROOT, "data/catalogue.json"), "utf8"));
const RULES_FILE = path.join(ROOT, "data/mbprint-rules.json");
const rules = (existsSync(RULES_FILE) ? JSON.parse(readFileSync(RULES_FILE, "utf8")).items : {})[id] || {};
const item = cat.items.find((i) => i.id === id);
if (!item) { console.error(`Item inconnu : ${id}`); process.exit(1); }

// ── zip source ───────────────────────────────────────────────────────────────
const srcDir = path.join(ROOT, "dist/print", item.archive?.id || `ahlcg-fr-${id}`);
const srcZip = readdirSync(srcDir).filter((f) => f.endsWith(".zip") && !/planche/.test(f)).map((f) => path.join(srcDir, f))[0];
if (!srcZip) { console.error(`Aucun zip de cartes dans ${srcDir}`); process.exit(1); }

// ── conventions de nommage ───────────────────────────────────────────────────
const IMG = /\.(png|jpe?g)$/i;
const EXCL_DIR = /(guide|s[ée]parateur|ic[ôo]nes?|carnet|\(a4|a4 - pdf|pack |tokens?\b|pions)/i;
const PLAYER_DIR = /(joueur|chercheur|gardien|mystique|r[oô]deur|survivant|neutre|investigateur|soutien)/i;
const GENERIC = /(?:^|[/ ])(joueur|rencontre)[^/]*avec marges|carte (joueur|rencontre)\s*-\s*verso/i;
const F = "(?:recto|face(?:\\s*\\d+)?(?:[-_ ]de[-_ ]la[-_ ]carte)?|front)";
const B = "(?:verso(?:[-_ ]?(?:qr|mod))*|dos(?:\\s*\\d+)?(?:[-_ ]de[-_ ]la[-_ ]carte)?|back)";

const norm = (s) => s.replace(/[œŒ]/g, "oe").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const stripExt = (b) => { let s = b; while (IMG.test(s)) s = s.replace(IMG, ""); return s; };
const squash = (n) => n.replace(/\s+\d+$/, "").replace(/ /g, "");

function sideOf(stem) {
  for (const [tag, rx] of [["F", F], ["B", B]]) {
    let m = stem.match(new RegExp(`[-_ .(](${rx})\\)?$`, "i"));
    if (m) return [tag, stem.slice(0, m.index)];
    m = stem.match(new RegExp(`^(${rx})_(.*)$`, "i"));
    if (m) return [tag, m[2]];
  }
  const m = stem.match(/-(1|2)$/);
  if (m) return [m[1] === "1" ? "F" : "B", stem.slice(0, m.index)];
  return [null, stem];
}

function parse(it) {
  let stem = stripExt(it.base);
  const m0 = stem.match(/^(.*?)([-_ ](?:recto|verso)(?:[-_ ]?(?:qr|mod))*)\s*\((\d+)\)$/i);
  if (m0) stem = `${m0[1]} (${m0[3]})${m0[2]}`;
  let [side, rest] = sideOf(stem);
  rest = rest.replace(/-resolution-\d+-compressionquality.*$/i, "");
  const m = rest.match(/^(\d+(?:[.-]\d+)?)\s*([ab])?\b\s*-?\s*(.*)$/i);
  let num = "", letter = "", tail = rest;
  if (m) { num = m[1]; letter = (m[2] || "").toLowerCase(); tail = m[3]; }
  if (side === null && letter) side = letter === "a" ? "F" : "B";
  const xm = tail.match(/\bx(\d+)\b/);
  const cm = tail.match(/\((\d+)\)/);
  const name = norm(tail.replace(/\(\d+\)|\bx\d+\b/g, ""));
  return Object.assign(it, { letter, side, num, copy: cm ? cm[1] : "", count: xm ? Number(xm[1]) : 1, name, key: `${num}|${name}|${cm ? cm[1] : ""}` });
}

function classify(w, h) {
  const s = Math.min(w, h), l = Math.max(w, h);
  if (l < 600) return "lowres";
  const r = s / l;
  if (r >= 0.70) return w > h ? "std-land" : "std";
  if (r >= 0.62) return w > h ? "mini-land" : "mini";
  return "other";
}

// ── extraction + inventaire ──────────────────────────────────────────────────
const tmp = mkdtempSync(path.join(os.tmpdir(), `mbprint-${id}-`));
console.log(`▶ ${id} — source : ${path.basename(srcZip)}`);
sevenzip(["x", "-y", "-bso0", "-bsp0", `-o${tmp}`, srcZip, "-ir!*.png", "-ir!*.jpg", "-ir!*.jpeg", ...(rules.quantitiesFile ? ["-ir!" + rules.quantitiesFile] : [])]);

function walk(d, acc = []) {
  for (const e of readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p, acc); else if (IMG.test(e.name)) acc.push(p);
  }
  return acc;
}
const files = walk(tmp);
const items = [];
for (const abs of files) {
  const rel = path.relative(tmp, abs).split(path.sep).join("/");
  const { width: w = 0, height: h = 0 } = await sharp(abs).metadata();
  items.push({ abs, rel, dir: path.posix.dirname(rel) === "." ? "" : path.posix.dirname(rel), base: path.posix.basename(rel), w, h, cls: classify(w, h) });
}

// ── appariement ──────────────────────────────────────────────────────────────
const hasBleedDir = items.some((i) => i.dir.includes("3.2 marge"));
const excluded = [], generics = [], cards = [];
for (const it of items) {
  if (hasBleedDir && /Cartes \(Poker\)(\/|$)/.test(it.dir) && !it.dir.includes("3.2")) { excluded.push(it); continue; }
  if (GENERIC.test(it.rel)) { generics.push(it); continue; }
  if (EXCL_DIR.test(it.dir) || it.cls === "other" || it.cls === "lowres") { excluded.push(it); continue; }
  cards.push(parse(it));
}

const groups = new Map();
for (const it of cards) { const k = `${it.dir}\u0000${it.key}`; (groups.get(k) || groups.set(k, []).get(k)).push(it); }
const byName = (a, b) => a.base.localeCompare(b.base);
const pairs = [];
let fronts = [], backs = [];
for (const g of groups.values()) {
  let fr = g.filter((x) => x.side === "F"), bk = g.filter((x) => x.side === "B");
  if (fr.length === 2 && !bk.length && new Set(fr.map((x) => x.letter)).size === 2 && fr.some((x) => x.letter === "b")) {
    fr.filter((x) => x.letter === "b").forEach((x) => { x.side = "B"; });
    fr = g.filter((x) => x.side === "F"); bk = g.filter((x) => x.side === "B");
  }
  if (fr.length && bk.length) { pairs.push({ front: [...fr].sort(byName)[0], back: [...bk].sort(byName)[0] }); continue; }
  fronts.push(...fr); backs.push(...bk);
}
// dos partagé par plusieurs faces (copies numérotées, "10b 11b Nom" …)
const backIndex = new Map();
for (const b of [...backs, ...pairs.map((p) => p.back)]) { const k = `${b.dir}\u0000${squash(b.name)}`; (backIndex.get(k) || backIndex.set(k, []).get(k)).push(b); }
const usedBacks = new Set();
const orphanFronts = [];
for (const f of fronts) {
  const fn = squash(f.name);
  let cand = backIndex.get(`${f.dir}\u0000${fn}`);
  if (!cand) { cand = []; for (const [k, lst] of backIndex) { const [d, n] = k.split("\u0000"); if (n === fn) cand.push(...lst); } }
  if (!cand.length) { for (const [k, lst] of backIndex) { const [d, n] = k.split("\u0000"); if (d === f.dir && n && (n.endsWith(fn) || fn.endsWith(n))) cand.push(...lst); } }
  if (cand.length) { pairs.push({ front: f, back: cand[0] }); usedBacks.add(cand[0]); } else orphanFronts.push(f);
}
// coquilles dans les noms : recto et dos orphelins de même dossier et de même numéro
for (const f of [...orphanFronts]) {
  if (!f.num) continue;
  const b = backs.find((x) => !usedBacks.has(x) && !pairs.some((p) => p.back === x) && x.dir === f.dir && x.num === f.num);
  if (b) { pairs.push({ front: f, back: b }); usedBacks.add(b); orphanFronts.splice(orphanFronts.indexOf(f), 1); }
}
const pairedBacks = new Set(pairs.map((p) => p.back));
const orphanBacks = backs.filter((b) => !pairedBacks.has(b));
const unknownSide = cards.filter((c) => c.side === null);

// ── decks ────────────────────────────────────────────────────────────────────
const entries = [
  ...pairs.map((p) => ({ front: p.front, back: p.back, dirKey: p.front.dir })),
  ...orphanFronts.map((f) => ({ front: f, back: null, dirKey: f.dir })),
];
const comps = (d) => (d ? d.split("/") : []);
let strip = 0;
while (entries.length && entries.every((e) => comps(e.dirKey).length > strip && comps(e.dirKey)[strip] === comps(entries[0].dirKey)[strip])) strip++;
const topOf = (e) => comps(e.dirKey)[strip] || "cartes";
const split = entries.length > 300;
const deckMap = new Map();
for (const e of entries) {
  const key = e.front.cls.startsWith("mini") ? "minis" : split ? topOf(e) : "cartes";
  (deckMap.get(key) || deckMap.set(key, []).get(key)).push(e);
}

// quantités : fichier texte "En 3x : - Nom (set X)" fourni avec certaines sources
const quantityReport = { matched: 0, unmatched: [] };
if (rules.quantitiesFile) {
  const qf = readdirSync(tmp, { recursive: true }).find((f) => path.basename(f) === rules.quantitiesFile);
  if (qf) {
    const wanted = [];
    let n = 1;
    const text = readFileSync(path.join(tmp, qf), "utf8").replace(/^﻿/, "");
    for (const line of text.split(/\r?\n/)) {
      const h = line.match(/^\s*En\s+(\d+)\s*x/i);
      if (h) { n = Number(h[1]); continue; }
      const c = line.match(/^\s*-\s*(.+?)\s*(?:\(set [^)]*\))?\s*$/i);
      if (c) wanted.push({ name: norm(c[1]), raw: c[1].trim(), n });
    }
    const close = (a, b) => a === b || (Math.abs(a.length - b.length) <= 2 && (a.startsWith(b) || b.startsWith(a)));
    for (const w of wanted) {
      const hit = entries.filter((e) => close(e.front.name, w.name));
      if (hit.length) { hit.forEach((e) => { e.front.count = w.n; }); quantityReport.matched += hit.length; }
      else quantityReport.unmatched.push(w.raw);
    }
  } else console.warn(`! fichier de quantités introuvable : ${rules.quantitiesFile}`);
}

const slug = (s) => norm(s).replace(/ /g, "-") || "deck";
const ordKey = (e) => `${e.dirKey}\u0000${String(parseFloat(e.front.num) || 0).padStart(6, "0")}\u0000${e.front.base}`;
const genericSrc = {};
for (const g of generics) genericSrc[/joueur/i.test(g.rel) ? "player" : "enc"] ??= g;

async function fetchFallbackGenerics() {
  const need = ["player", "enc"].filter((k) => !genericSrc[k]);
  if (!need.length) return;
  const gdm = path.join(ROOT, "dist/print/ahlcg-fr-la-guerre-des-mondes");
  const z = existsSync(gdm) && readdirSync(gdm).find((f) => f.endsWith(".zip"));
  if (!z) { console.warn("! dos génériques de secours introuvables (La Guerre des Mondes)"); return; }
  const d = path.join(tmp, "_generics");
  sevenzip(["x", "-y", "-bso0", "-bsp0", `-o${d}`, path.join(gdm, z), "-ir!*Carte joueur - Verso*", "-ir!*Carte rencontre - Verso*"]);
  for (const abs of walk(d)) {
    const k = /joueur/i.test(abs) ? "player" : "enc";
    if (need.includes(k)) genericSrc[k] = { abs, rel: path.basename(abs), base: path.basename(abs), fallback: true };
  }
}
if (entries.some((e) => !e.back)) await fetchFallbackGenerics();

const outDir = path.join(OUT, `ahlcg-fr-${id}`);
if (!flag("--dry")) { rmSync(outDir, { recursive: true, force: true }); mkdirSync(outDir, { recursive: true }); }

const report = [];
const warnings = [];
const assigned = [];
for (const [deckKey, list] of deckMap) {
  list.sort((a, b) => ordKey(a).localeCompare(ordKey(b), "fr", { numeric: true }));
  const work = path.join(tmp, `_deck_${slug(deckKey)}`);
  const imgDir = path.join(work, "images");
  mkdirSync(imgDir, { recursive: true });

  // taille de carte dominante (portrait) -> pour ajuster les dos génériques
  const sizes = new Map();
  for (const e of list) { const k = `${Math.min(e.front.w, e.front.h)}x${Math.max(e.front.w, e.front.h)}`; sizes.set(k, (sizes.get(k) || 0) + 1); }
  const [dom] = [...sizes.entries()].sort((a, b) => b[1] - a[1])[0];
  const [tw, th] = dom.split("x").map(Number);

  const used = new Set();
  const uniq = (rel, base) => {
    let n = base, i = 1;
    while (used.has(n.toLowerCase())) { const parts = rel.split("/"); n = `${parts.slice(-2, -1).join("_") || "x"}_${i > 1 ? i + "_" : ""}${base}`; i++; }
    used.add(n.toLowerCase()); return n;
  };
  const putRaw = (it) => { const n = uniq(it.rel, it.base); copyFileSync(it.abs, path.join(imgDir, n)); return n; };

  const genericFile = {};
  async function genericBack(kind) {
    if (genericFile[kind]) return genericFile[kind];
    const src = genericSrc[kind];
    if (!src) return null;
    const meta = await sharp(src.abs).metadata();
    const name = uniq("", `dos-${kind === "player" ? "joueur" : "rencontre"}-generique.png`);
    let img = sharp(src.abs);
    // Les dos génériques n'existent qu'avec bleed (2,5" + 2 x 1/8" de large, 3,5" + 2 x 1/8" de haut).
    // Pour un deck sans bleed : recadrage exact du bleed (aucune extrapolation).
    if (tw / th < 0.725) {
      const cx = Math.round((meta.width - meta.width * (2.5 / 2.75)) / 2);
      const cy = Math.round((meta.height - meta.height * (3.5 / 3.75)) / 2);
      img = img.extract({ left: cx, top: cy, width: meta.width - 2 * cx, height: meta.height - 2 * cy });
    }
    await img.resize(tw, th, { fit: "fill" }).png().toFile(path.join(imgDir, name));
    genericFile[kind] = name; return name;
  }

  const deckCards = [];
  const stats = { pairs: 0, sharedBack: 0, genericPlayer: 0, genericEnc: 0, noBack: 0, landscape: 0 };
  for (const e of list) {
    const landscape = e.front.cls === "std-land" || e.front.cls === "mini-land";
    const front = putRaw(e.front);
    const card = { count: e.front.count, front: { Name: front } };
    let backName = null;
    if (e.back) {
      if (landscape) { const n = uniq(e.back.rel, e.back.base); await sharp(e.back.abs).rotate(270).toFile(path.join(imgDir, n)); backName = n; }
      else backName = putRaw(e.back);
      stats.pairs++;
    } else {
      const kind = PLAYER_DIR.test(e.front.dir) || (rules.playerBack || []).some((rx) => new RegExp(rx, "i").test(e.front.base)) ? "player" : "enc";
      backName = landscape ? null : await genericBack(kind);
      if (backName) { stats[kind === "player" ? "genericPlayer" : "genericEnc"]++; assigned.push(`${kind === "player" ? "JOUEUR   " : "RENCONTRE"} | ${e.front.rel}`); } else { stats.noBack++; assigned.push(`SANS DOS  | ${e.front.rel}`); }
    }
    if (backName) card.back = { Name: backName };
    if (landscape) { card.mbprint_rotation = 270; stats.landscape++; }
    deckCards.push(card);
  }

  // sharedBack : une même face de dos réutilisée (copies numérotées) n'est écrite qu'une fois côté image
  const deck = {
    version: 3,
    mbprint: { card_width: 63.5, card_height: 89 },
    parts: [{ code: "arkham-vault", name: `${item.titre} — ${deckKey}`, cards: deckCards }],
  };
  writeFileSync(path.join(work, "deck.json"), JSON.stringify(deck, null, 2));

  // contrôle : rejoue la résolution de noms du générateur (correspondance exacte, insensible à la casse)
  const have = new Set(readdirSync(imgDir).map((n) => n.toLowerCase()));
  const missing = deckCards.flatMap((c) => [c.front.Name, c.back?.Name]).filter((n) => n && !have.has(n.toLowerCase()));
  if (missing.length) warnings.push(`${deckKey}: ${missing.length} nom(s) non résolus, ex. ${missing.slice(0, 3).join(", ")}`);
  if (deckCards.reduce((s, c) => s + c.count, 0) > 1200) warnings.push(`${deckKey}: > 1200 cartes (limite du générateur)`);

  if (flag("--dry")) { report.push({ deck: deckKey, zip: "(dry-run)", mo: 0, cartes: deckCards.length, dims: dom, ...stats }); continue; }
  const zipName = `ahlcg-fr-${id}-mbprint${deckMap.size > 1 ? "-" + slug(deckKey) : ""}.zip`;
  const zipPath = path.join(outDir, zipName);
  // -mcu=on : noms en UTF-8 avec le drapeau posé. Sans lui, 7-Zip écrit les accents en page OEM
  // sans drapeau, et JSZip (navigateur) les relit en CP437 : les noms de deck.json ne correspondent plus.
  sevenzip(["a", "-tzip", "-mx=0", "-mcu=on", "-bso0", "-bsp0", zipPath, "deck.json", "images"], { cwd: work });
  if (statSync(zipPath).size < 1.9e9) {
    const inZip = new Set(new AdmZip(zipPath).getEntries().map((e) => e.entryName.split("/").pop().toLowerCase()));
    const lost = deckCards.flatMap((c) => [c.front.Name, c.back?.Name]).filter((n) => n && !inZip.has(n.toLowerCase()));
    if (lost.length) warnings.push(`${deckKey}: ${lost.length} nom(s) de deck.json absents du zip final (encodage ?), ex. ${lost.slice(0, 3).join(", ")}`);
  } else warnings.push(`${deckKey}: zip > 1,9 Go, contrôle des noms du zip final ignoré`);
  report.push({ deck: deckKey, zip: zipName, mo: (statSync(zipPath).size / 1048576).toFixed(0), cartes: deckCards.length, dims: dom, ...stats });
}

const totalFront = entries.length;
console.log(`\n${id} : ${totalFront} cartes -> ${report.length} deck(s) dans ${path.relative(ROOT, outDir)}`);
for (const r of report) {
  console.log(`  ${r.zip.padEnd(60)} ${String(r.mo).padStart(5)} Mo  ${String(r.cartes).padStart(4)} cartes (${r.pairs} paires, dos joueur ${r.genericPlayer}, dos rencontre ${r.genericEnc}, sans dos ${r.noBack}, paysage ${r.landscape})`);
}
console.log(`  écartés : ${excluded.length} fichier(s) (guides, séparateurs, variantes, hors format) ; dos orphelins : ${orphanBacks.filter((b) => !usedBacks.has(b)).length} ; sans côté : ${unknownSide.length}`);
for (const b of orphanBacks.filter((b) => !usedBacks.has(b)).slice(0, 8)) console.log(`    dos orphelin : ${b.rel}`);
for (const u of unknownSide.slice(0, 8)) console.log(`    sans côté    : ${u.rel}`);
if (rules.quantitiesFile) console.log(`  quantités : ${quantityReport.matched} carte(s) mises à jour${quantityReport.unmatched.length ? ", NON TROUVÉES : " + quantityReport.unmatched.join(", ") : ""}`);
for (const w of warnings) console.log(`  ! ${w}`);
if (assigned.length) {
  mkdirSync(path.join(OUT, "_review"), { recursive: true });
  writeFileSync(path.join(OUT, "_review", `${id}.txt`), assigned.sort().join(String.fromCharCode(10)) + String.fromCharCode(10));
  console.log(`  dos affectés : ${path.relative(ROOT, path.join(OUT, "_review", id + ".txt"))} (${assigned.length} cartes recto seul)`);
}
if (!flag("--keep-tmp")) rmSync(tmp, { recursive: true, force: true });
