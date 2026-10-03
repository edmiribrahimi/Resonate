import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getServiceClient } from "@/lib/supabase/service";
import { getAccessContext } from "@/lib/capabilities/server";
import { mayManageEvent } from "@/lib/capabilities/guards";
import { CAP } from "@/lib/capabilities/keys";
import { musicPageEnabled } from "@/lib/livecuts/enabled";
import LiveCutForm, {
  type AdminLiveCut,
  type AdminNight,
  type CatalogArtist,
} from "@/app/(admin)/admin/events/[id]/livecuts/LiveCutForm";
import { PageShell } from "@/components/ui/PageShell";
import { PageTitle } from "@/components/ui/Typography";
import { Card } from "@/components/ui/Card";
import { FOCUS_RING } from "@/components/ui/Button";

/**
 * LiveCuts of one event — the admin surface of MUS-07 (phase 52.3, plan 10).
 *
 * ── Where it lives ───────────────────────────────────────────────────────────
 *
 * The shape of `assignments/page.tsx`, deliberately: only the route file enters
 * the `(work)` group (R-WORK-ROUTES), so `LiveCutForm` and the server actions
 * stay one level out, at `admin/events/[id]/livecuts/`, and are imported with
 * absolute paths. The address is bound to `organizer.access` in
 * `src/lib/routes/capability-routes.ts`, in the same commit as this file — a
 * route without its row resolves `null` in the middleware and refuses
 * everybody (Pitfall 8), and `npm run verify:routes` censuses it from disk.
 *
 * ── The switch comes first ───────────────────────────────────────────────────
 *
 * With `musicPageEnabled()` off this page is a 404 before any session or query
 * is touched, and `EventList.tsx` hides its link. The server actions refuse
 * with `disabled` on their own: the page hiding is the affordance, the action
 * refusing is the boundary.
 *
 * ── The guard, then the service client ───────────────────────────────────────
 *
 * `organizer.access`, the event, `mayManageEvent` — copied from `assignments`
 * line for line. Everything after is read with the service-role client, which
 * bypasses RLS, so the `mayManageEvent` branch is the only thing scoping those
 * reads to an event the caller may manage. Drafts are read on purpose: this is
 * the one surface where an unpublished LiveCut must be visible.
 *
 * ── `venue_secret` is read here, and nothing else about the place ───────────
 *
 * The form needs to know which of the event's parties has the place guard on,
 * so it can say why a link was refused. That boolean is the only venue fact
 * this page reads: no `venue_id`, no venue text, no hint, no address. The page
 * is outside the H1 perimeter of check H (`verify:venue-surfaces`, which sweeps
 * the files of `/music`) by construction, and inside H5 (forbidden sound
 * words) like every string of the phase.
 *
 * ── The error state is not the empty state ───────────────────────────────────
 *
 * `[]` is a valid answer on every read below. A failed read collapsed into an
 * empty list would show "No LiveCuts for this event" — and an organizer who
 * believes it adds a second LiveCut for a part that already has one. So any
 * failed read logs `[livecuts.lookup_failed] <code>` and renders a `Card
 * role="alert"` with the code, never a list.
 */

interface PageProps {
  params: Promise<{ id: string }>;
}

type Obj = Record<string, unknown>;

function asObj(value: unknown): Obj | null {
  if (Array.isArray(value)) return asObj(value[0]);
  return typeof value === "object" && value !== null ? (value as Obj) : null;
}

function str(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export default async function LiveCutsPage({ params }: PageProps) {
  if (!musicPageEnabled()) notFound();

  const { id: eventId } = await params;

  // Identity from the session, not from an inbound header. Same verdict as the
  // middleware because both read the same row of `capability-routes.ts`; the
  // page asks again because a redirect is not a boundary (`access-gating.md`).
  const ctx = await getAccessContext();
  if (!ctx.capabilities.has(CAP.ORGANIZER_ACCESS)) {
    redirect("/account");
  }

  const supabase = await createClient();
  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id, title, created_by")
    .eq("id", eventId)
    .single();

  if (eventError || !event) {
    redirect("/admin/events");
  }

  if (!mayManageEvent(ctx, event.created_by)) {
    redirect("/admin/events");
  }

  const serviceClient = getServiceClient();

  const { data: partyData, error: partiesError } = await serviceClient
    .from("event_parties")
    .select(
      "id, date, time, end_time, number, venue_secret, party_series!event_parties_series_id_fkey(name), formats(name)"
    )
    .eq("event_id", eventId)
    .order("sort_order", { ascending: true });

  const nights: AdminNight[] = [];
  for (const raw of (partyData ?? []) as unknown[]) {
    const row = asObj(raw);
    const id = str(row?.id);
    const date = str(row?.date);
    if (!row || !id || !date) continue;
    nights.push({
      id,
      date,
      time: str(row.time),
      endTime: str(row.end_time),
      number: num(row.number),
      seriesName: str(asObj(row.party_series)?.name) ?? "",
      formatName: str(asObj(row.formats)?.name) ?? "",
      venueSecret: row.venue_secret === true,
    });
  }

  // `.in()` on an empty array is a query with no possible answer, so it is not
  // asked: an event with no parties has no LiveCuts — an EMPTY state.
  const liveCutsQuery = nights.length
    ? await serviceClient
        .from("livecuts")
        .select(
          "id, party_id, part_number, slot_start, slot_end, soundcloud_url, duration_seconds, cover_url, published_at, livecut_artists(sort_order, artists(id, name, slug))"
        )
        .in(
          "party_id",
          nights.map((n) => n.id)
        )
        .order("part_number", { ascending: true })
    : { data: [], error: null };

  const { data: artistData, error: artistsError } = await serviceClient
    .from("artists")
    .select("id, name")
    .order("name", { ascending: true });

  const lookupFailed = partiesError ?? liveCutsQuery.error ?? artistsError ?? null;

  if (lookupFailed) {
    console.error(
      `[livecuts.lookup_failed] ${lookupFailed.code ?? "unknown"} — could not read ` +
        `the LiveCuts of ${eventId}. This is NOT an empty list.`
    );
  }

  const liveCuts: AdminLiveCut[] = [];
  for (const raw of (liveCutsQuery.data ?? []) as unknown[]) {
    const row = asObj(raw);
    const id = str(row?.id);
    const partyId = str(row?.party_id);
    if (!row || !id || !partyId) continue;
    const pairs = Array.isArray(row.livecut_artists) ? row.livecut_artists : [];
    const artists = pairs
      .map((p) => {
        const pair = asObj(p);
        const artist = asObj(pair?.artists);
        const artistId = str(artist?.id);
        const name = str(artist?.name);
        return artistId && name
          ? { id: artistId, name, sortOrder: num(pair?.sort_order) ?? 0 }
          : null;
      })
      .filter((a): a is { id: string; name: string; sortOrder: number } => a !== null)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(({ id: artistId, name }) => ({ id: artistId, name }));
    liveCuts.push({
      id,
      partyId,
      partNumber: num(row.part_number) ?? 0,
      slotStart: str(row.slot_start) ?? "",
      slotEnd: str(row.slot_end) ?? "",
      soundcloudUrl: str(row.soundcloud_url) ?? "",
      durationSeconds: num(row.duration_seconds),
      coverUrl: str(row.cover_url),
      publishedAt: str(row.published_at),
      artists,
    });
  }

  const catalog: CatalogArtist[] = [];
  for (const raw of (artistData ?? []) as unknown[]) {
    const row = asObj(raw);
    const id = str(row?.id);
    const name = str(row?.name);
    if (id && name) catalog.push({ id, name });
  }

  // `default`: this route is not on §4's closed `wide` list, and a stack of
  // per-party cards does not need it.
  return (
    <PageShell width="default">
      <header className="mb-6">
        <Link
          href="/admin/events"
          className={`inline-flex min-h-11 items-center text-xs text-muted transition-colors hover:text-ink ${FOCUS_RING}`}
        >
          &larr; Manage events
        </Link>
        <PageTitle>LiveCuts</PageTitle>
        <p className="mt-1 text-sm text-muted">{event.title}</p>
      </header>

      {lookupFailed ? (
        <Card role="alert">
          <p className="text-sm font-semibold text-sem-crit">
            The LiveCuts could not be loaded.
          </p>
          <p className="mt-2 text-sm text-ink">
            This is <strong>not</strong> an empty list — the read failed. Do not
            add a LiveCut on the strength of this screen: one may already exist.
          </p>
          <p className="mt-3 text-xs text-muted">
            Reload the page. If it fails again, report this code:{" "}
            <code>{lookupFailed.code ?? "unknown"}</code>
          </p>
        </Card>
      ) : (
        <LiveCutForm
          eventId={eventId}
          nights={nights}
          liveCuts={liveCuts}
          catalog={catalog}
        />
      )}
    </PageShell>
  );
}
