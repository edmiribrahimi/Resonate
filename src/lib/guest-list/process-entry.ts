import { getServiceClient } from "@/lib/supabase/service";
import { buildPasswordSetLink } from "@/lib/auth/password-set-link";
import { sendEmail } from "@/lib/email";
import { render } from "@react-email/render";
import { GuestInvitationEmail } from "@/emails/guest-invitation";
import { generateTicketToken } from "@/utils/qr";
import { formatTime, formatEventDate } from "@/utils/formatTime";
import QRCode from "qrcode";

interface ProcessResult {
  status: "ticket_issued" | "already_has_ticket" | "name_only" | "failed";
  profile_id?: string;
  ticket_id?: string;
  error?: string;
}

interface GuestEntryInput {
  id: string;
  event_id: string;
  party_id: string | null;
  first_name: string;
  last_name: string;
  email: string | null;
}

interface EventDetails {
  title: string;
  date: string;
  time: string;
  partyTitle?: string;
}

/**
 * Create a free ticket for a guest list entry, checking for duplicates first.
 */
async function createFreeTicket(
  eventId: string,
  partyId: string | null,
  userId: string
): Promise<{ ticketId: string; alreadyExisted: boolean }> {
  const serviceClient = getServiceClient();

  // Check for existing ticket at same event (any party)
  const existingQuery = serviceClient
    .from("tickets")
    .select("id")
    .eq("event_id", eventId)
    .eq("user_id", userId);

  if (partyId) {
    existingQuery.eq("party_id", partyId);
  } else {
    existingQuery.is("party_id", null);
  }

  const { data: existing } = await existingQuery.maybeSingle();
  if (existing) {
    return { ticketId: existing.id, alreadyExisted: true };
  }

  // Insert free ticket directly (bypass SumUp)
  const { data: ticket, error } = await serviceClient
    .from("tickets")
    .insert({
      event_id: eventId,
      party_id: partyId,
      tier_id: null,
      user_id: userId,
      sumup_checkout_id: null,
      sumup_transaction_code: null,
      amount_paid: 0,
      ticket_type: "guest_list",
    })
    .select("id")
    .single();

  if (error) throw new Error(`Failed to create free ticket: ${error.message}`);
  return { ticketId: ticket.id, alreadyExisted: false };
}

/**
 * Send a guest invitation email with QR code and password-set link.
 */
async function sendGuestInvitation(
  entry: GuestEntryInput,
  ticketId: string,
  claimUrl: string,
  eventDetails: EventDetails
) {
  // Generate QR code buffer with HMAC-signed ticket token
  const token = generateTicketToken(ticketId);
  const qrBuffer = await QRCode.toBuffer(token, {
    width: 280,
    margin: 2,
    errorCorrectionLevel: "H",
  });

  // Render email HTML
  const html = await render(
    GuestInvitationEmail({
      guestName: entry.first_name,
      eventTitle: eventDetails.title,
      eventDate: formatEventDate(eventDetails.date),
      eventTime: eventDetails.time ? formatTime(eventDetails.time) : "",
      partyTitle: eventDetails.partyTitle,
      claimUrl,
    })
  );

  // Send email with inline QR code attachment (same pattern as ticket-confirmation webhook)
  //
  // ── Perche' questo invio porta `ticketId` e non solo la categoria ───────────
  //
  // E' uno dei DUE messaggi il cui mancato recapito si paga alla porta: porta un
  // QR, e chi lo riceve non ha comprato niente, quindi non ha nemmeno il
  // riscontro di un pagamento a dirgli che qualcosa doveva arrivare. Agganciarlo
  // al biglietto e' cio' che permette alla superficie admin dei venduti di
  // mostrare, riga per riga, se l'invito e' arrivato.
  //
  // `userId` NON viene passato, e non e' una dimenticanza: questa funzione riceve
  // la voce della guest list, non l'identificativo dell'account, che a questo
  // punto del percorso puo' anche essere appena stato creato dal ramo accanto. Il
  // biglietto lo porta con se' e la risalita, quando serve, passa di li'.
  await sendEmail({
    to: entry.email!,
    subject: `You're invited to ${eventDetails.title}`,
    html,
    category: "guest_invitation",
    ticketId,
    attachments: [
      {
        content: qrBuffer.toString("base64"),
        filename: "ticket-qr.png",
        content_type: "image/png",
      },
    ],
  });
}

/**
 * Core processing pipeline for a single guest list entry.
 *
 * Handles 3 paths:
 * 1. No email -> name_only (door check-in only)
 * 2. Existing user -> approve if pending, check duplicate ticket, create free ticket, send email
 * 3. New user -> create account, generate password-set link, create free ticket, send email
 */
export async function processGuestEntry(
  entry: GuestEntryInput,
  eventDetails: EventDetails
): Promise<ProcessResult> {
  const serviceClient = getServiceClient();

  try {
    // Path 1: No email -> name-only, door check-in only
    if (!entry.email) {
      return { status: "name_only" };
    }

    const emailLower = entry.email.toLowerCase();

    // Check if email exists in profiles (case-insensitive)
    const { data: existingProfile } = await serviceClient
      .from("profiles")
      .select("id, status, email")
      .ilike("email", emailLower)
      .maybeSingle();

    if (existingProfile) {
      // Path 2: Existing user found

      // Auto-approve if pending
      if (existingProfile.status === "pending") {
        await serviceClient
          .from("profiles")
          .update({ status: "approved", approved_via: "guest_list" })
          .eq("id", existingProfile.id);
      }

      // Create free ticket (checks for duplicates)
      const { ticketId, alreadyExisted } = await createFreeTicket(
        entry.event_id,
        entry.party_id,
        existingProfile.id
      );

      if (alreadyExisted) {
        // User already has a ticket for this event
        await serviceClient
          .from("guest_list_entries")
          .update({
            status: "already_has_ticket",
            profile_id: existingProfile.id,
            ticket_id: ticketId,
            updated_at: new Date().toISOString(),
          })
          .eq("id", entry.id);

        return {
          status: "already_has_ticket",
          profile_id: existingProfile.id,
          ticket_id: ticketId,
        };
      }

      // Update guest entry with ticket info
      await serviceClient
        .from("guest_list_entries")
        .update({
          status: "ticket_issued",
          profile_id: existingProfile.id,
          ticket_id: ticketId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", entry.id);

      // Send invitation email (fire-and-forget for existing users, no password link needed)
      const ticketUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://resonate.app"}/tickets/${ticketId}`;
      sendGuestInvitation(entry, ticketId, ticketUrl, eventDetails).catch(
        (err) =>
          console.error(
            "Guest invitation email failed (non-blocking):",
            err
          )
      );

      return {
        status: "ticket_issued",
        profile_id: existingProfile.id,
        ticket_id: ticketId,
      };
    }

    // Path 3: New user -- create account via admin API
    const { data: authUser, error: authError } =
      await serviceClient.auth.admin.createUser({
        email: emailLower,
        email_confirm: true,
        user_metadata: {
          full_name: `${entry.first_name} ${entry.last_name}`,
          guest_list_event_id: entry.event_id,
        },
      });

    if (authError) {
      throw new Error(`Failed to create user: ${authError.message}`);
    }

    // ── Il link con cui l'ospite sceglie la password ────────────────────────
    //
    // Qui c'era `generateLink` **senza `redirectTo`**, e il suo `action_link`
    // veniva mandato cosi' com'e'. Portava lo stesso difetto misurato sul
    // percorso dei membri il 2026-08-19 — sessione nel frammento, callback che
    // non trova `?code`, token bruciato — e in piu' senza destinazione: il
    // rimbalzo finiva sulla Site URL del progetto, cioe' dove capita.
    //
    // Una definizione sola, condivisa con `createAccount`.
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "").trim();
    let claimUrl = appUrl ? `${appUrl.replace(/\/+$/, "")}/login` : "";

    if (!appUrl) {
      // Il ripiego che stava qui inventava un dominio (`https://resonate.app`)
      // che non e' questo prodotto: un invito con dentro l'indirizzo sbagliato
      // e' peggio di un invito senza link.
      console.error(
        "[guest_list.app_url_missing] NEXT_PUBLIC_APP_URL assente: l'invito " +
          "parte senza link per impostare la password"
      );
    } else {
      const link = await buildPasswordSetLink(
        serviceClient.auth.admin,
        emailLower,
        appUrl
      );
      if (link.ok) {
        claimUrl = link.url;
      } else {
        // Si prosegue con `/login`: l'ospite ha comunque il biglietto, e da li'
        // puo' usare Reset Password. Ma il fallimento ha la sua categoria e non
        // sparisce, perche' questo repository non ha error tracking.
        console.error(
          `[guest_list.invitation_link_failed] reason=${link.reason} detail=${link.detail}`
        );
      }
    }

    // Wait briefly for the handle_new_user trigger to create the profile
    // The trigger fires on auth.users INSERT and creates the profile row
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Create free ticket for the new user
    const { ticketId } = await createFreeTicket(
      entry.event_id,
      entry.party_id,
      authUser.user.id
    );

    // Update guest entry
    await serviceClient
      .from("guest_list_entries")
      .update({
        status: "ticket_issued",
        profile_id: authUser.user.id,
        ticket_id: ticketId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", entry.id);

    // Send invitation email with QR + password-set link
    sendGuestInvitation(entry, ticketId, claimUrl, eventDetails).catch(
      (err) =>
        console.error(
          "Guest invitation email failed (non-blocking):",
          err
        )
    );

    return {
      status: "ticket_issued",
      profile_id: authUser.user.id,
      ticket_id: ticketId,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    // Update guest entry as failed
    await serviceClient
      .from("guest_list_entries")
      .update({
        status: "failed",
        error_message: errorMessage,
        updated_at: new Date().toISOString(),
      })
      .eq("id", entry.id);

    return { status: "failed", error: errorMessage };
  }
}
