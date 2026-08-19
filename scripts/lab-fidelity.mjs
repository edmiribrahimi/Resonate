/**
 * lab-fidelity.mjs — il laboratorio somiglia alla produzione, o lo e'?
 *
 * LA PROVA CHE UN LABORATORIO E' FEDELE NON E' CHE IL BOOTSTRAP SIA RIUSCITO.
 * Una procedura riuscita descrive cio' che ho fatto; un catalogo uguale descrive
 * cio' che c'e'. Solo il secondo e' una misura — ed e' il confronto dei cataloghi
 * che, il 2026-08-18, ha trovato i tre oggetti che il bootstrap non portava
 * mentre sembrava riuscito.
 *
 * Legge ENTRAMBI i progetti in SOLA LETTURA (`read_only: true`).
 *
 * ── Perche' le funzioni si confrontano PER FIRMA ─────────────────────────────
 * Confrontando i soli NOMI il risultato fu «identici» con 32 contro 31: la
 * produzione ha un overload di `reserve_ticket` che il laboratorio non aveva.
 * Un confronto per nome avrebbe certificato fedele un ambiente in cui il
 * percorso del denaro risolve a una funzione diversa.
 *
 * ── Perche' gli enum si confrontano FUORI da `public` ────────────────────────
 * Il prodotto non ha enum in `public`: i 46 valori stanno in `auth`, `realtime` e
 * `storage`, cioe' sono della piattaforma. La prima versione di questo confronto
 * li cercava in `public` e diceva «identici» con 0 contro 0 — un accordo fra due
 * insiemi vuoti, che non e' una misura. Confrontati dove sono davvero dicono una
 * cosa che serve: che le due piattaforme sono alla stessa versione. La porta
 * dipende da `auth`.
 *
 * USO
 *   LAB_PROJECT_REF=<ref> SUPABASE_ACCESS_TOKEN=<token> node scripts/lab-fidelity.mjs
 */
const PRODUZIONE = "cjsfocnhfzycbbgkwocx";
const LAB = process.env.LAB_PROJECT_REF;
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

if (!LAB || !TOKEN) { console.error("LAB_PROJECT_REF o SUPABASE_ACCESS_TOKEN assenti."); process.exit(2); }
if (LAB === PRODUZIONE) { console.error("RIFIUTO: LAB_PROJECT_REF e' la produzione — non c'e' niente da confrontare."); process.exit(2); }

async function q(ref, sql) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: sql, read_only: true }),
  });
  if (!res.ok) throw new Error(`${ref}: HTTP ${res.status} ${(await res.text()).slice(0, 300)}`);
  return res.json();
}

const CATALOGHI = {
  tabelle:  `select table_name from information_schema.tables
             where table_schema='public' and table_type='BASE TABLE' order by 1`,
  colonne:  `select table_name||'.'||column_name||':'||data_type as c
             from information_schema.columns where table_schema='public' order by 1`,
  policy:   `select schemaname||'.'||tablename||':'||policyname as p
             from pg_policies where schemaname='public' order by 1`,
  rls:      `select relname from pg_class c join pg_namespace n on n.oid=c.relnamespace
             where n.nspname='public' and c.relkind='r' and c.relrowsecurity order by 1`,
  trigger:  `select tgname from pg_trigger where not tgisinternal order by 1`,
  funzioni: `select p.proname||'('||pg_get_function_identity_arguments(p.oid)||')' as f
             from pg_proc p join pg_namespace n on n.oid=p.pronamespace
             where n.nspname='public' order by 1`,
  vincoli:  `select conrelid::regclass::text||':'||conname as v
             from pg_constraint where connamespace='public'::regnamespace order by 1`,
  indici:   `select tablename||':'||indexname as i from pg_indexes
             where schemaname='public' order by 1`,
  enum:     `select n.nspname||'.'||t.typname||':'||e.enumlabel as e from pg_enum e
             join pg_type t on t.oid=e.enumtypid
             join pg_namespace n on n.oid=t.typnamespace order by 1`,
  // I bucket non sono un vezzo: senza, la Prova 8 della fase 35 — l'upload
  // per-notte — non ha dove scrivere, e il fallimento arriva a meta' procedura.
  bucket:   `select id||':'||coalesce(public::text,'?') as b from storage.buckets order by 1`,
};

let divergenti = 0;
for (const [nome, sql] of Object.entries(CATALOGHI)) {
  const [a, b] = await Promise.all([q(PRODUZIONE, sql), q(LAB, sql)]);
  const piatto = (righe) => righe.map((r) => Object.values(r)[0]).sort();
  const A = piatto(a), B = piatto(b);
  const soloProd = A.filter((x) => !B.includes(x));
  const soloLab = B.filter((x) => !A.includes(x));
  const identici = soloProd.length === 0 && soloLab.length === 0;
  if (!identici) divergenti++;
  // Un catalogo vuoto su ENTRAMBI e' un accordo fra due insiemi vuoti: si dice,
  // invece di contarlo come una conferma.
  const vuoto = A.length === 0 && B.length === 0 ? "  (vuoto su entrambi: non e' una conferma)" : "";
  console.log(`${nome.padEnd(9)} prod ${String(A.length).padStart(4)} · lab ${String(B.length).padStart(4)} — ${identici ? "IDENTICI" : "DIVERGONO"}${vuoto}`);
  if (soloProd.length) console.log(`   solo in PRODUZIONE (${soloProd.length}): ${soloProd.slice(0, 15).join(", ")}${soloProd.length > 15 ? " …" : ""}`);
  if (soloLab.length) console.log(`   solo in LABORATORIO (${soloLab.length}): ${soloLab.slice(0, 15).join(", ")}${soloLab.length > 15 ? " …" : ""}`);
}

const n = Object.keys(CATALOGHI).length;
console.log(divergenti === 0
  ? `\nLAB_FEDELE — ${n} cataloghi su ${n} concordano.`
  : `\n${divergenti} catalogo/i divergono — il laboratorio NON e' fedele, e cio' che ci misuri sopra non vale.`);
process.exit(divergenti === 0 ? 0 : 1);
