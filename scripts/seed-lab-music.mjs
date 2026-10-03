/**
 * seed-lab-music.mjs — porta sul LABORATORIO la copia di cio' che la produzione
 * ha gia' pubblicato (eventi, serate, artisti, la sede delle sole serate non
 * segrete) piu' le poche righe di prova che la produzione non puo' offrire, e
 * prova dal di fuori che la RLS dei LiveCut lascia vedere all'anonimo solo cio'
 * che deve. Fase 52.3, piano 06 (MUS-03, MUS-07, MUS-08, MUS-09).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * LA PRODUZIONE E' LA FONTE, MAI LA DESTINAZIONE.
 *
 * 1. La prima riga eseguita e' il rifiuto: se `LAB_PROJECT_REF` e' il ref di
 *    produzione lo script esce 2 prima di qualunque lettura e scrittura.
 * 2. Tutto cio' che tocca la produzione sta fra i marcatori PROD-READ, in una
 *    sola funzione `prodGet()`, che emette solo GET (PostgREST con la chiave
 *    anon, URL pubblici dello storage) o una POST all'endpoint SQL della
 *    Management API con `read_only: true`. Nessun client Supabase verso la
 *    produzione. Lo prova `scripts/check-seed-readonly.mjs`, eseguibile, con
 *    una mutazione vista fallire.
 * 3. Le funzioni di scrittura conoscono solo il laboratorio, e rifiutano un
 *    indirizzo che contenga il ref di produzione.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * IL PERIMETRO DELLA COPIA — decisione del proprietario, riquadro accanto alla
 * regola 2 di `.planning/v1.6-LAB-DESIGN.md`. Entrano solo righe gia' pubbliche:
 * eventi pubblicati, le loro serate, gli artisti, la riga `venues` delle sedi di
 * serate NON segrete, e gli oggetti dei bucket pubblici che quelle righe citano.
 * Restano fuori profili, account, biglietti, ordini, guest list, scansioni,
 * atti, mail, ogni sede di una serata segreta e `venue_secret_hint`.
 *
 * LA LETTURA CON PRIVILEGI NON ALLARGA IL PERIMETRO DELL'ANONIMO.
 *   - L'insieme delle righe lo decide sempre la lettura anonima; il ripiego
 *     `read_only` aggiunge colonne, mai righe: `WHERE id IN (<id letti da anon>)`.
 *   - Gli eventi con `early_access_until` nel futuro restano fuori in entrambe
 *     le letture (lo stesso filtro di `events_select_published`).
 *   - Prima di qualunque scrittura, nome e indirizzo delle sedi segrete — letti
 *     in memoria, mai stampati, mai scritti su file — si cercano in ogni colonna
 *     di testo da copiare. Una corrispondenza = stop, zero righe scritte.
 *   Ordine: tutte le letture → la ricerca → le scritture.
 *
 * UNA SERATA E' SEGRETA se lo e' la serata O il suo evento. La sede di una
 * serata segreta non si copia: la serata punta alla sede segnaposto
 * `Lab Secret Venue`, `Via del Laboratorio 7` (dichiaratamente falsa), e una sede
 * citata anche da una sola serata segreta non si copia nemmeno per le altre.
 *
 * LE RIMOZIONI SEGUONO LE REGOLE DI `seed-lab-door.mjs`: la chiave primaria si
 * cattura alla creazione e va nel file di chiavi `.env.lab.music-seed.json`
 * (ignorato da git) dopo OGNI insert; la rimozione e' per chiave; il conteggio
 * dopo si rilegge da PostgREST (fonte diversa dall'endpoint SQL con cui si
 * cancella) e la riga «0 remaining» si stampa solo dopo quel riconteggio.
 *
 * IL CONTATORE `party_series.highest_assigned` del laboratorio sale al valore
 * di produzione quando si copiano le serate (trigger
 * `event_parties_bump_series_watermark`, GREATEST) e NON riscende dopo la
 * rimozione. E' una guardia monotona: un progressivo assegnato e' gia' su una
 * locandina. Lo script non lo abbassa, di proposito.
 *
 * LE RIGHE FITTIZIE, e sono solo queste: due artisti `Lab Artist A/B`, i LiveCut
 * PT1-PT4 sulla notte passata piu' recente (PT2 dopo mezzanotte, PT3 b2b, PT4
 * bozza), un evento NON pubblicato con la sua serata e un LiveCut pubblicato, tre
 * account `@lab.invalid`. Piu' i LiveCut reali della serie BZ, numeri 1 e 2, che
 * pubblicano solo con URL verificato E durata data dal proprietario.
 *
 * Questo file e' su un repository PUBBLICO: nessun nome di artista o di sede,
 * nessun URL di traccia reale, nessuna data. I dati veri arrivano a runtime.
 *
 * USO (con `.env.local` e poi `.env.lab.local` caricati, come `dev-lab.sh`):
 *   set -a; source .env.local; source .env.lab.local; set +a
 *   node scripts/seed-lab-music.mjs --seed               copia + righe di prova
 *   node scripts/seed-lab-music.mjs --verify             conteggi + sonde anonime
 *   node scripts/seed-lab-music.mjs --teardown           rimuove tutto, per chiave
 *   node scripts/seed-lab-music.mjs --teardown-fixtures  rimuove solo le righe di
 *                                                        prova e i LiveCut
 *
 * Input del proprietario (in `.env.lab.local`, mai nel file):
 *   MUSIC_SEED_LIVECUT_URL_BZ_001, MUSIC_SEED_LIVECUT_DURATION_BZ_001 (h:mm:ss),
 *   MUSIC_SEED_COVER_BZ_001 (percorso locale), e gli stessi con _BZ_002.
 */

import { readFileSync, writeFileSync, existsSync, unlinkSync } from "node:fs";
import { randomUUID } from "node:crypto";

/* ───────────────────────── il rifiuto, prima di tutto ───────────────────────── */

const PRODUCTION_REF = "cjsfocnhfzycbbgkwocx";
const REF = process.env.LAB_PROJECT_REF;
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

if (!REF || !TOKEN) {
  console.error("LAB_PROJECT_REF o SUPABASE_ACCESS_TOKEN assenti. Carica .env.local e poi .env.lab.local.");
  process.exit(2);
}
if (REF === PRODUCTION_REF) {
  console.error(
    "RIFIUTO: LAB_PROJECT_REF e' il ref di PRODUZIONE.\n" +
      "La produzione e' la FONTE di questo script, mai la destinazione."
  );
  process.exit(2);
}

const SEED_FILE = ".env.lab.music-seed.json";
const LAB_URL = process.env.LAB_SUPABASE_URL;
const LAB_SRK = process.env.LAB_SUPABASE_SERVICE_ROLE_KEY;
const LAB_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!LAB_URL || !LAB_SRK || !LAB_ANON) {
  console.error("LAB_SUPABASE_URL, LAB_SUPABASE_SERVICE_ROLE_KEY o la chiave anon del laboratorio assenti.");
  process.exit(2);
}
if (LAB_URL.includes(PRODUCTION_REF) || !LAB_URL.includes(REF)) {
  console.error("RIFIUTO: LAB_SUPABASE_URL non e' l'indirizzo del laboratorio.");
  process.exit(2);
}
if (jwtRef(LAB_ANON) !== REF) {
  console.error("RIFIUTO: la chiave anon caricata non e' del laboratorio (carica .env.lab.local DOPO .env.local).");
  process.exit(2);
}

/** Il `ref` dentro una chiave JWT di Supabase, o null se la chiave non e' un JWT leggibile. */
function jwtRef(key) {
  try {
    const payload = JSON.parse(Buffer.from(String(key).split(".")[1], "base64url").toString("utf8"));
    return typeof payload.ref === "string" ? payload.ref : null;
  } catch {
    return null;
  }
}

/* ───────────────────── la sola lettura della produzione ───────────────────── */

// PROD-READ-BEGIN
//
// Qui, e solo qui, si costruisce un indirizzo di produzione. Ogni richiesta e'
// una GET, tranne la lettura SQL che porta `read_only: true` (la Management API
// apre una transazione in sola lettura: un INSERT li' dentro fallisce). Nessuna
// funzione fra questi marcatori sa scrivere.

const PROD_BASE = `https://${PRODUCTION_REF}.supabase.co`;
const PROD_PUBLIC_STORAGE = `${PROD_BASE}/storage/v1/object/public/`;
let prodAnonCache = null;

/**
 * La chiave anon di produzione si legge da `.env.local` e non da `process.env`:
 * dopo il caricamento di `.env.lab.local` la variabile d'ambiente porta quella
 * del laboratorio. La chiave deve dichiarare il ref di produzione.
 */
function prodAnonKey() {
  if (prodAnonCache) return prodAnonCache;
  const text = readFileSync(".env.local", "utf8");
  const m = text.match(/^NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)$/m);
  if (!m) throw new Error("prod.anon_key_missing: NEXT_PUBLIC_SUPABASE_ANON_KEY assente in .env.local");
  const key = m[1].trim().replace(/^["']|["']$/g, "");
  if (jwtRef(key) !== PRODUCTION_REF) throw new Error("prod.anon_key_mismatch: la chiave di .env.local non e' quella di produzione");
  prodAnonCache = key;
  return key;
}

/**
 * L'unico lettore della produzione.
 *   { rest: "<tabella>?<query>" } → GET PostgREST con la chiave ANON
 *   { object: "<url pubblico>" }  → GET di un oggetto di un bucket pubblico
 *   { sql: "<select ...>" }       → POST /database/query con read_only: true
 */
async function prodGet(target) {
  if (target.rest) {
    const key = prodAnonKey();
    const res = await fetch(`${PROD_BASE}/rest/v1/${target.rest}`, {
      method: "GET",
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    if (!res.ok) throw new Error(`prod.rest ${res.status}: ${(await res.text()).slice(0, 200)}`);
    return res.json();
  }
  if (target.object) {
    if (!target.object.startsWith(PROD_PUBLIC_STORAGE)) return { ok: false, status: "fuori da un bucket pubblico" };
    const res = await fetch(target.object, { method: "GET" });
    if (!res.ok) return { ok: false, status: res.status };
    return {
      ok: true,
      status: res.status,
      contentType: res.headers.get("content-type") || "application/octet-stream",
      bytes: Buffer.from(await res.arrayBuffer()),
    };
  }
  if (target.sql) {
    const res = await fetch(`https://api.supabase.com/v1/projects/${PRODUCTION_REF}/database/query`, {
      method: "POST",
      headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query: target.sql, read_only: true }),
    });
    if (!res.ok) throw new Error(`prod.sql_read_only ${res.status}: ${(await res.text()).slice(0, 200)}`);
    return res.json();
  }
  throw new Error("prodGet: bersaglio sconosciuto");
}

/** Bucket e chiave di un URL pubblico dello storage di produzione, o null. */
function prodObjectPath(url) {
  if (typeof url !== "string" || !url.startsWith(PROD_PUBLIC_STORAGE)) return null;
  const rest = url.slice(PROD_PUBLIC_STORAGE.length);
  const slash = rest.indexOf("/");
  if (slash <= 0 || rest.includes("?") || rest.includes("#")) return null;
  return { bucket: rest.slice(0, slash), rawKey: rest.slice(slash + 1) };
}

// PROD-READ-END

/* ─────────────────────── scrittura: solo il laboratorio ─────────────────────── */

function labGuard(url) {
  if (url.includes(PRODUCTION_REF)) {
    console.error("RIFIUTO: una funzione di scrittura ha ricevuto un indirizzo di produzione.");
    process.exit(2);
  }
  return url;
}

async function sql(query) {
  const url = labGuard(`https://api.supabase.com/v1/projects/${REF}/database/query`);
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) throw new Error(`lab.sql ${res.status}: ${(await res.text()).slice(0, 400)}`);
  return res.json();
}

async function labSqlReadOnly(query) {
  const url = labGuard(`https://api.supabase.com/v1/projects/${REF}/database/query`);
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query, read_only: true }),
  });
  if (!res.ok) throw new Error(`lab.sql_read_only ${res.status}: ${(await res.text()).slice(0, 400)}`);
  return res.json();
}

/** GET PostgREST del laboratorio, con la service key o con la sola anon. */
async function labRest(path, { anon = false } = {}) {
  const key = anon ? LAB_ANON : LAB_SRK;
  const res = await fetch(labGuard(`${LAB_URL}/rest/v1/${path}`), {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  const text = await res.text();
  let body = null;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  return { status: res.status, body };
}

async function labUpload(bucket, rawKey, bytes, contentType) {
  const res = await fetch(labGuard(`${LAB_URL}/storage/v1/object/${bucket}/${rawKey}`), {
    method: "POST",
    headers: {
      apikey: LAB_SRK,
      Authorization: `Bearer ${LAB_SRK}`,
      "Content-Type": contentType,
      "x-upsert": "true",
    },
    body: bytes,
  });
  return { ok: res.ok, status: res.status, detail: res.ok ? "" : (await res.text()).slice(0, 200) };
}

async function labStorageDelete(bucket, key) {
  const res = await fetch(labGuard(`${LAB_URL}/storage/v1/object/${bucket}`), {
    method: "DELETE",
    headers: { apikey: LAB_SRK, Authorization: `Bearer ${LAB_SRK}`, "Content-Type": "application/json" },
    body: JSON.stringify({ prefixes: [key] }),
  });
  const body = res.ok ? await res.json() : [];
  return { ok: res.ok, status: res.status, removed: Array.isArray(body) ? body.length : 0 };
}

/** Esiste ancora l'oggetto? Si chiede all'URL pubblico: un'altra strada da quella della cancellazione. */
async function labObjectExists(bucket, rawKey) {
  const res = await fetch(labGuard(`${LAB_URL}/storage/v1/object/public/${bucket}/${rawKey}`), { method: "HEAD" });
  return res.ok;
}

const labPublicUrl = (bucket, rawKey) => `${LAB_URL}/storage/v1/object/public/${bucket}/${rawKey}`;
const AUTH = () => labGuard(`${LAB_URL}/auth/v1/admin/users`);
const authHeaders = () => ({ apikey: LAB_SRK, Authorization: `Bearer ${LAB_SRK}`, "Content-Type": "application/json" });

/* ─────────────────────────────── utilita' ─────────────────────────────── */

const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
const qList = (ids) => ids.map(q).join(", ");

function romeToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome" }).format(new Date());
}

function loadSeed({ required = true } = {}) {
  if (!existsSync(SEED_FILE)) {
    if (!required) return null;
    console.error(`${SEED_FILE} non esiste — non c'e' niente da rimuovere o verificare.`);
    process.exit(1);
  }
  const ids = JSON.parse(readFileSync(SEED_FILE, "utf8"));
  if (ids.ref !== REF) {
    console.error("Il file di chiavi e' di un altro progetto. Mi fermo.");
    process.exit(1);
  }
  return ids;
}

function stop(message) {
  console.error(`STOP — ${message}`);
  process.exit(1);
}

/** Colonne di testo da cercare, per tabella. `lineup` e' text[]. */
const TEXT_COLUMNS = {
  events: ["slug", "title", "description", "lineup"],
  event_parties: ["title", "description", "venue_text", "lineup", "venue_secret_hint"],
  artists: ["name", "slug", "bio", "instagram_url", "soundcloud_url", "spotify_url", "website_url"],
  venues: ["name", "slug", "bio", "address", "google_maps_url", "instagram_url", "website_url"],
};

/** Le colonne FK che questo script sa trattare. Una in piu' sul laboratorio = stop. */
const EXPECTED_FK = {
  events: ["created_by"],
  event_parties: ["event_id", "venue_id", "format_id", "series_id"],
  artists: ["created_by"],
  venues: ["created_by"],
};

/** Conta le corrispondenze delle stringhe segrete in un insieme di righe; mai le stringhe. */
function secretHits(table, rows, secrets) {
  const hits = [];
  for (const row of rows) {
    for (const col of TEXT_COLUMNS[table] || []) {
      const v = row[col];
      const values = Array.isArray(v) ? v : [v];
      for (const val of values) {
        if (typeof val !== "string") continue;
        const low = val.toLowerCase();
        if (secrets.some((s) => low.includes(s))) hits.push(`${table}.${col}`);
      }
    }
  }
  return hits;
}

/* ─────────────────── lettura della produzione (tutte prima) ─────────────────── */

/** Nome e indirizzo delle sedi segrete: in memoria, in minuscolo, mai stampati. */
async function readSecretStrings(secretVenueIds) {
  if (!secretVenueIds.length) return [];
  const rows = await prodGet({
    sql: `select name, address from public.venues WHERE id IN (${qList(secretVenueIds)})`,
  });
  const out = [];
  for (const r of rows) {
    for (const v of [r.name, r.address]) {
      if (typeof v === "string" && v.trim().length >= 3) out.push(v.trim().toLowerCase());
    }
  }
  return out;
}

/** Le serate segrete e le sedi: quali id sono segreti, quali sedi si possono copiare. */
function classifyVenues(events, parties) {
  const eventSecret = new Map(events.map((e) => [e.id, e.venue_secret === true]));
  const isSecret = (p) => p.venue_secret === true || eventSecret.get(p.event_id) === true;
  const secretVenueIds = new Set();
  const publicVenueIds = new Set();
  for (const p of parties) {
    if (!p.venue_id) continue;
    (isSecret(p) ? secretVenueIds : publicVenueIds).add(p.venue_id);
  }
  for (const id of secretVenueIds) publicVenueIds.delete(id);
  return { isSecret, secretVenueIds: [...secretVenueIds], publicVenueIds: [...publicVenueIds] };
}

async function readProduction() {
  const nowIso = new Date().toISOString();

  // (b) Eventi pubblicati, senza un accesso anticipato ancora in corso — filtro
  // scritto anche qui, oltre a quello della policy anonima.
  const eventsRaw = await prodGet({
    rest: `events?select=*&is_published=eq.true&or=(early_access_until.is.null,early_access_until.lte.${encodeURIComponent(nowIso)})`,
  });
  const events = eventsRaw.filter(
    (e) => e.is_published === true && (!e.early_access_until || new Date(e.early_access_until) <= new Date())
  );
  const eventIds = events.map((e) => e.id);

  // (c) Le serate di quegli eventi, lette da anon.
  const parties = eventIds.length
    ? await prodGet({ rest: `event_parties?select=*&event_id=in.(${eventIds.join(",")})` })
    : [];

  // (e) Gli artisti: la loro pagina e' gia' pubblica.
  const artists = await prodGet({ rest: "artists?select=*" });

  // Format e serie: chiavi naturali, lette per gli id che la lettura anonima delle
  // serate ha restituito — nessuna riga in piu'.
  const formatIds = [...new Set(parties.map((p) => p.format_id))];
  const seriesIds = [...new Set(parties.map((p) => p.series_id))];
  const formats = formatIds.length
    ? await prodGet({ sql: `select id, slug from public.formats WHERE id IN (${qList(formatIds)})` })
    : [];
  const series = seriesIds.length
    ? await prodGet({
        sql: `select s.id, s.code, f.slug as format_slug from public.party_series s join public.formats f on f.id = s.format_id WHERE s.id IN (${qList(seriesIds)})`,
      })
    : [];

  // (d) Le sedi: l'anonimo non legge `venues`, quindi il ripiego read_only, solo
  // per gli id che la lettura anonima delle serate ha restituito.
  const { isSecret, secretVenueIds, publicVenueIds } = classifyVenues(events, parties);
  const venues = publicVenueIds.length
    ? await prodGet({ sql: `select * from public.venues WHERE id IN (${qList(publicVenueIds)})` })
    : [];
  const secrets = await readSecretStrings(secretVenueIds);

  // (a) Il catalogo delle colonne, su entrambi i progetti.
  const catalogQuery = `select table_name, column_name from information_schema.columns
     where table_schema = 'public' and table_name in ('events','event_parties','artists','venues')`;
  const prodCols = await prodGet({ sql: catalogQuery });
  const labCols = await labSqlReadOnly(catalogQuery);

  // (f) Gli oggetti dei bucket pubblici, letti ora e tenuti in memoria.
  const objects = new Map();
  const wanted = [
    ...events.map((e) => ["events.cover_image", e.cover_image]),
    ...artists.map((a) => ["artists.photo_url", a.photo_url]),
    ...venues.map((v) => ["venues.photo_url", v.photo_url]),
  ];
  for (const [where, url] of wanted) {
    if (!url || objects.has(url)) continue;
    const path = prodObjectPath(url);
    if (!path) {
      objects.set(url, { where, ok: false, status: "fuori da un bucket pubblico" });
      continue;
    }
    const got = await prodGet({ object: url });
    objects.set(url, { where, ...path, ...got });
  }

  return { events, parties, artists, formats, series, venues, secrets, isSecret, secretVenueIds, prodCols, labCols, objects };
}

/* ──────────────────────────────── la copia ──────────────────────────────── */

function intersectColumns(prodCols, labCols, table) {
  const p = new Set(prodCols.filter((r) => r.table_name === table).map((r) => r.column_name));
  return labCols.filter((r) => r.table_name === table && p.has(r.column_name)).map((r) => r.column_name);
}

async function checkForeignKeys() {
  const rows = await labSqlReadOnly(`
    select c.conrelid::regclass::text as tbl, a.attname as col
      from pg_constraint c
      join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any (c.conkey)
     where c.contype = 'f'
       and c.conrelid in ('public.events'::regclass, 'public.event_parties'::regclass,
                          'public.artists'::regclass, 'public.venues'::regclass)`);
  const unexpected = [];
  for (const r of rows) {
    const table = r.tbl.replace(/^public\./, "");
    if (!EXPECTED_FK[table]?.includes(r.col)) unexpected.push(`${table}.${r.col}`);
  }
  if (unexpected.length) stop(`colonna FK non prevista sul laboratorio: ${[...new Set(unexpected)].join(", ")}`);
}

/** Inserisce UNA riga, con le colonne date, e restituisce gli id effettivamente inseriti. */
async function insertRow(table, cols, row, { onConflictId = false } = {}) {
  const list = cols.map((c) => `"${c}"`).join(", ");
  const json = JSON.stringify(Object.fromEntries(cols.map((c) => [c, row[c] ?? null])));
  const r = await sql(`
    insert into public.${table} (${list})
    select ${list} from json_populate_record(null::public.${table}, ${q(json)})
    ${onConflictId ? "on conflict (id) do nothing" : ""}
    returning id`);
  return r.map((x) => x.id);
}

async function copyProduction(ids, write) {
  const prod = await readProduction();
  const { events, parties, artists, formats, series, venues, secrets, isSecret, objects } = prod;

  await checkForeignKeys();

  // Mappatura per chiave naturale: sul laboratorio format e serie vengono dal
  // seme della migration, con id propri.
  const labFormats = await labSqlReadOnly(`select id, slug from public.formats`);
  const labSeries = await labSqlReadOnly(
    `select s.id, s.code, f.slug as format_slug, f.id as format_id from public.party_series s join public.formats f on f.id = s.format_id`
  );
  const formatSlug = new Map(formats.map((f) => [f.id, f.slug]));
  const seriesKey = new Map(series.map((s) => [s.id, `${s.format_slug}/${s.code}`]));
  const labFormatBySlug = new Map(labFormats.map((f) => [f.slug, f.id]));
  const labSeriesByKey = new Map(labSeries.map((s) => [`${s.format_slug}/${s.code}`, s]));
  for (const p of parties) {
    const fs = formatSlug.get(p.format_id);
    const sk = seriesKey.get(p.series_id);
    if (!fs || !labFormatBySlug.has(fs)) stop("una serata ha un format senza corrispondenza sul laboratorio");
    if (!sk || !labSeriesByKey.has(sk)) stop("una serata ha una serie senza corrispondenza sul laboratorio");
  }

  // ── LA RICERCA, prima di qualunque scrittura ──
  const hits = [
    ...secretHits("events", events, secrets),
    ...secretHits("event_parties", parties, secrets),
    ...secretHits("artists", artists, secrets),
    ...secretHits("venues", venues, secrets),
  ];
  if (hits.length) {
    console.error(`STOP — dato di sede segreta in ${[...new Set(hits)].join(", ")}`);
    process.exit(1);
  }
  console.log(`Ricerca delle stringhe delle sedi segrete (${prod.secretVenueIds.length} sedi): 0 corrispondenze. Si scrive.`);

  ids.copy = { venues: [], events: [], artists: [], event_parties: [], storage: [], preesistenti: 0 };
  write();

  // (f) Storage: stessa chiave, bucket del laboratorio, URL riscritto.
  const rewritten = new Map();
  let copiedObjects = 0;
  const notCopied = [];
  for (const [url, o] of objects) {
    if (!o.ok) {
      notCopied.push(`oggetto non copiato: ${o.where}, HTTP ${o.status}`);
      rewritten.set(url, null);
      continue;
    }
    const up = await labUpload(o.bucket, o.rawKey, o.bytes, o.contentType);
    if (!up.ok) {
      notCopied.push(`oggetto non copiato: ${o.where}, HTTP ${up.status} (caricamento sul laboratorio)`);
      rewritten.set(url, null);
      continue;
    }
    ids.copy.storage.push({ bucket: o.bucket, rawKey: o.rawKey, key: decodeURIComponent(o.rawKey) });
    write();
    rewritten.set(url, labPublicUrl(o.bucket, o.rawKey));
    copiedObjects += 1;
  }
  const relink = (url) => (url ? (rewritten.has(url) ? rewritten.get(url) : null) : null);

  // La sede segnaposto: tutte le serate segrete puntano qui.
  const placeholder = await sql(`
    insert into public.venues (name, slug, address, bio)
    values ('Lab Secret Venue', 'lab-secret-venue', 'Via del Laboratorio 7',
            'Sede segnaposto del laboratorio — indirizzo falso')
    returning id`);
  ids.copy.placeholderVenue = placeholder[0].id;
  write();

  const columns = (t) => intersectColumns(prod.prodCols, prod.labCols, t);

  const insertCopy = async (table, rows, transform) => {
    const cols = columns(table);
    for (const row of rows) {
      const inserted = await insertRow(table, cols, transform(row), { onConflictId: true });
      if (inserted.length) ids.copy[table].push(...inserted);
      else ids.copy.preesistenti += 1;
      write();
    }
  };

  await insertCopy("venues", venues, (v) => ({ ...v, created_by: null, photo_url: relink(v.photo_url) }));
  await insertCopy("events", events, (e) => ({ ...e, created_by: null, cover_image: relink(e.cover_image) }));
  await insertCopy("artists", artists, (a) => ({ ...a, created_by: null, photo_url: relink(a.photo_url) }));
  await insertCopy("event_parties", parties, (p) => {
    const secret = isSecret(p);
    const s = labSeriesByKey.get(seriesKey.get(p.series_id));
    return {
      ...p,
      created_by: null,
      format_id: labFormatBySlug.get(formatSlug.get(p.format_id)),
      series_id: s.id,
      venue_id: secret ? ids.copy.placeholderVenue : p.venue_id,
      venue_text: null,
      venue_secret_hint: null,
    };
  });

  console.log("Copia dalla produzione (sola lettura) al laboratorio:");
  for (const t of ["events", "event_parties", "artists", "venues"]) {
    console.log(`  ${t.padEnd(14)} ${ids.copy[t].length} copiate`);
  }
  console.log(`  sede segnaposto 1 creata (${parties.filter((p) => isSecret(p)).length} serate segrete puntano li')`);
  console.log(`  storage        ${copiedObjects} oggetti copiati, ${notCopied.length} non copiati`);
  for (const n of notCopied) console.log(`    ${n}`);
  if (ids.copy.preesistenti) console.log(`  ATTENZIONE: ${ids.copy.preesistenti} righe gia' presenti (non nel file di chiavi)`);
}

/* ──────────────────────────── righe di prova ──────────────────────────── */

const SAMPLE_TRACK_URL = "https://soundcloud.com/forss/flickermood"; // traccia d'esempio della documentazione SoundCloud
const SAMPLE_TRACK_ID = 293;
const PLACEHOLDER_DURATION = 3600; // segnaposto dichiarato, solo su righe in bozza
const FIXTURE_DURATION = 5400;
const PERMALINK_RE = /^https:\/\/soundcloud\.com\/[A-Za-z0-9_-]+\/[A-Za-z0-9_-]+$/;

/** Stessa forma di `src/lib/livecuts/soundcloud.ts`: host fisso, 200, id dall'html. */
async function verifySoundCloud(raw) {
  const url = String(raw || "").trim();
  if (!PERMALINK_RE.test(url)) return { ok: false, reason: "livecut.url_not_soundcloud" };
  let res;
  try {
    res = await fetch(`https://soundcloud.com/oembed?format=json&url=${encodeURIComponent(url)}`, {
      signal: AbortSignal.timeout(8000),
    });
  } catch (error) {
    return { ok: false, reason: `livecut.oembed_unavailable (${error?.name || "errore"})` };
  }
  if (res.status === 404) return { ok: false, reason: "livecut.track_not_found_or_private" };
  if (!res.ok) return { ok: false, reason: `livecut.oembed_unavailable (HTTP ${res.status})` };
  let body;
  try {
    body = await res.json();
  } catch {
    return { ok: false, reason: "livecut.oembed_unavailable (corpo illeggibile)" };
  }
  const html = typeof body?.html === "string" ? body.html : "";
  const m = /api\.soundcloud\.com%2Ftracks%2F(\d+)/.exec(html) ?? /api\.soundcloud\.com\/tracks\/(\d+)/.exec(html);
  if (!m) return { ok: false, reason: "livecut.track_id_unreadable" };
  return { ok: true, url, trackId: Number(m[1]) };
}

function parseDuration(raw) {
  const m = /^(\d{1,2}):([0-5]\d):([0-5]\d)$/.exec(String(raw || "").trim());
  if (!m) return null;
  const s = Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
  return s > 0 && s < 86400 ? s : null;
}

/** Un JPEG con un segmento APP1 (EXIF/XMP) si rifiuta: si cammina fino a SOS. */
function hasApp1(buf) {
  if (buf[0] !== 0xff || buf[1] !== 0xd8) return true; // non e' un JPEG: rifiuto
  let i = 2;
  while (i + 4 <= buf.length) {
    if (buf[i] !== 0xff) return true;
    const marker = buf[i + 1];
    if (marker === 0xda) return false; // inizio dei dati: nessun APP1 prima
    if (marker === 0xe1) return true;
    const len = buf.readUInt16BE(i + 2);
    i += 2 + len;
  }
  return true;
}

async function makeCover(sourcePath) {
  const { default: sharp } = await import("sharp");
  const bytes = sourcePath
    ? await sharp(sourcePath).rotate().jpeg({ quality: 90 }).toBuffer() // ricodifica: i metadati non passano
    : await sharp({ create: { width: 2000, height: 2000, channels: 3, background: { r: 128, g: 128, b: 128 } } })
        .jpeg({ quality: 80 })
        .toBuffer();
  if (hasApp1(bytes)) stop("cover con un marcatore APP1/EXIF: non si carica");
  return bytes;
}

async function uploadCover(ids, write, bytes) {
  const rawKey = `livecuts/${randomUUID()}.jpg`;
  const up = await labUpload("event-images", rawKey, bytes, "image/jpeg");
  if (!up.ok) stop(`cover non caricata sul laboratorio: HTTP ${up.status} ${up.detail}`);
  ids.fixtures.storage.push({ bucket: "event-images", rawKey, key: rawKey });
  write();
  return labPublicUrl("event-images", rawKey);
}

async function insertLivecut(ids, write, lc, artistIds, kind) {
  const r = await sql(`
    insert into public.livecuts
      (party_id, part_number, slot_start, slot_end, soundcloud_url, soundcloud_track_id,
       duration_seconds, cover_url, published_at)
    values (${q(lc.party_id)}, ${lc.part}, ${q(lc.start)}, ${q(lc.end)}, ${q(lc.url)}, ${lc.trackId},
            ${lc.duration}, ${q(lc.cover)}, ${lc.published ? "now()" : "null"})
    returning id`);
  const id = r[0].id;
  ids.fixtures.livecuts.push({ id, kind, published: Boolean(lc.published) });
  write();
  for (const [i, artistId] of artistIds.entries()) {
    await sql(`
      insert into public.livecut_artists (livecut_id, artist_id, sort_order)
      values (${q(id)}, ${q(artistId)}, ${i})
      returning livecut_id`);
    ids.fixtures.livecut_artists.push([id, artistId]);
    write();
  }
  return id;
}

async function ensureAccounts(ids, write) {
  const PASSWORD = process.env.LAB_ACCOUNT_PASSWORD;
  if (!PASSWORD) stop("LAB_ACCOUNT_PASSWORD assente in .env.lab.local");
  const ACCOUNTS = [
    { key: "organizer", email: "music-organizer@lab.invalid", role: "organizer" },
    { key: "staff", email: "music-staff@lab.invalid", role: "staff" },
    { key: "attendee", email: "music-attendee@lab.invalid", role: "attendee" },
  ];
  // Un indirizzo gia' presente si riusa (GoTrue non rende subito visibile una
  // cancellazione), e il suo id entra comunque nel file di chiavi.
  const existing = new Map();
  for (let page = 1; page <= 5; page++) {
    const res = await fetch(`${AUTH()}?page=${page}&per_page=200`, { headers: authHeaders() });
    if (!res.ok) break;
    const users = (await res.json()).users || [];
    for (const u of users) existing.set(u.email, u.id);
    if (users.length < 200) break;
  }
  for (const a of ACCOUNTS) {
    let id = existing.get(a.email);
    const reused = Boolean(id);
    if (!id) {
      const res = await fetch(AUTH(), {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ email: a.email, password: PASSWORD, email_confirm: true }),
      });
      if (!res.ok) throw new Error(`auth ${a.key}: ${res.status} ${(await res.text()).slice(0, 200)}`);
      id = (await res.json()).id;
    }
    ids.fixtures.accounts[a.key] = { id, email: a.email, role: a.role, reused };
    write();
    await sql(`
      insert into public.profiles (id, email, full_name, role)
      values (${q(id)}, ${q(a.email)}, ${q("Lab " + a.key)}, ${q(a.role)})
      on conflict (id) do update set role = excluded.role`);
  }
}

/** Gli input del proprietario, per numero di serata della serie BZ. Mai i valori, solo i nomi. */
const REAL_INPUTS = {
  1: {
    url: "MUSIC_SEED_LIVECUT_URL_BZ_001",
    duration: "MUSIC_SEED_LIVECUT_DURATION_BZ_001",
    cover: "MUSIC_SEED_COVER_BZ_001",
  },
  2: {
    url: "MUSIC_SEED_LIVECUT_URL_BZ_002",
    duration: "MUSIC_SEED_LIVECUT_DURATION_BZ_002",
    cover: "MUSIC_SEED_COVER_BZ_002",
  },
};

/** Il LiveCut reale di una serata della serie BZ (numero 1 o 2). */
async function realLivecut(ids, write, copiedParties, number) {
  const tag = `BZ-00${number}`;
  const party = copiedParties.find((p) => p.series_code === "BZ" && p.number === number);
  if (!party) {
    console.log(`LiveCut ${tag}: serata non trovata fra le copiate — nessuna riga`);
    return;
  }
  const names = REAL_INPUTS[number];
  const url = process.env[names.url];
  const durationRaw = process.env[names.duration];
  const coverPath = process.env[names.cover];
  if (!url && number === 2) {
    console.log(`LiveCut ${tag}: URL non dato — nessuna riga (si aggiunge con --teardown-fixtures e --seed)`);
    return;
  }

  // L'artista: l'unico nome della line-up, per uguaglianza esatta. Nessuna supposizione.
  const lineup = Array.isArray(party.lineup) ? party.lineup : [];
  if (lineup.length !== 1) stop(`LiveCut ${tag}: la line-up della serata non ha un solo nome (${lineup.length})`);
  const match = await labSqlReadOnly(`select id from public.artists where name = ${q(lineup[0])}`);
  if (match.length !== 1) stop(`LiveCut ${tag}: ${match.length} artisti col nome esatto della line-up (atteso 1)`);

  let row;
  let status;
  if (!url) {
    row = { url: SAMPLE_TRACK_URL, trackId: SAMPLE_TRACK_ID, duration: PLACEHOLDER_DURATION, published: false };
    status = "BOZZA — segnaposto, URL non dato";
  } else {
    const v = await verifySoundCloud(url);
    const duration = parseDuration(durationRaw);
    if (!v.ok) {
      row = { url: SAMPLE_TRACK_URL, trackId: SAMPLE_TRACK_ID, duration: PLACEHOLDER_DURATION, published: false };
      status = `BOZZA — URL non verificato (${v.reason})`;
    } else if (!duration) {
      row = { url: v.url, trackId: v.trackId, duration: PLACEHOLDER_DURATION, published: false };
      status = "BOZZA — durata non data";
    } else {
      row = { url: v.url, trackId: v.trackId, duration, published: true };
      status = "PUBBLICATO";
    }
  }
  const coverBytes = await makeCover(coverPath && existsSync(coverPath) ? coverPath : null);
  const coverKind = coverPath && existsSync(coverPath) ? "file del proprietario, ricodificato" : "sintetica";
  const cover = await uploadCover(ids, write, coverBytes);
  const id = await insertLivecut(
    ids,
    write,
    { party_id: party.id, part: 1, start: party.time, end: party.end_time || party.time, cover, ...row },
    [match[0].id],
    `real-${tag}`
  );
  ids.fixtures.real[tag] = { id, status, published: row.published };
  write();
  console.log(`LiveCut ${tag}: ${status} (cover ${coverKind})`);
}

async function seedFixtures(ids, write) {
  ids.fixtures = { artists: [], events: [], event_parties: [], livecuts: [], livecut_artists: [], storage: [], accounts: {}, real: {} };
  ids.nights = {};
  write();

  const copied = ids.copy.event_parties.length
    ? await labSqlReadOnly(`
        select p.id, p.date::text as date, p.time::text as time, p.end_time::text as end_time, p.number, p.lineup,
               s.code as series_code, f.slug as format_slug
          from public.event_parties p
          join public.party_series s on s.id = p.series_id
          join public.formats f on f.id = p.format_id
         where p.id in (${qList(ids.copy.event_parties)})`)
    : [];
  const today = romeToday();
  const nights = copied
    .filter((p) => p.format_slug === "resonate" && p.series_code === "RSNT")
    .sort((a, b) => (a.date < b.date ? 1 : -1));
  const past = nights.filter((p) => p.date < today);
  const future = nights.filter((p) => p.date >= today);
  const N1 = past[0];
  if (!N1) stop("nessuna notte passata fra le serate copiate: N1 non esiste");
  ids.nights.N1 = N1.id;
  ids.nights.N3 = past[1]?.id ?? null;
  ids.nights.N5 = future[future.length - 1]?.id ?? null;
  ids.nights.N2 = copied.find((p) => p.series_code === "BZ" && p.number === 1)?.id ?? null;
  ids.nights.N6 = copied.find((p) => p.series_code === "BZ" && p.number === 2)?.id ?? null;
  write();
  if (!ids.nights.N5) console.log("N5: nessuna notte futura fra le copiate — il passo night_not_over e' NON PERCORSO");

  // Due artisti fittizi: un set che non e' mai esistito non si accredita a una persona vera.
  const artistIds = {};
  for (const [k, name, slug] of [["A", "Lab Artist A", "lab-artist-a"], ["B", "Lab Artist B", "lab-artist-b"]]) {
    const r = await sql(`insert into public.artists (name, slug) values (${q(name)}, ${q(slug)}) returning id`);
    artistIds[k] = r[0].id;
    ids.fixtures.artists.push(r[0].id);
    write();
  }

  await ensureAccounts(ids, write);

  const synthetic = await makeCover(null);
  const fixtureLivecut = async (party_id, part, start, end, artists, published, kind) => {
    const cover = await uploadCover(ids, write, synthetic);
    return insertLivecut(
      ids,
      write,
      { party_id, part, start, end, url: SAMPLE_TRACK_URL, trackId: SAMPLE_TRACK_ID, duration: FIXTURE_DURATION, cover, published },
      artists,
      kind
    );
  };

  // N1: la parte dopo mezzanotte, il b2b, la bozza. PT4 non va oltre la fine vera.
  const end = N1.end_time || "06:00:00";
  const pt4End = end > "03:00:00" && end < "04:30:00" ? end : "04:30:00";
  await fixtureLivecut(N1.id, 1, "22:00", "23:30", [artistIds.A], true, "N1-PT1");
  await fixtureLivecut(N1.id, 2, "00:00", "01:30", [artistIds.B], true, "N1-PT2");
  await fixtureLivecut(N1.id, 3, "01:30", "03:00", [artistIds.A, artistIds.B], true, "N1-PT3-b2b");
  await fixtureLivecut(N1.id, 4, "03:00", pt4End, [artistIds.A], false, "N1-PT4-bozza");

  // N4: un evento NON pubblicato, con un LiveCut pubblicato. La serie e' quella di
  // ripiego del catalogo (ritirata, non elencata) e il numero e' nullo: nessun
  // progressivo consumato, il contatore non si muove.
  const fallback = await labSqlReadOnly(`
    select s.id as series_id, f.id as format_id from public.party_series s
      join public.formats f on f.id = s.format_id
     where f.slug = 'unclassified' and s.code = 'UNCL'`);
  if (fallback.length !== 1) stop("la serie di ripiego UNCL non esiste sul laboratorio");
  const ev = await sql(`
    insert into public.events (slug, title, description, date, is_published, venue_secret)
    values ('lab-unpublished-event', 'Lab unpublished event',
            'Evento di laboratorio non pubblicato — non e'' un evento reale',
            (current_date - interval '20 days'), false, false)
    returning id`);
  ids.fixtures.events.push(ev[0].id);
  write();
  const party = await sql(`
    insert into public.event_parties
      (event_id, title, time, end_time, date, access_type, sort_order, lineup,
       venue_id, venue_secret, format_id, series_id, number)
    values (${q(ev[0].id)}, 'Lab unpublished event', '22:00', '06:00', (current_date - interval '20 days'),
            'paid', 1, '{}', ${q(ids.copy.placeholderVenue)}, false,
            ${q(fallback[0].format_id)}, ${q(fallback[0].series_id)}, null)
    returning id`);
  ids.fixtures.event_parties.push(party[0].id);
  ids.nights.N4 = party[0].id;
  write();
  await fixtureLivecut(party[0].id, 1, "22:00", "23:30", [artistIds.A], true, "N4-unpublished-event");

  // I LiveCut reali: pubblicati solo con URL verificato E durata data.
  await realLivecut(ids, write, copied, 1);
  await realLivecut(ids, write, copied, 2);
}

/* ──────────────────────────────── semina ──────────────────────────────── */

async function seed() {
  let ids = loadSeed({ required: false });
  if (ids?.fixtures) {
    console.error(
      `${SEED_FILE} porta gia' le righe di prova. Rimuovi prima con --teardown o --teardown-fixtures:\n` +
        "due semine sovrapposte producono un file di chiavi che non descrive piu' il database."
    );
    process.exit(1);
  }
  if (!ids) ids = { creato: new Date().toISOString(), ref: REF };
  const write = () => writeFileSync(SEED_FILE, JSON.stringify(ids, null, 2));
  write();

  if (!ids.copy) await copyProduction(ids, write);
  else console.log("Copia della produzione gia' presente nel file di chiavi: si aggiungono solo le righe di prova.");

  await seedFixtures(ids, write);
  console.log(`\nSeminato. Chiavi in ${SEED_FILE} (ignorato da git).`);
}

/* ─────────────────────── verifica, da un'altra fonte ─────────────────────── */

async function countPresent(table, idList) {
  if (!idList.length) return 0;
  const r = await labRest(`${table}?id=in.(${idList.join(",")})&select=id`);
  if (r.status !== 200 || !Array.isArray(r.body)) throw new Error(`recount ${table}: HTTP ${r.status}`);
  return r.body.length;
}

async function verify() {
  const ids = loadSeed();
  let fails = 0;
  const line = (ok, label, detail) => {
    if (!ok) fails += 1;
    console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
  };

  console.log("Righe radice, contate da PostgREST con la service key (non dall'endpoint SQL):");
  for (const t of ["events", "event_parties", "artists", "venues"]) {
    const list = [...(ids.copy?.[t] || [])];
    if (t === "venues" && ids.copy?.placeholderVenue) list.push(ids.copy.placeholderVenue);
    const n = await countPresent(t, list);
    console.log(`  copia     ${t.padEnd(14)} ${n}/${list.length}`);
  }
  if (ids.fixtures) {
    for (const t of ["events", "event_parties", "artists"]) {
      const n = await countPresent(t, ids.fixtures[t]);
      console.log(`  prova     ${t.padEnd(14)} ${n}/${ids.fixtures[t].length}`);
    }
    const lcIds = ids.fixtures.livecuts.map((l) => l.id);
    console.log(`  prova     ${"livecuts".padEnd(14)} ${await countPresent("livecuts", lcIds)}/${lcIds.length}`);
  }

  if (!ids.fixtures) {
    console.log("\nNessuna riga di prova nel file: sonde anonime saltate.");
    return;
  }

  // ── La sonda anonima ──
  const lcs = ids.fixtures.livecuts;
  const byKind = (k) => lcs.find((l) => l.kind === k)?.id;
  const realPublished = Object.values(ids.fixtures.real).filter((r) => r.published).map((r) => r.id);
  const realDrafts = Object.values(ids.fixtures.real).filter((r) => !r.published).map((r) => r.id);
  const expected = new Set([byKind("N1-PT1"), byKind("N1-PT2"), byKind("N1-PT3-b2b"), ...realPublished]);

  const anon = await labRest("livecuts?select=id,part_number", { anon: true });
  console.log(`\nSonda anonima: GET /rest/v1/livecuts?select=id,part_number → HTTP ${anon.status}`);
  const got = new Set(Array.isArray(anon.body) ? anon.body.map((r) => r.id) : []);
  line(anon.status === 200, "lettura anonima consentita", `HTTP ${anon.status}`);
  line(!got.has(byKind("N1-PT4-bozza")), "bozza PT4 assente", `atteso 0, letto ${got.has(byKind("N1-PT4-bozza")) ? 1 : 0}`);
  const draftSeen = realDrafts.filter((id) => got.has(id)).length;
  line(draftSeen === 0, "bozza reale assente", realDrafts.length ? `atteso 0, letto ${draftSeen}` : "nessuna bozza reale nel seme (atteso 0, letto 0)");
  line(!got.has(byKind("N4-unpublished-event")), "LiveCut dell'evento non pubblicato assente", `atteso 0, letto ${got.has(byKind("N4-unpublished-event")) ? 1 : 0}`);
  const same = got.size === expected.size && [...expected].every((id) => got.has(id));
  line(same, "righe anonime = atteso", `atteso ${expected.size}, letto ${got.size}`);

  // Gli artisti dei LiveCut: il b2b conta due righe, la bozza e N4 zero.
  const expectedArtists = ids.fixtures.livecut_artists.filter(([lc]) => expected.has(lc)).length;
  const anonArtists = await labRest("livecut_artists?select=livecut_id", { anon: true });
  const artistRows = Array.isArray(anonArtists.body) ? anonArtists.body : [];
  const leaked = artistRows.filter((r) => !expected.has(r.livecut_id)).length;
  line(
    anonArtists.status === 200 && artistRows.length === expectedArtists && leaked === 0,
    "livecut_artists anonimi = atteso",
    `HTTP ${anonArtists.status}, atteso ${expectedArtists}, letto ${artistRows.length}, fuori perimetro ${leaked}`
  );

  for (const [tag, r] of Object.entries(ids.fixtures.real)) console.log(`  LiveCut ${tag}: ${r.status}`);
  if (!ids.fixtures.real["BZ-002"]) console.log("  LiveCut BZ-002: nessuna riga (URL non dato)");

  // ── Le sedi: nessuna riga oltre il segnaposto, le sedi pubbliche copiate e la
  // sede finta di `seed-lab-door.mjs`; e nessuna stringa di una sede segreta.
  const venuesAnon = await labRest("venues?select=id", { anon: true });
  const venuesAll = await labRest("venues?select=*");
  const known = new Set([ids.copy?.placeholderVenue, ...(ids.copy?.venues || [])]);
  const extra = (Array.isArray(venuesAll.body) ? venuesAll.body : []).filter((v) => !known.has(v.id) && v.slug !== "lab-venue");
  console.log(
    `\nSedi: anon HTTP ${venuesAnon.status} righe ${Array.isArray(venuesAnon.body) ? venuesAnon.body.length : "?"}; ` +
      `service HTTP ${venuesAll.status} righe ${Array.isArray(venuesAll.body) ? venuesAll.body.length : "?"}`
  );
  line(extra.length === 0, "nessuna sede oltre segnaposto, pubbliche copiate e sede finta del seme porta", `extra ${extra.length}`);

  const secrets = await readSecretsForProbe();
  let hits = 0;
  for (const t of ["events", "event_parties", "artists", "venues"]) {
    const r = await labRest(`${t}?select=*`);
    if (r.status !== 200) throw new Error(`lettura ${t} del laboratorio: HTTP ${r.status}`);
    hits += secretHits(t, r.body, secrets).length;
  }
  line(hits === 0, "stringhe delle sedi segrete di produzione nel laboratorio", `corrispondenze ${hits}`);

  console.log(fails ? `\n${fails} FAIL.` : "\nTutto PASS.");
  if (fails) process.exit(1);
}

/** Per la sonda: le sedi segrete si rileggono dalla produzione, in memoria. */
async function readSecretsForProbe() {
  const events = await prodGet({ rest: "events?select=id,venue_secret&is_published=eq.true" });
  const parties = events.length
    ? await prodGet({ rest: `event_parties?select=id,event_id,venue_id,venue_secret&event_id=in.(${events.map((e) => e.id).join(",")})` })
    : [];
  const { secretVenueIds } = classifyVenues(events, parties);
  return readSecretStrings(secretVenueIds);
}

/* ─────────────────────── rimozione, per chiave primaria ─────────────────────── */

async function removeFixtures(ids) {
  const f = ids.fixtures;
  if (!f) return;
  for (const [lc, ar] of f.livecut_artists) {
    const r = await sql(`delete from public.livecut_artists where livecut_id = ${q(lc)} and artist_id = ${q(ar)} returning livecut_id`);
    console.log(`  livecut_artists ${r.length} rimossa per chiave`);
  }
  for (const l of f.livecuts) {
    const r = await sql(`delete from public.livecuts where id = ${q(l.id)} returning id`);
    console.log(`  livecuts        ${r.length} rimossa per chiave (${l.kind})`);
  }
  for (const t of ["event_parties", "events", "artists"]) {
    for (const id of f[t]) {
      const r = await sql(`delete from public.${t} where id = ${q(id)} returning id`);
      console.log(`  ${t.padEnd(15)} ${r.length} rimossa per chiave (prova)`);
    }
  }
  for (const o of f.storage) {
    const r = await labStorageDelete(o.bucket, o.key);
    console.log(`  storage         ${r.removed} oggetto rimosso per chiave (HTTP ${r.status})`);
  }
  for (const [key, a] of Object.entries(f.accounts)) {
    const res = await fetch(`${AUTH()}/${a.id}`, { method: "DELETE", headers: authHeaders() });
    console.log(`  account ${key.padEnd(9)} ${res.ok ? "rimosso" : `NON rimosso (HTTP ${res.status})`}`);
  }
}

async function removeCopy(ids) {
  const c = ids.copy;
  if (!c) return;
  for (const t of ["event_parties", "events", "artists", "venues"]) {
    for (const id of c[t]) {
      const r = await sql(`delete from public.${t} where id = ${q(id)} returning id`);
      console.log(`  ${t.padEnd(15)} ${r.length} rimossa per chiave (copia)`);
    }
  }
  if (c.placeholderVenue) {
    const r = await sql(`delete from public.venues where id = ${q(c.placeholderVenue)} returning id`);
    console.log(`  venues          ${r.length} rimossa per chiave (segnaposto)`);
  }
  for (const o of c.storage) {
    const r = await labStorageDelete(o.bucket, o.key);
    console.log(`  storage         ${r.removed} oggetto rimosso per chiave (HTTP ${r.status})`);
  }
}

/** Il riconteggio, da fonti diverse dall'endpoint SQL: PostgREST, URL pubblici, auth.admin. */
async function recount(ids, { includeCopy }) {
  let remaining = 0;
  const f = ids.fixtures;
  if (f) {
    remaining += await countPresent("livecuts", f.livecuts.map((l) => l.id));
    for (const t of ["event_parties", "events", "artists"]) remaining += await countPresent(t, f[t]);
    const lcIds = [...new Set(f.livecut_artists.map(([lc]) => lc))];
    if (lcIds.length) {
      const r = await labRest(`livecut_artists?livecut_id=in.(${lcIds.join(",")})&select=livecut_id`);
      remaining += Array.isArray(r.body) ? r.body.length : 1;
    }
    for (const o of f.storage) if (await labObjectExists(o.bucket, o.rawKey)) remaining += 1;
    for (const a of Object.values(f.accounts)) {
      const res = await fetch(`${AUTH()}/${a.id}`, { headers: authHeaders() });
      if (res.status !== 404) remaining += 1;
    }
  }
  if (includeCopy && ids.copy) {
    const c = ids.copy;
    for (const t of ["event_parties", "events", "artists"]) remaining += await countPresent(t, c[t]);
    remaining += await countPresent("venues", [...c.venues, ...(c.placeholderVenue ? [c.placeholderVenue] : [])]);
    for (const o of c.storage) if (await labObjectExists(o.bucket, o.rawKey)) remaining += 1;
  }
  return remaining;
}

async function teardown({ fixturesOnly }) {
  const ids = loadSeed();
  console.log(fixturesOnly ? "Rimozione delle sole righe di prova e dei LiveCut:" : "Rimozione di tutto cio' che il seme ha scritto:");
  await removeFixtures(ids);
  if (!fixturesOnly) await removeCopy(ids);

  console.log("\nRiconteggio da un'altra fonte (PostgREST, URL pubblici, auth.admin):");
  const remaining = await recount(ids, { includeCopy: !fixturesOnly });
  if (remaining !== 0) {
    console.error(`${remaining} remaining — residuo reale. Il file di chiavi resta com'e'.`);
    process.exit(1);
  }
  // La riga si scrive DOPO il riconteggio.
  console.log("0 remaining");
  if (fixturesOnly) {
    delete ids.fixtures;
    delete ids.nights;
    writeFileSync(SEED_FILE, JSON.stringify(ids, null, 2));
    console.log(`${SEED_FILE}: righe di prova tolte, copia della produzione conservata.`);
  } else {
    unlinkSync(SEED_FILE);
    console.log(`${SEED_FILE} rimosso. Il contatore highest_assigned resta al valore copiato (guardia monotona).`);
  }
}

/* ──────────────────────────────── ingresso ──────────────────────────────── */

const mode = process.argv[2];
if (mode === "--seed") await seed();
else if (mode === "--verify") await verify();
else if (mode === "--teardown") await teardown({ fixturesOnly: false });
else if (mode === "--teardown-fixtures") await teardown({ fixturesOnly: true });
else {
  console.log("uso: --seed | --verify | --teardown | --teardown-fixtures");
  process.exit(1);
}
