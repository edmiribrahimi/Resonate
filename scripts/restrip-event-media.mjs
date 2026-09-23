/**
 * restrip-event-media.mjs — ripassa dallo stripper DEL PRODOTTO ogni foto di
 * `event_media` caricata prima dello stripper: stesso path, stessa riga.
 *
 * COSA ASSERISCE, in una frase: ogni foto con `created_at` anteriore alla soglia
 * passata con `--before` viene scaricata, data a `stripImageMetadata` di
 * `src/lib/media/strip-metadata.ts`, riscritta sullo STESSO `storage_path` e
 * riletta senza EXIF — oppure resta com'era e il suo rifiuto e' contato con una
 * categoria. La riga di `event_media` non si tocca mai.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * NON PUNTA MAI ALLA PRODUZIONE PER DEFAULT, E NON PER CONVENZIONE.
 *
 * Il bersaglio e' `LAB_PROJECT_REF`. Se il ref risolto e' quello di produzione
 * lo script RIFIUTA (uscita 2) prima di qualunque lettura, a meno che non gli
 * sia dato un atto datato che legge, riconta e marca esaurito da solo. Vedi
 * «L'ATTO» piu' sotto.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * PERCHE' ESISTE — D-52-31. Le righe caricate prima di
 * `20260809006000_event_media_server_upload_only.sql` non sono passate dallo
 * stripper e possono portare coordinate GPS nel file. `media-and-storage.md`,
 * gate *EXIF prima della pubblicazione*: una foto scattata dentro una secret
 * venue contiene l'indirizzo del venue, nei byte. `venue-secrecy.md`: la
 * rivelazione e' monotona. Il proprietario ha deciso di ripulirle TUTTE, in
 * questa fase.
 *
 * ── LE TRE SCELTE DI 52-PATTERNS P4, scritte qui perche' qui si scavalca ─────
 *
 *  1. LO STRIPPER E' QUELLO DEL PRODOTTO, NON UNA COPIA.
 *     `strip-metadata.ts` e' TypeScript e si apre con `import "server-only"`.
 *     Lo si importa COSI' COM'E': Node 25 esegue il `.ts` con il type stripping
 *     nativo, e `scripts/lib/server-only-shim.mjs` — la prima riga eseguita di
 *     questo file — risolve lo specificatore `server-only` al modulo vuoto che
 *     Next stesso usa. Scartate: (a) riscrivere qui la chiamata a `sharp` — e'
 *     «la seconda copia di un ordine», il modo in cui si smette di spogliare
 *     nella copia che nessuno legge (`src/lib/media/finalize.ts`, testa); (b) una
 *     rotta interna che chiami `finalizeStrippedUpload` — un endpoint nuovo in
 *     produzione per un'operazione una-tantum e' superficie d'attacco senza
 *     ragione. Se lo stripper non si carica, lo script SI FERMA con la categoria
 *     `stripper_unloadable`: non esiste un ripiego. Questo file usa `sharp` solo
 *     per LEGGERE i metadati (`metadata()`), mai per produrre un'immagine.
 *
 *  2. «STESSO PATH» SIGNIFICA `upsert: true`, E LO SI SA.
 *     `finalize.ts` scrive con `upsert: false` per principio: sovrascrivere non
 *     e' una cosa che fa. Qui la sovrascrittura e' L'ATTO — D-52-31 dice «stesso
 *     path, stessa riga» — e non un incidente. Il prezzo e' l'irreversibilita':
 *     i byte originali spariscono. Si paga con un'ISTANTANEA presa PRIMA, in
 *     `.env.restrip-snapshot.<stamp>/` (una directory `.env*`, coperta per intero
 *     da `.gitignore`), l'unica via di ritorno. La sua cancellazione e' un passo
 *     datato del piano 52-17, dopo la conferma del VERIFICATION: contiene foto di
 *     persone (`legal-compliance.md`, gate immagini delle persone) e non deve
 *     sopravvivere al suo scopo.
 *
 *  3. QUESTO E' UN SECONDO SCRITTORE SU `event-media`, E I GATE NON LO VEDONO.
 *     Il controllo A di `verify:media-strip` (`scripts/verify-media-strip.mjs`,
 *     testa) asserisce che nessun file SOTTO `src/` scriva nel bucket tranne la
 *     rotta di finalize. Questo file sta in `scripts/`: il controllo non lo
 *     legge, e un verde di `verify:media-strip` non dice nulla di lui. Lo si
 *     accetta perche' (a) scrive SOLO byte appena restituiti dallo stripper del
 *     prodotto — l'ordine «spoglia, poi scrivi» e' lo stesso della rotta; (b) e'
 *     lanciato a mano, e in produzione solo sotto un atto che si consuma. La
 *     dichiarazione vive anche nel VERIFICATION della fase (piano 52-17).
 *
 * ── LA CACHE, che questo strumento non raggiunge ────────────────────────────
 * `media-and-storage.md`, gate *cache e contenuto rimosso*. Riscrivere l'oggetto
 * non richiama le copie gia' servite: la CDN dello storage puo' continuare a
 * servire la versione CON GPS fino al suo `max-age`, e rendere privato il bucket
 * (M2) non cambia le copie gia' in cache ne' quelle gia' scaricate da qualcuno.
 * Il residuo si scrive nel VERIFICATION con i tempi, non si tace.
 *
 * ── I VIDEO ─────────────────────────────────────────────────────────────────
 * Lo stripper non tratta i video (`strip-metadata.ts`, «WHAT THIS FILE DOES NOT
 * COVER»). Qui si CONTANO in `videos_skipped`, non si toccano, e il numero sta
 * nel referto: un video pre-soglia di una serata segreta puo' portare
 * coordinate nell'atom `udta`, e nessuno strumento di questo repository lo
 * spoglia. Saltarli in silenzio sarebbe dire che il lavoro e' finito.
 *
 * ── LA SOGLIA SI PASSA, NON SI DEDUCE ───────────────────────────────────────
 * `--before <istante ISO>` e' obbligatorio. Sul laboratorio la soglia e' la
 * versione con cui `20260809006000` e' registrata nella history; in PRODUZIONE
 * quella migration NON e' nella history (censimento 52-01, `52-ESITI.md`) pur
 * essendo il suo effetto nel catalogo, quindi la soglia non si puo' leggere di
 * li'. Lo script legge comunque la history: se la migration c'e' e la sua
 * versione non coincide con `--before`, si ferma (`threshold_disagrees`); se non
 * c'e', lo dice e usa la soglia dell'atto. In produzione `--before` deve
 * coincidere con il campo `before` dell'atto, o e' un rifiuto.
 *
 * ── L'ATTO ──────────────────────────────────────────────────────────────────
 * In produzione solo con `--authorised <percorso> --dated <YYYY-MM-DD>`. Il
 * documento (piano 52-16: `52-AUTHORISATION-MEDIA.md`) deve contenere, e i campi
 * si leggono e si marcano SOLO fra i due marcatori:
 *
 *     <!-- restrip-event-media: grant -->
 *     act: event_media.restrip
 *     target: production
 *     granted: yes
 *     granted_on: 2026-09-23
 *     spent: no
 *     before: 2026-08-09T00:00:00Z
 *     photos: 0
 *     videos: 0
 *     <!-- /restrip-event-media: grant -->
 *
 * `photos` e `videos` sono i numeri che chi concede ha letto: se il giorno
 * dell'atto sono diversi, lo script si ferma (`count_drift`) senza scrivere.
 *
 * ── LE REGOLE DELLA SELEZIONE (ai-engineering.md; scripts/purge-attendances.mjs)
 *   - la lista delle righe si CATTURA prima di agire, dalla stessa
 *     interrogazione che la conta, e si agisce una chiave alla volta;
 *   - la conferma viene da una FONTE DIVERSA: ogni oggetto scritto si rilegge,
 *     e un campione si rilegge ancora via URL firmato (non via la chiamata di
 *     download che ha servito la scrittura);
 *   - le righe si rileggono dopo e si confrontano per intero con quelle di prima;
 *   - gli oggetti del bucket NON catturati si confrontano prima/dopo in
 *     `storage.objects`: se uno di loro e' stato riscritto, e' `collateral_write`.
 *
 * ── IDEMPOTENZA ─────────────────────────────────────────────────────────────
 * Idempotente nell'EFFETTO (una foto gia' spogliata ne esce senza metadati) ma
 * non nel conteggio: la selezione e' per data, quindi un secondo passaggio
 * ritrova le stesse foto e le RI-CODIFICA — e la ri-codifica non e' lossless
 * (`strip-metadata.ts`, «The price is declared»). In produzione si esegue UNA
 * volta, sotto un atto che si consuma.
 *
 * ── COSA NON STAMPA ─────────────────────────────────────────────────────────
 * Mai un path, un URL, un id di riga o il ref del laboratorio sullo standard
 * output (`finalize.ts`, «THE LOG FORM»): un path contiene l'id di una serata e
 * quello di chi ha caricato. Le chiavi catturate si stampano come ordinale piu'
 * un'impronta di 8 caratteri (sha256 dell'id); l'id intero sta solo nell'indice
 * dell'istantanea, che e' ignorato da git. Gli errori escono nella forma
 * `[restrip-event-media.<categoria>] code=… message=…`.
 *
 * USO (le variabili da `.env.local`, poi `.env.lab.local` che la sovrascrive)
 *   node --env-file=.env.local --env-file=.env.lab.local \
 *        scripts/restrip-event-media.mjs --dry-run --before <ISO>
 *   node --env-file=.env.local --env-file=.env.lab.local \
 *        scripts/restrip-event-media.mjs --apply --before <ISO>
 *   node --env-file=.env.local scripts/restrip-event-media.mjs --apply \
 *        --project cjsfocnhfzycbbgkwocx --before <ISO> \
 *        --authorised <percorso> --dated <YYYY-MM-DD>
 *
 * USCITE
 *   0  referto completo (compreso «zero foto, niente da fare»)
 *   1  qualcosa e' andato storto, con la sua categoria
 *   2  RIFIUTO: bersaglio, argomenti o atto non ammissibili. Nessuna lettura.
 *
 * Variabili: SUPABASE_ACCESS_TOKEN, LAB_PROJECT_REF; sul laboratorio
 * LAB_SUPABASE_URL + LAB_SUPABASE_SERVICE_ROLE_KEY; in produzione
 * NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.
 *
 * SEGRETEZZA. Repository PUBBLICO. Il ref di produzione e' scritto in chiaro:
 * viaggia gia' nel bundle del browser, e' un indirizzo e non un segreto. Il ref
 * del laboratorio e le chiavi non sono scritti qui.
 */

/* ── la prima riga eseguita: il hook, prima che qualunque modulo del prodotto
 *    possa essere risolto (P4, scelta 1). Non legge ne' scrive nulla fuori dal
 *    processo. ── */
await import("./lib/server-only-shim.mjs");

// Nessun `import` statico in questo file: un import statico si valuta PRIMA di
// qualunque istruzione del modulo, e la riga qui sopra smetterebbe di essere la
// prima eseguita. Anche i builtin di Node arrivano dopo, dinamici.
const { writeFileSync, readFileSync, existsSync, mkdirSync } = await import("node:fs");
const { createHash } = await import("node:crypto");

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
const BEFORE_RAW = valueOf("--before");

/* ───────────────────────── il rifiuto, prima di tutto ───────────────────── */

const PRODUCTION_REF = "cjsfocnhfzycbbgkwocx";
const REF = valueOf("--project") ?? process.env.LAB_PROJECT_REF ?? null;
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN ?? null;
const BUCKET = "event-media";

function refuse(message) {
  console.error(`RIFIUTO: ${message}`);
  process.exit(2);
}

if (!DRY_RUN && !APPLY) {
  refuse("serve --dry-run oppure --apply. Non c'e' un modo di default.");
}
if (DRY_RUN && APPLY) {
  refuse("--dry-run e --apply insieme non significano niente. Sceglierne uno.");
}
if (!REF || !TOKEN) {
  refuse(
    "LAB_PROJECT_REF (o --project) e SUPABASE_ACCESS_TOKEN sono necessari.\n" +
      "        Carica .env.local e .env.lab.local (--env-file, in quest'ordine)."
  );
}

const IS_PRODUCTION = REF === PRODUCTION_REF;

/** Il blocco di concessione, SOLO fra i due marcatori. */
const GRANT_OPEN = "<!-- restrip-event-media: grant -->";
const GRANT_CLOSE = "<!-- /restrip-event-media: grant -->";

function grantBlock(text, path) {
  const a = text.indexOf(GRANT_OPEN);
  const b = text.indexOf(GRANT_CLOSE);
  if (a < 0 || b < 0 || b < a) {
    refuse(
      `${path} non porta il blocco di concessione di questo strumento\n` +
        `        (${GRANT_OPEN} … ${GRANT_CLOSE}). La forma e' nel docblock.`
    );
  }
  if (text.indexOf(GRANT_OPEN, a + 1) >= 0) {
    refuse(`${path} porta PIU' di un blocco di concessione: quale vale non si indovina.`);
  }
  return { start: a + GRANT_OPEN.length, end: b, body: text.slice(a + GRANT_OPEN.length, b) };
}

function readAuthorisation(path, dated) {
  if (!path || !dated) {
    refuse(
      `${REF} e' il ref di PRODUZIONE.\n` +
        "        Qui si SOVRASCRIVONO foto di persone, in modo irreversibile.\n" +
        "        Serve --authorised <percorso> --dated <YYYY-MM-DD> (piano 52-16)."
    );
  }
  if (!existsSync(path)) refuse(`il documento di autorizzazione non esiste: ${path}`);
  const text = readFileSync(path, "utf8");
  const block = grantBlock(text, path);
  const field = (name) => {
    const m = new RegExp(`^[ \\t]*${name}:[ \\t]*(.+)$`, "m").exec(block.body);
    return m ? m[1].trim() : null;
  };
  if (field("act") !== "event_media.restrip") refuse(`atto diverso: act = ${field("act") ?? "(assente)"}`);
  if (field("target") !== "production") refuse(`bersaglio diverso: target = ${field("target") ?? "(assente)"}`);
  if (field("granted") !== "yes") refuse(`non concesso: granted = ${field("granted") ?? "(assente)"}`);
  if (field("spent") !== "no") {
    refuse(
      `gia' ESAURITO: spent = ${field("spent") ?? "(assente)"}. Un atto si consuma una volta:\n` +
        "        se serve di nuovo si chiede di nuovo, con i numeri del giorno."
    );
  }
  if (field("granted_on") !== dated) {
    refuse(`datato ${field("granted_on") ?? "(assente)"} e --dated dice ${dated}: non si riusa per distrazione.`);
  }
  const before = field("before");
  const photos = field("photos");
  const videos = field("videos");
  if (!before || Number.isNaN(Date.parse(before))) refuse(`before assente o non leggibile: ${before ?? "(assente)"}`);
  if (!/^\d+$/.test(photos ?? "") || !/^\d+$/.test(videos ?? "")) {
    refuse(`photos/videos assenti o non numerici: ${photos ?? "(assente)"} / ${videos ?? "(assente)"}`);
  }
  return { text, block, before, photos: Number(photos), videos: Number(videos) };
}

let grant = null;
if (IS_PRODUCTION) grant = readAuthorisation(AUTH_PATH, AUTH_DATE);

if (!BEFORE_RAW || Number.isNaN(Date.parse(BEFORE_RAW))) {
  refuse(
    "--before <istante ISO> e' obbligatorio: la soglia dello stripper letta dal\n" +
      "        catalogo di QUEL progetto. Non si deduce (in produzione la history non la porta)."
  );
}
const BEFORE = new Date(BEFORE_RAW);
if (grant && new Date(grant.before).getTime() !== BEFORE.getTime()) {
  refuse(`--before (${BEFORE.toISOString()}) non coincide con before dell'atto (${grant.before}).`);
}

/* ─────────────────── il client di storage, verificato sul bersaglio ──────── */

const STORAGE_URL = IS_PRODUCTION
  ? process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""
  : process.env.LAB_SUPABASE_URL ?? "";
const SERVICE_KEY = IS_PRODUCTION
  ? process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""
  : process.env.LAB_SUPABASE_SERVICE_ROLE_KEY ?? "";

/* ──────────────────────────────── utilita' ──────────────────────────────── */

const STAMP = new Date().toISOString().replace(/[:.]/g, "-");
const SNAPSHOT_DIR = `.env.restrip-snapshot.${STAMP}`;
const utc = () => new Date().toISOString();
const say = (s) => console.log(s);
const fingerprint = (id) => createHash("sha256").update(String(id)).digest("hex").slice(0, 8);
const describe = (e) => (e instanceof Error ? `${e.name}: ${e.message}` : String(e));

function fail(category, detail) {
  console.error(`[restrip-event-media.${category}] ${detail}`);
  process.exit(1);
}
function note(category, detail) {
  console.error(`[restrip-event-media.${category}] ${detail}`);
}

if (!STORAGE_URL || !SERVICE_KEY) {
  fail("storage_env", "code=missing message=URL o chiave di servizio del bersaglio assenti");
}
if (!STORAGE_URL.includes(`${REF}.supabase.co`)) {
  fail(
    "storage_target",
    "code=mismatch message=l'URL di storage non appartiene al bersaglio: si leggerebbe " +
      "e si scriverebbe su un altro progetto"
  );
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
    fail("network", `code=fetch message=${err?.message ?? "(nessun messaggio)"}`);
  }
  if (!res.ok) fail("sql", `code=${res.status} message=${(await res.text()).slice(0, 300)}`);
  try {
    return await res.json();
  } catch (err) {
    fail("sql_payload", `code=json message=${err?.message ?? "(nessun messaggio)"}`);
  }
}

const q = (s) => `'${String(s).replace(/'/g, "''")}'`;

/** Lo status di un errore di storage, ovunque supabase-js lo metta. */
function storageStatus(error) {
  if (typeof error !== "object" || error === null) return null;
  for (const v of [error.status, error.statusCode, error.originalError?.status]) {
    const n = Number(v);
    if (Number.isInteger(n) && n > 0) return n;
  }
  return null;
}

/** Estensione → mime; il contenitore reale si verifica dopo. */
const MIME_BY_EXT = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };
const FORMAT_BY_MIME = { "image/jpeg": "jpeg", "image/png": "png", "image/webp": "webp" };

/* ─────────────── lo stripper del prodotto, e sharp solo per leggere ───────── */

let stripImageMetadata, isMediaStripRefusal, sharp;
try {
  ({ stripImageMetadata, isMediaStripRefusal } = await import("../src/lib/media/strip-metadata.ts"));
  if (typeof stripImageMetadata !== "function") throw new TypeError("stripImageMetadata non e' una funzione");
} catch (err) {
  fail(
    "stripper_unloadable",
    `code=import message=lo stripper del prodotto non si carica (${describe(err)}). ` +
      "Nessun ripiego su una copia: ci si ferma qui."
  );
}
try {
  sharp = (await import("sharp")).default;
} catch (err) {
  fail("sharp_unloadable", `code=import message=${describe(err)}`);
}

async function inspect(buf) {
  const m = await sharp(buf).metadata();
  return { format: m.format ?? null, exif: m.exif ? m.exif.length : 0, xmp: m.xmp ? m.xmp.length : 0 };
}

const { createClient } = await import("@supabase/supabase-js");
const storage = createClient(STORAGE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
}).storage.from(BUCKET);

async function download(path) {
  const { data, error } = await storage.download(path);
  if (error || !data) {
    const status = storageStatus(error);
    return { ok: false, category: status === 404 || status === 400 ? "object_missing" : "download_failed", status };
  }
  return { ok: true, bytes: Buffer.from(await data.arrayBuffer()) };
}

/* ──────────────────────────────── il referto ─────────────────────────────── */

say("");
say("═══ restrip-event-media ═════════════════════════════════════════════════");
say(`  bersaglio      : ${IS_PRODUCTION ? "PRODUZIONE" : "laboratorio"}`);
say(`  modo           : ${DRY_RUN ? "--dry-run (nessuna scrittura)" : "--apply"}`);
say(`  soglia --before: ${BEFORE.toISOString()}`);
say(`  ora di partenza: ${utc()}`);
say("─────────────────────────────────────────────────────────────────────────");

/* (0) La soglia contro la history, dove c'e'. */
const hist = await sql(
  "select version from supabase_migrations.schema_migrations " +
    "where name like '20260809006000%' or version = '20260809006000';"
);
if (hist.length === 0) {
  say("  (0) history: 20260809006000 NON registrata su questo progetto — si usa la soglia passata");
} else {
  const v = String(hist[0].version);
  const inst = new Date(
    `${v.slice(0, 4)}-${v.slice(4, 6)}-${v.slice(6, 8)}T${v.slice(8, 10)}:${v.slice(10, 12)}:${v.slice(12, 14)}Z`
  );
  say(`  (0) history: 20260809006000 registrata come ${v} → ${inst.toISOString()}`);
  if (inst.getTime() !== BEFORE.getTime()) {
    fail(
      "threshold_disagrees",
      `code=history message=la history dice ${inst.toISOString()} e --before dice ${BEFORE.toISOString()}. ` +
        "Una soglia sbagliata seleziona le foto sbagliate: ci si ferma."
    );
  }
}

/* (a) La cattura: la lista E' il conteggio. */
const captured = await sql(`
  select m.id::text as id, m.storage_path, m.type, m.status, to_jsonb(m) as row
  from   public.event_media m
  where  m.created_at < ${q(BEFORE.toISOString())}::timestamptz
  order  by m.created_at, m.id;
`);
const withPath = captured.filter((r) => r.storage_path);
const noPath = captured.filter((r) => !r.storage_path);
const photos = withPath.filter((r) => r.type === "photo");
const videos = withPath.filter((r) => r.type === "video");
const otherTypes = withPath.filter((r) => r.type !== "photo" && r.type !== "video");

say("");
say("  (a) CATTURA — Management API, read_only, righe con created_at < soglia");
say(`      foto            : ${photos.length}`);
say(`      video (videos_skipped: non trattati, lo stripper non li copre) : ${videos.length}`);
say(`      altro tipo      : ${otherTypes.length}`);
say(`      senza storage_path (non raggiungibili da qui, contate) : ${noPath.length}`);
say(`      letto il ${utc()}`);
photos.forEach((r, i) => say(`      · #${i + 1} foto  ${fingerprint(r.id)}  stato ${r.status}`));
videos.forEach((r, i) => say(`      · #${i + 1} video ${fingerprint(r.id)}  stato ${r.status}  (non toccato)`));

if (noPath.length > 0 || otherTypes.length > 0) {
  note(
    "unreachable_rows",
    `code=count message=${noPath.length} righe pre-soglia senza storage_path e ${otherTypes.length} di tipo ` +
      "sconosciuto: NON ripassate. Il loro oggetto, se esiste, va cercato a mano (M1 doveva popolarle tutte)."
  );
}

if (grant && (grant.photos !== photos.length || grant.videos !== videos.length)) {
  fail(
    "count_drift",
    `code=grant message=l'atto dice ${grant.photos} foto e ${grant.videos} video, oggi sono ` +
      `${photos.length} e ${videos.length}. Chi concede rilegge i numeri del giorno; nulla e' stato scritto.`
  );
}

if (photos.length === 0) {
  say("");
  say("  ⚑ ZERO FOTO pre-soglia: non c'e' niente da ripassare. L'atto, se concesso,");
  say("    NON e' stato consumato.");
  say(`  video non trattati: ${videos.length}`);
  say(`  chiuso il ${utc()} — uscita 0`);
  say("═════════════════════════════════════════════════════════════════════════");
  process.exit(0);
}

/* (b) L'istantanea dei byte ORIGINALI, prima di qualunque scrittura. */
try {
  mkdirSync(SNAPSHOT_DIR, { recursive: false });
} catch (err) {
  fail("snapshot_dir", `code=mkdir message=${err?.message ?? "(nessun messaggio)"}`);
}
const index = {
  strumento: "restrip-event-media.mjs",
  bersaglio: IS_PRODUCTION ? "production" : "lab",
  soglia: BEFORE.toISOString(),
  scattata_il: utc(),
  modo: DRY_RUN ? "dry-run" : "apply",
  nota: "Byte originali, prima della sovrascrittura. Contiene foto di persone: cancellazione datata nel piano 52-17.",
  foto: [],
  videos_skipped: videos.map((r) => ({ id: r.id, storage_path: r.storage_path })),
};
const originals = new Map();
let snapMissing = 0;
for (const [i, r] of photos.entries()) {
  const got = await download(r.storage_path);
  const entry = { n: i + 1, id: r.id, storage_path: r.storage_path, row: r.row };
  if (!got.ok) {
    entry.snapshot = got.category;
    snapMissing += 1;
    note(got.category, `code=${got.status ?? "unknown"} message=foto #${i + 1} non leggibile per l'istantanea`);
  } else {
    const file = `${String(i + 1).padStart(4, "0")}.bin`;
    writeFileSync(`${SNAPSHOT_DIR}/${file}`, got.bytes);
    const meta = await inspect(got.bytes).catch(() => ({ format: null, exif: 0, xmp: 0 }));
    Object.assign(entry, {
      file,
      bytes: got.bytes.length,
      sha256: createHash("sha256").update(got.bytes).digest("hex"),
      ...meta,
    });
    originals.set(r.id, { bytes: got.bytes, meta });
  }
  index.foto.push(entry);
}
writeFileSync(`${SNAPSHOT_DIR}/index.json`, JSON.stringify(index, null, 2));

say("");
say("  (b) ISTANTANEA DEI BYTE ORIGINALI — scritta PRIMA di qualunque scrittura");
say(`      directory: ${SNAPSHOT_DIR}/  (.env*: ignorata da git; contiene foto di persone)`);
say(`      foto salvate: ${originals.size} / ${photos.length}  (non leggibili: ${snapMissing})`);
for (const e of index.foto) {
  say(`      · #${e.n} ${e.format ?? "?"}  exif ${e.exif ?? "-"} byte  xmp ${e.xmp ?? "-"} byte`);
}

if (DRY_RUN) {
  say("");
  say("  --dry-run: fermato qui. Nessun oggetto e nessuna riga toccati.");
  say(`  chiuso il ${utc()} — uscita 0`);
  say("═════════════════════════════════════════════════════════════════════════");
  process.exit(0);
}

/* Lo stato del bucket PRIMA, per accorgersi di una scrittura collaterale. */
const objectsBefore = await sql(
  `select name, updated_at::text from storage.objects where bucket_id = ${q(BUCKET)};`
);
const capturedPaths = new Set(photos.map((r) => r.storage_path));

/* (d) L'atto, una chiave alla volta, nell'ordine di finalize.ts. */
say("");
say("  (d) L'ATTO — scarica, spoglia (stripper del prodotto), riscrivi sullo stesso path, rileggi");
const tally = { rewritten: 0, object_missing: 0, download_failed: 0, unknown_extension: 0, mime_mismatch: 0, strip_refused: 0, write_failed: 0, still_has_exif: 0, readback_failed: 0 };
const rewritten = [];
for (const [i, r] of photos.entries()) {
  const tag = `#${i + 1}`;
  const src = await download(r.storage_path);
  if (!src.ok) {
    tally[src.category] += 1;
    note(src.category, `code=${src.status ?? "unknown"} message=foto ${tag} non scaricata — il banco puo' essere cambiato sotto lo strumento`);
    continue;
  }
  const ext = (r.storage_path.split(".").pop() ?? "").toLowerCase();
  const mime = MIME_BY_EXT[ext];
  if (!mime) {
    tally.unknown_extension += 1;
    note("unknown_extension", `code=ext message=foto ${tag}: estensione non trattata, lasciata com'era`);
    continue;
  }
  const real = await inspect(src.bytes).catch(() => ({ format: null }));
  if (real.format !== FORMAT_BY_MIME[mime]) {
    tally.mime_mismatch += 1;
    note("mime_mismatch", `code=${real.format ?? "none"} message=foto ${tag}: estensione ${ext} ma contenitore ${real.format ?? "nessuno"}, lasciata com'era`);
    continue;
  }
  let stripped;
  try {
    stripped = await stripImageMetadata(src.bytes, mime);
  } catch (err) {
    tally.strip_refused += 1;
    note("strip_refused", `code=${isMediaStripRefusal(err) ? err.reason : "uncategorised"} message=foto ${tag} lasciata com'era`);
    continue;
  }
  // Stesso path, sovrascrittura voluta (P4, scelta 2). contentType esplicito:
  // senza, un Buffer diventa text/plain (finalize.ts, passo 3).
  const { error: writeError } = await storage.upload(r.storage_path, stripped, { contentType: mime, upsert: true });
  if (writeError) {
    tally.write_failed += 1;
    note("write_failed", `code=${storageStatus(writeError) ?? "unknown"} message=foto ${tag}: scrittura rifiutata, l'originale e' nell'istantanea`);
    continue;
  }
  const back = await download(r.storage_path);
  if (!back.ok) {
    tally.readback_failed += 1;
    note("readback_failed", `code=${back.status ?? "unknown"} message=foto ${tag}: scritta ma non riletta`);
    continue;
  }
  const after = await inspect(back.bytes);
  if (after.exif > 0 || after.xmp > 0) {
    tally.still_has_exif += 1;
    note("still_has_exif", `code=exif message=foto ${tag}: riletta con exif ${after.exif} / xmp ${after.xmp} byte`);
    continue;
  }
  tally.rewritten += 1;
  rewritten.push(r);
  const orig = originals.get(r.id)?.meta;
  say(`      · ${tag} exif ${orig?.exif ?? "?"} → ${after.exif} byte, ${back.bytes.length} byte scritti, stesso path`);
}
say(`      atto chiuso il ${utc()}`);

/* (f) Il referto per categoria. */
say("");
say("  (f) REFERTO");
say(`      foto riscritte e rilette senza EXIF : ${tally.rewritten} / ${photos.length}`);
for (const [k, v] of Object.entries(tally)) if (k !== "rewritten") say(`      ${k.padEnd(20)}: ${v}`);
say(`      videos_skipped      : ${videos.length}  (NON trattati: nessuno strumento qui spoglia un video)`);

/* (g) Conferma da fonte diversa: URL firmato, non la chiamata di download. */
const sample = rewritten.length <= 20 ? rewritten : [...rewritten].sort(() => Math.random() - 0.5).slice(0, 20);
let signedOk = 0;
for (const r of sample) {
  const { data, error } = await storage.createSignedUrl(r.storage_path, 60);
  if (error || !data?.signedUrl) {
    note("signed_url", `code=${storageStatus(error) ?? "unknown"} message=URL firmato non generato`);
    continue;
  }
  let res;
  try {
    res = await fetch(data.signedUrl, { cache: "no-store" });
  } catch (err) {
    note("signed_fetch", `code=fetch message=${err?.message ?? "(nessun messaggio)"}`);
    continue;
  }
  if (!res.ok) {
    note("signed_fetch", `code=${res.status} message=l'URL firmato non ha servito l'oggetto`);
    continue;
  }
  const m = await inspect(Buffer.from(await res.arrayBuffer()));
  if (m.exif === 0 && m.xmp === 0) signedOk += 1;
  else note("signed_still_has_exif", `code=exif message=l'URL firmato serve ancora metadati (exif ${m.exif}) — cache?`);
}
say("");
say("  (g) CONFERMA DA FONTE DIVERSA — URL firmato generato col service role");
say(`      campione: ${sample.length}  senza EXIF: ${signedOk}`);

/* Le righe: rilette e confrontate per intero. */
const rowsAfter = await sql(
  `select id::text as id, to_jsonb(m) as row from public.event_media m where id = ANY(ARRAY[${photos
    .map((r) => `${q(r.id)}::uuid`)
    .join(", ")}]);`
);
const afterById = new Map(rowsAfter.map((r) => [r.id, JSON.stringify(r.row)]));
const rowsChanged = photos.filter((r) => afterById.get(r.id) !== JSON.stringify(r.row)).length;
say(`      righe catturate rilette: ${rowsAfter.length} / ${photos.length}, cambiate: ${rowsChanged}`);

/* Scritture collaterali: oggetti NON catturati il cui updated_at e' cambiato. */
const objectsAfter = new Map(
  (await sql(`select name, updated_at::text from storage.objects where bucket_id = ${q(BUCKET)};`)).map((o) => [o.name, o.updated_at])
);
let collateral = 0;
let vanished = 0;
for (const o of objectsBefore) {
  if (capturedPaths.has(o.name)) continue;
  if (!objectsAfter.has(o.name)) vanished += 1;
  else if (objectsAfter.get(o.name) !== o.updated_at) collateral += 1;
}
say(`      oggetti NON catturati: ${objectsBefore.length - capturedPaths.size}, riscritti: ${collateral}, spariti nel frattempo: ${vanished}`);
if (vanished > 0) {
  note("bench_changed", `code=vanished message=${vanished} oggetti non catturati sono spariti durante l'atto (un altro strumento sul banco?) — non toccati da qui`);
}

const problems =
  photos.length - tally.rewritten + (sample.length - signedOk) + rowsChanged + collateral + (rowsAfter.length !== photos.length ? 1 : 0);

/* (h) L'atto si consuma qui, dentro il suo blocco e solo li'. */
if (IS_PRODUCTION && grant) {
  const current = readFileSync(AUTH_PATH, "utf8");
  const blk = grantBlock(current, AUTH_PATH);
  const body = blk.body.replace(/^([ \t]*)spent:[ \t]*no[ \t]*$/m, `$1spent: yes\n$1spent_at: ${utc()}`);
  if (body === blk.body) fail("authorisation_not_spent", "code=field message=spent: no non trovato nel blocco. Marcarlo a mano, subito.");
  try {
    writeFileSync(AUTH_PATH, current.slice(0, blk.start) + body + current.slice(blk.end));
    say(`  ✓ atto marcato ESAURITO in ${AUTH_PATH}`);
  } catch (err) {
    fail("authorisation_not_spent", `code=write message=l'atto E' AVVENUTO ma il blocco non e' marcato: ${err?.message}. Marcarlo a mano.`);
  }
}

say("");
say("  RESIDUO DICHIARATO: la CDN puo' servire la versione precedente fino al suo max-age;");
say("  le copie gia' scaricate non rientrano. Va scritto nel VERIFICATION con i tempi.");
say(`  istantanea: ${SNAPSHOT_DIR}/ — da cancellare nel passo datato del piano 52-17`);
say(`  chiuso il ${utc()} — uscita ${problems === 0 ? 0 : 1}`);
say("═════════════════════════════════════════════════════════════════════════");
if (problems !== 0) {
  fail("incomplete", `code=${problems} message=l'atto non e' completo: vedere le categorie sopra. Gli originali sono in ${SNAPSHOT_DIR}/`);
}
