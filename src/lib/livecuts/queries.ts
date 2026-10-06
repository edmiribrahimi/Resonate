import { createClient } from "@/lib/supabase/server";
import { liveCutTitle } from "@/lib/livecuts/title";
import type { LiveCutArtistView, LiveCutView, NightBlock } from "@/lib/livecuts/view";

/**
 * The public read of the Music page — one home, one `.select`.
 *
 * ── Why the client with cookies, and not the service key ─────────────────────
 *
 * `createClient()` carries the visitor's session, so the database policy
 * `livecuts_select_published` decides which rows come back: an anonymous
 * visitor reads only published LiveCuts of published events, and a draft never
 * reaches this process. The `.not("published_at", "is", null)` below is for the
 * reader of this file — the policy already guarantees it — and it also keeps a
 * signed-in organizer from seeing drafts on the public page.
 *
 * ── The allow-list ───────────────────────────────────────────────────────────
 *
 * ONE string literal, on ONE line, names every column this page can ever show.
 * Plan 52.3-11 counts it column by column: a new column, whatever its name,
 * goes red until somebody adds it on purpose. There is no column of place here
 * and no free-text field — the title is computed (`liveCutTitle`), never read.
 * This page never shows where an event happened, at any moment, so it does not
 * import the reveal predicate either.
 *
 * Narrowed on 2026-10-05 (plan 52.3-17): the series name, the progressivo, the
 * event's end time and the event slug are no longer read. The series key is
 * internal to us — the owner's request 13 at the checkpoint — and the series
 * name was also the only place the venue could surface on this page. A column
 * that is not shown is not read; widening it again is a decision, and check H
 * (`verify:venue-surfaces`, H2 and H6) goes red until it is taken.
 *
 * ── Error is not empty ───────────────────────────────────────────────────────
 *
 * A failed read returns `{ ok: false, code }` and logs
 * `[music.list_query_failed]`; the page then says the recordings could not be
 * loaded. It NEVER becomes the empty state: telling a visitor «no LiveCuts yet»
 * when the database did not answer is a healthy-looking lie that nothing in
 * this project would report (no error tracking — `meta-gates.md`).
 *
 * ── What is not counted ──────────────────────────────────────────────────────
 *
 * No count of timetable slots, anywhere. The number of parts of an event, on
 * this page, is the number of its PUBLISHED cards — `partCount`, set below after
 * grouping and before any filter. The timetable is production material and
 * does not enter.
 */

export type MusicListResult =
  | {
      ok: true;
      nights: NightBlock[];
      formats: { slug: string; name: string; color: string }[];
      artists: { slug: string; name: string; formatSlugs: string[] }[];
    }
  | { ok: false; code: string };

/* ──────────────────────────────────────────────────────────────────────────
 * Narrowing by hand — rows arrive as `unknown` (no client is parameterised)
 * ────────────────────────────────────────────────────────────────────────── */

type Obj = Record<string, unknown>;

function asObj(value: unknown): Obj | null {
  // PostgREST renders a to-one embed as an object; tolerate a one-element
  // array as well, in case the relation is ever read as to-many.
  if (Array.isArray(value)) return value.length === 1 ? asObj(value[0]) : null;
  return typeof value === "object" && value !== null ? (value as Obj) : null;
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/**
 * `waveform_peaks` → `peaks`: an array of finite numbers, or null. Anything
 * else — null, a string, a malformed array — is null too, NEVER a skipped row:
 * the waveform is decoration on top of a LiveCut that plays without it.
 */
function peaksOf(value: unknown): number[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const out: number[] = [];
  for (const v of value) {
    if (typeof v !== "number" || !Number.isFinite(v)) return null;
    out.push(v);
  }
  return out;
}

interface ParsedRow {
  view: LiveCutView;
  night: Omit<NightBlock, "liveCuts">;
  formatSortOrder: number;
}

function parseRow(raw: unknown): ParsedRow | null {
  const row = asObj(raw);
  if (!row) return null;

  const id = str(row.id);
  const partyId = str(row.party_id);
  const partNumber = num(row.part_number);
  const slotStart = str(row.slot_start);
  const slotEnd = str(row.slot_end);
  const soundcloudUrl = str(row.soundcloud_url);
  const trackId = num(row.soundcloud_track_id) ?? str(row.soundcloud_track_id);
  const durationSeconds = num(row.duration_seconds);
  const coverUrl = str(row.cover_url);
  const mixcloudUrl = str(row.mixcloud_url);
  const peaks = peaksOf(row.waveform_peaks);

  const party = asObj(row.event_parties);
  const format = asObj(party?.formats);

  const date = str(party?.date);
  const formatName = str(format?.name);
  const formatSlug = str(format?.slug);
  const formatColor = str(format?.color);

  if (
    !id ||
    !partyId ||
    partNumber === null ||
    !slotStart ||
    !slotEnd ||
    !soundcloudUrl ||
    trackId === null ||
    durationSeconds === null ||
    !coverUrl ||
    !party ||
    !date ||
    !formatName ||
    !formatSlug ||
    !formatColor
  ) {
    return null;
  }

  const credits = Array.isArray(row.livecut_artists) ? row.livecut_artists : [];
  const artists: { sortOrder: number; artist: LiveCutArtistView }[] = [];
  for (const c of credits) {
    const credit = asObj(c);
    const artist = asObj(credit?.artists);
    const name = str(artist?.name);
    const slug = str(artist?.slug);
    if (!name || !slug) return null;
    artists.push({ sortOrder: num(credit?.sort_order) ?? 0, artist: { name, slug } });
  }
  if (artists.length === 0) return null;
  artists.sort((a, b) => a.sortOrder - b.sortOrder);
  const orderedArtists = artists.map((a) => a.artist);

  return {
    view: {
      id,
      partNumber,
      slotStart,
      slotEnd,
      durationSeconds,
      coverUrl,
      soundcloudUrl,
      soundcloudTrackId: String(trackId),
      mixcloudUrl,
      artists: orderedArtists,
      // The FORMAT's name (D-52.3-03, amended 2026-10-03) — never the series
      // name, which this read does not even fetch (2026-10-05).
      title: liveCutTitle(
        orderedArtists.map((a) => a.name),
        formatName,
        date,
      ),
      formatName,
      formatSlug,
      formatColor,
      date,
      // Set after grouping, in `listPublishedLiveCuts`.
      partCount: 0,
      peaks,
    },
    night: {
      partyId,
      date,
      time: str(party.time),
    },
    formatSortOrder: num(format?.sort_order) ?? 0,
  };
}

/** Descending by civil date, then by start time; strings compare correctly in both. */
function compareNightsDesc(a: NightBlock, b: NightBlock): number {
  if (a.date !== b.date) return a.date < b.date ? 1 : -1;
  const ta = a.time ?? "";
  const tb = b.time ?? "";
  if (ta !== tb) return ta < tb ? 1 : -1;
  return 0;
}

/* ──────────────────────────────────────────────────────────────────────────
 * The read
 * ────────────────────────────────────────────────────────────────────────── */

export async function listPublishedLiveCuts(): Promise<MusicListResult> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("livecuts")
    .select("id, party_id, part_number, slot_start, slot_end, soundcloud_url, soundcloud_track_id, mixcloud_url, duration_seconds, cover_url, published_at, waveform_peaks, event_parties(id, date, time, formats(slug, name, color, sort_order)), livecut_artists(sort_order, artists(name, slug))")
    .not("published_at", "is", null);

  if (error) {
    const code = error.code || "transport";
    console.error(`[music.list_query_failed] ${code}: ${error.message}`);
    return { ok: false, code };
  }

  const rows: unknown[] = Array.isArray(data) ? data : [];
  const nightsById = new Map<string, NightBlock>();
  const formatsBySlug = new Map<string, { slug: string; name: string; color: string; sortOrder: number }>();
  const artistsBySlug = new Map<string, { slug: string; name: string; formatSlugs: Set<string> }>();

  for (const raw of rows) {
    const parsed = parseRow(raw);
    if (!parsed) {
      // Only the id: a row is never logged with names in it.
      const rawId = str(asObj(raw)?.id) ?? "unknown";
      console.error(`[music.row_shape_unexpected] livecut ${rawId}: an embed or a field is missing; row skipped`);
      continue;
    }

    const { view, night, formatSortOrder } = parsed;

    let block = nightsById.get(night.partyId);
    if (!block) {
      block = { ...night, liveCuts: [] };
      nightsById.set(night.partyId, block);
    }
    block.liveCuts.push(view);

    if (!formatsBySlug.has(view.formatSlug)) {
      formatsBySlug.set(view.formatSlug, {
        slug: view.formatSlug,
        name: view.formatName,
        color: view.formatColor,
        sortOrder: formatSortOrder,
      });
    }

    for (const artist of view.artists) {
      let entry = artistsBySlug.get(artist.slug);
      if (!entry) {
        entry = { slug: artist.slug, name: artist.name, formatSlugs: new Set() };
        artistsBySlug.set(artist.slug, entry);
      }
      entry.formatSlugs.add(view.formatSlug);
    }
  }

  const nights = [...nightsById.values()];
  // Timetable order: `part_number`, NEVER clock time — 00:30 would sort before 22:00.
  // Then `partCount`: the published parts of the event, counted HERE — after
  // grouping, before any filter — so `filterNights` copies it and never
  // recomputes it on a filtered list.
  for (const block of nights) {
    block.liveCuts.sort((a, b) => a.partNumber - b.partNumber);
    for (const view of block.liveCuts) view.partCount = block.liveCuts.length;
  }
  nights.sort(compareNightsDesc);

  // Only formats that have at least one published LiveCut: derived from the
  // rows, never from the catalogue listing.
  const formats = [...formatsBySlug.values()]
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "en"))
    .map(({ slug, name, color }) => ({ slug, name, color }));

  const artists = [...artistsBySlug.values()]
    .sort((a, b) => a.name.localeCompare(b.name, "en"))
    .map(({ slug, name, formatSlugs }) => ({ slug, name, formatSlugs: [...formatSlugs] }));

  return { ok: true, nights, formats, artists };
}

/**
 * Pure. A value that matches nothing filters to zero — the filtered empty state
 * says so — and an event left without cards disappears. Views are copied as
 * they are: `partCount` stays the count of the whole event.
 */
export function filterNights(
  nights: NightBlock[],
  f: { format: string | null; artist: string | null },
): NightBlock[] {
  if (f.format === null && f.artist === null) return nights;
  const result: NightBlock[] = [];
  for (const block of nights) {
    const liveCuts = block.liveCuts.filter(
      (lc) =>
        (f.format === null || lc.formatSlug === f.format) &&
        (f.artist === null || lc.artists.some((a) => a.slug === f.artist)),
    );
    if (liveCuts.length > 0) result.push({ ...block, liveCuts });
  }
  return result;
}

/**
 * The LiveCuts of one artist, for the artist profile (owner's request 15,
 * 2026-10-05) — credited alone or in a b2b.
 *
 * ── Why it reuses the Music read instead of writing its own ──────────────────
 *
 * No second `.select`: one query to weigh, one allow-list for check H to count,
 * and the profile can never read a column the Music page does not (no place, no
 * series key). Published LiveCuts are few by construction — one per timetable
 * slot of events that already happened — so filtering the whole read in memory
 * costs nothing worth a second home for the same columns.
 *
 * Order: event newest first, then `part_number` — the order of the read itself,
 * flattened. `partCount` stays the count of the WHOLE event (set before any
 * filter), so the `PT` badge follows the event's rule (≥2 parts), never the
 * number of parts this artist played.
 *
 * On error the `[music.list_query_failed]` line has already been written by the
 * read; the code is handed on so the profile says the recordings could not be
 * loaded, and never shows an empty section in place of the error.
 */
export async function listPublishedLiveCutsByArtist(
  slug: string,
): Promise<{ ok: true; liveCuts: LiveCutView[] } | { ok: false; code: string }> {
  const result = await listPublishedLiveCuts();
  if (!result.ok) return { ok: false, code: result.code };
  const nights = filterNights(result.nights, { format: null, artist: slug });
  return { ok: true, liveCuts: nights.flatMap((block) => block.liveCuts) };
}
