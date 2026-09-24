/**
 * The one sentence under the tier description box, written once and mounted
 * by both forms — the create form and the in-place edit — so the two cannot
 * drift into saying different things about the same field.
 *
 * It is the field's only guard. The description is public copy: the event page
 * prints it to anyone, before purchase, and the order email carries it out of
 * the product. No predicate can see whether a free sentence describes a place,
 * so the rule lives where the sentence is typed. See `venue-secrecy.md`.
 */
export const TIER_DESCRIPTION_HINT =
  "Shown on the event page, on the ticket and in the order email. " +
  "Say what the tier includes — never where the night is.";
