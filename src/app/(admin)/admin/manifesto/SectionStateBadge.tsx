import { Badge } from "@/components/ui/Chip";

import {
  SECTION_STATE_LABELS,
  type SectionState,
} from "@/lib/production/sections/vocabulary";

/**
 * What state a section's content is in, as a **word**.
 *
 * *Written* · *coordinates declared* · *not decided* — the three
 * `SECTION_STATES` publishes, drawn by the **one** component both authored
 * sections use. It is the shape `StageBadge.tsx` already has one directory over,
 * adopted whole rather than re-argued, and the three paragraphs below are its
 * three reasons applied to a different question.
 *
 * ── Why no colour, when three ordered states are the classic case for one ────
 *
 * This tree's token layer declares four semantics and every one of them names a
 * **state of the system** — critical, caution, information, completion. Grading
 * *written* against *not decided* on that layer would settle in CSS a question
 * `sound-manifesto.md` says is settled by whoever owns the brand: a caution hue
 * on *not decided* reads as *something is wrong here*, and a completion hue on
 * *written* reads as *this is finished*. Neither is a claim a stylesheet is
 * entitled to make about a body of rules somebody has not finished writing.
 *
 * And the sharper half, measured rather than supposed: the caution token IS
 * SunSet's identification colour (`verify-semantic-separation.mjs:35-39`), so a
 * hue alone cannot tell a reader *caution* from *this is that format*. Anything
 * that would have been a colour here is a word instead.
 *
 * ── The badge NEVER disappears, and that is the whole point ──────────────────
 *
 * There is no early return in this component and no branch that produces
 * nothing. `SECTION_STATE_LABELS` is a **total** `Record` over the union, so a
 * fourth state added to the vocabulary is a `npm run build` error here rather
 * than a silently blank badge on a screen.
 *
 * **A blank reads as *fine*, and *fine* is precisely the claim that cannot be
 * made about a manifesto nobody has written.** A section whose state was drawn
 * as nothing would be read as a section with nothing to declare — which is the
 * reading `sound-manifesto.md` calls *inventato*, arrived at by omission instead
 * of by invention.
 *
 * ── Three states and not two, which is the reason this component exists ──────
 *
 * The middle one — *coordinates declared* — is the entire justification for a
 * component instead of a boolean. The domain names **two opposite errors**, and
 * a two-state model can only defend against one of them at a time:
 *
 *   * *inventato non è una risposta* — writing layers, tempi and reference
 *     artists for a format whose identity somebody else owns. Once that reaches
 *     a brief or a piece of artwork, it **is** the brand for whoever reads it;
 *   * *non-scritto non vuol dire non-vincolato* — answering *not decided* where
 *     a coordinate has already been declared, which is an omission dressed as
 *     prudence. A declared coordinate binds, and so does an explicit negative:
 *     exclusions are decisions as much as inclusions and are **reported**, never
 *     re-derived.
 *
 * Fold the middle state into either neighbour and a format that is unwritten but
 * constrained becomes indistinguishable from one that is unwritten and free —
 * and a format that reads as free gets written by whoever is under deadline.
 *
 * ── Where this file lives, and why it is not under `visual/` too ─────────────
 *
 * Both authored sections draw this badge and there is exactly one of it: the
 * visual surface imports it from here. The directory is the one plan 45-12's
 * file list named; the alternative is a second badge, which is a second place
 * the three states can drift to two.
 */
export function SectionStateBadge({ state }: { state: SectionState }) {
  return (
    /*
      `normal-case` is DECLARED and not assumed. `text-transform` inherits,
      `uppercase` appears in 43 files in this tree, and *we did not add
      `uppercase`* is a hope about every ancestor a caller might one day put
      above this rather than a guarantee. `NOT DECIDED` shouted in capitals is a
      different-looking claim from the one the vocabulary writes.
    */
    <Badge className="normal-case">{SECTION_STATE_LABELS[state]}</Badge>
  );
}
