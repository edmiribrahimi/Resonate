import type { ProductionSection } from "@/types/database";

/**
 * The **only** renderer of a section that has no body — the void, drawn as
 * content rather than as an absence.
 *
 * > No other file under the six section directories may draw a section whose
 * > state is the undecided one. That is the single-renderer rule `ScoreCell.tsx`
 * > and `AttributeCell.tsx` already state for their own values, and
 * > `scripts/verify-section-surface.mjs` check C asserts it here **by this
 * > file's name**, together with the two columns this component must name.
 *
 * ── This is success criterion 3 in pixels ───────────────────────────────────
 *
 * *A section whose content is not yet written declares the emptiness instead of
 * filling it.* `sound-manifesto.md` puts the rule as a gate — *non-scritto è una
 * risposta, inventato non lo è* — and D-45-14 puts the shape: a not-decided
 * section **says what is missing and whose call it is**, both, or the blank gets
 * read as a bug and somebody fills it.
 *
 * So the two columns are the **content of the panel**, not a subtitle under an
 * empty one. A heading with nothing under it and a sentence saying which
 * decision is outstanding are different pages, and only one of them survives
 * being read by whoever is producing a piece on the Tuesday.
 *
 * ── The owner is a ROLE, and the component does not soften a missing one ─────
 *
 * `decision_owner` is a role and never a person — a decision attributed to a
 * name ages badly the moment somebody leaves, and this repository is public.
 *
 * The database already refuses a row in this state that does not name both:
 * `production_section_not_decided_names_its_gap`. The TypeScript columns are
 * nevertheless `string | null`, because they are nullable for the other two
 * states — so this component can be handed a null the constraint says cannot
 * exist. When that happens it says **that**, in its own sentence, rather than
 * printing a shorter void: a void with no gap named is not a tidier void, it is
 * evidence that the row reached this screen without passing the constraint, and
 * this project has no error tracking, so the sentence on the screen is the only
 * observable effect there will ever be.
 *
 * There is no branch here that produces nothing.
 *
 * ── What this component must never do ───────────────────────────────────────
 *
 *   * **It does not guess.** No default text stands in for a missing decision,
 *     and no adjective describes a sound, a genre or a palette that nobody has
 *     decided. Writing the brand on behalf of whoever owns it is the failure
 *     this whole state exists to prevent.
 *   * **It does not look broken.** A failed read has its own sentence on the
 *     page and its own `role="alert"`; this is not that, and the two must not
 *     resemble each other. What no assertion over source can judge is whether
 *     they resemble each other **on a screen** — declared and broken are the
 *     same bytes to a grep. That is procedure **P3**, and it is still pending.
 */
export function SectionVoid({
  section,
}: {
  /**
   * The two columns of the void, taken from the row rather than restated: the
   * component names the database's own words, which is what makes the gate's
   * assertion about this file mean something about the data.
   */
  section: Pick<ProductionSection, "missing" | "decision_owner">;
}) {
  const gap = section.missing;
  const owner = section.decision_owner;

  if (gap === null || owner === null) {
    return (
      <div className="border-s-2 border-dashed border-control ps-3">
        <p className="text-sm font-semibold text-ink">
          This section is undecided and does not say what is outstanding.
        </p>
        <p className="mt-1 text-sm text-muted">
          A row in this state is required to name both the gap and the role that
          closes it. This one does not, so the row reached this page without
          satisfying the constraint that asks for them — which is a defect in
          the data and not a section with less to say.
        </p>
      </div>
    );
  }

  return (
    <div className="border-s-2 border-dashed border-control ps-3">
      <p className="text-sm font-semibold text-ink">Not decided yet.</p>
      <dl className="mt-2 space-y-2">
        <div>
          <dt className="font-mono text-xs font-semibold uppercase tracking-widest text-muted">
            What is missing
          </dt>
          <dd className="mt-1 text-sm text-ink">{gap}</dd>
        </div>
        <div>
          <dt className="font-mono text-xs font-semibold uppercase tracking-widest text-muted">
            Whose call it is
          </dt>
          <dd className="mt-1 text-sm text-ink">{owner}</dd>
        </div>
      </dl>
      <p className="mt-2 text-sm text-muted">
        Until it is decided, nothing here may be filled in — not in a brief, not
        in a caption, not in a piece of artwork.
      </p>
    </div>
  );
}
