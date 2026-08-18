/**
 * seed-lab-door.mjs — semina e rimuove il minimo indispensabile per esercitare la
 * porta in un AMBIENTE USA-E-GETTA.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * NON PUNTA MAI ALLA PRODUZIONE, E NON PER CONVENZIONE.
 *
 * Legge `LAB_PROJECT_REF` e si RIFIUTA di partire se coincide con il ref di
 * produzione. Il rifiuto e' la prima riga eseguita, prima di qualunque lettura e
 * di qualunque scrittura: un controllo che gira dopo il primo `insert` non e' un
 * controllo, e' un rimpianto.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * PERCHE' ESISTE. Le nove procedure ancora aperte della porta — `42-PROCEDURES.md`
 * righe 1h, 1i, 2d, 3n, 3o, 3p, 3q, 3r, 3s — e le sezioni §1…§8 di
 * `39-DOOR-PASS.md` chiedono tutte la stessa cosa: una serata, un account con
 * `door.operate` per quella serata, e un codice valido da scansionare. In
 * produzione quelle righe non esistono (0 serate future pubblicate, 0 biglietti)
 * e crearle sarebbe P6 — una scrittura in produzione, che ha bisogno di
 * un'autorizzazione fresca e non di questo script.
 *
 * LE QUATTRO REGOLE DELLA RIMOZIONE, che qui sono codice e non un promemoria.
 * Vengono dall'incidente registrato in `.claude/rules/ai-engineering.md`: uno
 * script di verifica ha cancellato 63 righe di produzione su sette tabelle
 * risalendo il DOM da un titolo, e questo progetto non ha PITR.
 *
 *   1. La chiave primaria si cattura ALLA CREAZIONE, non si ricerca dopo.
 *      Ogni id creato finisce in `.env.lab.seed.json` (ignorato da git) prima
 *      che lo script possa fallire da qualche altra parte.
 *   2. La rimozione avviene PER CHIAVE PRIMARIA, da quel file. Mai per titolo,
 *      mai per etichetta, mai con un `where` che descrive invece di nominare.
 *      Il verso dell'errore e' il punto: un selettore largo cancella PIU' del
 *      dovuto; una `delete ... where id = $1` che sbaglia non trova nulla.
 *   3. L'insieme delle cascate si ENUMERA leggendo `pg_constraint`, non
 *      ricordandolo. Una cascata e' un percorso di scrittura che nessuno ha
 *      dichiarato. `--cascade` la stampa senza cancellare niente.
 *   4. La conferma si chiede a una FONTE DIVERSA da quella con cui si e'
 *      cancellato: qui si cancella via SQL e si riconta via PostgREST. Una
 *      misura presa con lo strumento che ha causato l'effetto e' un'eco.
 *
 * COSA SEMINA. Un locale, una serata futura pubblicata con il suo format e la
 * sua serie, un livello di biglietto, quattro account e un biglietto con il suo
 * codice firmato. Nomi e indirizzi sono palesemente finti (`@lab.invalid`) e la
 * data e' calcolata a partire da oggi: questo file e' su un repository PUBBLICO
 * e non deve portare una sede, una data o una line-up vere.
 *
 * USO
 *   node scripts/seed-lab-door.mjs --seed      semina e scrive gli id
 *   node scripts/seed-lab-door.mjs --cascade   stampa l'insieme delle cascate
 *   node scripts/seed-lab-door.mjs --verify    riconta da PostgREST
 *   node scripts/seed-lab-door.mjs --teardown  rimuove per chiave primaria
 *   node scripts/seed-lab-door.mjs --reset     azzera tutto (SOLO laboratorio)
 *
 * Variabili attese (da `.env.lab.local`, ignorato da git):
 *   SUPABASE_ACCESS_TOKEN, LAB_PROJECT_REF, LAB_SUPABASE_URL,
 *   LAB_SUPABASE_SERVICE_ROLE_KEY, LAB_TICKET_SIGNING_SECRET
 */

import { createHmac } from "node:crypto";
import { readFileSync, writeFileSync, existsSync } from "node:fs";

/* ───────────────────────── il rifiuto, prima di tutto ───────────────────────── */

// Il ref di produzione e' scritto qui in chiaro, e va bene: e' gia' pubblico per
// costruzione — `NEXT_PUBLIC_SUPABASE_URL` e' `https://<ref>.supabase.co` e viaggia
// nel bundle del browser. Non e' un segreto, e' un indirizzo. Il segreto sono le
// chiavi, che stanno in `.env*` e non entrano mai in questo file.
// Il ref del LABORATORIO invece NON e' scritto qui: sta solo in `.env.lab.local`,
// perche' non c'e' ragione di pubblicare un ambiente che nessuno deve trovare.
const PRODUCTION_REF = "cjsfocnhfzycbbgkwocx";
const REF = process.env.LAB_PROJECT_REF;
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const SEED_FILE = ".env.lab.seed.json";

if (!REF || !TOKEN) {
  console.error("LAB_PROJECT_REF o SUPABASE_ACCESS_TOKEN assenti. Carica .env.lab.local.");
  process.exit(2);
}
if (REF === PRODUCTION_REF) {
  console.error(
    `RIFIUTO: LAB_PROJECT_REF e' il ref di PRODUZIONE (${PRODUCTION_REF}).\n` +
      "Questo script semina e cancella righe. In produzione quella e' P6, e P6 ha\n" +
      "bisogno di un'autorizzazione fresca del proprietario, non di questo file."
  );
  process.exit(2);
}

/* ─────────────────────────────── utilita' ─────────────────────────────── */

async function sql(query) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) throw new Error(`SQL ${res.status}: ${(await res.text()).slice(0, 400)}`);
  return res.json();
}

const q = (s) => `'${String(s).replace(/'/g, "''")}'`;

function loadSeed() {
  if (!existsSync(SEED_FILE)) {
    console.error(`${SEED_FILE} non esiste — non c'e' niente da rimuovere o verificare.`);
    process.exit(1);
  }
  return JSON.parse(readFileSync(SEED_FILE, "utf8"));
}

/* ─────────────────────── regola 3 — le cascate, lette ─────────────────────── */

/** Cammina `pg_constraint` dalle tabelle radice e restituisce l'insieme raggiungibile. */
async function cascadeSet(roots) {
  const rows = await sql(`
    select c.conrelid::regclass::text as child,
           c.confrelid::regclass::text as parent,
           c.confdeltype::text as ondelete
    from pg_constraint c
    where c.contype = 'f' and c.connamespace = 'public'::regnamespace`);
  const seen = new Set(roots);
  let grew = true;
  while (grew) {
    grew = false;
    for (const r of rows) {
      const parent = r.parent.replace(/^public\./, "");
      const child = r.child.replace(/^public\./, "");
      if (seen.has(parent) && !seen.has(child)) {
        seen.add(child);
        grew = true;
      }
    }
  }
  return { set: [...seen].sort(), edges: rows.length };
}

/* ──────────────────────────────── semina ──────────────────────────────── */

async function seed() {
  if (existsSync(SEED_FILE)) {
    console.error(
      `${SEED_FILE} esiste gia'. Rimuovi prima con --teardown: due semine sovrapposte\n` +
        "producono un file di chiavi che non descrive piu' cosa c'e' nel database."
    );
    process.exit(1);
  }

  const ids = { creato: new Date().toISOString(), ref: REF };
  const write = () => writeFileSync(SEED_FILE, JSON.stringify(ids, null, 2));

  // Gli account. `auth.admin` e' l'unica strada che crea un utente vero: un profilo
  // scritto a mano senza la riga in `auth.users` non puo' fare login, e una
  // procedura che non puo' fare login non misura nessun confine di ruolo.
  const AUTH = `${process.env.LAB_SUPABASE_URL}/auth/v1/admin/users`;
  const SRK = process.env.LAB_SUPABASE_SERVICE_ROLE_KEY;
  const PASSWORD = process.env.LAB_ACCOUNT_PASSWORD || "lab-door-pass-2026";

  // ── Un account che due procedure chiedono e che il database non ammette ──────
  //
  // `39-DOOR-PASS.md` §1.5 e il test M-3 di `34-VERIFICATION.md` chiedono
  // entrambi un account **`organizer` in stato `pending`**, «seminato a mano»
  // perche' il prodotto non sa produrlo (43-CONTEXT D-15).
  //
  // **Non e' seminabile nemmeno a mano.** Misurato il 2026-08-18 su LABORATORIO
  // e PRODUZIONE, identico su entrambi:
  //
  //   profiles_role_implies_approved
  //   CHECK (role <> ALL (ARRAY['master','organizer','staff']) OR status = 'approved')
  //
  // Un `organizer` `pending` viola il vincolo: la riga non puo' esistere. Le due
  // procedure descrivono uno stato che lo schema rende impossibile, e nessuna
  // delle due poteva accorgersene senza un ambiente in cui provarci.
  // Registrato in `deferred-items.md`. Qui NON si aggira: aggirarlo
  // significherebbe togliere un vincolo di produzione per far girare una prova,
  // che e' il verso sbagliato in cui piegare le cose.
  const ACCOUNTS = [
    { key: "master", email: "master@lab.invalid", role: "master", status: "approved" },
    { key: "door", email: "door@lab.invalid", role: "staff", status: "approved" },
    // Il solo stato `pending` che lo schema ammette: il ruolo `member`.
    { key: "memberPending", email: "member-pending@lab.invalid", role: "member", status: "pending" },
    { key: "member", email: "member@lab.invalid", role: "member", status: "approved" },
  ];

  // La cancellazione di un utente in GoTrue non e' immediatamente visibile: una
  // semina rilanciata subito dopo una rimozione incontra `email_exists` su un
  // indirizzo che la lista dice assente. Quindi l'indirizzo esistente si
  // RIUSA invece di essere ricreato — e il suo id entra comunque nel file delle
  // chiavi, perche' la regola 1 vale anche per cio' che non ho creato io: se
  // domani va rimosso, va rimosso per chiave e non per indirizzo.
  const esistenti = new Map();
  {
    const res = await fetch(AUTH, { headers: { apikey: SRK, Authorization: `Bearer ${SRK}` } });
    if (res.ok) for (const u of (await res.json()).users || []) esistenti.set(u.email, u.id);
  }

  ids.accounts = {};
  for (const a of ACCOUNTS) {
    let id = esistenti.get(a.email);
    let riusato = Boolean(id);
    if (!id) {
      const res = await fetch(AUTH, {
        method: "POST",
        headers: { apikey: SRK, Authorization: `Bearer ${SRK}`, "Content-Type": "application/json" },
        body: JSON.stringify({ email: a.email, password: PASSWORD, email_confirm: true }),
      });
      if (!res.ok) throw new Error(`auth ${a.email}: ${res.status} ${(await res.text()).slice(0, 300)}`);
      id = (await res.json()).id;
    }
    ids.accounts[a.key] = { id, email: a.email, role: a.role, status: a.status, riusato };
    write(); // regola 1: la chiave e' su disco prima del passo successivo
  }

  // Il trigger di registrazione crea il profilo; qui si porta solo a ruolo e stato.
  for (const a of ACCOUNTS) {
    const { id } = ids.accounts[a.key];
    await sql(`
      insert into public.profiles (id, email, full_name, membership_code, role, status)
      values (${q(id)}, ${q(a.email)}, ${q("Lab " + a.key)}, ${q("LAB" + a.key.toUpperCase().slice(0, 6))}, ${q(a.role)}, ${q(a.status)})
      on conflict (id) do update set role = excluded.role, status = excluded.status`);
  }

  // Il locale. Nome e indirizzo palesemente finti: questo file e' pubblico.
  const venue = await sql(`
    insert into public.venues (name, slug, address, created_by)
    values ('Lab Venue', 'lab-venue', 'Nowhere 0, Lab', ${q(ids.accounts.master.id)})
    returning id`);
  ids.venue = venue[0].id;
  write();

  // La serata. Data calcolata da oggi, mai scritta a mano.
  const fmt = await sql(`select id from public.formats where code = 'RSNT' limit 1`);
  const ser = await sql(`select id from public.party_series where code like 'RSNT%' limit 1`);
  if (!fmt.length || !ser.length) throw new Error("formats/party_series non seminati dalle migration");

  const ev = await sql(`
    insert into public.events (slug, title, description, date, is_published, created_by, venue_secret)
    values ('lab-night', 'Lab Night', 'Serata di laboratorio — non e'' un evento reale',
            (current_date + interval '7 days'), true, ${q(ids.accounts.master.id)}, false)
    returning id`);
  ids.event = ev[0].id;
  write();

  const party = await sql(`
    insert into public.event_parties
      (event_id, title, time, end_time, date, access_type, sort_order, lineup,
       venue_id, venue_secret, format_id, series_id, number)
    values (${q(ids.event)}, 'Lab Night', '22:00', '06:00', (current_date + interval '7 days'),
            'paid', 1, '{}', ${q(ids.venue)}, false, ${q(fmt[0].id)}, ${q(ser[0].id)}, null)
    returning id`);
  ids.party = party[0].id;
  write();

  // L'assegnazione alla porta: e' cio' che rende quell'account capace di aprire
  // QUELLA serata, ed e' il confine che la sezione §7 del door pass verifica.
  // `assignee_role` non e' facoltativo su un'assegnazione viva:
  // `party_assignments_live_role_present` pretende che una riga senza `revoked_at`
  // e senza `expired_at` porti un ruolo fra master/organizer/staff. E' il ruolo
  // CON CUI si sta alla porta, non il ruolo del profilo — congelato al momento
  // della concessione, cosi' che una revoca successiva del ruolo non riscriva la
  // storia di chi ha aperto quella sera.
  const asg = await sql(`
    insert into public.party_assignments
      (party_id, user_id, capability, assignee_role, assigned_by, granted_at, ends_at)
    values (${q(ids.party)}, ${q(ids.accounts.door.id)}, 'door.operate', 'staff',
            ${q(ids.accounts.master.id)}, now(), now() + interval '30 days')
    returning id`);
  ids.assignment = asg[0].id;
  write();

  const tier = await sql(`
    insert into public.ticket_tiers (event_id, party_id, name, price, quantity)
    values (${q(ids.event)}, ${q(ids.party)}, 'Lab', 0, 10)
    returning id`);
  ids.tier = tier[0].id;
  write();

  const tk = await sql(`
    insert into public.tickets (event_id, party_id, tier_id, user_id, amount_paid, ticket_type)
    values (${q(ids.event)}, ${q(ids.party)}, ${q(ids.tier)}, ${q(ids.accounts.member.id)}, 0, 'purchased')
    returning id`);
  ids.ticket = tk[0].id;

  // Il codice: stessa costruzione di `src/utils/qr.ts:4` — HMAC-SHA256 sull'id.
  const secret = process.env.LAB_TICKET_SIGNING_SECRET;
  if (!secret) throw new Error("LAB_TICKET_SIGNING_SECRET assente: senza, il codice non e' valido");
  const sig = createHmac("sha256", secret).update(ids.ticket).digest("hex");
  ids.ticketToken = `${ids.ticket}.${sig}`;
  write();

  console.log(`Seminato su ${REF}. Chiavi in ${SEED_FILE}.`);
  console.log(`  serata   ${ids.party}`);
  console.log(`  biglietto ${ids.ticket}`);
  console.log(`  codice   ${ids.ticketToken.slice(0, 12)}… (per intero nel file)`);
  console.log(`  account  ${Object.values(ids.accounts).map((a) => `${a.email} (${a.role}/${a.status})`).join(", ")}`);
  console.log(`  password ${PASSWORD}`);
  console.log("\nIl token va nel QR come stringa nuda: e' cio' che lo scanner legge.");
}

/* ─────────────────────── verifica, da un'altra fonte ─────────────────────── */

/** Regola 4: conta via PostgREST, non via l'endpoint SQL con cui si scrive. */
async function verify() {
  const ids = loadSeed();
  const base = process.env.LAB_SUPABASE_URL;
  const SRK = process.env.LAB_SUPABASE_SERVICE_ROLE_KEY;
  const rows = [
    ["events", ids.event],
    ["event_parties", ids.party],
    ["ticket_tiers", ids.tier],
    ["tickets", ids.ticket],
    ["party_assignments", ids.assignment],
    ["venues", ids.venue],
  ];
  let present = 0;
  for (const [table, id] of rows) {
    if (!id) continue;
    const res = await fetch(`${base}/rest/v1/${table}?id=eq.${id}&select=id`, {
      headers: { apikey: SRK, Authorization: `Bearer ${SRK}` },
    });
    const body = await res.json();
    const n = Array.isArray(body) ? body.length : 0;
    present += n;
    console.log(`  ${table.padEnd(20)} ${n === 1 ? "presente" : "ASSENTE"}`);
  }
  console.log(`\n${present} righe radice presenti, contate da PostgREST — non dall'endpoint SQL.`);
}

/* ─────────────────────── rimozione, per chiave primaria ─────────────────────── */

async function teardown() {
  const ids = loadSeed();
  if (ids.ref !== REF) {
    console.error(`Il file di chiavi e' di ${ids.ref}, l'ambiente corrente e' ${REF}. Mi fermo.`);
    process.exit(1);
  }

  // Ordine figlio→padre. Ogni riga e' nominata dalla sua chiave primaria.
  const steps = [
    ["party_assignments", ids.assignment],
    ["tickets", ids.ticket],
    ["ticket_tiers", ids.tier],
    ["event_parties", ids.party],
    ["events", ids.event],
    ["venues", ids.venue],
  ];
  for (const [table, id] of steps) {
    if (!id) continue;
    const r = await sql(`delete from public.${table} where id = ${q(id)} returning id`);
    console.log(`  ${table.padEnd(20)} ${r.length} riga/e rimossa/e per chiave`);
  }

  const AUTH = `${process.env.LAB_SUPABASE_URL}/auth/v1/admin/users`;
  const SRK = process.env.LAB_SUPABASE_SERVICE_ROLE_KEY;
  for (const [key, a] of Object.entries(ids.accounts || {})) {
    const res = await fetch(`${AUTH}/${a.id}`, {
      method: "DELETE",
      headers: { apikey: SRK, Authorization: `Bearer ${SRK}` },
    });
    console.log(`  account ${key.padEnd(16)} ${res.ok ? "rimosso" : `NON rimosso (${res.status})`}`);
  }

  console.log("\nOra la conferma, da un'altra fonte:");
  await verify();
  console.log("\nSe qualcosa risulta ancora presente, e' un residuo reale, non un ritardo.");
}

/* ──────────────────────────────── ingresso ──────────────────────────────── */

/* ───────────────── azzeramento, e perche' NON contraddice la regola 2 ─────────────────
 *
 * `--reset` cancella TUTTO, con selettori larghi. E' l'opposto di `--teardown`,
 * che rimuove per chiave primaria — e la differenza non e' di stile:
 *
 *   `--teardown` e' la forma che si userebbe ovunque. Nomina cio' che tocca, e se
 *   sbaglia non trova nulla.
 *   `--reset` e' ammissibile SOLO qui, e solo perche' il rifiuto in cima a questo
 *   file rende impossibile puntarlo alla produzione. E' l'ambiente a essere
 *   usa-e-getta, non il metodo: lo stesso codice contro un database reale sarebbe
 *   l'incidente da cui questo script prende le sue regole.
 *
 * Serve quando una semina interrotta a meta' lascia residui che il file delle
 * chiavi non descrive piu' — che e' esattamente il caso in cui rimuovere per
 * chiave non basta, perche' le chiavi di quei residui non sono state scritte.
 */
async function reset() {
  const tabelle = ["tickets", "ticket_tiers", "party_assignments", "event_parties", "events", "venues", "profiles"];
  for (const t of tabelle) {
    const r = await sql(`delete from public.${t} returning id`);
    console.log(`  ${t.padEnd(20)} ${r.length} riga/e`);
  }
  const AUTH = `${process.env.LAB_SUPABASE_URL}/auth/v1/admin/users`;
  const SRK = process.env.LAB_SUPABASE_SERVICE_ROLE_KEY;
  const res = await fetch(AUTH, { headers: { apikey: SRK, Authorization: `Bearer ${SRK}` } });
  const { users = [] } = res.ok ? await res.json() : {};
  for (const u of users) {
    await fetch(`${AUTH}/${u.id}`, {
      method: "DELETE",
      headers: { apikey: SRK, Authorization: `Bearer ${SRK}`, "Content-Type": "application/json" },
      body: JSON.stringify({ should_soft_delete: false }),
    });
  }
  console.log(`  account             ${users.length}`);
  console.log(`\nLaboratorio ${REF} azzerato.`);
}

const mode = process.argv[2];
if (mode === "--reset") await reset();
else if (mode === "--seed") await seed();
else if (mode === "--teardown") await teardown();
else if (mode === "--verify") await verify();
else if (mode === "--cascade") {
  const { set, edges } = await cascadeSet(["events", "event_parties", "venues", "profiles"]);
  console.log(`${edges} vincoli di chiave esterna letti da pg_constraint.`);
  console.log(`Insieme raggiungibile per cascata dalle radici (${set.length} tabelle):\n  ${set.join("\n  ")}`);
  console.log("\nQuesto e' cio' che una cancellazione sbagliata potrebbe portarsi dietro.");
} else {
  console.log("uso: --seed | --cascade | --verify | --teardown | --reset");
  process.exit(1);
}
