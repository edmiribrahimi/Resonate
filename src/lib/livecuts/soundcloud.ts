/**
 * Does this SoundCloud link point at a track that exists and is public?
 *
 * ── Server only ──────────────────────────────────────────────────────────────
 *
 * This module is imported only by admin server actions. It must NEVER be
 * imported from a client component (a file under the `use client` directive): the check would run in the browser,
 * where SoundCloud's answer is not ours to trust and the refusal categories
 * would never reach the server log.
 *
 * ── What it asks, and to whom ────────────────────────────────────────────────
 *
 * One request to SoundCloud's public oEmbed endpoint. The host is FIXED and
 * built by this code (`OEMBED_ENDPOINT`); the admin chooses only the value of
 * the `url` parameter, encoded, and only after it matched the permalink
 * pattern. No other host can be reached from here (no SSRF). Timeout 8 s,
 * never cached.
 *
 * ── What it keeps from the answer ────────────────────────────────────────────
 *
 * The numeric track id, read with a regex out of the `html` field, and the
 * `title` if it is a string. Nothing else. The `html` (third-party markup) and
 * the `description` (free third-party text) are NEVER returned, stored or
 * logged: either can carry a genre word or a place. The oEmbed answer carries
 * no duration — the duration is typed by the owner.
 *
 * ── The four ways to say no ──────────────────────────────────────────────────
 *
 * Each has its own category and its own log line, with the HTTP status or the
 * error name — never the URL, whose slug can carry a person's name.
 */

/** Same pattern as the `livecuts_soundcloud_url_check` constraint of the migration. */
export const SOUNDCLOUD_PERMALINK_RE = /^https:\/\/soundcloud\.com\/[A-Za-z0-9_-]+\/[A-Za-z0-9_-]+$/;

/** Fixed host and path; only the encoded permalink is appended. */
const OEMBED_ENDPOINT = "https://soundcloud.com/oembed?format=json&url=";

/** The link is not a SoundCloud track permalink (shape, control characters, backslash). */
const URL_NOT_SOUNDCLOUD = "livecut.url_not_soundcloud";
/** SoundCloud answered 404: the track does not exist or is private. */
const TRACK_NOT_FOUND_OR_PRIVATE = "livecut.track_not_found_or_private";
/**
 * SoundCloud did not answer usefully — any non-404 failure, a timeout, a
 * network error, an unreadable body. This does NOT mean «the track does not
 * exist»: it means the link was not checked.
 */
const OEMBED_UNAVAILABLE = "livecut.oembed_unavailable";
/** SoundCloud answered, but no track id could be read from the answer. */
const TRACK_ID_UNREADABLE = "livecut.track_id_unreadable";

export type SoundCloudLinkRefusal =
  | typeof URL_NOT_SOUNDCLOUD
  | typeof TRACK_NOT_FOUND_OR_PRIVATE
  | typeof OEMBED_UNAVAILABLE
  | typeof TRACK_ID_UNREADABLE;

export type SoundCloudLinkResult =
  | { ok: true; trackId: string; soundcloudTitle: string | null }
  | { ok: false; reason: SoundCloudLinkRefusal };

const TRACK_ID_ENCODED_RE = /api\.soundcloud\.com%2Ftracks%2F(\d+)/;
const TRACK_ID_PLAIN_RE = /api\.soundcloud\.com\/tracks\/(\d+)/;

/** Control characters and the backslash — a loop, not a regex (`no-control-regex`). */
function hasHostileCharacters(value: string): boolean {
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code < 0x20 || code === 0x7f || code === 0x5c) return true;
  }
  return false;
}

function refuse(reason: SoundCloudLinkRefusal, detail: string): SoundCloudLinkResult {
  console.error(`[${reason}] ${detail}`);
  return { ok: false, reason };
}

function errorName(error: unknown): string {
  return error instanceof Error ? error.name : typeof error;
}

export async function verifySoundCloudLink(raw: string): Promise<SoundCloudLinkResult> {
  const url = raw.trim();
  if (hasHostileCharacters(url)) {
    return refuse(URL_NOT_SOUNDCLOUD, "control character or backslash in the link");
  }
  if (!SOUNDCLOUD_PERMALINK_RE.test(url)) {
    return refuse(URL_NOT_SOUNDCLOUD, "link does not match the track permalink pattern");
  }

  let res: Response;
  try {
    res = await fetch(`${OEMBED_ENDPOINT}${encodeURIComponent(url)}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
  } catch (error) {
    return refuse(OEMBED_UNAVAILABLE, `fetch failed: ${errorName(error)}`);
  }

  if (res.status === 404) {
    return refuse(TRACK_NOT_FOUND_OR_PRIVATE, "oEmbed HTTP 404");
  }
  if (!res.ok) {
    return refuse(OEMBED_UNAVAILABLE, `oEmbed HTTP ${res.status}`);
  }

  let body: unknown;
  try {
    body = await res.json();
  } catch (error) {
    return refuse(OEMBED_UNAVAILABLE, `oEmbed body unreadable: ${errorName(error)}`);
  }
  if (typeof body !== "object" || body === null) {
    return refuse(OEMBED_UNAVAILABLE, "oEmbed body is not an object");
  }

  const fields = body as { html?: unknown; title?: unknown };
  const html = typeof fields.html === "string" ? fields.html : "";
  const match = TRACK_ID_ENCODED_RE.exec(html) ?? TRACK_ID_PLAIN_RE.exec(html);
  if (!match) {
    return refuse(TRACK_ID_UNREADABLE, "no track id in the oEmbed answer");
  }

  return {
    ok: true,
    trackId: match[1],
    soundcloudTitle: typeof fields.title === "string" ? fields.title : null,
  };
}
