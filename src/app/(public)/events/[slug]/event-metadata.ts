import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { formatTime } from "@/utils/formatTime";

/*
 * The link preview of a night — what WhatsApp, Telegram, Facebook and an
 * Instagram DM show when somebody pastes `/events/<slug>` into a group.
 *
 * Until 2026-09-28 every page of the site carried the root layout's tags
 * (`re:sonate` · `motion music hub` · the logo), so a night's link previewed
 * with no date, no time and no price — and the campaign plan for 003 had to
 * tell everyone to attach the poster by hand. This module builds the preview
 * from the night itself.
 *
 * ── VENUE SECRECY: THIS MODULE NEVER NAMES A PLACE ──────────────────────────
 *
 * A preview is a PUBLIC surface in the widest sense: it is rendered by a third
 * party's crawler, cached by them, and shown to whoever sees the message —
 * nobody is signed in, and nothing can be recalled once a group has fetched
 * it. So the rule of `venue-secrecy.md` is applied in its mechanical form: the
 * selects below carry **no column that describes a place**. Not `venue_text`,
 * not `venue_id`, not the hint. A secret night says «Secret venue»; a public
 * night says nothing about where — the page itself already does, for whoever
 * opens it. The city is not written either, because not every night is in
 * Torino.
 *
 * Default closed (gate *default chiuso*): a night whose `venue_secret` is not
 * an explicit `false` is treated as secret.
 *
 * ── WHAT IS SHOWN, AND FROM WHERE ────────────────────────────────────────────
 *
 *   title        `<event title> — Saturday 10 Oct`   (British form, no year,
 *                `brand-visual-system.md`, gate *lingua dei materiali*)
 *   description  `Saturday 10 Oct · 22:00 → 06:00 · Secret venue · from 5 €`
 *   image        the night's cover, or the site's default OG image
 *
 * The date and the hours come from the first party by `sort_order`, which is
 * what the page shows first; the price is the lowest tier of the paid parties,
 * which is what the page shows as the first row. Drafts get no metadata of
 * their own: an unpublished night falls back to the root tags, exactly as it
 * 404s for an anonymous reader.
 *
 * ── FAILURE IS NOT SILENT, AND IT IS NOT FATAL ──────────────────────────────
 *
 * A refused read is logged with its own category and the preview falls back to
 * the root tags: a link that previews as `re:sonate` is poorer, not false, and
 * a metadata failure must never turn a working page into a 500. This is the
 * same split the page makes for its parties read.
 */

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "Saturday 10 Oct" — the form every visual of the brand uses. */
function formatDayLabel(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return `${WEEKDAYS[d.getDay()]} ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
}

/** "5" or "12.50" — the way the tier list prints a price, without the sign. */
function formatPrice(price: number): string {
  return Number.isInteger(price) ? String(price) : price.toFixed(2);
}

const DEFAULT_OG_IMAGE = { url: "/images/og-image.png", width: 1200, height: 630 };

/**
 * The cover, through Next's own image optimizer instead of the storage URL.
 *
 * Measured 2026-09-28 on the 10/10 night: the stored cover is a 944 KB JPEG,
 * and WhatsApp drops preview images above a few hundred KB — the link would
 * preview with the text and no picture, on the one channel the free plan runs
 * on. The optimizer serves the same file resized to 1200 px as a ~42 KB JPEG
 * to a crawler that sends no `Accept` header. `q=75` is the only quality Next
 * 16 accepts by default (`images.qualities`); any other value is a 400, which
 * is how the wrong number was found.
 *
 * The URL is relative on purpose: `metadataBase` in the root layout makes it
 * absolute on the production host, which is the host every preview is fetched
 * from.
 */
function optimizedCoverUrl(cover: string): string {
  return `/_next/image?url=${encodeURIComponent(cover)}&w=1200&q=75`;
}

export async function buildEventMetadata(slug: string): Promise<Metadata> {
  const supabase = await createClient();

  const { data: event, error: eventError } = await supabase
    .from("events")
    // No column of place. `venue_secret` on `events` is not read here either:
    // the night-level flag on each party is the one the page decides with.
    .select("id, title, date, cover_image, is_published")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();

  if (eventError) {
    console.error(
      `[event_metadata.event_query_refused] ${eventError.code || "transport"}: ${eventError.message}`
    );
    return {};
  }
  if (!event) {
    return {};
  }

  const { data: parties, error: partiesError } = await supabase
    .from("event_parties")
    // No column of place — `venue_text`, `venue_id` and the hint stay out, by
    // construction and not by predicate.
    .select("id, date, time, end_time, venue_secret, access_type, sort_order")
    .eq("event_id", event.id)
    .order("sort_order", { ascending: true });

  if (partiesError) {
    console.error(
      `[event_metadata.parties_query_refused] ${partiesError.code || "transport"}: ${partiesError.message}`
    );
  }

  const nights = (parties ?? []) as Array<{
    id: string;
    date: string;
    time: string | null;
    end_time: string | null;
    venue_secret: boolean | null;
    access_type: string;
    sort_order: number;
  }>;
  const first = nights[0] ?? null;

  let minPrice: number | null = null;
  const paidIds = nights.filter((n) => n.access_type === "paid").map((n) => n.id);
  if (paidIds.length > 0) {
    const { data: tiers, error: tiersError } = await supabase
      .from("ticket_tiers")
      .select("price")
      .in("party_id", paidIds);
    if (tiersError) {
      console.error(
        `[event_metadata.tiers_query_refused] ${tiersError.code || "transport"}: ${tiersError.message}`
      );
    } else {
      for (const t of (tiers ?? []) as Array<{ price: number | null }>) {
        if (typeof t.price === "number" && (minPrice === null || t.price < minPrice)) {
          minPrice = t.price;
        }
      }
    }
  }

  const day = formatDayLabel(first?.date ?? event.date);
  const parts: string[] = [day];
  if (first?.time) {
    parts.push(
      first.end_time
        ? `${formatTime(first.time)} → ${formatTime(first.end_time)}`
        : formatTime(first.time)
    );
  }
  // Default closed: with no nights read, or any night not explicitly public,
  // the preview says «Secret venue». It never says where.
  const anySecret = nights.length === 0 || nights.some((n) => n.venue_secret !== false);
  if (anySecret) {
    parts.push("Secret venue");
  }
  // A paid night whose cheapest tier is 0 € (a free tier, a guest tier) is not
  // «from 0 €»: that reads like a defect on a preview nobody can correct later.
  if (minPrice !== null) {
    parts.push(minPrice > 0 ? `from ${formatPrice(minPrice)} €` : "free entry");
  }

  const title = `${event.title} — ${day}`;
  const description = parts.join(" · ");
  const image = event.cover_image
    ? { url: optimizedCoverUrl(event.cover_image) }
    : DEFAULT_OG_IMAGE;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image.url],
    },
  };
}
