#!/usr/bin/env node
/**
 * lab-apply-migration.mjs — applica UNA migration al LABORATORIO, mai alla
 * produzione. Il rifiuto del ref di produzione e' la prima cosa eseguita:
 * prima della lettura degli argomenti e prima di ogni chiamata di rete.
 *
 * Uso:
 *   set -a; source .env.local; source .env.lab.local; set +a
 *   node scripts/lab-apply-migration.mjs supabase/migrations/<file>.sql [tabella.colonna ...]
 *
 * L'ENDPOINT CHE ANNOTA IL REGISTRO (D-53-03, D-53-07, 2026-10-14).
 * Il corpo della migration passa da `POST /database/migrations` della
 * Management API, con `name` = nome del file senza `.sql`: e' l'endpoint che
 * annota la migration in `supabase_migrations.schema_migrations`. Fino alla
 * fase 53 questo script applicava con `/database/query`, che NON annota il
 * registro — ed e' cosi' che le due migration della 52.4 sono entrate in
 * produzione: il registro di produzione potrebbe non annotarle (non
 * verificato; lo rilegge in sola lettura il piano 53-11). `/database/query`
 * resta qui SOLO per le riletture, sempre con `read_only: true`.
 *
 * Il registro si legge due volte, in sola lettura:
 *   - PRIMA: se il nome e' gia' annotato, rifiuta senza applicare
 *     (`already_registered`, exit 2) — una migration che toglie oggetti,
 *     rimandata, fallirebbe a meta' (precedente in lab-bootstrap.mjs).
 *   - DOPO: stampa `name` e `version` della riga nuova; se la riga manca,
 *     `not_registered`, exit 1 — l'applicazione non ha lasciato traccia.
 *
 * Categorie d'errore, tutte distinguibili e tutte con exit non zero:
 *   [lab-apply-migration.bad_name]           nome del file fuori forma (2)
 *   [lab-apply-migration.registry_read_failed] lettura del registro rifiutata (1)
 *   [lab-apply-migration.already_registered] nome gia' annotato (2)
 *   [lab-apply-migration.apply_failed]       HTTP non 2xx da /database/migrations (1)
 *   [lab-apply-migration.not_registered]     applicata ma assente dal registro (1)
 *   [lab-apply-migration.bad_column]         argomento tabella.colonna malformato (2)
 *   [lab-apply-migration.catalogue_read_failed] lettura del catalogo rifiutata (1)
 *
 * In PRODUZIONE la stessa POST la fa il piano 53-11, dopo l'autorizzazione del
 * proprietario — MAI questo script, che rifiuta il ref di produzione.
 * Dopo l'applicazione rilegge il catalogo (read_only) per ogni tabella.colonna
 * passata e stampa tipo, nullabilita' e default: la prova che la colonna c'e'.
 * Non tocca schema.sql e non tocca il bootstrap.
 */
import { readFileSync } from "node:fs";
import { basename } from "node:path";

const PRODUCTION_REF = "cjsfocnhfzycbbgkwocx";
const REF = process.env.LAB_PROJECT_REF;
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
if (!REF || !TOKEN) {
  console.error("LAB_PROJECT_REF o SUPABASE_ACCESS_TOKEN assenti.");
  process.exit(2);
}
if (REF.trim() === PRODUCTION_REF) {
  console.error("RIFIUTO: LAB_PROJECT_REF e' il ref di PRODUZIONE. Questo script non gira contro la produzione, mai.");
  process.exit(2);
}

const [file, ...columns] = process.argv.slice(2);
if (!file) {
  console.error("uso: lab-apply-migration.mjs <migration.sql> [tabella.colonna ...]");
  process.exit(2);
}

const name = basename(file).replace(/\.sql$/, "");
if (!/^[0-9]{14}_[a-z0-9_]+$/.test(name)) {
  console.error(`[lab-apply-migration.bad_name] ${name}: atteso <14 cifre>_<minuscole, cifre, underscore>`);
  process.exit(2);
}
const sql = readFileSync(file, "utf8");

const api = (path, init) =>
  fetch(`https://api.supabase.com/v1/projects/${REF}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json", ...(init?.headers || {}) },
  });

// Solo letture: read_only e' fisso a true, non e' un parametro.
const readOnly = async (text) => {
  const res = await api("/database/query", {
    method: "POST",
    body: JSON.stringify({ query: text, read_only: true }),
  });
  const body = await res.text();
  return { ok: res.ok, status: res.status, body };
};

// `name` e' gia' validato dalla regex qui sopra: l'interpolazione non puo'
// chiudere la stringa SQL.
const REGISTRY_SQL = `select name, version from supabase_migrations.schema_migrations where name = '${name}'`;
const readRegistry = async (moment) => {
  const r = await readOnly(REGISTRY_SQL);
  if (!r.ok) {
    console.error(`[lab-apply-migration.registry_read_failed] ${moment}: HTTP ${r.status} ${r.body.slice(0, 600)}`);
    process.exit(1);
  }
  return JSON.parse(r.body);
};

// 1. Registro PRIMA: un nome gia' annotato non si rimanda.
const before = await readRegistry("prima dell'applicazione");
if (before.length > 0) {
  console.error(
    `[lab-apply-migration.already_registered] ${name} e' gia' annotata nel registro del laboratorio (version ${before[0].version}). Non applico.`
  );
  process.exit(2);
}

// 2. Applicazione dall'endpoint che annota il registro.
const res = await api("/database/migrations", {
  method: "POST",
  body: JSON.stringify({ name, query: sql }),
});
if (!res.ok) {
  const body = await res.text();
  console.error(`[lab-apply-migration.apply_failed] ${name}: HTTP ${res.status} ${body.slice(0, 600)}`);
  process.exit(1);
}
console.log(`applicata: ${name} → laboratorio (POST /database/migrations)`);

// 3. Registro DOPO: la riga nuova deve esserci.
const after = await readRegistry("dopo l'applicazione");
if (after.length === 0) {
  console.error(`[lab-apply-migration.not_registered] ${name}: applicata ma assente da supabase_migrations.schema_migrations.`);
  process.exit(1);
}
for (const row of after) console.log(`registro: name=${row.name} version=${row.version}`);

// 4. Catalogo, in sola lettura, per ogni tabella.colonna passata.
for (const col of columns) {
  const [table, column] = col.split(".");
  if (!table || !column || !/^[a-z_]+$/.test(table) || !/^[a-z_]+$/.test(column)) {
    console.error(`[lab-apply-migration.bad_column] ${col} (atteso tabella.colonna, minuscole e underscore)`);
    process.exit(2);
  }
  const out = await readOnly(
    `select column_name, data_type, is_nullable, column_default from information_schema.columns where table_schema='public' and table_name='${table}' and column_name='${column}'`
  );
  if (!out.ok) {
    console.error(`[lab-apply-migration.catalogue_read_failed] ${col}: HTTP ${out.status} ${out.body.slice(0, 600)}`);
    process.exit(1);
  }
  console.log(`${col}: ${out.body}`);
}
