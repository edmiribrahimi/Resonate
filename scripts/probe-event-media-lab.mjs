#!/usr/bin/env node
/**
 * probe-event-media-lab.mjs — le sonde di `P-52-G` (i media chiusi) che si
 * eseguono da script, SUL SOLO LABORATORIO.
 *
 * Fase 52, NAV-07, D-52-25. Piano 52-13. Si lancia DOPO M2
 * (`supabase/migrations/20260923180100_gallery_close_data.sql`) e misura il
 * confine dove sta davvero — la RLS e il bucket — con sessioni coniate per
 * ruolo, non il redirect del middleware.
 *
 *   node scripts/probe-event-media-lab.mjs                      sonde 1-4, 6, 8
 *   node scripts/probe-event-media-lab.mjs --check-new-upload   in piu' la 7
 *   node scripts/probe-event-media-lab.mjs --skip-write         senza la 6
 *
 * ── LE SONDE (ricerca §I.8, `52-PROCEDURES.md` P-52-G) ─────────────────────
 *
 *   1  anonimo, GET dell'indirizzo PUBBLICO di ogni oggetto approvato → non 200.
 *      Due letture per oggetto: (a) l'indirizzo cosi' com'e', cioe' cio' che
 *      riceve chi l'ha copiato — puo' rispondere dalla CDN fino al `max-age`
 *      (3600 s) dopo M2; (b) lo stesso con un parametro unico, che scavalca la
 *      cache e misura l'origine. **Solo (a) dopo la finestra dice «chiuso»**
 *      (Pitfall 15): dentro la finestra un 200 in (a) si scrive come cache, non
 *      come fallimento, e non come chiusura.
 *   2  `attendee`, PostgREST su event_media con status=approved → 0 righe.
 *   3  `attendee` e anonimo, `createSignedUrls` su chiavi note → nessun URL.
 *   4  `staff` (tiene gallery.view, non staff.manage): firma di una chiave
 *      PENDING → rifiutata; delle approvate (serata segreta compresa) →
 *      firmate, e l'URL firmato risponde 200.
 *   5  (del proprietario, piano 52-14: immagini e video guardati con gli occhi.)
 *   6  `organizer`: un media di prova SEMINATO DA QUESTO SCRIPT (oggetto
 *      sintetico di pochi byte, senza metadati, nessuna persona) viene rimosso
 *      dalla sessione — prima l'oggetto, poi la riga, l'ordine di `deleteMedia`
 *      — e il riconteggio col service role dice che mancano entrambi. La server
 *      action non e' invocabile da uno script: si misura la stessa coppia di
 *      policy che la action attraversa.
 *   7  `--check-new-upload`: l'ultima riga caricata (dal percorso vero, piano
 *      52-14) porta storage_path e non url.
 *   8  firma a 5 s, attesa di 10 s, GET → non 200 (prima dell'attesa: 200).
 *
 * ── LE DISCIPLINE ──────────────────────────────────────────────────────────
 *
 *   * **Rifiuta la produzione PRIMA di ogni chiamata**, come
 *     `scripts/seed-lab-door.mjs:70-92`: sul ref di laboratorio e sull'URL che
 *     i client useranno. Exit 2.
 *   * **Non stampa mai una chiave d'oggetto, un URL, un id o un indirizzo
 *     email.** Numero della sonda, atteso, osservato, esito, ora UTC. Lo
 *     standard output finisce in `.planning/`, e il repo e' pubblico.
 *   * **Ogni sessione coniata e' revocata globalmente, e la revoca e'
 *     riletta** (`verify-refusal.mjs`, disciplina 3).
 *   * **L'unica scrittura e' quella della sonda 6**, sul laboratorio, su un
 *     oggetto e una riga che lo script stesso crea — e se la sonda si ferma a
 *     meta' lo script li toglie col service role e lo dice.
 *
 * Exit: 0 ogni sonda conforme · 1 almeno una sonda NON conforme · 2 rifiuto o
 * misura non avvenuta. Non esiste un test runner: questo non e' un test, e'
 * una misura con la sua ora.
 */

import { createClient } from "@supabase/supabase-js";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const args = new Set(process.argv.slice(2));

/* ─────────────────────── il rifiuto, prima di tutto ─────────────────────── */

// Il ref di produzione e' scritto in chiaro, e va bene: e' gia' pubblico per
// costruzione, viaggia nel bundle del browser. Quello del laboratorio no: sta
// solo in `.env.lab.local`.
const PRODUCTION_REF = "cjsfocnhfzycbbgkwocx";

function refuse(message) {
  console.error(`\n  RIFIUTO: ${message}\n`);
  process.exit(2);
}

if (process.env.LAB_PROJECT_REF === PRODUCTION_REF) {
  refuse("LAB_PROJECT_REF e' il ref di PRODUZIONE. Queste sonde coniano sessioni e scrivono un media di prova: solo laboratorio.");
}

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
// `.env.lab.local` PRIMA: `loadEnvFile` non sovrascrive, quindi il primo vince
// e i client puntano al laboratorio; `.env.local` porta solo cio' che manca
// (il token della Management API).
for (const file of [".env.lab.local", ".env.local"]) {
  const path = `${ROOT}/${file}`;
  if (existsSync(path)) {
    try {
      process.loadEnvFile(path);
    } catch (error) {
      refuse(`${file} non si legge: ${error.message}`);
    }
  }
}

const LAB_REF = process.env.LAB_PROJECT_REF;
const URL_BASE = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

if (!LAB_REF) refuse("LAB_PROJECT_REF assente: carica .env.lab.local.");
if (LAB_REF === PRODUCTION_REF) refuse("LAB_PROJECT_REF e' il ref di PRODUZIONE.");
if (!URL_BASE || URL_BASE.includes(PRODUCTION_REF)) {
  refuse("NEXT_PUBLIC_SUPABASE_URL e' la produzione o e' vuoto.");
}
let urlRef = "";
try {
  urlRef = new URL(URL_BASE).hostname.split(".")[0];
} catch {
  refuse("NEXT_PUBLIC_SUPABASE_URL non e' un URL.");
}
if (urlRef !== LAB_REF) {
  refuse("NEXT_PUBLIC_SUPABASE_URL non punta al ref di laboratorio: i client parlerebbero con un altro progetto.");
}
const missing = [];
if (!ANON_KEY) missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
if (!SERVICE_KEY) missing.push("SUPABASE_SERVICE_ROLE_KEY");
if (!TOKEN) missing.push("SUPABASE_ACCESS_TOKEN");
if (missing.length) refuse(`variabili assenti: ${missing.join(", ")}.`);

/* ───────────────────────────── utilita' ───────────────────────────── */

const BUCKET = "event-media";
const CACHE_WINDOW_SECONDS = 3600;
const now = () => new Date().toISOString();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const admin = createClient(URL_BASE, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const anonymous = createClient(URL_BASE, ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/** Management API, sola lettura. Solo codici, mai il corpo di un errore. */
async function catalogue(query) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${LAB_REF}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query, read_only: true }),
  });
  if (!res.ok) throw new Error(`[probe.catalogue] Management API HTTP ${res.status}`);
  return res.json();
}

/** Una GET senza credenziali. Restituisce solo stato e intestazioni di cache. */
async function anonymousGet(url, { bust = false } = {}) {
  const target = bust ? `${url}${url.includes("?") ? "&" : "?"}probe=${Date.now()}${Math.random().toString(36).slice(2)}` : url;
  const res = await fetch(target, { headers: bust ? { "Cache-Control": "no-cache" } : {} });
  await res.arrayBuffer().catch(() => null);
  return {
    status: res.status,
    cache: res.headers.get("cf-cache-status") ?? "-",
    age: res.headers.get("age") ?? "-",
  };
}

const results = [];
let exitCode = 0;
function record(n, what, expected, observed, outcome) {
  // outcome: "conforme" | "NON CONFORME" | "NON MISURATA" | "cache (dentro la finestra)"
  results.push({ n, what, expected, observed, outcome, at: now() });
  if (outcome === "NON CONFORME") exitCode = 1;
  else if (outcome === "NON MISURATA" && exitCode === 0) exitCode = 2;
}

/* ───────────────────────── le sessioni, per ruolo ───────────────────────── */

const minted = [];

async function mintByRole(role) {
  const lookup = await admin
    .from("profiles")
    .select("id, email, created_at")
    .eq("role", role)
    .order("created_at", { ascending: true })
    .limit(1);
  if (lookup.error || !lookup.data?.[0]?.email) {
    return { role, client: null, id: null, why: lookup.error ? `${lookup.error.code} lookup` : "nessun profilo con questo ruolo" };
  }
  const { id, email } = lookup.data[0];
  const link = await admin.auth.admin.generateLink({ type: "magiclink", email });
  const hashed = link.data?.properties?.hashed_token;
  if (link.error || !hashed) return { role, client: null, id, why: `generateLink ${link.error?.status ?? "?"}` };
  // Un client usa-e-getta per ruolo: `verifyOtp` gli attacca la sessione in
  // memoria, ed e' proprio il client di sessione che serve alle sonde.
  const client = createClient(URL_BASE, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const verified = await client.auth.verifyOtp({ token_hash: hashed, type: "email" });
  const session = verified.data?.session;
  if (verified.error || !session?.access_token) {
    return { role, client: null, id, why: `verifyOtp ${verified.error?.status ?? "?"}` };
  }
  minted.push({ role, token: session.access_token });
  return { role, client, id, why: "" };
}

async function revokeAll() {
  const lines = [];
  for (const entry of minted) {
    const out = await admin.auth.admin.signOut(entry.token, "global");
    const reread = await anonymous.auth.getUser(entry.token);
    const still = Boolean(reread.data?.user);
    lines.push(`    ${entry.role.padEnd(10)} ${out.error ? `signOut rifiutato ${out.error.status ?? "?"}` : "revocata globalmente"} · il token risolve ancora un utente: ${still}`);
    if (still) exitCode = 1;
  }
  return lines;
}

/* ─────────────────────────────── la corsa ─────────────────────────────── */

console.log(`\nprobe-event-media-lab — P-52-G sul LABORATORIO · inizio ${now()}\n`);

// Quando e' stata applicata M2, dalla history del laboratorio: serve a dire se
// la sonda 1 cade dentro la finestra di cache.
let m2AppliedAt = null;
{
  const rows = await catalogue(
    "select version from supabase_migrations.schema_migrations where name = 'gallery_close_data' order by version desc limit 1"
  );
  const v = rows?.[0]?.version;
  if (v && /^\d{14}$/.test(v)) {
    m2AppliedAt = new Date(`${v.slice(0, 4)}-${v.slice(4, 6)}-${v.slice(6, 8)}T${v.slice(8, 10)}:${v.slice(10, 12)}:${v.slice(12, 14)}Z`);
  }
}
if (!m2AppliedAt) {
  refuse("M2 (gallery_close_data) non risulta nella history del laboratorio: queste sonde misurano il mondo DOPO M2. Nulla e' stato misurato.");
}
const sinceM2 = Math.round((Date.now() - m2AppliedAt.getTime()) / 1000);
console.log(`  M2 applicata alle ${m2AppliedAt.toISOString()} · ${sinceM2} s fa · finestra di cache ${CACHE_WINDOW_SECONDS} s → ${sinceM2 > CACHE_WINDOW_SECONDS ? "FUORI dalla finestra" : "DENTRO la finestra"}\n`);

// Le chiavi, lette col service role. Restano in memoria e non si stampano.
const rowsRead = await admin
  .from("event_media")
  .select("id, event_id, party_id, status, storage_path, url, created_at, event_parties(venue_secret)");
if (rowsRead.error) refuse(`[probe.rows_read] ${rowsRead.error.code} — le righe del banco non si leggono.`);
const rows = rowsRead.data ?? [];
const approved = rows.filter((r) => r.status === "approved" && r.storage_path);
const pending = rows.filter((r) => r.status === "pending" && r.storage_path);
const secretApproved = approved.filter((r) => r.event_parties?.venue_secret === true);
console.log(`  banco: ${rows.length} righe · approvate ${approved.length} (di serata segreta ${secretApproved.length}) · in attesa ${pending.length}\n`);
if (approved.length === 0 || pending.length === 0) {
  refuse("il banco non ha almeno una riga approvata e una in attesa: le sonde non hanno soggetto (PRE-LAB).");
}

const attendee = await mintByRole("attendee");
const staff = await mintByRole("staff");
const organizer = await mintByRole("organizer");
for (const s of [attendee, staff, organizer]) {
  console.log(`  sessione ${s.role.padEnd(9)} ${s.client ? "coniata" : `NON coniata — ${s.why}`}`);
}
console.log("");

try {
  /* ── 1. anonimo, indirizzo pubblico ─────────────────────────────────── */
  {
    const plain = { ok: 0, twoHundred: 0, secretTwoHundred: 0, statuses: {}, cache: {} };
    const busted = { twoHundred: 0, statuses: {} };
    for (const r of approved) {
      const publicUrl = `${URL_BASE}/storage/v1/object/public/${BUCKET}/${r.storage_path}`;
      const a = await anonymousGet(publicUrl);
      plain.statuses[a.status] = (plain.statuses[a.status] ?? 0) + 1;
      plain.cache[a.cache] = (plain.cache[a.cache] ?? 0) + 1;
      if (a.status === 200) plain.twoHundred += 1;
      // Per il segreto del venue conta SE l'oggetto ancora servito e' di una
      // serata segreta: si conta, non si nomina.
      if (a.status === 200 && r.event_parties?.venue_secret === true) plain.secretTwoHundred += 1;
      const b = await anonymousGet(publicUrl, { bust: true });
      busted.statuses[b.status] = (busted.statuses[b.status] ?? 0) + 1;
      if (b.status === 200) busted.twoHundred += 1;
    }
    const fmt = (o) => Object.entries(o).map(([k, v]) => `${k}×${v}`).join(" ");
    record(
      "1b",
      "anonimo, indirizzo pubblico con parametro unico (origine, cache scavalcata)",
      `non 200 su ${approved.length}/${approved.length}`,
      `stati ${fmt(busted.statuses)}`,
      busted.twoHundred === 0 ? "conforme" : "NON CONFORME"
    );
    const inWindow = sinceM2 <= CACHE_WINDOW_SECONDS;
    record(
      "1a",
      "anonimo, indirizzo pubblico cosi' com'e' (cio' che riceve chi l'ha copiato)",
      `non 200 su ${approved.length}/${approved.length}${inWindow ? " — ma dentro la finestra un 200 e' cache" : ""}`,
      `stati ${fmt(plain.statuses)} · 200 di serata segreta ${plain.secretTwoHundred} · cf-cache-status ${fmt(plain.cache)} · ${sinceM2} s dopo M2`,
      plain.twoHundred === 0 ? "conforme" : inWindow ? "cache (dentro la finestra)" : "NON CONFORME"
    );
  }

  /* ── 2. attendee, righe approvate ───────────────────────────────────── */
  if (!attendee.client) {
    record("2", "attendee, righe approvate via PostgREST", "0 righe", "sessione non coniata", "NON MISURATA");
  } else {
    const c = await attendee.client.from("event_media").select("id", { count: "exact", head: true }).eq("status", "approved");
    const all = await attendee.client.from("event_media").select("id", { count: "exact", head: true });
    record(
      "2",
      "attendee, event_media status=eq.approved via PostgREST",
      "0 righe",
      c.error ? `errore ${c.error.code}` : `${c.count} righe approvate · ${all.error ? "?" : all.count} righe in tutto`,
      c.error ? "NON MISURATA" : c.count === 0 && (all.count ?? 0) === 0 ? "conforme" : "NON CONFORME"
    );
  }

  /* ── 3. attendee e anonimo, firma di chiavi note ────────────────────── */
  const keysAll = approved.map((r) => r.storage_path);
  for (const [label, client] of [["attendee", attendee.client], ["anonimo", anonymous]]) {
    if (!client) {
      record("3", `${label}, createSignedUrls su chiavi note`, "nessun URL", "sessione non coniata", "NON MISURATA");
      continue;
    }
    const s = await client.storage.from(BUCKET).createSignedUrls(keysAll, 60);
    const signed = (s.data ?? []).filter((e) => e.signedUrl).length;
    record(
      "3",
      `${label}, createSignedUrls su ${keysAll.length} chiavi approvate note`,
      "0 URL",
      s.error ? `rifiutata (${s.error.statusCode ?? s.error.status ?? "errore"}) · 0 URL` : `${signed} URL`,
      signed === 0 ? "conforme" : "NON CONFORME"
    );
  }

  /* ── 4. staff: pending rifiutata, approvate firmate e servite ───────── */
  if (!staff.client) {
    record("4", "staff, firma", "pending no, approvate si'", "sessione non coniata", "NON MISURATA");
  } else {
    const p = await staff.client.storage.from(BUCKET).createSignedUrls(pending.map((r) => r.storage_path), 60);
    const pSigned = (p.data ?? []).filter((e) => e.signedUrl).length;
    record(
      "4a",
      `staff, firma di ${pending.length} chiave/i PENDING`,
      "0 URL",
      p.error ? `rifiutata (${p.error.statusCode ?? p.error.status ?? "errore"}) · 0 URL` : `${pSigned} URL`,
      pSigned === 0 ? "conforme" : "NON CONFORME"
    );

    const a = await staff.client.storage.from(BUCKET).createSignedUrls(keysAll, 60);
    const entries = (a.data ?? []).filter((e) => e.signedUrl);
    let served = 0;
    const statuses = {};
    for (const e of entries) {
      const res = await fetch(e.signedUrl);
      await res.arrayBuffer().catch(() => null);
      statuses[res.status] = (statuses[res.status] ?? 0) + 1;
      if (res.status === 200) served += 1;
    }
    const secretKeys = new Set(secretApproved.map((r) => r.storage_path));
    const secretSigned = entries.filter((e) => secretKeys.has(e.path)).length;
    record(
      "4b",
      `staff, firma di ${keysAll.length} chiavi APPROVATE (${secretApproved.length} di serata segreta)`,
      `${keysAll.length} firmate, ${keysAll.length} servite 200`,
      `${entries.length} firmate (segrete ${secretSigned}) · GET ${Object.entries(statuses).map(([k, v]) => `${k}×${v}`).join(" ") || "-"}`,
      entries.length === keysAll.length && served === keysAll.length && secretSigned === secretApproved.length ? "conforme" : "NON CONFORME"
    );

    /* ── 8. firma scaduta ─────────────────────────────────────────────── */
    const short = await staff.client.storage.from(BUCKET).createSignedUrl(approved[0].storage_path, 5);
    if (short.error || !short.data?.signedUrl) {
      record("8", "staff, firma a 5 s", "200 subito, non 200 dopo 10 s", `firma non ottenuta (${short.error?.statusCode ?? "?"})`, "NON MISURATA");
    } else {
      const before = await fetch(short.data.signedUrl);
      await before.arrayBuffer().catch(() => null);
      await sleep(10_000);
      const after = await fetch(short.data.signedUrl);
      await after.arrayBuffer().catch(() => null);
      record(
        "8",
        "staff, firma a 5 s, GET subito e dopo 10 s",
        "200 subito · non 200 dopo",
        `${before.status} subito · ${after.status} dopo 10 s`,
        before.status === 200 && after.status !== 200 ? "conforme" : "NON CONFORME"
      );
    }
  }

  /* ── 6. organizer, cancellazione di un media di prova ───────────────── */
  if (args.has("--skip-write")) {
    record("6", "organizer, cancellazione oggetto + riga", "entrambi spariti", "saltata (--skip-write)", "NON MISURATA");
  } else if (!organizer.client) {
    record("6", "organizer, cancellazione oggetto + riga", "entrambi spariti", "sessione non coniata", "NON MISURATA");
  } else {
    const host = approved.find((r) => r.event_parties?.venue_secret !== true) ?? approved[0];
    const key = `${host.event_id}/${organizer.id}/probe-52-13-${Date.now()}.jpg`;
    // Un JPEG sintetico di pochi byte, senza EXIF: nessuna persona, nessun luogo.
    const bytes = Buffer.from("/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==", "base64");
    let rowId = null;
    let objectMade = false;
    try {
      const up = await admin.storage.from(BUCKET).upload(key, bytes, { contentType: "image/jpeg", upsert: false });
      if (up.error) throw new Error(`[probe.seed_object] ${up.error.statusCode ?? "?"}`);
      objectMade = true;
      const ins = await admin
        .from("event_media")
        .insert({ event_id: host.event_id, party_id: host.party_id, uploaded_by: organizer.id, type: "photo", status: "pending", storage_path: key, url: null, file_size: bytes.length })
        .select("id")
        .single();
      if (ins.error) throw new Error(`[probe.seed_row] ${ins.error.code}`);
      rowId = ins.data.id;

      // La sessione organizer: prima l'oggetto, poi la riga (ordine di deleteMedia).
      const rm = await organizer.client.storage.from(BUCKET).remove([key]);
      const removedListed = (rm.data ?? []).some((o) => o.name === key);
      const del = await organizer.client.from("event_media").delete({ count: "exact" }).eq("id", rowId);

      // Il riconteggio, col service role: l'oggetto dal catalogo, la riga da PostgREST.
      const objLeft = await catalogue(
        `select count(*)::int as n from storage.objects where bucket_id = 'event-media' and name = '${key.replace(/'/g, "''")}'`
      );
      const rowLeft = await admin.from("event_media").select("id", { count: "exact", head: true }).eq("id", rowId);
      const objectsLeft = objLeft?.[0]?.n ?? -1;
      const rowsLeft = rowLeft.count ?? -1;
      if (objectsLeft === 0) objectMade = false;
      if (rowsLeft === 0) rowId = null;
      record(
        "6",
        "organizer: remove dell'oggetto e delete della riga di un media di prova, poi riconteggio col service role",
        "oggetto rimosso ed elencato · 1 riga cancellata · 0 oggetti e 0 righe residui",
        `remove ${rm.error ? `errore ${rm.error.statusCode ?? "?"}` : removedListed ? "elencato" : "lista vuota"} · delete ${del.error ? `errore ${del.error.code}` : `${del.count} riga`} · residui: oggetti ${objectsLeft}, righe ${rowsLeft}`,
        !rm.error && removedListed && !del.error && del.count === 1 && objectsLeft === 0 && rowsLeft === 0 ? "conforme" : "NON CONFORME"
      );
    } catch (error) {
      record("6", "organizer, cancellazione oggetto + riga", "entrambi spariti", `fermata: ${error.message}`, "NON MISURATA");
    } finally {
      // Nessun residuo del banco lasciato a meta', e se c'e' si dice.
      if (rowId) {
        const r = await admin.from("event_media").delete({ count: "exact" }).eq("id", rowId);
        console.log(`  [probe.cleanup] riga di prova tolta col service role: ${r.error ? `errore ${r.error.code}` : r.count}`);
      }
      if (objectMade) {
        const o = await admin.storage.from(BUCKET).remove([key]);
        console.log(`  [probe.cleanup] oggetto di prova tolto col service role: ${o.error ? `errore ${o.error.statusCode ?? "?"}` : (o.data ?? []).length}`);
      }
    }
  }

  /* ── 7. il nuovo caricamento (dopo la corsa del piano 52-14) ────────── */
  if (args.has("--check-new-upload")) {
    const last = [...rows].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))[0];
    record(
      "7",
      "l'ultima riga caricata porta storage_path e non url",
      "storage_path valorizzato · url nullo",
      last ? `storage_path ${last.storage_path ? "valorizzato" : "NULLO"} · url ${last.url === null ? "nullo" : "VALORIZZATO"} · creata ${last.created_at}` : "nessuna riga",
      last && last.storage_path && last.url === null ? "conforme" : "NON CONFORME"
    );
  } else {
    // Dichiarata, non un rifiuto della corsa: il soggetto nasce nel piano 52-14.
    record("7", "nuovo caricamento da staff", "storage_path valorizzato · url nullo", "non eseguita qui: si rilegge con --check-new-upload dopo la corsa del piano 52-14", "rimandata a 52-14");
  }
} finally {
  console.log("  ── revoca delle sessioni, riletta ─────────────────────────────────────\n");
  for (const line of await revokeAll()) console.log(line);
}

console.log("\n  ── esiti ──────────────────────────────────────────────────────────────\n");
for (const r of results) {
  console.log(`  [${r.at}] sonda ${String(r.n).padEnd(3)} ${r.outcome}`);
  console.log(`      cosa:      ${r.what}`);
  console.log(`      atteso:    ${r.expected}`);
  console.log(`      osservato: ${r.observed}`);
}
const oneA = results.find((r) => r.n === "1a");
console.log("");
if (oneA?.outcome === "cache (dentro la finestra)") {
  console.log(`  ⚠ la sonda 1a NON dice «chiuso»: si ripete dopo ${m2AppliedAt ? new Date(m2AppliedAt.getTime() + CACHE_WINDOW_SECONDS * 1000).toISOString() : "la finestra"} (Pitfall 15).`);
} else if (oneA?.outcome === "conforme" && sinceM2 <= CACHE_WINDOW_SECONDS) {
  console.log("  la sonda 1a e' gia' non-200 dentro la finestra; la ripetizione dopo la finestra resta la misura che dice «chiuso».");
}
console.log(`\n  fine ${now()} · exit ${exitCode}\n`);
process.exit(exitCode);
