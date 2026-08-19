/**
 * How well a space suits **one** format — computed from its attributes, and
 * stored nowhere.
 *
 * No React, no client, no query, no row. This module takes the values a space
 * already carries and returns a shape; it reads nothing and writes nothing.
 *
 * ── (a) WHY THE NUMBER IS NOT A COLUMN ──────────────────────────────────────
 *
 * D-45-11, as revised on 2026-08-17 after the archive was measured: there is no
 * score field in the source and there must not be one here. Two reasons, both
 * from `venue-acquisition.md`:
 *
 *   * a stored number **detaches from its inputs at the first edit**, and then
 *     it is a figure nobody can re-derive and everybody trusts;
 *   * *si legge per format, mai come un giudizio assoluto* — one number kept
 *     beside a space, across formats, encodes precisely the opposite of that.
 *
 * And the third, which is the one that costs money: **a ranking is not an
 * availability.** 184 spaces are scouted and **nobody has been called.** A high
 * figure drawn beside a name says *this venue is possible*, and it says it about
 * desk work.
 *
 * ── (b) THE NUMBERS ARE NOT COMPARABLE ACROSS FORMATS ───────────────────────
 *
 * This is the module's own limit and it is written here rather than left to be
 * discovered. Each format weighs the same attributes differently — a dominant
 * criterion worth 4 of 10 is a **different** criterion in each of the three
 * weightings below. Two results from two formats are therefore two answers to
 * two different questions, and **any surface that sorts them together is
 * answering a question this module did not ask.**
 *
 * A space technically perfect for one format can be out of identity for
 * another. Sort within a format; never across.
 *
 * ── (c) A COMPUTED NUMBER IS ONLY AS VERIFIED AS ITS WEAKEST INPUT ──────────
 *
 * `provenance` on the result is the weakest of the inputs that contributed:
 * `field_verified` only when **every** weighted criterion that fed the number
 * was itself field-verified, and `derived` otherwise. A score assembled from one
 * phone call and four public listings is **a hypothesis wearing the authority of
 * arithmetic**, and the union refuses to let it travel without saying so —
 * there is no variant here carrying a number alone.
 *
 * ── (d) AN UNASKED QUESTION IS NOT A `no` ───────────────────────────────────
 *
 * A criterion whose answer is `not_asked` — and a capacity nobody has obtained —
 * is **excluded from the denominator**, never scored as a zero. A low figure
 * built out of unanswered questions is *ignorance reported as a negative*, and
 * the measured context makes that the ordinary case rather than the corner one:
 * the evening-viability attribute is unanswered on 100 of 184 spaces, and the
 * capacity band's fourth value is the unasked marker on 17 more.
 *
 * The count of what was answered travels with the number — `askedCount` of
 * `totalCount` — because a figure computed over half the criteria is a different
 * claim from the same figure computed over all of them.
 *
 * ── (e) A BAND IS NOT A CAPACITY, AND NOTHING HERE INFERS ONE ───────────────
 *
 * `size_band` is never read by this module and `real_capacity` is never invented
 * from it. The band cannot answer *how many people actually fit*, and a surface
 * that turned `medium` into a number would put a figure in front of somebody who
 * would then repeat it on a phone call.
 *
 * **Measured, and it corrects `45-CONTEXT.md`:** the numeric capacity is **not**
 * null on all 184 records. Plan 45-01 counted the export field by field and
 * found **38 records carrying a number**, across twenty distinct values; the
 * other 146 are empty. So the capacity criterion below is answerable on a
 * minority of spaces and unanswered on the rest — which is exactly what the
 * denominator rule in (d) is built for, and it is the reason this module accepts
 * a capacity at all rather than dropping the criterion as permanently unknown.
 */

import type {
  AnswersSource,
  AttributeKey,
  AttributeProvenance,
  AttributeValue,
  ExitReason,
} from "@/lib/production/sections/vocabulary";

/* ────────────────────────────────────────────────────────────────────────────
 * The weights — transcribed from `.claude/rules/venue-acquisition.md`
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * One weighted criterion of one format's declared weighting.
 *
 * Two sources and not one, because the domain module weighs something the
 * archive does not hold as an attribute: **capacity in target**. Folding it into
 * the ten attributes would have meant either inventing an eleventh attribute or
 * silently dropping 2.5 of 10 from one format's weighting — and a weighting
 * quietly computed over three quarters of itself is a number nobody can check.
 */
export type WeightedCriterion =
  | {
      readonly source: "attribute";
      readonly attribute: AttributeKey;
      readonly weight: number;
    }
  | {
      readonly source: "capacity_in_target";
      readonly weight: number;
    };

/**
 * The capacity a night targets, and the only range this module knows.
 *
 * 150 to 300 people, stated by `venue-acquisition.md` inside Resonate's
 * weighting and repeated by `community-membership.md` as the fact that bounds
 * how fast the community may grow.
 *
 * **Inside or outside, and no curve between.** The domain declares a range and
 * not a falloff; a room for 320 does not score 0.9 here, because nobody has said
 * it should and a gradient invented in this file would be a judgement made in
 * arithmetic that belongs to a person standing in the room.
 */
export const NIGHT_CAPACITY_TARGET = { min: 150, max: 300 } as const;

/**
 * The per-format weights, keyed by `formats.code`, read from
 * `.claude/rules/venue-acquisition.md` § *I criteri, e perché cambiano per
 * format* — **from the module, not from a plan and not from memory.**
 *
 * Every row carries its mapping and its reason on the same line, because a
 * mapping that is obvious today is a mapping nobody can check next year.
 *
 * ── `RMDB` IS ABSENT, DELIBERATELY ──────────────────────────────────────────
 *
 * RamaDub is the fourth format and it has **no entry here**, because
 * `venue-acquisition.md` says so in its own table, in words: it names the
 * criteria — vocation, music, audio, console, capacity — and then says the
 * weights are *non ancora dichiarati*. Choosing numbers for it would be
 * `sound-manifesto.md`'s *inventato non è una risposta* committed one domain
 * over: writing the brand at the place of whoever owns it. The function returns
 * {@link ScoreResult} `weights_not_declared` for it, which is a real answer.
 *
 * ── THREE ATTRIBUTES CARRY NO WEIGHT IN ANY DECLARED WEIGHTING ──────────────
 *
 * `aperitivo_vocation` belongs to the weighting that is not declared;
 * `events` and `partnership` are context the archive holds and no published
 * weighting uses. They are held on the space and they are not scored — which is
 * a different thing from being worthless, and the surface still shows them.
 */
export const FORMAT_WEIGHTS: Readonly<
  Partial<Record<string, readonly WeightedCriterion[]>>
> = {
  // Resonate — *carattere ed esclusività*. Its dominant criterion is written
  // with two words in the module and one in the archive.
  RSNT: [
    // *carattere* 4 → `exclusivity`. Same criterion; the archive keeps the
    // second of the module's two words, which is the one it can grade.
    { source: "attribute", attribute: "exclusivity", weight: 4 },
    // *capienza in target 150–300* 2,5 → no attribute exists for it. It is the
    // numeric capacity column, answered on a minority of records and null on
    // the rest, and it is never inferred from the band.
    { source: "capacity_in_target", weight: 2.5 },
    // *musica ammessa* 2 → `music_at_home`. ⚠ **These are not the same claim.**
    // The module says music is *permitted*; the archive grades whether music is
    // *already at home*. A place where it is already at home certainly permits
    // it, so the mapping under-credits and never over-credits — and
    // under-crediting is the safe direction for a figure that decides who gets
    // telephoned first.
    { source: "attribute", attribute: "music_at_home", weight: 2 },
    // *agibilità fino a tardi* 1,5 → `evening_licence`. ⚠ The module
    // distinguishes *fino a tardi* (a night that ends at six) from MotionLab's
    // *serale* (18→22); the archive has one attribute for both, so Resonate's
    // hardest question is answered here by the softer one. The harder answer
    // lives in the two dedicated columns beside it — the hours the venue keeps
    // and whether it will even discuss later ones — and the second of those is
    // `not_asked` by construction and may never be inferred, so it is not
    // folded in. **A Resonate score does not close the closing-hour question.**
    { source: "attribute", attribute: "evening_licence", weight: 1.5 },
  ],

  /*
    QUI STAVA IL FORMAT DEL TRAMONTO, e i suoi pesi sono usciti il 2026-08-20 con
    il format stesso (`CAT-01`). Pesava `outdoor_sunset` 4, `music_at_home` 3,
    `audio` e `console` 1,5.

    ── L'ATTRIBUTO `outdoor_sunset` RESTA, e non e' una svista ────────────────

    E' una proprieta' dello SPAZIO — *esterno, rivolto al tramonto* — non un
    riferimento al format: sta fra i dieci valori ammessi da un CHECK su 1840
    righe in produzione, e toglierlo romperebbe lo schema. Continua a comparire
    sulla scheda di uno spazio come fatto; smette solo di alimentare un punteggio,
    perche' nessun format lo pesa piu'.

    ── E i 58 spazi che erano suoi ────────────────────────────────────────────

    58 spazi su 184 portavano quel format come `home_format_id`. Sono rimasti in
    archivio con tutti i loro attributi e i punteggi sugli altri format; hanno
    perso solo l'etichetta che diceva perche' furono cercati. Decisione del
    proprietario, 2026-08-20.
  */

  // MotionLab — *la cornice espositiva*.
  MTNLB: [
    // *cornice* 4 → `artistic_frame`. Exact.
    { source: "attribute", attribute: "artistic_frame", weight: 4 },
    // *musica già di casa* 3 → `music_at_home`. Exact; this is the row the
    // archive's word was coined for.
    { source: "attribute", attribute: "music_at_home", weight: 3 },
    // *impianto* 1,5 → `audio`. It weighs little because a rig can be brought —
    // and it still weighs something, because inside a space with works on its
    // walls bringing one changes cost and timing a great deal.
    { source: "attribute", attribute: "audio", weight: 1.5 },
    // *agibilità serale* 1,5 → `evening_licence`. Exact for this format: the
    // evening here ends at 22, not at six.
    { source: "attribute", attribute: "evening_licence", weight: 1.5 },
  ],
};

/**
 * What each answered step of the four-step scale is worth, as a fraction of its
 * criterion's weight.
 *
 * **`not_asked` is excluded from this record by type**, not by a runtime guard:
 * `Exclude` makes an entry for it a compile error, so the rule in (d) above
 * cannot be broken by somebody adding what looks like a missing key.
 *
 * The four steps are spaced evenly because **nothing in the source declares a
 * spacing**. An uneven curve — `good` at 0.8, `limited` at 0.2 — would encode a
 * judgement about how much worse *limited* is than *good*, and no one has made
 * that judgement.
 */
const VALUE_CREDIT: Readonly<
  Record<Exclude<AttributeValue, "not_asked">, number>
> = {
  top: 1,
  good: 2 / 3,
  limited: 1 / 3,
  no: 0,
};

/**
 * How much of a format's declared weight must be answered before a number is
 * allowed to exist.
 *
 * **On weight and not on count**, because the weights are unequal by design: the
 * dominant criterion is worth 4 of 10 and the lightest 1.5, so three answered
 * criteria out of four can be either most of the weighting or a third of it.
 *
 * The value is a **declared choice, not a measurement** — the domain states no
 * floor. It is written as a named constant so that changing it is an edit
 * somebody has to justify rather than a number buried in a comparison.
 */
const ANSWERED_WEIGHT_FLOOR = 0.5;

/* ────────────────────────────────────────────────────────────────────────────
 * The inputs
 * ──────────────────────────────────────────────────────────────────────────── */

/** One attribute a space holds, with the provenance the column always carries. */
export interface ScoredAttribute {
  readonly attribute: AttributeKey;
  readonly value: AttributeValue;
  readonly provenance: AttributeProvenance;
}

/**
 * Everything this module needs, and nothing else. **Not a row**: no name, no
 * address, no stage, no note. A function that cannot see which space it is
 * scoring cannot leak one.
 */
export interface SpaceForScoring {
  readonly attributes: readonly ScoredAttribute[];
  /**
   * How many people actually fit — `null` wherever nobody obtained the answer,
   * which is the ordinary state and not the exceptional one.
   */
  readonly realCapacity: number | null;
  /** How the four telephone answers were obtained. Gives capacity its provenance. */
  readonly answersSource: AnswersSource;
  /** Why the space left the race, or `null` while it is still in it. */
  readonly exitReason: ExitReason | null;
}

/* ────────────────────────────────────────────────────────────────────────────
 * The result — four variants, and no bare number among them
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * What a per-format score is, or the reason there is none.
 *
 * Built on `PieceDate.tsx:89-94`'s model, for the same reason: **there is no
 * shape of this that is a number without its provenance**, which is the
 * strongest available form of a rule — one that can only be kept by remembering
 * it is not kept.
 *
 * `out_of_identity` and `not_enough_answered` are **different sentences and must
 * stay different**. `venue-acquisition.md` keeps a space discarded *because it
 * contradicts the identity* on the list at **zero** rather than deleting it, so
 * a zero has to be representable — and it has to be distinguishable from an
 * absence, because deleting the memory of that choice means remaking it from
 * scratch at the first difficulty. Collapsing the two would be the shape this
 * repository has already paid for once: one message for three different causes.
 *
 * ⚠ **`exit_reason` is recorded on the space and read here per format.** The
 * archive holds one exit reason for a space while the domain reads suitability
 * per format, so whoever writes *out of identity* is making a per-format
 * judgement in a space-wide column. That is written down rather than resolved
 * here, because resolving it is a schema decision and not an arithmetic one.
 */
export type ScoreResult =
  | {
      readonly kind: "score";
      readonly value: number;
      readonly provenance: AttributeProvenance;
      readonly askedCount: number;
      readonly totalCount: number;
    }
  | { readonly kind: "weights_not_declared"; readonly format: string }
  | {
      readonly kind: "not_enough_answered";
      readonly askedCount: number;
      readonly totalCount: number;
    }
  | { readonly kind: "out_of_identity" };

/* ────────────────────────────────────────────────────────────────────────────
 * The computation
 * ──────────────────────────────────────────────────────────────────────────── */

/** Capacity has no provenance column of its own; it inherits the call's. */
function capacityProvenance(source: AnswersSource): AttributeProvenance {
  // A number present while nobody has been called came off a public page. All
  // 38 measured numbers are in that state today, and marking them verified
  // would be *derivato non è verificato* committed on the one figure people
  // repeat out loud.
  return source === "phone" || source === "on_site" ? "field_verified" : "derived";
}

/**
 * What one criterion contributes, or `null` when nobody has answered it.
 *
 * `null` is the unanswered case and it is what keeps an unasked question out of
 * the denominator. It is never a zero.
 */
function answerFor(
  criterion: WeightedCriterion,
  space: SpaceForScoring,
): { readonly credit: number; readonly provenance: AttributeProvenance } | null {
  if (criterion.source === "capacity_in_target") {
    if (space.realCapacity === null) return null;
    const inTarget =
      space.realCapacity >= NIGHT_CAPACITY_TARGET.min &&
      space.realCapacity <= NIGHT_CAPACITY_TARGET.max;
    return {
      credit: inTarget ? 1 : 0,
      provenance: capacityProvenance(space.answersSource),
    };
  }

  for (const held of space.attributes) {
    if (held.attribute !== criterion.attribute) continue;
    if (held.value === "not_asked") return null;
    return { credit: VALUE_CREDIT[held.value], provenance: held.provenance };
  }

  // The attribute is not on the space at all, which is the same fact as nobody
  // having asked. Same treatment, and never a zero.
  return null;
}

/**
 * The score of one space for one format, on the 0–10 scale the domain module
 * publishes its weights on.
 *
 * Reads nothing, writes nothing, and returns a shape rather than a figure.
 *
 * The order of the four exits is deliberate. `out_of_identity` comes first
 * because it is a decision a **person recorded**, and a recorded decision
 * outranks an undeclared weighting: a space ruled out of identity reads as a
 * zero for every format, including the one whose weights nobody has written.
 */
export function computeFormatScore(
  formatCode: string,
  space: SpaceForScoring,
): ScoreResult {
  if (space.exitReason === "out_of_identity") {
    return { kind: "out_of_identity" };
  }

  const criteria = FORMAT_WEIGHTS[formatCode];
  if (criteria === undefined) {
    return { kind: "weights_not_declared", format: formatCode };
  }

  const totalCount = criteria.length;
  let declaredWeight = 0;
  let answeredWeight = 0;
  let earned = 0;
  let askedCount = 0;
  // The weakest input wins. One field-verified answer beside three desk-read
  // ones does not make the number field-verified.
  let everyContributorFieldVerified = true;

  for (const criterion of criteria) {
    declaredWeight += criterion.weight;

    const answer = answerFor(criterion, space);
    if (answer === null) continue;

    askedCount += 1;
    answeredWeight += criterion.weight;
    earned += criterion.weight * answer.credit;
    if (answer.provenance !== "field_verified") {
      everyContributorFieldVerified = false;
    }
  }

  if (
    answeredWeight <= 0 ||
    answeredWeight < declaredWeight * ANSWERED_WEIGHT_FLOOR
  ) {
    return { kind: "not_enough_answered", askedCount, totalCount };
  }

  // Renormalised over the weight that was answered, so the unanswered criteria
  // neither drag the figure down nor silently count as satisfied — and rounded
  // to one place, because a four-step input cannot carry three decimals of
  // precision and printing them would claim it can.
  const value = Math.round((earned / answeredWeight) * 100) / 10;

  return {
    kind: "score",
    value,
    provenance: everyContributorFieldVerified ? "field_verified" : "derived",
    askedCount,
    totalCount,
  };
}
