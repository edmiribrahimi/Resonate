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

export function generateMembershipCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "RSN-";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
