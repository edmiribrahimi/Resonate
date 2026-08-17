import { StageBadge } from "@/components/production/StageBadge";

import type { VenueStage } from "@/lib/production/sections/vocabulary";

/**
 * The **only** renderer of a scouted space's name — and it renders the stage
 * beside it, in the same subtree, with no branch that does not.
 *
 * > No other file under `src/app/(admin)/admin/location/` or
 * > `src/app/(admin)/admin/(work)/location/` may draw a space's name. That is
 * > the single-renderer rule `ScoreCell.tsx:9-16` and `AttributeCell.tsx:15-21`
 * > already state for their own values, and `scripts/verify-section-surface.mjs`
 * > check A asserts it here **by this file's name**.
 *
 * ── Why the name and the stage are ONE component and not two cells ───────────
 *
 * Phase 45's success criterion 2, in its own words: *a stage that is not
 * `acquired` is visible as such **wherever the space is named***.
 * `venue-acquisition.md` puts the domain reason as a gate — *lo stato prima del
 * nome*: mapped ≠ verified ≠ contacted ≠ acquired, and **acquired means in
 * writing**. Presenting a candidate as a venue is the fastest way to put a date
 * in the calendar with nowhere to happen.
 *
 * Written as a rule, that criterion has to be remembered in the list, in the
 * detail, and in every surface either of them grows. Written as **one
 * component that takes both values and returns both**, it cannot be forgotten:
 * a caller has no shape of this input that carries a name without a stage, and
 * there is no early return and no branch here that produces nothing. It is the
 * same construction `StageBadge` itself uses one directory over, applied one
 * level up — and it is the reason this file exists instead of two adjacent
 * cells in a column declaration.
 *
 * ── The stage here is NEVER null, and that is a fact about this table ────────
 *
 * `StageBadge` accepts `null` because `production_plan.venue_stage` is nullable:
 * a calendar entry carries no stage, so the import has nothing to read and must
 * not infer one. `production_space.stage` is `NOT NULL DEFAULT 'mapped'` for the
 * opposite reason — **the act of entering this list IS the mapping**, so there
 * is no such thing as a scouted space at an unknown stage. The prop below is
 * therefore `VenueStage` and not `VenueStage | null`: the narrower type is the
 * honest one, and widening it would invite a caller to pass an absence this
 * table cannot produce.
 *
 * ── What this component does NOT do ─────────────────────────────────────────
 *
 *   * **It does not link.** Whether a name is a door to somewhere is the
 *     caller's question, and it differs between the list (a door) and the
 *     detail (a heading). Wrapping the caller's `Link` around this component
 *     keeps the guarantee intact either way.
 *   * **It does not draw an address.** The address is a street address with a
 *     house number on a large minority of the rows, it is the payload
 *     `venue_for_parties` exists to release deliberately, and it belongs in ONE
 *     place on the detail page and nowhere else. A component reached from a list
 *     is not that place.
 *   * **It does not draw a score.** A figure beside a name reads as *this venue
 *     is possible*, and it would be saying it about desk work — 184 spaces
 *     scouted, **nobody called**. The score is read per format, on the detail,
 *     through `ScoreCell`.
 */
export function SpaceName({
  name,
  stage,
}: {
  /** The space's name as the scouting wrote it. Internal, never public. */
  name: string;
  /** How far it has got. Never null on this table — see the docblock. */
  stage: VenueStage;
}) {
  return (
    /*
      `normal-case` is DECLARED and not assumed. `text-transform` inherits,
      `uppercase` appears in 43 files in this tree, and *we did not add
      `uppercase`* is a hope about every ancestor a caller might one day put
      above this rather than a guarantee. A space's name is a literal: it is
      written the way whoever owns the place writes it, and an upper-cased
      version is a different-looking claim about a name we do not own.
    */
    <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
      <span className="normal-case text-ink">{name}</span>
      <StageBadge stage={stage} />
    </span>
  );
}
