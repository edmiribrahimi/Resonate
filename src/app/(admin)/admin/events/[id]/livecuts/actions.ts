"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getServiceClient } from "@/lib/supabase/service";
import {
  assertMayManageEvent,
  assertStaffManage,
} from "@/lib/capabilities/guards";
import { musicPageEnabled } from "@/lib/livecuts/enabled";
import {
  SOUNDCLOUD_PERMALINK_RE,
  verifySoundCloudLink,
  type SoundCloudLinkRefusal,
} from "@/lib/livecuts/soundcloud";
import { parseDuration } from "@/lib/livecuts/title";

/**
 * Writing a LiveCut from the night's admin page — MUS-07, and the half of
 * MUS-05 the public code cannot see.
 *
 * ── Who may write, and where the boundary is ─────────────────────────────────
 *
 * Only a holder of `staff.manage` (`assertStaffManage`), on an event they may
 * manage (`assertMayManageEvent`). That pair is the COURTESY in Node: it tells
 * «you may not» apart from «this does not exist». The BOUNDARY is the row-level
 * security of `public.livecuts` and `public.livecut_artists`
 * (`20261004120000_livecuts.sql`, policies `livecuts_*_staff`), and every write
 * below goes through the COOKIE client so those policies are exercised — never
 * the service client, which would bypass them.
 *
 * The service client is used for exactly two READS: the scope of the night
 * (`event_parties`, `venues`) and the night a LiveCut row belongs to. Both
 * answer «is this id inside the event you just proved you manage?», which is
 * the check `removeGuest` (`guest-list/actions.ts`) does NOT make and the
 * reason it is not a model here.
 *
 * ── The switch ───────────────────────────────────────────────────────────────
 *
 * Every exported action refuses with `disabled` while `musicPageEnabled()` is
 * false — first line, before any round trip. In production, with the code
 * shipped and the switch off, no LiveCut can be written (T-52.3-16).
 *
 * ── The place in the slug (Pitfall 11, T-52.3-13) ───────────────────────────
 *
 * The SoundCloud permalink is chosen by whoever uploads the track, and on a
 * secret-venue night it can carry the place — the backlink on `/music` would
 * then publish it, and a publication does not come back. On a night with
 * `venue_secret`, a link whose PATH contains a word of the venue's name or of
 * `venue_text` (four letters or more) is refused with `url_names_venue`,
 * BEFORE SoundCloud is asked. The log line carries the event id only: never
 * the URL, never the matched word.
 *
 * Honest limit: the match is by WORD of the path, split on `/`, `-`, `_`. A
 * slug that glues the place to another word without a separator is not
 * caught. The owner reads the link before publishing; this guard catches the
 * common shape, it is not a proof.
 *
 * ── Refusals ─────────────────────────────────────────────────────────────────
 *
 * Every refusal is a named value and a log line with its category
 * (`[livecut.<reason>]`). No `catch` flattens causes; the guards throw their
 * own categories (`forbidden.staff_manage_required`,
 * `forbidden.not_event_manager`, `forbidden.event_not_found`,
 * `event.lookup_failed: <code>`, `capabilities.resolve_failed: …`) exactly as
 * in `assignments/actions.ts`. Of a PostgREST error only `code` is read and
 * logged: the field that can carry the failing row is never touched.
 *
 * Artist names never reach a log line. Neither does a URL.
 *
 * ── Revalidation ─────────────────────────────────────────────────────────────
 *
 * Only `/admin/events/<id>/livecuts`. `/music` is a dynamic page and is never
 * revalidated from here (Pitfall 7).
 */

/** The same shape as `assignments/actions.ts`. */
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Same pattern as the `livecuts_mixcloud_url_check` constraint. */
const MIXCLOUD_URL_RE =
  /^https:\/\/www\.mixcloud\.com\/[A-Za-z0-9_-]+\/[A-Za-z0-9_-]+\/?$/;

/** `HH:MM`, 00:00 → 23:59. A slot may cross midnight: end < start is legal. */
const SLOT_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

/** PostgreSQL `check_violation`. */
const CHECK_VIOLATION = "23514";
/** PostgreSQL `foreign_key_violation`. */
const FOREIGN_KEY_VIOLATION = "23503";
/** PostgreSQL `unique_violation` — `livecuts_one_per_slot`. */
const UNIQUE_VIOLATION = "23505";
/** PostgreSQL `insufficient_privilege` — a policy said no. */
const INSUFFICIENT_PRIVILEGE = "42501";
/** Our own code for «the write matched no row» (update or delete). */
const NO_ROWS = "no_rows";

const MAX_ARTISTS = 4;
const MIN_PART = 1;
const MAX_PART = 24;
const MIN_PLACE_TOKEN = 4;

/**
 * Every way a LiveCut write can be refused, one value each. The form
 * (plan 52.3-10) maps each to its sentence; this file returns codes.
 */
export type LiveCutRefusal =
  /** `NEXT_PUBLIC_MUSIC_PAGE_ENABLED` is not `"true"`. Nothing was asked. */
  | "disabled"
  /** An id is not a uuid, or the input has the wrong shape. Nothing was written. */
  | "invalid_input"
  /** The night does not exist or belongs to another event — same answer, no oracle. */
  | "party_not_in_event"
  /** The LiveCut exists but its night belongs to another event. */
  | "livecut_not_in_event"
  /** No LiveCut with this id (or the policy hid it). */
  | "not_found"
  /** The link is not a SoundCloud track permalink. */
  | "url_not_soundcloud"
  /** SoundCloud answered 404: missing or private. */
  | "track_not_found_or_private"
  /** SoundCloud did not answer usefully. The link was NOT checked. */
  | "oembed_unavailable"
  /** SoundCloud answered without a readable track id. */
  | "track_id_unreadable"
  /** Secret-venue night and the link's path names the place. */
  | "url_names_venue"
  /** The Mixcloud link does not match the column's `CHECK`. */
  | "invalid_mixcloud"
  /** Part number outside 1–24, or a slot bound not in `HH:MM`. */
  | "invalid_slot"
  /** Duration not `h:mm:ss` / `mm:ss`, or outside (0, 24 h). */
  | "invalid_duration"
  /** No artist on the slot — or, at publish, a draft left with none. */
  | "no_artists"
  /** An artist id names no row of `public.artists` (`23503`). */
  | "unknown_artist"
  /** The cover URL is not ours: `…/event-images/livecuts/<uuid>.jpg` of this project. */
  | "cover_not_ours"
  /** Publishing before the day after the night (Turin civil date). */
  | "night_not_over"
  /** Publishing without a cover (`livecuts_published_has_cover`). */
  | "missing_cover"
  /** Another LiveCut already holds this part on this night (`23505`). */
  | "slot_taken"
  /** A `CHECK` refused the row (`23514`); `code` carried. */
  | "refused_by_database"
  /** Any other failure of a read or a write; `code` carried when there is one. */
  | "write_failed";

export type LiveCutResult =
  | { ok: true; id: string }
  | { ok: false; reason: LiveCutRefusal; code?: string };

export interface LiveCutInput {
  /** `null` creates a draft; a uuid updates that draft. */
  id: string | null;
  partyId: string;
  partNumber: number;
  /** `HH:MM`. */
  slotStart: string;
  /** `HH:MM`; may be earlier than `slotStart` (crosses midnight). */
  slotEnd: string;
  /** 1 to 4 distinct artist ids, in title order. */
  artistIds: string[];
  /** The permalink. The track id is NEVER taken from the client: it is read here. */
  soundcloudUrl: string;
  /**
   * Accepted by the type, validated because the column and its `CHECK` exist,
   * and always `null` from the form until the owner decides on Mixcloud
   * (D-52.3-01, checkpoint of plan 52.3-13, default no). An inert column,
   * declared rather than hidden.
   */
  mixcloudUrl: string | null;
  /** `h:mm:ss` or `mm:ss`, typed by the owner (oEmbed carries no duration). */
  durationText: string;
  /** Written by `/api/media/finalize-cover`; only that exact shape is accepted. */
  coverUrl: string | null;
}

type Refused = { ok: false; reason: LiveCutRefusal; code?: string };

interface PartyScope {
  partyId: string;
  /** `YYYY-MM-DD`, the night's civil date. */
  date: string;
  venueSecret: boolean;
  /** Words of the venue's name and `venue_text`, only for a secret night. */
  placeTokens: string[];
}

function refuse(
  reason: LiveCutRefusal,
  eventId: string,
  detail: string,
  code?: string
): Refused {
  console.error(
    `[livecut.${reason}] event ${eventId} ${detail}` +
      (code ? ` code ${code}` : "")
  );
  return code ? { ok: false, reason, code } : { ok: false, reason };
}

/**
 * The gate, asked ONCE per exported action — copied from
 * `assignments/actions.ts`. `cache()` does not memoise inside a Server Action
 * body, so a second `assertStaffManage(` in one action is a second round trip.
 */
async function verifyOrganizerAccess(eventId: string): Promise<string> {
  const ctx = await assertStaffManage();

  if (!ctx.userId) {
    throw new Error("capabilities.resolve_failed: no_subject");
  }

  await assertMayManageEvent(getServiceClient(), eventId, ctx);

  return ctx.userId;
}

/**
 * Switch, shape of the event id, then the guard — the order that costs least.
 *
 * The event id is checked for shape BEFORE the guard so a malformed id is
 * `invalid_input` rather than an `event.lookup_failed: 22P02` thrown by the
 * guard's read. It needs no database and reveals nothing.
 */
async function gate(
  eventId: string
): Promise<{ ok: true; userId: string } | Refused> {
  if (!musicPageEnabled()) {
    console.error(`[livecut.disabled] music page switch is off`);
    return { ok: false, reason: "disabled" };
  }
  if (typeof eventId !== "string" || !UUID_PATTERN.test(eventId)) {
    console.error(`[livecut.invalid_input] event id is not a uuid`);
    return { ok: false, reason: "invalid_input" };
  }
  const userId = await verifyOrganizerAccess(eventId);
  return { ok: true, userId };
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

/**
 * Lower case, diacritics dropped, split on every non-alphanumeric character,
 * words of at least four letters. Shorter words (`the`, `bar`, `via`) would
 * refuse half of SoundCloud.
 */
function placeTokens(name: string | null, text: string | null): string[] {
  const words = new Set<string>();
  for (const source of [name, text]) {
    if (!source) continue;
    const normalised = source
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase();
    for (const word of normalised.split(/[^a-z0-9]+/)) {
      if (word.length >= MIN_PLACE_TOKEN) words.add(word);
    }
  }
  return [...words];
}

/** True when a token appears as a whole word of the URL's path. */
function pathNamesPlace(url: string, tokens: readonly string[]): boolean {
  if (tokens.length === 0) return false;
  let path: string;
  try {
    path = new URL(url).pathname;
  } catch (error) {
    // Unreachable after the permalink regex; if it happens, refuse to call
    // the link clean — the caller treats `true` as «names the place».
    console.error(
      `[livecut.url_names_venue] path unreadable: ` +
        `${error instanceof Error ? error.name : typeof error}`
    );
    return true;
  }
  let decoded = path;
  try {
    decoded = decodeURIComponent(path);
  } catch {
    // A malformed escape: keep the raw path, which is still split and compared.
    decoded = path;
  }
  const words = decoded
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .split(/[/_-]+/);
  return words.some((word) => tokens.includes(word));
}

/**
 * The night, scoped to the event already proved manageable.
 *
 * A missing night and a night of another event get the SAME answer, like
 * `assignments/actions.ts`: distinguishing them would make this action an
 * oracle for which uuids name a real party.
 */
async function scopeParty(
  eventId: string,
  partyId: string
): Promise<{ ok: true; party: PartyScope } | Refused> {
  const service = getServiceClient();
  const { data: party, error } = await service
    .from("event_parties")
    .select("event_id, date, venue_secret, venue_text, venue_id")
    .eq("id", partyId)
    .maybeSingle();

  if (error) {
    return refuse(
      "write_failed",
      eventId,
      "party scope read",
      error.code ?? "unknown"
    );
  }
  if (!party || party.event_id !== eventId) {
    return refuse("party_not_in_event", eventId, "night not in this event");
  }

  let venueName: string | null = null;
  if (party.venue_secret && party.venue_id) {
    const { data: venue, error: venueError } = await service
      .from("venues")
      .select("name")
      .eq("id", party.venue_id)
      .maybeSingle();
    if (venueError) {
      return refuse(
        "write_failed",
        eventId,
        "venue scope read",
        venueError.code ?? "unknown"
      );
    }
    venueName = typeof venue?.name === "string" ? venue.name : null;
  }

  return {
    ok: true,
    party: {
      partyId,
      date: String(party.date),
      venueSecret: party.venue_secret === true,
      placeTokens: party.venue_secret
        ? placeTokens(venueName, party.venue_text ?? null)
        : [],
    },
  };
}

/**
 * A LiveCut row, by primary key, and its night scoped to the event.
 *
 * `not_found` when the row does not exist; `livecut_not_in_event` when it
 * exists under another event's night. This is where the deletion differs
 * from `removeGuest`: the row must belong to a night of THIS event.
 */
async function scopeLiveCut(
  eventId: string,
  id: string
): Promise<{ ok: true; partyId: string; party: PartyScope } | Refused> {
  const { data: row, error } = await getServiceClient()
    .from("livecuts")
    .select("party_id")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return refuse(
      "write_failed",
      eventId,
      "livecut scope read",
      error.code ?? "unknown"
    );
  }
  if (!row) {
    return refuse("not_found", eventId, `livecut ${id} not found`);
  }

  const scoped = await scopeParty(eventId, row.party_id);
  if (!scoped.ok) {
    if (scoped.reason === "party_not_in_event") {
      return refuse(
        "livecut_not_in_event",
        eventId,
        `livecut ${id} belongs to another event`
      );
    }
    return scoped;
  }
  return { ok: true, partyId: row.party_id, party: scoped.party };
}

/** The four refusals of `soundcloud.ts`, mapped onto the homonymous values. */
function mapSoundCloudRefusal(reason: SoundCloudLinkRefusal): LiveCutRefusal {
  switch (reason) {
    case "livecut.url_not_soundcloud":
      return "url_not_soundcloud";
    case "livecut.track_not_found_or_private":
      return "track_not_found_or_private";
    case "livecut.oembed_unavailable":
      return "oembed_unavailable";
    case "livecut.track_id_unreadable":
      return "track_id_unreadable";
  }
}

/**
 * Shape, then the place guard — never SoundCloud first. Shared by
 * `verifyLiveCutLink` and `saveLiveCut` so the order cannot diverge.
 */
function checkLinkBeforeOembed(
  eventId: string,
  url: string,
  party: PartyScope
): Refused | null {
  if (!SOUNDCLOUD_PERMALINK_RE.test(url)) {
    return refuse("url_not_soundcloud", eventId, "permalink shape");
  }
  if (party.venueSecret && pathNamesPlace(url, party.placeTokens)) {
    return refuse("url_names_venue", eventId, "soundcloud path");
  }
  return null;
}

/** The exact public URL `finalize-cover` writes for this project, or `null`. */
function coverUrlPattern(): RegExp | null {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  const escaped = base.replace(/\/+$/, "").replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
  return new RegExp(
    `^${escaped}\\/storage\\/v1\\/object\\/public\\/event-images\\/livecuts\\/` +
      `[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\.jpg$`,
    "i"
  );
}

/**
 * The refusal of a failed write, from its CODE alone. One log line per branch.
 */
function classifyWriteError(
  eventId: string,
  step: string,
  error: { code?: string | null }
): Refused {
  const code = error.code ?? "unknown";
  switch (code) {
    case UNIQUE_VIOLATION:
      return refuse("slot_taken", eventId, step, code);
    case FOREIGN_KEY_VIOLATION:
      return refuse("unknown_artist", eventId, step, code);
    case CHECK_VIOLATION:
      return refuse("refused_by_database", eventId, step, code);
    case INSUFFICIENT_PRIVILEGE:
      return refuse("write_failed", eventId, step, code);
    default:
      return refuse("write_failed", eventId, step, code);
  }
}

function revalidateAdmin(eventId: string): void {
  revalidatePath(`/admin/events/${eventId}/livecuts`);
}

/**
 * Check a SoundCloud link for a night, without saving anything.
 *
 * Returns only SoundCloud's title — never the track id, the `html` or the
 * description. The track id is read again, server-side, by `saveLiveCut`.
 */
export async function verifyLiveCutLink(
  eventId: string,
  partyId: string,
  url: string
): Promise<
  { ok: true; soundcloudTitle: string | null } | { ok: false; reason: LiveCutRefusal }
> {
  const gated = await gate(eventId);
  if (!gated.ok) return { ok: false, reason: gated.reason };

  if (!isUuid(partyId) || typeof url !== "string") {
    const r = refuse("invalid_input", eventId, "verify: party id or url shape");
    return { ok: false, reason: r.reason };
  }

  const scoped = await scopeParty(eventId, partyId);
  if (!scoped.ok) return { ok: false, reason: scoped.reason };

  const link = url.trim();
  const early = checkLinkBeforeOembed(eventId, link, scoped.party);
  if (early) return { ok: false, reason: early.reason };

  const checked = await verifySoundCloudLink(link);
  if (!checked.ok) {
    return { ok: false, reason: mapSoundCloudRefusal(checked.reason) };
  }
  return { ok: true, soundcloudTitle: checked.soundcloudTitle };
}

/**
 * Create or update a DRAFT. Never touches `published_at`.
 *
 * Order: switch → guard → shapes → night scope → (row scope, same night) →
 * slot → duration → artists → Mixcloud → cover → place guard → oEmbed → write.
 *
 * ── Not atomic, and what that leaves behind ──────────────────────────────────
 *
 * The LiveCut row and its `livecut_artists` are separate statements: PostgREST
 * offers no transaction here. To keep the window harmless:
 *
 *   - on UPDATE the new artist pairs are UPSERTED first and the old ones
 *     deleted after, so a failure leaves the old set or a superset — never a
 *     row with zero artists;
 *   - on INSERT, if the artists fail, the fresh row is deleted again by
 *     primary key (compensation, logged if it fails).
 *
 * If a row does end up with no artist anyway, it cannot be published:
 * `publishLiveCut` refuses with `no_artists`.
 */
export async function saveLiveCut(
  eventId: string,
  input: LiveCutInput
): Promise<LiveCutResult> {
  const gated = await gate(eventId);
  if (!gated.ok) return gated;
  const userId = gated.userId;

  if (
    typeof input !== "object" ||
    input === null ||
    !isUuid(input.partyId) ||
    (input.id !== null && !isUuid(input.id)) ||
    typeof input.soundcloudUrl !== "string" ||
    typeof input.durationText !== "string" ||
    !Array.isArray(input.artistIds)
  ) {
    return refuse("invalid_input", eventId, "save: input shape");
  }

  const scoped = await scopeParty(eventId, input.partyId);
  if (!scoped.ok) return scoped;
  const party = scoped.party;

  if (input.id !== null) {
    const row = await scopeLiveCut(eventId, input.id);
    if (!row.ok) return row;
    if (row.partyId !== input.partyId) {
      return refuse(
        "invalid_input",
        eventId,
        `save: livecut ${input.id} belongs to another night`
      );
    }
  }

  if (
    !Number.isInteger(input.partNumber) ||
    input.partNumber < MIN_PART ||
    input.partNumber > MAX_PART ||
    typeof input.slotStart !== "string" ||
    typeof input.slotEnd !== "string" ||
    !SLOT_RE.test(input.slotStart) ||
    !SLOT_RE.test(input.slotEnd)
  ) {
    return refuse("invalid_slot", eventId, "save: part or slot bounds");
  }

  const durationSeconds = parseDuration(input.durationText);
  if (durationSeconds === null) {
    return refuse("invalid_duration", eventId, "save: duration");
  }

  if (input.artistIds.length === 0) {
    return refuse("no_artists", eventId, "save: no artist");
  }
  if (
    input.artistIds.length > MAX_ARTISTS ||
    !input.artistIds.every(isUuid) ||
    new Set(input.artistIds.map((a) => a.toLowerCase())).size !==
      input.artistIds.length
  ) {
    return refuse("invalid_input", eventId, "save: artist ids");
  }

  let mixcloudUrl: string | null = null;
  if (input.mixcloudUrl !== null && input.mixcloudUrl !== undefined) {
    if (typeof input.mixcloudUrl !== "string") {
      return refuse("invalid_mixcloud", eventId, "save: mixcloud type");
    }
    const mix = input.mixcloudUrl.trim();
    if (!MIXCLOUD_URL_RE.test(mix)) {
      return refuse("invalid_mixcloud", eventId, "save: mixcloud shape");
    }
    if (party.venueSecret && pathNamesPlace(mix, party.placeTokens)) {
      return refuse("url_names_venue", eventId, "mixcloud path");
    }
    mixcloudUrl = mix;
  }

  let coverUrl: string | null = null;
  if (input.coverUrl !== null && input.coverUrl !== undefined) {
    const pattern = coverUrlPattern();
    if (pattern === null) {
      return refuse(
        "cover_not_ours",
        eventId,
        "save: NEXT_PUBLIC_SUPABASE_URL is not set"
      );
    }
    if (typeof input.coverUrl !== "string" || !pattern.test(input.coverUrl)) {
      return refuse("cover_not_ours", eventId, "save: cover url shape");
    }
    coverUrl = input.coverUrl;
  }

  // Place guard BEFORE SoundCloud is asked.
  const link = input.soundcloudUrl.trim();
  const early = checkLinkBeforeOembed(eventId, link, party);
  if (early) return early;

  // The track id is read HERE, never taken from the client.
  const checked = await verifySoundCloudLink(link);
  if (!checked.ok) {
    return { ok: false, reason: mapSoundCloudRefusal(checked.reason) };
  }

  const supabase = await createClient();
  const now = new Date().toISOString();
  const fields = {
    party_id: input.partyId,
    part_number: input.partNumber,
    slot_start: input.slotStart,
    slot_end: input.slotEnd,
    soundcloud_url: link,
    soundcloud_track_id: checked.trackId,
    mixcloud_url: mixcloudUrl,
    duration_seconds: durationSeconds,
    cover_url: coverUrl,
  };

  let id: string;
  const fresh = input.id === null;
  if (input.id === null) {
    const { data, error } = await supabase
      .from("livecuts")
      .insert({ ...fields, created_by: userId })
      .select("id")
      .maybeSingle();
    if (error) return classifyWriteError(eventId, "save: insert livecut", error);
    if (!data) {
      return refuse("write_failed", eventId, "save: insert returned no row", NO_ROWS);
    }
    id = data.id as string;
  } else {
    const { data, error } = await supabase
      .from("livecuts")
      .update({ ...fields, updated_at: now })
      .eq("id", input.id)
      .select("id");
    if (error) return classifyWriteError(eventId, "save: update livecut", error);
    if (!data || data.length !== 1) {
      return refuse("write_failed", eventId, "save: update matched no row", NO_ROWS);
    }
    id = input.id;
  }

  const pairs = input.artistIds.map((artistId, index) => ({
    livecut_id: id,
    artist_id: artistId,
    sort_order: index,
  }));

  const { error: upsertError } = await supabase
    .from("livecut_artists")
    .upsert(pairs, { onConflict: "livecut_id,artist_id" });

  if (upsertError) {
    const refused = classifyWriteError(eventId, "save: upsert artists", upsertError);
    if (fresh) {
      const { error: undoError } = await supabase
        .from("livecuts")
        .delete()
        .eq("id", id);
      if (undoError) {
        console.error(
          `[livecut.write_failed] event ${eventId} save: compensation delete of ` +
            `livecut ${id} failed code ${undoError.code ?? "unknown"} — a draft ` +
            `without artists remains and cannot be published`
        );
      }
    }
    return refused;
  }

  if (!fresh) {
    // Every id was validated as a uuid above, so the list is safe to inline.
    const { error: pruneError } = await supabase
      .from("livecut_artists")
      .delete()
      .eq("livecut_id", id)
      .not("artist_id", "in", `(${input.artistIds.join(",")})`);
    if (pruneError) {
      return classifyWriteError(eventId, "save: prune artists", pruneError);
    }
  }

  revalidateAdmin(eventId);
  return { ok: true, id };
}
