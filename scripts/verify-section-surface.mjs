#!/usr/bin/env node
/**
 * verify-section-surface.mjs — the mechanical half of phase 45's success
 * criteria 2 and 3, plus D-45-18's log shape, run as a command instead of
 * remembered.
 *
 * WHAT IT ASSERTS, in one sentence: **the three production sections' files
 * agree with five string-level rules that phase 45 wrote down, and with nothing
 * else.**
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
 *   - **CHECK A PROVES A BADGE IS IN THE TREE, NOT THAT A PERSON CAN READ IT.**
 *     Success criterion 2 says a stage that is not `acquired` is visible as such
 *     *wherever the space is named*. Visible is a judgement about a screen. The
 *     half this file can hold is *rendered*; the other half is procedure **P2**
 *     of `45-PROCEDURES.md`, and until that carries a result the criterion is
 *     open.
 *   - **CHECK C CANNOT TELL DECLARED FROM BROKEN.** A section that names what
 *     is missing and whose call it is, and a section that failed to load, are
 *     the same bytes to a grep. Procedure **P3**.
 *   - **CHECK D IS WEAK AND SAYS SO ABOUT ITSELF.** A swatch at four pixels and
 *     a swatch at two hundred are the same source line, and size is precisely
 *     the thing that turns an identification colour into a palette. Procedure
 *     **P4** is the real gate; this check is a tripwire on the shapes that are
 *     visible to text.
 *   - **AND NOTHING HERE OPENS A SESSION.** Whether a section is refused to
 *     somebody the capability model does not admit belongs to
 *     `scripts/verify-refusal.mjs` and to procedure P1. Every check below reads
 *     files.
 *
 * ── THE SCOPE, AND WHY IT IS SEVEN DIRECTORIES AND NOT THE WHOLE TREE ──────
 *
 * The five rules are scoped to the three sections' own files **and to nothing
 * else**. Widening the scan would redden files that never agreed to these rules,
 * and a gate that goes red on a correct tree is a gate somebody disables — this
 * repository has the receipt for that, at `41-GAP-REVIEW-4.md` CR-01 and CR-02.
 *
 * Six of the seven are the measured `(work)` convention (`nextjs-architecture.md`,
 * R-WORK-ROUTES): route files inside the nested group, every co-located Server
 * Action and client component one level out. The seventh is the shared module
 * directory the three sections read through.
 *
 * **A directory that is not on disk is a REFUSAL, never a pass.** At the moment
 * this file is written none of the seven exists, so the correct outcome of the
 * first run is exit 2 with all seven named. A gate that measured nothing and
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
 * The seven directories, and nothing else.
 *
 * Written as whole paths rather than as a root plus a pattern: a pattern is one
 * edit away from covering the tree, and the edit would not look like a widening.
 */
const SCOPE = [
  "src/app/(admin)/admin/(work)/location",
  "src/app/(admin)/admin/(work)/manifesto",
  "src/app/(admin)/admin/(work)/visual",
  "src/app/(admin)/admin/location",
  "src/app/(admin)/admin/manifesto",
  "src/app/(admin)/admin/visual",
  "src/lib/production/sections",
];

/** Source extensions. A gate that read a PNG as text would redden on bytes. */
const EXTENSIONS = new Set([".ts", ".tsx"]);

/**
 * The extension a file must carry to be able to RENDER anything, and therefore
 * the scope of checks A, B, C and D.
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
 * The contract — the single renderers, declared BEFORE the surfaces exist
 *
 * This is the whole reason this file is written in wave 2 rather than after the
 * sections are built. `PieceDate.tsx:9-16` is the precedent and states the
 * premise every guarantee rests on: **a second renderer is a second place where
 * the rule can be broken**, and a rule that has to be re-asserted in every file
 * is a rule that will be missed in one of them.
 *
 * A path below that no file satisfies is a FAILURE once the scope exists — not a
 * pass. The surfaces satisfy this list; the list does not describe them.
 * ──────────────────────────────────────────────────────────────────────────── */

/** Check A — the only component that may render a space's name. */
const NAME_RENDERER = "SpaceName.tsx";

/** What it must render beside the name, in its own subtree. */
const STAGE_BADGE = "StageBadge";

/** The ways a space's name reaches a component. */
const NAME_TOKENS = ["space.name", "spaceName", "space_name"];

/** Check B — the only component that may render a computed per-format score. */
const SCORE_RENDERER = "SpaceScore.tsx";

/** What it must render beside the score. */
const SCORE_PROVENANCE = "ScoreProvenance";

/** The ways a computed score reaches a component. */
const SCORE_TOKENS = ["space.score", "spaceScore", "scoreForFormat", "formatScore"];

/** Check B — the only component that may render one attribute's value. */
const ATTRIBUTE_RENDERER = "SpaceAttribute.tsx";

/** The marker that says whether the question behind the value was ever asked. */
const ATTRIBUTE_MARKER = "AttributeAsked";

/** The ways an attribute's value reaches a component. */
const ATTRIBUTE_TOKENS = ["attribute.value", "attributeValue", "attribute_value"];

/** Check C — the only component that may render a section with no body. */
const VOID_RENDERER = "SectionVoid.tsx";

/** The state name, and the two columns its branch must name. */
const NOT_DECIDED = "not_decided";
const VOID_COLUMNS = ["missing", "decision_owner"];

/* ────────────────────────────────────────────────────────────────────────────
 * Tokens assembled rather than spelled (DEF-41-01, and the grep-hygiene rule)
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * The size utilities through which a swatch becomes large enough to read as a
 * palette. Assembled: they are class strings, and this file sits inside the
 * project root.
 */
const SIZE_PREFIXES = ["w", "h", "size", "min-w", "min-h"].map((one) => one + "-");

/**
 * The step at or above which a swatch stops being a dot on a chip.
 *
 * MEASURED, not chosen: the chip dot the catalogue already draws is three steps
 * (`ColorSwatchPicker.tsx`), and the smallest thing a person reads as a colour
 * FIELD rather than as a marker is eight. A number is written here rather than
 * left to judgement so that the day somebody raises it, the raise is a diff.
 */
const LARGE_STEP = 8;

/** The full-bleed forms, which carry no step at all. Assembled, same reason. */
const FULL_BLEED = ["full", "screen", "0"].map((one) => "-" + one);

/** The ways `formats.color` reaches a component. */
const FORMAT_COLOUR_TOKENS = ["format.color", "formatColor", "format_color", "formats.color"];

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
console.log("verify-section-surface — five assertions over the three production sections");
console.log("");
console.log("  0 = passed  ·  1 = FAILED  ·  2 = REFUSED, and nothing was measured.");
console.log("");

const missing = SCOPE.filter((dir) => !existsSync(join(ROOT, dir)));
if (missing.length > 0) {
  refuse(
    `${missing.length} of ${SCOPE.length} scope directories are not on disk:\n` +
      missing.map((dir) => `         · ${dir}`).join("\n") +
      "\n\n" +
      "       The five assertions are scoped to these directories, so NOTHING WAS MEASURED.\n" +
      "       This is the honest outcome before the sections are built, and it is not a\n" +
      "       defect to repair: a zero here would mean the gate went green on an absence.\n" +
      "       When a section lands, its directory appears and the checks that read it start\n" +
      "       measuring. If a section MOVED instead, this list moves with it in the same\n" +
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
 * The single-renderer assertion, in one place because it is asserted four times.
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
 * The five checks
 *
 * Each returns `{ id, title, note, limit, failures: [{ rel, line, detail }] }`.
 * `limit` is not decoration: it is the sentence a reader holding a tick needs,
 * and it is printed on a pass as well as on a failure.
 * ──────────────────────────────────────────────────────────────────────────── */

/* ── A ──────────────────────────────────────────────────────────────────────
 *
 * Success criterion 2, in its own words: **a stage that is not `acquired` is
 * visible as such wherever the space is named.** `venue-acquisition.md`'s gate
 * *lo stato prima del nome* is the domain reason, and `una classifica non e' una
 * disponibilita'* is the consequence of getting it wrong: a candidate presented
 * as a venue is a date in the calendar with nowhere to happen.
 *
 * WHAT WOULD TRIP IT: a list row that draws the space's name and leaves the
 * badge to the detail page — the ordinary, well-meant version of this mistake,
 * and the one that puts a name under negotiation on a screen with nothing
 * beside it.
 */
function checkA() {
  return {
    id: "A",
    title: "the stage stands beside the name, in one renderer",
    note: `${NAME_RENDERER} is the only file that may render a space's name, and it names ${STAGE_BADGE}`,
    limit:
      "a string assertion proves the badge is IN THE TREE. Whether a person reads it as a " +
      "stage rather than as decoration is procedure P2",
    failures: singleRenderer({
      rendererFile: NAME_RENDERER,
      companions: [STAGE_BADGE],
      tokens: NAME_TOKENS,
      what: "a space's name",
    }),
  };
}

/* ── B ──────────────────────────────────────────────────────────────────────
 *
 * D-45-11's two mitigations, which the owner accepted as a stated cost rather
 * than avoided. A score is COMPUTED from attributes and never stored, so the
 * thing that makes it readable is the provenance of its inputs: a score derived
 * from a public listing is a hypothesis, one checked on site for that format is
 * a datum, and `venue-acquisition.md`'s *derivato non e' verificato* says the
 * reader must be able to tell them apart.
 *
 * The second half is the attribute: five of them carry *verifica* per attribute,
 * and a blank cell and an unasked question are the same pixel unless something
 * says which one it is.
 *
 * WHAT WOULD TRIP IT: a summary card that shows the per-format score as a number
 * on its own, because a number is what fits — which is exactly how the score
 * detaches from the attributes it was computed from.
 */
function checkB() {
  return {
    id: "B",
    title: "the provenance stands beside the value, in one renderer each",
    note: `${SCORE_RENDERER} names ${SCORE_PROVENANCE}; ${ATTRIBUTE_RENDERER} names ${ATTRIBUTE_MARKER}`,
    limit:
      "it proves the marker is rendered, never that the distinction is legible. The same " +
      "half-measure as check A, and the same procedure closes it",
    failures: [
      ...singleRenderer({
        rendererFile: SCORE_RENDERER,
        companions: [SCORE_PROVENANCE],
        tokens: SCORE_TOKENS,
        what: "a computed per-format score",
      }),
      ...singleRenderer({
        rendererFile: ATTRIBUTE_RENDERER,
        companions: [ATTRIBUTE_MARKER],
        tokens: ATTRIBUTE_TOKENS,
        what: "an attribute's value",
      }),
    ],
  };
}

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

/* ── D ──────────────────────────────────────────────────────────────────────
 *
 * D-45-16, and this check is **weak on purpose and says so**.
 *
 * `formats.color` is `NOT NULL`, so every format carries an identification
 * colour, including the one that has no palette. Drawn large, that value becomes
 * a palette nobody decided — `brand-visual-system.md`'s *il colore non si
 * eredita*, and the way a format loses its identity before having one.
 *
 * WHY IT IS WEAK, stated rather than discovered: a swatch at four pixels and a
 * swatch at two hundred are the same source line. This check reads the size
 * utilities that are visible as text on the same line as the value; it is blind
 * to a size computed at run time, held in a variants map, or set in a style
 * attribute. **Procedure P4 is the real gate**, and it exists because no
 * assertion over source can reach this one.
 *
 * WHAT WOULD TRIP IT: a header block that fills the panel with the format's
 * colour to make the section look finished.
 */
function checkD() {
  const failures = [];
  const largeSteps = [];
  for (let step = LARGE_STEP; step <= 96; step += 1) largeSteps.push("-" + String(step));

  for (const file of surface) {
    if (!file.renders) continue;
    for (let i = 0; i < file.lines.length; i += 1) {
      const line = file.lines[i];
      if (!FORMAT_COLOUR_TOKENS.some((token) => line.includes(token))) continue;
      for (const prefix of SIZE_PREFIXES) {
        for (const at of indicesOf(line, prefix)) {
          // The character before the prefix decides whether this is a utility or
          // the tail of a longer word. Without it the shorter prefixes match
          // inside ordinary identifiers, and a gate that reddens on correct code
          // is a gate somebody disables — which is the failure that costs most,
          // because it takes the four true findings with it.
          const before = at === 0 ? " " : line[at - 1];
          if (/[A-Za-z0-9_-]/.test(before)) continue;
          const tail = line.slice(at + prefix.length - 1);
          const large =
            largeSteps.some((step) => tail.startsWith(step)) ||
            FULL_BLEED.some((form) => tail.startsWith(form));
          if (!large) continue;
          failures.push({
            rel: file.rel,
            line: i + 1,
            detail:
              "a format's identification colour on the same line as a size utility at or " +
              `above ${LARGE_STEP} steps — drawn that big it reads as a palette`,
          });
        }
      }
    }
  }

  return {
    id: "D",
    title: "a format colour is never drawn as a palette",
    note: "line-scoped, and it reads utilities that are visible as text",
    limit:
      "WEAK, and deliberately so. A swatch at four pixels and one at two hundred are the " +
      "same source line; size is exactly what turns an identification colour into a " +
      "palette, and no grep sees size. Procedure P4 is the gate this one only points at",
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
 * `console.error("[location.save_failed]", error)`, written by somebody who has
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

const CHECKS = [checkA, checkB, checkC, checkD, checkE];

console.log(`  scope:  ${SCOPE.length} directories`);
for (const dir of SCOPE) console.log(`          · ${dir}`);
console.log(
  `  files:  ${surface.length}, of which ${surface.filter((f) => f.renders).length} can render ` +
    "(checks A–D); comments blanked by scripts/lib/comments.mjs"
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

console.log("  SECTION_SURFACE_OK — 5 check(s) passed.");
console.log(
  "\n  Read the header before treating this as verification. These are string assertions\n" +
    "  over source files: none renders an element, none measures a pixel, and none opens a\n" +
    "  session. The four judgements they cannot make are written down as procedures P1 to\n" +
    "  P4 in 45-PROCEDURES.md, and until those carry a result the questions are open.\n"
);
process.exit(0);
