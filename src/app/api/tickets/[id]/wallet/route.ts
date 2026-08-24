import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateTicketToken } from "@/utils/qr";
import {
  generateAppleWalletPass,
  isAppleWalletConfigured,
} from "@/lib/apple-wallet";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: ticketId } = await params;

  if (!isAppleWalletConfigured()) {
    return NextResponse.json(
      { error: "Apple Wallet is not configured" },
      { status: 503 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Fetch ticket with joins
  // La select NON chiede alcuna colonna del luogo, e l'assenza e' la decisione:
  // il pass non porta mai l'indirizzo (proprietario, 2026-08-24), quindi qui non
  // si legge cio' che non si serializza. Un campo che nessuno usa ma che la
  // query continua a chiedere e' un invito a rimetterlo sul pass — che e' un
  // file che il prodotto non puo' piu' raggiungere. Vedi il docblock di
  // `src/lib/apple-wallet.ts` e il controllo F di
  // `scripts/verify-venue-surfaces.mjs`, che misura questa lista di colonne.
  const { data: ticket } = await supabase
    .from("tickets")
    .select(
      "id, party_id, event_id, ticket_tiers(name), events(title, date, slug), event_parties(title, date, time, end_time)"
    )
    .eq("id", ticketId)
    .eq("user_id", user.id)
    .single();

  if (!ticket) {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  }

  const event = ticket.events as unknown as {
    title: string;
    date: string;
    slug: string;
  };
  const tier = ticket.ticket_tiers as unknown as { name: string };
  const party = ticket.event_parties as unknown as {
    title: string;
    date: string;
    time: string;
    end_time: string | null;
  } | null;

  const qrValue = generateTicketToken(ticket.id);

  try {
    const passBuffer = await generateAppleWalletPass({
      ticketId: ticket.id,
      eventTitle: event.title,
      tierName: tier.name,
      partyTitle: party?.title ?? (ticket.party_id ? null : "Event Pass"),
      date: party?.date ?? event.date,
      time: party?.time ?? "",
      endTime: party?.end_time ?? null,
      qrValue,
      eventSlug: event.slug,
    });

    return new NextResponse(new Uint8Array(passBuffer), {
      headers: {
        "Content-Type": "application/vnd.apple.pkpass",
        "Content-Disposition": `attachment; filename="resonate-${ticketId}.pkpass"`,
      },
    });
  } catch (error) {
    console.error("Failed to generate Apple Wallet pass:", error);
    return NextResponse.json(
      { error: "Failed to generate pass" },
      { status: 500 }
    );
  }
}
