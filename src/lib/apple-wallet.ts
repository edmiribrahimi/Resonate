import { PKPass } from "passkit-generator";
import path from "path";
import fs from "fs";

interface TicketPassData {
  ticketId: string;
  eventTitle: string;
  tierName: string;
  partyTitle: string | null;
  date: string;
  time: string;
  endTime: string | null;
  venue: string | null;
  qrValue: string;
  eventSlug: string;
}

const PASS_TYPE_ID = process.env.APPLE_PASS_TYPE_ID;
const TEAM_ID = process.env.APPLE_TEAM_ID;

export function isAppleWalletConfigured(): boolean {
  return !!(
    PASS_TYPE_ID &&
    TEAM_ID &&
    process.env.APPLE_PASS_CERT_BASE64 &&
    process.env.APPLE_PASS_KEY_BASE64
  );
}

export async function generateAppleWalletPass(
  data: TicketPassData
): Promise<Buffer> {
  if (!isAppleWalletConfigured()) {
    throw new Error("Apple Wallet is not configured");
  }

  const signerCert = Buffer.from(
    process.env.APPLE_PASS_CERT_BASE64!,
    "base64"
  ).toString("utf-8");
  const signerKey = Buffer.from(
    process.env.APPLE_PASS_KEY_BASE64!,
    "base64"
  ).toString("utf-8");
  const signerKeyPassphrase = process.env.APPLE_PASS_KEY_PASSPHRASE || "";

  // Load WWDR certificate (Apple Worldwide Developer Relations)
  let wwdr: string;
  if (process.env.APPLE_WWDR_CERT_BASE64) {
    wwdr = Buffer.from(
      process.env.APPLE_WWDR_CERT_BASE64,
      "base64"
    ).toString("utf-8");
  } else {
    // Try to load from file
    const wwdrPath = path.join(process.cwd(), "certs", "wwdr.pem");
    wwdr = fs.readFileSync(wwdrPath, "utf-8");
  }

  // Load icon from public directory
  const iconPath = path.join(process.cwd(), "public", "images", "logo-white.png");
  const iconBuffer = fs.readFileSync(iconPath);

  const pass = new PKPass(
    {
      "icon.png": iconBuffer,
      "icon@2x.png": iconBuffer,
      "logo.png": iconBuffer,
      "logo@2x.png": iconBuffer,
    },
    {
      wwdr,
      signerCert,
      signerKey,
      signerKeyPassphrase,
    },
    {
      formatVersion: 1,
      passTypeIdentifier: PASS_TYPE_ID!,
      teamIdentifier: TEAM_ID!,
      organizationName: "Resonate",
      description: `Ticket for ${data.eventTitle}`,
      serialNumber: data.ticketId,
      foregroundColor: "rgb(237, 237, 237)",
      backgroundColor: "rgb(10, 10, 10)",
      labelColor: "rgb(161, 161, 170)",
      logoText: "Resonate",
    }
  );

  pass.type = "eventTicket";

  pass.setBarcodes({
    format: "PKBarcodeFormatQR",
    message: data.qrValue,
    messageEncoding: "iso-8859-1",
  });

  // Primary: event name
  pass.primaryFields.push({
    key: "event",
    label: "EVENT",
    value: data.eventTitle,
  });

  // Secondary: date + time
  const formattedDate = (() => {
    const d = new Date(data.date + "T00:00:00");
    const WD = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
    const M = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return `${WD[d.getDay()]} ${d.getDate()} ${M[d.getMonth()]}`;
  })();
  pass.secondaryFields.push({
    key: "date",
    label: "DATE",
    value: formattedDate,
  });

  if (data.time) {
    const [h, m] = data.time.split(":");
    const timeStr = `${h}:${m}`;
    pass.secondaryFields.push({
      key: "time",
      label: "TIME",
      value: data.endTime
        ? `${timeStr} - ${data.endTime}`
        : timeStr,
    });
  }

  // Auxiliary: tier + venue
  pass.auxiliaryFields.push({
    key: "tier",
    label: "TIER",
    value: data.partyTitle
      ? `${data.partyTitle} - ${data.tierName}`
      : data.tierName,
  });

  if (data.venue) {
    pass.auxiliaryFields.push({
      key: "venue",
      label: "VENUE",
      value: data.venue,
    });
  }

  // Relevant date for lock screen
  pass.setRelevantDate(new Date(`${data.date}T${data.time || "00:00"}`));

  const buffer = pass.getAsBuffer();
  return Buffer.from(buffer);
}
