#!/usr/bin/env node
/**
 * verify-section-surface.mjs — the mechanical half of phase 45's success
 * criteria 2 and 3, plus D-45-18's log shape, run as a command instead of
 * remembered.
 *
 * WHAT IT ASSERTS, in one sentence: **the manifesto section's files agree
 * with the two string-level rules phase 45 wrote down that still have a surface
 * to measure, and with nothing else.**
 *
 * ── 2026-10-14, PHASE 53 (D-53-04): THREE CHECKS LEFT, TWO STAYED ──────────
 *
 * Phase 45 wrote five checks over three production sections. Phase 53 removed
 * two of those sections from the product — the space scouting and the visual
 * archive — and with them the only files three of the checks could read:
 *
 *   - **A** (the stage beside a space's name) and **B** (the provenance beside
 *     a score and an attribute) measured the scouting section's renderers. No
 *     space is named and no score is drawn anywhere in scope any more, so the
 *     two checks would have measured an absence, and a check that can only be
 *     green on nothing is not a check.
 *   - **D** (a format colour never drawn as a palette) read the visual
 *     section's swatches. Same reason.
 *
 * They were removed because their SURFACE left, never because they were red:
 * no threshold was lowered and no token list narrowed on a check that stayed.
 * **C** (the void is declared) and **E** (the log shape) measure the manifesto
 * and stayed whole. They keep their LETTERS, deliberately: the manifesto's own
 * void renderer cites "check C" in its header as its proof, and a renumbering
 * would have turned that citation into a pointer at nothing.
 *
 * ── WHAT A GREEN DOES NOT MEAN (cosa un verde NON significa) ────────────────
 *
 * Read this before quoting an exit code at anybody.
 *
 *   - **THESE ARE STRING ASSERTIONS OVER SOURCE FILES.** Not one of them runs a
 *     line of product code, renders an element, or measures a pixel. There is
 *     no test runner in this repository — no `test` script, no `*.test.*`, no
 *     `*.spec.*` (`CLAUDE.md` Guardrail 1) — and this file is not one. A green
 *     says the files agree with a contract written in a document. It does not
 *     say a gate is right, and it does not say a screen works.
 *   - **CHECK C CANNOT TELL DECLARED FROM BROKEN.** A section that names what
 *     is missing and whose call it is, and a section that failed to load, are
 *     the same bytes to a grep. Procedure **P3**.
 *   - **AND NOTHING HERE OPENS A SESSION.** Whether a section is refused to
 *     somebody the capability model does not admit belongs to
 *     `scripts/verify-refusal.mjs` and to procedure P1. Every check below reads
 *     files.
 *
 * ── THE SCOPE, AND WHY IT IS THREE DIRECTORIES AND NOT THE WHOLE TREE ──────
 *
 * The rules are scoped to the manifesto section's own files **and to nothing
 * else**. Widening the scan would redden files that never agreed to these rules,
 * and a gate that goes red on a correct tree is a gate somebody disables — this
 * repository has the receipt for that, at `41-GAP-REVIEW-4.md` CR-01 and CR-02.
 *
 * Two of the three are the measured `(work)` convention (`nextjs-architecture.md`,
 * R-WORK-ROUTES): route files inside the nested group, every co-located Server
 * Action and client component one level out. The third is the shared module
 * directory the section reads through. (Until phase 53 the list held seven: the
 * same pair for the two sections that left, which went with them.)
 *
 * **A directory that is not on disk is a REFUSAL, never a pass.** When this file
 * was first written none of the directories existed, so the correct outcome of
 * the first run was exit 2 with all of them named. A gate that measured nothing and
 * printed a tick is the exact defect this repository's gates exist to prevent,
 * and it is easiest to introduce on the day the thing being measured has not
 * been built yet.
 *
 * ── GREP HYGIENE, WHICH IS NOT OPTIONAL HERE ───────────────────────────────
 *
 * Several tokens below will be named in the header of the very files being
 * checked, inside the sentence forbidding them. A check that reddened on the
 * comment explaining why it should be green is a check that gets disabled the
 * third time it runs.
 *
 * So every file is read through `scripts/lib/comments.mjs` — the one stripper,
 * proved by asserted mutation, whose stated error direction is *blanks more,
 * never less*. A file whose comment never closes is a file this gate cannot
 * measure, and it REFUSES rather than reporting a green about nothing.
 *
 * ── AND THIS SCRIPT DOES NOT MATCH ITSELF ──────────────────────────────────
 *
 * It lives in `scripts/`, outside the scan scope, so naming a forbidden token
 * here cannot make a check green on its own prohibition. One token is assembled
 * from pieces anyway, and for a reason that is not symmetry: **PostgREST's third
 * error field is named nowhere in this file**, because a grep for it whose only
 * match is the sentence forbidding it is a grep somebody stops believing. The
 * discipline is `formats/actions.ts:58-63`'s, adopted for its reason.
 *
 * ── EXIT CODES ─────────────────────────────────────────────────────────────
 *
 * `0` passed · `1` FAILED · `2` REFUSED, and a refusal is not a failure: it
 * means the measurement did not happen.
 *
 * SECRECY. `.planning/` is tracked and this repository is PUBLIC (`CLAUDE.md`
 * Guardrail 5). This gate names no space under negotiation, no unannounced date
 * and no line-up. It prints file paths, line numbers and the offending token —
 * never a row's content, because the rows these surfaces hold are exactly the
 * material that must not travel.
 *
 * DEF-41-01, measured: Tailwind compiles class strings out of comments, and
 * `scripts/` is inside the project root and is not ignored. Every utility string
 * this gate looks for is assembled at run time from its pieces and is spelled as
 * a literal nowhere in this file, in code or in prose.
 *
 * Zero dependencies. Node built-ins only, ESM.
 */

import { existsSync, readdirSync, statSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { liveLines } from "./lib/comments.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/* ────────────────────────────────────────────────────────────────────────────
 * Scope — named directories, and the reason each one is in the list
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * The three directories, and nothing else.
 *
 * Written as whole paths rather than as a root plus a pattern: a pattern is one
 * edit away from covering the tree, and the edit would not look like a widening.
 */
const SCOPE = [
  "src/app/(admin)/admin/(work)/manifesto",
  "src/app/(admin)/admin/manifesto",
  "src/lib/production/sections",
];

/** Source extensions. A gate that read a PNG as text would redden on bytes. */
const EXTENSIONS = new Set([".ts", ".tsx"]);

/**
 * The extension a file must carry to be able to RENDER anything, and therefore
 * the scope of check C.
 *
 * **This is not a convenience narrowing, and it was measured rather than
 * assumed.** The first run of this gate against a probe tree reddened check C on
 * `src/lib/production/sections/vocabulary.ts`, which names `not_decided` twice —
 * once in the state union and once in the label map — and renders nothing at
 * all. That is a gate going red on correct code, which is the failure that costs
 * the most here: it takes the true findings with it when somebody switches the
 * gate off.
 *
 * The narrowing is safe in the direction that matters because JSX is only legal
 * in a `.tsx` file under this project's TypeScript configuration, so a renderer
 * CANNOT hide in a `.ts` module. What a `.ts` module can do is log — which is
 * why check E deliberately keeps the whole scope, server actions included, and
 * why it is the one check that reads every file.
 */
const RENDER_EXTENSION = ".tsx";

/* ────────────────────────────────────────────────────────────────────────────
 * The contract — the single renderer, declared BEFORE the surface existed
 *
 * The premise every guarantee below rests on was first stated by the single
 * renderer of a piece's date, which left with the calendar: **a second renderer
 * is a second place where the rule can be broken**, and a rule that has to be
 * re-asserted in every file is a rule that will be missed in one of them.
 *
 * A path below that no file satisfies is a FAILURE once the scope exists — not a
 * pass. The surface satisfies this list; the list does not describe it.
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * The ways a space's name reaches a component. No longer the subject of a check
 * of its own (check A left with the scouting section), and kept because check E
 * still forbids interpolating it into a log: a manifesto is handed to people in
 * the console, and a space's identity has no business in a line beside it.
 */
const NAME_TOKENS = ["space.name", "spaceName", "space_name"];

/** Check C — the only component that may render a section with no body. */
const VOID_RENDERER = "SectionVoid.tsx";

/** The state name, and the two columns its branch must name. */
const NOT_DECIDED = "not_decided";
const VOID_COLUMNS = ["missing", "decision_owner"];

/* ────────────────────────────────────────────────────────────────────────────
 * Tokens assembled rather than spelled (DEF-41-01, and the grep-hygiene rule)
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * PostgREST's third error field, assembled from pieces and NEVER spelled.
 *
 * On a constraint violation PostgREST returns the entire failing row in it. Until
 * this phase what that leaked was a profile row; with D-45-05 what it can leak is
 * the address of a space under negotiation, into logs nobody watches, because
 * this project has no error tracking at all. D-45-18, promoted to Critical by
 * D-45-21.
 *
 * It is assembled because a grep for it would otherwise match the sentence above
 * — and a check whose only hit is its own prohibition is a check that gets
 * ignored the third time it goes red.
 */
const PGRST_ROW_FIELD = "." + "det" + "ai" + "ls";

/** The diagnostic methods. A log line is read by whoever holds the dashboard. */
const CONSOLE_METHODS = [
  "console.error(",
  "console.warn(",
  "console.log(",
  "console.info(",
  "console.debug(",
];

/** The bare identifiers that carry a whole error object. */
const WHOLE_ERROR_IDENTIFIERS = ["error", "err", "e"];

/** The two fields D-45-18 permits, by name. */
const PERMITTED_ERROR_FIELDS = ["code=", "message="];

/** A space's address, wherever it is named. */
const ADDRESS_TOKENS = ["address"];

/* ────────────────────────────────────────────────────────────────────────────
 * Reading the surface
 * ──────────────────────────────────────────────────────────────────────────── */

/** A refusal is not a failure: it means the measurement did not happen. */
function refuse(message) {
  console.log("");
  console.log(`  FATAL: ${message}`);
  console.log("");
  process.exit(2);
}

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

console.log("");
console.log("verify-section-surface — two assertions over the manifesto section");
console.log("");
console.log("  0 = passed  ·  1 = FAILED  ·  2 = REFUSED, and nothing was measured.");
console.log("");

const missing = SCOPE.filter((dir) => !existsSync(join(ROOT, dir)));
if (missing.length > 0) {
  refuse(
    `${missing.length} of ${SCOPE.length} scope directories are not on disk:\n` +
      missing.map((dir) => `         · ${dir}`).join("\n") +
      "\n\n" +
      "       The assertions are scoped to these directories, so NOTHING WAS MEASURED.\n" +
      "       A zero here would mean the gate went green on an absence, so this is not a\n" +
      "       defect to repair by narrowing the list. If the section MOVED, this list moves with it in the same\n" +
      "       commit — a scope that lags the tree is a gate that stopped looking."
  );
}

const files = [];
for (const dir of SCOPE) walk(join(ROOT, dir), files);
files.sort();

if (files.length === 0) {
  refuse(
    "the scope directories exist and hold no .ts or .tsx file. A gate that measured\n" +
      "       zero files and printed a green is the exact defect this repository's gates were\n" +
      "       written to prevent."
  );
}

const surface = [];
for (const abs of files) {
  const { lines, unterminated } = liveLines(abs);
  if (unterminated !== null) {
    refuse(
      `${relative(ROOT, abs)} opens a ${unterminated.kind} comment on line ` +
        `${unterminated.lineNo} that never closes.\n` +
        "       This gate cannot tell that file's comments from its code, so it measured\n" +
        "       nothing about it — and a green covering the other files while claiming the\n" +
        "       whole surface is a green that lied by omission."
    );
  }
  surface.push({
    abs,
    rel: relative(ROOT, abs),
    name: abs.slice(abs.lastIndexOf("/") + 1),
    renders: extname(abs) === RENDER_EXTENSION,
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
 * A regular expression cannot do this: a nested call closes on the inner paren
 * and the argument read would be wrong in the direction that hides a violation.
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

/** Every live occurrence of `needle` across the whole surface, with a filter. */
function occurrencesOf(needle, filter = () => true) {
  const found = [];
  for (const file of surface) {
    if (!filter(file)) continue;
    for (const at of indicesOf(file.joined, needle)) {
      found.push({ rel: file.rel, line: lineOf(file, at), token: needle });
    }
  }
  return found;
}

/** The file in scope whose basename is `name`, or `undefined`. */
function rendererNamed(name) {
  return surface.find((file) => file.name === name);
}

/**
 * The single-renderer assertion. Phase 45 asserted it four times; since phase 53
 * check C is its only caller, and it stays a function because that is the shape
 * the next single renderer will need.
 *
 * Returns the failures for: the renderer is absent; the renderer does not name
 * its companion; some other file in scope names one of the tokens.
 */
function singleRenderer({ rendererFile, companions, tokens, what }) {
  const failures = [];
  const renderer = rendererNamed(rendererFile);

  if (renderer === undefined) {
    failures.push({
      rel: "(nowhere in scope)",
      line: 0,
      detail:
        `${rendererFile} is not in scope, and it is the ONLY file allowed to render ` +
        `${what}. Its absence is not a pass: it means either the rule moved without ` +
        "this list moving with it, or nothing renders the value at all",
    });
  } else {
    for (const companion of companions) {
      if (!renderer.joined.includes(companion)) {
        failures.push({
          rel: renderer.rel,
          line: 1,
          detail: `renders ${what} and does not name ${companion} anywhere in its own tree`,
        });
      }
    }
  }

  for (const token of tokens) {
    for (const hit of occurrencesOf(
      token,
      (file) => file.renders && file.name !== rendererFile
    )) {
      failures.push({
        ...hit,
        detail: `${token} — a second renderer of ${what}, outside ${rendererFile}`,
      });
    }
  }

  return failures;
}

/* ────────────────────────────────────────────────────────────────────────────
 * The two checks — C and E, letters kept from phase 45 (see the header)
 *
 * Each returns `{ id, title, note, limit, failures: [{ rel, line, detail }] }`.
 * `limit` is not decoration: it is the sentence a reader holding a tick needs,
 * and it is printed on a pass as well as on a failure.
 * ──────────────────────────────────────────────────────────────────────────── */

/* ── C ──────────────────────────────────────────────────────────────────────
 *
 * Success criterion 3. `sound-manifesto.md` carries the domain rule this
 * enforces: *non-scritto e' una risposta, inventato non lo e'* — a format
 * without a manifesto is answered with **not yet decided**, and the answer has
 * to say what is missing and whose call it is, or a reader takes the blank for a
 * bug and somebody fills it.
 *
 * WHAT WOULD TRIP IT: a section component that early-returns `null` when the
 * body is empty. It compiles, it looks tidy, and it turns a declared void into a
 * blank panel.
 */
function checkC() {
  const failures = singleRenderer({
    rendererFile: VOID_RENDERER,
    companions: VOID_COLUMNS,
    tokens: [],
    what: "a section with no body",
  });

  for (const hit of occurrencesOf(
    NOT_DECIDED,
    (file) => file.renders && file.name !== VOID_RENDERER
  )) {
    const file = surface.find((one) => one.rel === hit.rel);
    for (const column of VOID_COLUMNS) {
      if (!file.joined.includes(column)) {
        failures.push({
          ...hit,
          detail:
            `branches on ${NOT_DECIDED} and never names ${column} — a void that does not ` +
            "declare itself reads as a failed load",
        });
      }
    }
  }

  return {
    id: "C",
    title: "the void is declared, never blank",
    note: `every ${NOT_DECIDED} branch names ${VOID_COLUMNS.join(" and ")}`,
    limit:
      "it cannot tell DECLARED from BROKEN on a screen — those are the same bytes to a " +
      "grep, and the difference is a judgement. Procedure P3",
    failures,
  };
}

/* ── E ──────────────────────────────────────────────────────────────────────
 *
 * D-45-18, promoted to Critical by D-45-21.
 *
 * Two facts make this the phase's cheapest large risk. The first: on a
 * constraint violation PostgREST returns the whole failing row inside its third
 * error field, and roughly twenty existing sites in this repository log the
 * whole error object. The second: with D-45-05 the row that fails can be a space
 * under negotiation, carrying a street address on a column of its own (D-45-24).
 *
 * And there is no error tracking in this project, so a log line is a place
 * nobody looks — which makes it a place an address can sit for months.
 *
 * WHAT WOULD TRIP IT: the shortest correct-looking catch in the language,
 * `console.error("[manifesto.save_failed]", error)`, written by somebody who has
 * read the other twenty sites and copied the shape.
 */
function checkE() {
  const failures = [];

  for (const file of surface) {
    for (const method of CONSOLE_METHODS) {
      for (const at of indicesOf(file.joined, method)) {
        const open = at + method.length - 1;
        const args = argumentsFrom(file.joined, open);
        const line = lineOf(file, at);

        if (method === "console.error(") {
          for (const field of PERMITTED_ERROR_FIELDS) {
            if (!args.includes(field)) {
              failures.push({
                rel: file.rel,
                line,
                detail: `a diagnostic that does not carry ${field} — D-45-18 asks for both`,
              });
            }
          }
        }

        if (args.includes(PGRST_ROW_FIELD)) {
          failures.push({
            rel: file.rel,
            line,
            detail:
              "a diagnostic reading the error field that carries the whole failing row. " +
              "That row can be a space under negotiation, and this project has no error " +
              "tracking, so nobody would ever see it happen",
          });
        }

        for (const identifier of WHOLE_ERROR_IDENTIFIERS) {
          const bare = new RegExp("(^|[,\\s(])" + identifier + "([,\\s)]|$)");
          const interpolated = new RegExp("\\$\\{\\s*" + identifier + "\\s*\\}");
          if (bare.test(args) || interpolated.test(args)) {
            failures.push({
              rel: file.rel,
              line,
              detail: `a diagnostic receiving the whole error object as \`${identifier}\``,
            });
          }
        }

        for (const token of [...NAME_TOKENS, ...ADDRESS_TOKENS]) {
          const interpolated = new RegExp("\\$\\{[^}]*" + token.replace(".", "\\.") + "[^}]*\\}");
          if (interpolated.test(args)) {
            failures.push({
              rel: file.rel,
              line,
              detail: `a diagnostic interpolating ${token} — a space's identity, into a log`,
            });
          }
        }
      }
    }
  }

  return {
    id: "E",
    title: "a diagnostic carries a code and a message, and nothing a space could be named by",
    note: "the forbidden error field is assembled from pieces and is named nowhere in this file",
    limit:
      "it reads the ARGUMENTS of a call it can see. A value routed through a helper, or a " +
      "logger wrapped one level out, is invisible to it — and there is no error tracking " +
      "here, so nothing else would notice either",
    failures,
  };
}

/* ────────────────────────────────────────────────────────────────────────────
 * The run
 * ──────────────────────────────────────────────────────────────────────────── */

const CHECKS = [checkC, checkE];

console.log(`  scope:  ${SCOPE.length} directories`);
for (const dir of SCOPE) console.log(`          · ${dir}`);
console.log(
  `  files:  ${surface.length}, of which ${surface.filter((f) => f.renders).length} can render ` +
    "(check C); comments blanked by scripts/lib/comments.mjs"
);
console.log("");

const results = CHECKS.map((check) => check());
const failed = results.filter((r) => r.failures.length > 0);

for (const result of results) {
  const mark = result.failures.length === 0 ? "✓" : "✗";
  console.log(`  ${mark} ${result.id.padEnd(3)} ${result.title}`);
  console.log(`        ${result.note}`);
  console.log(`        limit: ${result.limit}`);
  for (const hit of result.failures) {
    console.log(`        → ${hit.rel}:${hit.line} — ${hit.detail}`);
  }
  console.log("");
}

if (failed.length > 0) {
  const total = failed.reduce((sum, r) => sum + r.failures.length, 0);
  console.log(
    `  SECTION_SURFACE_FAIL — ${failed.length} check(s) failed: ` +
      `${failed.map((r) => r.id).join(", ")} (${total} occurrence(s))`
  );
  console.log("");
  process.exit(1);
}

console.log(`  SECTION_SURFACE_OK — ${CHECKS.length} check(s) passed.`);
console.log(
  "\n  Read the header before treating this as verification. These are string assertions\n" +
    "  over source files: none renders an element, none measures a pixel, and none opens a\n" +
    "  session. The judgements they cannot make are written down as procedures P1 and P3\n" +
    "  in 45-PROCEDURES.md, and until those carry a result the questions are open.\n"
);
process.exit(0);
