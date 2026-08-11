import type { ReactNode } from "react";

/**
 * The two headings that carry a decision — `41-UI-SPEC.md` §7.1 and §7.3.
 *
 * Everything else in the type system is inherited whole from Phase 40 (three
 * roles, four sizes, **two weights — 400 and 600, and nothing else**) and is a
 * convention rather than a component. These two are here because each closes
 * something a convention could not.
 */

/* ────────────────────────────────────────────────────────────────────────────
 * PageTitle — the display role, and the only thing that carries it
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * The single `<h1>` of a surface, rendered in the display face.
 *
 * ── Why this component exists at all ─────────────────────────────────────────
 *
 * D-41-15: this is the phase where the display face starts rendering. Orbitron
 * is loaded **and preloaded** at the root and had **zero utility consumers in
 * the whole tree** — `globals.css` declared that silence as intended and named
 * this phase as the end of it, and `40-REVIEW.md` WR-11 recorded the cost: a
 * preloaded font fetched on every page that painted nothing. This component is
 * where that fetch starts being paid for.
 *
 * **It is therefore the only place in `src/` that names the display utility.**
 * That is not tidiness — it is the whole enforcement mechanism. A surface that
 * wants the display face imports this; a surface that spells the utility
 * itself has bypassed the exclusion list below, and the exclusion list is the
 * decision, not the class string.
 *
 * ── Where the display role must NOT appear (§7.1, verbatim in substance) ─────
 *
 * Not on a dialog title. Not on a card heading. Not on a section heading. Not
 * on a table header. Not on a nav entry. Not on a button. Not on a label. Not
 * on **any figure or count** — `40-UI-SPEC.md` §5.3 is explicit that no figure
 * column renders in the display face. Not on any body prose. And not on **any
 * format name**: `SunSet`, `RamaDub`, `MotionLab` and `re:sonate` are read, not
 * decorated, and a phase that let the display face onto a format name would be
 * making a brand decision in a file every surface imports.
 *
 * ── One per surface ──────────────────────────────────────────────────────────
 *
 * A surface has one `<h1>` and it is the page title. 52 `<h1>` live in 38 files
 * today and six of them render at the heading size — they are component
 * headings wearing an `<h1>`, and they become `<h2>`/`<h3>` at the heading role
 * when their surface converts. Where a page's branches are **mutually
 * exclusive**, several may be written and exactly one renders: the invariant is
 * what the browser gets, not the count in the file.
 */
export function PageTitle({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <h1
      className={`font-display text-3xl font-semibold tracking-tight text-ink ${className}`.trimEnd()}
    >
      {children}
    </h1>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * SectionHeading — four axes collapsed to one string
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * The label above a group of content.
 *
 * ── Why this needed a decision and not a rename (D-41-12) ────────────────────
 *
 * Measured: **10 distinct strings across ~44 uses**, disagreeing on four
 * independent axes at once. A pattern written 88 times identically is a rename;
 * one written ten ways is a decision, and §7.3 made it. Each axis, with the
 * reason it went the way it did — and in three of the four cases the chosen
 * value is **not** the incumbent plurality:
 *
 *  - **margin — 16px.** The plurality was 12px, which is not a step Phase 40's
 *    spacing ladder names. A ladder with an unnamed rung between two named ones
 *    is how a scale acquires a value nobody decided. 11 sites already used 16.
 *  - **weight — 600.** The plurality was 500, and **500 does not exist in this
 *    system**: Phase 40 fixed the weights at 400 and 600. This is an
 *    inheritance, not a preference.
 *  - **size — 12px, at the label/data role.** The muted ink on the card ground
 *    is **6.78:1**, which clears AA's 4.5:1 for small text; the role is what
 *    fixes the size, and the contrast is what makes the role safe at it.
 *  - **tracking — 0.1em.** The plurality among section headings specifically
 *    (17 against 11), and the more legible of the two at 12px in caps.
 *  - **face — the data face.** `40-UI-SPEC.md` §5.1 says the data face renders
 *    *"anything set in caps with wide tracking"*. This is that thing, and until
 *    now it was set in the interface face **by default rather than by choice**
 *    — nobody had decided it, which is exactly why ten spellings could coexist.
 *
 * > **No incumbent string survives.** Not one of the ten matches the result on
 * > all four axes. This is written down because the failure mode is somebody
 * > later "fixing" a converted surface back towards the plurality — which would
 * > look like a correction and would be a regression on three axes at once.
 *
 * ── D-41-11 stands ───────────────────────────────────────────────────────────
 *
 * This is a styling convention with one class string; the component is a
 * convenience. **A surface that writes the string is equally converted.** The
 * component exists so that the string has one home and one diff, not so that a
 * gate can demand an import.
 *
 * Renders `<h2>` by default. Pass `as` where the document outline needs a
 * different level — the heading level is a structure decision belonging to the
 * surface, and this component has no way to know it.
 */
export function SectionHeading({
  as: Tag = "h2",
  children,
  className = "",
}: {
  as?: "h2" | "h3" | "h4";
  children: ReactNode;
  className?: string;
}) {
  return (
    <Tag
      className={`mb-4 font-mono text-xs font-semibold uppercase tracking-widest text-muted ${className}`.trimEnd()}
    >
      {children}
    </Tag>
  );
}
