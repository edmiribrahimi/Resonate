#!/usr/bin/env node
/**
 * verify-section-export.mjs — D-45-17's and D-45-21's structural proof: what the
 * export path reads, and what it demonstrably cannot reach.
 *
 * WHAT IT ASSERTS, in one sentence: **no module the two export documents reach
 * can query a table that holds an address or an unannounced date, and no edge
 * exists in the catalogue between the scouting tables and the one public road to
 * an address.**
 *
 * ── WHAT A GREEN DOES NOT MEAN (cosa un verde NON significa) ────────────────
 *
 *   - **HALF ONE IS A STRING ASSERTION OVER SOURCE.** It walks TypeScript
 *     imports and reads query strings. It does not execute a query, it cannot
 *     follow a table name held in a variable or assembled at run time, and it is
 *     blind to a raw SQL string handed to a remote procedure. There is no test
 *     runner in this repository (`CLAUDE.md` Guardrail 1) and this is not one.
 *   - **HALF TWO READS THE CATALOGUE THROUGH A ROLE THAT BYPASSES RLS.** It can
 *     therefore prove that **no road exists**. It proves **nothing whatever
 *     about who may walk one** — that is `scripts/verify-refusal.mjs`'s question
 *     and procedure P1's, and neither of them is this file.
 *   - **AND AN ABSENCE PROVED TODAY IS AN ABSENCE PROVED TODAY.** A view added
 *     tomorrow is a road added tomorrow. This is a gate to run again, not a
 *     certificate to file.
 *
 * ── THE TWO HALVES, AND WHY THEY ARE ONE FILE ──────────────────────────────
 *
 * D-45-17 says the export *«cannot carry an address or an unannounced date
 * because it does not read those tables»*, and D-45-21 says the scouting rows
 * must not be reachable through `public.venue_for_parties`, the one public road
 * to an address. Those are the same sentence read from two ends: one asks what
 * the code reaches, the other asks what the database connects. Split across two
 * files, the second would be the one nobody runs.
 *
 * **Half one — the closure walk.** `verify-conversion.mjs:792-824` is the only
 * import-closure walk in this repository, and the discipline copied here with it
 * is the one written at `:795-799`: **the walk passes THROUGH a file it does not
 * check rather than stopping at it.** Stopping would hide any module a surface
 * reaches only by way of another, which is a narrowing in the direction that
 * produces a green.
 *
 * **Half two — the reachability census.** `45-PATTERNS.md` § No Analog Found #1
 * measured that nothing in this repository reads `pg_constraint` / `pg_views` /
 * `pg_proc` and asserts that a named table has no edge into a named public road.
 * `rls-baseline.mjs` censuses policies, `verify-capabilities.mjs` censuses keys
 * and grants; neither censuses reachability. This half is new work, and its
 * expectation is **pre-registered** in the shape of
 * `verify-capabilities.mjs:190-200` — written here rather than read off the
 * thing being checked, because a check that derives its expectation from its
 * subject cannot fail.
 *
 * ── THE LOCATION SECTION HAS NO EXPORT, AND THIS IS WHERE THAT IS STRUCTURAL ─
 *
 * D-45-21 consequence 2: the manifesto and the capitolato leave the perimeter;
 * the location section never does. So there are **two** entry files and there is
 * no third, the two scouting tables are on the forbidden list, and a module
 * named after the location section appearing in the export directory is a
 * FAILURE BY NAME rather than a third document the walk would quietly accept.
 * That check runs even when the entry files do not exist, because the day
 * somebody adds one is the day it must fire.
 *
 * ── EXIT CODES ─────────────────────────────────────────────────────────────
 *
 * `0` passed · `1` FAILED · `2` REFUSED, and a refusal is not a failure: it
 * means the measurement did not happen. **The two refusals are reported
 * separately and by cause** — a missing entry file and a missing credential are
 * different states with different next steps, and a runner that collapsed them
 * would tell a reader to go and look in the wrong place. A FAILURE outranks a
 * refusal: a measurement that happened beats one that did not
 * (`verify-all.mjs`, WR-01).
 *
 * SECRECY. `.planning/` is tracked and this repository is PUBLIC (`CLAUDE.md`
 * Guardrail 5). This gate prints table names, column names, file paths and
 * constraint names. It prints **no row**, and the census queries the catalogue
 * only — never the data.
 *
 * Zero dependencies. Node built-ins only, ESM.
 */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { liveLinesFrom } from "./lib/comments.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/* ════════════════════════════════════════════════════════════════════════════
 * HALF ONE — the source, offline
 * ════════════════════════════════════════════════════════════════════════════ */

/**
 * The two documents that leave the perimeter, and nothing else.
 *
 * The manifesto goes to whoever plays; the capitolato goes to the external
 * designer. Both are exit routes by design, which is why their narrowness has to
 * be a property something checks rather than a habit of whoever wrote the query.
 */
const ENTRY_FILES = [
  "src/lib/production/export/manifesto.ts",
  "src/lib/production/export/capitolato.ts",
];

/** The directory the entry files live in — watched for a third document. */
const EXPORT_DIR = "src/lib/production/export";

/**
 * The section that has no export, spelled so the failure names it.
 *
 * D-45-21 consequence 2. A file whose name begins with this in the export
 * directory fails this gate by name — the location section's content does not
 * leave the perimeter, and a module that offered to carry it would be a decision
 * taken in a filename.
 */
const SECTION_WITHOUT_EXPORT = "location";

/**
 * What each entry module must name — check C, the positive half.
 *
 * `verify-conversion.mjs:75` and `probe-forged-identity.sh:44-46` both record
 * the same lesson and it is the reason this list exists: **a check that has
 * never been shown to fire proves nothing.** Checks A and B are negative, and a
 * negative-only assertion goes green on a file whose query somebody deleted — or
 * on a file that is empty. This one fails in that case.
 *
 * Per `45-RESEARCH.md` §E2. The capitolato also reads the palette, but it reads
 * it out of the token stylesheet at run time (D-45-09) rather than out of a
 * table, so there is no third name here and there must not be one.
 */
const DECLARED_READS = {
  "src/lib/production/export/manifesto.ts": ["production_section", "formats"],
  "src/lib/production/export/capitolato.ts": ["production_section"],
};

/** The service client. An export that bypasses a policy can carry another section's rows. */
const SERVICE_CLIENT = "@/lib/supabase/service";

/** The one public road to an address, named here so a call to it is a failure. */
const PUBLIC_ROAD = "venue_for_parties";

/* ── the forbidden list, DERIVED and not typed ───────────────────────────── */

/**
 * The column names that make a table dangerous to an export.
 *
 * An address is the payload D-45-24 admitted into the product; an unannounced
 * date is the payload the calendar holds. A table carrying either is a table the
 * export must not reach, whoever adds it and whenever.
 */
const DANGEROUS_COLUMN_RE = /^(address|venue[a-z_]*|date|start_time)$/i;

/** Where the schema is declared. Both, and the second is not optional — see below. */
const SQL_SOURCES = ["supabase/migrations", "supabase/schema.sql"];

/**
 * The pre-registered baseline of the DERIVED list, measured 2026-08-17.
 *
 * Nine tables, each carrying at least one dangerous column. Written down so the
 * list can be compared rather than admired: **a derived list that SHRANK is a
 * finding**, because the two ways it shrinks are a table being dropped and the
 * parser quietly failing to read a file — and the second prints a shorter list
 * with the same confident face.
 *
 * If this trips, look at the schema, not at this constant.
 */
const DERIVED_BASELINE = [
  "event_parties",
  "events",
  "production_commitment",
  "production_piece",
  "production_plan",
  "production_space",
  "rsvps",
  "tickets",
  "venues",
];

/**
 * The names forbidden by DECISION rather than by a column, with the reason each.
 *
 * The derivation covers a table that carries an address or a date. It does not
 * cover a table that carries neither and is forbidden anyway, and four are:
 * three belong to the calendar section, whose rows are internal plans, and one is
 * the scouting attribute table, whose rows describe a space under negotiation
 * without ever naming a street.
 *
 * They are pinned rather than derived, and saying so is the point: a pinned name
 * is a decision somebody made, a derived name is a fact about the schema, and a
 * reader is owed the difference.
 */
const PINNED = [
  ["production_checklist_item", "the calendar section's rows — an internal plan, not a document"],
  ["production_import_run", "the calendar section's import ledger"],
  ["production_space_attribute", "scouting — D-45-21 consequence 2, the section with no export"],
  ["production_visual_asset", "the visual section's own assets, which are not the capitolato"],
];

/* ── reading source ───────────────────────────────────────────────────────── */

/** Refusals, collected rather than exited on, so both causes can be printed. */
const refusals = [];

const liveCache = new Map();

/** One file's live source — comments blanked by the one stripper. */
function liveSource(rel) {
  const cached = liveCache.get(rel);
  if (cached !== undefined) return cached;
  const raw = readFileSync(join(ROOT, rel), "utf8").split("\n");
  const { lines, unterminated } = liveLinesFrom(raw);
  if (unterminated !== null) {
    refusals.push({
      cause: "unreadable source",
      detail:
        `${rel} opens a ${unterminated.kind} comment on line ${unterminated.lineNo} that ` +
        "never closes. This gate cannot tell that file's comments from its code, so it " +
        "measured nothing about it",
    });
  }
  const joined = lines.join("\n");
  liveCache.set(rel, joined);
  return joined;
}

/* ── the closure walk, lifted from verify-conversion.mjs:770-824 ─────────── */

const NAMED_IMPORT_RE = /\bimport\s+([^;'"]*?)\s*from\s*['"]([^'"]+)['"]/g;
const REEXPORT_RE = /\bexport\s+([^;'"]*?)\s*from\s*['"]([^'"]+)['"]/g;
const SIDE_EFFECT_IMPORT_RE = /\bimport\s*['"]([^'"]+)['"]/g;
const DYNAMIC_IMPORT_RE = /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

const RESOLVE_EXTENSIONS = [".ts", ".tsx", ".mjs", ".js"];
const NON_CODE_SUFFIXES = [".css", ".json", ".svg", ".png", ".jpg", ".jpeg", ".webp", ".avif", ".ico"];

function isLocalSpecifier(spec) {
  return spec.startsWith("@/") || spec.startsWith("./") || spec.startsWith("../");
}

function isNonCodeSpecifier(spec) {
  return NON_CODE_SUFFIXES.some((suffix) => spec.endsWith(suffix));
}

function resolveSpecifier(spec, fromRel) {
  let base;
  if (spec.startsWith("@/")) {
    base = `src/${spec.slice(2)}`;
  } else if (spec.startsWith("./") || spec.startsWith("../")) {
    const dir = fromRel.split("/").slice(0, -1).join("/");
    base = resolve(`/${dir}`, spec).slice(1);
  } else {
    return null;
  }
  for (const ext of RESOLVE_EXTENSIONS) {
    if (existsSync(join(ROOT, `${base}${ext}`))) return `${base}${ext}`;
  }
  for (const ext of RESOLVE_EXTENSIONS) {
    if (existsSync(join(ROOT, `${base}/index${ext}`))) return `${base}/index${ext}`;
  }
  if (existsSync(join(ROOT, base)) && RESOLVE_EXTENSIONS.some((e) => base.endsWith(e))) {
    return base;
  }
  return null;
}

function localSpecifiers(rel) {
  const source = liveSource(rel);
  const specs = [];
  for (const re of [NAMED_IMPORT_RE, REEXPORT_RE]) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(source)) !== null) specs.push(m[2]);
  }
  for (const re of [SIDE_EFFECT_IMPORT_RE, DYNAMIC_IMPORT_RE]) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(source)) !== null) specs.push(m[1]);
  }
  return specs.filter(isLocalSpecifier);
}

/**
 * The transitive closure from one entry, and every specifier it could not resolve.
 *
 * **The walk passes THROUGH every module it reaches and stops at none of them.**
 * There is no exclusion list here and there must not be one: a module excluded
 * from the checks would still be a module the export reaches, and the whole
 * claim being made is about what is reachable.
 *
 * An unresolved specifier is REPORTED rather than swallowed. A walk that quietly
 * stops at a name it could not resolve is a walk that reports a green over a
 * closure it silently narrowed.
 */
function importClosure(entryRel) {
  const reached = new Set();
  const unresolved = [];
  const queue = [entryRel];

  while (queue.length > 0) {
    const rel = queue.shift();
    if (reached.has(rel)) continue;
    reached.add(rel);

    for (const spec of localSpecifiers(rel)) {
      if (isNonCodeSpecifier(spec)) continue;
      const target = resolveSpecifier(spec, rel);
      if (target === null) {
        unresolved.push({ from: rel, spec });
        continue;
      }
      if (!reached.has(target)) queue.push(target);
    }
  }

  return { reached: [...reached].sort(), unresolved };
}

/* ── the derivation ───────────────────────────────────────────────────────── */

const CREATE_TABLE_RE = /create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?([a-z_]+)\s*\(/gi;
const ADD_COLUMN_RE =
  /alter\s+table\s+(?:if\s+exists\s+)?(?:public\.)?([a-z_]+)\s+add\s+column\s+(?:if\s+not\s+exists\s+)?([a-z_]+)/gi;

/** Every `.sql` file that declares schema. */
function sqlFiles() {
  const out = [];
  for (const entry of SQL_SOURCES) {
    const abs = join(ROOT, entry);
    if (!existsSync(abs)) {
      refusals.push({
        cause: "missing schema source",
        detail: `${entry} is not on disk, so the forbidden list could not be derived from it`,
      });
      continue;
    }
    if (statSync(abs).isDirectory()) {
      for (const name of readdirSync(abs)) if (name.endsWith(".sql")) out.push(join(abs, name));
    } else {
      out.push(abs);
    }
  }
  return out.sort();
}

/** A `.sql` file with its `--` comment lines blanked. */
function liveSql(abs) {
  return readFileSync(abs, "utf8")
    .split("\n")
    .map((line) => (line.trimStart().startsWith("--") ? "" : line))
    .join("\n");
}

/**
 * The forbidden list, **derived from** the declared schema rather than typed.
 *
 * A seventh production table added next year is covered the moment it declares a
 * column that carries an address or a date, without anybody remembering to come
 * back here — which is the only version of this list that stays true.
 *
 * **Two sources, and the second is why this reads more than the migrations.**
 * `CLAUDE.md` Guardrail 3 is right that RLS lives in the migrations; the base
 * tables do not. `public.events` is declared in `supabase/schema.sql` and
 * nowhere else, and it carries a date. A derivation that read only the migration
 * directory would omit the single most obvious table on the list and print a
 * confident nine-name summary of it.
 *
 * **And it reads `ALTER TABLE ... ADD COLUMN` as well as `CREATE TABLE`**, for
 * the same reason and it was the same measurement: `public.event_parties` is
 * created without a date, a venue reference or a start time, and acquires all
 * three later. Reading only the create statement missed it entirely.
 */
function deriveForbidden() {
  const byTable = new Map();

  for (const abs of sqlFiles()) {
    const sql = liveSql(abs);

    CREATE_TABLE_RE.lastIndex = 0;
    let m;
    while ((m = CREATE_TABLE_RE.exec(sql)) !== null) {
      const table = m[1];
      let depth = 0;
      let end = sql.length;
      for (let i = m.index + m[0].length - 1; i < sql.length; i += 1) {
        if (sql[i] === "(") depth += 1;
        else if (sql[i] === ")") {
          depth -= 1;
          if (depth === 0) {
            end = i;
            break;
          }
        }
      }
      for (const line of sql.slice(m.index + m[0].length, end).split("\n")) {
        const word = line.trim().split(/[\s(,]/)[0];
        if (!DANGEROUS_COLUMN_RE.test(word)) continue;
        const cols = byTable.get(table) ?? new Set();
        cols.add(word);
        byTable.set(table, cols);
      }
    }

    ADD_COLUMN_RE.lastIndex = 0;
    let a;
    while ((a = ADD_COLUMN_RE.exec(sql)) !== null) {
      if (!DANGEROUS_COLUMN_RE.test(a[2])) continue;
      const cols = byTable.get(a[1]) ?? new Set();
      cols.add(a[2]);
      byTable.set(a[1], cols);
    }
  }

  return byTable;
}

/* ── the checks of half one ───────────────────────────────────────────────── */

const failures = [];

function fail(check, where, detail) {
  failures.push({ check, where, detail });
}

const derived = deriveForbidden();
const derivedNames = [...derived.keys()].sort();
const forbidden = new Set([...derivedNames, ...PINNED.map(([name]) => name)]);

/* ── D — the derived list did not shrink ─────────────────────────────────── */

const lost = DERIVED_BASELINE.filter((name) => !derived.has(name));
if (lost.length > 0) {
  fail(
    "D",
    "the derivation",
    `${lost.join(", ")} were derived on 2026-08-17 and are not derived now. A list that ` +
      "shrank is a finding: either the table was dropped, or this parser stopped reading a " +
      "file and is printing a shorter list with the same face"
  );
}

/* ── the third document, checked whether or not the entries exist ────────── */

if (existsSync(join(ROOT, EXPORT_DIR))) {
  for (const name of readdirSync(join(ROOT, EXPORT_DIR))) {
    if (!name.toLowerCase().startsWith(SECTION_WITHOUT_EXPORT)) continue;
    fail(
      "A",
      `${EXPORT_DIR}/${name}`,
      "the location section has no export (D-45-21 consequence 2). Its content does not " +
        "leave the perimeter, and a module in this directory named after it is that " +
        "decision being reversed in a filename"
    );
  }
}

/* ── the entries themselves ───────────────────────────────────────────────── */

const presentEntries = ENTRY_FILES.filter((rel) => existsSync(join(ROOT, rel)));
const absentEntries = ENTRY_FILES.filter((rel) => !existsSync(join(ROOT, rel)));

if (absentEntries.length > 0) {
  refusals.push({
    cause: "missing entry file",
    detail:
      `${absentEntries.length} of ${ENTRY_FILES.length} export modules are not on disk:\n` +
      absentEntries.map((rel) => `           · ${rel}`).join("\n") +
      "\n           Checks A, B, C and E are scoped to them, so NOTHING WAS MEASURED about " +
      "what the\n           export reads. They land in plan 45-16; until then this refusal " +
      "is the honest state\n           and a zero here would be a green over an absence.",
  });
}

const closures = new Map();
for (const entry of presentEntries) closures.set(entry, importClosure(entry));

/** Every `.from("<name>")` in a module, in either quote. */
function tablesQueriedIn(rel) {
  const source = liveSource(rel);
  const out = [];
  const re = /\.from\(\s*["'`]([a-z_]+)["'`]\s*\)/gi;
  let m;
  while ((m = re.exec(source)) !== null) out.push(m[1]);
  return out;
}

for (const entry of presentEntries) {
  const { reached, unresolved } = closures.get(entry);

  /* A — the closure reaches nothing forbidden */
  for (const rel of reached) {
    for (const table of tablesQueriedIn(rel)) {
      if (!forbidden.has(table)) continue;
      fail(
        "A",
        rel,
        `queries ${table}, and ${entry} reaches this module. ` +
          (derived.has(table)
            ? `${table} is on the derived list because it carries ${[...derived.get(table)].sort().join(", ")}`
            : `${table} is pinned: ${PINNED.find(([n]) => n === table)[1]}`)
      );
    }
    if (liveSource(rel).includes(PUBLIC_ROAD)) {
      fail(
        "A",
        rel,
        `names ${PUBLIC_ROAD} — the one public road to an address — and ${entry} reaches it`
      );
    }
    if (liveSource(rel).includes(SERVICE_CLIENT)) {
      /* E — no service client anywhere in the closure */
      fail(
        "E",
        rel,
        `imports ${SERVICE_CLIENT}, and ${entry} reaches it. An export that bypasses the ` +
          "policy of the section it exports is an export that can carry another section's rows"
      );
    }
  }

  for (const { from, spec } of unresolved) {
    fail(
      "A",
      from,
      `the specifier ${spec} could not be resolved, so the walk stopped there. A closure ` +
        "with a hole in it is a closure this gate cannot make a claim about"
    );
  }

  /* B — the entry module itself queries nothing forbidden */
  for (const table of tablesQueriedIn(entry)) {
    if (forbidden.has(table)) {
      fail("B", entry, `queries ${table} directly`);
    }
  }

  /* C — the positive half: the entry names its own tables */
  for (const table of DECLARED_READS[entry] ?? []) {
    if (!tablesQueriedIn(entry).includes(table)) {
      fail(
        "C",
        entry,
        `does not query ${table}, which it is declared to read. This is the POSITIVE half: ` +
          "checks A and B are negative and would both go green on a module whose query " +
          "somebody deleted, or on an empty file"
      );
    }
  }
}

/* ════════════════════════════════════════════════════════════════════════════
 * HALF TWO — the reachability census, catalogue, credentials required
 * ════════════════════════════════════════════════════════════════════════════ */

/**
 * The scouting tables, and the tables that stand on the public road.
 *
 * `public.venue_for_parties` walks `event_parties → events → venues` and reads
 * nothing else (`20260810161000_venues_read_narrowed.sql:371-397`). So the
 * question this census asks is narrow and answerable: **does any edge exist from
 * the road's three tables into either scouting table, or from any view or
 * function that names both?**
 */
const SCOUTING_TABLES = ["production_space", "production_space_attribute"];
const ROAD_TABLES = ["venues", "events", "event_parties"];

/**
 * ── The pre-registered expectation ────────────────────────────────────────
 *
 * Written here rather than read back off the catalogue, for the reason
 * `verify-capabilities.mjs:190-200` and `rls-baseline.mjs:113-130` both state: a
 * check that reads its expectation off the thing it is checking cannot fail.
 *
 * **One edge is expected, by name, and its DIRECTION is the whole reason it is
 * safe.** `production_space.promoted_venue_id → venues` points OUTWARD: scouting
 * to venues, recorded when a space is acquired and a venue row is created for it
 * (D-45-10). The road walks the other way — parties to events to venues — and
 * never arrives at scouting. **Its presence is a pass and its absence is a
 * finding**, because an absence means the promotion path was removed or renamed
 * and this expectation was not read.
 *
 * Everything else is expected to be empty: no foreign key from the road's tables
 * into scouting, no view in `public` naming both, no function in `public` naming
 * both. If a promotion function is ever added, it is declared here **by name**
 * before it is written — not discovered by this gate going red and somebody
 * widening the query.
 */
const EXPECTED_EDGE = {
  table: "production_space",
  column: "promoted_venue_id",
  references: "venues",
  why: "the promotion act, pointing outward; the road never traverses it",
};

/** No function in `public` may name both sides. None is expected today. */
const EXPECTED_BRIDGE_FUNCTIONS = [];

/** The census, as one SQL string. Catalogue only — it reads no row of any table. */
const CENSUS_SQL = `
  with scouting(name) as (values ${SCOUTING_TABLES.map((t) => `('${t}')`).join(", ")}),
       road(name) as (values ${ROAD_TABLES.map((t) => `('${t}')`).join(", ")})
  select 'fk_into_scouting' as finding,
         c.conname as name,
         src.relname as detail,
         tgt.relname as other
    from pg_constraint c
    join pg_class src on src.oid = c.conrelid
    join pg_class tgt on tgt.oid = c.confrelid
   where c.contype = 'f'
     and src.relname in (select name from road)
     and tgt.relname in (select name from scouting)
  union all
  select 'fk_out_of_scouting', c.conname, src.relname, tgt.relname
    from pg_constraint c
    join pg_class src on src.oid = c.conrelid
    join pg_class tgt on tgt.oid = c.confrelid
   where c.contype = 'f'
     and src.relname in (select name from scouting)
     and tgt.relname in (select name from road)
  union all
  select 'view_naming_both', v.viewname, v.schemaname, ''
    from pg_views v
   where v.schemaname = 'public'
     and exists (select 1 from scouting s where v.definition like '%' || s.name || '%')
     and exists (select 1 from road r where v.definition like '%' || r.name || '%')
  union all
  select 'function_naming_both', p.proname, n.nspname, ''
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and exists (select 1 from scouting s where pg_get_functiondef(p.oid) like '%' || s.name || '%')
     and exists (select 1 from road r where pg_get_functiondef(p.oid) like '%' || r.name || '%')
`;

const MANAGEMENT_API = "https://api.supabase.com";

async function runCensus() {
  const envFile = join(ROOT, ".env.local");
  if (existsSync(envFile)) {
    try {
      process.loadEnvFile(envFile);
    } catch (error) {
      refusals.push({
        cause: "missing credentials",
        detail: `.env.local exists but could not be parsed: ${error.message}`,
      });
      return null;
    }
  }

  const token = process.env.SUPABASE_ACCESS_TOKEN;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const missing = [];
  if (!token) missing.push("SUPABASE_ACCESS_TOKEN");
  if (!url) missing.push("NEXT_PUBLIC_SUPABASE_URL");

  if (missing.length > 0) {
    refusals.push({
      cause: "missing credentials",
      detail:
        `${missing.join(", ")} ${missing.length === 1 ? "is" : "are"} not set, so ` +
        "NOTHING ABOUT REACHABILITY WAS MEASURED.\n" +
        "           That is this half's honest state on any machine that does not hold the\n" +
        "           credentials — a worktree has no `.env.local`, which is gitignored and\n" +
        "           lives in the main checkout — and IT IS NOT A PASS. The absence of a road\n" +
        "           has not been enumerated; it has merely not been looked for.",
    });
    return null;
  }

  let projectRef;
  try {
    projectRef = new URL(url).hostname.split(".")[0];
  } catch {
    refusals.push({
      cause: "missing credentials",
      detail: "NEXT_PUBLIC_SUPABASE_URL is not a URL, so the project could not be reached",
    });
    return null;
  }

  const response = await fetch(
    `${MANAGEMENT_API}/v1/projects/${projectRef}/database/query`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query: CENSUS_SQL, read_only: true }),
    }
  );
  const body = await response.text();
  if (!response.ok) {
    refusals.push({
      cause: "the catalogue did not answer",
      detail: `the Management API returned HTTP ${response.status}. Nothing was measured`,
    });
    return null;
  }
  try {
    return JSON.parse(body);
  } catch {
    refusals.push({
      cause: "the catalogue did not answer",
      detail: "the Management API response was not JSON. Nothing was measured",
    });
    return null;
  }
}

/* ════════════════════════════════════════════════════════════════════════════
 * The run
 * ════════════════════════════════════════════════════════════════════════════ */

console.log("");
console.log("verify-section-export — what the export reaches, and what the catalogue connects");
console.log("");
console.log("  0 = passed  ·  1 = FAILED  ·  2 = REFUSED, and nothing was measured.");
console.log("");

console.log("  ── the forbidden list, derived from the declared schema ──────────────");
console.log("");
for (const name of derivedNames) {
  console.log(`    ${name.padEnd(30)} ${[...derived.get(name)].sort().join(", ")}`);
}
console.log("");
console.log("  ── and the names pinned by decision, which no column would give ──────");
console.log("");
for (const [name, why] of PINNED) console.log(`    ${name.padEnd(30)} ${why}`);
console.log("");
console.log(
  `    ${derivedNames.length} derived  ·  ${PINNED.length} pinned  ·  ${forbidden.size} forbidden in total`
);
console.log("");

console.log("  ── half one: the closure ─────────────────────────────────────────────");
console.log("");
if (presentEntries.length === 0) {
  console.log("    no entry module is on disk — the walk had nothing to start from.");
} else {
  for (const entry of presentEntries) {
    const { reached } = closures.get(entry);
    console.log(`    ${entry}`);
    console.log(`      reaches ${reached.length} module(s)`);
  }
}
console.log("");

const census = await runCensus();

console.log("  ── half two: the reachability census ─────────────────────────────────");
console.log("");
if (census === null) {
  console.log("    not measured — see the refusals below.");
} else {
  const rows = Array.isArray(census) ? census : [];
  const outward = rows.filter((r) => r.finding === "fk_out_of_scouting");
  const expected = outward.some(
    (r) => r.detail === EXPECTED_EDGE.table && r.other === EXPECTED_EDGE.references
  );

  if (!expected) {
    fail(
      "census",
      `${EXPECTED_EDGE.table}.${EXPECTED_EDGE.column}`,
      `the ONE expected edge is absent — ${EXPECTED_EDGE.why}. Its absence means the ` +
        "promotion path was removed or renamed and this expectation was not read with it. " +
        "That is a finding, not a cleaner result"
    );
  }

  for (const row of rows) {
    if (row.finding === "fk_out_of_scouting") continue;
    fail(
      "census",
      `${row.detail}.${row.name}`,
      `${row.finding} — an edge between scouting and the public road to an address`
    );
  }

  console.log(`    ${rows.length} catalogue row(s) matched the census.`);
  console.log(
    `    the one expected edge (${EXPECTED_EDGE.table}.${EXPECTED_EDGE.column} → ` +
      `${EXPECTED_EDGE.references}) was ${expected ? "present" : "ABSENT"}.`
  );
  console.log(
    `    functions declared as bridges: ${
      EXPECTED_BRIDGE_FUNCTIONS.length === 0 ? "none, and none is expected" : EXPECTED_BRIDGE_FUNCTIONS.join(", ")
    }.`
  );
}
console.log("");

if (failures.length > 0) {
  console.log("  ── findings ──────────────────────────────────────────────────────────");
  console.log("");
  for (const f of failures) console.log(`    ✗ ${f.check}  ${f.where}\n        ${f.detail}`);
  console.log("");
}

if (refusals.length > 0) {
  console.log("  ── refusals, by cause, because the two are not the same state ────────");
  console.log("");
  for (const r of refusals) console.log(`    ⊘ ${r.cause}\n         ${r.detail}\n`);
}

if (failures.length > 0) {
  console.log(
    `  SECTION_EXPORT_FAIL — ${failures.length} finding(s). A measurement that happened ` +
      "outranks one that did not, so this exits 1 even with a refusal above.\n"
  );
  process.exit(1);
}

if (refusals.length > 0) {
  console.log(
    "  SECTION_EXPORT_REFUSED — nothing was measured for the causes listed above, and a\n" +
      "  refusal is not a failure. It is also not a pass: no green here has been earned.\n"
  );
  process.exit(2);
}

console.log("  SECTION_EXPORT_OK — the closure is clean and the census found no road.");
console.log(
  "\n  And the sentence that has to travel with that: this census reads STRUCTURE, through\n" +
    "  the Management API, with a role that BYPASSES RLS. It proves no road exists. It\n" +
    "  proves nothing whatever about who may walk one — that is verify-refusal.mjs's\n" +
    "  question, and procedure P1's, and neither of them is this file.\n"
);
process.exit(0);
