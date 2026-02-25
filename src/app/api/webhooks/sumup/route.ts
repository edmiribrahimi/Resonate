import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getCheckout } from "@/lib/sumup";
import { sendEmail } from "@/lib/email";
import { TicketConfirmationEmail } from "@/emails/ticket-confirmation";
import { render } from "@react-email/render";
import QRCode from "qrcode";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

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
    const { data: purchase, error: purchaseError } = await supabase
      .from("pending_purchases")
      .select("*")
      .eq("sumup_checkout_id", checkout.id)
      .single();

    if (purchaseError || !purchase) {
      console.error(
        "Webhook: pending purchase not found for checkout",
        checkout.id
      );
      return NextResponse.json({ received: true });
    }

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
        .select("title, date, time, slug")
        .eq("id", purchase.event_id)
        .single();

      // Fetch tier name
      const { data: tier } = await supabase
        .from("ticket_tiers")
        .select("name")
        .eq("id", purchase.tier_id)
        .single();

      if (profile && event && tier) {
        const ticketUrl = `${process.env.NEXT_PUBLIC_APP_URL}/tickets/${ticketId}`;

        // Generate QR code buffer
        const qrBuffer = await QRCode.toBuffer(ticketId, {
          width: 280,
          margin: 2,
          errorCorrectionLevel: "H",
        });

        // Format date for email
        const formattedDate = new Date(
          event.date + "T00:00:00"
        ).toLocaleDateString("en-US", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        });

        // Render email HTML
        const html = await render(
          TicketConfirmationEmail({
            memberName: profile.full_name || "Member",
            eventTitle: event.title,
            eventDate: formattedDate,
            eventTime: event.time,
            tierName: tier.name,
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
  } catch (error) {
    console.error("Webhook: unexpected error", error);
    return NextResponse.json({ received: true }, { status: 200 });
  }
}
