/**
 * probe-batch-delivery.mjs — la prova che l'attribuzione per posizione non e'
 * un'ipotesi.
 *
 * ═════════════════════════════════════════════════════════════════════════════
 * COSA MISURA, E PERCHE' ESISTE
 * ═════════════════════════════════════════════════════════════════════════════
 *
 * `src/lib/email-delivery/ledger.ts`, `recordBatchSend`, attribuisce l'i-esimo
 * identificativo restituito da `resend.batch.send` all'i-esimo destinatario. Su
 * quell'unica assunzione riposa tutto il registro dei due percorsi a lotti — la
 * rivelazione del venue e i promemoria. Se cade, un esito viene attribuito alla
 * persona sbagliata: «consegnata» su chi non ha ricevuto, che e' la bugia esatta
 * che quel registro esiste per togliere.
 *
 * Questa sonda la misura invece di crederci. L'ordine **non** si verifica
 * confrontando la nostra lista con se stessa: si chiede al fornitore, per ogni
 * identificativo, **a chi** quel messaggio era diretto.
 *
 * ── Cosa non tocca ──────────────────────────────────────────────────────────
 *
 * Mittente **sandbox del fornitore** (`onboarding@resend.dev`) e indirizzi di
 * simulazione `resend.dev`, che la documentazione dichiara innocui per la
 * reputazione del dominio. **Il nostro dominio non e' coinvolto**, e non si
 * scrive una riga in nessuna tabella di questo prodotto.
 *
 * ── La mappa si legge dal sorgente ──────────────────────────────────────────
 *
 * Le corrispondenze parola-del-fornitore -> esito **non sono riscritte qui**:
 * si estraggono dai `case` di `classifyProviderEvent`. Una sonda che
 * reimplementasse la mappa misurerebbe la memoria di chi l'ha scritta, non il
 * codice del prodotto.
 *
 * ── Come si usa ─────────────────────────────────────────────────────────────
 *
 *     node scripts/probe-batch-delivery.mjs
 *
 * Legge `RESEND_API_KEY` da `.env.local`. Va invocata a mano: non entra in
 * `npm run verify`, perche' spende una chiamata reale verso un fornitore
 * esterno e nessun gate automatico deve farlo a ogni build.
 *
 * ── Misurata il 2026-08-22 ──────────────────────────────────────────────────
 *
 *   quattro messaggi -> quattro identificativi, ordine preservato su 4 su 4
 *   suppressed@resend.dev -> last_event `suppressed` -> classificato
 *   `undelivered`
 */

import fs from "node:fs";
import { Resend } from "resend";

const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8").split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);

// La mappa NON e' riscritta a mano: si legge dai `case` del sorgente, cosi' la
// sonda misura il codice del prodotto e non la memoria di chi la scrive.
const src = fs.readFileSync("src/lib/email-delivery/categories.ts", "utf8");
const body = src.slice(src.indexOf("export function classifyProviderEvent"));
const mappa = new Map();
{
  let pendenti = [];
  for (const riga of body.split("\n")) {
    const c = riga.match(/^\s*case "([a-z_]+)":/);
    if (c) { pendenti.push(c[1]); continue; }
    const o = riga.match(/outcome: "([a-z]+)"/);
    if (o && pendenti.length) {
      for (const p of pendenti) mappa.set(p, o[1]);
      pendenti = [];
    }
  }
}
console.log("mappa letta dal sorgente:", Object.fromEntries(mappa));

const resend = new Resend(env.RESEND_API_KEY);
const DA = "Resonate probe <onboarding@resend.dev>";
const A = [
  "delivered@resend.dev",
  "bounced@resend.dev",
  "complained@resend.dev",
  "suppressed@resend.dev",
];

const { data, error } = await resend.batch.send(
  A.map((to, i) => ({
    from: DA,
    to: [to],
    subject: `batch order probe #${i}`,
    html: `<p>probe ${i}</p>`,
  }))
);

if (error) { console.error("RIFIUTO DEL LOTTO:", error); process.exit(1); }

const ids = (data?.data ?? []).map((m) => m.id);
console.log(`\nlunghezze: inviati=${A.length} id=${ids.length} -> ${ids.length === A.length ? "COINCIDONO" : "NON COINCIDONO"}`);

// L'ordine: `emails.get(id).to` deve corrispondere all'i-esimo destinatario.
await new Promise((r) => setTimeout(r, 8000));

const righe = [];
for (let i = 0; i < ids.length; i++) {
  let ev = null, dest = null;
  for (let tentativo = 0; tentativo < 12; tentativo++) {
    const { data: g, error: e } = await resend.emails.get(ids[i]);
    if (e) { ev = `ERRORE ${e.message}`; break; }
    dest = (g?.to ?? []).join(",");
    ev = g?.last_event ?? null;
    if (ev && !["queued", "scheduled", "sent"].includes(ev)) break;
    await new Promise((r) => setTimeout(r, 5000));
  }
  righe.push({
    i,
    atteso: A[i],
    destinatarioSecondoIlFornitore: dest,
    ordineOk: dest === A[i],
    last_event: ev,
    classificato: mappa.get(ev) ?? "unknown (default)",
  });
}

console.table(righe);
const ordine = righe.every((r) => r.ordineOk);
const soppresso = righe.find((r) => r.atteso === "suppressed@resend.dev");
console.log(`\nORDINE PRESERVATO: ${ordine ? "SI" : "NO"}`);
console.log(`SOPPRESSO -> last_event=${soppresso?.last_event} -> classificato=${soppresso?.classificato}`);
