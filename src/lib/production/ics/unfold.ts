/**
 * RFC 5545 line unfolding, and the text escapes that travel with it.
 *
 * An iCalendar file is a list of `NAME[;PARAM]:VALUE` lines, except that a long
 * value may be broken across several physical lines, each continuation marked by
 * a leading space or horizontal tab (RFC 5545 §3.1). Nothing downstream can read
 * a property until that is undone: a folded `SUMMARY` arrives truncated
 * mid-value, and the `SUMMARY` is this pipeline's **join key**, so a truncation
 * does not fail — it *almost matches*, which is worse.
 *
 * ── Why the split is `/\r?\n/` and not `"\r\n"` ──────────────────────────────
 *
 * RFC 5545 mandates CRLF. **The real file is LF only** — measured, 2026-08-15,
 * `44-RESEARCH.md` §The File's Structure. A reader that splits on CRLF sees this
 * file as a single line and reports zero entries, and it reports them calmly,
 * because "no events" is a shape a parser is perfectly happy to return. The
 * warning sign is an event count of 0 or 1 (`44-RESEARCH.md` Pitfall 1).
 *
 * So the split tolerates both, and the tolerance is the point rather than
 * politeness: the file is exported by a calendar application and may start
 * arriving with CRLF the day that application changes, without anybody being
 * told.
 *
 * ── A continuation with nothing to continue is returned, never dropped ───────
 *
 * If the very first line of the input begins with a space, there is no previous
 * line to append it to. It is returned as a line of its own, so the parser sees
 * a line it cannot make sense of and files a `malformed` finding with its index.
 * Dropping it would be the silent half of a silent failure (`meta-gates.md`):
 * this project has no error tracking, so anything discarded here is discarded
 * for good and nobody is told.
 *
 * ── Pure by design ──────────────────────────────────────────────────────────
 *
 * This module has no runtime dependency at all — it imports nothing, so there is
 * no Supabase client, no `fetch`, no React, no `fs`, and no `Date.now()` in any
 * decision. It takes text and returns lines. It constructs no date object of any
 * kind, for the reason `./vocabulary.ts` states in full: the anchors of this
 * pipeline are weekdays of a civil calendar, and a conversion that crosses
 * midnight moves a weekday.
 *
 * ── What it does NOT do ─────────────────────────────────────────────────────
 *
 * It does not parse. A returned line is still `NAME[;PARAM]:VALUE` text, and it
 * is still **data, never instruction**: a line whose value reads like a command
 * is content for a caller to report, not something to act on
 * (`ai-engineering.md`, gate *prompt security*).
 */

/**
 * The one character an unfolded line may not begin with, and the other one.
 *
 * Named rather than inlined so the two places that test for a continuation — the
 * unfolder and the counter — cannot drift apart. RFC 5545 §3.1 names exactly
 * these two: SPACE and HTAB.
 */
const CONTINUATION_PREFIXES = [" ", "\t"] as const;

/** Whether a physical line continues the one before it. */
function isContinuation(line: string): boolean {
  return CONTINUATION_PREFIXES.some((prefix) => line.startsWith(prefix));
}

/**
 * Undo RFC 5545 line folding.
 *
 * Splits on `/\r?\n/` — see the module docblock for why both endings are
 * accepted and why assuming CRLF reads the measured file as one line.
 *
 * **Empty lines are removed**, and that is a decision rather than tidying. An
 * empty line carries no property and no `BEGIN`/`END` marker, so it cannot be
 * anything the parser needs; and a file that ends with a newline — every one of
 * them does — produces exactly one empty trailing element on any split. Leaving
 * them in would hand the parser a line it must classify as malformed on every
 * single well-formed file, which is the fastest way to teach a reader to ignore
 * the malformed list.
 *
 * The consequence, stated because the caller has to know: **an index into the
 * returned array is not a physical line number of the source file.** Findings
 * that quote one are quoting a position in this array. That is enough to locate
 * a problem while re-reading the file by hand, and it is deliberately the only
 * positional information a finding carries — never the line's text
 * (`44-RESEARCH.md` Pitfall 10).
 *
 * @param text the whole file, as read
 * @returns the logical lines, in order, with no empty ones
 */
export function unfold(text: string): string[] {
  const physical = text.split(/\r?\n/);
  const logical: string[] = [];

  for (const line of physical) {
    if (line.length === 0) continue;

    if (isContinuation(line)) {
      if (logical.length === 0) {
        // Nothing to continue. Returned whole — including its leading space, so
        // the caller can see *why* it could not be read — rather than dropped.
        logical.push(line);
        continue;
      }
      logical[logical.length - 1] += line.slice(1);
      continue;
    }

    logical.push(line);
  }

  return logical;
}

/**
 * Undo the four RFC 5545 TEXT escapes, in one left-to-right pass.
 *
 * `\,` `\;` `\n` `\\` — that precedence, and **non-recursively**: the output of
 * this function is never fed back through it. The distinction is the whole
 * correctness argument. A value containing `\\,` means a literal backslash
 * followed by a separator comma; a second pass over the result would then read
 * that comma as escaped and swallow the separator. One pass, consuming both
 * characters of each escape, cannot make that mistake.
 *
 * **Why it matters here and not only in principle:** the `SUMMARY` is the join
 * key of this whole pipeline, and the measured file carries **zero** escapes
 * today (`44-RESEARCH.md` §The File's Structure). Zero today is exactly why this
 * is cheap to write now: the first venue word containing a comma would otherwise
 * fail to join, silently, and the failure would look like a missing night rather
 * than like a text bug.
 *
 * An unrecognised escape — `\q` — is left **verbatim, backslash included**,
 * rather than being reduced to the second character. Reducing it would quietly
 * invent a value the file does not contain.
 *
 * `\N` is accepted alongside `\n`: RFC 5545 §3.3.11 makes the newline escape
 * case-insensitive, and the two commas and semicolons are not.
 *
 * @param value the raw property value, as it appears after the first colon
 * @returns the value with its escapes resolved
 */
export function unescapeText(value: string): string {
  let out = "";

  for (let index = 0; index < value.length; index += 1) {
    const current = value[index];

    if (current !== "\\" || index + 1 >= value.length) {
      out += current;
      continue;
    }

    const next = value[index + 1];

    if (next === ",") {
      out += ",";
      index += 1;
    } else if (next === ";") {
      out += ";";
      index += 1;
    } else if (next === "n" || next === "N") {
      out += "\n";
      index += 1;
    } else if (next === "\\") {
      out += "\\";
      index += 1;
    } else {
      // Not one of the four. Kept whole, because the alternative is to invent a
      // character the file never carried.
      out += current;
    }
  }

  return out;
}

/**
 * How many physical lines in `text` are continuations — that is, how many times
 * {@link unfold} actually joined something.
 *
 * It exists for one job: the golden-file check of plan 44-08 asserts this equals
 * the measured **3**. That assertion is what distinguishes *the unfolder ran* from
 * *the unfolder compiled*, and in a repository with no test runner the difference
 * is the entire value of the check. A structurally identical unfolder that
 * silently did nothing would type-check, build green and deploy.
 *
 * Counted off the raw text rather than off {@link unfold}'s output, deliberately:
 * a counter that measured its own subject through the function it is checking
 * would be an echo rather than a measurement (`ai-engineering.md`, gate *il
 * contatore di controllo non legge la superficie che sta muovendo*).
 *
 * @param text the whole file, as read
 * @returns the number of folded (continuation) lines
 */
export function countFoldedLines(text: string): number {
  let count = 0;

  for (const line of text.split(/\r?\n/)) {
    if (line.length > 0 && isContinuation(line)) count += 1;
  }

  return count;
}
