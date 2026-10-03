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
 * Esce 1 alla prima categoria violata (con tutte le righe di quella categoria),
 * 0 con «read-only OK». Non esegue lo script controllato e non apre la rete.
 *
 * USO  node scripts/check-seed-readonly.mjs scripts/seed-lab-music.mjs
 */

import { readFileSync } from "node:fs";

const file = process.argv[2];
if (!file) {
  console.error("uso: node scripts/check-seed-readonly.mjs <file>");
  process.exit(2);
}

const lines = readFileSync(file, "utf8").split("\n");
const BEGIN = "// PROD-READ-BEGIN";
const END = "// PROD-READ-END";

function fail(category, details) {
  console.error(`FAIL [${category}] ${file}`);
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
// Una chiamata finisce, al piu' tardi, alla prima riga che chiude la fetch
// (`});` o `})`) — il corpo `read_only: true` deve stare prima di quella.
const methodRe = /\bmethod\s*:\s*(['"`])?([A-Za-z]+)?\1?/;
const methodViolations = [];
for (let i = b + 1; i < e; i++) {
  const m = lines[i].match(methodRe);
  if (!m) continue;
  const verb = (m[2] || "").toUpperCase();
  if (!m[1] || !m[2]) {
    methodViolations.push(`riga ${i + 1}: metodo non letterale — ${lines[i].trim()}`);
    continue;
  }
  if (verb === "GET") continue;
  if (verb === "POST") {
    let ok = false;
    for (let j = i; j < e && j < i + 12; j++) {
      if (/read_only\s*:\s*true/.test(lines[j])) {
        ok = true;
        break;
      }
      if (j > i && /^\s*}\s*\)/.test(lines[j])) break;
    }
    if (ok) continue;
    methodViolations.push(`riga ${i + 1}: POST senza read_only: true — ${lines[i].trim()}`);
    continue;
  }
  methodViolations.push(`riga ${i + 1}: metodo ${verb} — ${lines[i].trim()}`);
}
if (methodViolations.length) fail("method", methodViolations);

/* ── client ── */
const clientViolations = [];
for (let i = b + 1; i < e; i++) {
  if (/createClient/.test(lines[i])) clientViolations.push(`riga ${i + 1}: ${lines[i].trim()}`);
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
if (hostViolations.length) fail("host", hostViolations);

console.log(`read-only OK — ${file} (${e - b - 1} righe fra i marcatori)`);
