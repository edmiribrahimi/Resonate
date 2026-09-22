import crypto from "crypto";

export function generateTicketToken(ticketId: string): string {
  const sig = crypto
    .createHmac("sha256", process.env.TICKET_SIGNING_SECRET!)
    .update(ticketId)
    .digest("hex");
  return `${ticketId}.${sig}`;
}

export function verifyTicketToken(token: string): string | null {
  const dot = token.lastIndexOf(".");
  if (dot === -1) return null;
  const id = token.substring(0, dot);
  const sig = token.substring(dot + 1);
  const expected = crypto
    .createHmac("sha256", process.env.TICKET_SIGNING_SECRET!)
    .update(id)
    .digest("hex");
  try {
    return crypto.timingSafeEqual(
      Buffer.from(sig, "hex"),
      Buffer.from(expected, "hex")
    )
      ? id
      : null;
  } catch {
    return null;
  }
}

/**
 * Two membership functions used to live here, and both are gone on purpose —
 * so this note is a tombstone, not a leftover.
 *
 * **The membership-QR helper — removed 2026-09-22, phase 51 (MEM-01).** It
 * built a data-URL QR pointing at `/api/membership/verify?code=…`, and its
 * only importer was the card's view component, which went out with the card's
 * page and route in the same commit. The surface that rendered a member code
 * on screen no longer exists.
 *
 * It is described here rather than named: `src/` is meant to hold **zero**
 * occurrences of that identifier, so that grepping for it answers "nothing
 * uses this" instead of finding this paragraph. The name is one `git log -S`
 * away for anyone who needs it.
 *
 * **`generateMembershipCode()` — removed 2026-09-05.** It minted `RSN-` plus
 * 8 characters with `Math.random()`, and it had **zero importers**: dead code
 * that nevertheless read as the place where the door credential was born.
 * `BUY-05` was written against it on that misreading.
 *
 * **Where the code is minted today, and for how much longer.** The single
 * generator is the database trigger `public.handle_new_user`, which since
 * migration `20260905130000_membership_code_crypto.sql` uses
 * `extensions.gen_random_bytes` — a CSPRNG — over a 32-character alphabet,
 * 10 characters long: 2^50. **That minting is itself on its way out** (D-51-02:
 * `profiles.membership_code`, its trigger and its type go with plan 51-12), so
 * this paragraph describes a rule that is being withdrawn, not one to build on.
 *
 * If you are here to add a JavaScript generator back: don't. A second
 * generator is a second entropy story, and only one of the two would be the
 * one the door actually sees.
 */
