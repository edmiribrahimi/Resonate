#!/usr/bin/env node
/**
 * check-entry-source — a pure check of a pure module (DBT-15, plan 52.1-23).
 *
 * ── WHAT THIS IS NOT ─────────────────────────────────────────────────────────
 *
 * **This is not a test runner, and it is not a test suite.** `CLAUDE.md`,
 * Environment Guardrail 1: the product has no test runner, and nothing here
 * changes that. This script imports ONE module that has no imports of its own,
 * feeds it the cases the plan names, and compares what comes back. It does not
 * enter `npm run verify`, and a green here does not say that an order records
 * where its buyer came from: it says that a link's `utm_source` is reduced to
 * the same five words every time. The walk with real orders on the lab is
 * P-521-G (plan 52.1-26).
 *
 * ── HOW IT LOADS A .ts FILE WITHOUT A BUILD ──────────────────────────────────
 *
 * Node strips type annotations on its own (type stripping, on by default since
 * Node 23.6). That only works for ERASABLE syntax, which is a constraint on the
 * module, declared in its own docblock.
 *
 * Exit 0 = every case `ok`. Exit 1 = the first `FAIL`, with what was expected.
 */
import { deepStrictEqual } from "node:assert";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const modulePath = resolve(here, "../src/lib/tickets/entry-source.ts");

let mod;
try {
  mod = await import(pathToFileURL(modulePath).href);
} catch (err) {
  console.error(`FAIL module not loadable: ${modulePath}`);
  console.error(`     ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
}

const { reduceEntrySource, ENTRY_SOURCES } = mod;

const cases = [
  ["ig", "instagram"],
  ["Instagram", "instagram"],
  ["l.instagram.com", "instagram"],
  ["instagram.com", "instagram"],
  ["newsletter", "newsletter"],
  ["email", "newsletter"],
  ["flyer", "flyer"],
  ["volantino", "flyer"],
  ["QR", "flyer"],
  ["  ig  ", "instagram"],
  [null, "direct"],
  [undefined, "direct"],
  ["", "direct"],
  ["   ", "direct"],
  ["facebook", "other"],
  ["<script>", "other"],
  ["x".repeat(500), "other"],
  [42, "other"],
];

let failed = false;

try {
  deepStrictEqual([...ENTRY_SOURCES], ["instagram", "newsletter", "flyer", "direct", "other"]);
  console.log("ok   ENTRY_SOURCES matches ticket_orders_entry_source_check");
} catch (err) {
  console.error("FAIL ENTRY_SOURCES matches ticket_orders_entry_source_check");
  console.error(`     ${err instanceof Error ? err.message : String(err)}`);
  failed = true;
}

for (const [raw, expect] of failed ? [] : cases) {
  const label = typeof raw === "string" && raw.length > 20 ? `"${raw.slice(0, 8)}…" (${raw.length})` : JSON.stringify(raw) ?? "undefined";
  try {
    deepStrictEqual(reduceEntrySource(raw), expect);
    console.log(`ok   ${label} -> ${expect}`);
  } catch (err) {
    console.error(`FAIL ${label} -> ${expect}`);
    console.error(`     ${err instanceof Error ? err.message : String(err)}`);
    failed = true;
    break;
  }
}

process.exit(failed ? 1 : 0);
