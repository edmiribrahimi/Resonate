/**
 * purge-media-orphans.mjs — rimuove PER CHIAVE, dal bucket `event-media`, gli
 * oggetti delle foto RIFIUTATE (oggetto e riga) e gli oggetti ORFANI (oggetto
 * senza riga), con il conteggio prima, l'istantanea prima, e il riconteggio
 * dopo preso da un'altra fonte. E' lo strumento di D-52-30.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * NON PUNTA MAI ALLA PRODUZIONE PER DEFAULT, E NON PER CONVENZIONE.
 *
 * Il bersaglio e' `LAB_PROJECT_REF`. Se il ref risolto coincide con quello di
 * produzione lo script **rifiuta** (uscita 2), e il rifiuto e' la prima cosa
 * eseguita dopo la lettura degli argomenti: nessuna lettura di database o di
 * bucket avviene prima. Un controllo che gira dopo la prima `remove` non e' un
 * controllo, e' un rimpianto.
 *
 * In produzione ci si arriva **solo** con un'autorizzazione datata che questo
 * file legge, i cui numeri riconta, e che **consuma** da se'. Vedi
 * «L'AUTORIZZAZIONE» piu' sotto.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * PERCHE' ESISTE. D-52-30 (decisione del proprietario): gli oggetti delle foto
 * rifiutate e gli orfani del bucket si rimuovono, non restano debito. Chiude il
 * gate *moderazione = rimozione* di `media-and-storage.md`: rifiutare deve
 * rendere un contenuto IRRAGGIUNGIBILE, non invisibile. Una riga `rejected` il
 * cui oggetto resta nel bucket e' una foto che la moderazione ha tolto dalla
 * pagina e lasciato su internet. M2 (piano 52-13) rendera' quegli oggetti non
 * firmabili; toglierli davvero e' un'altra operazione, ed e' questa.
 *
 * LE REGOLE DELLA RIMOZIONE, che qui sono codice e non un promemoria. Vengono
 * dall'incidente registrato in `.claude/rules/ai-engineering.md` (63 righe di
 * produzione cancellate da uno script di verifica) e da `purge-attendances.mjs`,
 * di cui questo file segue la struttura. Il progetto NON ha PITR.
 *
 *   1. Si CONTA prima, e si conta **per popolazione**:
 *        R — oggetti di righe `rejected`: si toglie l'oggetto E la riga;
 *        O — oggetti ORFANI: nessuna riga di `event_media` li nomina, ne' per
 *            `storage_path` ne' per la coda dell'`url` (le righe scritte dal
 *            codice anteriore a 52-08 portano solo l'`url`, e un oggetto che una
 *            riga nomina anche solo cosi' NON e' un orfano).
 *      Le due restano separate in ogni riga del referto, nell'istantanea, nella
 *      cattura, nell'atto e nel riconteggio. Sommarle significherebbe far
 *      autorizzare l'una dalla decisione presa sull'altra.
 *   2. UN OGGETTO NATO DA MENO DI `--older-than-minutes` (default 60) NON E' UN
 *      ORFANO: e' un caricamento in volo, fra la scrittura della route di
 *      finalize e l'insert di `registerMedia`
 *      (`src/app/(public)/events/[slug]/actions.ts`, la finestra dichiarata nel
 *      docblock di `registerMedia`). Si conta a parte come «in volo» e non si
 *      tocca. In produzione la soglia non scende sotto 60.
 *   3. L'ISTANTANEA si scrive PRIMA di qualunque scrittura, in
 *      `.env.media-purge-snapshot.<stamp>.json` (coperto da `.gitignore`), e
 *      porta **SOLO METADATI**: nome dell'oggetto, dimensione, mimetype,
 *      `created_at`; per R anche `id`, `status` e `created_at` della riga.
 *      **NESSUN BYTE, DI PROPOSITO.** Togliere una foto rifiutata e' lo scopo
 *      dell'atto: conservarne una copia sul disco di chi lo esegue lo
 *      vanificherebbe, e sposterebbe l'immagine di una persona dal bucket, dove
 *      almeno una policy la governa, a un portatile dove non la governa niente
 *      (`legal-compliance.md`, gate *immagini delle persone* e *i dati dei soci
 *      non sono i dati del prodotto*). Il prezzo e' dichiarato: l'atto non si
 *      puo' disfare dall'istantanea. L'istantanea serve a sapere COSA e' stato
 *      tolto, non a rimetterlo.
 *   4. La rimozione avviene PER CHIAVE, su una lista **catturata dalla stessa
 *      interrogazione che l'ha contata**, e ogni chiamata di rimozione porta
 *      UN SOLO nome. Mai per prefisso, mai per «tutto cio' che non e'
 *      referenziato» ricalcolato al momento, mai su un elenco riletto dopo la
 *      prima cancellazione. Il verso dell'errore e' il punto: una chiave
 *      sbagliata non trova nulla, un selettore largo cancella di piu'.
 *      Subito prima dell'atto la lista catturata si RIVERIFICA per chiave (le
 *      righe R sono ancora `rejected`? gli oggetti O sono ancora senza riga?):
 *      se una sola chiave e' cambiata, nessuna scrittura.
 *   5. La CONFERMA si chiede a una FONTE DIVERSA da quella che ha cancellato:
 *      gli oggetti si tolgono con l'API Storage e si ricontano dal Management
 *      API su `storage.objects`; le righe si tolgono dal Management API e si
 *      ricontano da PostgREST con la chiave di servizio. Una misura presa con
 *      lo strumento che ha causato l'effetto e' un'eco.
 *   6. La CASCATA si enumera dal catalogo (`pg_constraint`, `confrelid`): se
 *      qualche tabella pende da `event_media`, lo strumento non sa cosa
 *      trascinerebbe con se' e si ferma prima di scrivere.
 *
 * UNA DECISIONE SENZA SOGGETTI NON SI ESEGUE. Se R e O sono entrambe vuote lo
 * script lo dice, riconta lo zero da una seconda fonte ed esce con successo,
 * senza consumare l'autorizzazione.
 *
 * L'AUTORIZZAZIONE, e perche' e' lo strumento a farla rispettare.
 * Un'autorizzazione e' un atto che si consuma **una volta**. Il documento
 * (`52-AUTHORISATION-MEDIA.md`, piano 52-16) portera' DUE blocchi — questo e
 * quello di `restrip-event-media.mjs` — quindi i campi si leggono e si marcano
 * **SOLO FRA I DUE MARCATORI** di questo strumento, mai sull'intero documento:
 *
 *     <!-- purge-media-orphans: grant -->
 *     act: event_media.purge
 *     target: production
 *     granted: yes
 *     granted_on: 2026-09-30
 *     spent: no
 *     rejected_objects: 0
 *     orphan_objects: 0
 *     <!-- /purge-media-orphans: grant -->
 *
 * Rifiuto (uscita 2) se il blocco manca o non e' chiuso, se un campo non
 * corrisponde, se `granted_on` non coincide con `--dated`. Se i numeri contati
 * oggi differiscono da `rejected_objects` / `orphan_objects`, uscita 1 con
 * categoria `count_drift` e nessuna scrittura: chi ha concesso ha concesso
 * QUEI numeri, e un numero diverso e' un'altra decisione.
 *
 * USO
 *   node scripts/purge-media-orphans.mjs --dry-run
 *       conta per popolazione, scrive l'istantanea, cattura le chiavi e si
 *       ferma. Nessuna scrittura sul bersaglio.
 *   node scripts/purge-media-orphans.mjs --apply [--older-than-minutes <n>]
 *       come sopra, poi rimuove per chiave e riconta da un'altra fonte.
 *   node scripts/purge-media-orphans.mjs --apply --project <ref> \
 *        --authorised <percorso> --dated <YYYY-MM-DD>
 *       l'unica strada verso la produzione.
 *
 * USCITE
 *   0  il referto e' completo (compreso il caso «zero soggetti»)
 *   1  qualcosa e' andato storto, con la sua categoria
 *      `[purge-media-orphans.<categoria>]`
 *   2  RIFIUTO: argomenti, bersaglio o autorizzazione non ammissibili.
 *      Nessuna lettura.
 *
 * VARIABILI. Lo script carica `.env.local` e `.env.lab.local` se esistono, e
 * il caricamento NON sovrascrive cio' che l'ambiente porta gia'
 * (`process.loadEnvFile`): SUPABASE_ACCESS_TOKEN, LAB_PROJECT_REF; per il
 * laboratorio LAB_SUPABASE_URL e LAB_SUPABASE_SERVICE_ROLE_KEY, per la
 * produzione NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY. L'URL si
 * verifica contro il ref del bersaglio prima di ogni uso.
 *
 * SEGRETEZZA. Questo file e' su un repository PUBBLICO. Il ref di produzione e'
 * scritto qui in chiaro e va bene: viaggia gia' nel bundle del browser dentro
 * `NEXT_PUBLIC_SUPABASE_URL`. Il ref del LABORATORIO non e' scritto qui. Lo
 * standard output porta **solo numeri, categorie, ore UTC e il nome del file
 * d'istantanea**: mai un nome di oggetto, un path, un URL o un id — i nomi
 * degli oggetti contengono l'id di chi ha caricato e dell'evento, e chi incolla
 * il referto in `.planning/` non deve poter pubblicare nulla per sbaglio. Le
 * chiavi stanno solo nell'istantanea, che e' `.env*`.
 */

import { writeFileSync, readFileSync, existsSync } from "node:fs";

/* ─────────────────── gli argomenti, letti prima di agire ─────────────────── */

const ARGV = process.argv.slice(2);
const has = (flag) => ARGV.includes(flag);
const valueOf = (flag) => {
  const i = ARGV.indexOf(flag);
  return i >= 0 && i + 1 < ARGV.length ? ARGV[i + 1] : null;
};

const DRY_RUN = has("--dry-run");
const APPLY = has("--apply");
const AUTH_PATH = valueOf("--authorised");
const AUTH_DATE = valueOf("--dated");
const OLDER_RAW = valueOf("--older-than-minutes");

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

const OLDER_THAN_MINUTES = OLDER_RAW === null ? 60 : Number(OLDER_RAW);
if (!Number.isInteger(OLDER_THAN_MINUTES) || OLDER_THAN_MINUTES < 1) {
  refuse(`--older-than-minutes vuole un intero positivo, non «${OLDER_RAW}».`);
}

/* ───────────────────────── il rifiuto, prima di tutto ───────────────────── */

const PRODUCTION_REF = "cjsfocnhfzycbbgkwocx";
const BUCKET = "event-media";
const OPEN_MARK = "<!-- purge-media-orphans: grant -->";
const CLOSE_MARK = "<!-- /purge-media-orphans: grant -->";

/**
 * Il blocco di QUESTO strumento, e solo quello. Restituisce gli indici di
 * inizio e fine del contenuto fra i marcatori, o null.
 */
function grantBlock(text) {
  const start = text.indexOf(OPEN_MARK);
  if (start < 0) return null;
  const from = start + OPEN_MARK.length;
  const end = text.indexOf(CLOSE_MARK, from);
  if (end < 0) return null;
  if (text.indexOf(OPEN_MARK, from) >= 0) return { duplicate: true };
  return { from, end, body: text.slice(from, end) };
}

/**
 * Il documento, letto e verificato. Restituisce testo e campi se
 * l'autorizzazione regge; rifiuta altrimenti. Non scrive nulla: la marcatura
 * avviene DOPO l'atto.
 */
function readAuthorisation(ref, path, dated) {
  if (!path || !dated) {
    refuse(
      `${ref} e' il ref di PRODUZIONE.\n` +
        "        Qui si cancellano foto e righe di media, in modo irreversibile, su\n" +
        "        un progetto senza PITR. Serve --authorised <percorso> --dated <YYYY-MM-DD>."
    );
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dated)) {
    refuse(`--dated vuole una data YYYY-MM-DD, non «${dated}».`);
  }
  if (!existsSync(path)) refuse(`il documento di autorizzazione non esiste: ${path}`);
  const text = readFileSync(path, "utf8");
  const block = grantBlock(text);
  if (!block) {
    refuse(
      `${path} non porta un blocco ${OPEN_MARK} … ${CLOSE_MARK} chiuso.\n` +
        "        La forma e' nel docblock in testa a questo file."
    );
  }
  if (block.duplicate) refuse(`${path} porta PIU' di un blocco di questo strumento: ambiguo.`);
  const field = (name) => {
    const m = new RegExp(`^${name}:[ \\t]*(.+?)[ \\t]*$`, "m").exec(block.body);
    return m ? m[1] : null;
  };
  const expect = { act: "event_media.purge", target: "production", granted: "yes", spent: "no" };
  for (const [name, value] of Object.entries(expect)) {
    if (field(name) !== value) {
      refuse(
        `${path}, blocco di questo strumento: ${name} = ${field(name) ?? "(assente)"}, atteso ${value}.` +
          (name === "spent"
            ? "\n        Un'autorizzazione si consuma una volta. Se serve di nuovo, si chiede di nuovo."
            : "")
      );
    }
  }
  if (field("granted_on") !== dated) {
    refuse(
      `${path} e' datato ${field("granted_on") ?? "(assente)"} e --dated dice ${dated}.\n` +
        "        E' cio' che impedisce di riusare per distrazione un'autorizzazione\n" +
        "        scritta per un altro giorno."
    );
  }
  const numbers = {};
  for (const name of ["rejected_objects", "orphan_objects"]) {
    const v = field(name);
    if (v === null || !/^\d+$/.test(v)) {
      refuse(`${path}, blocco di questo strumento: ${name} = ${v ?? "(assente)"}, atteso un intero.`);
    }
    numbers[name] = Number(v);
  }
  return { text, block, numbers };
}

// (i) il ref passato da riga di comando si giudica PRIMA di leggere qualunque file.
const CLI_REF = valueOf("--project");
let authorisation = null;
if (CLI_REF === PRODUCTION_REF) authorisation = readAuthorisation(CLI_REF, AUTH_PATH, AUTH_DATE);

// (ii) leggere un file dal disco non tocca alcun database; non sovrascrive l'ambiente.
for (const envFile of [".env.local", ".env.lab.local"]) {
  if (existsSync(envFile)) process.loadEnvFile(envFile);
}

const REF = CLI_REF ?? process.env.LAB_PROJECT_REF ?? null;
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN ?? null;
if (!REF || !TOKEN) {
  refuse(
    "LAB_PROJECT_REF (o --project) e SUPABASE_ACCESS_TOKEN sono necessari.\n" +
      "        Carica .env.local e .env.lab.local, come fa scripts/dev-lab.sh."
  );
}
const IS_PRODUCTION = REF === PRODUCTION_REF;
// (iii) il ref arrivato dall'ambiente si giudica con la stessa regola.
if (IS_PRODUCTION && !authorisation) authorisation = readAuthorisation(REF, AUTH_PATH, AUTH_DATE);
if (IS_PRODUCTION && OLDER_THAN_MINUTES < 60) {
  refuse("in produzione --older-than-minutes non scende sotto 60: un caricamento in volo non e' un orfano.");
}

/* ──────────────────────────────── utilita' ──────────────────────────────── */

const STAMP = new Date().toISOString().replace(/[:.]/g, "-");
const SNAPSHOT_FILE = `.env.media-purge-snapshot.${STAMP}.json`;

/** Categoria d'errore esplicita: nessun `catch` che collassa cause diverse. */
function fail(category, detail) {
  console.error(`[purge-media-orphans.${category}] ${detail}`);
  process.exit(1);
}

const utc = () => new Date().toISOString();
const say = (s) => console.log(s);
const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
const textArray = (arr) => `ARRAY[${arr.map(q).join(", ")}]::text[]`;
const uuidArray = (arr) => `ARRAY[${arr.map((x) => `${q(x)}::uuid`).join(", ")}]::uuid[]`;

/** URL e chiave di servizio del BERSAGLIO, verificati contro il ref. */
function targetApi() {
  const url = IS_PRODUCTION
    ? process.env.NEXT_PUBLIC_SUPABASE_URL
    : process.env.LAB_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = IS_PRODUCTION
    ? process.env.SUPABASE_SERVICE_ROLE_KEY
    : process.env.LAB_SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    fail("api_env", "URL o chiave di servizio del bersaglio assenti: nessuna seconda fonte ne' API Storage.");
  }
  // Un URL di un altro progetto tornerebbe zero per la ragione sbagliata, o
  // cancellerebbe altrove: in entrambi i casi in silenzio.
  if (!url.includes(`${REF}.supabase.co`)) {
    fail("api_target", "l'URL dell'API non nomina il bersaglio dell'atto: rifiuto di usarlo.");
  }
  if (!IS_PRODUCTION && url.includes(PRODUCTION_REF)) {
    fail("api_target", "bersaglio di laboratorio ma URL di produzione: rifiuto di usarlo.");
  }
  return { url, key };
}

/**
 * Il Management API. `readOnly` e' esplicito a ogni chiamata: l'unica
 * invocazione che lo mette a `false` e' il `DELETE` delle righe R.
 */
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
  if (!res.ok) {
    // Il corpo d'errore puo' ripetere la query, che porta chiavi: solo lo stato.
    fail("sql", `Management API HTTP ${res.status}`);
  }
  try {
    return await res.json();
  } catch (err) {
    fail("sql_payload", `risposta non interpretabile: ${err?.message ?? "(nessun messaggio)"}`);
  }
}

/** PostgREST con la chiave di servizio: la fonte DIVERSA per le righe. */
async function countRowsViaPostgrest(filter) {
  const { url, key } = targetApi();
  let res;
  try {
    res = await fetch(`${url}/rest/v1/event_media?select=id&${filter}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}`, Prefer: "count=exact", Range: "0-0" },
    });
  } catch (err) {
    fail("counter_network", `PostgREST non ha risposto: ${err?.message ?? "(nessun messaggio)"}`);
  }
  if (!res.ok) fail("counter_http", `PostgREST HTTP ${res.status}`);
  const range = res.headers.get("content-range") ?? "";
  const total = range.split("/")[1];
  if (total === undefined || total === "*") {
    fail("counter_shape", "PostgREST non ha restituito un totale nel content-range");
  }
  return Number(total);
}

/** Un client Storage col service role, costruito solo quando serve rimuovere. */
async function storageClient() {
  const { url, key } = targetApi();
  let createClient;
  try {
    ({ createClient } = await import("@supabase/supabase-js"));
  } catch (err) {
    fail("storage_client", `@supabase/supabase-js non caricabile: ${err?.message ?? "(nessun messaggio)"}`);
  }
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }).storage.from(BUCKET);
}

/**
 * Rimuove UN oggetto, per nome esatto. Restituisce true se l'API dichiara di
 * averlo tolto. Un nome per chiamata: se la chiave e' sbagliata, non trova nulla.
 */
async function removeOne(bucket, name) {
  let out;
  try {
    out = await bucket.remove([name]);
  } catch (err) {
    return { ok: false, category: "storage_network", detail: err?.message ?? "(nessun messaggio)" };
  }
  if (out.error) return { ok: false, category: "storage_error", detail: out.error.message ?? "errore senza messaggio" };
  const removed = (out.data ?? []).filter((o) => o?.name === name).length;
  if (removed !== 1) return { ok: false, category: "storage_not_found", detail: `rimossi ${removed} invece di 1` };
  return { ok: true };
}

/* ──────────────────────────────── il referto ─────────────────────────────── */

say("");
say("═══ purge-media-orphans ═════════════════════════════════════════════════");
say(`  bersaglio      : ${IS_PRODUCTION ? "PRODUZIONE" : "laboratorio"}`);
say(`  modo           : ${DRY_RUN ? "--dry-run (nessuna scrittura sul bersaglio)" : "--apply"}`);
say(`  soglia in volo : ${OLDER_THAN_MINUTES} minuti${OLDER_THAN_MINUTES !== 60 ? " (NON la soglia di default)" : ""}`);
say(`  ora di partenza: ${utc()}`);
if (IS_PRODUCTION) say(`  autorizzazione : ${AUTH_PATH} (${AUTH_DATE})`);
say("─────────────────────────────────────────────────────────────────────────");

/* (0) Lo schema che questo strumento presuppone: `event_media.storage_path`
 *     nasce con M1 (piano 52-06). Senza, la popolazione R non ha chiave e
 *     l'interrogazione fallirebbe con un 400 muto: si dice perche'. */
const [schema] = await sql(`
  select exists (select 1 from information_schema.columns
                 where table_schema = 'public' and table_name = 'event_media'
                   and column_name = 'storage_path') as ha_storage_path,
         (to_regclass('storage.objects') is not null) as ha_storage_objects;
`);
if (!schema.ha_storage_path || !schema.ha_storage_objects) {
  fail(
    "schema_missing",
    `event_media.storage_path ${schema.ha_storage_path ? "c'e'" : "NON esiste"}, storage.objects ` +
      `${schema.ha_storage_objects ? "c'e'" : "NON esiste"}. M1 (piano 52-06) non e' applicata su questo ` +
      "bersaglio: senza la chiave della riga le popolazioni non si contano. Nessuna scrittura."
  );
}

/* (a) CONTEGGIO E CATTURA, nella STESSA interrogazione, per popolazione.
 *
 * `nominato` = una riga di event_media nomina l'oggetto per storage_path O per
 * la coda dell'url. E' la definizione larga di «referenziato», quindi la
 * definizione STRETTA di orfano: il verso dell'errore ammesso. */
const [c] = await sql(`
  with obj as (
    select o.name, o.created_at,
           (o.metadata->>'size')::bigint as size,
           o.metadata->>'mimetype'       as mimetype
    from   storage.objects o
    where  o.bucket_id = ${q(BUCKET)}
  ),
  refd as (
    select obj.*,
           exists (select 1 from public.event_media m
                   where m.storage_path = obj.name
                      or m.url like '%/' || ${q(BUCKET)} || '/' || obj.name) as nominato
    from obj
  ),
  r as (
    select m.id, m.status, m.created_at as row_created_at,
           obj.name, obj.size, obj.mimetype, obj.created_at
    from   public.event_media m
    join   obj on obj.name = m.storage_path
    where  m.status = 'rejected'
  )
  select
    (select count(*) from obj)                                                        as oggetti,
    (select count(*) from r)                                                          as r_oggetti,
    (select count(*) from public.event_media where status = 'rejected')               as r_righe_totali,
    (select count(*) from public.event_media m where m.status = 'rejected'
       and m.storage_path is null)                                                    as r_senza_path,
    (select count(*) from public.event_media m where m.status = 'rejected'
       and m.storage_path is not null
       and not exists (select 1 from obj where obj.name = m.storage_path))            as r_senza_oggetto,
    (select count(*) from refd where not nominato
       and created_at <= now() - make_interval(mins => ${OLDER_THAN_MINUTES}))        as o_oggetti,
    (select count(*) from refd where not nominato
       and created_at >  now() - make_interval(mins => ${OLDER_THAN_MINUTES}))        as in_volo,
    (select count(*) from public.event_media where status = 'approved')               as approvate,
    (select count(*) from public.event_media where status = 'pending')                as in_attesa,
    (select count(*) from public.event_media m join obj on obj.name = m.storage_path
       where m.status in ('approved', 'pending'))                                     as oggetti_vivi,
    coalesce((select json_agg(r order by r.name) from r), '[]')                       as r_lista,
    coalesce((select json_agg(json_build_object('name', name, 'size', size,
                'mimetype', mimetype, 'created_at', created_at) order by name)
              from refd where not nominato
                and created_at <= now() - make_interval(mins => ${OLDER_THAN_MINUTES})), '[]') as o_lista,
    now()                                                                              as letto_il;
`);

const R = c.r_lista ?? [];
const O = c.o_lista ?? [];
const n = (k) => Number(c[k]);
const before = {
  oggetti: n("oggetti"),
  r_oggetti: n("r_oggetti"),
  r_righe_totali: n("r_righe_totali"),
  r_senza_path: n("r_senza_path"),
  r_senza_oggetto: n("r_senza_oggetto"),
  o_oggetti: n("o_oggetti"),
  in_volo: n("in_volo"),
  approvate: n("approvate"),
  in_attesa: n("in_attesa"),
  oggetti_vivi: n("oggetti_vivi"),
};

say("");
say("  (a) CONTEGGIO PER POPOLAZIONE — Management API, read_only");
say(`      oggetti nel bucket                                  : ${before.oggetti}`);
say(`      R  oggetti di righe rejected (oggetto + riga)       : ${before.r_oggetti}`);
say(`      O  oggetti orfani oltre la soglia (solo oggetto)    : ${before.o_oggetti}`);
say(`      ·  oggetti senza riga NATI DA MENO della soglia     : ${before.in_volo}  (in volo — non si toccano)`);
say(`      ·  righe rejected senza storage_path                : ${before.r_senza_path}  (non si toccano: chiave ignota)`);
say(`      ·  righe rejected il cui oggetto non c'e' gia' piu' : ${before.r_senza_oggetto}  (non si toccano: fuori da R)`);
say(`      ·  righe approvate / in attesa (NON soggetti)       : ${before.approvate} / ${before.in_attesa}`);
say(`      ·  oggetti di righe approvate o in attesa           : ${before.oggetti_vivi}`);
say(`      letto il ${c.letto_il}`);

if (R.length !== before.r_oggetti || O.length !== before.o_oggetti) {
  fail("census_inconsistent", "le liste catturate non hanno la lunghezza dei conteggi: nessun atto su un censimento che non torna.");
}
if (R.some((x) => x.status !== "rejected")) {
  fail("census_inconsistent", "la cattura R contiene una riga non rejected: nessun atto.");
}
if (new Set(R.map((x) => x.name)).size !== R.length || new Set(R.map((x) => x.id)).size !== R.length) {
  fail("census_inconsistent", "la cattura R contiene chiavi duplicate: nessun atto.");
}
const rNames = new Set(R.map((x) => x.name));
if (O.some((x) => rNames.has(x.name))) {
  fail("census_inconsistent", "un oggetto compare sia in R sia in O: le due popolazioni devono essere disgiunte.");
}

/* (a') In produzione, i numeri di oggi contro quelli concessi. */
if (IS_PRODUCTION) {
  const g = authorisation.numbers;
  say("");
  say("  (a') NUMERI CONCESSI CONTRO NUMERI DI OGGI");
  say(`      R  concessi ${g.rejected_objects} · contati ${before.r_oggetti}`);
  say(`      O  concessi ${g.orphan_objects} · contati ${before.o_oggetti}`);
  if (g.rejected_objects !== before.r_oggetti || g.orphan_objects !== before.o_oggetti) {
    fail(
      "count_drift",
      "i numeri di oggi non sono quelli concessi. Chi ha concesso ha concesso QUEI numeri: " +
        "nessuna scrittura, l'autorizzazione non e' stata consumata. Si richiede con i numeri nuovi."
    );
  }
}

/* (b) Zero soggetti: lo si dice, e lo zero si conferma da una seconda fonte. */
if (R.length === 0 && O.length === 0) {
  const rejectedPg = await countRowsViaPostgrest("status=eq.rejected");
  say("");
  say("  (b) ZERO SOGGETTI — controllo da una seconda fonte (PostgREST, service role)");
  say(`      righe rejected: Management API ${before.r_righe_totali} · PostgREST ${rejectedPg}`);
  if (rejectedPg !== before.r_righe_totali) {
    fail(
      "census_disagreement",
      "le due fonti non concordano sulle righe rejected: ne' un atto ne' una rinuncia su due misure discordi."
    );
  }
  say("");
  say("  ⚑ ZERO SOGGETTI in entrambe le popolazioni: non c'e' niente da rimuovere.");
  say("    Una decisione senza soggetti non si esegue. L'autorizzazione, se c'e',");
  say("    NON e' stata consumata. Nessuna istantanea: non c'e' niente da fotografare.");
  say("");
  say(`  chiuso il ${utc()} — uscita 0`);
  say("═════════════════════════════════════════════════════════════════════════");
  say("");
  process.exit(0);
}

/* (c) La cascata, DAL CATALOGO: chi pende da event_media? */
const cascata = await sql(`
  select c.conrelid::regclass::text as tabella, c.conname, pg_get_constraintdef(c.oid) as definizione
  from   pg_constraint c
  where  c.confrelid = 'public.event_media'::regclass
  order  by 1, 2;
`);
say("");
say("  (c) CASCATA, ENUMERATA DAL CATALOGO — pg_constraint.confrelid = event_media");
say(`      vincoli che pendono da event_media: ${cascata.length}`);
for (const k of cascata) say(`        · ${k.tabella} — ${k.conname}`);
if (cascata.length > 0) {
  fail(
    "cascade_unhandled",
    "qualche tabella pende da event_media: cancellare righe R trascinerebbe righe che questo " +
      "strumento non conta. Nessuna scrittura; estendere l'istantanea prima."
  );
}
say("      (vuota: cancellare righe R non tocca nient'altro; togliere oggetti non ha cascate)");

/* (d) L'istantanea, PRIMA di qualunque scrittura. SOLO METADATI. */
const istantanea = {
  strumento: "purge-media-orphans.mjs",
  bersaglio: IS_PRODUCTION ? "production" : "lab",
  scattata_il: utc(),
  modo: DRY_RUN ? "dry-run" : "apply",
  soglia_in_volo_minuti: OLDER_THAN_MINUTES,
  nota: "solo metadati, nessun byte: vedi la regola 3 del docblock",
  conteggio: before,
  cascata,
  R_rifiutate: R, // nome, size, mimetype, created_at dell'oggetto; id, status, created_at della riga
  O_orfani: O, // nome, size, mimetype, created_at
};
try {
  writeFileSync(SNAPSHOT_FILE, JSON.stringify(istantanea, null, 2));
} catch (err) {
  fail("snapshot_write", `l'istantanea non e' stata scritta: ${err?.message ?? "(nessun messaggio)"}`);
}
say("");
say("  (d) ISTANTANEA — scritta PRIMA di qualunque scrittura, SOLO METADATI");
say(`      file: ${SNAPSHOT_FILE}  (coperto da .gitignore: porta chiavi)`);
say(`      R: ${R.length} voci · O: ${O.length} voci · byte di immagini: 0`);

/* (e) Le chiavi catturate: nel referto solo il loro numero. */
say("");
say("  (e) CHIAVI CATTURATE dalla stessa interrogazione che le ha contate");
say(`      R: ${R.length} nomi di oggetto + ${R.length} id di riga`);
say(`      O: ${O.length} nomi di oggetto`);
say("      (le chiavi stanno nell'istantanea, mai sullo standard output)");

if (DRY_RUN) {
  say("");
  say("  --dry-run: fermato qui. Nessun oggetto e nessuna riga sono stati toccati.");
  say(`  chiuso il ${utc()} — uscita 0`);
  say("═════════════════════════════════════════════════════════════════════════");
  say("");
  process.exit(0);
}

/* (f) Riverifica PER CHIAVE, subito prima dell'atto. Non e' un nuovo
 *     censimento: interroga solo le chiavi catturate, e se una sola e' cambiata
 *     non si scrive nulla. */
const rIds = R.map((x) => x.id);
const oNames = O.map((x) => x.name);
const [ri] = await sql(`
  select
    ${rIds.length ? `(select count(*) from public.event_media m
       where m.id = any(${uuidArray(rIds)}) and m.status = 'rejected')` : "0"}          as r_ancora_rejected,
    ${oNames.length ? `(select count(*) from unnest(${textArray(oNames)}) as k(name)
       where exists (select 1 from public.event_media m
                     where m.storage_path = k.name
                        or m.url like '%/' || ${q(BUCKET)} || '/' || k.name))` : "0"}   as o_ora_nominati;
`);
say("");
say("  (f) RIVERIFICA PER CHIAVE, prima dell'atto");
say(`      R ancora rejected : ${Number(ri.r_ancora_rejected)} di ${R.length}`);
say(`      O ora nominati    : ${Number(ri.o_ora_nominati)} di ${O.length}`);
if (Number(ri.r_ancora_rejected) !== R.length || Number(ri.o_ora_nominati) !== 0) {
  fail("key_changed", "almeno una chiave catturata e' cambiata stato fra la cattura e l'atto: nessuna scrittura.");
}

const bucket = await storageClient();

/* (g) ATTO R — l'oggetto PRIMA, la riga DOPO, come `deleteMedia`. */
say("");
say("  (g) ATTO R — oggetto per nome esatto, poi riga per id AND status = 'rejected'");
let rRemoved = 0;
const rRowIds = [];
for (const item of R) {
  const out = await removeOne(bucket, item.name);
  if (!out.ok) {
    say(`      · un oggetto R NON rimosso [${out.category}] ${out.detail} — la sua riga resta`);
    continue;
  }
  rRemoved += 1;
  rRowIds.push(item.id); // la riga si toglie solo se il suo oggetto e' stato tolto
}
say(`      oggetti R rimossi (API Storage) : ${rRemoved} di ${R.length}`);
let rRowsDeleted = 0;
if (rRowIds.length > 0) {
  const del = await sql(
    `delete from public.event_media where id = any(${uuidArray(rRowIds)}) and status = 'rejected' returning id;`,
    { readOnly: false }
  );
  rRowsDeleted = del.length;
}
say(`      righe R cancellate (Management API): ${rRowsDeleted} di ${rRowIds.length}`);
say(`      atto R eseguito il ${utc()}`);

/* (h) ATTO O — solo l'oggetto. */
say("");
say("  (h) ATTO O — oggetto per nome esatto");
let oRemoved = 0;
for (const item of O) {
  const out = await removeOne(bucket, item.name);
  if (!out.ok) {
    say(`      · un oggetto O NON rimosso [${out.category}] ${out.detail}`);
    continue;
  }
  oRemoved += 1;
}
say(`      oggetti O rimossi (API Storage) : ${oRemoved} di ${O.length}`);
say(`      atto O eseguito il ${utc()}`);

/* (i) RICONTEGGIO DA FONTE DIVERSA.
 *     Oggetti: Management API su storage.objects (non l'API Storage che ha tolto).
 *     Righe:   PostgREST col service role (non il Management API che ha cancellato). */
const rNamesArr = R.map((x) => x.name);
const [after] = await sql(`
  select
    ${rNamesArr.length ? `(select count(*) from storage.objects where bucket_id = ${q(BUCKET)} and name = any(${textArray(rNamesArr)}))` : "0"} as r_oggetti_residui,
    ${oNames.length ? `(select count(*) from storage.objects where bucket_id = ${q(BUCKET)} and name = any(${textArray(oNames)}))` : "0"} as o_oggetti_residui,
    (select count(*) from storage.objects where bucket_id = ${q(BUCKET)}) as oggetti,
    (select count(*) from public.event_media m join storage.objects o
       on o.bucket_id = ${q(BUCKET)} and o.name = m.storage_path
       where m.status in ('approved', 'pending')) as oggetti_vivi;
`);
const rRowsResidualPg = rIds.length ? await countRowsViaPostgrest(`id=in.(${rIds.join(",")})`) : 0;
const approvedPg = await countRowsViaPostgrest("status=eq.approved");
const pendingPg = await countRowsViaPostgrest("status=eq.pending");

say("");
say("  (i) RICONTEGGIO DA FONTE DIVERSA");
say("      oggetti — Management API su storage.objects, per chiave catturata:");
say(`        R residui : ${Number(after.r_oggetti_residui)}`);
say(`        O residui : ${Number(after.o_oggetti_residui)}`);
say(`        oggetti nel bucket : ${before.oggetti} → ${Number(after.oggetti)}`);
say(`        oggetti di righe approvate/in attesa : ${before.oggetti_vivi} → ${Number(after.oggetti_vivi)}`);
say("      righe — PostgREST, service role:");
say(`        R residue (per id catturato) : ${rRowsResidualPg}`);
say(`        approvate : ${before.approvate} → ${approvedPg}`);
say(`        in attesa : ${before.in_attesa} → ${pendingPg}`);
say(`      letto il ${utc()}`);

const problems = [];
if (rRemoved !== R.length || oRemoved !== O.length) problems.push(`delete_short oggetti R ${rRemoved}/${R.length}, O ${oRemoved}/${O.length}`);
if (rRowsDeleted !== rRowIds.length) problems.push(`delete_short righe R ${rRowsDeleted}/${rRowIds.length}`);
if (Number(after.r_oggetti_residui) + Number(after.o_oggetti_residui) + rRowsResidualPg > 0) {
  problems.push("residual: la seconda fonte vede ancora chiavi catturate");
}
if (approvedPg !== before.approvate || pendingPg !== before.in_attesa || Number(after.oggetti_vivi) !== before.oggetti_vivi) {
  problems.push("untouched_changed: approvate, in attesa o i loro oggetti sono cambiati durante l'atto");
}

/* (j) L'autorizzazione si consuma qui, SOLO dentro il blocco di questo
 *     strumento, e anche se l'atto e' stato parziale: un atto avvenuto a meta'
 *     e' comunque avvenuto, e rilanciarlo richiede una nuova concessione sui
 *     numeri nuovi. */
if (IS_PRODUCTION && authorisation) {
  const { text, block } = authorisation;
  const body = block.body.replace(/^spent:[ \t]*no[ \t]*$/m, `spent: yes\nspent_at: ${utc()}`);
  try {
    writeFileSync(AUTH_PATH, text.slice(0, block.from) + body + text.slice(block.end));
    say("");
    say(`  ✓ autorizzazione marcata ESAURITA, dentro il blocco di questo strumento, in ${AUTH_PATH}`);
  } catch (err) {
    fail(
      "authorisation_not_spent",
      `l'atto E' AVVENUTO ma ${AUTH_PATH} non e' stato marcato esaurito: ` +
        `${err?.message ?? "(nessun messaggio)"}. Marcarlo a mano, subito.`
    );
  }
}

if (problems.length > 0) {
  const category = problems[0].split(" ")[0].replace(":", "");
  fail(category, `${problems.join(" · ")}. L'istantanea e' in ${SNAPSHOT_FILE}.`);
}

say("");
say(`  chiuso il ${utc()} — uscita 0`);
say("═════════════════════════════════════════════════════════════════════════");
say("");
