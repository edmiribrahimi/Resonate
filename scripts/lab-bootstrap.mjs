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
await query(schema, "schema.sql");
console.log("1/4  schema.sql applicato (senza la chiave esterna in avanti)");

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

for (const f of files) {
  const res = await api("/database/migrations", {
    method: "POST",
    body: JSON.stringify({ name: f.replace(/\.sql$/, ""), query: readFileSync(`${dir}/${f}`, "utf8") }),
  });
  await new Promise((r) => setTimeout(r, 1100)); // versioni distinte al secondo
  if (res.ok) { applicate.push(f); continue; }
  const body = await res.text();
  if (eDuplicato(body)) { saltate.push({ file: f, errore: body.slice(0, 200).replace(/\s+/g, " ") }); continue; }
  console.error(`\nFERMATO a ${f} (HTTP ${res.status}) — NON e' un duplicato:\n${body.slice(0, 700)}`);
  process.exit(1);
}
console.log(`2/4  migration: ${applicate.length} applicate, ${saltate.length} saltate come duplicate`);
for (const s of saltate) console.log(`       - ${s.file}\n         ${s.errore}`);

/* ── 3 e 4. I quattro oggetti che il percorso non porta ───────────────────── */
//
// Due di questi sono COMMENTATI dentro schema.sql (righe 511-515) e vivono solo
// nella migration dei codici sconto, che il passo 2 salta come duplicata perche'
// la sua TABELLA esiste gia'. Il risultato e' un laboratorio senza le due
// colonne e senza l'overload — e senza nessun errore che lo dica.

const migSconti = readFileSync(`${dir}/20260310100000_discount_codes.sql`, "utf8");
const i = migSconti.indexOf("CREATE OR REPLACE FUNCTION public.reserve_ticket(");
if (i < 0) { console.error("l'overload di reserve_ticket non e' piu' in quella migration: fermarsi"); process.exit(1); }

await query(
  `alter table public.discount_codes
     add constraint discount_codes_party_id_fkey
     foreign key (party_id) references public.event_parties(id) on delete cascade`,
  "chiave esterna della riga 490"
);
console.log("3/4  chiave esterna della riga 490 rimessa");

await query(`alter table public.tickets add column discount_code_id uuid references public.discount_codes on delete set null`, "tickets.discount_code_id");
await query(`alter table public.pending_purchases add column discount_code_id uuid references public.discount_codes on delete set null`, "pending_purchases.discount_code_id");
await query(migSconti.slice(i), "overload di reserve_ticket");
console.log("4/4  le due colonne e l'overload di reserve_ticket");

console.log(
  "\nIl database c'e'. NON e' ancora detto che sia fedele:\n" +
    "  node scripts/lab-fidelity.mjs\n" +
    "e poi la semina:\n" +
    "  node scripts/seed-lab-door.mjs --seed"
);
