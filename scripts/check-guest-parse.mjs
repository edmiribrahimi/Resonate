#!/usr/bin/env node
/**
 * check-guest-parse — a pure check of a pure module (DBT-20, plan 52.1-04).
 *
 * ── WHAT THIS IS NOT ─────────────────────────────────────────────────────────
 *
 * **This is not a test runner, and it is not a test suite.** `CLAUDE.md`,
 * Environment Guardrail 1: the product has no test runner, and nothing here
 * changes that. This script imports ONE module that has no imports of its own,
 * feeds it the eight lines the plan names, and compares what comes back. It
 * does not enter `npm run verify`, and a green here does not say that the
 * «Add several» box works: it says that a pasted line is read the same way
 * every time. The walk with fifteen lines on the lab is P-521-B.
 *
 * ── HOW IT LOADS A .ts FILE WITHOUT A BUILD ──────────────────────────────────
 *
 * Node strips type annotations on its own (type stripping, on by default since
 * Node 23.6). That only works for ERASABLE syntax — no `enum`, no `namespace`,
 * no parameter properties — which is a constraint on the module, declared in
 * its own docblock.
 *
 * Exit 0 = eight `ok` (plus one extra on the numbering). Exit 1 = the first
 * `FAIL`, with what was expected. The fixtures use `example.com` and
 * placeholder names only: `.planning/` and this repo are public.
 */
import { deepStrictEqual } from "node:assert";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const modulePath = resolve(
  here,
  "../src/app/(admin)/admin/events/[id]/guest-list/parse-guest-lines.ts"
);

let mod;
try {
  mod = await import(pathToFileURL(modulePath).href);
} catch (err) {
  console.error(`FAIL module not loadable: ${modulePath}`);
  console.error(`     ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
}

const { parseGuestLine, parseGuestLines } = mod;

const cases = [
  {
    name: "name, comma, email",
    run: () => parseGuestLine("Mario Rossi, mario@example.com", 1),
    expect: {
      kind: "guest",
      line: 1,
      raw: "Mario Rossi, mario@example.com",
      fullName: "Mario Rossi",
      email: "mario@example.com",
    },
  },
  {
    name: "name, space, email",
    run: () => parseGuestLine("Mario Rossi mario@example.com", 2),
    expect: {
      kind: "guest",
      line: 2,
      raw: "Mario Rossi mario@example.com",
      fullName: "Mario Rossi",
      email: "mario@example.com",
    },
  },
  {
    name: "name only",
    run: () => parseGuestLine("Mario Rossi", 3),
    expect: {
      kind: "guest",
      line: 3,
      raw: "Mario Rossi",
      fullName: "Mario Rossi",
      email: null,
    },
  },
  {
    name: "email only -> name_missing",
    run: () => parseGuestLine("mario@example.com", 4),
    expect: {
      kind: "unparsed",
      line: 4,
      raw: "mario@example.com",
      reason: "name_missing",
    },
  },
  {
    name: "two emails -> two_emails",
    run: () => parseGuestLine("Mario, a@example.com, b@example.com", 5),
    expect: {
      kind: "unparsed",
      line: 5,
      raw: "Mario, a@example.com, b@example.com",
      reason: "two_emails",
    },
  },
  {
    name: "list prefix, angle brackets, upper case",
    run: () => parseGuestLine("3. Anna Bianchi <ANNA@Example.com>", 6),
    expect: {
      kind: "guest",
      line: 6,
      raw: "3. Anna Bianchi <ANNA@Example.com>",
      fullName: "Anna Bianchi",
      email: "anna@example.com",
    },
  },
  {
    name: "blank and whitespace-only lines",
    run: () => [parseGuestLine("", 7), parseGuestLine("   \t ", 8)],
    expect: [{ kind: "blank" }, { kind: "blank" }],
  },
  {
    name: "@ token failing addGuest's regex -> bad_email",
    run: () => parseGuestLine("Luca Verdi, luca@example", 9),
    expect: {
      kind: "unparsed",
      line: 9,
      raw: "Luca Verdi, luca@example",
      reason: "bad_email",
    },
  },
];

let failed = false;
for (const c of cases) {
  try {
    deepStrictEqual(c.run(), c.expect);
    console.log(`ok   ${c.name}`);
  } catch (err) {
    console.error(`FAIL ${c.name}`);
    console.error(`     ${err instanceof Error ? err.message : String(err)}`);
    failed = true;
    break;
  }
}

// parseGuestLines numbers from 1 and keeps blank lines in place. Not one of the
// plan's eight cases: it guards the line numbers the preview prints.
if (!failed) {
  try {
    const out = parseGuestLines("Mario Rossi\r\n\nmario@example.com");
    deepStrictEqual(
      out.map((p) => (p.kind === "blank" ? "blank" : `${p.kind}:${p.line}`)),
      ["guest:1", "blank", "unparsed:3"]
    );
    console.log("ok   parseGuestLines numbering (extra)");
  } catch (err) {
    console.error("FAIL parseGuestLines numbering (extra)");
    console.error(`     ${err instanceof Error ? err.message : String(err)}`);
    failed = true;
  }
}

process.exit(failed ? 1 : 0);
