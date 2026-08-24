import { PKPass } from "passkit-generator";
import path from "path";
import fs from "fs";
import { partyStartInstant } from "@/utils/datetime";

/**
 * Il pass Apple Wallet — cosa porta, e la cosa che non porta mai.
 *
 * ── PERCHE' QUESTO FILE HA UN DOCBLOCK ──────────────────────────────────────
 *
 * Un pass **esce dal prodotto**. E' firmato, scaricato, aggiunto a un
 * dispositivo, e da li' si sincronizza sugli altri dispositivi della stessa
 * persona. **Non esiste un percorso di revoca**: nessun cron, nessuna migration
 * e nessuna riga scritta dopo puo' disfare un campo gia' scritto su un file che
 * sta su un telefono. E' la stessa classe di irreversibilita' di una mail
 * partita — `41.2-08-FINDINGS.md` §1.1 — con una coda piu' lunga, perche' il
 * pass resta sul dispositivo invece che in una casella.
 *
 * Percio' il pass porta **solo cio' che serve a entrare**: il codice, la data,
 * l'orario, il nome della serata e il tier.
 *
 * ── LA REGOLA, E IL SUO «MAI» ───────────────────────────────────────────────
 *
 * Decisione del proprietario, 2026-08-24: *«il pass non porta mai
 * l'indirizzo»*. **Mai** — non «dopo la rivelazione» — e la ragione sta nel
 * paragrafo qui sopra: un pass **non si aggiorna a ritroso**, quindi un pass
 * emesso oggi ignorera' per sempre qualunque decisione presa domani. Un termine
 * di segretezza qui sarebbe una guardia che protegge il momento
 * dell'emissione e nient'altro.
 *
 * E' la **quarta superficie**, dopo le tre di
 * `.planning/todos/pending/secret-venue-three-surfaces.md` (pagina pubblica,
 * mail, pagina del biglietto) — stesso titolare, altro medium — e la sola che
 * il prodotto non puo' piu' raggiungere.
 *
 * ── TRE STRADE, NON UNA. E DUE NON SONO TESTO ───────────────────────────────
 *
 * Il formato del pass puo' portare il luogo in tre forme, e un controllo che
 * guardasse solo i campi stampati ne intercetterebbe una:
 *
 *   1. un **campo di testo** fra quelli che si vedono sul pass;
 *   2. `locations[]` — la **rilevanza per posizione**: latitudine e longitudine
 *      che accendono il pass sulla schermata di blocco quando ci si avvicina.
 *      Un indirizzo per un'altra strada, e non una parola in vista;
 *   3. `semantics` — il **dizionario che legge il sistema operativo**, che ha
 *      voci dedicate al posto (`venueName`, `venueLocation`, `venueRoom`, e
 *      altre dodici).
 *
 * **Misurato il 2026-08-24: questo pass non usa nessuna delle tre.** L'unica
 * rilevanza dichiarata e' **temporale** — `setRelevantDate`, un istante, non un
 * posto — e resta, perche' una data non e' una coordinata.
 *
 * `scripts/verify-venue-surfaces.mjs`, **controllo F**, misura che resti cosi':
 * una spazzata negativa sul codice vivo di questo file e della rotta che lo
 * chiama, piu' due elenchi **positivi** — i campi stampati e i metodi chiamati
 * sul pass — perche' un elenco positivo red-a anche il campo che nessuno aveva
 * previsto di vietare.
 */

interface TicketPassData {
  ticketId: string;
  eventTitle: string;
  tierName: string;
  partyTitle: string | null;
  date: string;
  time: string;
  endTime: string | null;
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

  // Auxiliary: tier only — see the docblock at the top of this file
  pass.auxiliaryFields.push({
    key: "tier",
    label: "TIER",
    value: data.partyTitle
      ? `${data.partyTitle} - ${data.tierName}`
      : data.tierName,
  });

  // Relevant date for lock screen
  pass.setRelevantDate(partyStartInstant(data.date, data.time || "00:00"));

  const buffer = pass.getAsBuffer();
  return Buffer.from(buffer);
}
