import QRCode from "qrcode";
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

export async function generateMembershipQR(membershipCode: string): Promise<string> {
  const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/membership/verify?code=${membershipCode}`;
  return QRCode.toDataURL(verifyUrl, {
    width: 300,
    margin: 2,
    color: {
      dark: "#000000",
      light: "#ffffff",
    },
  });
}

/**
 * `generateMembershipCode()` used to live here, and it is gone on purpose —
 * so this note is a tombstone, not a leftover.
 *
 * It minted `RSN-` plus 8 characters with `Math.random()`, and it had **zero
 * importers**: dead code that nevertheless read as the place where the door
 * credential was born. `BUY-05` was written against it on that misreading.
 *
 * **The code is minted in the database, and nowhere else.** The single
 * generator is `public.handle_new_user`, which since migration
 * `20260905130000_membership_code_crypto.sql` uses
 * `extensions.gen_random_bytes` — a CSPRNG — over the same 32-character
 * alphabet, 10 characters long: 2^50, and the ten is the maximum
 * `BARE_MEMBERSHIP_PATTERN` accepts at the door (ScannerClient.tsx:71).
 *
 * If you are here to add a JavaScript generator back: don't. A second
 * generator is a second entropy story, and only one of the two would be the
 * one the door actually sees.
 */
