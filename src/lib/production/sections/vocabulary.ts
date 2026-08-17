/**
 * The three production sections' vocabularies, named once.
 *
 * Ten closed sets — the state a section is in, which section it is, why a space
 * left the race, the ten scouted attributes and the five values one can take,
 * where a value came from, where an answer came from, whether anybody will even
 * discuss late hours, the capacity band and the eleven categories of space.
 *
 * The direction of every import in this file is outward: it takes the four
 * acquisition stages from `@/lib/production/ics/vocabulary`, which imports
 * nothing, and `@/types/database` imports *from here*. A second copy of any set
 * below would be a second truth that nothing compares, because a SQL `CHECK` is
 * invisible to `tsc` and a TypeScript union is invisible to Postgres.
 *
 * ── (a) THE SQL MIRROR IS REAL, AND EDITING ONE SIDE MEANS EDITING BOTH ──────
 *
 * Every set below is duplicated as a named SQL `CHECK` by this phase's two
 * structural migrations, `20260817120100_production_location.sql` and
 * `20260817120200_production_sections.sql`. `npm run build` catches the
 * TypeScript side, the constraint catches the SQL side, and the two agree ONLY
 * because they were written once here and copied. A changed constraint set is a
 * NEW migration, never an edit to an applied one (`supabase-data.md`, gate
 * *migration in avanti*).
 *
 * ── (b) THE STAGES ARE NOT REDECLARED HERE ──────────────────────────────────
 *
 * `VENUE_STAGES` already exists, one directory over, with the same four words,
 * and it is already mirrored by `production_plan_venue_stage_check`. It is
 * re-exported below rather than restated: a second tuple would be a second thing
 * to keep in step with one constraint, and the two would drift the first time
 * somebody edited the nearer one. `StageBadge.tsx` already reads the type from
 * its existing home; nothing about that changes.
 *
 * ── (c) THERE IS NO VOCABULARY OF SUITABILITY HERE, AND THERE MUST NOT BE ────
 *
 * How well a space suits a format is COMPUTED from the attributes below with
 * that format's declared weights (plan 45-07) and is stored nowhere — not as a
 * column, not as a tuple, not as a constant. Two reasons, both from
 * `venue-acquisition.md`:
 *
 *   * a stored number detaches from its inputs at the first edit, and then it is
 *     a figure nobody can re-derive and everybody trusts;
 *   * *si legge per format, mai come un giudizio assoluto* — one number for a
 *     space, across formats, encodes exactly the opposite of that rule.
 *
 * And the third, which is the one that costs money: a ranking is not an
 * availability. Nobody has been called. A high figure drawn beside a name says
 * *this venue is possible*, and it says it about desk work.
 *
 * ── (d) WHY `not_asked` IS A MEMBER OF THREE SETS AND NEVER A BLANK ──────────
 *
 * The archive this section is seeded from encodes *to verify* PER ATTRIBUTE and
 * not per record: its lowest value on six of the scouted attributes is literally
 * the unasked marker, and on the evening-viability attribute it is the value on
 * 100 of 184 spaces. A surface that rendered that as an empty cell would report
 * IGNORANCE AS A NEGATIVE — and more than half the archive does not yet know
 * whether an evening is possible at all.
 *
 * A blank cell and an unasked question are the same pixel unless the data
 * distinguishes them. That is why the value exists, in every set where the
 * question can go unasked, and why the columns that carry it are `NOT NULL`.
 */

// The one import, and the direction is the inverted one this project uses for
// every shared vocabulary. `@/lib/production/ics/vocabulary` imports nothing, so
// this is the only possible direction and no cycle is even representable.
export { VENUE_STAGES } from "@/lib/production/ics/vocabulary";
export type { VenueStage } from "@/lib/production/ics/vocabulary";

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
 * `PIECE_KIND_LABELS` and `CAP_DESCRIPTIONS`. A fourth state added above without
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
 * Which of the two authored sections a row belongs to.
 *
 * Two and not four: location has no `production_section` row of its own, because
 * its content is a list of spaces rather than a piece of prose, and the calendar
 * is a fourth SECTION KEY but not a fourth body of authored text. This tuple
 * names the sections that hold writing.
 */
export const SECTION_KINDS = ["manifesto", "visual"] as const;

/** Which authored section a row belongs to. Mirrored by the `section` CHECK. */
export type SectionKind = (typeof SECTION_KINDS)[number];

/** The two authored sections, as they are written on a surface. */
export const SECTION_KIND_LABELS: Record<SectionKind, string> = {
  manifesto: "Sound manifesto",
  visual: "Visual system",
};

/**
 * Why a space left the race — and leaving it is the only thing that ever happens
 * to a space, because **no space is ever deleted** (D-45-13).
 *
 * `venue-acquisition.md` puts the first member as a gate in its own words: a
 * space discarded BECAUSE IT CONTRADICTS THE IDENTITY stays in the list, at
 * zero, and is never removed. Deleting it loses the memory of the choice, and
 * the choice then gets remade from scratch at the first difficulty — by somebody
 * who was not in the room when it was made the first time.
 *
 * `other` is a member rather than an escape hatch: the alternative is a reason
 * invented to fit one of the three above, which is worse than an honest fourth
 * word beside a written note.
 */
export const EXIT_REASONS = [
  "out_of_identity",
  "refused",
  "unreachable",
  "other",
] as const;

/** Why a space left the race. Mirrored by the `exit_reason` CHECK. */
export type ExitReason = (typeof EXIT_REASONS)[number];

/** Why a space left the race, as it is written on a surface. */
export const EXIT_REASON_LABELS: Record<ExitReason, string> = {
  out_of_identity: "Out of identity",
  refused: "Refused",
  unreachable: "Unreachable",
  other: "Other",
};

/**
 * The ten attributes a scouted space carries.
 *
 * Four of them are the ones a profile can be read for — outdoor and facing the
 * sunset, an artistic frame, a vocation for the aperitivo, exclusivity of
 * character. Six are the ones only a telephone closes: an evening licence,
 * whether the place already runs events, whether music is already at home there,
 * the audio, the console, and whether they would enter a partnership at all.
 *
 * The second group is where `venue-acquisition.md`'s FOUR QUESTIONS live — what
 * rig is there, how many people actually fit, whether a guest dj may play, and
 * until what hour. The last of those four is not an attribute at all; it is the
 * pair of dedicated columns below, because it is the question that screens out
 * the most candidates and it deserved to be unmissable rather than one of ten.
 */
export const ATTRIBUTE_KEYS = [
  "outdoor_sunset",
  "artistic_frame",
  "aperitivo_vocation",
  "exclusivity",
  "evening_licence",
  "events",
  "music_at_home",
  "audio",
  "console",
  "partnership",
] as const;

/** One of the ten scouted attributes. Mirrored by the `attribute` CHECK. */
export type AttributeKey = (typeof ATTRIBUTE_KEYS)[number];

/** The ten attributes, as they are written on a surface. */
export const ATTRIBUTE_KEY_LABELS: Record<AttributeKey, string> = {
  outdoor_sunset: "Outdoor, facing the sunset",
  artistic_frame: "Artistic frame",
  aperitivo_vocation: "Aperitivo vocation",
  exclusivity: "Exclusivity",
  evening_licence: "Evening licence",
  events: "Runs events",
  music_at_home: "Music already at home",
  audio: "Audio",
  console: "Console",
  partnership: "Open to a partnership",
};

/**
 * What an attribute is worth. FIVE members, and the fifth is the whole point.
 *
 * `not_asked` is A VALUE, NOT AN ABSENCE. See claim (d) above: the archive marks
 * *to verify* per attribute, so an unanswered question is a fact the data holds
 * rather than a gap it leaves, and the column that carries it is `NOT NULL`.
 *
 * ⚠ **The source carries two surface scales that both fold into this one** — a
 * four-step scale on the desk-readable attributes, and a shorter yes / maybe /
 * unasked scale on the ones a phone call closes. The fold is written ONCE, in
 * the seeding script of plan 45-07, and never re-derived at a call site: two
 * places folding independently is two mappings that agree until one is edited.
 */
export const ATTRIBUTE_VALUES = [
  "top",
  "good",
  "limited",
  "no",
  "not_asked",
] as const;

/** What an attribute is worth. Mirrored by the `value` CHECK. */
export type AttributeValue = (typeof ATTRIBUTE_VALUES)[number];

/**
 * The five values, as they are written on a surface.
 *
 * The label for the fifth is a sentence and not a dash on purpose: a dash is
 * what a blank looks like, and the distinction this whole tuple exists to
 * preserve dies at the last pixel if the surface prints one.
 */
export const ATTRIBUTE_VALUE_LABELS: Record<AttributeValue, string> = {
  top: "Top",
  good: "Good",
  limited: "Limited",
  no: "No",
  not_asked: "Not asked yet",
};

/**
 * Where an attribute's value came from, and it has **no default anywhere** — not
 * in this file and not in the column. A value cannot exist without saying which
 * of the two it is.
 *
 * This is where D-45-11's second mitigation now lives. That decision originally
 * put derived-versus-verified on the RECORD; measuring the archive moved it to
 * the INPUT, because suitability is computed and never stored, and a computed
 * figure is only as verified as its weakest input. One field-checked attribute
 * beside nine desk-read ones does not make a figure field-checked.
 *
 * `venue-acquisition.md`, gate *derivato non e' verificato*: a value read off a
 * venue's public profile is a HYPOTHESIS; one checked on site, for that format,
 * is a DATUM. Whoever reads the surface must be able to tell them apart, and
 * whoever writes the row must say which it is.
 */
export const ATTRIBUTE_PROVENANCE = ["derived", "field_verified"] as const;

/** Where a value came from. Mirrored by the `provenance` CHECK. */
export type AttributeProvenance = (typeof ATTRIBUTE_PROVENANCE)[number];

/** Where a value came from, as it is written on a surface. */
export const ATTRIBUTE_PROVENANCE_LABELS: Record<AttributeProvenance, string> = {
  derived: "Derived from the profile",
  field_verified: "Verified on site",
};

/**
 * How the four telephone answers were obtained.
 *
 * *Until 01:00 according to the venue's public page* and *until 01:00 because
 * they said so on the phone* are DIFFERENT FACTS, and the difference decides
 * whether a night can be planned on the answer. A public listing answers the
 * question a wedding reception asks — what time the place closes — and not the
 * one this project asks, which is until what hour a dj may play on a night that
 * ends at six. `venue-acquisition.md` names it as the question that screens out
 * the most candidates precisely because the published answer looks like an
 * answer and is not one.
 *
 * `not_asked` is first, and it is the default in the column: nobody has been
 * called.
 */
export const ANSWERS_SOURCE = [
  "not_asked",
  "phone",
  "on_site",
  "public_listing",
] as const;

/** How an answer was obtained. Mirrored by the `answers_source` CHECK. */
export type AnswersSource = (typeof ANSWERS_SOURCE)[number];

/** How an answer was obtained, as it is written on a surface. */
export const ANSWERS_SOURCE_LABELS: Record<AnswersSource, string> = {
  not_asked: "Nobody has asked",
  phone: "Asked by phone",
  on_site: "Checked on site",
  public_listing: "Read off a public listing",
};

/**
 * Whether the space will even DISCUSS hours beyond the ones it keeps.
 *
 * ⚠ **NO CRAWL, NO INFERENCE AND NO DEFAULT MAY EVER MOVE THIS OFF
 * `not_asked`.** This is the strongest prohibition in the file and it is narrow
 * on purpose: the column is ABSENT FROM THE SOURCE BY NATURE, because it is not
 * published anywhere — it is not a fact about the venue, it is the answer to a
 * phone call that has not happened.
 *
 * A value derived here is *derivato non e' verificato* committed in the one
 * column built to prevent it, and it would arrive with the authority of a
 * database column on the single question that screens out the most candidates.
 * The failure mode is concrete: a space marked *will discuss* by a scraper, a
 * date planned on it, and the conversation happening for the first time in the
 * week of the night.
 *
 * The neighbouring column, the hours the venue actually keeps, IS a published
 * fact and may be researched. This one may not. The two are deliberately not
 * one column for exactly that reason.
 */
export const EXTENDED_HOURS_STANCE = [
  "not_asked",
  "will_discuss",
  "will_not_discuss",
] as const;

/** Whether they will discuss late hours. Mirrored by its own CHECK. */
export type ExtendedHoursStance = (typeof EXTENDED_HOURS_STANCE)[number];

/** The stance, as it is written on a surface. */
export const EXTENDED_HOURS_STANCE_LABELS: Record<ExtendedHoursStance, string> = {
  not_asked: "Nobody has asked",
  will_discuss: "Will discuss",
  will_not_discuss: "Will not discuss",
};

/**
 * How big the space is, as a BAND — which is all the archive knows.
 *
 * Four members, and the fourth is the unasked marker again, for the same reason
 * and in the same shape as everywhere else in this file.
 *
 * ⚠ **A band is not a capacity, and one must never be inferred from the other.**
 * The target for a night is 150 to 300 people; a band cannot answer whether a
 * given space is inside it, and a surface that turned `medium` into a number
 * would be inventing the answer to the second of the four questions —
 * *how many people actually fit* — which is a question only somebody standing
 * in the room can close. The numeric column beside this one exists for that
 * answer, and it is null wherever the answer has not been obtained.
 */
export const SIZE_BANDS = ["small", "medium", "large", "not_asked"] as const;

/** The capacity band. Mirrored by the `size_band` CHECK. */
export type SizeBand = (typeof SIZE_BANDS)[number];

/** The capacity band, as it is written on a surface. */
export const SIZE_BAND_LABELS: Record<SizeBand, string> = {
  small: "Small",
  medium: "Medium",
  large: "Large",
  not_asked: "Not asked yet",
};

/**
 * What kind of place it is. Eleven, measured in the archive, in full.
 *
 * The category is descriptive and carries no judgement: a space that is
 * technically perfect for one format can be out of identity for another, and
 * `venue-acquisition.md` is explicit that suitability is read PER FORMAT and
 * never as an absolute verdict on the place. Nothing in this tuple ranks
 * anything.
 */
export const SPACE_CATEGORIES = [
  "club",
  "live_club",
  "cocktail_bar",
  "brewery",
  "restaurant",
  "wine_bar",
  "institution",
  "gallery",
  "project_space",
  "hybrid",
  "historic_house",
] as const;

/** What kind of place it is. Mirrored by the `category` CHECK. */
export type SpaceCategory = (typeof SPACE_CATEGORIES)[number];

/** The eleven categories, as they are written on a surface. */
export const SPACE_CATEGORY_LABELS: Record<SpaceCategory, string> = {
  club: "Club",
  live_club: "Live club",
  cocktail_bar: "Cocktail bar",
  brewery: "Brewery",
  restaurant: "Restaurant",
  wine_bar: "Wine bar",
  institution: "Institution",
  gallery: "Gallery",
  project_space: "Project space",
  hybrid: "Hybrid",
  historic_house: "Historic house",
};
