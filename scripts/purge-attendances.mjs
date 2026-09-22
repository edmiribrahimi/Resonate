/**
 * purge-attendances.mjs — svuota `public.attendances` PER CHIAVE PRIMARIA, con
 * il conteggio prima, l'istantanea prima, e il contatore dopo preso da
 * un'altra fonte.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * NON PUNTA MAI ALLA PRODUZIONE PER DEFAULT, E NON PER CONVENZIONE.
 *
 * Il bersaglio e' `LAB_PROJECT_REF`. Se il ref risolto coincide con quello di
 * produzione lo script **rifiuta**, e il rifiuto e' la prima cosa eseguita dopo
 * la lettura degli argomenti: un controllo che gira dopo il primo `delete` non
 * e' un controllo, e' un rimpianto.
 *
 * In produzione ci si arriva **solo** con un'autorizzazione datata che questo
 * file legge e **consuma**. Vedi «L'AUTORIZZAZIONE» piu' sotto.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * PERCHE' ESISTE. D-51-04 (decisione del proprietario) cancella le presenze
 * registrate da scansioni socio; D-51-14 toglie poi l'intera tabella. Svuotare
 * non e' togliere: il `DROP` lo fa la migration
 * `20260922180000_drop_membership_code_and_rename_acts.sql`, che porta una
 * guardia `DO` e **rifiuta** se la tabella non e' vuota. Quella guardia rende
 * meccanico l'ordine: prima questo strumento, poi la migration. Un `DROP` su una
 * tabella piena cancellerebbe righe che nessuno ha contato.
 *
 * LE QUATTRO REGOLE DELLA RIMOZIONE, che qui sono codice e non un promemoria.
 * Vengono dall'incidente registrato in `.claude/rules/ai-engineering.md`: uno
 * script di verifica ha cancellato 63 righe di produzione su sette tabelle
 * risalendo il DOM da un titolo, e questo repository non ha PITR.
 *
 *   1. Si CONTA prima, e si conta **per provenienza**: `party_id` valorizzato
 *      (cio' che D-51-04 autorizza) e `party_id` nullo (il residuo pre-porta,
 *      che D-51-04 **non nomina**). I due numeri restano separati per tutto il
 *      referto: sommarli significherebbe far autorizzare la seconda popolazione
 *      dalla decisione presa sulla prima.
 *   2. La cascata si ENUMERA dal catalogo (`pg_constraint`, `confrelid`), non da
 *      un documento. Una cascata e' un percorso di scrittura che nessuno ha
 *      dichiarato.
 *   3. L'ISTANTANEA si scrive PRIMA di qualunque scrittura, in un file datato,
 *      e copre la tabella intera piu' il conteggio del vicinato.
 *   4. La rimozione avviene PER CHIAVE PRIMARIA, su una lista **catturata dalla
 *      stessa interrogazione che l'ha contata**. Mai per interfaccia, mai con un
 *      predicato ricomposto al momento dell'atto. Il verso dell'errore e' il
 *      punto: una chiave sbagliata non trova nulla, un predicato sbagliato
 *      cancella di piu'.
 *   5. La CONFERMA si chiede a una FONTE DIVERSA da quella con cui si e'
 *      cancellato: qui si cancella dal Management API e si riconta da PostgREST
 *      con la chiave di servizio. Una misura presa con lo strumento che ha
 *      causato l'effetto e' un'eco.
 *
 * UNA DECISIONE SENZA SOGGETTI NON SI ESEGUE. Se la tabella e' vuota lo script
 * lo dice e **esce con successo**. E' la forma che la fase 50 ha gia' usato
 * (`50-AUTHORISATION.md` §1.0): il numero si mette davanti alla domanda, non a
 * meta' di un runbook.
 *
 * L'AUTORIZZAZIONE, e perche' e' lo strumento a farla rispettare.
 * Un'autorizzazione e' un atto che si consuma **una volta**. Ricordarselo non
 * basta, quindi questo file la legge, la verifica e la **marca esaurita** da
 * solo. Il documento deve contenere un blocco in questa forma esatta — e' il
 * contratto che il piano 51-13 deve onorare quando lo scrive:
 *
 *     <!-- purge-attendances: grant -->
 *     act: attendances.purge
 *     target: production
 *     granted: yes
 *     granted_on: 2026-09-23
 *     spent: no
 *
 * Lo script rifiuta se il blocco manca, se `granted` non e' `yes`, se `spent`
 * non e' `no`, o se `granted_on` non coincide con la data passata a `--dated`.
 * Il confronto con `--dated` serve a una cosa sola: **un'autorizzazione vecchia
 * non si riusa per distrazione**. Chi la invoca deve scrivere la data che sta
 * leggendo.
 *
 * USO
 *   node scripts/purge-attendances.mjs --dry-run
 *       conta per provenienza, enumera la cascata, scrive l'istantanea, cattura
 *       gli id e si ferma. Nessuna scrittura.
 *   node scripts/purge-attendances.mjs --apply
 *       come sopra, poi cancella per chiave e riconta da PostgREST.
 *   node scripts/purge-attendances.mjs --apply --project <ref> \
 *        --authorised <percorso> --dated <YYYY-MM-DD>
 *       l'unica strada verso la produzione.
 *
 * USCITE
 *   0  il referto e' completo (compreso il caso «zero righe, niente da fare»)
 *   1  qualcosa e' andato storto con la sua categoria, e nulla e' stato scritto
 *      oltre l'istantanea
 *   2  RIFIUTO: bersaglio o autorizzazione non ammissibili. Nessuna lettura.
 *
 * Variabili attese (da `.env.local` + `.env.lab.local`, entrambi ignorati da
 * git — la forma di `scripts/dev-lab.sh`):
 *   SUPABASE_ACCESS_TOKEN, LAB_PROJECT_REF,
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 * SEGRETEZZA. Questo file e' su un repository PUBBLICO. Il ref di produzione e'
 * scritto qui in chiaro e va bene: viaggia gia' nel bundle del browser dentro
 * `NEXT_PUBLIC_SUPABASE_URL`, non e' un segreto, e' un indirizzo. Il ref del
 * LABORATORIO non e' scritto qui, e nessuna chiave lo e'. L'istantanea contiene
 * RIGHE, quindi si scrive in un percorso `.env*`, che `.gitignore` copre per
 * intero — mai sotto `.planning/`, che e' versionato.
 */

import { writeFileSync, readFileSync, existsSync } from "node:fs";

/* ─────────────────── gli argomenti, letti prima di agire ─────────────────── */
/* Leggere `process.argv` non tocca alcun database: e' quello che rende
 * possibile far dipendere il rifiuto dagli argomenti senza che il rifiuto
 * smetta di essere la prima cosa che accade davvero. */

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

/* ───────────────────────── il rifiuto, prima di tutto ───────────────────── */

const PRODUCTION_REF = "cjsfocnhfzycbbgkwocx";
const REF = valueOf("--project") ?? process.env.LAB_PROJECT_REF ?? null;
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN ?? null;

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

/**
 * Il documento, letto e verificato. Restituisce il testo se l'autorizzazione
 * regge; rifiuta altrimenti. Non scrive nulla: la marcatura avviene DOPO l'atto.
 */
function readAuthorisation(path, dated) {
  if (!path || !dated) {
    refuse(
      `${REF} e' il ref di PRODUZIONE.\n` +
        "        Qui si cancellano righe che dicono che qualcuno e' entrato a una\n" +
        "        serata, e questo repository non ha PITR. Serve\n" +
        "        --authorised <percorso> --dated <YYYY-MM-DD>."
    );
  }
  if (!existsSync(path)) {
    refuse(`il documento di autorizzazione non esiste: ${path}`);
  }
  const text = readFileSync(path, "utf8");
  if (!text.includes("<!-- purge-attendances: grant -->")) {
    refuse(
      `${path} non porta il blocco di concessione di questo strumento.\n` +
        "        La forma e' nel docblock in testa a questo file."
    );
  }
  const field = (name) => {
    const m = new RegExp(`^${name}:[ \\t]*(.+)$`, "m").exec(text);
    return m ? m[1].trim() : null;
  };
  if (field("act") !== "attendances.purge") {
    refuse(`${path} autorizza un altro atto: ${field("act") ?? "(assente)"}`);
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
        "        Non e' pedanteria: e' cio' che impedisce di riusare per\n" +
        "        distrazione un'autorizzazione scritta per un altro giorno."
    );
  }
  return text;
}

let authorisationText = null;
if (REF === PRODUCTION_REF) {
  authorisationText = readAuthorisation(AUTH_PATH, AUTH_DATE);
}

const IS_PRODUCTION = REF === PRODUCTION_REF;

/* ──────────────────────────────── utilita' ──────────────────────────────── */

const STAMP = new Date().toISOString().replace(/[:.]/g, "-");
const SNAPSHOT_FILE = `.env.attendances-snapshot.${STAMP}.json`;

/** Categoria d'errore esplicita: nessun `catch` che collassa cause diverse. */
function fail(category, detail) {
  console.error(`[purge-attendances.${category}] ${detail}`);
  process.exit(1);
}

/**
 * Il Management API. `readOnly` e' esplicito a ogni chiamata invece che
 * implicito: l'unica invocazione che lo mette a `false` e' il `delete`, e si
 * vede leggendo il file.
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
    fail("sql", `HTTP ${res.status} — ${(await res.text()).slice(0, 400)}`);
  }
  try {
    return await res.json();
  } catch (err) {
    fail("sql_payload", `risposta non interpretabile: ${err?.message ?? "(nessun messaggio)"}`);
  }
}

/**
 * La fonte DIVERSA: PostgREST con la chiave di servizio.
 *
 * L'URL si verifica contro il ref del bersaglio prima di usarlo. Un contatore
 * che leggesse un altro progetto tornerebbe zero e sembrerebbe una conferma:
 * e' esattamente il modo in cui una verifica diventa un'eco di se stessa.
 */
async function countViaPostgrest(table) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!url || !key) {
    fail(
      "counter_env",
      "NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY assenti: il contatore " +
        "di controllo non ha una seconda fonte da interrogare."
    );
  }
  if (!url.includes(REF)) {
    fail(
      "counter_target",
      `NEXT_PUBLIC_SUPABASE_URL non nomina il bersaglio dell'atto (${REF}): il ` +
        "contatore leggerebbe un altro progetto e tornerebbe zero per la ragione sbagliata."
    );
  }
  let res;
  try {
    res = await fetch(`${url}/rest/v1/${table}?select=id`, {
      headers: { apikey: key, Authorization: `Bearer ${key}`, Prefer: "count=exact", Range: "0-0" },
    });
  } catch (err) {
    fail("counter_network", `PostgREST non ha risposto: ${err?.message ?? "(nessun messaggio)"}`);
  }
  if (!res.ok) {
    fail("counter_http", `PostgREST HTTP ${res.status} — ${(await res.text()).slice(0, 300)}`);
  }
  const range = res.headers.get("content-range") ?? "";
  const total = range.split("/")[1];
  if (total === undefined || total === "*") {
    fail("counter_shape", `PostgREST non ha restituito un totale: content-range = "${range}"`);
  }
  return Number(total);
}

const utc = () => new Date().toISOString();
const say = (s) => console.log(s);

/* ──────────────────────────────── il referto ─────────────────────────────── */

say("");
say("═══ purge-attendances ═══════════════════════════════════════════════════");
say(`  bersaglio      : ${IS_PRODUCTION ? "PRODUZIONE" : "laboratorio"}`);
say(`  modo           : ${DRY_RUN ? "--dry-run (nessuna scrittura)" : "--apply"}`);
say(`  ora di partenza: ${utc()}`);
if (IS_PRODUCTION) say(`  autorizzazione : ${AUTH_PATH} (${AUTH_DATE})`);
say("─────────────────────────────────────────────────────────────────────────");

/* (0) La tabella esiste ancora? Dopo la migration del piano 51-12 non esiste
 *     piu', e dirlo e' un esito, non un errore: significa che l'atto e' gia'
 *     avvenuto e che la tabella e' gia' stata tolta. */
const [{ presente }] = await sql(
  "select (to_regclass('public.attendances') is not null) as presente;"
);
if (!presente) {
  say("");
  say("  public.attendances NON ESISTE su questo progetto.");
  say("  Non c'e' niente da contare e niente da cancellare: la tabella e' gia'");
  say("  stata tolta (D-51-14). Uscita con successo.");
  say("");
  process.exit(0);
}

/* (b) Il conteggio PER PROVENIENZA, e la cattura degli id nella STESSA
 *     interrogazione che li conta. Due query separate potrebbero vedere due
 *     insiemi diversi; qui la lista e' il conteggio. */
const [conteggio] = await sql(`
  select count(*) filter (where party_id is not null)                       as da_porta,
         count(*) filter (where party_id is null)                           as pre_porta,
         count(*)                                                           as totale,
         coalesce(array_agg(id::text order by id) filter (where party_id is not null), '{}') as id_da_porta,
         coalesce(array_agg(id::text order by id) filter (where party_id is null),     '{}') as id_pre_porta
  from   public.attendances;
`);

const daPorta = Number(conteggio.da_porta);
const prePorta = Number(conteggio.pre_porta);
const totale = Number(conteggio.totale);
const idDaPorta = conteggio.id_da_porta ?? [];
const idPrePorta = conteggio.id_pre_porta ?? [];

say("");
say("  (b) CONTEGGIO PER PROVENIENZA — Management API, read_only");
say(`      party_id valorizzato  (cio' che D-51-04 autorizza) : ${daPorta}`);
say(`      party_id nullo        (residuo pre-porta, NON nominato da D-51-04) : ${prePorta}`);
say(`      totale                                             : ${totale}`);
say(`      letto il ${utc()}`);

if (daPorta + prePorta !== totale) {
  fail(
    "census_inconsistent",
    `le due popolazioni sommano ${daPorta + prePorta} ma il totale e' ${totale}. ` +
      "Nessuna cancellazione su un censimento che non torna."
  );
}

/* (c) La cascata, DAL CATALOGO. Due direzioni interrogate separatamente:
 *     confonderle e' il modo in cui un'istantanea copre la tabella sbagliata. */
const cascata = await sql(`
  select 'PENDE DA attendances' as direzione,
         c.conrelid::regclass::text   as tabella,
         c.conname,
         pg_get_constraintdef(c.oid)  as definizione
  from   pg_constraint c
  where  c.confrelid = 'public.attendances'::regclass
  union all
  select 'attendances PENDE DA',
         c.confrelid::regclass::text,
         c.conname,
         pg_get_constraintdef(c.oid)
  from   pg_constraint c
  where  c.conrelid = 'public.attendances'::regclass and c.contype = 'f'
  order  by 1, 2, 3;
`);

const inUscita = cascata.filter((r) => r.direzione === "PENDE DA attendances");
const inEntrata = cascata.filter((r) => r.direzione === "attendances PENDE DA");

say("");
say("  (c) CASCATA, ENUMERATA DAL CATALOGO — pg_constraint, non un documento");
say(`      chi PENDE DA attendances (confrelid) : ${inUscita.length}`);
for (const r of inUscita) say(`        · ${r.tabella} — ${r.conname} — ${r.definizione}`);
if (inUscita.length === 0) {
  say("        (vuota: cancellare righe di attendances non tocca nient'altro)");
}
say(`      da cosa PENDE attendances (conrelid) : ${inEntrata.length} — direzione OPPOSTA,`);
say("        non e' la cascata dell'atto, e non entra nell'istantanea");
for (const r of inEntrata) say(`        · → ${r.tabella} — ${r.conname}`);

/* (d) L'istantanea, PRIMA di qualunque scrittura: la tabella intera piu' il
 *     conteggio del vicinato, che e' cio' che un contatore di controllo deve
 *     poter confrontare per accorgersi se qualcosa e' cambiato dove non doveva. */
const righe = await sql("select * from public.attendances order by id;");
const vicinato = await sql(`
  select 'public.attendances'       as tabella, count(*)::text as righe from public.attendances
  union all select 'public.events',            count(*)::text from public.events
  union all select 'public.event_parties',     count(*)::text from public.event_parties
  union all select 'public.door_scan_events',  count(*)::text from public.door_scan_events
  union all select 'public.tickets',           count(*)::text from public.tickets
  union all select 'public.party_assignments', count(*)::text from public.party_assignments
  union all select 'public.profiles',          count(*)::text from public.profiles
  order by 1;
`);

const istantanea = {
  strumento: "purge-attendances.mjs",
  bersaglio: IS_PRODUCTION ? "production" : "lab",
  scattata_il: utc(),
  modo: DRY_RUN ? "dry-run" : "apply",
  conteggio: { da_porta: daPorta, pre_porta: prePorta, totale },
  id_catturati: { da_porta: idDaPorta, pre_porta: idPrePorta },
  cascata_in_uscita: inUscita,
  cascata_in_entrata: inEntrata,
  righe,
  vicinato,
};

try {
  writeFileSync(SNAPSHOT_FILE, JSON.stringify(istantanea, null, 2));
} catch (err) {
  fail("snapshot_write", `l'istantanea non e' stata scritta: ${err?.message ?? "(nessun messaggio)"}`);
}

say("");
say("  (d) ISTANTANEA — scritta PRIMA di qualunque scrittura");
say(`      file: ${SNAPSHOT_FILE}  (coperto da .gitignore: contiene RIGHE)`);
say(`      righe nell'istantanea: ${righe.length}`);
say("      vicinato misurato (Management API):");
for (const v of vicinato) say(`        · ${v.tabella.padEnd(26)} ${v.righe}`);

/* (e) La lista degli id, nel referto. */
say("");
say("  (e) LE CHIAVI CATTURATE, dalla stessa interrogazione che le ha contate");
say(`      party_id valorizzato : ${idDaPorta.length ? idDaPorta.join(", ") : "(nessuna)"}`);
say(`      party_id nullo       : ${idPrePorta.length ? idPrePorta.join(", ") : "(nessuna)"}`);

/* Una decisione senza soggetti non si esegue.
 *
 * E lo zero che ferma l'atto si prende da DUE fonti, non da una. La regola
 * dice «la conferma si chiede a una fonte diversa da quella su cui si e'
 * agito», e qui non si e' agito affatto — ma e' proprio questo il caso in cui
 * una misura cieca costa di piu': uno zero letto una volta sola ferma una
 * decisione, e nessuno saprebbe distinguere «non c'e' niente» da «ho guardato
 * nel posto sbagliato». La guardia sull'URL dentro `countViaPostgrest` e'
 * l'altra meta' della stessa risposta. */
if (totale === 0) {
  const zeroControllo = await countViaPostgrest("attendances");
  say("");
  say("  (g) CONTATORE DI CONTROLLO — PostgREST con la chiave di servizio");
  say(`      public.attendances : ${zeroControllo}`);
  say(`      letto il ${utc()}`);
  if (zeroControllo !== 0) {
    fail(
      "census_disagreement",
      `il Management API conta 0 righe e PostgREST ne conta ${zeroControllo}. ` +
        "Due fonti che non concordano su un conteggio non autorizzano ne' un atto " +
        "ne' una rinuncia: si ferma qui e si guarda."
    );
  }
  say("");
  say("  ⚑ ZERO RIGHE, su entrambe le fonti: non c'e' niente da cancellare.");
  say("    Una decisione senza soggetti non si esegue, e si dichiara invece di");
  say("    lasciarla scoprire a meta' procedura (50-AUTHORISATION.md §1.0).");
  say("    L'autorizzazione, se e' stata concessa, NON e' stata consumata.");
  say("    La tabella resta da togliere: lo fa la migration, con la sua guardia.");
  say("");
  say(`  chiuso il ${utc()} — uscita 0`);
  say("═════════════════════════════════════════════════════════════════════════");
  say("");
  process.exit(0);
}

if (DRY_RUN) {
  say("");
  say("  --dry-run: fermato qui. Nessuna riga e' stata toccata.");
  say(`  chiuso il ${utc()} — uscita 0`);
  say("═════════════════════════════════════════════════════════════════════════");
  say("");
  process.exit(0);
}

/* (f) L'atto: DELETE ... WHERE id = ANY(<lista catturata>).
 *
 *     Mai per interfaccia, mai con un predicato ricomposto adesso. Le due
 *     popolazioni si cancellano in due statement separati e con due conteggi
 *     separati, perche' restano due decisioni diverse anche quando si eseguono
 *     nello stesso minuto. */
const quote = (arr) => arr.map((x) => `'${String(x).replace(/'/g, "''")}'::uuid`).join(", ");

say("");
say("  (f) L'ATTO — DELETE ... WHERE id = ANY(<lista catturata>)");

let cancellateDaPorta = 0;
let cancellatePrePorta = 0;

if (idDaPorta.length > 0) {
  const r = await sql(
    `delete from public.attendances where id = ANY(ARRAY[${quote(idDaPorta)}]) returning id;`,
    { readOnly: false }
  );
  cancellateDaPorta = r.length;
  say(`      party_id valorizzato : ${cancellateDaPorta} righe cancellate`);
}
if (idPrePorta.length > 0) {
  const r = await sql(
    `delete from public.attendances where id = ANY(ARRAY[${quote(idPrePorta)}]) returning id;`,
    { readOnly: false }
  );
  cancellatePrePorta = r.length;
  say(`      party_id nullo       : ${cancellatePrePorta} righe cancellate`);
}
say(`      atto eseguito il ${utc()}`);

if (cancellateDaPorta !== idDaPorta.length || cancellatePrePorta !== idPrePorta.length) {
  fail(
    "delete_short",
    `catturate ${idDaPorta.length}+${idPrePorta.length}, cancellate ` +
      `${cancellateDaPorta}+${cancellatePrePorta}. L'istantanea e' in ${SNAPSHOT_FILE}.`
  );
}

/* (g) Il contatore di controllo, da una FONTE DIVERSA. */
const dopo = await countViaPostgrest("attendances");
say("");
say("  (g) CONTATORE DI CONTROLLO — PostgREST con la chiave di servizio");
say(`      public.attendances dopo l'atto : ${dopo}`);
say(`      letto il ${utc()}`);

if (dopo !== 0) {
  fail(
    "residual_rows",
    `restano ${dopo} righe dopo l'atto. La migration rifiutera' il DROP, ed e' ` +
      "il comportamento corretto. L'istantanea e' in " + SNAPSHOT_FILE + "."
  );
}

/* L'autorizzazione si consuma qui, e non nella memoria di chi l'ha usata. */
if (IS_PRODUCTION && authorisationText) {
  const consumata = authorisationText.replace(
    /^spent:[ \t]*no[ \t]*$/m,
    `spent: yes\nspent_at: ${utc()}`
  );
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
say(`  chiuso il ${utc()} — uscita 0`);
say("═════════════════════════════════════════════════════════════════════════");
say("");
