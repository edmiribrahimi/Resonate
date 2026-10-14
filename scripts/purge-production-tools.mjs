/**
 * purge-production-tools.mjs — toglie PER CHIAVE PRIMARIA le righe e gli oggetti
 * che Calendar, Location e Visual hanno lasciato nel database, con il conteggio
 * prima, la cascata letta dal catalogo, e il riconteggio dopo preso da
 * un'altra fonte. Fase 53, piano 07 (CUT-01, D-53-03, D-53-05).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * NON PUNTA MAI ALLA PRODUZIONE PER DEFAULT, E NON PER CONVENZIONE.
 *
 * Il bersaglio e' `LAB_PROJECT_REF`. Se il ref risolto coincide con quello di
 * produzione lo script **rifiuta**, e il rifiuto e' la prima cosa eseguita dopo
 * la lettura degli argomenti: un controllo che gira dopo il primo `delete` non
 * e' un controllo, e' un rimpianto. In produzione ci si arriva **solo** con
 * un'autorizzazione datata che questo file legge e **consuma** (piano 53-11).
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * PERCHE' ESISTE. La migration `20261014120000_production_tools_removal.sql`
 * toglie dieci tabelle, la policy di un bucket e tre chiavi, e **rifiuta** se
 * trova anche una sola riga o un solo oggetto: un `DROP` su una tabella piena
 * cancellerebbe righe che nessuno ha contato. Questo strumento rende vere quelle
 * precondizioni, una tabella alla volta. Prima lui, poi la migration.
 *
 * LE CINQUE REGOLE DELLA RIMOZIONE (forma di `scripts/purge-attendances.mjs`,
 * con la terza ROVESCIATA):
 *
 *   1. Si CONTA prima, per ogni oggetto, e da DUE fonti: Management API in sola
 *      lettura e PostgREST con la chiave di servizio. Due numeri che non
 *      concordano non autorizzano un atto.
 *   2. La cascata si ENUMERA dal catalogo (`pg_constraint`), non da un
 *      documento. Se una tabella FUORI dall'insieme che esce punta a una di
 *      quelle da cui si cancella, lo script **rifiuta** prima di toccare nulla.
 *   3. **NESSUNA ISTANTANEA DEL CONTENUTO.** Diverge apposta dall'analogo: il
 *      proprietario ha deciso di non copiare nulla prima di buttare (D-53-05), e
 *      la tabella di Location contiene indirizzi di spazi in trattativa —
 *      scriverli in un file, anche ignorato da git, e' una copia che nessuno ha
 *      chiesto. Si stampano SOLO conteggi e numero di id catturati: mai righe,
 *      mai id, mai path di oggetti. Gli id e i path vivono in memoria per la
 *      durata della corsa e basta.
 *   4. La rimozione avviene PER CHIAVE PRIMARIA, su una lista **catturata dalla
 *      stessa interrogazione che l'ha contata**. Mai per interfaccia, mai con un
 *      predicato ricomposto al momento dell'atto: una chiave sbagliata non trova
 *      nulla, un predicato sbagliato cancella di piu'.
 *   5. La CONFERMA si chiede a una FONTE DIVERSA da quella con cui si e'
 *      cancellato: le righe si cancellano dal Management API e si ricontano da
 *      PostgREST; gli oggetti si cancellano dall'API Storage e si ricontano
 *      dall'API Storage E dal catalogo. La riga del referto di ogni passo si
 *      scrive SOLO DOPO il riconteggio: una conferma si legge prima di scriverla.
 *
 * L'ORDINE (53-RESEARCH §2), figli prima dei padri — e' anche l'ordine in cui i
 * vincoli lo permettono:
 *
 *   production_lineup_slot → production_checklist_item → production_piece →
 *   production_commitment (prima le occorrenze espanse, poi le altre) →
 *   production_plan → production_import_run → production_pipeline_rule →
 *   production_space_attribute → production_space → oggetti del bucket
 *   visual-archive, e il bucket → production_visual_asset →
 *   production_section (sezione visual) → production_open_question (sezioni
 *   visual, location, calendar)
 *
 * IL BUCKET NON SI TOCCA DALL'SQL. Supabase rifiuta ogni cancellazione diretta
 * sulle tabelle di storage («42501: Direct deletion from storage tables is not
 * allowed»). Oggetti e bucket passano dall'API Storage con la chiave di
 * servizio; il catalogo serve solo a contare.
 *
 * L'AUTORIZZAZIONE. Un'autorizzazione e' un atto che si consuma **una volta**.
 * Questo file la legge, la verifica e la **marca esaurita** da solo, dopo
 * l'ultimo riconteggio. Il documento deve contenere un blocco in questa forma
 * esatta — e' il contratto che il piano 53-11 onora quando lo scrive:
 *
 *     <!-- purge-production-tools: grant -->
 *     act: purge-production-tools
 *     target: production
 *     granted: yes
 *     granted_on: <YYYY-MM-DD>
 *     spent: no
 *
 * Lo script rifiuta se il blocco manca, se `act` o `target` non sono questi, se
 * `granted` non e' `yes`, se `spent` non e' `no`, o se `granted_on` non coincide
 * con `--dated`: un'autorizzazione vecchia non si riusa per distrazione.
 *
 * USO
 *   node scripts/purge-production-tools.mjs --dry-run
 *       conta da due fonti, enumera la cascata, cattura gli id e si ferma.
 *   node scripts/purge-production-tools.mjs --apply
 *       come sopra, poi toglie per chiave, passo per passo, e riconta.
 *   node scripts/purge-production-tools.mjs --apply --project <ref> \
 *        --authorised <percorso> --dated <YYYY-MM-DD>
 *       l'unica strada verso la produzione.
 *
 * USCITE
 *   0  il referto e' completo (compreso «niente da togliere»)
 *   1  qualcosa e' andato storto, con la sua categoria; ogni passo gia'
 *      completato e' stato riconteggiato e resta tale, nessun passo successivo
 *      e' stato tentato
 *   2  RIFIUTO: modo, bersaglio o autorizzazione non ammissibili. Nessuna lettura.
 *
 * VARIABILI (da `.env.local` + `.env.lab.local`, entrambi ignorati da git):
 *   SUPABASE_ACCESS_TOKEN, LAB_PROJECT_REF — sempre;
 *   LAB_SUPABASE_URL, LAB_SUPABASE_SERVICE_ROLE_KEY — sul laboratorio;
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY — in produzione.
 * Ogni valore letto dall'ambiente passa da `.trim()`: un a capo finale su una
 * variabile e' gia' successo (2026-10-13) e qui renderebbe falso un confronto.
 *
 * SEGRETEZZA. Questo file e' su un repository PUBBLICO. Il ref di produzione e'
 * scritto in chiaro come negli altri script: viaggia gia' nel bundle del browser,
 * e' un indirizzo, non un segreto. Il ref del laboratorio e nessuna chiave sono
 * scritti qui. Lo script non scrive alcun file, tranne la marcatura `spent` del
 * documento di autorizzazione.
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";

/* ─────────────────── gli argomenti, letti prima di agire ─────────────────── */

const ARGV = process.argv.slice(2);
const has = (flag) => ARGV.includes(flag);
const valueOf = (flag) => {
  const i = ARGV.indexOf(flag);
  return i >= 0 && i + 1 < ARGV.length ? ARGV[i + 1] : null;
};
const env = (name) => (process.env[name] ?? "").trim();

const DRY_RUN = has("--dry-run");
const APPLY = has("--apply");
const AUTH_PATH = valueOf("--authorised");
const AUTH_DATE = valueOf("--dated");

/* ───────────────────────── il rifiuto, prima di tutto ───────────────────── */

const PRODUCTION_REF = "cjsfocnhfzycbbgkwocx";
const REF = (valueOf("--project") ?? env("LAB_PROJECT_REF")).trim() || null;
const TOKEN = env("SUPABASE_ACCESS_TOKEN") || null;

function refuse(message) {
  console.error(`RIFIUTO: ${message}`);
  process.exit(2);
}

if (!DRY_RUN && !APPLY) {
  refuse(
    "serve --dry-run oppure --apply. Questo strumento non ha un modo di\n" +
      "        default, perche' un modo di default e' il modo in cui si\n" +
      "        cancella credendo di guardare."
  );
}
if (DRY_RUN && APPLY) {
  refuse("--dry-run e --apply insieme non significano niente. Sceglierne uno.");
}
if (!REF || !TOKEN) {
  refuse(
    "LAB_PROJECT_REF (o --project) e SUPABASE_ACCESS_TOKEN sono necessari.\n" +
      "        Carica .env.local e .env.lab.local, come fa scripts/dev-lab.sh."
  );
}

const IS_PRODUCTION = REF === PRODUCTION_REF;

/** Il documento, letto e verificato. Non scrive nulla: la marcatura e' DOPO l'atto. */
function readAuthorisation(path, dated) {
  if (!path || !dated) {
    refuse(
      `${REF} e' il ref di PRODUZIONE.\n` +
        "        Qui si cancellano righe e oggetti senza copia (D-53-05), e questo\n" +
        "        repository non ha PITR. Serve\n" +
        "        --authorised <percorso> --dated <YYYY-MM-DD>."
    );
  }
  if (!existsSync(path)) {
    refuse(`il documento di autorizzazione non esiste: ${path}`);
  }
  const text = readFileSync(path, "utf8");
  if (!text.includes("<!-- purge-production-tools: grant -->")) {
    refuse(
      `${path} non porta il blocco di concessione di questo strumento.\n` +
        "        La forma e' nel docblock in testa a questo file."
    );
  }
  const field = (name) => {
    const m = new RegExp(`^${name}:[ \\t]*(.+)$`, "m").exec(text);
    return m ? m[1].trim() : null;
  };
  if (field("act") !== "purge-production-tools") {
    refuse(`${path} autorizza un altro atto: ${field("act") ?? "(assente)"}`);
  }
  if (field("target") !== "production") {
    refuse(`${path} non autorizza la produzione: target = ${field("target") ?? "(assente)"}`);
  }
  if (field("granted") !== "yes") {
    refuse(`${path} non e' concesso: granted = ${field("granted") ?? "(assente)"}`);
  }
  if (field("spent") !== "no") {
    refuse(
      `${path} e' gia' dichiarato ESAURITO: spent = ${field("spent") ?? "(assente)"}.\n` +
        "        Un'autorizzazione si consuma una volta. Se serve di nuovo, si\n" +
        "        chiede di nuovo, e chi la concede rilegge i numeri del giorno."
    );
  }
  if (field("granted_on") !== dated) {
    refuse(
      `${path} e' datato ${field("granted_on") ?? "(assente)"} e --dated dice ${dated}.\n` +
        "        E' cio' che impedisce di riusare per distrazione un'autorizzazione\n" +
        "        scritta per un altro giorno."
    );
  }
  return text;
}

let authorisationText = null;
if (IS_PRODUCTION) {
  authorisationText = readAuthorisation(AUTH_PATH, AUTH_DATE);
}

/* ─────────────────────── la seconda fonte, verificata ─────────────────────── */

const BASE_URL = IS_PRODUCTION ? env("NEXT_PUBLIC_SUPABASE_URL") : env("LAB_SUPABASE_URL");
const SERVICE_KEY = IS_PRODUCTION
  ? env("SUPABASE_SERVICE_ROLE_KEY")
  : env("LAB_SUPABASE_SERVICE_ROLE_KEY");

/* ──────────────────────────────── utilita' ──────────────────────────────── */

/** Categoria d'errore esplicita: nessun `catch` che collassa cause diverse. */
function fail(category, detail) {
  console.error(`[purge-production-tools.${category}] ${detail}`);
  process.exit(1);
}

/**
 * Un messaggio d'errore di Postgres puo' citare una chiave
 * («Key (id)=(…) is still referenced»). Il referto non porta id di riga: si
 * sostituiscono prima di stampare.
 */
const redact = (s) =>
  String(s).replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, "<id>");

if (!BASE_URL || !SERVICE_KEY) {
  fail(
    "counter_env",
    IS_PRODUCTION
      ? "NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY assenti: il riconteggio " +
          "e l'API Storage non hanno una seconda fonte da interrogare."
      : "LAB_SUPABASE_URL o LAB_SUPABASE_SERVICE_ROLE_KEY assenti: il riconteggio " +
          "e l'API Storage non hanno una seconda fonte da interrogare."
  );
}
if (!BASE_URL.includes(REF)) {
  fail(
    "counter_target",
    `l'URL della seconda fonte non nomina il bersaglio dell'atto (${REF}): il ` +
      "riconteggio leggerebbe un altro progetto e tornerebbe zero per la ragione sbagliata."
  );
}

/**
 * Il Management API. `readOnly` e' esplicito a ogni chiamata: l'unica
 * invocazione che lo mette a `false` e' il `delete` per chiave.
 */
async function sql(query, { readOnly }) {
  if (typeof readOnly !== "boolean") fail("sql_contract", "readOnly va dichiarato a ogni chiamata.");
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
  if (!res.ok) {
    fail("sql", `HTTP ${res.status} — ${redact((await res.text()).slice(0, 400))}`);
  }
  try {
    return await res.json();
  } catch (err) {
    fail("sql_payload", `risposta non interpretabile: ${err?.message ?? "(nessun messaggio)"}`);
  }
}

/** PostgREST con la chiave di servizio, `Prefer: count=exact`, `Range: 0-0`. */
async function countViaPostgrest(table, filter) {
  const qs = filter ? `&${filter}` : "";
  let res;
  try {
    res = await fetch(`${BASE_URL}/rest/v1/${table}?select=id${qs}`, {
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        Prefer: "count=exact",
        Range: "0-0",
      },
    });
  } catch (err) {
    fail("counter_network", `PostgREST non ha risposto: ${err?.message ?? "(nessun messaggio)"}`);
  }
  if (!res.ok && res.status !== 206) {
    fail("counter_http", `PostgREST HTTP ${res.status} su ${table} — ${redact((await res.text()).slice(0, 300))}`);
  }
  const range = res.headers.get("content-range") ?? "";
  const total = range.split("/")[1];
  if (total === undefined || total === "*") {
    fail("counter_shape", `PostgREST non ha restituito un totale per ${table}: content-range = "${range}"`);
  }
  return Number(total);
}

/* ───────────────────────────── API Storage ───────────────────────────── */

const BUCKET = "visual-archive";
const storageHeaders = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  "Content-Type": "application/json",
};

/** Il corpo d'errore dell'API Storage, ridotto al campo `error`: mai il messaggio, che puo' citare un path. */
async function storageErrorOf(res) {
  const text = await res.text();
  try {
    const body = JSON.parse(text);
    return { error: String(body?.error ?? ""), raw: text };
  } catch {
    return { error: "", raw: text };
  }
}

/** Il bucket esiste? `true` / `false`; ogni altra risposta e' un errore con la sua categoria. */
async function bucketExists() {
  let res;
  try {
    res = await fetch(`${BASE_URL}/storage/v1/bucket/${BUCKET}`, { headers: storageHeaders });
  } catch (err) {
    fail("storage_network", `l'API Storage non ha risposto: ${err?.message ?? "(nessun messaggio)"}`);
  }
  if (res.ok) return true;
  const { error, raw } = await storageErrorOf(res);
  if (/not found/i.test(error) || /bucket not found/i.test(raw)) return false;
  fail("storage_http", `lettura del bucket: HTTP ${res.status} ${error || "(nessun campo error)"}`);
}

/**
 * Tutti i path del bucket, in memoria: prefisso vuoto, ricorsivo sulle
 * cartelle (una voce con `id` nullo e' una cartella), paginato. Mai stampati.
 */
async function listAllObjects(prefix = "") {
  const out = [];
  const LIMIT = 1000;
  for (let offset = 0; ; offset += LIMIT) {
    let res;
    try {
      res = await fetch(`${BASE_URL}/storage/v1/object/list/${BUCKET}`, {
        method: "POST",
        headers: storageHeaders,
        body: JSON.stringify({ prefix, limit: LIMIT, offset, sortBy: { column: "name", order: "asc" } }),
      });
    } catch (err) {
      fail("storage_network", `l'API Storage non ha risposto: ${err?.message ?? "(nessun messaggio)"}`);
    }
    if (!res.ok) {
      const { error } = await storageErrorOf(res);
      fail("storage_list", `elenco degli oggetti: HTTP ${res.status} ${error || "(nessun campo error)"}`);
    }
    const page = await res.json();
    if (!Array.isArray(page)) fail("storage_list_shape", "l'elenco degli oggetti non e' un array.");
    for (const item of page) {
      const path = prefix ? `${prefix}${item.name}` : item.name;
      if (item.id === null || item.id === undefined) {
        out.push(...(await listAllObjects(`${path}/`)));
      } else {
        out.push(path);
      }
    }
    if (page.length < LIMIT) break;
  }
  return out;
}

async function countObjectsInCatalogue() {
  const [{ n }] = await sql(
    `select count(*)::int as n from storage.objects where bucket_id = '${BUCKET}';`,
    { readOnly: true }
  );
  return Number(n);
}

/* ─────────────────────────────── i passi ─────────────────────────────── */

/**
 * Ogni passo: la tabella, il predicato SQL che lo delimita (nullo = tutte le
 * righe) e lo stesso predicato nella grammatica di PostgREST per il
 * riconteggio. I predicati sono costanti di questo file, mai ricomposti
 * all'atto: l'atto usa la lista di id, non il predicato.
 */
const STEP_BUCKET = { kind: "bucket", label: `oggetti di ${BUCKET}` };
const STEPS = [
  { kind: "rows", table: "production_lineup_slot", where: null, rest: null },
  { kind: "rows", table: "production_checklist_item", where: null, rest: null },
  { kind: "rows", table: "production_piece", where: null, rest: null },
  {
    kind: "rows",
    table: "production_commitment",
    label: "production_commitment (espanse)",
    where: "expanded_from is not null",
    rest: "expanded_from=not.is.null",
  },
  {
    kind: "rows",
    table: "production_commitment",
    label: "production_commitment (le altre)",
    where: "expanded_from is null",
    rest: "expanded_from=is.null",
  },
  { kind: "rows", table: "production_plan", where: null, rest: null },
  { kind: "rows", table: "production_import_run", where: null, rest: null },
  { kind: "rows", table: "production_pipeline_rule", where: null, rest: null },
  { kind: "rows", table: "production_space_attribute", where: null, rest: null },
  { kind: "rows", table: "production_space", where: null, rest: null },
  STEP_BUCKET,
  { kind: "rows", table: "production_visual_asset", where: null, rest: null },
  {
    kind: "rows",
    table: "production_section",
    label: "production_section (sezione visual)",
    where: "section = 'visual'",
    rest: "section=eq.visual",
  },
  {
    kind: "rows",
    table: "production_open_question",
    label: "production_open_question (visual, location, calendar)",
    where: "section in ('visual', 'location', 'calendar')",
    rest: "section=in.(visual,location,calendar)",
  },
];
for (const s of STEPS) if (s.kind === "rows" && !s.label) s.label = s.table;

/** Le tabelle che ESCONO per intero: l'insieme dentro cui una cascata e' ammessa. */
const LEAVING = [
  "production_lineup_slot",
  "production_checklist_item",
  "production_piece",
  "production_commitment",
  "production_plan",
  "production_import_run",
  "production_pipeline_rule",
  "production_space_attribute",
  "production_space",
  "production_visual_asset",
];
/** Le tabelle da cui si cancellano righe: le dieci, piu' le due che restano. */
const TOUCHED = [...LEAVING, "production_section", "production_open_question"];

const utc = () => new Date().toISOString();
const say = (s) => console.log(s);
const quoteIds = (arr) => arr.map((x) => `'${String(x).replace(/'/g, "''")}'::uuid`).join(", ");
const chunks = (arr, size) => {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

/** Conta e cattura nella STESSA interrogazione: la lista e' il conteggio. */
async function capture(step) {
  const where = step.where ? `where ${step.where}` : "";
  const [r] = await sql(
    `select count(*)::int as n, coalesce(array_agg(id::text order by id), '{}') as ids from public.${step.table} ${where};`,
    { readOnly: true }
  );
  const ids = r.ids ?? [];
  if (Number(r.n) !== ids.length) {
    fail("capture_inconsistent", `${step.label}: contate ${r.n}, catturate ${ids.length}.`);
  }
  return ids;
}

/* ──────────────────────────────── il referto ─────────────────────────────── */

say("");
say("═══ purge-production-tools ══════════════════════════════════════════════");
say(`  bersaglio      : ${IS_PRODUCTION ? "PRODUZIONE" : "laboratorio"}`);
say(`  modo           : ${DRY_RUN ? "--dry-run (nessuna scrittura)" : "--apply"}`);
say(`  ora di partenza: ${utc()}`);
if (IS_PRODUCTION) say(`  autorizzazione : ${AUTH_PATH} (${AUTH_DATE})`);
say("  referto        : solo numeri — nessuna riga, nessun id, nessun path (D-53-05)");
say("─────────────────────────────────────────────────────────────────────────");

/* (a) Quali tabelle esistono ancora. Una tabella assente e' un passo gia' fatto. */
const presenza = await sql(
  `select t as tabella, (to_regclass('public.' || t) is not null) as presente
     from unnest(array[${TOUCHED.map((t) => `'${t}'`).join(", ")}]) as t;`,
  { readOnly: true }
);
const PRESENT = new Set(presenza.filter((r) => r.presente).map((r) => r.tabella));

/* (b) La cascata, DAL CATALOGO. Chi punta a una tabella da cui si cancella? Se
 *     il figlio sta fuori dalle dieci che escono, l'atto toccherebbe (o
 *     verrebbe bloccato da) una tabella che nessuno ha dichiarato. */
const cascata = await sql(
  `select pc.relname as padre, cc.relname as figlio, cn.nspname as schema_figlio,
          c.conname, c.confdeltype as regola
     from pg_constraint c
     join pg_class pc     on pc.oid = c.confrelid
     join pg_namespace pn on pn.oid = pc.relnamespace
     join pg_class cc     on cc.oid = c.conrelid
     join pg_namespace cn on cn.oid = cc.relnamespace
    where c.contype = 'f'
      and pn.nspname = 'public'
      and pc.relname = any(array[${TOUCHED.map((t) => `'${t}'`).join(", ")}])
    order by 1, 2, 4;`,
  { readOnly: true }
);
const REGOLA = { a: "nessuna regola", r: "RESTRICT", c: "CASCADE", n: "SET NULL", d: "SET DEFAULT" };

say("");
say("  (b) CASCATA, ENUMERATA DAL CATALOGO — pg_constraint, chi punta a chi");
for (const r of cascata) {
  say(`      · ${r.schema_figlio}.${r.figlio} → ${r.padre}  (${r.conname}, ${REGOLA[r.regola] ?? r.regola})`);
}
if (cascata.length === 0) say("      (nessun vincolo: le tabelle sono gia' assenti o isolate)");

const fuori = cascata.filter((r) => r.schema_figlio !== "public" || !LEAVING.includes(r.figlio));
if (fuori.length > 0) {
  fail(
    "cascade_outside",
    `${fuori.length} vincolo/i da tabelle FUORI dall'insieme che esce: ` +
      fuori.map((r) => `${r.schema_figlio}.${r.figlio} → ${r.padre} (${r.conname})`).join("; ") +
      ". Nessun atto su una cascata che nessuno ha dichiarato."
  );
}
say("      tutti i figli stanno dentro le dieci tabelle che escono: nessuna cascata esce dall'insieme.");

/* (c) Il censimento, da DUE fonti, prima di qualunque scrittura. */
say("");
say("  (c) CENSIMENTO — Management API (read_only) e PostgREST (chiave di servizio)");
say("      oggetto                                                 righe   id catturati   PostgREST");

const census = new Map();
let daTogliere = 0;
let bucketPresente = false;

for (const step of STEPS) {
  if (step.kind === "bucket") {
    bucketPresente = await bucketExists();
    const catalogo = await countObjectsInCatalogue();
    if (!bucketPresente) {
      if (catalogo !== 0) {
        fail(
          "storage_census_disagreement",
          `l'API Storage dice che il bucket non esiste e il catalogo conta ${catalogo} oggetti.`
        );
      }
      census.set(step, { assente: true, paths: [] });
      say(`      ${step.label.padEnd(56)}  assente (bucket gia' cancellato, catalogo 0)`);
      continue;
    }
    const paths = await listAllObjects();
    if (paths.length !== catalogo) {
      fail(
        "storage_census_disagreement",
        `l'API Storage elenca ${paths.length} oggetti e il catalogo ne conta ${catalogo}.`
      );
    }
    census.set(step, { assente: false, paths });
    daTogliere += paths.length + 1; // gli oggetti, e il bucket stesso
    say(`      ${step.label.padEnd(56)}  ${String(catalogo).padStart(5)}   ${String(paths.length).padStart(12)}   (Storage ${paths.length})`);
    continue;
  }

  if (!PRESENT.has(step.table)) {
    census.set(step, { assente: true, ids: [] });
    say(`      ${step.label.padEnd(56)}  assente`);
    continue;
  }
  const ids = await capture(step);
  const rest = await countViaPostgrest(step.table, step.rest);
  if (rest !== ids.length) {
    fail(
      "census_disagreement",
      `${step.label}: il Management API conta ${ids.length} righe e PostgREST ${rest}. ` +
        "Due fonti che non concordano non autorizzano ne' un atto ne' una rinuncia."
    );
  }
  census.set(step, { assente: false, ids });
  daTogliere += ids.length;
  say(`      ${step.label.padEnd(56)}  ${String(ids.length).padStart(5)}   ${String(ids.length).padStart(12)}   ${String(rest).padStart(9)}`);
}
say(`      letto il ${utc()}`);

if (daTogliere === 0) {
  say("");
  say("  ⚑ NIENTE DA TOGLIERE, su entrambe le fonti. Una decisione senza soggetti");
  say("    non si esegue. L'autorizzazione, se concessa, NON e' stata consumata.");
  say("    Le precondizioni della migration sono gia' vere.");
  say("");
  say(`  chiuso il ${utc()} — uscita 0`);
  say("═════════════════════════════════════════════════════════════════════════");
  say("");
  process.exit(0);
}

if (DRY_RUN) {
  say("");
  say("  --dry-run: fermato qui. Con --apply lo strumento toglierebbe, nell'ordine");
  say("  qui sopra, ogni riga per chiave dal Management API e ogni oggetto dall'API");
  say("  Storage, poi il bucket, ricontando ogni passo da una fonte diversa.");
  say("  Nessuna riga e nessun oggetto sono stati toccati.");
  say(`  chiuso il ${utc()} — uscita 0`);
  say("═════════════════════════════════════════════════════════════════════════");
  say("");
  process.exit(0);
}

/* (d) L'atto, passo per passo. Ogni passo ricattura (la stessa interrogazione
 *     del censimento) e pretende lo stesso numero: se qualcosa ha scritto nel
 *     frattempo, ci si ferma invece di cancellare un insieme diverso da quello
 *     contato. La riga del referto si scrive DOPO il riconteggio. */
say("");
say("  (d) L'ATTO — per chiave, e ogni riga del referto DOPO il riconteggio");
say("      oggetto                                                 catturati   tolti   riconteggio");

const esiti = [];

for (const step of STEPS) {
  const prima = census.get(step);

  if (step.kind === "bucket") {
    if (prima.assente) {
      say(`      ${step.label.padEnd(56)}  assente`);
      continue;
    }
    const paths = await listAllObjects();
    if (paths.length !== prima.paths.length) {
      fail(
        "census_moved",
        `${step.label}: il censimento ne contava ${prima.paths.length}, ora l'API Storage ne elenca ${paths.length}. ` +
          "Qualcosa ha scritto nel bucket fra il conteggio e l'atto."
      );
    }
    let tolti = 0;
    for (const blocco of chunks(paths, 100)) {
      let res;
      try {
        res = await fetch(`${BASE_URL}/storage/v1/object/${BUCKET}`, {
          method: "DELETE",
          headers: storageHeaders,
          body: JSON.stringify({ prefixes: blocco }),
        });
      } catch (err) {
        fail("storage_network", `l'API Storage non ha risposto: ${err?.message ?? "(nessun messaggio)"}`);
      }
      if (!res.ok) {
        const { error } = await storageErrorOf(res);
        fail("storage_delete", `cancellazione degli oggetti: HTTP ${res.status} ${error || "(nessun campo error)"} — tolti finora ${tolti}`);
      }
      const body = await res.json();
      tolti += Array.isArray(body) ? body.length : 0;
    }
    if (tolti !== paths.length) {
      fail("delete_short", `${step.label}: catturati ${paths.length}, tolti ${tolti}.`);
    }
    const dopoStorage = (await listAllObjects()).length;
    const dopoCatalogo = await countObjectsInCatalogue();
    if (dopoStorage !== 0 || dopoCatalogo !== 0) {
      fail("residual_objects", `${step.label}: restano ${dopoStorage} oggetti per l'API Storage e ${dopoCatalogo} per il catalogo.`);
    }
    say(`      ${step.label.padEnd(56)}  ${String(paths.length).padStart(9)}   ${String(tolti).padStart(5)}   Storage 0 · catalogo 0`);
    esiti.push({ oggetto: step.label, catturati: paths.length, tolti, riconteggio: 0 });

    let res;
    try {
      res = await fetch(`${BASE_URL}/storage/v1/bucket/${BUCKET}`, { method: "DELETE", headers: storageHeaders });
    } catch (err) {
      fail("storage_network", `l'API Storage non ha risposto: ${err?.message ?? "(nessun messaggio)"}`);
    }
    if (!res.ok) {
      const { error } = await storageErrorOf(res);
      fail("bucket_delete", `cancellazione del bucket: HTTP ${res.status} ${error || "(nessun campo error)"}`);
    }
    if (await bucketExists()) {
      fail("bucket_still_present", `il bucket ${BUCKET} risponde ancora dopo la cancellazione.`);
    }
    say(`      ${`bucket ${BUCKET}`.padEnd(56)}  ${"1".padStart(9)}   ${"1".padStart(5)}   «Bucket not found»`);
    esiti.push({ oggetto: `bucket ${BUCKET}`, catturati: 1, tolti: 1, riconteggio: 0 });
    continue;
  }

  if (prima.assente) {
    say(`      ${step.label.padEnd(56)}  assente`);
    continue;
  }
  const ids = await capture(step);
  if (ids.length !== prima.ids.length) {
    fail(
      "census_moved",
      `${step.label}: il censimento ne contava ${prima.ids.length}, ora ${ids.length}. ` +
        "Qualcosa ha scritto fra il conteggio e l'atto: nessuna cancellazione su un insieme che si muove."
    );
  }
  let tolti = 0;
  for (const blocco of chunks(ids, 500)) {
    const r = await sql(
      `delete from public.${step.table} where id = ANY(ARRAY[${quoteIds(blocco)}]::uuid[]) returning id;`,
      { readOnly: false }
    );
    tolti += Array.isArray(r) ? r.length : 0;
  }
  if (tolti !== ids.length) {
    fail("delete_short", `${step.label}: catturate ${ids.length}, cancellate ${tolti}.`);
  }
  const dopo = await countViaPostgrest(step.table, step.rest);
  if (dopo !== 0) {
    fail("residual_rows", `${step.label}: PostgREST conta ancora ${dopo} righe dopo l'atto.`);
  }
  say(`      ${step.label.padEnd(56)}  ${String(ids.length).padStart(9)}   ${String(tolti).padStart(5)}   PostgREST 0`);
  esiti.push({ oggetto: step.label, catturati: ids.length, tolti, riconteggio: 0 });
}
say(`      atto chiuso il ${utc()}`);

/* (e) L'autorizzazione si consuma qui — dopo l'ultimo riconteggio — e non nella
 *     memoria di chi l'ha usata. */
if (IS_PRODUCTION && authorisationText) {
  const consumata = authorisationText.replace(/^spent:[ \t]*no[ \t]*$/m, `spent: yes\nspent_at: ${utc()}`);
  try {
    writeFileSync(AUTH_PATH, consumata);
    say("");
    say(`  ✓ autorizzazione marcata ESAURITA in ${AUTH_PATH}`);
  } catch (err) {
    fail(
      "authorisation_not_spent",
      `l'atto E' AVVENUTO ma ${AUTH_PATH} non e' stato marcato esaurito: ` +
        `${err?.message ?? "(nessun messaggio)"}. Marcarlo a mano, subito.`
    );
  }
}

say("");
say("  RIASSUNTO — solo numeri");
for (const e of esiti) {
  say(`      ${e.oggetto}: catturati ${e.catturati}, tolti ${e.tolti}, riconteggio ${e.riconteggio}`);
}
say("");
say("  Le precondizioni di 20261014120000_production_tools_removal.sql sono vere.");
say(`  chiuso il ${utc()} — uscita 0`);
say("═════════════════════════════════════════════════════════════════════════");
say("");
