/**
 * seed-lab-media.mjs — da' al LABORATORIO le due forme di media che il prodotto
 * non sa produrre da se', per le prove di NAV-07 (fase 52, piano 52-01).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * NON PUNTA MAI ALLA PRODUZIONE, E NON PER CONVENZIONE.
 *
 * Il ref si risolve da `LAB_PROJECT_REF`; se coincide con il ref di produzione lo
 * script esce con codice 2 PRIMA di qualunque lettura o scrittura su un database
 * o su un bucket. Il caricamento dei file `.env*` NON sovrascrive una variabile
 * gia' presente nell'ambiente (`process.loadEnvFile`): e' cio' che permette di
 * PROVARE il rifiuto passando il ref di produzione da riga di comando.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * COSA PRODUCE, e soltanto questo:
 *
 *   (a) la PRECONDIZIONE — una serata con `venue_secret` vero, legata a un
 *       evento di prova. Di norma esiste gia' (la semina `seed-lab-door.mjs`):
 *       qui si accerta, e si crea nella stessa forma solo se manca.
 *   (b) un OGGETTO ORFANO — un JPEG generato (colore pieno, 64x64) scritto nel
 *       bucket `event-media` SENZA riga in `event_media`. Simula la finestra fra
 *       la pubblicazione e l'insert di `registerMedia`
 *       (`src/app/(public)/events/[slug]/actions.ts`): il prodotto la rende rara,
 *       quindi sul laboratorio non nasce da sola.
 *   (c) una FOTO PRE-STRIPPER CON GPS — un JPEG generato con un EXIF che porta
 *       coordinate note, scritto nel bucket e registrato in `event_media` con la
 *       forma pubblica dell'indirizzo di `registerMedia`, `approved`, `photo`, sulla
 *       serata segreta del banco, e `created_at` ANTERIORE alla soglia dello
 *       stripper del laboratorio (la versione con cui `20260809006000` e'
 *       registrata nella history, riletta, non supposta). Rappresenta la
 *       popolazione di D-52-31: nessun percorso di oggi puo' produrla, perche'
 *       ogni foto passa da `/api/media/finalize`, che spoglia.
 *
 * Tutto il resto — approvate, in attesa, rifiutate con oggetto, foto di serata
 * segreta — si produce dal PERCORSO VERO del prodotto (piano 52-01, task 3), non
 * da qui: un banco che inserisce a mano cio' che il prodotto sa fare misura il
 * banco, non il prodotto.
 *
 * LE COORDINATE GPS SONO IN MARE, DI PROPOSITO. 39°30'N 12°30'E e' la piana
 * abissale del Tirreno, a oltre cento chilometri da qualunque costa. Il file e' su
 * un repository PUBBLICO e un GPS nell'EXIF di una foto «di serata segreta» e'
 * esattamente cio' che `venue-secrecy.md` vieta di pubblicare: un punto in mare
 * non puo' essere una sede, di nessuno.
 *
 * LE CHIAVI SI CATTURANO ALLA CREAZIONE (regola 1 di `seed-lab-door.mjs`): il path
 * dei due oggetti e l'id della riga finiscono in `.env.lab.seed.json` (ignorato da
 * git) sotto `media`, prima del passo successivo. La rimozione, quando servira', si
 * fa per chiave da quel file — mai per suffisso, mai per etichetta.
 *
 * IDEMPOTENTE. I due oggetti del banco si riconoscono dal suffisso di nome
 * dichiarato qui sotto ({@link ORPHAN_SUFFIX}, {@link PRESTRIP_SUFFIX}); se
 * esistono gia', lo script non ne crea di nuovi e lo dice.
 *
 * L'OUTPUT porta solo CONTEGGI e CATEGORIE: mai un path, un URL o un
 * identificativo. Chi incolla l'output in `.planning/` non deve poter pubblicare
 * nulla per sbaglio.
 *
 * USO
 *   node scripts/seed-lab-media.mjs --dry-run   legge e dice cosa farebbe
 *   node scripts/seed-lab-media.mjs --apply     scrive sul laboratorio
 *
 * Variabili attese (da `.env.local` e `.env.lab.local`, ignorati da git):
 *   SUPABASE_ACCESS_TOKEN, LAB_PROJECT_REF, LAB_SUPABASE_URL,
 *   LAB_SUPABASE_SERVICE_ROLE_KEY
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";

/* ─────────────────── gli argomenti, letti prima di agire ─────────────────── */
/* Leggere `process.argv` non tocca alcun database. */

const ARGV = process.argv.slice(2);
const DRY_RUN = ARGV.includes("--dry-run");
const APPLY = ARGV.includes("--apply");

function refuse(message) {
  console.error(`RIFIUTO: ${message}`);
  process.exit(2);
}

if (!DRY_RUN && !APPLY) {
  refuse("serve --dry-run oppure --apply. Questo strumento non ha un modo di default.");
}
if (DRY_RUN && APPLY) {
  refuse("--dry-run e --apply insieme non significano niente. Sceglierne uno.");
}

/* ───────────────────────── il rifiuto, prima di tutto ───────────────────── */

// Il ref di produzione e' gia' pubblico per costruzione (`NEXT_PUBLIC_SUPABASE_URL`
// viaggia nel bundle del browser): non e' un segreto, e' un indirizzo. Il ref del
// LABORATORIO non si scrive qui.
const PRODUCTION_REF = "cjsfocnhfzycbbgkwocx";

// Leggere un file dal disco non tocca alcun database. `loadEnvFile` NON
// sovrascrive cio' che l'ambiente porta gia'.
for (const envFile of [".env.local", ".env.lab.local"]) {
  if (existsSync(envFile)) process.loadEnvFile(envFile);
}

const REF = process.env.LAB_PROJECT_REF ?? null;
if (REF === PRODUCTION_REF) {
  refuse(
    `LAB_PROJECT_REF e' il ref di PRODUZIONE (${PRODUCTION_REF}).\n` +
      "        Questo script scrive oggetti e righe di media. In produzione quella\n" +
      "        e' una scrittura che ha bisogno di un atto datato, non di questo file."
  );
}

const TOKEN = process.env.SUPABASE_ACCESS_TOKEN ?? null;
const LAB_URL = process.env.LAB_SUPABASE_URL ?? null;
const LAB_SRK = process.env.LAB_SUPABASE_SERVICE_ROLE_KEY ?? null;

if (!REF || !TOKEN || !LAB_URL || !LAB_SRK) {
  refuse(
    "LAB_PROJECT_REF, SUPABASE_ACCESS_TOKEN, LAB_SUPABASE_URL e\n" +
      "        LAB_SUPABASE_SERVICE_ROLE_KEY sono necessari (.env.local + .env.lab.local)."
  );
}
// L'URL dello storage deve essere QUELLO del ref risolto: un URL di un altro
// progetto con la chiave giusta scriverebbe altrove, in silenzio.
if (!LAB_URL.includes(`${REF}.supabase.co`) || LAB_URL.includes(PRODUCTION_REF)) {
  refuse("LAB_SUPABASE_URL non appartiene al progetto di laboratorio risolto.");
}

/* ─────────────────────────────── costanti ─────────────────────────────── */

const BUCKET = "event-media";
const ORPHAN_SUFFIX = "-seedlab-orphan.jpg";
const PRESTRIP_SUFFIX = "-seedlab-prestrip.jpg";
const SEED_FILE = ".env.lab.seed.json";
const THRESHOLD_MIGRATION = "event_media_server_upload_only";

// 39°30'N 12°30'E — piana abissale del Tirreno. Vedi l'intestazione.
const SEA_GPS = {
  GPSLatitudeRef: "N",
  GPSLatitude: "39/1 30/1 0/1",
  GPSLongitudeRef: "E",
  GPSLongitude: "12/1 30/1 0/1",
};

/* ─────────────────────────────── utilita' ─────────────────────────────── */

/** Categoria d'errore esplicita: nessun `catch` che collassa cause diverse. */
function fail(category, detail) {
  console.error(`[seed-lab-media.${category}] ${detail}`);
  process.exit(1);
}

async function sql(query, { readOnly = true } = {}) {
  let res;
  try {
    res = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
      method: "POST",
      headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query, read_only: readOnly }),
    });
  } catch (err) {
    fail("network", `il Management API non ha risposto: ${err?.message ?? "(nessun messaggio)"}`);
  }
  if (!res.ok) fail("sql", `HTTP ${res.status} — ${(await res.text()).slice(0, 300)}`);
  try {
    return await res.json();
  } catch (err) {
    fail("sql_payload", `risposta non interpretabile: ${err?.message ?? "(nessun messaggio)"}`);
  }
}

const q = (s) => `'${String(s).replace(/'/g, "''")}'`;

async function storageUpload(path, bytes) {
  let res;
  try {
    res = await fetch(`${LAB_URL}/storage/v1/object/${BUCKET}/${path}`, {
      method: "POST",
      headers: { apikey: LAB_SRK, Authorization: `Bearer ${LAB_SRK}`, "Content-Type": "image/jpeg", "x-upsert": "false" },
      body: bytes,
    });
  } catch (err) {
    fail("storage_network", `lo storage del laboratorio non ha risposto: ${err?.message ?? "(nessun messaggio)"}`);
  }
  // Il corpo d'errore dello storage puo' ripetere la chiave: si stampa solo lo stato.
  if (!res.ok) fail("storage_upload", `scrittura dell'oggetto rifiutata, HTTP ${res.status}`);
}

async function storageDownload(path) {
  let res;
  try {
    res = await fetch(`${LAB_URL}/storage/v1/object/${BUCKET}/${path}`, {
      headers: { apikey: LAB_SRK, Authorization: `Bearer ${LAB_SRK}` },
    });
  } catch (err) {
    fail("storage_network", `lo storage del laboratorio non ha risposto: ${err?.message ?? "(nessun messaggio)"}`);
  }
  if (!res.ok) fail("storage_download", `rilettura dell'oggetto rifiutata, HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function loadSharp() {
  try {
    return (await import("sharp")).default;
  } catch (err) {
    fail("sharp", `sharp non caricabile: ${err?.message ?? "(nessun messaggio)"}`);
  }
}

/** Un JPEG di colore pieno, 64x64; con `gps` porta un EXIF con il GPS in mare. */
async function makeJpeg(sharp, { gps, color }) {
  let img = sharp({ create: { width: 64, height: 64, channels: 3, background: color } }).jpeg();
  if (gps) img = img.withExif({ IFD0: { Make: "resonate-lab", Model: "seed-lab-media" }, IFD3: SEA_GPS });
  return img.toBuffer();
}

/** Il puntatore alla sottodirectory GPS (tag 0x8825), in una delle due endianness. */
function hasGpsPointer(exif) {
  return exif.includes(Buffer.from([0x25, 0x88])) || exif.includes(Buffer.from([0x88, 0x25]));
}

/* ──────────────────────────────── lavoro ──────────────────────────────── */

async function main() {
  const mode = APPLY ? "apply" : "dry-run";
  console.log(`[seed-lab-media] modo: ${mode} — progetto: laboratorio (ref da .env.lab.local)`);

  const seed = existsSync(SEED_FILE) ? JSON.parse(readFileSync(SEED_FILE, "utf8")) : {};
  const writeSeed = () => writeFileSync(SEED_FILE, JSON.stringify(seed, null, 2));

  // ── la soglia dello stripper, riletta dalla history ──────────────────────
  const mig = await sql(
    `select version from supabase_migrations.schema_migrations where name like ${q("%" + THRESHOLD_MIGRATION + "%")}`
  );
  if (mig.length !== 1) {
    fail("threshold", `attesa una riga di history per ${THRESHOLD_MIGRATION}, trovate ${mig.length}`);
  }
  const v = mig[0].version;
  const threshold = `${v.slice(0, 4)}-${v.slice(4, 6)}-${v.slice(6, 8)}T${v.slice(8, 10)}:${v.slice(10, 12)}:${v.slice(12, 14)}Z`;
  console.log(`[seed-lab-media] soglia dello stripper riletta dalla history: ${threshold}`);

  // ── (a) la serata segreta ────────────────────────────────────────────────
  let secret = null;
  if (seed.secretParty && seed.secretEvent) {
    const r = await sql(
      `select id, event_id from public.event_parties where id = ${q(seed.secretParty)} and venue_secret`
    );
    if (r.length === 1) secret = { party: r[0].id, event: r[0].event_id };
  }
  const master = seed.accounts?.master?.id ?? null;
  if (!master) fail("seed_accounts", `${SEED_FILE} non porta l'account master del banco: lanciare prima seed-lab-door.mjs --seed`);

  if (secret) {
    console.log("[seed-lab-media] (a) serata segreta del banco: presente, nessuna creazione");
  } else if (DRY_RUN) {
    console.log("[seed-lab-media] (a) serata segreta del banco: ASSENTE — --apply la creerebbe");
  } else {
    if (!seed.venue) fail("seed_venue", `${SEED_FILE} non porta il locale del banco`);
    const fmt = await sql(`select id from public.formats where code = 'RSNT' limit 1`);
    const ser = await sql(`select id from public.party_series where code like 'RSNT%' limit 1`);
    if (!fmt.length || !ser.length) fail("seed_formats", "formats/party_series non seminati dalle migration");
    const ev = await sql(
      `insert into public.events (slug, title, description, date, is_published, created_by, venue_secret)
       values ('lab-media-secret-night', 'Lab Media Secret Night', 'Serata segreta di laboratorio — non e'' un evento reale',
               (current_date + interval '14 days'), true, ${q(master)}, true)
       returning id`,
      { readOnly: false }
    );
    seed.secretEvent = ev[0].id;
    writeSeed();
    const p = await sql(
      `insert into public.event_parties
         (event_id, title, time, end_time, date, access_type, sort_order, lineup,
          venue_id, venue_secret, venue_reveal_on_purchase, format_id, series_id, number)
       values (${q(seed.secretEvent)}, 'Lab Media Secret Night', '22:00', '06:00', (current_date + interval '14 days'),
               'paid', 1, '{}', ${q(seed.venue)}, true, false, ${q(fmt[0].id)}, ${q(ser[0].id)}, null)
       returning id`,
      { readOnly: false }
    );
    seed.secretParty = p[0].id;
    writeSeed();
    secret = { party: seed.secretParty, event: seed.secretEvent };
    console.log("[seed-lab-media] (a) serata segreta del banco: CREATA (evento + serata, chiavi in .env.lab.seed.json)");
  }

  // ── lo stato del banco dei media, per suffisso ───────────────────────────
  const existing = await sql(
    `select
       count(*) filter (where o.name like ${q("%" + ORPHAN_SUFFIX)}) as orphans,
       count(*) filter (where o.name like ${q("%" + PRESTRIP_SUFFIX)}) as prestrips,
       count(*) filter (where o.name like ${q("%" + PRESTRIP_SUFFIX)}
                          and exists (select 1 from public.event_media m where m.url like '%/event-media/' || o.name)) as prestrip_rows
     from storage.objects o where o.bucket_id = ${q(BUCKET)}`
  );
  const { orphans, prestrips, prestrip_rows } = existing[0];
  console.log(
    `[seed-lab-media] banco esistente: orfani ${orphans}, foto pre-stripper ${prestrips} (con riga: ${prestrip_rows})`
  );

  const sharp = await loadSharp();
  const ts = Date.now();
  const eventId = secret?.event;
  seed.media = seed.media ?? {};

  // ── (b) l'orfano ─────────────────────────────────────────────────────────
  if (Number(orphans) > 0) {
    console.log("[seed-lab-media] (b) orfano: gia' presente, nessuna creazione");
  } else if (DRY_RUN) {
    console.log("[seed-lab-media] (b) orfano: --apply scriverebbe 1 oggetto nel bucket, senza riga");
  } else {
    const path = `${eventId}/${master}/${ts}${ORPHAN_SUFFIX}`;
    seed.media.orphanPath = path;
    writeSeed(); // la chiave e' su disco prima della scrittura
    await storageUpload(path, await makeJpeg(sharp, { gps: false, color: { r: 90, g: 90, b: 90 } }));
    console.log("[seed-lab-media] (b) orfano: 1 oggetto scritto, nessuna riga (chiave in .env.lab.seed.json)");
  }

  // ── (c) la foto pre-stripper con GPS ─────────────────────────────────────
  let prestripPath = seed.media.prestripPath ?? null;
  if (Number(prestrips) > 0 && Number(prestrip_rows) > 0) {
    console.log("[seed-lab-media] (c) foto pre-stripper: gia' presente con la sua riga, nessuna creazione");
  } else if (Number(prestrips) > 0) {
    fail(
      "prestrip_half",
      "esiste un oggetto pre-stripper del banco senza riga: stato a meta' di una corsa precedente. " +
        "Rimuoverlo per chiave (da .env.lab.seed.json) prima di rilanciare."
    );
  } else if (DRY_RUN) {
    console.log(
      "[seed-lab-media] (c) foto pre-stripper: --apply scriverebbe 1 oggetto con GPS e 1 riga approved/photo " +
        "sulla serata segreta, con created_at anteriore alla soglia"
    );
  } else {
    prestripPath = `${eventId}/${master}/${ts}${PRESTRIP_SUFFIX}`;
    seed.media.prestripPath = prestripPath;
    writeSeed();
    const bytes = await makeJpeg(sharp, { gps: true, color: { r: 20, g: 60, b: 120 } });
    await storageUpload(prestripPath, bytes);
    // La forma pubblica dell'indirizzo di `registerMedia`, con l'URL del laboratorio.
    const url = `${LAB_URL}/storage/v1/object/public/${BUCKET}/${prestripPath}`;
    const row = await sql(
      `insert into public.event_media (event_id, party_id, uploaded_by, url, type, file_size, status, created_at)
       values (${q(secret.event)}, ${q(secret.party)}, ${q(master)}, ${q(url)}, 'photo', ${bytes.length}, 'approved',
               ${q(threshold)}::timestamptz - interval '1 day')
       returning id`,
      { readOnly: false }
    );
    seed.media.prestripRowId = row[0].id;
    writeSeed();
    console.log(
      "[seed-lab-media] (c) foto pre-stripper: 1 oggetto con GPS + 1 riga approved/photo sulla serata segreta, " +
        "created_at = soglia - 1 giorno (chiavi in .env.lab.seed.json)"
    );
  }

  // ── la prova che il GPS c'e' davvero ─────────────────────────────────────
  if (prestripPath && (APPLY || Number(prestrips) > 0)) {
    const back = await storageDownload(prestripPath);
    const meta = await sharp(back).metadata();
    const exifLen = meta.exif?.length ?? 0;
    const gps = exifLen > 0 && hasGpsPointer(meta.exif);
    if (!exifLen || !gps) {
      fail("exif_readback", `l'oggetto pre-stripper riletto non porta il GPS (exif ${exifLen} byte, gps ${gps})`);
    }
    console.log(`[seed-lab-media] rilettura dal bucket: exif ${exifLen} byte, sottodirectory GPS presente`);
  } else if (DRY_RUN) {
    console.log("[seed-lab-media] rilettura dal bucket: non eseguita in dry-run (nessun oggetto da rileggere)");
  }

  if (APPLY) {
    console.log(
      "[seed-lab-media] ricordare: .env.lab.seed.json e' condiviso con il checkout principale — ricopiarlo se si lavora in un worktree"
    );
  }
  console.log(`[seed-lab-media] fine (${mode})`);
}

main().catch((err) => fail("unexpected", err?.message ?? String(err)));
