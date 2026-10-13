#!/usr/bin/env node
/**
 * lab-apply-migration.mjs — applica UNA migration al LABORATORIO, mai alla
 * produzione. Il rifiuto del ref di produzione e' la prima cosa eseguita.
 *
 * Uso:
 *   set -a; source .env.local; source .env.lab.local; set +a
 *   node scripts/lab-apply-migration.mjs supabase/migrations/<file>.sql [tabella.colonna ...]
 *
 * Dopo l'applicazione rilegge il catalogo (read_only) per ogni tabella.colonna
 * passata e stampa tipo, nullabilita' e default: la prova che la colonna c'e'.
 * Non tocca schema.sql, non registra nulla nel bootstrap: una migration nuova
 * entra nel laboratorio da qui e in produzione dalla stessa POST, su
 * autorizzazione del proprietario (precedente: quick 2026-10-05).
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
if (REF === PRODUCTION_REF) {
  console.error("RIFIUTO: LAB_PROJECT_REF e' il ref di PRODUZIONE. Questo script non gira contro la produzione, mai.");
  process.exit(2);
}

const [file, ...columns] = process.argv.slice(2);
if (!file) {
  console.error("uso: lab-apply-migration.mjs <migration.sql> [tabella.colonna ...]");
  process.exit(2);
}

const api = (path, init) =>
  fetch(`https://api.supabase.com/v1/projects/${REF}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json", ...(init?.headers || {}) },
  });
const query = async (sql, label, readOnly = false) => {
  const res = await api("/database/query", {
    method: "POST",
    body: JSON.stringify({ query: sql, read_only: readOnly }),
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`${label}: HTTP ${res.status} ${body.slice(0, 600)}`);
  return body;
};

const sql = readFileSync(file, "utf8");
const name = basename(file).replace(/\.sql$/, "");
await query(sql, `migration ${name}`);
console.log(`applicata: ${name} → laboratorio ${REF}`);
for (const col of columns) {
  const [table, column] = col.split(".");
  if (!table || !column || !/^[a-z_]+$/.test(table) || !/^[a-z_]+$/.test(column)) {
    console.error(`colonna malformata: ${col} (atteso tabella.colonna, minuscole e underscore)`);
    process.exit(2);
  }
  const out = await query(
    `select column_name, data_type, is_nullable, column_default from information_schema.columns where table_schema='public' and table_name='${table}' and column_name='${column}'`,
    `catalogo ${col}`,
    true
  );
  console.log(`${col}: ${out}`);
}
