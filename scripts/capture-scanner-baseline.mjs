#!/usr/bin/env node
/**
 * capture-scanner-baseline — the mechanical record of the scanner, before the
 * conversion touches it.
 *
 * ── Why this exists ─────────────────────────────────────────────────────────
 *
 * Phase 42's third criterion says *every scanner behaviour is unchanged from
 * before the conversion*. `ScannerClient.tsx` is 3449 lines and owns the offline
 * queue, the torch, auto-return, the three outcomes and undo. After a conversion
 * touching 99 class-string sites, *unchanged* asserted from memory is not an
 * assertion — it is a hope. This script turns it into a diff.
 *
 * ── What it proves, and what it does not ────────────────────────────────────
 *
 * It proves that the CONSTANTS and the ROADS did not move. It does not prove
 * that a phone vibrated, that a queue survived a restart, that the torch lit, or
 * that a screen was readable at arm's length in a dark room. Those live outside
 * this repository — in a camera, a haptic motor, an IndexedDB store and a
 * person's eye — and they are `42-PROCEDURES.md`, not this file.
 *
 * ── Determinism is the property that makes it worth writing ─────────────────
 *
 * Two runs on the same tree print the same bytes. No timings, no absolute paths,
 * no unsorted iteration. The only line that moves is the capture date, and it
 * lives in the header ABOVE the diffable marker, which the comparison cuts on.
 *
 * ── Refusal ────────────────────────────────────────────────────────────────
 *
 * If a block's source cannot be located — the file is gone, a constant was
 * renamed, `FLASH_STATES` has fewer than three entries, the call-site scan finds
 * zero — this prints `FATAL:` naming the block and exits 2. It never prints a
 * block with a hole in it. A capture that silently omits a block produces a
 * later diff that shows nothing and means nothing, which is the exact defect
 * this repository names when it insists a refusal must not be reportable as a
 * pass (`verify-all.mjs`, and `meta-gates.md` on silent failures).
 *
 * Usage:  node scripts/capture-scanner-baseline.mjs > 42-BASELINE.md
 * Exit:   0 captured · 2 refused (a block could not be located)
 */

import { readFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const SCANNER = "src/app/(admin)/admin/scanner/ScannerClient.tsx";
const FLASH = "src/components/scanner/ScanFlash.tsx";
const HAPTICS = "src/utils/haptics.ts";
const OUTCOME = "src/lib/door/outcome.ts";
const CLASSIFY = "src/lib/door/classify.ts";
const STORE = "src/lib/offline/checkin-store.ts";
const ROUTES_GATE = "scripts/verify-routes.mjs";

const out = [];
const say = (line = "") => out.push(line);

/** A block that cannot be located is a refusal, never an omission. */
function fatal(block, why) {
  process.stderr.write(`FATAL: block ${block} could not be captured — ${why}\n`);
  process.stderr.write(
    "Nothing was written. A capture missing a block produces a diff that shows\n" +
      "nothing and means nothing; this exits 2 so it cannot be read as a pass.\n"
  );
  process.exit(2);
}

function source(relPath, block) {
  const abs = join(ROOT, relPath);
  if (!existsSync(abs)) fatal(block, `${relPath} is not on disk`);
  const text = readFileSync(abs, "utf8");
  return { text, lines: text.split("\n") };
}

/* ── Small parsers, shared by several blocks ──────────────────────────────── */

/**
 * Split a call's argument list, starting at the index of its opening paren.
 * Respects nesting, quotes, template literals and escapes. Returns the raw
 * argument slices, each with its newlines collapsed to single spaces so that a
 * multi-line call and a one-line call compare as the same text.
 */
function splitArgs(text, openParenIndex) {
  const args = [];
  let depth = 0;
  let current = "";
  let quote = null;
  let escaped = false;
  for (let i = openParenIndex; i < text.length; i++) {
    const c = text[i];
    if (escaped) {
      current += c;
      escaped = false;
      continue;
    }
    if (quote) {
      current += c;
      if (c === "\\") escaped = true;
      else if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") {
      quote = c;
      current += c;
      continue;
    }
    if (c === "(" || c === "[" || c === "{") {
      depth++;
      if (depth === 1 && c === "(") continue; // the call's own paren
      current += c;
      continue;
    }
    if (c === ")" || c === "]" || c === "}") {
      depth--;
      if (depth === 0) {
        args.push(current);
        return { args, endIndex: i };
      }
      current += c;
      continue;
    }
    if (c === "," && depth === 1) {
      args.push(current);
      current = "";
      continue;
    }
    current += c;
  }
  return null; // unbalanced — the caller turns this into a refusal
}

const flatten = (s) => s.replace(/\s+/g, " ").trim();
const lineOf = (text, index) => text.slice(0, index).split("\n").length;

/**
 * A pipe inside a Markdown table cell ends the cell. A union type is full of
 * them, so a cell that carries source text must escape them or the record
 * renders as a broken table — which is a record nobody reads.
 */
const cell = (s) => String(s).replace(/\|/g, "\\|");

/** Every string literal inside an expression, in source order. */
function stringLiterals(expr) {
  const found = [];
  const re = /"([^"\\]*(?:\\.[^"\\]*)*)"|'([^'\\]*(?:\\.[^'\\]*)*)'/g;
  let m;
  while ((m = re.exec(expr)) !== null) found.push(m[1] ?? m[2]);
  return found;
}

/** Capture a brace-balanced declaration verbatim, from its `const` line. */
function declarationBlock(lines, startIdx) {
  let depth = 0;
  let seenOpen = false;
  const collected = [];
  for (let i = startIdx; i < lines.length; i++) {
    const line = lines[i];
    collected.push(line);
    for (const c of line) {
      if (c === "{") {
        depth++;
        seenOpen = true;
      } else if (c === "}") depth--;
    }
    if (seenOpen && depth === 0) return collected;
    if (!seenOpen && /;\s*$/.test(line)) return collected; // one-liner
  }
  return null;
}

/** The nearest function or arrow declaration at or above a line index. */
function enclosingFunctions(lines) {
  const decls = [];
  const fnRe = /^(\s*)(?:export\s+)?(?:async\s+)?function\s+([A-Za-z0-9_]+)/;
  const constRe =
    /^(\s*)(?:export\s+)?const\s+([A-Za-z0-9_]+)\s*=\s*(?:useCallback|async|\(|function)/;
  lines.forEach((line, idx) => {
    const m = fnRe.exec(line) ?? constRe.exec(line);
    if (m) decls.push({ line: idx + 1, name: m[2] });
  });
  return (targetLine) => {
    let best = null;
    for (const d of decls) {
      if (d.line <= targetLine) best = d;
      else break;
    }
    return best ? best.name : "(top level)";
  };
}

/* ── The header, above the diffable marker ────────────────────────────────── */

function gitSha() {
  const r = spawnSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" });
  if (r.status !== 0) fatal("header", "git could not resolve HEAD");
  return r.stdout.trim();
}

const BEGIN = "<!-- BASELINE-DIFFABLE-BEGIN -->";
const END = "<!-- BASELINE-DIFFABLE-END -->";

const today = new Date().toISOString().slice(0, 10);

say("# Phase 42 — the scanner's mechanical record, taken before the conversion");
say();
say(`- **Commit:** \`${gitSha()}\``);
say(`- **Captured:** ${today}`);
say("- **Command:** `node scripts/capture-scanner-baseline.mjs`");
say();
say(
  "At this commit the scanner is **unconverted**: no class string in its perimeter " +
    "has been rewritten, and every constant below is the one the first real door will run on."
);
say();
say(
  "Everything between the two markers is the diffable region. The comparison after " +
    "the conversion cuts on them, so the commit and the date above never appear in a diff."
);
say();
say(BEGIN);
say();

/* ── Block 1 — the three dwells ───────────────────────────────────────────── */

const flash = source(FLASH, "1");
const flashStatesIdx = flash.lines.findIndex((l) => /const FLASH_STATES\b/.test(l));
if (flashStatesIdx === -1) fatal("1", `FLASH_STATES not found in ${FLASH}`);

const flashStates = [];
{
  let depth = 0;
  let current = null;
  for (let i = flashStatesIdx; i < flash.lines.length; i++) {
    const line = flash.lines[i];
    const entry = /^ {2}([A-Za-z0-9_]+): \{/.exec(line);
    if (entry && depth === 1) {
      current = { key: entry[1], line: i + 1, bg: null, delay: null, path: null };
      flashStates.push(current);
    }
    if (current) {
      const bg = /bg:\s*"([^"]+)"/.exec(line);
      if (bg && current.bg === null) current.bg = bg[1];
      const delay = /delay:\s*(\d+)/.exec(line);
      if (delay && current.delay === null) current.delay = Number(delay[1]);
      const d = /\bd="([^"]+)"/.exec(line);
      if (d && current.path === null) current.path = { value: d[1], line: i + 1 };
    }
    for (const c of line) {
      if (c === "{") depth++;
      else if (c === "}") depth--;
    }
    if (depth === 0 && i > flashStatesIdx) break;
  }
}
if (flashStates.length !== 3)
  fatal("1", `FLASH_STATES holds ${flashStates.length} entries, expected 3`);
for (const s of flashStates) {
  if (s.delay === null) fatal("1", `no delay for FLASH_STATES.${s.key}`);
  if (s.bg === null) fatal("1", `no bg for FLASH_STATES.${s.key}`);
  if (s.path === null) fatal("6", `no glyph path for FLASH_STATES.${s.key}`);
}

const distinct = (values) => new Set(values).size === values.length;

say(`## Block 1 — the three dwells · \`${FLASH}:${flashStatesIdx + 1}\``);
say();
say("| outcome | key | `bg` | `delay` (ms) | line |");
say("|---|---|---|---|---|");
for (const s of flashStates) say(`| ${s.key} | \`${s.key}\` | \`${s.bg}\` | **${s.delay}** | ${s.line} |`);
say();
say(`- entries: **${flashStates.length}**`);
say(
  `- dwells distinct across the three outcomes: **${distinct(flashStates.map((s) => s.delay)) ? "yes" : "NO — a finding"}**`
);
say(
  "- dwell is information, not decoration: the third state sits longer because it carries a time and an operator to read."
);
say();

/* ── Block 2 — the three haptic literals ──────────────────────────────────── */

const haptics = source(HAPTICS, "2");
const vibrations = [];
{
  const enclosing = enclosingFunctions(haptics.lines);
  const re = /navigator\.vibrate\(/g;
  let m;
  while ((m = re.exec(haptics.text)) !== null) {
    const open = m.index + "navigator.vibrate".length;
    const split = splitArgs(haptics.text, open);
    if (!split) fatal("2", `unbalanced navigator.vibrate call in ${HAPTICS}`);
    const line = lineOf(haptics.text, m.index);
    vibrations.push({ line, fn: enclosing(line), pattern: flatten(split.args[0] ?? "") });
  }
}
if (vibrations.length !== 3)
  fatal("2", `found ${vibrations.length} navigator.vibrate calls in ${HAPTICS}, expected 3`);
vibrations.sort((a, b) => a.line - b.line);

say(`## Block 2 — the three haptic literals · \`${HAPTICS}\``);
say();
say("| function | pattern | line |");
say("|---|---|---|");
for (const v of vibrations) say(`| \`${v.fn}\` | \`${v.pattern}\` | ${v.line} |`);
say();
say(`- calls: **${vibrations.length}**`);
say(
  `- patterns distinct across the three outcomes: **${distinct(vibrations.map((v) => v.pattern)) ? "yes" : "NO — a finding"}**`
);
say(
  "- this channel is the one that works when the screen is not being looked at, and the one that does nothing at all on iOS."
);
say();

/* ── Block 3 — the outcome → haptic mapping ───────────────────────────────── */

const scanner = source(SCANNER, "3");
const showFlashDefIdx = scanner.lines.findIndex((l) => /const showFlash\s*=\s*useCallback\(/.test(l));
if (showFlashDefIdx === -1) fatal("3", `the definition of showFlash was not found in ${SCANNER}`);
const showFlashBody = (() => {
  const anchor = scanner.text.indexOf("const showFlash = useCallback(");
  if (anchor === -1) fatal("3", `the definition of showFlash was not found in ${SCANNER}`);
  const split = splitArgs(scanner.text, anchor + "const showFlash = useCallback".length);
  if (!split) fatal("3", "the body of showFlash never closed");
  return scanner.lines.slice(showFlashDefIdx, lineOf(scanner.text, split.endIndex));
})();

say(`## Block 3 — the outcome → haptic mapping · \`${SCANNER}:${showFlashDefIdx + 1}\``);
say();
say("```tsx");
for (const l of showFlashBody) say(l);
say("```");
say();
say(`- lines: **${showFlashBody.length}**`);
say();

/* ── Block 4 — every showFlash call site ──────────────────────────────────── */

const enclosingScanner = enclosingFunctions(scanner.lines);
const callSites = [];
{
  const re = /(?<![A-Za-z0-9_.])showFlash\(/g;
  let m;
  while ((m = re.exec(scanner.text)) !== null) {
    const open = m.index + "showFlash".length;
    const split = splitArgs(scanner.text, open);
    if (!split) fatal("4", `unbalanced showFlash call at offset ${m.index} in ${SCANNER}`);
    const line = lineOf(scanner.text, m.index);
    const args = split.args.map(flatten).filter((a, i) => !(i === split.args.length - 1 && a === ""));
    const typeExpr = args[0] ?? "";
    const literals = stringLiterals(typeExpr);
    callSites.push({
      line,
      fn: enclosingScanner(line),
      typeExpr,
      outcomes: literals.length > 0 ? literals : ["(not a literal)"],
      hasTitle: args.length >= 2,
      titleExpr: args[1] ?? "",
      argCount: args.length,
    });
  }
}
if (callSites.length === 0) fatal("4", `no showFlash call site found in ${SCANNER}`);
callSites.sort((a, b) => a.line - b.line);

const withTitle = callSites.filter((c) => c.hasTitle).length;

say(`## Block 4 — every \`showFlash\` call site · \`${SCANNER}\``);
say();
say("| line | enclosing function | outcome passed | title? | args |");
say("|---|---|---|---|---|");
for (const c of callSites)
  say(
    `| ${c.line} | \`${c.fn}\` | ${c.outcomes.map((o) => `\`${o}\``).join(" / ")} | ${c.hasTitle ? "yes" : "**NO — a finding**"} | ${c.argCount} |`
  );
say();
say(`- call sites: **${callSites.length}**`);
say(`- sites passing a title: **${withTitle}** of ${callSites.length}`);
say(
  "- a title on every site is the half of DS-04 that says the state is written in **words** and not only painted. " +
    "A site passing none is recorded here as a finding; it is not repaired by this capture."
);
say();
{
  const byOutcome = new Map();
  for (const c of callSites)
    for (const o of c.outcomes) byOutcome.set(o, (byOutcome.get(o) ?? 0) + 1);
  const keys = [...byOutcome.keys()].sort();
  say("| outcome | sites |");
  say("|---|---|");
  for (const k of keys) say(`| \`${k}\` | ${byOutcome.get(k)} |`);
  say();
}

/* ── Block 5 — the outcome union, verbatim ────────────────────────────────── */

const outcomeSrc = source(OUTCOME, "5");
const unionIdx = outcomeSrc.lines.findIndex((l) => /export type DoorOutcome\b/.test(l));
if (unionIdx === -1) fatal("5", `DoorOutcome was not found in ${OUTCOME}`);
const unionLines = [];
{
  let depth = 0;
  let seenOpen = false;
  for (let i = unionIdx; i < outcomeSrc.lines.length; i++) {
    const line = outcomeSrc.lines[i];
    unionLines.push(line);
    for (const c of line) {
      if (c === "{") {
        depth++;
        seenOpen = true;
      } else if (c === "}") depth--;
    }
    if (seenOpen && depth === 0 && /;\s*$/.test(line)) break;
  }
  if (depth !== 0) fatal("5", "the DoorOutcome union never closed");
}
const discriminants = unionLines
  .map((l) => /outcome:\s*"([^"]+)"/.exec(l))
  .filter(Boolean)
  .map((m) => m[1]);
if (discriminants.length !== 3)
  fatal("5", `DoorOutcome carries ${discriminants.length} discriminants, expected 3`);

say(`## Block 5 — the three outcomes, as a type · \`${OUTCOME}:${unionIdx + 1}\``);
say();
say("```ts");
for (const l of unionLines) say(l);
say("```");
say();
say(`- discriminants: **${discriminants.length}** — ${discriminants.map((d) => `\`${d}\``).join(", ")}`);
say("- there are three, and an undo is not a fourth: it is a flagged record.");
say();

/* ── Block 6 — the six glyph paths ────────────────────────────────────────── */

const historyGlyphs = [];
for (const anchor of ["isSuccess ? (", "isFlagged ? (", "isError ? ("]) {
  const idx = scanner.lines.findIndex((l) => l.includes(anchor));
  if (idx === -1) fatal("6", `the scan-history anchor \`${anchor}\` was not found in ${SCANNER}`);
  let found = null;
  for (let i = idx; i < Math.min(idx + 20, scanner.lines.length); i++) {
    const d = /\bd="([^"]+)"/.exec(scanner.lines[i]);
    if (d) {
      found = { value: d[1], line: i + 1 };
      break;
    }
  }
  if (!found) fatal("6", `no glyph path follows the anchor \`${anchor}\` in ${SCANNER}`);
  historyGlyphs.push({ anchor: anchor.replace(" ? (", ""), ...found });
}

say("## Block 6 — the six glyph path literals");
say();
say("| where | state | path | line |");
say("|---|---|---|---|");
for (const s of flashStates)
  say(`| the flash | \`${s.key}\` | \`${s.path.value}\` | \`${FLASH}:${s.path.line}\` |`);
for (const g of historyGlyphs)
  say(`| the scan history | \`${g.anchor}\` | \`${g.value}\` | \`${SCANNER}:${g.line}\` |`);
say();
say(`- literals: **${flashStates.length + historyGlyphs.length}**`);
say(
  "- **six and not three, and the reason matters:** the same three states are drawn **twice** — once " +
    "full-screen in the flash, once again as a small mark in the scan history. A conversion that " +
    "repaints one copy and forgets the other leaves the door saying two different things about one scan."
);
say(
  `- glyphs distinct within the flash: **${distinct(flashStates.map((s) => s.path.value)) ? "yes" : "NO — a finding"}** · ` +
    `within the scan history: **${distinct(historyGlyphs.map((g) => g.value)) ? "yes" : "NO — a finding"}**`
);
say();

/* ── Block 7 — the offline queue's shape ──────────────────────────────────── */

const store = source(STORE, "7");
const queueConstants = [
  { name: "DB_NAME", re: /const DB_NAME\s*=\s*("[^"]+")/ },
  { name: "DB_VERSION", re: /const DB_VERSION\s*=\s*(\d+)/ },
  { name: "MAX_SYNC_ATTEMPTS", re: /const MAX_SYNC_ATTEMPTS\s*=\s*(\d+)/ },
];
const queueRows = queueConstants.map((c) => {
  const idx = store.lines.findIndex((l) => c.re.test(l));
  if (idx === -1) fatal("7", `${c.name} was not found in ${STORE}`);
  return { name: c.name, value: c.re.exec(store.lines[idx])[1], line: idx + 1 };
});
const queueTypes = ["QueuedSubjectType", "PendingCheckin", "FailedCheckin"].map((name) => {
  const idx = store.lines.findIndex((l) =>
    new RegExp(`export (?:type|interface) ${name}\\b`).test(l)
  );
  if (idx === -1) fatal("7", `the type ${name} was not found in ${STORE}`);
  return { name, line: idx + 1, decl: flatten(store.lines[idx]) };
});

say(`## Block 7 — the offline queue's shape · \`${STORE}\``);
say();
say("| constant | value | line |");
say("|---|---|---|");
for (const r of queueRows) say(`| \`${r.name}\` | \`${r.value}\` | ${r.line} |`);
say();
say("| type | declaration | line |");
say("|---|---|---|");
for (const t of queueTypes) say(`| \`${t.name}\` | \`${cell(t.decl)}\` | ${t.line} |`);
say();
say(`- constants: **${queueRows.length}** · types: **${queueTypes.length}**`);
say(
  "- **`DB_VERSION` must not move.** A database version that rises inside a colour phase is a defect by " +
    "definition: nothing here asks the store to change shape."
);
say();

/* ── Block 8 — the two roads ──────────────────────────────────────────────── */

const ROADS = ["ticketOnline", "ticketOffline", "membershipOnline", "membershipOffline"];
for (const road of ROADS) {
  if (!scanner.lines.some((l) => new RegExp(`function ${road}\\b`).test(l)))
    fatal("8", `the road \`${road}\` was not found in ${SCANNER}`);
}

const byFunction = new Map();
for (const c of callSites) {
  if (!byFunction.has(c.fn)) byFunction.set(c.fn, []);
  byFunction.get(c.fn).push(c);
}

say("## Block 8 — the two roads: ticket and membership, online and offline");
say();
for (const road of ROADS) {
  const sites = byFunction.get(road) ?? [];
  say(`### \`${road}\` — ${sites.length} site(s)`);
  say();
  if (sites.length === 0) {
    say("_no `showFlash` site inside this function — recorded, not repaired_");
  } else {
    say("| line | outcome | title? |");
    say("|---|---|---|");
    for (const s of sites)
      say(`| ${s.line} | ${s.outcomes.map((o) => `\`${o}\``).join(" / ")} | ${s.hasTitle ? "yes" : "**NO**"} |`);
  }
  say();
}
say("### every other function that flashes");
say();
say("| function | sites | lines |");
say("|---|---|---|");
{
  const others = [...byFunction.keys()].filter((f) => !ROADS.includes(f)).sort();
  for (const fn of others) {
    const sites = byFunction.get(fn);
    say(`| \`${fn}\` | ${sites.length} | ${sites.map((s) => s.line).join(", ")} |`);
  }
  say();
  say(`- functions that flash: **${byFunction.size}** · of them the four roads: **${ROADS.filter((r) => byFunction.has(r)).length}**`);
}
say();

/* ── Block 9 — the route manifest gate ────────────────────────────────────── */

if (!existsSync(join(ROOT, ROUTES_GATE))) fatal("9", `${ROUTES_GATE} is not on disk`);
const routes = spawnSync(process.execPath, [ROUTES_GATE], { cwd: ROOT, encoding: "utf8" });
if (routes.error) fatal("9", `${ROUTES_GATE} could not be executed`);

say(`## Block 9 — the route manifest gate · \`${ROUTES_GATE}\``);
say();
say("```");
for (const l of (routes.stdout ?? "").replace(/\s+$/, "").split("\n")) say(l);
say("```");
say();
say(`- exit code: **${routes.status}**`);
say("- invoked, never re-implemented: this block is that gate's own verdict, committed.");
say();

/* ── Block 10 — the double-read window ────────────────────────────────────── */

const classify = source(CLASSIFY, "10");
const windowIdx = classify.lines.findIndex((l) =>
  /export const DOUBLE_READ_WINDOW_SECONDS\s*=\s*\d+/.test(l)
);
if (windowIdx === -1) fatal("10", `DOUBLE_READ_WINDOW_SECONDS was not found in ${CLASSIFY}`);
const windowValue = /=\s*(\d+)/.exec(classify.lines[windowIdx])[1];

say(`## Block 10 — the double-read window · \`${CLASSIFY}:${windowIdx + 1}\``);
say();
say(`- \`DOUBLE_READ_WINDOW_SECONDS\` = **${windowValue}**`);
say(
  "- it is the number that decides whether a second read of one code is *already recorded* or a fresh scan. " +
    "Tuning it is a decision about a real night, never a side effect of a colour change."
);
say();

/* ── Block 11 — the camera configuration ──────────────────────────────────── */

const camera = [
  { name: "fps", re: /fps:\s*(\d+)/ },
  { name: "qrbox.width", re: /qrbox:\s*\{\s*width:\s*(\d+)/ },
  { name: "qrbox.height", re: /qrbox:\s*\{\s*width:\s*\d+,\s*height:\s*(\d+)/ },
  { name: "facingMode", re: /facingMode:\s*"([^"]+)"/ },
].map((c) => {
  const idx = scanner.lines.findIndex((l) => c.re.test(l));
  if (idx === -1) fatal("11", `the camera literal ${c.name} was not found in ${SCANNER}`);
  return { name: c.name, value: c.re.exec(scanner.lines[idx])[1], line: idx + 1 };
});

say(`## Block 11 — the camera configuration · \`${SCANNER}\``);
say();
say("| literal | value | line |");
say("|---|---|---|");
for (const c of camera) say(`| \`${c.name}\` | \`${c.value}\` | ${c.line} |`);
say();
say(`- literals: **${camera.length}**`);
say(
  "- **criterion 2 touches the container, never this line.** A viewfinder that centres itself is a layout " +
    "change; a decode box that changes size is a change to what the camera can read at the door."
);
say();

/* ── Block 12 — the build ─────────────────────────────────────────────────── */

const build = spawnSync("npm", ["run", "build"], {
  cwd: ROOT,
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"],
});
if (build.error) fatal("12", "`npm run build` could not be executed");

say("## Block 12 — the build");
say();
say("- command: `npm run build`");
say(`- exit code: **${build.status}**`);
say(
  "- there is no test runner in this repository: `next build` **is** the typecheck, and this integer is the " +
    "whole of what it proves. Its output is deliberately not reproduced — it carries timings and byte sizes, " +
    "and a record that moves on its own is a record nobody can diff."
);
say();

/* ── Block 13 — the four error-message tables, byte for byte ──────────────── */

const TABLES = [
  "NOT_VALID_MESSAGE",
  "UNRECOGNISED_REASON_MESSAGE",
  "FLAG_MESSAGE",
  "FAILURE_REASON_MESSAGE",
];

say(`## Block 13 — the four error-message tables, byte for byte · \`${SCANNER}\``);
say();
for (const name of TABLES) {
  const idx = scanner.lines.findIndex((l) => new RegExp(`^const ${name}\\b`).test(l));
  if (idx === -1) fatal("13", `the message table ${name} was not found in ${SCANNER}`);
  const block = declarationBlock(scanner.lines, idx);
  if (!block) fatal("13", `the message table ${name} never closed`);
  say(`### \`${name}\` · line ${idx + 1}`);
  say();
  say("```ts");
  for (const l of block) say(l);
  say("```");
  say();
}
say(`- tables: **${TABLES.length}**`);
say(
  "- captured verbatim because the causes must stay told apart. `meta-gates.md` forbids a handler that " +
    "collapses distinct causes into one message, and this project has the recorded precedent — the " +
    "newsletter form's single sentence for every failure. At the door the sentence on the screen is the " +
    "only observer that exists: there is **no error tracking anywhere in this repository**."
);
say();

say(END);

process.stdout.write(out.join("\n") + "\n");
