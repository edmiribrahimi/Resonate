/**
 * lab-bootstrap.mjs — costruisce il database del LABORATORIO usa-e-getta.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * NON PUNTA MAI ALLA PRODUZIONE. Il rifiuto e' la prima riga eseguita, prima di
 * qualunque lettura e di qualunque scrittura.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * PERCHE' ESISTE. `42-LAB.md` descriveva a parole il percorso di bootstrap con i
 * suoi tre ostacoli, ma il codice che lo eseguiva viveva negli appunti di una
 * sessione — cioe' in un posto che sparisce. La seconda ricostruzione del
 * laboratorio (2026-08-19) e' costata minuti invece che ore SOLO perche' quegli
 * appunti erano ancora su disco per caso. Questo file toglie il caso di mezzo.
 *
 * IL PERCORSO, e perche' non e' pulito. Questo repository non ha una strada
 * funzionante per creare un database da zero, ed e' un fatto misurato:
 *
 *   1. dalle sole migration, la prima fallisce: `public.profiles` non esiste.
 *      Le tabelle base nascono in `schema.sql`.
 *   2. dal solo `schema.sql`, fallisce la riga 490: `discount_codes.party_id`
 *      referenzia `event_parties`, che nasce in una migration successiva.
 *      Un riferimento in avanti.
 *   3. `schema.sql` PIU' le migration: alcune collidono, perche' `schema.sql` e'
 *      l'istantanea di uno stato successivo e ha gia' i loro oggetti.
 *
 * Quindi: schema senza quella chiave esterna → migration tollerando SOLO i
 * duplicati e registrandone ognuno → la chiave esterna rimessa → i tre oggetti
 * che la migration saltata dei codici sconto avrebbe portato.
 *
 * L'ULTIMO PASSO NON E' DEDUCIBILE DALLA PROCEDURA: la procedura sembrava
 * riuscita. Lo ha trovato il confronto dei cataloghi (`lab-fidelity.mjs`), che
 * e' la ragione per cui quel confronto esiste ed e' un passo separato.
 *
 * USO
 *   LAB_PROJECT_REF=<ref> SUPABASE_ACCESS_TOKEN=<token> node scripts/lab-bootstrap.mjs
 *
 * Dopo, SEMPRE: `node scripts/lab-fidelity.mjs`. Un bootstrap riuscito descrive
 * cio' che ho fatto; un catalogo uguale descrive cio' che c'e'. Solo il secondo
 * e' una misura.
 */
import { readFileSync, readdirSync } from "node:fs";

const PRODUCTION_REF = "cjsfocnhfzycbbgkwocx";
const REF = process.env.LAB_PROJECT_REF;
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

if (!REF || !TOKEN) {
  console.error("LAB_PROJECT_REF o SUPABASE_ACCESS_TOKEN assenti.");
  process.exit(2);
}
if (REF === PRODUCTION_REF) {
  console.error(
    "RIFIUTO: LAB_PROJECT_REF e' il ref di PRODUZIONE.\n" +
      "Questo script scrive lo schema da zero. Non gira contro la produzione, mai."
  );
  process.exit(2);
}

const api = (path, init) =>
  fetch(`https://api.supabase.com/v1/projects/${REF}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json", ...(init?.headers || {}) },
  });

const query = async (sql, etichetta) => {
  const res = await api("/database/query", { method: "POST", body: JSON.stringify({ query: sql }) });
  const body = await res.text();
  if (!res.ok) throw new Error(`${etichetta}: HTTP ${res.status} ${body.slice(0, 400)}`);
  return body;
};

/* ── 0. Realtime esiste solo dopo la prima connessione ────────────────────── */
//
// Misurato il 2026-09-07 su un progetto appena creato: lo schema `realtime` era
// VUOTO — niente `messages`, niente `schema_migrations` — e la migration della
// fase 38 (`20260811120000_live_attendance_channel.sql`) si fermava con 42P01.
// Il servizio Realtime esegue le proprie migration alla PRIMA connessione
// websocket del tenant, non alla creazione del progetto. Una `phx_join` vuota
// basta: dopo, `realtime.messages` e le sue partizioni giornaliere esistono.
// La chiave anon serve solo per aprire il socket, e si legge dall'endpoint.

const realtimeC = JSON.parse(await query(`select to_regclass('realtime.messages') as t`, "sonda realtime"));
if (!realtimeC[0]?.t) {
  const keys = await (await api("/api-keys?reveal=true")).json();
  const anon = keys.find((k) => k.name === "anon")?.api_key;
  if (!anon) { console.error("chiave anon non trovata: non posso svegliare Realtime"); process.exit(1); }
  await new Promise((resolve, reject) => {
    const ws = new WebSocket(`https://${REF}.supabase.co/realtime/v1/websocket?apikey=${anon}&vsn=1.0.0`.replace("https", "wss"));
    const t = setTimeout(() => { ws.close(); reject(new Error("Realtime non ha risposto in 15 s")); }, 15000);
    ws.onopen = () => ws.send(JSON.stringify({ topic: "realtime:lab-bootstrap", event: "phx_join", payload: { config: {} }, ref: "1" }));
    ws.onmessage = () => { clearTimeout(t); ws.close(); resolve(); };
    ws.onerror = () => { clearTimeout(t); reject(new Error("websocket Realtime rifiutato")); };
  });
  for (let n = 0; n < 12; n++) {
    const c = JSON.parse(await query(`select to_regclass('realtime.messages') as t`, "sonda realtime"));
    if (c[0]?.t) break;
    await new Promise((r) => setTimeout(r, 5000));
  }
  const fin = JSON.parse(await query(`select to_regclass('realtime.messages') as t`, "sonda realtime"));
  if (!fin[0]?.t) { console.error("realtime.messages ancora assente dopo la connessione: fermarsi"); process.exit(1); }
  console.log("0/4  Realtime svegliato: realtime.messages esiste");
} else {
  console.log("0/4  Realtime gia' inizializzato");
}

/* ── 1. schema.sql, senza il riferimento in avanti della riga 490 ─────────── */

let schema = readFileSync("supabase/schema.sql", "utf8");
const RIGA_490 = /party_id uuid not null references public\.event_parties on delete cascade/;
if (!RIGA_490.test(schema)) {
  console.error(
    "La chiave esterna in avanti della riga 490 non e' piu' dove era.\n" +
      "schema.sql e' cambiato: FERMARSI e rileggerlo, invece di applicare un file\n" +
      "che non e' quello per cui questo percorso e' stato misurato."
  );
  process.exit(1);
}
schema = schema.replace(RIGA_490, "party_id uuid not null");

// RIPETIBILE, dal 2026-09-07. Un laboratorio permanente si ricostruisce anche a
// meta': se `public.profiles` esiste, schema.sql e' gia' passato e si salta. Le
// migration gia' applicate vengono saltate come duplicate dal passo 2, e i
// quattro oggetti del passo 3-4 tollerano i duplicati per la stessa ragione.
// La prova che il risultato e' fedele resta `lab-fidelity.mjs`, non questo file.
const giaSchema = JSON.parse(await query(`select to_regclass('public.profiles') as t`, "sonda schema"));
if (giaSchema[0]?.t) {
  console.log("1/4  schema.sql gia' applicato (public.profiles esiste): saltato");
} else {
  await query(schema, "schema.sql");
  console.log("1/4  schema.sql applicato (senza la chiave esterna in avanti)");
}

/* ── 2. le migration, tollerando SOLO gli errori di "esiste gia'" ─────────── */

// Codici Postgres che significano "c'e' gia'" — e nient'altro. Saltare in
// silenzio una migration che NON e' un duplicato costruirebbe un laboratorio
// che somiglia alla produzione senza esserlo, che e' peggio di nessun
// laboratorio.
const DUPLICATO = ["42701", "42P07", "42710", "42P06", "42723", "42P16"];
const codice = (m) => (m.match(/ERROR:\s+([0-9A-Z]{5}):/) || [])[1] || null;
// Il matcher precedente cercava ": 42701:" con UNO spazio; il messaggio ne ha
// DUE, e falliva CHIUDENDO — cioe' si fermava invece di saltare. Verso giusto.
const eDuplicato = (m) =>
  DUPLICATO.includes(codice(m)) ||
  // Artefatto dell'endpoint: assegna `version` dal timestamp corrente, quindi
  // due migration applicate nello stesso secondo collidono sulla chiave
  // primaria di schema_migrations. Non e' un difetto dello schema.
  m.includes("schema_migrations_pkey");

const dir = "supabase/migrations";
const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
const applicate = [], saltate = [];

/* ── 3 e 4. I quattro oggetti che il percorso non porta ───────────────────── */
//
// Due di questi sono COMMENTATI dentro schema.sql (righe 511-515) e vivono solo
// nella migration dei codici sconto, che il passo 2 salta come duplicata perche'
// la sua TABELLA esiste gia'. Il risultato e' un laboratorio senza le due
// colonne e senza l'overload — e senza nessun errore che lo dica.
//
// VANNO RIMESSI SUBITO DOPO QUEL FILE, NON ALLA FINE. Misurato il 2026-09-07,
// alla prima ricostruzione dopo la fase 49: la migration
// `20260905150000_reserve_ticket_service_only.sql` fa REVOKE/GRANT sulla firma
// a otto argomenti, e si e' fermata con 42883 «function does not exist» perche'
// l'overload arrivava solo al passo 4. Con 67 migration l'ordine non contava;
// con 85 conta. Ogni migration futura che tocchi `reserve_ticket` lo trova.

const FILE_SCONTI = "20260310100000_discount_codes.sql";
const migSconti = readFileSync(`${dir}/${FILE_SCONTI}`, "utf8");
const i = migSconti.indexOf("CREATE OR REPLACE FUNCTION public.reserve_ticket(");
if (i < 0) { console.error("l'overload di reserve_ticket non e' piu' in quella migration: fermarsi"); process.exit(1); }

// Tollera SOLO "esiste gia'": e' cio' che rende il bootstrap ripetibile a meta'.
const queryOppureDuplicato = async (sql, etichetta) => {
  try { await query(sql, etichetta); }
  catch (e) { if (eDuplicato(String(e.message))) console.log(`     (${etichetta}: gia' presente, saltato)`); else throw e; }
};

async function quattroOggetti() {
  await queryOppureDuplicato(
    `alter table public.discount_codes
       add constraint discount_codes_party_id_fkey
       foreign key (party_id) references public.event_parties(id) on delete cascade`,
    "chiave esterna della riga 490"
  );
  console.log("3/4  chiave esterna della riga 490 rimessa");
  await queryOppureDuplicato(`alter table public.tickets add column discount_code_id uuid references public.discount_codes on delete set null`, "tickets.discount_code_id");
  await queryOppureDuplicato(`alter table public.pending_purchases add column discount_code_id uuid references public.discount_codes on delete set null`, "pending_purchases.discount_code_id");
  await query(migSconti.slice(i), "overload di reserve_ticket");
  console.log("4/4  le due colonne e l'overload di reserve_ticket — rimessi subito dopo " + FILE_SCONTI);
}

// RIPRESA: l'endpoint annota ogni migration riuscita in
// `supabase_migrations.schema_migrations` con il `name` che le passiamo, cioe'
// il nome del file. Cio' che e' annotato non si rimanda: una migration che
// cancella un vincolo, rimandata, fallisce con 42704 «does not exist» — che
// NON e' un duplicato e fermava la ripresa (misurato il 2026-09-07 su
// `20260226300000_multi_sub_events.sql`). Le migration saltate come duplicate
// non sono annotate e vengono rimandate: si saltano di nuovo, senza effetto.
let registrate = new Set();
try {
  registrate = new Set(JSON.parse(await query(`select name from supabase_migrations.schema_migrations`, "registro")).map((r) => r.name));
} catch { /* progetto nuovo: nessun registro, nessuna ripresa */ }
const riprese = [];

let oggettiRimessi = false;
for (const f of files) {
  const nome = f.replace(/\.sql$/, "");
  if (registrate.has(nome)) {
    riprese.push(f);
    if (f === FILE_SCONTI) { await quattroOggetti(); oggettiRimessi = true; }
    continue;
  }
  const res = await api("/database/migrations", {
    method: "POST",
    body: JSON.stringify({ name: f.replace(/\.sql$/, ""), query: readFileSync(`${dir}/${f}`, "utf8") }),
  });
  await new Promise((r) => setTimeout(r, 1100)); // versioni distinte al secondo
  if (res.ok) { applicate.push(f); }
  else {
    const body = await res.text();
    if (!eDuplicato(body)) {
      console.error(`\nFERMATO a ${f} (HTTP ${res.status}) — NON e' un duplicato:\n${body.slice(0, 700)}`);
      process.exit(1);
    }
    saltate.push({ file: f, errore: body.slice(0, 200).replace(/\s+/g, " ") });
  }
  if (f === FILE_SCONTI) {
    if (res.ok) { console.error(`${FILE_SCONTI} e' stata APPLICATA invece che saltata: schema.sql e' cambiato, fermarsi e rileggere.`); process.exit(1); }
    await quattroOggetti();
    oggettiRimessi = true;
  }
}
if (!oggettiRimessi) { console.error(`${FILE_SCONTI} non e' nella cartella: il percorso misurato non vale piu'.`); process.exit(1); }
console.log(`2/4  migration: ${applicate.length} applicate, ${saltate.length} saltate come duplicate, ${riprese.length} gia' registrate (ripresa)`);
for (const s of saltate) console.log(`       - ${s.file}\n         ${s.errore}`);

/* ── 5. Cio' che le migration saltate avrebbero TOLTO ─────────────────────── */
//
// Il verso opposto del passo 3-4. Una migration saltata come duplicata non
// aggiunge cio' che doveva aggiungere, e nemmeno toglie cio' che doveva togliere.
// `20260225150000_party_architecture.sql` righe 163-171 elimina da `events`
// sette colonne che schema.sql porta ancora; nel laboratorio restavano, e il
// confronto dei cataloghi lo ha detto il 2026-09-07 («colonne prod 502 · lab
// 509»). Si tolgono qui, per nome, con `if exists` perche' il passo e' ripetibile.

await query(
  `alter table public.events
     drop column if exists end_time,
     drop column if exists preparty_title,
     drop column if exists preparty_time,
     drop column if exists preparty_location,
     drop column if exists afterparty_title,
     drop column if exists afterparty_time,
     drop column if exists afterparty_location`,
  "colonne di events tolte da party_architecture"
);
console.log("5/5  le sette colonne di events che party_architecture toglie");

console.log(
  "\nIl database c'e'. NON e' ancora detto che sia fedele:\n" +
    "  node scripts/lab-fidelity.mjs\n" +
    "e poi la semina:\n" +
    "  node scripts/seed-lab-door.mjs --seed"
);
