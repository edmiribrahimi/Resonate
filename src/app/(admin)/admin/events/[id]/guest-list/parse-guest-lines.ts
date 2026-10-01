/**
 * How a pasted guest list is read, one line at a time (DBT-20, D-52.1-25).
 *
 * ── Why this file exists apart from `actions.ts` ─────────────────────────────
 *
 * It carries **no use-server directive**, on purpose: a file with that directive publishes
 * every export as a public POST endpoint, and a text parser has no business
 * being one. It also has no imports, so the «Add several» box can call it in
 * the browser and `scripts/check-guest-parse.mjs` can load it with plain Node.
 * That second use is why the module must stay ERASABLE TypeScript — no `enum`,
 * no `namespace`, no parameter properties: Node strips types, it does not
 * compile them.
 *
 * ── It reads, it never decides who gets in ───────────────────────────────────
 *
 * The import is a convenience of entry, **not a new way in**
 * (`community-membership.md`, gate *nessuna corsia grigia*). Every line this
 * module accepts is then sent, one at a time, to the same `addGuest` a single
 * guest goes through — same guard, same `added_by`, same invitation mail. So
 * the rules below exist only to say in the preview what `addGuest` would do,
 * BEFORE anything is saved, and to never save what was not understood.
 *
 * ── The two rules copied from `addGuest`, which must stay identical ──────────
 *
 * - **Email:** `trim().toLowerCase()` then `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
 *   (`actions.ts:129-135`). If the two regexes drift, the preview promises a
 *   guest the server then refuses — or refuses one the server would take. A
 *   change there is a change here, in the same commit.
 * - **Name:** `trim().replace(/\s+/g, " ")`, empty → refused
 *   (`actions.ts:119-122`). The split into first and last name stays in
 *   `addGuest` and is NOT duplicated here: this module hands over a full name.
 *
 * ── How one line is read ─────────────────────────────────────────────────────
 *
 * 1. Trimmed; an empty line is `blank` — not an error, not shown.
 * 2. A list prefix is removed: `3.`, `3)`, `-`, `*`, `•`.
 * 3. Split into tokens on spaces, tabs, commas and semicolons.
 * 4. Any token with an `@` is an email candidate, angle brackets removed.
 *    More than one → `two_emails`. One that fails the regex → `bad_email`.
 * 5. The rest, joined by one space, is the name. Empty → `name_missing`.
 */

/** The one email rule, copied byte for byte from `addGuest` (`actions.ts:132`). */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** A list prefix: `1.`, `1)`, `-`, `*`, `•`, followed by whitespace. */
const LIST_PREFIX_RE = /^\s*(\d+[.)]|[-*•])\s+/;

/** Separators between a name and an email, or between words of a name. */
const TOKEN_SPLIT_RE = /[\s,;]+/;

export type UnparsedReason = "two_emails" | "name_missing" | "bad_email";

export type ParsedLine =
  | { kind: "blank" }
  | {
      kind: "guest";
      line: number;
      raw: string;
      fullName: string;
      email: string | null;
    }
  | { kind: "unparsed"; line: number; raw: string; reason: UnparsedReason };

/** `<a@b.c>` → `a@b.c`. Only the brackets at the ends of the token. */
function stripAngles(token: string): string {
  return token.replace(/^<+/, "").replace(/>+$/, "");
}

export function parseGuestLine(raw: string, line: number): ParsedLine {
  const trimmed = raw.trim();
  if (!trimmed) return { kind: "blank" };

  const body = trimmed.replace(LIST_PREFIX_RE, "");
  const tokens = body.split(TOKEN_SPLIT_RE).filter(Boolean);

  const emailTokens = tokens.filter((t) => t.includes("@"));
  if (emailTokens.length > 1) {
    return { kind: "unparsed", line, raw, reason: "two_emails" };
  }

  let email: string | null = null;
  if (emailTokens.length === 1) {
    const candidate = stripAngles(emailTokens[0]).trim().toLowerCase();
    if (!EMAIL_RE.test(candidate)) {
      return { kind: "unparsed", line, raw, reason: "bad_email" };
    }
    email = candidate;
  }

  const fullName = tokens
    .filter((t) => !t.includes("@") && !/^[<>]+$/.test(t))
    .join(" ")
    .trim()
    .replace(/\s+/g, " ");
  if (!fullName) {
    return { kind: "unparsed", line, raw, reason: "name_missing" };
  }

  return { kind: "guest", line, raw, fullName, email };
}

/** Splits on `\r?\n` and numbers from 1, so the preview can say «line 7». */
export function parseGuestLines(text: string): ParsedLine[] {
  return text.split(/\r?\n/).map((raw, i) => parseGuestLine(raw, i + 1));
}
