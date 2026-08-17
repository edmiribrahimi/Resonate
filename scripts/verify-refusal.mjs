#!/usr/bin/env node
// READ-ONLY BY CONSTRUCTION — before it contacts anything, this file reads its
// OWN source and refuses to start if a write verb appears in a live line. The
// code that backs the claim is thirty lines below, ABOVE the docblock, so that
// a `head -5` sees the claim and a reader sees the check before the prose.

import { createClient } from "@supabase/supabase-js";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { liveLines } from "./lib/comments.mjs";

const HERE = fileURLToPath(import.meta.url);
const ROOT = resolve(dirname(HERE), "..");

/** A refusal is not a failure: it means the measurement did not happen. */
function refuse(message) {
  console.log(`\n  FATAL: ${message}\n`);
  process.exit(2);
}

/* ────────────────────────────────────────────────────────────────────────────
 * THE SELF-CHECK — it runs before the environment is read and before any
 * client exists, because a guarantee asserted after the act is a description.
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * The five verbs that would make this instrument something other than a read.
 *
 * They are stored as bare words and the call shape is BUILT from them at run
 * time, so the literal sequence never appears in this file's live source. A
 * check that matched its own pattern list would refuse on itself and the only
 * way out would be to widen it — which is how a gate stops being one.
 */
const WRITE_VERBS = ["insert", "update", "upsert", "delete", "rpc"];

/** `insert` → the call shape, assembled so it is never written out. */
function writeCallOf(verb) {
  return "." + verb + "(";
}

function selfCheck() {
  const read = liveLines(HERE);
  if (read.unterminated) {
    refuse(
      "this file's own comments do not close (a " +
        `${read.unterminated.kind} span opened at line ${read.unterminated.lineNo}), so its ` +
        "source could not be read for write verbs.\n" +
        "       The read-only guarantee could not be established. Nothing was measured."
    );
  }

  const hits = [];
  read.lines.forEach((line, index) => {
    for (const verb of WRITE_VERBS) {
      if (line.includes(writeCallOf(verb))) {
        hits.push(`line ${index + 1} — ${verb}`);
      }
    }
  });

  if (hits.length > 0) {
    refuse(
      `this instrument's own source carries ${hits.length} write verb(s):\n` +
        `       ${hits.join("\n       ")}\n` +
        "       It declares itself read-only and it is not. It will not run.\n" +
        "       (`ai-engineering.md`, gate una rimozione si fa per chiave: the whole reason\n" +
        "       this project writes read-only instruments is that the Phase 36 incident cost\n" +
        "       63 production rows, and no snapshot brought them back.)"
    );
  }
}

/**
 * verify-refusal.mjs — the instrument that signs in as a REAL ROLE and records
 * what the row-level policies do to a subject holding none of their keys.
 *
 * WHAT IT ASSERTS, in one sentence: **for every table declared below, an
 * entitled session reads rows and an unentitled signed-in session reads none —
 * and where the entitled session reads nothing, the row REFUSES rather than
 * reporting a pass.**
 *
 * ── WHAT A GREEN DOES NOT MEAN (cosa un verde NON significa) ────────────────
 *
 * Read this before quoting an exit code at anybody.
 *
 *   - **IT PROVES A REFUSAL ON THE READ PATH, ON THE TABLES LISTED BELOW, WITH
 *     THE ROLES LISTED BELOW, AT THE MOMENT IT RAN.** Not a class of tables,
 *     not a class of roles, and not a moment since.
 *   - **IT PROVES NOTHING ABOUT WRITES.** Every call it makes is a count. The
 *     absence of a write policy on the production tables is a separate decision
 *     with its own paragraph in `20260815120100_production_calendar_access.sql`,
 *     and this file does not test it.
 *   - **IT CANNOT CLOSE SUCCESS CRITERION 1.** See the closing paragraph — this
 *     is not a caveat, it is the phase's own decision (D-45-03) and the reason
 *     the criterion is closed by structural evidence and a written procedure.
 *   - **IT IS NOT A TEST RUN.** There is no test runner in this repository
 *     (`CLAUDE.md` Guardrail 1). This is one command, run by hand, once, after
 *     an authorisation.
 *
 * ── WHY IT EXISTS, WHICH IS A MEASURED GAP AND NOT A PREFERENCE ─────────────
 *
 * Nothing in this repository can authenticate as a role. Every catalogue gate —
 * `rls-baseline.mjs`, `verify-capabilities.mjs` — reaches the database through
 * the Management API, which connects as a role that **bypasses RLS**. That is
 * precisely why Phase 44's criterion 4 could prove the six policies EXIST and
 * never that they REFUSE. `44-VERIFICATION.md` says so in its own words.
 *
 * This file is the first refusal evidence this project has ever had.
 *
 * ── THE FOUR DISCIPLINES ────────────────────────────────────────────────────
 *
 *   1. **READ-ONLY BY CONSTRUCTION, CHECKED AGAINST ITS OWN SOURCE.** The
 *      service key is used for exactly three things — minting a link, resolving
 *      one member profile, and signing the sessions out — and never for a read
 *      of a production table. The self-check above runs first.
 *
 *   2. **THE ASSERTION IS A PAIR, PER TABLE, AND NEVER A SINGLE VALUE.**
 *      Measured, and this is the trap the pair exists for: `anon` and
 *      `authenticated` hold table-level `arwdDxtm` on every `production_*`
 *      table, so an unentitled read is **not** a `42501`. It passes the
 *      privilege check, meets the policy, matches nothing, and returns **HTTP
 *      200 with an empty array**. On a table holding zero rows the entitled
 *      answer and the unentitled answer are byte-identical. So the positive
 *      control is mandatory, and when the positive control is silent the row
 *      REFUSES and the process exits 2 — the measurement did not happen. It is
 *      never reported as a pass. `probe-forged-identity.sh:44-46`: *a probe that
 *      has never been shown to fire proves nothing.*
 *
 *   3. **EVERY MINTED SESSION IS REVOKED GLOBALLY, AND THE REVOCATION IS
 *      RE-READ.** A token that outlives the run is a live session nobody opened,
 *      on a real person's identity. `docs/36-13-v3/revoke.mjs` is the pattern:
 *      sign out globally, then ask the auth API whether the token still resolves
 *      and print the answer. Assumed revocation is not revocation.
 *
 *   4. **IT PRINTS NO TOKEN, NO EMAIL AND NO ROW.** Role words, table names,
 *      counts and outcomes only. The member's address is resolved at run time
 *      and never printed. A refusal probe that printed a row would be printing
 *      exactly the material the policies exist to hold — and `.planning/` is
 *      tracked and this repository is PUBLIC (`CLAUDE.md` Guardrail 5), so this
 *      transcript will one day be pasted into a document that ships.
 *
 * ── WHY IT IS NOT IN `npm run verify` ──────────────────────────────────────
 *
 * It is declared in `scripts/verify-all.mjs` under `NEEDS_AUTHORISATION` and is
 * never spawned there. Minting a session on a real person's identity is an
 * **act**, and in this project an act needs a dated authorisation that is spent
 * once (`ai-engineering.md`, *gate l'autorizzazione a scrivere in produzione e'
 * un atto*). A precondition a script can satisfy for itself is a precondition;
 * a permission is not.
 *
 * ── EXIT CODES ─────────────────────────────────────────────────────────────
 *
 * `0` the pair held on every row · `1` FAILED — an unentitled subject read a
 * row · `2` REFUSED, and nothing was measured on at least one row. **A 2 on an
 * empty table is the correct outcome, not a defect to repair.**
 */

/* ────────────────────────────────────────────────────────────────────────────
 * THE TARGETS — a declared constant, so a later phase adds a ROW and not a
 * script.
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * `{ section, tables[] }`, one entry per production section.
 *
 * Today it holds one section: the calendar, with the six `production_*` tables
 * whose SELECT policies `20260815120100_production_calendar_access.sql` created.
 * The three authored sections of Phase 45 join it as three more entries **when
 * their tables exist** — not before. A table named here that the database does
 * not carry is a REFUSAL for its row: not a pass, and not a failure.
 *
 * Five of the six carry zero rows today; `production_pipeline_rule` carries the
 * sixteen rows saying which pieces a format owes. That is why five rows of this
 * run are expected to refuse and one is expected to discriminate — and why the
 * expectation is written here rather than discovered by somebody reading a red.
 */
const SECTION_TARGETS = [
  {
    section: "calendar",
    note: "the fourth section (D-45-04). Six tables, one SELECT policy each, every qual asking the same key today",
    tables: [
      "production_plan",
      "production_piece",
      "production_commitment",
      "production_checklist_item",
      "production_import_run",
      "production_pipeline_rule",
    ],
  },
];

/** Every table this run will touch, flattened once. */
const ALL_TARGET_TABLES = SECTION_TARGETS.flatMap((entry) =>
  entry.tables.map((table) => ({ section: entry.section, table }))
);

/* ────────────────────────────────────────────────────────────────────────────
 * The dry form — prints the contract and mints nothing
 * ──────────────────────────────────────────────────────────────────────────── */

const DISCIPLINES = [
  "read-only by construction, checked against this file's own source before anything else runs",
  "the assertion is a PAIR per table; a silent positive control REFUSES (exit 2) and never passes",
  "every minted session is revoked globally, and the revocation is re-read rather than assumed",
  "no token, no email and no row is printed — roles, table names, counts and outcomes only",
];

function printContract() {
  console.log("");
  console.log("verify-refusal — what the production policies do to a signed-in subject");
  console.log("               holding none of their keys.");
  console.log("");
  console.log("  0 = the pair held  ·  1 = FAILED  ·  2 = REFUSED, and nothing was measured.");
  console.log("  A refusal is not a failure, and a 2 on an empty table is the honest outcome.");
  console.log("");
  console.log("  ── the declared targets ───────────────────────────────────────────────");
  console.log("");
  for (const entry of SECTION_TARGETS) {
    console.log(`    section: ${entry.section}`);
    console.log(`      ${entry.note}`);
    for (const table of entry.tables) console.log(`      · ${table}`);
  }
  console.log("");
  console.log("  ── the four disciplines ───────────────────────────────────────────────");
  console.log("");
  DISCIPLINES.forEach((line, index) => console.log(`    ${index + 1}. ${line}`));
  console.log("");
  console.log("  ── the subjects ───────────────────────────────────────────────────────");
  console.log("");
  console.log("    master      the positive control — holds the key");
  console.log("    member      the refusal — a real auth.uid(), a real profile, no grant");
  console.log("    anonymous   the floor — the anon key and no session at all");
  console.log("");
}

if (process.argv.includes("--help") || process.argv.includes("-h")) {
  selfCheck();
  printContract();
  console.log("  Nothing was contacted. This form mints no session and reads no table.");
  console.log("  To run it for real, obtain the owner's dated authorisation first, then:");
  console.log("      npm run verify:refusal");
  console.log("");
  process.exit(0);
}

/* ────────────────────────────────────────────────────────────────────────────
 * The environment
 * ──────────────────────────────────────────────────────────────────────────── */

selfCheck();
printContract();

const envFile = `${ROOT}/.env.local`;
if (existsSync(envFile)) {
  try {
    process.loadEnvFile(envFile);
  } catch (error) {
    refuse(`.env.local exists but could not be parsed: ${error.message}. Nothing was measured.`);
  }
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MASTER_EMAIL = process.env.MASTER_EMAIL;

const missing = [];
if (!SUPABASE_URL) missing.push("NEXT_PUBLIC_SUPABASE_URL");
if (!ANON_KEY) missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
if (!SERVICE_KEY) missing.push("SUPABASE_SERVICE_ROLE_KEY");
if (!MASTER_EMAIL) missing.push("MASTER_EMAIL");
if (missing.length > 0) {
  refuse(
    `missing environment variable(s): ${missing.join(", ")}.\n` +
      "       Set them in .env.local (gitignored) or in the environment. Nothing was measured."
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * The clients
 * ──────────────────────────────────────────────────────────────────────────── */

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/**
 * The anonymous floor. **It never performs an auth call that could give it a
 * session**, and that is not tidiness: `verifyOtp` sets the session on the
 * client that made it even with `persistSession: false`, and supabase-js
 * attaches an in-memory session to every subsequent request. A floor client
 * that had exchanged a token would silently be reading as that user, and the
 * "anon" column of the table below would be a second copy of the "member"
 * column wearing another name. Every exchange therefore happens on a throwaway
 * client (`mintSession`), and this one only ever reads.
 */
const anonymous = createClient(SUPABASE_URL, ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/** A PostgREST client bound to one minted session. Never a service client. */
function clientForSession(accessToken) {
  return createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

/**
 * Mint a session for one address, without a password existing anywhere.
 *
 * `generateLink` with the service client yields a hashed token; `verifyOtp`
 * with the anon client exchanges it for a real session. This is
 * `docs/36-13-v3/mint-session.mjs`'s mechanism, owner-authorised once in
 * Phase 36, reduced to what a PostgREST read needs: the browser-cookie encoding
 * of that script's step 4 is not reproduced here, because this instrument
 * drives no browser.
 *
 * The address is a parameter and is never logged.
 */
async function mintSession(email, roleWord) {
  const link = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (link.error) {
    return {
      roleWord,
      session: null,
      why: `generateLink refused: ${link.error.status ?? "?"} ${link.error.code ?? ""} ${link.error.message}`,
    };
  }

  const hashedToken = link.data?.properties?.hashed_token;
  if (!hashedToken) {
    return { roleWord, session: null, why: "generateLink returned no hashed token" };
  }

  // A throwaway client for the exchange — see the note on `anonymous` above.
  const exchanger = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const verified = await exchanger.auth.verifyOtp({ token_hash: hashedToken, type: "email" });
  if (verified.error) {
    return {
      roleWord,
      session: null,
      why: `verifyOtp refused: ${verified.error.status ?? "?"} ${verified.error.code ?? ""} ${verified.error.message}`,
    };
  }

  const session = verified.data?.session;
  if (!session?.access_token) {
    return { roleWord, session: null, why: "verifyOtp returned no session" };
  }

  return { roleWord, session, why: "" };
}

/**
 * `{ count, missingTable, why }` for one table under one client.
 *
 * `head: true` with an exact count is a HEAD request: it returns a number and
 * never a row, which is the only shape compatible with discipline 4.
 *
 * On an error, `error.code` and `error.message` travel and **the whole error
 * object never does** (D-45-18). PostgREST puts the failing row in
 * `error.details`, and what this run could leak through that field is exactly
 * the material the six policies exist to hold.
 */
async function countRows(client, table) {
  const result = await client.from(table).select("id", { count: "exact", head: true });
  if (result.error) {
    const code = result.error.code ?? "";
    const absent = code === "PGRST205" || code === "42P01";
    return {
      count: null,
      missingTable: absent,
      why: `${code} ${result.error.message}`,
    };
  }
  return { count: result.count ?? 0, missingTable: false, why: "" };
}

/* ────────────────────────────────────────────────────────────────────────────
 * The run
 * ──────────────────────────────────────────────────────────────────────────── */

/** The report is buffered so the VERDICT can be its first line. */
const report = [];
const say = (line = "") => report.push(line);

/** 0 passed · 1 FAILED · 2 REFUSED. Only ever raised, never lowered. */
let exitCode = 0;
function raise(code) {
  if (code === 1) exitCode = 1;
  else if (code === 2 && exitCode === 0) exitCode = 2;
}

const minted = [];

console.log("  ── minting ────────────────────────────────────────────────────────────");
console.log("");

/* ── the positive control: master ─────────────────────────────────────────── */

const master = await mintSession(MASTER_EMAIL, "master");
if (!master.session) {
  refuse(
    `the positive control could not be minted — ${master.why}\n` +
      "       Without an entitled session every count below would be indistinguishable from\n" +
      "       a broken query. Nothing was measured."
  );
}
minted.push(master);
console.log("    master      session minted");

/* ── the refusal: one member, resolved at run time and never printed ──────── */

const memberLookup = await admin
  .from("profiles")
  .select("id, email, created_at")
  .eq("role", "member")
  .order("created_at", { ascending: true })
  .limit(1);

if (memberLookup.error) {
  console.log("    member      lookup refused");
  await revokeAll();
  refuse(
    `the member lookup refused: ${memberLookup.error.code ?? ""} ${memberLookup.error.message}\n` +
      "       Nothing was measured."
  );
}

const memberRow = memberLookup.data?.[0];
if (!memberRow?.email) {
  console.log("    member      no member profile resolved");
  await revokeAll();
  refuse(
    "no member profile could be resolved, so no unentitled signed-in subject exists to\n" +
      "       refuse. Nothing was measured."
  );
}

console.log("    member      one member profile resolved");

const member = await mintSession(memberRow.email, "member");
if (!member.session) {
  console.log("    member      session could not be minted");
  await revokeAll();
  refuse(`the member session could not be minted — ${member.why}\n       Nothing was measured.`);
}
minted.push(member);
console.log("    member      session minted");
console.log("    anonymous   no session — the anon key alone");
console.log("");

/* ── the pair, per table ──────────────────────────────────────────────────── */

const masterClient = clientForSession(master.session.access_token);
const memberClient = clientForSession(member.session.access_token);

say("  ── the pair, per table ────────────────────────────────────────────────");
say("");
say(`    ${"table".padEnd(28)} ${"master".padStart(7)} ${"member".padStart(7)} ${"anon".padStart(6)}  outcome`);

let refusedRows = 0;
let discriminatingRows = 0;

for (const { section, table } of ALL_TARGET_TABLES) {
  const control = await countRows(masterClient, table);
  const subject = await countRows(memberClient, table);
  const floor = await countRows(anonymous, table);

  const show = (measure) => (measure.count === null ? "—" : String(measure.count));

  let outcome;
  if (control.missingTable) {
    outcome = "REFUSED — the table does not exist yet";
    refusedRows += 1;
    raise(2);
  } else if (control.count === null) {
    outcome = `REFUSED — the control could not read: ${control.why}`;
    refusedRows += 1;
    raise(2);
  } else if (control.count === 0) {
    outcome = "REFUSED — the positive control is silent, so the measurement did not happen";
    refusedRows += 1;
    raise(2);
  } else if (subject.count === null) {
    outcome = `REFUSED — the subject could not read: ${subject.why}`;
    refusedRows += 1;
    raise(2);
  } else if (subject.count > 0) {
    outcome = "FAILED — an unentitled signed-in subject read rows";
    raise(1);
  } else if (floor.count !== null && floor.count > 0) {
    outcome = "FAILED — the anonymous floor read rows";
    raise(1);
  } else {
    outcome = "pair held — entitled reads, unentitled reads nothing";
    discriminatingRows += 1;
  }

  say(
    `    ${table.padEnd(28)} ${show(control).padStart(7)} ${show(subject).padStart(7)} ${show(floor).padStart(6)}  ${outcome}`
  );
  say(`      section: ${section}`);
}

say("");
say("  ── the count ──────────────────────────────────────────────────────────");
say("");
say(`    rows declared                  ${String(ALL_TARGET_TABLES.length).padStart(3)}`);
say(`    rows where the pair held       ${String(discriminatingRows).padStart(3)}`);
say(`    rows REFUSED — not measured    ${String(refusedRows).padStart(3)}`);

/* ── revocation, verified ─────────────────────────────────────────────────── */

async function revokeAll() {
  for (const entry of minted) {
    if (!entry.session) continue;
    const token = entry.session.access_token;
    const signedOut = await admin.auth.admin.signOut(token, "global");
    const reread = await anonymous.auth.getUser(token);
    const stillResolves = Boolean(reread.data?.user);
    const line =
      `    ${entry.roleWord.padEnd(10)} ` +
      (signedOut.error
        ? `signOut refused: ${signedOut.error.status ?? "?"} ${signedOut.error.message}`
        : "signed out globally") +
      ` · token still resolves to a user: ${stillResolves}`;
    if (report.length > 0) say(line);
    else console.log(line);
    if (stillResolves) raise(1);
  }
}

say("");
say("  ── revocation, re-read rather than assumed ────────────────────────────");
say("");
await revokeAll();

/* ────────────────────────────────────────────────────────────────────────────
 * The verdict, printed FIRST so a scrollback read from the top cannot look
 * green when nothing was measured.
 * ──────────────────────────────────────────────────────────────────────────── */

console.log("");
if (exitCode === 1) {
  console.log("  ══ VERDICT: FAILED — a subject read what it should not have. ══");
} else if (exitCode === 2) {
  console.log(
    `  ══ VERDICT: REFUSED — ${refusedRows} of ${ALL_TARGET_TABLES.length} rows measured NOTHING. ══\n` +
      "     This is not a pass and it is not a defect to repair: on a table holding zero\n" +
      "     rows the entitled answer and the unentitled answer are identical, so the pair\n" +
      "     cannot discriminate and the honest report is that the measurement did not\n" +
      "     happen. Re-running it will not change that. Importing the calendar will."
  );
} else {
  console.log("  ══ VERDICT: the pair held on every declared row. ══");
}
console.log("");

for (const line of report) console.log(line);

/* ── the closing paragraph, mandatory ─────────────────────────────────────── */

console.log("");
console.log("  ── what this instrument CANNOT close ──────────────────────────────────");
console.log("");
console.log(
  "    Success criterion 1 — *a viewer holding one section is refused the others*.\n" +
    "    Under D-45-03 all three new section keys go to master AND organizer, and the\n" +
    "    calendar key goes to the same two roles. **No subject exists in production for\n" +
    "    whom that refusal happens**, and D-45-23 forbids fabricating one. This run\n" +
    "    therefore says nothing about criterion 1, and a reader must not let its exit\n" +
    "    code stand in for one.\n" +
    "\n" +
    "    What CAN be proven, and it is a different sentence, is that **the policies ask\n" +
    "    different keys** — read from `pg_policies`, through the Management API, which is\n" +
    "    a catalogue read and not a session. Today that sentence is not yet true either:\n" +
    "    all six calendar policies ask ONE key, because the split of D-45-04 has not been\n" +
    "    applied. It becomes measurable after that migration, and this instrument is\n" +
    "    built before the split precisely so the split has a baseline to be compared\n" +
    "    against."
);
console.log("");

process.exit(exitCode);
