/**
 * probe-drink-token-cycle.mjs — la prova ESEGUITA del difetto 47 (`DRK-04`),
 * contro un laboratorio misurato fedele alla produzione su dieci cataloghi.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * NON PUNTA MAI ALLA PRODUZIONE. Il rifiuto e' la prima riga eseguita, prima di
 * qualunque lettura e di qualunque scrittura.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * COSA MISURA. Il ciclo attiva -> annulla su un token drink, ripetuto: dopo
 * ogni annullamento `activated_at` torna NULL, quindi cinque drink versati
 * lasciano un token in stato `purchased` SENZA ALCUNA TRACCIA — ed e'
 * esattamente il predicato con cui il rimborso seleziona.
 *
 * PERCHE' STA NEL REPOSITORY invece che negli appunti di una sessione. La v1.5
 * ha imparato questa lezione a sue spese (`42-LAB.md`): una ricetta senza
 * attrezzi si esegue una volta sola. E serve due volte:
 *
 *   1. PRIMA di `DRK-04`, per provare che il difetto esiste — fatto il
 *      2026-08-19, referto in `.planning/v1.6-47-PROBE.md`;
 *   2. DOPO `DRK-04`, dove le stesse righe devono dire il CONTRARIO:
 *      `activated_at` sopravvive all'annullamento e le attivazioni si contano.
 *      Le sezioni 4 e 5 invece devono restare identiche — sono le controprove,
 *      e una riparazione che le rompesse sarebbe un peggioramento.
 *
 * QUESTA MISURA HA UNA SCADENZA. Dopo `DRK-04` il comportamento vecchio non e'
 * piu' osservabile: non e' rimandabile, e' irripetibile.
 *
 * USO — mai contro la produzione, solo contro un laboratorio usa-e-getta
 * costruito con `lab-bootstrap.mjs` e misurato con `lab-fidelity.mjs`:
 *
 *   LAB_PROJECT_REF=<ref> SUPABASE_ACCESS_TOKEN=<token> \
 *     node scripts/probe-drink-token-cycle.mjs
 */
const PRODUCTION_REF = "cjsfocnhfzycbbgkwocx";
const REF = process.env.LAB_PROJECT_REF;
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
if (!REF || !TOKEN) { console.error("servono LAB_PROJECT_REF e SUPABASE_ACCESS_TOKEN"); process.exit(2); }
if (REF === PRODUCTION_REF) { console.error("RIFIUTO: e' il ref di PRODUZIONE."); process.exit(2); }

async function q(sql) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: sql }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`HTTP ${res.status} ${JSON.stringify(body).slice(0, 300)}`);
  return body;
}
const one = (r) => (Array.isArray(r) && r.length ? r[0] : null);
let fail = 0;
function check(label, got, want) {
  const ok = String(got) === String(want);
  if (!ok) fail++;
  console.log(`   ${ok ? "OK " : "!! "} ${label}: ${got}${ok ? "" : `  (atteso ${want})`}`);
}

// ── fixture ────────────────────────────────────────────────────────────────
console.log("\n1 · fixture");
await q(`
  delete from drink_tokens where drink_name = 'PROBE-47';
  delete from drink_orders where sumup_checkout_id like 'PROBE-47%';
`).catch(() => {});
const ev = one(await q(`
  insert into events (title, slug, date, description)
  values ('PROBE-47', 'probe-f0-' || substr(gen_random_uuid()::text,1,8), current_date + 1, 'probe')
  returning id
`));
const ord = one(await q(`
  insert into drink_orders (event_id, total_amount, status, sumup_checkout_id, items)
  values ('${ev.id}', 5.00, 'completed', 'PROBE-47-' || substr(gen_random_uuid()::text,1,8), '[]'::jsonb)
  returning id
`));
const tok = one(await q(`
  insert into drink_tokens (order_id, event_id, drink_name, price, status)
  values ('${ord.id}', '${ev.id}', 'PROBE-47', 5.00, 'purchased')
  returning id, status, activated_at
`));
console.log(`   token ${tok.id}  status=${tok.status}  activated_at=${tok.activated_at}`);

// ── il ciclo: attiva → annulla, ripetuto ───────────────────────────────────
console.log("\n2 · il ciclo attiva -> annulla, cinque giri (il barista versa fra i due)");
for (let giro = 1; giro <= 5; giro++) {
  await q(`select activate_drink_token('${tok.id}')`);
  const a = one(await q(`select status, activated_at from drink_tokens where id='${tok.id}'`));
  await q(`select deactivate_drink_token('${tok.id}')`);
  const d = one(await q(`select status, activated_at from drink_tokens where id='${tok.id}'`));
  console.log(`   giro ${giro}: attivo(status=${a.status}, activated_at=${a.activated_at ? "valorizzato" : "NULL"})`
            + ` -> annullato(status=${d.status}, activated_at=${d.activated_at === null ? "NULL" : d.activated_at})`);
  if (giro === 5) {
    check("dopo cinque drink lo stato e'", d.status, "purchased");
    check("la traccia dell'attivazione e'", d.activated_at, "null");
  }
}

// ── il token e' selezionabile per il rimborso ──────────────────────────────
console.log("\n3 · il selettore del cron di rimborso — .eq('status','purchased')");
const r = one(await q(`select count(*)::int as n from drink_tokens where id='${tok.id}' and status='purchased'`));
check("il token bevuto cinque volte e' rimborsabile", r.n, 1);

// ── controprova: NON si puo' servire due volte ─────────────────────────────
console.log("\n4 · controprova — servire due volte");
await q(`select activate_drink_token('${tok.id}')`);
const s1 = one(await q(`select redeem_drink_token('${tok.id}') as applied`));
const s2 = one(await q(`select redeem_drink_token('${tok.id}') as applied`));
check("primo serve", s1.applied, "true");
check("secondo serve (false = non ha fatto nulla)", s2.applied, "false");

// ── controprova: dopo il serve, annullare e' rifiutato ─────────────────────
console.log("\n5 · controprova — annullare dopo il serve");
let refused = "no";
try { await q(`select deactivate_drink_token('${tok.id}')`); }
catch (e) { refused = /cannot be deactivated/i.test(e.message) ? "si" : `errore diverso: ${e.message.slice(0,120)}`; }
check("il database rifiuta l'annullamento di un token servito", refused, "si");

const finale = one(await q(`select status, activated_at is not null as ha_traccia from drink_tokens where id='${tok.id}'`));
console.log(`\n   stato finale: ${finale.status}, traccia dell'attivazione: ${finale.ha_traccia}`);

console.log(fail === 0 ? "\nTUTTE LE ASSERZIONI CONFERMATE\n" : `\n${fail} ASSERZIONI FALLITE\n`);
process.exit(fail === 0 ? 0 : 1);
