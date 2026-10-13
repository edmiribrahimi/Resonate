#!/usr/bin/env node
/**
 * check-seed-readonly.mjs — controllo STATICO che uno script di semina del
 * laboratorio verso la produzione emetta solo letture.
 *
 * PERCHE' ESISTE. La produzione non ha PITR: una richiesta sbagliata di metodo
 * e' una scrittura irreversibile. «Letto nel file» non basta (T-52.3-11, high):
 * serve un controllo eseguibile, e un controllo e' tale solo se e' stato visto
 * fallire su una mutazione (piano 52.3-06, comando automatico del task 1).
 *
 * IL CONTRATTO CHE VERIFICA, sul file passato come argomento:
 *
 *   markers  i marcatori `// PROD-READ-BEGIN` e `// PROD-READ-END` esistono una
 *            volta ciascuno, e il primo viene prima del secondo.
 *   method   fra i marcatori, ogni `method:` vale `GET`; l'unica eccezione e'
 *            un `POST` il cui corpo, nelle righe successive della stessa
 *            chiamata, contiene `read_only: true` (la lettura in sola lettura
 *            dell'endpoint SQL della Management API).
 *   client   fra i marcatori non compare `createClient`: un client Supabase
 *            verso la produzione sa scrivere, e il controllo non saprebbe dire
 *            cosa fa.
 *   host     fuori dai marcatori, il ref di produzione compare solo nella sua
 *            dichiarazione, in un confronto `===` di rifiuto o in un
 *            `includes(...)` di rifiuto di host. Nessun'altra riga puo'
 *            costruire un indirizzo di produzione.
 *
 *            E le COSTANTI di produzione dichiarate fra i marcatori (ogni
 *            `const X =` il cui valore nomina il ref o un'altra costante di
 *            produzione: `PROD_BASE`, `PROD_PUBLIC_STORAGE`) non si usano
 *            fuori dai marcatori: una `fetch(\`${PROD_BASE}/…\`, { method:
 *            "POST" })` scritta sotto `PROD-READ-END` e' un indirizzo di
 *            produzione costruito fuori dal recinto (52.3-REVIEW WR-07).
 *
 * `read_only: true` CONTA SOLO DENTRO IL CORPO DELLA STESSA CHIAMATA: il testo
 * della `fetch(` che contiene il `method: "POST"` si delimita contando le
 * parentesi, a commenti tolti, e deve portare `body: JSON.stringify({ … read_only:
 * true … })`. Prima bastava una riga con `read_only: true` nelle 12 righe dopo
 * il metodo — anche in un commento o in un'altra proprieta' (WR-07).
 *
 * Esce 1 alla prima categoria violata (con tutte le righe di quella categoria),
 * 0 con «read-only OK». Non esegue lo script controllato e non apre la rete.
 *
 * USO  node scripts/check-seed-readonly.mjs [file]
 *      senza argomento controlla `scripts/seed-lab-music.mjs`: e' la forma
 *      `node <path>` con cui `npm run verify` lo lancia (`verify:seed-readonly`).
 */

import { readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const file =
  process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), "seed-lab-music.mjs");

const source = readFileSync(file, "utf8");
const lines = source.split("\n");

/**
 * The same text with every comment blanked to spaces, line structure kept:
 * `//` to end of line (not when preceded by `:`, so `https://` survives) and
 * `/* … *\/` across lines. Strings are not parsed: good enough for a file
 * whose comments do not contain quotes that open strings, and a comment that
 * fools it can only make the check STRICTER (a hidden `read_only` stays
 * hidden).
 */
function blankComments(text) {
  let out = "";
  let i = 0;
  while (i < text.length) {
    if (text[i] === "/" && text[i + 1] === "*") {
      const end = text.indexOf("*/", i + 2);
      const stop = end === -1 ? text.length : end + 2;
      out += text.slice(i, stop).replace(/[^\n]/g, " ");
      i = stop;
      continue;
    }
    if (text[i] === "/" && text[i + 1] === "/" && text[i - 1] !== ":") {
      let stop = text.indexOf("\n", i);
      if (stop === -1) stop = text.length;
      out += " ".repeat(stop - i);
      i = stop;
      continue;
    }
    out += text[i];
    i++;
  }
  return out;
}
const code = blankComments(source);
const codeLines = code.split("\n");
/** Offset of the start of each line in `code`. */
const lineStart = [];
{
  let off = 0;
  for (const l of codeLines) {
    lineStart.push(off);
    off += l.length + 1;
  }
}
const BEGIN = "// PROD-READ-BEGIN";
const END = "// PROD-READ-END";

function fail(category, details) {
  console.error(`FAIL [${category}] ${relative(process.cwd(), file) || file}`);
  for (const d of details) console.error(`  ${d}`);
  process.exit(1);
}

/* ── markers ── */
const begins = [];
const ends = [];
lines.forEach((l, i) => {
  if (l.trim() === BEGIN) begins.push(i);
  if (l.trim() === END) ends.push(i);
});
if (begins.length !== 1 || ends.length !== 1 || begins[0] > ends[0]) {
  fail("markers", [
    `${BEGIN}: ${begins.length} occorrenze, ${END}: ${ends.length} occorrenze` +
      (begins.length === 1 && ends.length === 1 ? " (ordine sbagliato)" : ""),
  ]);
}
const [b] = begins;
const [e] = ends;
const inside = (i) => i > b && i < e;

/* ── method ── */
// La chiamata e' la `fetch(` piu' vicina che precede il metodo, delimitata
// contando le parentesi sul testo senza commenti; `read_only: true` deve stare
// nel suo `body: JSON.stringify({ … })`.
const methodRe = /\bmethod\s*:\s*(['"`])?([A-Za-z]+)?\1?/;
const READ_ONLY_BODY = /\bbody\s*:\s*JSON\.stringify\(\s*\{[^{}]*\bread_only\s*:\s*true\b[^{}]*\}\s*\)/;

function enclosingCall(lineIndex) {
  const methodAt = lineStart[lineIndex];
  const open = code.lastIndexOf("fetch(", methodAt);
  if (open === -1 || open < lineStart[b]) return null;
  let depth = 0;
  for (let k = open + "fetch".length; k < code.length; k++) {
    if (code[k] === "(") depth++;
    else if (code[k] === ")") {
      depth--;
      if (depth === 0) return k > methodAt ? code.slice(open, k + 1) : null;
    }
  }
  return null;
}

const methodViolations = [];
for (let i = b + 1; i < e; i++) {
  const m = codeLines[i].match(methodRe);
  if (!m) continue;
  const verb = (m[2] || "").toUpperCase();
  if (!m[1] || !m[2]) {
    methodViolations.push(`riga ${i + 1}: metodo non letterale — ${lines[i].trim()}`);
    continue;
  }
  if (verb === "GET") continue;
  if (verb === "POST") {
    const call = enclosingCall(i);
    if (call !== null && READ_ONLY_BODY.test(call)) continue;
    methodViolations.push(
      `riga ${i + 1}: POST senza read_only: true nel corpo della stessa fetch — ${lines[i].trim()}`
    );
    continue;
  }
  methodViolations.push(`riga ${i + 1}: metodo ${verb} — ${lines[i].trim()}`);
}
if (methodViolations.length) fail("method", methodViolations);

/* ── client ── */
const clientViolations = [];
for (let i = b + 1; i < e; i++) {
  if (/createClient/.test(codeLines[i])) clientViolations.push(`riga ${i + 1}: ${lines[i].trim()}`);
}
if (clientViolations.length) fail("client", clientViolations);

/* ── host ── */
// Il valore letterale del ref si ricava dalla dichiarazione: cosi' anche una
// copia del ref scritta a mano fuori dai marcatori viene vista.
let literalRef = null;
for (const l of lines) {
  const m = l.match(/^\s*const\s+PRODUCTION_REF\s*=\s*["'`]([a-z0-9]+)["'`]\s*;?\s*$/);
  if (m) {
    literalRef = m[1];
    break;
  }
}
if (!literalRef) fail("host", ["nessuna dichiarazione `const PRODUCTION_REF = \"…\"` letterale"]);

const allowed = [
  /^\s*const\s+PRODUCTION_REF\s*=\s*["'`][a-z0-9]+["'`]\s*;?\s*$/, // dichiarazione
  /===\s*PRODUCTION_REF\b|\bPRODUCTION_REF\s*===/, // confronto di rifiuto
  /\.includes\(\s*PRODUCTION_REF\s*\)/, // rifiuto di host
];
const hostViolations = [];
lines.forEach((l, i) => {
  if (inside(i) || i === b || i === e) return;
  const usesName = /\bPRODUCTION_REF\b/.test(l);
  const usesLiteral = l.includes(literalRef);
  if (!usesName && !usesLiteral) return;
  if (allowed.some((re) => re.test(l))) return;
  hostViolations.push(`riga ${i + 1}: ${l.trim()}`);
});

// Le costanti di produzione dichiarate fra i marcatori, AL PRIMO LIVELLO (le
// variabili locali di una funzione non escono dalla funzione): il loro valore
// nomina il ref (per nome o letterale) o un'altra costante gia' riconosciuta.
const prodConsts = [];
for (let i = b + 1; i < e; i++) {
  const m = codeLines[i].match(/^(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=(.*)$/);
  if (!m) continue;
  const init = m[2];
  if (
    /\bPRODUCTION_REF\b/.test(init) ||
    init.includes(literalRef) ||
    prodConsts.some((n) => new RegExp(`\\b${n}\\b`).test(init))
  ) {
    prodConsts.push(m[1]);
  }
}
codeLines.forEach((l, i) => {
  if (inside(i) || i === b || i === e) return;
  for (const n of prodConsts) {
    if (new RegExp(`\\b${n.replace(/\$/g, "\\$")}\\b`).test(l)) {
      hostViolations.push(`riga ${i + 1}: costante di produzione ${n} usata fuori dai marcatori — ${lines[i].trim()}`);
    }
  }
});
if (hostViolations.length) fail("host", hostViolations);

console.log(
  `read-only OK — ${relative(process.cwd(), file) || file} (${e - b - 1} righe fra i marcatori; ` +
    `costanti di produzione confinate: ${prodConsts.join(", ") || "nessuna"})`
);
