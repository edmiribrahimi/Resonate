#!/usr/bin/env node
/**
 * verify-routes.mjs — the two route categories `npm run build` cannot see.
 *
 * ── Which half of CAP-02 lives here, and which half lives in the compiler ─────
 *
 * Plan 34-01 put two assertions into `src/lib/routes/capability-routes.ts` and
 * both are carried by `next build`:
 *
 *   forward   a capability key with no entry           `Record<CapabilityKey, Binding>`
 *   backward  a route in the GENERATED union, unbound  `Exclude<StaffRoute, Listed>`
 *
 * Neither can see a `page.tsx` that `typedRoutes` never put in the union.
 * `RouteImpl`'s dynamic arm collapses to `never` when its parameter is `string`,
 * so a bare `Route` contains no dynamic route at all: `/admin/events/[id]/edit`
 * and its eight siblings are invisible to the compiler assertion. And nothing
 * anywhere types `revalidatePath` — the `typedRoutes` augmentation covers
 * `next/link`, `next/navigation` and `next/form`, never `next/cache`.
 *
 * So this script holds the third link of the chain:
 *
 *   1. database ↔ `CAP`        `npm run verify:capabilities`   (needs a database)
 *   2. `CAP` ↔ the map         `next build`                    (two type errors)
 *   3. the map ↔ the disk      THIS SCRIPT                     (two checks below)
 *
 * `34-RESEARCH.md` proposed link 3 as "a module-load `throw` comparing the two
 * sets". That is not writable: the set of files on disk does not exist at module
 * load. A `.mjs` run from the repository root can read the disk. That is the
 * entire reason this half is a script and not a type.
 *
 * **There is no CI in this repository** (D-34-12). This runs when a person runs
 * it.
 *
 * ── Check 1: every statically visible `revalidatePath` names a real address ───
 *
 * `revalidatePath` is the phase's silent-failure category (D-34-16). Measured
 * 2026-08-09: **36** calls name `/admin` or `/organizer`, across six files —
 * sixteen of them in one members action file, ten of them backtick template
 * literals. Its failure mode is a members list that stops refreshing after an
 * approval, in a product with **no error tracking** to report it: nobody is
 * told, and the symptom looks like a stale browser.
 *
 * A call passes when its path is a pattern declared in `CAPABILITY_ROUTES` or a
 * member of PUBLIC_ALLOW below.
 *
 * **This check is EXPECTED TO FAIL at the end of plan 34-08, and that is the
 * point.** The calls naming `/organizer/...` address a tree that no route serves
 * once plan 34-03's redirect lands. The failing list is plan 34-16's worklist.
 * Weakening this script to make the phase green would be worse than the defect.
 *
 * ── Check 2: the route census, which no compiler can perform ─────────────────
 *
 * Every `page.tsx` under `src/app/(admin)` is turned into the address it serves
 * and matched against the map's patterns. A page with no pattern is an error:
 * the middleware resolves `null` for it and must refuse — a staff surface
 * nobody declared is either unreachable or, worse, admitted by a fall-through.
 *
 * **A pattern with no page is NOT an error.** Measured 2026-08-09: 21 pages
 * against 23 `/admin` patterns, and the two extras
 * (`/admin/events/[id]/assignments`, `/admin/events/[id]/review`) arrive from
 * the organizer tree in plan 34-06. A map entry with no page on disk is a plan
 * not yet run.
 *
 * ── This is a PARSE, not an import ───────────────────────────────────────────
 *
 * A `.mjs` cannot import a `.ts`, so the map is read as text. Everything below
 * follows from that, and every consequence is named rather than left to be
 * discovered:
 *
 *   · **A literal outside the `CAPABILITY_ROUTES` object is not a pattern.**
 *     The parse is scoped to the object literal alone — from
 *     `export const CAPABILITY_ROUTES = {` to the `} as const satisfies` that
 *     closes it — and comments inside that slice are blanked before the strings
 *     are read. The file also holds `"/admin"` and `` `/admin/${string}` ``
 *     inside the `StaffRoute` type, and a dozen addresses inside its docblocks.
 *     Collecting one of those by accident would WIDEN the accepted set, turning
 *     a call that should be red into a green one — which is precisely how plan
 *     34-16's worklist would empty itself without anybody fixing a call.
 *     Over-collection here is a silent false green, not a noisy failure, which
 *     is why the slice has both a start and an end and why the decoy proof
 *     exists.
 *
 *   · **A path built by concatenation is invisible.** `"/admin/" + section` is
 *     not a literal and this parse will not see it.
 *
 *   · **A variable argument is invisible.** `revalidatePath(path)` is counted
 *     and reported as skipped, never as passing. The count is printed so the
 *     size of the blind spot is a number rather than an impression.
 *
 *   · **A template literal is normalised, not evaluated.** `` `/events/${slug}` ``
 *     becomes `/events/[*]`, where `[*]` matches exactly one dynamic pattern
 *     segment. It deliberately does NOT match a literal segment: a variable
 *     could hold anything, and accepting it against a literal would accept a
 *     wrong address.
 *
 *   · **The census sees `src/app/(admin)` only.** `/membership-card` and
 *     `/attendance` are bound by the map and live elsewhere — which is exactly
 *     why the map is the whole application's and not `/admin`'s. Routes outside
 *     that one directory are not censused here at all.
 *
 *   · **Route Handlers are out of scope** (D-34-13). `route.ts` files are not
 *     pages and are gated by their own guards, not by a route rule.
 *
 * A green means every statically visible literal names a declared address. It
 * does not mean every `revalidatePath` in this repository is correct.
 *
 * Zero dependencies, Node built-ins only. Exit 1 when either check fails.
 *
 * Usage:  npm run verify:routes
 *         node scripts/verify-routes.mjs --print-patterns
 *
 * `--print-patterns` lists exactly what the slice collected and exits without
 * checking anything. It exists because the count alone cannot tell a reader
 * whether the parse widened: 25 patterns is 25 patterns whether or not one of
 * them came out of a docblock.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const MAP_FILE = join(ROOT, "src/lib/routes/capability-routes.ts");
const SRC_DIR = join(ROOT, "src");
const ADMIN_PAGES_DIR = join(ROOT, "src/app/(admin)");

/** The marker a `${...}` expression becomes. One segment, contents unknown. */
const DYNAMIC = "[*]";

/**
 * Public addresses the map deliberately does not gate, each with the reason it
 * is here. An unexplained allow-list is where a hole hides, so every entry
 * names the file that serves it — verified on disk, 2026-08-09.
 *
 * Only addresses a measured call actually names are listed. An entry no call
 * can reach is a decoration that makes the list look thorough
 * (`.claude/rules/ai-engineering.md`, *un gate deve poter fallire*), so the
 * list grows when a measurement grows it and not before.
 */
const PUBLIC_ALLOW = [
  ["/events", "the public event listing — src/app/(public)/events/page.tsx, ungated"],
  ["/events/[slug]", "the public event page — src/app/(public)/events/[slug]/page.tsx, ungated"],
  ["/artists/[slug]", "the public artist page — src/app/(public)/artists/[slug]/page.tsx, ungated"],
  ["/venues/[slug]", "the public venue page — src/app/(public)/venues/[slug]/page.tsx, ungated"],
  ["/tickets/[id]", "a member's own ticket — src/app/(public)/tickets/[id]/page.tsx, gated by ownership in the page, not by a route rule"],
];

/* ────────────────────────────────────────────────────────────────────────────
 * Comment blanking. Positions are preserved (comments become spaces, newlines
 * survive) so a reported line number is the line in the real file.
 * ──────────────────────────────────────────────────────────────────────────── */

function blankComments(source) {
  const out = source.split("");
  let i = 0;
  const n = source.length;

  while (i < n) {
    const c = source[i];

    // A string, a char literal or a template: skip it whole, so a `//` or a
    // `/*` inside one is never mistaken for a comment.
    if (c === '"' || c === "'" || c === "`") {
      const quote = c;
      i += 1;
      while (i < n) {
        if (source[i] === "\\") {
          i += 2;
          continue;
        }
        if (source[i] === quote) {
          i += 1;
          break;
        }
        i += 1;
      }
      continue;
    }

    if (c === "/" && source[i + 1] === "/") {
      while (i < n && source[i] !== "\n") {
        out[i] = " ";
        i += 1;
      }
      continue;
    }

    if (c === "/" && source[i + 1] === "*") {
      while (i < n && !(source[i] === "*" && source[i + 1] === "/")) {
        if (source[i] !== "\n") out[i] = " ";
        i += 1;
      }
      if (i < n) {
        out[i] = " ";
        out[i + 1] = " ";
        i += 2;
      }
      continue;
    }

    i += 1;
  }

  return out.join("");
}

/* ────────────────────────────────────────────────────────────────────────────
 * The pattern parse — scoped to the object literal, and to nothing else.
 * ──────────────────────────────────────────────────────────────────────────── */

function parseCapabilityPatterns() {
  const source = readFileSync(MAP_FILE, "utf8");

  const startMarker = "export const CAPABILITY_ROUTES = {";
  const endMarker = "} as const satisfies";

  const start = source.indexOf(startMarker);
  if (start === -1) {
    throw new Error(
      `verify-routes: could not find "${startMarker}" in ${MAP_FILE}. ` +
        `The parse, not the map, is broken — fix it here rather than widening the slice.`
    );
  }
  const end = source.indexOf(endMarker, start);
  if (end === -1) {
    throw new Error(
      `verify-routes: could not find "${endMarker}" after the object literal in ${MAP_FILE}. ` +
        `Without an end the slice would run to the end of the file and collect the type's literals.`
    );
  }

  const slice = blankComments(source.slice(start + startMarker.length, end));

  // Only double-quoted literals starting with `/`. The map writes its routes
  // that way; a backtick in this slice would be a `reason:` string, not a route.
  const patterns = [];
  const seen = new Set();
  for (const match of slice.matchAll(/"(\/[^"\n]*)"/g)) {
    const pattern = match[1];
    if (seen.has(pattern)) continue;
    seen.add(pattern);
    patterns.push(pattern);
  }

  if (patterns.length === 0) {
    throw new Error(
      "verify-routes: parsed zero patterns out of CAPABILITY_ROUTES. " +
        "A zero-pattern parse would fail every call and pass no page — refuse rather than report."
    );
  }

  return patterns;
}

/* ────────────────────────────────────────────────────────────────────────────
 * Matching. The same segment walk `resolveRoute` performs, re-expressed here
 * because this is a parse and cannot call it.
 * ──────────────────────────────────────────────────────────────────────────── */

function segments(path) {
  return path.split("/").slice(1);
}

function isDynamicPatternSegment(segment) {
  return segment.startsWith("[");
}

function matches(address, pattern) {
  const a = segments(address);
  const p = segments(pattern);
  if (a.length !== p.length) return false;

  for (let i = 0; i < a.length; i += 1) {
    const actual = a[i];
    const expected = p[i];
    if (actual.length === 0) return false;

    if (isDynamicPatternSegment(expected)) continue;

    // A segment whose value is unknown never matches a literal: it could hold
    // anything, and accepting it would accept a wrong address.
    if (actual === DYNAMIC) return false;
    if (actual !== expected) return false;
  }
  return true;
}

function matchesAny(address, patterns) {
  return patterns.some((pattern) => matches(address, pattern));
}

/* ────────────────────────────────────────────────────────────────────────────
 * Source walk.
 * ──────────────────────────────────────────────────────────────────────────── */

function walkFiles(dir, extensions, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stats = statSync(full);
    if (stats.isDirectory()) {
      walkFiles(full, extensions, out);
      continue;
    }
    if (extensions.some((extension) => entry.endsWith(extension))) out.push(full);
  }
  return out;
}

/**
 * Read the first argument of a `revalidatePath(` call starting at `open`, the
 * index of the `(`.
 *
 * Returns `{ kind: "literal", value, raw }` for a string literal, the same for
 * a template whose expressions become `[*]`, or `{ kind: "opaque", raw }` when
 * the argument is anything else — a variable, a call, a concatenation.
 */
function readFirstArgument(source, open) {
  let i = open + 1;
  while (i < source.length && /\s/.test(source[i])) i += 1;

  const quote = source[i];

  if (quote === '"' || quote === "'") {
    let value = "";
    i += 1;
    while (i < source.length && source[i] !== quote) {
      if (source[i] === "\\") {
        value += source[i + 1];
        i += 2;
        continue;
      }
      value += source[i];
      i += 1;
    }
    return { kind: "literal", value, raw: `${quote}${value}${quote}` };
  }

  if (quote === "`") {
    let value = "";
    let raw = "`";
    i += 1;
    while (i < source.length && source[i] !== "`") {
      if (source[i] === "\\") {
        value += source[i + 1];
        raw += source.slice(i, i + 2);
        i += 2;
        continue;
      }
      if (source[i] === "$" && source[i + 1] === "{") {
        // Skip the expression, tracking brace depth so a nested object or a
        // call with braces does not end it early.
        let depth = 1;
        let j = i + 2;
        while (j < source.length && depth > 0) {
          if (source[j] === "{") depth += 1;
          else if (source[j] === "}") depth -= 1;
          j += 1;
        }
        value += DYNAMIC;
        raw += source.slice(i, j);
        i = j;
        continue;
      }
      value += source[i];
      raw += source[i];
      i += 1;
    }
    return { kind: "literal", value, raw: `${raw}\`` };
  }

  let raw = "";
  while (i < source.length && source[i] !== ")" && source[i] !== ",") {
    raw += source[i];
    i += 1;
  }
  return { kind: "opaque", raw: raw.trim() };
}

function lineOf(source, index) {
  let line = 1;
  for (let i = 0; i < index; i += 1) {
    if (source[i] === "\n") line += 1;
  }
  return line;
}

function collectRevalidateCalls() {
  const files = walkFiles(SRC_DIR, [".ts", ".tsx"]);
  const literals = [];
  const opaque = [];

  for (const file of files) {
    const original = readFileSync(file, "utf8");
    const source = blankComments(original);
    const relative = file.slice(ROOT.length + 1);

    const pattern = /revalidatePath\s*\(/g;
    let match;
    while ((match = pattern.exec(source)) !== null) {
      const open = match.index + match[0].length - 1;
      const argument = readFirstArgument(source, open);
      const line = lineOf(source, match.index);
      if (argument.kind === "literal") {
        literals.push({ file: relative, line, value: argument.value, raw: argument.raw });
      } else {
        opaque.push({ file: relative, line, raw: argument.raw });
      }
    }
  }

  return { literals, opaque, fileCount: files.length };
}

/* ────────────────────────────────────────────────────────────────────────────
 * The census.
 * ──────────────────────────────────────────────────────────────────────────── */

function censusAddresses() {
  const pages = walkFiles(ADMIN_PAGES_DIR, ["page.tsx"]);
  return pages
    .map((file) => {
      const relative = file.slice(ROOT.length + 1);
      const address =
        "/" +
        relative
          .replace(/^src\/app\//, "")
          .replace(/\/page\.tsx$/, "")
          .split("/")
          .filter((segment) => !(segment.startsWith("(") && segment.endsWith(")")))
          .join("/");
      return { file: relative, address };
    })
    .sort((a, b) => a.address.localeCompare(b.address));
}

/* ────────────────────────────────────────────────────────────────────────────
 * Run.
 * ──────────────────────────────────────────────────────────────────────────── */

const patterns = parseCapabilityPatterns();
const allowPatterns = PUBLIC_ALLOW.map(([pattern]) => pattern);

if (process.argv.includes("--print-patterns")) {
  console.log(`${patterns.length} pattern(s) collected from the CAPABILITY_ROUTES object literal:`);
  for (const pattern of patterns) console.log(`  ${pattern}`);
  process.exit(0);
}

console.log("verify-routes — the map against the disk");
console.log(
  `  patterns parsed from CAPABILITY_ROUTES: ${patterns.length} ` +
    `(${patterns.filter((p) => p === "/admin" || p.startsWith("/admin/")).length} under /admin)`
);
console.log(`  public allow-list entries: ${allowPatterns.length}`);
console.log("");

let failed = false;

/* ── Check 1 ─────────────────────────────────────────────────────────────── */

const { literals, opaque, fileCount } = collectRevalidateCalls();
const offenders = literals.filter(
  (call) => !matchesAny(call.value, patterns) && !matchesAny(call.value, allowPatterns)
);

console.log("[1/2] revalidatePath arguments");
console.log(`  files scanned:                 ${fileCount}`);
console.log(`  literal arguments read:        ${literals.length}`);
console.log(`  non-literal arguments skipped: ${opaque.length}  (invisible to this parse)`);
for (const call of opaque) {
  console.log(`      skipped  ${call.file}:${call.line}  ${call.raw}`);
}

if (offenders.length === 0) {
  console.log("  ok — every statically visible literal names a declared address.");
} else {
  failed = true;
  console.log(`  FAIL — ${offenders.length} call(s) name an address no route serves:`);
  for (const call of offenders) {
    console.log(`      ${call.file}:${call.line}  ${call.raw}`);
  }
}
console.log("");

/* ── Check 2 ─────────────────────────────────────────────────────────────── */

const census = censusAddresses();
const unbound = census.filter((page) => !matchesAny(page.address, patterns));

console.log("[2/2] route census — src/app/(admin)");
console.log(`  pages found:                   ${census.length}`);
console.log(
  `  patterns under /admin:         ${
    patterns.filter((p) => p === "/admin" || p.startsWith("/admin/")).length
  }  (a pattern with no page is not an error)`
);

if (unbound.length === 0) {
  console.log("  ok — every page resolves to a pattern in the map.");
} else {
  failed = true;
  console.log(`  FAIL — ${unbound.length} page(s) reach no binding:`);
  for (const page of unbound) {
    console.log(`      ${page.address}   (${page.file})`);
  }
}
console.log("");

if (failed) {
  console.log("FAIL — see above.");
  console.log(
    "  A red check 1 is the expected state until plan 34-16 sweeps the calls; the list above"
  );
  console.log(
    "  is that worklist. Do not widen PUBLIC_ALLOW or the pattern slice to make it green."
  );
  process.exit(1);
}

console.log("PASS — both checks green.");
console.log(
  "  This means every statically visible literal names a declared address, not that every"
);
console.log("  revalidatePath in this repository is correct. See the docblock.");
