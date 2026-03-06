import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/service";
import { getCheckout } from "@/lib/sumup";
import { sendEmail } from "@/lib/email";
import { TicketConfirmationEmail } from "@/emails/ticket-confirmation";
import { MemberApprovedEmail } from "@/emails/member-approved";
import { render } from "@react-email/render";
import QRCode from "qrcode";
import { formatTime, formatEventDate } from "@/utils/formatTime";
import { generateTicketToken } from "@/utils/qr";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Only process checkout status changes
    if (body.event_type !== "CHECKOUT_STATUS_CHANGED") {
      return NextResponse.json({ received: true });
    }

    // ALWAYS verify via GET checkout API (never trust webhook body for status)
    const checkout = await getCheckout(body.id);

    if (checkout.status !== "PAID") {
      return NextResponse.json({ received: true });
    }

    const supabase = getServiceClient();

    // Look up pending purchase by checkout ID
    const { data: purchase } = await supabase
      .from("pending_purchases")
      .select("*")
      .eq("sumup_checkout_id", checkout.id)
      .single();

    if (purchase) {
      // Idempotency: skip if already completed
      if (purchase.status === "completed") {
        return NextResponse.json({ received: true });
      }

      // Get transaction code from checkout data
      const transactionCode =
        checkout.transactions?.[0]?.transaction_code || null;

      // Atomic ticket reservation via RPC
      const { data: ticketId, error: rpcError } = await supabase.rpc(
        "reserve_ticket",
        {
          p_tier_id: purchase.tier_id,
          p_user_id: purchase.user_id,
          p_event_id: purchase.event_id,
          p_party_id: purchase.party_id,
          p_sumup_checkout_id: checkout.id,
          p_sumup_transaction_code: transactionCode,
          p_amount_paid: checkout.amount,
        }
      );

      if (rpcError) {
        // Update pending purchase as failed
        await supabase
          .from("pending_purchases")
          .update({
            status: "failed",
            error_message: rpcError.message,
          })
          .eq("id", purchase.id);

        console.error("Webhook: reserve_ticket RPC failed", rpcError.message);
        return NextResponse.json({ received: true });
      }

      // Update pending purchase as completed
      await supabase
        .from("pending_purchases")
        .update({
          status: "completed",
          ticket_id: ticketId,
        })
        .eq("id", purchase.id);

      // Auto-approve pending members on successful ticket purchase
      const { data: updatedProfile } = await supabase
        .from("profiles")
        .update({ status: "approved" })
        .eq("id", purchase.user_id)
        .eq("status", "pending")
        .select("email, full_name")
        .single();

      if (updatedProfile) {
        // Fire-and-forget: send approval email
        const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://resonate.app"}/login`;
        render(MemberApprovedEmail({ memberName: updatedProfile.full_name || "Member", loginUrl }))
          .then((html) => sendEmail({ to: updatedProfile.email, subject: "Welcome to Resonate - You're Approved!", html }))
          .catch((err) => console.error("Webhook: approval email failed (non-blocking)", err));
      }

      // Fire-and-forget: send confirmation email with QR code
      try {
        // Fetch user info
        const { data: profile } = await supabase
          .from("profiles")
          .select("email, full_name")
          .eq("id", purchase.user_id)
          .single();

        // Fetch event details
        const { data: event } = await supabase
          .from("events")
          .select("title, date, slug")
          .eq("id", purchase.event_id)
          .single();

        // Fetch party details (may be null for master ticket)
        let party: { title: string; time: string } | null = null;
        if (purchase.party_id) {
          const { data: partyData } = await supabase
            .from("event_parties")
            .select("title, time")
            .eq("id", purchase.party_id)
            .single();
          party = partyData;
        }

        // Fetch tier name
        const { data: tier } = await supabase
          .from("ticket_tiers")
          .select("name")
          .eq("id", purchase.tier_id)
          .single();

        if (profile && event && tier) {
          const ticketUrl = `${process.env.NEXT_PUBLIC_APP_URL}/tickets/${ticketId}`;

          // Generate QR code buffer
          const qrBuffer = await QRCode.toBuffer(generateTicketToken(ticketId), {
            width: 280,
            margin: 2,
            errorCorrectionLevel: "H",
          });

          // Format date for email
          const formattedDate = formatEventDate(event.date);

          const eventTime = party ? formatTime(party.time) : "";

          // Render email HTML
          const html = await render(
            TicketConfirmationEmail({
              memberName: profile.full_name || "Member",
              eventTitle: event.title,
              eventDate: formattedDate,
              eventTime,
              tierName: tier.name,
              partyTitle: party?.title ?? (purchase.party_id ? undefined : "Event Pass"),
              ticketUrl,
            })
          );

          // Send email with inline QR code attachment
          await sendEmail({
            to: profile.email,
            subject: `Your ticket for ${event.title}`,
            html,
            attachments: [
              {
                content: qrBuffer.toString("base64"),
                filename: "ticket-qr.png",
                content_type: "image/png",
              },
            ],
          });
        }
      } catch (emailError) {
        // Email failure should NOT cause webhook to fail
        console.error("Webhook: email send failed (non-blocking)", emailError);
      }

      return NextResponse.json({ received: true });
    }

    // === Drink order handling ===
    const { data: drinkOrder } = await supabase
      .from("drink_orders")
      .select("*")
      .eq("sumup_checkout_id", checkout.id)
      .single();

    if (drinkOrder) {
      // Idempotency: skip if already completed
      if (drinkOrder.status === "completed") {
        return NextResponse.json({ received: true });
      }

      const transactionCode =
        checkout.transactions?.[0]?.transaction_code || "";

      await supabase.rpc("fulfill_drink_order", {
        p_order_id: drinkOrder.id,
        p_transaction_code: transactionCode,
      });

      // Sign drink tokens with HMAC (same pattern as ticket QR codes)
      const { data: newTokens } = await supabase
        .from("drink_tokens")
        .select("id")
        .eq("order_id", drinkOrder.id);

      if (newTokens) {
        for (const t of newTokens) {
          const signedToken = generateTicketToken(t.id);
          await supabase
            .from("drink_tokens")
            .update({ token: signedToken })
            .eq("id", t.id);
        }
      }

      return NextResponse.json({ received: true });
    }

    console.error(
      "Webhook: no pending purchase or drink order found for checkout",
      checkout.id
    );
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook: unexpected error", error);
    return NextResponse.json({ received: true }, { status: 200 });
  }
}
