import { Badge } from "@/components/ui/Chip";

/**
 * One open question, drawn beside the piece it bears on — a warning that
 * **stops nothing**.
 *
 * ── It warns and lets you proceed (D-45-15, inheriting D-44-16) ─────────────
 *
 * The owner chose this over blocking the dependent piece, and the reason is the
 * one the Phase 44 checklist already carries: **a block that fires under
 * deadline is a block somebody routes around.** The listing goes out on the
 * Tuesday for the Thursday; a surface that refused to let a piece proceed
 * because a question is outstanding would be answered by producing the piece
 * somewhere this product cannot see, and then the register would be a record of
 * questions nobody consults rather than a warning somebody reads.
 *
 * So this component renders text and nothing else. It owns no control, it
 * receives no callback, it wraps nothing, and there is no prop through which a
 * caller could make it prevent an action. That absence is the requirement, not
 * an unfinished part: it is asserted mechanically — no attribute in this file
 * takes anything out of service.
 *
 * ── A WORD, never a hue ─────────────────────────────────────────────────────
 *
 * The obvious rendering for *caution* is this tree's caution token, and it is
 * refused for a measured reason: that token holds the same value as one
 * format's identification colour (`verify-semantic-separation.mjs:35-39`), so a
 * mark in that hue cannot tell a reader *be careful here* from *this is that
 * format*. On the two surfaces whose whole subject is formats, that ambiguity
 * would be at its worst. Every warning on this page is therefore carried by the
 * badge's word and by the sentence beside it, and by no colour at all.
 *
 * The rule generalises and is worth stating once: **anything that would have
 * been a hue on these two surfaces carries text.**
 *
 * ── It names the role that closes it ────────────────────────────────────────
 *
 * `production_open_question.decision_owner` is `NOT NULL`, and that is the whole
 * point of the register: *a question with no owner is the state this register
 * abolishes.* A warning that says something is unresolved without saying who
 * resolves it is a warning that reads as nobody's job — which is the shape an
 * open question already has when it is not written down at all.
 *
 * A **role**, never a person. This repository is public, and a decision
 * attributed to a name ages badly the moment somebody leaves.
 *
 * ── What it must not carry ──────────────────────────────────────────────────
 *
 * The question text is authored prose that leaves the perimeter as easily as
 * the rest of these two sections. It is written as a **criterion** — *is the
 * sound one manifesto or one per venue* — and never as a candidate: no space
 * under negotiation, no unannounced date, no line-up. That rule is enforced by
 * whoever writes the row, and it is repeated here because this is the component
 * that puts the row on a screen.
 */
export function OpenQuestionNotice({
  question,
  decisionOwner,
  scope,
}: {
  /** The question, in the words of whoever opened it. */
  question: string;
  /** The role that closes it. Never a person. */
  decisionOwner: string;
  /**
   * What it bears on, when the caller can say — a format's name, or the words
   * for a question about the whole body of rules. Optional because the register
   * holds questions that belong to no single piece, and those are drawn with
   * the scope the caller gives them rather than with an invented one.
   */
  scope?: string;
}) {
  return (
    <div className="border-s-2 border-dashed border-control ps-3">
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <Badge>Open question</Badge>
        {scope === undefined ? null : (
          <span className="text-xs text-muted">{scope}</span>
        )}
      </p>
      <p className="mt-1 text-sm text-ink">{question}</p>
      <p className="mt-1 text-sm text-muted">
        Nobody has decided this yet. It does not stop the work — it travels with
        it. Whose call it is:{" "}
        <span className="font-semibold text-ink">{decisionOwner}</span>.
      </p>
    </div>
  );
}
