/**
 * The authored section's vocabularies, named once.
 *
 * Two closed sets — the state a section is in, and which section it is.
 *
 * On 2026-10-14 this file lost most of what it held: the calendar, Location and
 * the visual archive left the code with their pages (CUT-01, D-53-02, D-53-04),
 * and the sets that described scouted spaces, their attributes and the archive's
 * assets left with them, together with the re-export of the acquisition stages
 * from the calendar's own vocabulary. What remains is what the manifesto reads.
 *
 * `@/types/database` imports *from here*, and this file imports nothing. A
 * second copy of either set would be a second truth that nothing compares,
 * because a SQL `CHECK` is invisible to `tsc` and a TypeScript union is
 * invisible to Postgres.
 *
 * ── THE SQL MIRROR IS REAL, AND EDITING ONE SIDE MEANS EDITING BOTH ─────────
 *
 * Both sets below are duplicated as named SQL `CHECK`s by
 * `20260817120200_production_sections.sql`. `npm run build` catches the
 * TypeScript side, the constraint catches the SQL side, and the two agree ONLY
 * because they were written once here and copied. A changed constraint set is a
 * NEW migration, never an edit to an applied one (`supabase-data.md`, gate
 * *migration in avanti*).
 *
 * ⚠ **Between this commit and the migration of plan 53-07 the mirror is
 * deliberately one-sided.** `SECTION_KINDS` below already names the manifesto
 * alone, while the applied `section` CHECK still admits the second word it had;
 * the migration rewrites the constraint after the deploy that stops writing it.
 * The code is the narrower side, which is the safe direction: nothing here can
 * write a value the database would refuse.
 */

/**
 * What state a section's content is in. THREE, and it must stay three.
 *
 * The domain names TWO OPPOSITE ERRORS, not one, and a two-state model can only
 * defend against one of them at a time:
 *
 *   * inventing where a rule already exists — writing strata, tempi and
 *     reference artists for a format whose identity somebody else owns. Once
 *     that reaches a brief or a piece of artwork it IS the brand, for whoever
 *     reads it;
 *   * answering *not decided* where a coordinate has been declared — which is an
 *     omission dressed as prudence.
 *
 * Both are live today, not hypothetical: one format's manifesto is written and
 * closed; another is unwritten but carries declared coordinates including an
 * explicit negative; another is unwritten with nothing declared at all. Fold the
 * middle state into either neighbour and the second of those three becomes
 * indistinguishable from the third — which makes it read as FREE, and a format
 * that reads as free gets written by whoever is under deadline.
 *
 * `not_decided` is not a shrug. The constraint
 * `production_section_not_decided_names_its_gap` refuses a row in this state
 * that does not say what is missing and whose call it is, because a void with no
 * owner reads as nobody's job.
 */
export const SECTION_STATES = [
  "written",
  "coordinates_declared",
  "not_decided",
] as const;

/** What state a section's content is in. Mirrored by the `state` CHECK. */
export type SectionState = (typeof SECTION_STATES)[number];

/**
 * Production's own words for the three states, as they are written on a surface.
 *
 * A **total** `Record` over the union, on purpose — the same discipline as
 * `CAP_DESCRIPTIONS`. A fourth state added above without
 * a label here is a `npm run build` error, and a label for a state that no
 * longer exists is an error too. In a repository with no test runner that is the
 * one part of this file's contract a compiler can hold.
 */
export const SECTION_STATE_LABELS: Record<SectionState, string> = {
  written: "Written",
  coordinates_declared: "Coordinates declared",
  not_decided: "Not decided",
};

/**
 * Which authored section a row belongs to.
 *
 * One, since 2026-10-14 (D-53-04): the manifesto is the only section left that
 * holds writing. The tuple stays a tuple rather than collapsing into a literal,
 * because the `section` CHECK it mirrors is a set and the migration of plan
 * 53-07 rewrites it as a set of one.
 */
export const SECTION_KINDS = ["manifesto"] as const;

/** Which authored section a row belongs to. Mirrored by the `section` CHECK. */
export type SectionKind = (typeof SECTION_KINDS)[number];

/** The authored section, as it is written on a surface. */
export const SECTION_KIND_LABELS: Record<SectionKind, string> = {
  manifesto: "Sound manifesto",
};
