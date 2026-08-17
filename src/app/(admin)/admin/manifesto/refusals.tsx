"use client";

import type { SectionRefusal } from "@/lib/production/sections/write-contract";

/**
 * What every refusal of an authored section's write path says to the person who
 * caused it — **one sentence per cause, and no shared bucket.**
 *
 * ── Why this is its own file ────────────────────────────────────────────────
 *
 * Both forms of this section answer the same refusal union, and two copies of
 * these sentences would be two places for them to drift — with the drift
 * invisible, because nothing compares them. It is also what keeps the section
 * form a **single definition with exactly two importers**: if the register's
 * form imported the map from there, the count that proves there is one form
 * would count a third file.
 *
 * ── The precedent this file exists to not repeat ────────────────────────────
 *
 * The newsletter form in this repository answers a network fault, a missing key
 * and an address already subscribed with the same words
 * (`.planning/codebase/CONCERNS.md`), which makes it undebuggable for the person
 * using it **and** for whoever maintains it. This project has **no error
 * tracking at all**, so the sentence on the screen is the whole of the
 * observable effect: a log is a place nobody looks.
 *
 * ⚠ The map is **total** over the union. A cause added to either act without a
 * sentence here is a `npm run build` error rather than a message written for
 * something else — which is the only part of this contract a compiler can hold
 * in a repository with no test runner.
 *
 * ── What a sentence may not carry ───────────────────────────────────────────
 *
 * No authored prose, no artist, no space, no address. A refusal explains what
 * did not happen and what to do; it never hands back the content that caused it.
 */
export const REFUSAL_SENTENCE: Record<SectionRefusal, string> = {
  invalid_id:
    "Nothing was saved. This entry could not be identified, so the database was never asked — reload the page.",
  invalid_format_id:
    "Nothing was saved. The format could not be identified. A rule may belong to no format at all — that is a legitimate answer, and it is the right one where the rule is about the brand — but it cannot belong to one this page cannot name.",
  title_missing:
    "Nothing was saved. This needs a title: it is the only handle the page has, and an entry without one cannot be found again.",
  invalid_state:
    "Nothing was saved. Say which of the three states this is. There is no default here and none in the database either: written would fill a void nobody filled, and not decided would answer for a coordinate somebody has already declared.",
  written_without_body:
    "Nothing was saved. Something marked as written has something written in it. An empty entry in this state is the emptiness left undeclared, which is the one thing this section exists to make impossible.",
  not_decided_without_gap:
    "Nothing was saved. Say what is missing. Without it, undecided is a shrug — and a shrug reads as nobody's job.",
  decision_owner_missing:
    "Nothing was saved. Say whose call it is — a role, never a person. A question with no owner is the state this register was built to abolish.",
  section_not_found:
    "Nothing was saved. This entry is no longer readable from here — reload the page.",
  section_not_ours:
    "Nothing was saved. This entry belongs to a section this surface does not write. Each section is written from behind its own key, and that is what keeps the two apart — open it where it lives.",
  question_missing:
    "Nothing was saved. A register entry is a question — write it as a criterion, never as a candidate.",
  resolution_missing:
    "Nothing was saved. Closing a question means writing what was decided. A question closed without its answer is a question that will be asked again.",
  question_not_found:
    "Nothing was saved. That question is not in the register from here — reload the page.",
  already_closed:
    "Nothing was saved a second time. That question had already been closed — reload the page: it now says so.",
  read_failed:
    "Nothing was saved. A read that had to happen first did not answer, so nothing was attempted. Try again.",
  write_failed: "Nothing was saved. The database refused the write.",
};

/**
 * What a throw out of an act can be told apart into, and no further.
 *
 * A production build **redacts** the message of an error thrown out of a Server
 * Action (`src/lib/capabilities/server.ts:59-63`), so the shape of the failure is
 * the most that can honestly be distinguished. Every other failure in every act
 * is a returned value with its own name, which is why these two are the only
 * sentences that cover more than one cause — and they say so.
 */
export const NOT_PERMITTED =
  "Nothing was saved. This account is not allowed to write in this section. If this surface was open a moment ago, reload the page and check what it can still do.";
export const UNREACHABLE =
  "Nothing was saved. The request never reached the server — check the connection and try again.";

/** What one panel says about its last attempt. */
export type Outcome = { readonly tone: "done" | "crit"; readonly message: string };

/**
 * Runs an act and turns whatever it answers into one sentence.
 *
 * The `catch` branches on the **shape** of the failure and not on its message,
 * for the reason above: a thrown error that reached the server is the gate
 * saying no, and a `TypeError` is the request never having arrived.
 */
export async function run(
  act: () => Promise<{ ok: true } | { ok: false; reason: SectionRefusal }>,
  saved: string
): Promise<Outcome> {
  try {
    const result = await act();
    if (result.ok) return { tone: "done", message: saved };
    return { tone: "crit", message: REFUSAL_SENTENCE[result.reason] };
  } catch (thrown) {
    const unreachable =
      thrown instanceof TypeError ||
      (typeof navigator !== "undefined" && navigator.onLine === false);
    return { tone: "crit", message: unreachable ? UNREACHABLE : NOT_PERMITTED };
  }
}

/**
 * The outcome of one panel, **inside that panel**.
 *
 * `role="alert"` on a refusal and `role="status"` on a completion: the two are
 * announced differently because they interrupt differently, and a refusal that
 * was not announced is a refusal a screen-reader user learns about by finding
 * their work missing later.
 */
export function OutcomeLine({ outcome }: { outcome: Outcome | null }) {
  if (outcome === null) return null;
  return (
    <p
      role={outcome.tone === "crit" ? "alert" : "status"}
      className={`mt-3 text-sm ${outcome.tone === "crit" ? "text-sem-crit" : "text-sem-done"}`}
    >
      {outcome.message}
    </p>
  );
}

/** The recessed sentence face, shared with the read surfaces of both sections. */
export const SENTENCE = "text-sm text-muted";

/**
 * One listed format, as a select needs it.
 *
 * ⚠ No colour. `formats.color` is `NOT NULL`, so every format carries an
 * identification colour including the one that has no palette — and drawn at any
 * size on a surface about the visual system it becomes a palette nobody decided.
 * The safe size for a value that is not part of the palette is none, so the
 * column does not travel this far.
 */
export interface FormatChoice {
  readonly id: string;
  readonly name: string;
}
