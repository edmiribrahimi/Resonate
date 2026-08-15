import { Badge } from "@/components/ui/Chip";

import type { VenueStage } from "@/lib/production/ics/vocabulary";

/**
 * How far a space has got, as a **word**.
 *
 * `mapped` · `verified` · `contacted` · `acquired` — the four `venue-acquisition.md`
 * already publishes, plus a fifth reading for the case where the calendar does
 * not say. All five in a `neutral` badge, and **no hue encodes any of them**.
 *
 * ── Why no colour, when four ordered stages are the classic case for one ─────
 *
 * A colour meaning *acquired* would be a stage nobody could read
 * (`41-UI-SPEC.md` §15, written as an instruction to a later phase and applied
 * here one phase early). More concretely: this project's token layer declares
 * four semantics that name **states** — critical, caution, information,
 * completion — and grading a negotiation against them would settle in CSS what
 * `venue-acquisition.md` says must be settled by a phone call. The same
 * argument the membership register already made about roles, on the surface
 * where the answer matters more, because *acquired* means **in writing** and
 * nothing else does.
 *
 * ── The badge NEVER disappears, and that is the whole point ──────────────────
 *
 * The stage is not in the calendar file and must never be inferred from it. A
 * space appearing on a plan row says only that somebody wrote it down; an
 * inferred *acquired* is the exact harm the module names — a negotiation made
 * public, and a publication does not come back.
 *
 * So where the stage is not recorded the badge still renders, and it says so.
 * **A blank reads as *fine*, and *fine* is precisely the claim that cannot be
 * made.** There is no early return in this component and there is no branch
 * that produces nothing.
 *
 * *(`44-RESEARCH.md` Open Question 4 is still open: where a stage gets authored
 * has not been decided. Until it is, every row reads the fifth word, which is
 * honest. This component renders whichever answer arrives without changing.)*
 *
 * ── The transform is declared, never assumed ─────────────────────────────────
 *
 * `normal-case` is on the element. `text-transform` inherits, `uppercase`
 * appears in 43 files in this tree, and *we did not add `uppercase`* is not a
 * guarantee — it is a hope about every ancestor a caller might one day put
 * above this. The stage vocabulary is lower case in the module that publishes
 * it, and an upper-cased `ACQUIRED` is a different-looking claim.
 */
export function StageBadge({ stage }: { stage: VenueStage | null }) {
  return (
    <Badge className="normal-case">{stage === null ? "stage unknown" : stage}</Badge>
  );
}
