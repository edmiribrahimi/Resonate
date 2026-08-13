/**
 * comments.mjs — blank a source file's comments before any gate counts it, once,
 * in one place, instead of ten times in ten scripts that disagree.
 *
 * WHAT IT ASSERTS, in one sentence: **nothing.** This module is not a gate: it
 * is the reader every gate uses, and the only claim it makes is about its own
 * output — a line handed back as live is a line whose leading comment spans have
 * been consumed, and a line handed back empty is a line that was comment to its
 * end.
 *
 * ── THE DECISION IT ENCODES, AND THE FOUR FAMILIES IT REPLACES ──────────────
 *
 * D-41.1-07: the comment stripper becomes ONE module, imported by all TEN gates
 * that carried a copy. D-41.1-08: it lands BEFORE the first conversion plan of
 * phase 41.1, because every `REMAINING` deletion in that phase is a claim these
 * gates measure, and round 5 measured a money-domain entry going invisible
 * through exactly this hole with the gate printing a conversion notice and
 * exiting 0. D-41.1-09: it is proved by asserted mutation —
 * `scripts/verify-comment-stripper.mjs` — with each mutation asserted applied
 * before its result is read.
 *
 * `41.1-RESEARCH.md` §4.1 measured what was actually there: not eight copies of
 * one heuristic but **four families**, byte-hashed —
 *
 *   A  sibling      per-line only, no JSX awareness, no multi-line state.
 *                   Six byte-identical copies of a four-line `isCommentLine`.
 *   B  span         round 5's fix: consumes a leading comment's SPAN and returns
 *                   the live remainder; carries a JSX multi-line state.
 *   C  tables       JSX multi-line state, whole-line blanking, no block state.
 *   D  jsx+block    DEF-41-06's G5 fix: JSX AND block multi-line state,
 *                   whole-line blanking.
 *
 * No family was correct on all seven measured shapes, and the two error
 * directions were split across families: A is never blind and false-red on
 * three shapes; D is never false-red and blind on all three live-code shapes.
 * That, and not "ten copies is a lot", is the argument for this file.
 *
 * ── WHY A STRUCTURAL CHECK AND NOT A TEST ───────────────────────────────────
 *
 * There is no test runner in this repository — no `test` script, no `*.test.*`,
 * no `*.spec.*` (`CLAUDE.md` Guardrail 1). So this module cannot be covered by a
 * suite, and saying it is would be worse than saying it is not. What exists
 * instead is a gate that runs it: `verify-comment-stripper.mjs` writes eight
 * probe files OUTSIDE the repository, reads each back and asserts it byte-equal
 * to what was written BEFORE reading any result, and runs the four incumbent
 * families beside this module on the same probes so the defect and its repair
 * print on the same page.
 *
 * That harness is the whole of the evidence. A green from it is a green about
 * eight shapes, not about this file being right.
 *
 * ── WHAT A GREEN DOES NOT MEAN (cosa un verde NON significa) ────────────────
 *
 *   - THIS IS A LINE-SHAPE STATE MACHINE AND NOT A TOKENISER. D-41.1-07 fixes
 *     that deliberately: `40-REVIEW.md` WR-07 records that a real comment parser
 *     written in this repository was unsound. It has no notion of strings,
 *     template literals or regex literals.
 *   - ITS STATED ERROR DIRECTION IS INHERITED VERBATIM FROM FAMILY D: **a line
 *     whose first characters are a block opener inside a string blanks more than
 *     it should.** More, never less. A gate built on it can therefore under-count
 *     — which is a green that measured less — but it cannot be handed a comment
 *     as if it were code.
 *   - IT SEES ONLY LEADING COMMENTS. A comment opened AFTER live code on the
 *     same line is not consumed, and the live code before it is returned as it
 *     stands. That direction is safe for every gate that fails on presence.
 *   - IT DECIDES NOTHING ABOUT AN UNTERMINATED COMMENT. It reports one and
 *     returns; the caller owns the refusal and its own exit code. This module
 *     never exits the process.
 *
 * ── THE SHAPES, EACH WITH THE REVIEW ENTRY THAT FOUND IT ────────────────────
 *
 *   S1  DEF-41-02      a multi-line JSX comment with prose body lines.
 *                      Family A hands the body back as code.
 *   S2  DEF-41-06      a block comment INSIDE a JSX opening tag, prose body.
 *                      Families A, B and C hand the body back as code.
 *   S3  round 5        a single-line closed JSX comment with LIVE CODE after the
 *                      closer. Families C and D blank the code with it.
 *   S4  CR-01          the TERMINATING line of a multi-line JSX comment carrying
 *                      live code. Families B, C and D blank the code with it.
 *                      Fixed here by resuming span-stripping after the closer
 *                      instead of pushing an empty line.
 *   S5  CR-02          a JSX comment whose closer carries whitespace before the
 *                      closing brace. Families B, C and D blind to end of file.
 *                      Fixed here by a run-time-assembled regular expression —
 *                      the block terminator, optional whitespace, the closing
 *                      brace — never the exact three-character token.
 *   W3  WR-03          a multi-line BLOCK comment with prose body lines.
 *                      Families A, B and C hand the body back as code.
 *   W4  WR-04          the degenerate opener that is ONE comment, not two.
 *                      Family B reads it as already closed and hands the body
 *                      back as code. Fixed here by a per-opener `searchFrom`:
 *                      the JSX opener searches from offset 2 so the degenerate
 *                      single-line form still blanks whole; the block opener
 *                      searches from offset 2 so its degenerate form is NOT read
 *                      as closed; the docblock continuation star searches from 0.
 *   U1  D-41.1-10      a comment opened and never closed. Reported, never
 *                      guessed at. Measured on 2026-08-13: zero of the 263 files
 *                      under `src/` trip it, so the refusal it enables is
 *                      prevention rather than a blocker.
 *
 * SECRECY. `.planning/` is tracked and this repository is PUBLIC (`CLAUDE.md`
 * Guardrail 5). This module reads only the file path it is given, prints
 * nothing, opens no network connection and writes no artefact.
 *
 * DEF-41-01, measured: Tailwind compiles class strings out of comments, and
 * `scripts/` is inside the project root and is not ignored. **No utility class
 * string is spelled anywhere in this file**, in code or in prose.
 *
 * Zero dependencies. Node built-ins only, ESM. Not executable: it lives under
 * `scripts/lib/` rather than beside the gates precisely so the next reader does
 * not try to run it.
 */

import { readFileSync } from 'node:fs';

/* ────────────────────────────────────────────────────────────────────────────
 * The tokens, assembled at run time — never spelled
 * ──────────────────────────────────────────────────────────────────────────── */

/** The JSX comment opener. */
const JSX_COMMENT_OPEN = '{/' + '*';

/** The block comment opener. */
const BLOCK_COMMENT_OPEN = '/' + '*';

/** The docblock continuation star — a continuation, never an opener. */
const DOCBLOCK_CONTINUATION = '*';

/** The line comment opener: everything after it genuinely IS the comment. */
const LINE_COMMENT_OPEN = '//';

/** The block comment's terminator. */
const BLOCK_COMMENT_CLOSE = '*' + '/';

/**
 * The JSX comment's terminator, as a RUN-TIME-ASSEMBLED regular expression.
 *
 * CR-02, and this is the whole of that fix: the incumbent families looked for
 * the exact three-character token, so a comment closed with whitespace between
 * the block terminator and the closing brace was never seen to close and the
 * state ran on to end of file — a blindness that printed a green.
 *
 * Assembled from its escaped pieces rather than written as a literal, the same
 * discipline `MAX_WIDTH_RE` (`verify-conversion.mjs:2546`) and `MIN_HEIGHT_RE`
 * (`:2656`) already use, and for the reason stated at `:2654-2655`.
 */
const JSX_COMMENT_CLOSE_RE = new RegExp(['\\*', '\\/', '\\s*', '\\}'].join(''));

/* ────────────────────────────────────────────────────────────────────────────
 * Finding a closer
 * ──────────────────────────────────────────────────────────────────────────── */

/** The JSX closer at or after `from`, as `{ index, length }`, or `null`. */
function findJsxClose(text, from) {
  const match = JSX_COMMENT_CLOSE_RE.exec(text.slice(from));
  return match === null ? null : { index: from + match.index, length: match[0].length };
}

/** The block closer at or after `from`, as `{ index, length }`, or `null`. */
function findBlockClose(text, from) {
  const at = text.indexOf(BLOCK_COMMENT_CLOSE, from);
  return at === -1 ? null : { index: at, length: BLOCK_COMMENT_CLOSE.length };
}

/**
 * The openers that can close on their own line, each with ITS closer, ITS search
 * offset, and the multi-line state it opens when no closer is on the line.
 *
 * WR-04 is the `searchFrom` column, and it is per opener rather than shared:
 *
 *   - the JSX opener searches from **2**, so the degenerate single-line form —
 *     where the opener's own star begins the closer — still blanks whole;
 *   - the block opener searches from **2**, so its degenerate form is NOT read
 *     as already closed. Family B searched from 1 here and handed the comment's
 *     body back as code;
 *   - the docblock continuation star searches from **0**, so a bare closing line
 *     is consumed exactly.
 *
 * `opens` is the state entered when the line carries no closer. It is `null` for
 * the continuation star ON PURPOSE: a star-leading line outside a comment is a
 * continuation with nothing to continue, and entering a block state from it
 * would blank forward to the next terminator anywhere in the file. Blanking the
 * line and opening nothing is family B's effective behaviour, and it is the safe
 * direction; the opposite would be a new blindness no incumbent had.
 *
 * The double-slash opener is absent from this table on purpose — it has no
 * closer, so a line that starts with it always blanks whole.
 */
const LEADING_COMMENT_OPENERS = [
  { open: JSX_COMMENT_OPEN, searchFrom: 2, findClose: findJsxClose, opens: 'jsx' },
  { open: BLOCK_COMMENT_OPEN, searchFrom: 2, findClose: findBlockClose, opens: 'block' },
  { open: DOCBLOCK_CONTINUATION, searchFrom: 0, findClose: findBlockClose, opens: null },
];

/* ────────────────────────────────────────────────────────────────────────────
 * The three exported names
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * One line with its LEADING comments replaced by spaces — not the whole line.
 *
 * Returns `{ text, unclosed }`, where `unclosed` is `'jsx'`, `'block'` or
 * `null`. A line whose trimmed text merely STARTS with an opener used to be
 * blanked entire, so live code sitting after a closed comment on the same line
 * was invisible to every check built on `liveLines`. `41-GAP-REVIEW-4.md` CR-01
 * and CR-02 measured that shape hiding a navigation clearance on the shell, a
 * raw palette colour on a converted surface, and an undeclared dialog overlay —
 * each on a run that stayed green and printed unmoved numbers.
 *
 * The consumed span becomes the SAME NUMBER OF SPACES rather than being cut out:
 * `verify-conversion.mjs`'s `findUtilityHits` computes its tolerated-scrim test
 * from a match's column, so a shortened line would move what it reads.
 *
 * An opener with NO closer on the line blanks the line whole and REPORTS itself
 * through `unclosed`, so the caller can enter the matching multi-line state.
 */
export function stripLeadingComments(text) {
  let out = text;

  for (;;) {
    const lead = out.length - out.trimStart().length;
    const trimmed = out.slice(lead);

    if (trimmed === '') return { text: out, unclosed: null };
    if (trimmed.startsWith(LINE_COMMENT_OPEN)) {
      return { text: ' '.repeat(out.length), unclosed: null };
    }

    const opener = LEADING_COMMENT_OPENERS.find((one) => trimmed.startsWith(one.open));
    if (opener === undefined) return { text: out, unclosed: null };

    const closer = opener.findClose(trimmed, opener.searchFrom);
    if (closer === null) {
      return { text: ' '.repeat(out.length), unclosed: opener.opens };
    }

    const end = lead + closer.index + closer.length;
    out = ' '.repeat(end) + out.slice(end);
  }
}

/**
 * An ARRAY OF RAW LINES with every comment blanked, carriage returns removed.
 *
 * Returns `{ lines, unterminated }`, where `unterminated` is `null` or
 * `{ kind, lineNo }` — `kind` being `'jsx'` or `'block'` and `lineNo` the
 * 1-based line on which the comment that never closed was opened.
 *
 * **Taking an array is not a convenience: it is WR-01's fix.**
 * `verify-dialogs.mjs` fed single-line probe strings through
 * `stripLeadingComments` alone and called it *"the path a real line takes"*. It
 * is not — the multi-line state lives here, and a self-check built on the
 * single-line function is structurally unable to exercise it. With this function
 * exported, a probe row becomes a line array and the self-check can see a fix to
 * either multi-line shape.
 *
 * CR-01 is the resume branch: when a multi-line comment's terminating line is
 * reached, span-stripping RESUMES after the closer instead of pushing an empty
 * line, so live code on that line stays visible. The incumbents pushed empty and
 * that code was invisible to every check.
 */
export function liveLinesFrom(rawLines) {
  const lines = [];
  let state = null;
  let openedAtLineNo = 0;

  for (let i = 0; i < rawLines.length; i += 1) {
    const text = rawLines[i].split('\r').join('');

    if (state !== null) {
      const closer = state === 'jsx' ? findJsxClose(text, 0) : findBlockClose(text, 0);
      if (closer === null) {
        lines.push('');
        continue;
      }
      const end = closer.index + closer.length;
      const remainder = ' '.repeat(end) + text.slice(end);
      state = null;
      const stripped = stripLeadingComments(remainder);
      if (stripped.unclosed !== null) {
        state = stripped.unclosed;
        openedAtLineNo = i + 1;
      }
      lines.push(stripped.text.trim() === '' ? '' : stripped.text);
      continue;
    }

    const stripped = stripLeadingComments(text);
    if (stripped.unclosed !== null) {
      state = stripped.unclosed;
      openedAtLineNo = i + 1;
    }
    lines.push(stripped.text.trim() === '' ? '' : stripped.text);
  }

  const unterminated = state === null ? null : { kind: state, lineNo: openedAtLineNo };
  return { lines, unterminated };
}

/**
 * The file at `absPath`, read and handed to `liveLinesFrom`.
 *
 * Same return shape. The caller owns the refusal on `unterminated` and its own
 * exit code: a file with a comment that never closes is a file this reader
 * cannot measure, and a gate that keeps going has produced a green about
 * nothing — but WHICH exit code that is belongs to the gate, not here.
 */
export function liveLines(absPath) {
  return liveLinesFrom(readFileSync(absPath, 'utf8').split('\n'));
}
