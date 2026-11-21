// Génère (ou exécute) les commandes `ia upload` pour les items stagés dans dist/print/.
//
//   node tools/upload-print-items.mjs            -> affiche les commandes (dry-run)
//   node tools/upload-print-items.mjs --run      -> lance les uploads
//   node tools/upload-print-items.mjs --run le-festival les-seuils-de-la-croyance
//
// `ia` doit être configuré (compte archive.org partagé). Voir CONTRIBUTING.md.

import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const STAGE = path.join(ROOT, "dist", "print");
const SITE = "https://arkhamjcefanmade.github.io/miskat-arkiv/";

const args = process.argv.slice(2);
const run = args.includes("--run");
const only = args.filter((a) => !a.startsWith("--"));

const cat = JSON.parse(readFileSync(path.join(ROOT, "data/catalogue.json"), "utf8"));
const manifest = JSON.parse(readFileSync(path.join(ROOT, "data/print-manifest.json"), "utf8"));
const byId = Object.fromEntries(cat.items.map((i) => [i.id, i]));

const TYPE_LABEL = {
  scenario: "scénario", campagne: "campagne",
  investigateurs: "pack d'enquêteurs", "cartes-joueur": "cartes joueur", autre: "contenu",
};

const q = (s) => (/[^\w@%+=:,./-]/.test(s) ? `"${s.replace(/(["$`\\])/g, "\\$1")}"` : s);
const mo = (n) => (n / 1048576).toFixed(0) + " Mo";

// résout `ia` (PATH, sinon shim scoop)
const HOME = process.env.USERPROFILE || process.env.HOME || "";
const IA_CANDIDATES = [
  process.env.IA_BIN, "ia",
  HOME && path.join(HOME, "scoop/shims/ia.exe"),
  HOME && path.join(HOME, "scoop/shims/ia.cmd"),
  HOME && path.join(HOME, "scoop/persist/python/Scripts/ia.exe"),
].filter(Boolean);
function resolveIa() {
  for (const bin of IA_CANDIDATES) {
    try { execFileSync(bin, ["--version"], { stdio: "ignore" }); return bin; }
    catch (e) { if (e.code !== "ENOENT") return bin; }
  }
  return null;
}

const dirs = readdirSync(STAGE, { withFileTypes: true })
  .filter((e) => e.isDirectory() && e.name.startsWith("ahlcg-fr-"))
  .map((e) => e.name)
  .filter((n) => !only.length || only.includes(n.replace(/^ahlcg-fr-/, "")));

if (!dirs.length) { console.error("Rien dans dist/print/ (lance `npm run build:print`)."); process.exit(1); }

let IA = null;
if (run) {
  IA = resolveIa();
  if (!IA) {
    console.error("✗ `ia` introuvable. Vérifie `ia --version` dans ton terminal, ou installe/shimme internetarchive.");
    process.exit(1);
  }
  console.log(`▶ MODE RÉEL — ${dirs.length} item(s), ia = ${IA}\n`);
} else {
  console.log(`▶ DRY-RUN (aucun upload) — ${dirs.length} item(s). Ajoute --run pour lancer.\n`);
}

const results = [];
for (let idx = 0; idx < dirs.length; idx++) {
  const dirName = dirs[idx];
  const id = dirName.replace(/^ahlcg-fr-/, "");
  const fiche = byId[id];
  const man = manifest.items[id] || {};
  const cycle = fiche?.cycle || "";
  const files = readdirSync(path.join(STAGE, dirName)).sort();
  const totalSize = files.reduce((s, f) => s + statSync(path.join(STAGE, dirName, f)).size, 0);

  const md = [
    `title:${fiche?.titre || id} — ${TYPE_LABEL[fiche?.type] || "contenu"} fan-made${cycle ? " (" + cycle + ")" : ""}`,
    `mediatype:data`,
    `language:fre`,
    man.creator ? `creator:${man.creator}` : null,
    `subject:Horreur à Arkham JCE`,
    `subject:fan-made`,
    `subject:français`,
    cycle ? `subject:${cycle}` : null,
    `description:${fiche?.titre || id} — contenu fan-made pour «Horreur à Arkham : le JCE»${cycle ? ", " + cycle : ""}. ${
      man.extras
        ? "Guide + fichiers d'impression (planches A4, PDF pour MBPrint)."
        : man.planche
          ? "Planche d'impression A4 + images de cartes avec bleed + guide."
          : man.imagesSuffix === "archive-complete"
            ? "Archive complète (guide, cartes, planches d'impression) + le guide isolé en PDF."
            : "Guide en PDF + images des cartes (zip)."
    } Fiche : ${SITE}`,
  ].filter(Boolean);

  const iaArgs = [
    "upload", dirName,
    ...files.map((f) => `dist/print/${dirName}/${f}`),
    ...md.map((m) => `--metadata=${m}`),
    "--checksum",     // saute les fichiers déjà en ligne à l'identique -> reprise propre
    "--no-derive",    // mediatype:data + no-derive -> pas d'OCR/jp2/bookreader générés
    "--retries", "5",
  ];

  if (!run) {
    console.log(`# ${dirName}  (${files.length} fichiers, ${mo(totalSize)})`);
    console.log([IA_CANDIDATES[1], ...iaArgs.map(q)].join(" ") + "\n");
    continue;
  }

  console.log(`[${idx + 1}/${dirs.length}] ${dirName} — ${files.length} fichiers, ${mo(totalSize)} …`);
  try {
    execFileSync(IA, iaArgs, { cwd: ROOT, stdio: "inherit" });
    console.log(`  ✓ https://archive.org/details/${dirName}\n`);
    results.push([dirName, true]);
  } catch (e) {
    console.error(`  ✗ échec : ${e.message.split("\n")[0]}\n`);
    results.push([dirName, false]);
  }
}

if (run) {
  const ok = results.filter(([, r]) => r).length;
  console.log(`\n=== ${ok}/${results.length} item(s) uploadés ===`);
  const ko = results.filter(([, r]) => !r).map(([d]) => d);
  if (ko.length) console.log(`Échecs : ${ko.join(", ")} — relance la commande, ia reprend où il en était.`);
} else {
  console.log("Rappel : si Face au Wendigo a encore l'ancien zip, `ia delete ahlcg-fr-face-au-wendigo ahlcg-fr-face-au-wendigo.zip` d'abord.");
}
