#!/usr/bin/env node
/**
 * verify-calendar-surface.mjs — the ten assertions of `44-UI-SPEC.md` §15, run
 * as a command instead of remembered.
 *
 * WHAT IT ASSERTS, in one sentence: **the calendar surface's files agree with
 * the ten string-level rules the UI contract wrote down, and with nothing
 * else.**
 *
 * ── WHAT A GREEN DOES NOT MEAN (cosa un verde NON significa) ────────────────
 *
 * Read this before quoting an exit code at anybody.
 *
 *   - **THESE ARE STRING ASSERTIONS OVER SOURCE FILES.** Not one of them runs a
 *     line of product code, renders an element, or measures a pixel. There is
 *     no test runner in this repository — no `test` script, no `*.test.*`, no
 *     `*.spec.*` (`CLAUDE.md` Guardrail 1) — and this file is not one.
 *   - **NONE OF THEM PROVES THE SURFACE IS CORRECT.** §15 says so in its own
 *     words and the sentence is repeated here rather than linked, because a
 *     reader holding a green is not about to open a planning document.
 *   - **IN PARTICULAR, NOTHING HERE PROVES A PROPOSED DATE DOES NOT READ AS
 *     SETTLED.** That is the phase's highest-risk display decision (§7), the
 *     one thing only a person can settle, and it belongs to a written
 *     procedure with a result — `44-PROCEDURES.md`, P2. U6 and U7 assert that
 *     no badge and no hue was spent where the contract forbids one. Neither
 *     asserts that a reader can tell a proposal from a fact.
 *   - **AND NOTHING HERE OPENS A SESSION.** Whether the calendar is refused to
 *     somebody the capability model does not admit is P1's question, not this
 *     file's. Every automated check in this repository reads declarations or
 *     files.
 *
 * ── THE SCOPE, AND WHY IT IS TWO DIRECTORIES AND NOT `src/` ────────────────
 *
 * §15 scopes every one of the ten to the calendar surface's files **and to
 * nothing else**. Widening the scan would redden files that never agreed to
 * these rules, and a gate that goes red on a correct tree is a gate somebody
 * disables. The two directories are the measured `(work)` convention: route
 * files inside the nested group, every other module one level out
 * (`nextjs-architecture.md`, R-WORK-ROUTES).
 *
 * ── GREP HYGIENE, WHICH IS NOT OPTIONAL HERE ───────────────────────────────
 *
 * Several of the tokens below are named in the header of the very files being
 * checked, inside the sentence forbidding them. `actions.ts:88` says a venue
 * word reaches no `console.*`; `(work)/calendar/page.tsx:97` says the same; a
 * dozen docblocks spell `normal-case` while explaining why it is declared. A
 * check that reddened on the comment explaining why it should be green is a
 * check that gets disabled the third time it runs, and this repository has the
 * receipt: `41-GAP-REVIEW-4.md` CR-01 and CR-02.
 *
 * So every file is read through `scripts/lib/comments.mjs` — the one stripper,
 * proved by asserted mutation, whose stated error direction is *blanks more,
 * never less*. A file whose comment never closes is a file this gate cannot
 * measure, and it REFUSES rather than reporting a green about nothing.
 *
 * ── AND THIS SCRIPT DOES NOT MATCH ITSELF ──────────────────────────────────
 *
 * It lives in `scripts/`, outside the scan scope, so naming a forbidden token
 * here cannot make the check green on its own prohibition. The one exception
 * is the reversed glyph of U9, which is built **from its code point** and
 * never written out — `verify-tokens.mjs:421-428`'s discipline, adopted for
 * its reason and not for its shape: writing the character would put a second
 * occurrence into the repository, and this file would report on itself the
 * moment somebody widened a scan by one directory.
 *
 * ── EXIT CODES ─────────────────────────────────────────────────────────────
 *
 * `0` passed · `1` FAILED · `2` REFUSED, and a refusal is not a failure: it
 * means the measurement did not happen. It is registered in
 * `scripts/verify-all.mjs`'s runner array — unlike `verify:ics`, this gate
 * reads only tracked source, needs no `docs/` and no server, and therefore
 * runs everywhere.
 *
 * SECRECY. `.planning/` is tracked and this repository is PUBLIC (`CLAUDE.md`
 * Guardrail 5). This gate names no venue under negotiation, no unannounced
 * date and no line-up. It prints file paths, line numbers and the offending
 * token — never a row's content, because the rows this surface holds are
 * exactly the material that must not travel.
 *
 * DEF-41-01, measured: Tailwind compiles class strings out of comments, and
 * `scripts/` is inside the project root and is not ignored. The utility
 * strings this gate must look for are assembled at run time from their pieces
 * and are not spelled as literals anywhere in this file, in code or in prose.
 *
 * Zero dependencies. Node built-ins only, ESM.
 */

import { existsSync, readdirSync, statSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { liveLines } from "./lib/comments.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/* ────────────────────────────────────────────────────────────────────────────
 * Scope
 * ──────────────────────────────────────────────────────────────────────────── */

/** The two directories §15 names, and nothing else. */
const SCOPE = [
  "src/app/(admin)/admin/calendar",
  "src/app/(admin)/admin/(work)/calendar",
];

/** Source extensions. A gate that read a PNG as text would redden on bytes. */
const EXTENSIONS = new Set([".ts", ".tsx"]);

/** The one file allowed to render a piece's date — U5's whole subject. */
const PIECE_DATE_FILE = "PieceDate.tsx";

/** A refusal is not a failure: it means the measurement did not happen. */
function refuse(message) {
  console.log("");
  console.log(`  FATAL: ${message}`);
  console.log("");
  process.exit(2);
}

/* ────────────────────────────────────────────────────────────────────────────
 * Tokens, assembled rather than spelled where spelling them would be a class
 * string Tailwind could compile out of this file (DEF-41-01)
 * ──────────────────────────────────────────────────────────────────────────── */

/** U8's declared transform. Assembled: it is a utility class. */
const NORMAL_CASE = "normal" + "-case";

/** U7's caution token and its raw family. Assembled, same reason. */
const SEM_WARN = "--sem" + "-warn";
const AMBER_FAMILY = ["bg-", "text-", "border-", "from-", "to-", "via-"].map(
  (prefix) => prefix + "amber"
);

/**
 * The reversed `e`, U+0258 — BUILT FROM ITS CODE POINT, NEVER WRITTEN OUT.
 *
 * `brand-visual-system.md`, gate *grafia del brand*: the glyph exists only
 * inside the drawn logo. A check whose only match is its own prohibition gets
 * ignored the third time it goes red.
 */
const REVERSED_E = String.fromCodePoint(0x0258);

/** The brand, with a normal `e`. U8 requires the transform on its element. */
const BRAND = "re:sonate";

/* ────────────────────────────────────────────────────────────────────────────
 * Reading the surface
 * ──────────────────────────────────────────────────────────────────────────── */

function walk(absDir, out) {
  for (const entry of readdirSync(absDir)) {
    const abs = join(absDir, entry);
    if (statSync(abs).isDirectory()) {
      walk(abs, out);
      continue;
    }
    if (EXTENSIONS.has(extname(entry))) out.push(abs);
  }
}

const files = [];
for (const dir of SCOPE) {
  const abs = join(ROOT, dir);
  if (!existsSync(abs)) {
    refuse(
      `the scope directory ${dir} is not on disk.\n` +
        "       §15's ten assertions are scoped to it, so nothing was measured. Either the\n" +
        "       surface moved and this list moves with it in the same commit, or the surface\n" +
        "       was deleted and this gate goes with it."
    );
  }
  walk(abs, files);
}
files.sort();

if (files.length === 0) {
  refuse(
    "the scope directories exist and hold no .ts or .tsx file. A gate that measured\n" +
      "       zero files and printed a green is the exact defect this repository's gates were\n" +
      "       written to prevent."
  );
}

/**
 * Every file, read once, with its comments blanked.
 *
 * `joined` is the live text with newlines preserved, so a call spanning lines
 * can be matched whole and an index can be mapped back to a line number.
 */
const surface = [];
for (const abs of files) {
  const { lines, unterminated } = liveLines(abs);
  if (unterminated !== null) {
    refuse(
      `${relative(ROOT, abs)} opens a ${unterminated.kind} comment on line ` +
        `${unterminated.lineNo} that never closes.\n` +
        "       This gate cannot tell that file's comments from its code, so it measured\n" +
        "       nothing about it — and a green covering nine files while claiming ten is a\n" +
        "       green that lied by omission."
    );
  }
  surface.push({
    abs,
    rel: relative(ROOT, abs),
    name: abs.slice(abs.lastIndexOf("/") + 1),
    ext: extname(abs),
    lines,
    joined: lines.join("\n"),
  });
}

/** The 1-based line number of a character offset in `file.joined`. */
function lineOf(file, index) {
  let line = 1;
  for (let i = 0; i < index && i < file.joined.length; i += 1) {
    if (file.joined[i] === "\n") line += 1;
  }
  return line;
}

/** Every index at which `needle` occurs in `haystack`. */
function indicesOf(haystack, needle) {
  const out = [];
  let at = haystack.indexOf(needle);
  while (at !== -1) {
    out.push(at);
    at = haystack.indexOf(needle, at + 1);
  }
  return out;
}

/**
 * The text of a call's arguments, paren-matched from the `(` at `open`.
 *
 * A regular expression cannot do this: `formatCivilDate(f(x))` closes on the
 * inner paren and the argument read would be wrong in the direction that hides
 * a violation.
 */
function argumentsFrom(text, open) {
  let depth = 0;
  for (let i = open; i < text.length; i += 1) {
    if (text[i] === "(") depth += 1;
    else if (text[i] === ")") {
      depth -= 1;
      if (depth === 0) return text.slice(open + 1, i);
    }
  }
  return text.slice(open + 1);
}

/* ────────────────────────────────────────────────────────────────────────────
 * The ten checks
 *
 * Each returns `{ id, title, note, failures: [{ rel, line, detail }] }`.
 * ──────────────────────────────────────────────────────────────────────────── */

/** Every live occurrence of `needle`, across the whole surface. */
function occurrencesOf(needle, filter = () => true) {
  const found = [];
  for (const file of surface) {
    if (!filter(file)) continue;
    for (const at of indicesOf(file.joined, needle)) {
      found.push({ rel: file.rel, line: lineOf(file, at), detail: needle });
    }
  }
  return found;
}

/* ── U1 ─────────────────────────────────────────────────────────────────────
 *
 * The word for a mix sent in by somebody who is NOT in the line-up, and it is
 * not what this pipeline produces. `production-calendar.md` calls the
 * distinction a gate rather than a preference: the piece descending from one
 * of our nights is a `LiveCut`, one per dj who played, and the calendar names
 * it that way on all 27 occurrences. A surface that used the other word would
 * be promising a format that does not exist yet.
 */
function u1() {
  return {
    id: "U1",
    title: "the word for a candidate's mix appears zero times",
    note: "labels, comments, identifiers — the stripper blanks comments, so a live hit is real",
    failures: occurrencesOf("Podcast").concat(occurrencesOf("podcast")),
  };
}

/* ── U2 ─────────────────────────────────────────────────────────────────────
 *
 * D-44-02 and D-44-26. No native date control and no file control: the civil
 * date arrives from the calendar file and is not authored here, and a picker
 * would be a control offering to author one.
 */
const DATE_PICKER_MODULES = [
  "datepicker",
  "date-picker",
  "day-picker",
  "flatpickr",
  "pikaday",
  "air-datepicker",
  "react-calendar",
];

function u2() {
  const failures = [];
  for (const file of surface) {
    file.lines.forEach((text, i) => {
      const line = i + 1;
      for (const quote of ['"', "'"]) {
        if (text.includes(`type=${quote}date${quote}`)) {
          failures.push({ rel: file.rel, line, detail: "a native date control" });
        }
        if (text.includes(`type=${quote}file${quote}`)) {
          failures.push({ rel: file.rel, line, detail: "a file control" });
        }
      }
      if (/\bfrom\s+["'][^"']+["']/.test(text) || /\brequire\(/.test(text)) {
        const lower = text.toLowerCase();
        for (const mod of DATE_PICKER_MODULES) {
          if (lower.includes(mod)) {
            failures.push({ rel: file.rel, line, detail: `an import naming ${mod}` });
          }
        }
      }
    });
  }
  return {
    id: "U2",
    title: "no native date control, no file control, no date-picker import",
    note: "D-44-02 and D-44-26 — the date is read from the calendar, never authored here",
    failures,
  };
}

/* ── U3 ─────────────────────────────────────────────────────────────────────
 *
 * §6, and it is the correction `44-CONTEXT.md` D-44-25 calls the single most
 * important thing this phase builds against. A conversion that crosses
 * midnight moves the weekday, and a moved weekday turns a conforming night
 * into a reported error — which has already happened once, to `RSNT-003`.
 *
 * **The exemption list is empty and stays empty.** §15 wrote `none` before any
 * of this surface existed, which is the only order in which an exemption list
 * means anything. On its first run this check found one live hit that was NOT
 * a rendering — a write-path `updated_at` — and the resolution was to change
 * the code, not to widen the gate. That direction is recorded in
 * `44-13-SUMMARY.md`, because the next reader's instinct will be to add the
 * exemption back as a kindness.
 */
const DATE_CONSTRUCTORS = [
  "new Date(",
  "toISOString",
  "toLocaleDateString",
  "toLocaleString",
  "Intl.DateTimeFormat",
];

function u3() {
  const failures = [];
  for (const token of DATE_CONSTRUCTORS) {
    failures.push(...occurrencesOf(token));
  }
  return {
    id: "U3",
    title: "the surface constructs no Date and formats through no platform API",
    note: "§6 — a conversion that crosses midnight moves a weekday, and the weekday is the rule",
    failures,
  };
}

/* ── U4 ─────────────────────────────────────────────────────────────────────
 *
 * D-44-10, the owner's: a written date that breaks its rule is drawn
 * IDENTICALLY to one that keeps it, and the column answering that question
 * feeds the divergence report of D-44-07 and reaches no pixel.
 *
 * So the assertion is not *zero occurrences* — the divergence report is a
 * legitimate reader, and forbidding it outright would be a gate reddening on
 * correct code. It is: **zero in any file that can hold JSX**, and in a plain
 * `.ts` file only where the identifier is part of a column list handed to the
 * database.
 *
 * WHAT IT DOES NOT CATCH, stated rather than discovered: a `.ts` module could
 * read the column inside a `select(` and then copy it into a view row that a
 * component destructures. No string check sees that. The structural guard
 * against it is `PieceDateProps`, which has no such field and must not acquire
 * one.
 */
const CONFORMS_FIELDS = ["conforms_to_rule", "conformsToRule"];

function u4() {
  const failures = [];
  for (const file of surface) {
    for (const field of CONFORMS_FIELDS) {
      for (const at of indicesOf(file.joined, field)) {
        const line = lineOf(file, at);
        if (file.ext === ".tsx") {
          failures.push({
            rel: file.rel,
            line,
            detail: `${field} in a file that can hold JSX`,
          });
          continue;
        }
        // A `.ts` module may name the column only as a column.
        const from = Math.max(0, at - 400);
        const before = file.joined.slice(from, at);
        if (!before.includes("select(")) {
          failures.push({
            rel: file.rel,
            line,
            detail: `${field} outside a select() column list`,
          });
        }
      }
    }
  }
  return {
    id: "U4",
    title: "the divergence flag reaches no rendering file",
    note: "D-44-10 — states 1 and 2 are the same pixels, and that is a decision",
    failures,
  };
}

/* ── U5 ─────────────────────────────────────────────────────────────────────
 *
 * §7's fourth channel. `PieceDate` is the only renderer of a piece's date; a
 * second renderer is a second place where a proposal can be drawn as a fact.
 *
 * A night's own date is a DIFFERENT THING and is not a piece's date: it comes
 * off the plan row, it is always written, and the list draws it with
 * `formatCivilDate` directly (`PieceDate.tsx:16-18`). So the assertion is not
 * *nobody else calls the formatter* — that would redden four correct calls.
 * It is: **outside `PieceDate.tsx`, no call to the formatter takes an argument
 * that names a piece.**
 *
 * WHAT IT DOES NOT CATCH: an argument bound to a piece's date through a
 * variable named something else. The structural guard against that is the
 * five-variant union, which makes a bare date unrepresentable.
 */
const PIECE_BOUND = /\bpiece\b|\bpieces\b|\.state\b|pieceDate/i;

function u5() {
  const failures = [];
  for (const file of surface) {
    if (file.name === PIECE_DATE_FILE) continue;
    for (const at of indicesOf(file.joined, "formatCivilDate(")) {
      const open = at + "formatCivilDate".length;
      const args = argumentsFrom(file.joined, open);
      if (PIECE_BOUND.test(args)) {
        failures.push({
          rel: file.rel,
          line: lineOf(file, at),
          detail: "a piece's date formatted outside PieceDate.tsx",
        });
      }
    }
  }
  return {
    id: "U5",
    title: "a piece's date is rendered only through PieceDate",
    note: "§7 — a night's own date is not a piece's date, and this check knows the difference",
    failures,
  };
}

/* ── U6 ─────────────────────────────────────────────────────────────────────
 *
 * §5.3. `emphasis` means *look here first* and nothing else, and exactly two
 * facts on this surface earn it. A badge on every row is a badge on no row.
 */
const EMPHASIS_EARNED = ["Late", "Diverged"];

function u6() {
  const failures = [];
  const marker = "tone=" + '"' + "emphasis" + '"';
  for (const file of surface) {
    for (const at of indicesOf(file.joined, marker)) {
      // The element and its children, to the end of the third line: every
      // current occurrence closes on its own line, and a window rather than a
      // line keeps a reformatted one from reddening.
      const window = file.joined.slice(at, at + 240).split("\n").slice(0, 3).join("\n");
      if (!EMPHASIS_EARNED.some((word) => window.includes(word))) {
        failures.push({
          rel: file.rel,
          line: lineOf(file, at),
          detail: "an emphasis badge on neither of the two facts that earn one",
        });
      }
    }
  }
  return {
    id: "U6",
    title: "emphasis is spent on Late and Diverged, and on nothing else",
    note: "§5.3 — a badge on every row is a badge on no row",
    failures,
  };
}

/* ── U7 ─────────────────────────────────────────────────────────────────────
 *
 * §5.2, and the reason is not neatness. On this surface a proposal is the
 * MAJORITY case — every owed piece not yet written gets one — so a caution
 * colour applied to the majority stops being a caution and becomes the page's
 * background, at which point the rows that genuinely need attention are
 * invisible. And `40-UI-SPEC.md` Open Question 3 is still open: the caution
 * token IS the amber that IS one format's identification colour, so drawing
 * one would silently draw the other.
 */
function u7() {
  const failures = [];
  failures.push(...occurrencesOf(SEM_WARN));
  for (const token of AMBER_FAMILY) {
    failures.push(...occurrencesOf(token));
  }
  for (const file of surface) {
    // A raw hex is how an identification colour arrives when a token refuses to
    // carry it. There are none today, which is what makes this assertable.
    file.lines.forEach((text, i) => {
      const hex = /#[0-9a-fA-F]{6}\b/.exec(text);
      if (hex !== null) {
        failures.push({
          rel: file.rel,
          line: i + 1,
          detail: "a raw hex colour, which is how an identification colour arrives",
        });
      }
    });
    // An inline background is the other way round a token layer.
    for (const at of indicesOf(file.joined, "style={{")) {
      const body = file.joined.slice(at, at + 200);
      if (/background/i.test(body)) {
        failures.push({
          rel: file.rel,
          line: lineOf(file, at),
          detail: "an inline background style",
        });
      }
    }
  }
  return {
    id: "U7",
    title: "no caution token, no amber, no raw hex, no inline background",
    note: "§5.2 — a caution on the majority case is a caution on nothing",
    failures,
  };
}

/* ── U8 ─────────────────────────────────────────────────────────────────────
 *
 * `brand-visual-system.md`, gate *grafia del brand* and gate *naming a
 * format*: `SunSet`, `RamaDub`, `MotionLab` are CamelCase and `re:sonate` is
 * lower case with a colon. `text-transform` INHERITS, and the upper-casing
 * utility appears in 43 files in this tree, so *we did not add it* is a hope
 * about every ancestor rather than a guarantee. The transform is DECLARED on
 * the element that carries a literal.
 *
 * WHAT THIS CHECK SEES: a literal rendered as the DIRECT child expression of
 * an element, or the brand written as that element's text. WHAT IT DOES NOT
 * SEE: a literal nested two elements deeper, or one assembled inside a child
 * component. Stated, not discovered — the honest scope of a string check.
 */
const LITERAL_BEARING = [
  "formatName",
  "nightTitle",
  "composeNightName",
  "composeSigla",
  "seriesCode",
  ".sigla",
];

/** Class constants in this file whose value carries the declared transform. */
function transformCarriers(file) {
  const names = new Set();
  const declaration = /const\s+([A-Za-z0-9_]+)\s*=\s*(["'`])([^"'`]*)\2/g;
  let match = declaration.exec(file.joined);
  while (match !== null) {
    if (match[3].includes(NORMAL_CASE)) names.add(match[1]);
    match = declaration.exec(file.joined);
  }
  return names;
}

/** The opening tag enclosing the child expression at `at`, or `null`. */
function enclosingTag(file, at) {
  const from = Math.max(0, at - 400);
  const before = file.joined.slice(from, at);
  // Between the tag's `>` and the literal there may be only whitespace and the
  // opening brace of the expression: that is what makes this a DIRECT child and
  // keeps a declaration elsewhere in the file from being read as one.
  const gap = /^[\s{]*$/;
  const close = before.lastIndexOf(">");
  if (close === -1) return null;
  if (!gap.test(before.slice(close + 1))) return null;
  const open = before.lastIndexOf("<", close);
  if (open === -1) return null;
  return { text: before.slice(open, close + 1), index: from + open };
}

function u8() {
  const failures = [];
  for (const file of surface) {
    if (file.ext !== ".tsx") continue;
    const carriers = transformCarriers(file);
    const declares = (tag) =>
      tag.includes(NORMAL_CASE) || [...carriers].some((name) => tag.includes(name));

    const subjects = [...LITERAL_BEARING, BRAND];
    for (const subject of subjects) {
      for (const at of indicesOf(file.joined, subject)) {
        const tag = enclosingTag(file, at);
        if (tag === null) continue;
        if (!declares(tag.text)) {
          failures.push({
            rel: file.rel,
            line: lineOf(file, at),
            detail: `a literal rendered on an element that does not declare the transform`,
          });
        }
      }
    }
  }
  return {
    id: "U8",
    title: "every element carrying a format name, a sigla or the brand declares the transform",
    note: "text-transform inherits, so not adding one upstream is a hope and not a guarantee",
    failures,
  };
}

/* ── U9 ─────────────────────────────────────────────────────────────────────
 *
 * The reversed glyph lives only inside the drawn logo. Pasting it into text
 * produces a word search engines, screen readers and somebody's inbox do not
 * recognise.
 */
function u9() {
  return {
    id: "U9",
    title: "the reversed glyph does not occur",
    note: "matched by code point — the character is never written into this script",
    failures: occurrencesOf(REVERSED_E).map((hit) => ({
      ...hit,
      detail: "the reversed glyph, which belongs only inside the logo",
    })),
  };
}

/* ── U10 ────────────────────────────────────────────────────────────────────
 *
 * §17, the runtime rule that is stricter than the document's. A row on this
 * surface is an unannounced date, a space under negotiation, or the shape of
 * an internal plan. A log line is read by whoever holds the platform's
 * dashboard, an error toast is read by whoever is standing behind the screen,
 * and neither is a place any of that may travel to. Diagnostics carry an id
 * and a reason code, which are safe to read anywhere.
 *
 * Asserted STRUCTURALLY, which is the only way a string check can reach it: no
 * `console.*` call interpolates a field of one of the confidential names, and
 * nothing reads the free-text field the calendar file carries.
 */
const CONFIDENTIAL_FIELDS = [
  "summary",
  "SUMMARY",
  "venue_word",
  "venueWord",
  "lineup",
  "lineUp",
  "line_up",
  "title",
];

const CONSOLE_METHODS = ["console.error(", "console.warn(", "console.log(", "console.info(", "console.debug("];

function u10() {
  const failures = [];
  for (const file of surface) {
    for (const method of CONSOLE_METHODS) {
      for (const at of indicesOf(file.joined, method)) {
        const open = at + method.length - 1;
        const args = argumentsFrom(file.joined, open);
        for (const field of CONFIDENTIAL_FIELDS) {
          // Only an INTERPOLATION carries a value out; the word alone inside a
          // reason code does not, and reddening on that would be reddening on
          // the sentence that keeps the rule.
          const interpolated = new RegExp(
            "\\$\\{[^}]*\\b" + field + "\\b[^}]*\\}"
          );
          if (interpolated.test(args)) {
            failures.push({
              rel: file.rel,
              line: lineOf(file, at),
              detail: `a diagnostic interpolating ${field}`,
            });
          }
        }
      }
    }
    for (const at of indicesOf(file.joined, ".details")) {
      failures.push({
        rel: file.rel,
        line: lineOf(file, at),
        detail: "the calendar file's free-text field, read on a surface",
      });
    }
  }
  return {
    id: "U10",
    title: "no confidential value reaches a diagnostic, and the free-text field is not read",
    note: "§17 — a log line and an error toast are both places a venue word must not travel",
    failures,
  };
}

/* ────────────────────────────────────────────────────────────────────────────
 * The run
 * ──────────────────────────────────────────────────────────────────────────── */

const CHECKS = [u1, u2, u3, u4, u5, u6, u7, u8, u9, u10];

console.log("");
console.log("verify-calendar-surface — the ten assertions of 44-UI-SPEC.md §15");
console.log("");
console.log(`  scope:  ${SCOPE.join("  ·  ")}`);
console.log(`  files:  ${surface.length}, comments blanked by scripts/lib/comments.mjs`);
console.log("");

const results = CHECKS.map((check) => check());
const failed = results.filter((r) => r.failures.length > 0);

for (const result of results) {
  const mark = result.failures.length === 0 ? "✓" : "✗";
  console.log(`  ${mark} ${result.id.padEnd(4)} ${result.title}`);
  console.log(`         ${result.note}`);
  for (const hit of result.failures) {
    console.log(`         → ${hit.rel}:${hit.line} — ${hit.detail}`);
  }
}

console.log("");
if (failed.length > 0) {
  const total = failed.reduce((sum, r) => sum + r.failures.length, 0);
  console.log(
    `  CALENDAR_SURFACE_FAIL — ${failed.length} check(s) failed: ` +
      `${failed.map((r) => r.id).join(", ")} (${total} occurrence(s))`
  );
  console.log("");
  process.exit(1);
}

console.log("  CALENDAR_SURFACE_OK — 10 check(s) passed.");
console.log(
  "\n  Read the header before treating this as verification. These are string assertions\n" +
    "  over source files: none of them renders an element, none proves the surface is\n" +
    "  correct, and none proves a proposed date does not read as settled — that one has a\n" +
    "  written procedure and a role, in 44-PROCEDURES.md, and until it has a result the\n" +
    "  question is open.\n"
);
process.exit(0);
