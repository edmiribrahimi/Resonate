/**
 * The LiveCut title, computed — never stored.
 *
 * This module imports nothing (same shape as `src/lib/capabilities/keys.ts`):
 * the page, the player and the admin form all compute the same string from the
 * same data, so the title has one grammar and one home.
 *
 * Grammar (D-52.3-03, amended 2026-10-03):
 *
 *     <artist[ b2b artist]> @ <format> - <d> <Mon> <yy>
 *     Artist A @ RamaDub - 17 Sept 26          (fictitious artist)
 *
 * ── Fact, not option ─────────────────────────────────────────────────────────
 *
 * The separator, the two-digit year, `Sept` and the choice of `formatName` are
 * **fact, not option** — D-52.3-03 amended on 2026-10-03: the owner, verbatim,
 * *«il titolo è giusto quello che c'è»*; the form is the one of the title
 * published on SoundCloud for the LiveCut of the first RamaDub event (series 001)
 * (`<artist> @ RamaDub - 17 Sept 26`, read from the oEmbed on 2026-10-03).
 * Changing it makes the page differ from SoundCloud: plan 52.3-12 task 3 checks
 * the equality.
 *
 * The only option left in the title is the b2b joiner (O-4).
 *
 * ── Why the date is split, never parsed ──────────────────────────────────────
 *
 * A civil date `YYYY-MM-DD` handed to the Date constructor is read as UTC
 * midnight; on a device west of UTC it becomes the day before (Pitfall 5).
 * Every function here splits the string. The weekday is taken from
 * `Date.UTC(y, m - 1, d)` read back with `getUTCDay()`: UTC on both sides, so
 * the device's time zone never enters.
 */

/**
 * Digits of the year in the title: `26`.
 * **Fact, not option** — D-52.3-03 amended on 2026-10-03 (see the module docblock).
 */
export const LIVECUT_TITLE_YEAR_DIGITS = 2;

/**
 * Between format and date: space, hyphen, space — as in the published title.
 * **Fact, not option** — D-52.3-03 amended on 2026-10-03 (see the module docblock).
 */
export const LIVECUT_TITLE_SEPARATOR = " - ";

/**
 * Month abbreviations, British English. September is `Sept` (index 8), as on
 * the published title and in the visual-language rule of the brand.
 * **Fact, not option** — D-52.3-03 amended on 2026-10-03 (see the module docblock).
 */
export const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sept",
  "Oct",
  "Nov",
  "Dec",
] as const;

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

/**
 * How two artists sharing one slot are joined, in the title and in the card.
 * O-4, recommended ` b2b ` — the word of the timetable; owner's decision on the
 * lab, plan 52.3-13: change this line and nothing else.
 */
export const B2B_JOINER = " b2b ";

/** `YYYY-MM-DD` → numbers, by splitting the string. */
function splitCivilDate(civilDate: string): { y: string; m: number; d: number } {
  const [y, m, d] = civilDate.split("-");
  return { y, m: Number(m), d: Number(d) };
}

function shortYear(y: string): string {
  return y.slice(-LIVECUT_TITLE_YEAR_DIGITS);
}

/**
 * The title of a LiveCut.
 *
 * `formatName` is the name of the event's FORMAT — `formats.name`, reached via
 * `event_parties.format_id` (`RamaDub`, `re:sonate`, `MotionLab`) — and NEVER
 * the series name (`party_series.name`, e.g. `RamaDub x <host>`), which stays in
 * the event key (`nightKey`). **Fact, not option** — D-52.3-03 amended on
 * 2026-10-03. A wanted side effect: the title never carries a place word.
 *
 * Example: `liveCutTitle(["Artist A"], "RamaDub", "2026-09-17")`
 * → `Artist A @ RamaDub - 17 Sept 26`.
 */
export function liveCutTitle(artistNames: readonly string[], formatName: string, civilDate: string): string {
  const { y, m, d } = splitCivilDate(civilDate);
  const artists = artistNames.join(B2B_JOINER);
  return `${artists} @ ${formatName}${LIVECUT_TITLE_SEPARATOR}${d} ${MONTHS[m - 1]} ${shortYear(y)}`;
}

/**
 * Does the title SoundCloud answers match the computed one?
 *
 * The oEmbed `title` is NOT the bare title of the track: SoundCloud appends the
 * uploader, `<track title> by <account name>`. Measured on the lab on
 * 2026-10-03 (plan 52.3-12, P-523-F step 1): for the LiveCut of the first
 * RamaDub event the oEmbed answered `<artist> @ RamaDub - 17 Sept 26 by
 * re:sonate` while the track's own title is `<artist> @ RamaDub - 17 Sept 26`
 * — equal to the computed title — and the admin warning «SoundCloud's title is
 * different» fired on a title that is not different. Same shape on the
 * fictitious sample track (`Flickermood by Forss`).
 *
 * So the comparison accepts the exact string OR the string followed by
 * ` by <anything>`. A title that differs before ` by ` still warns.
 */
export function matchesSoundCloudTitle(oembedTitle: string | null, computed: string): boolean {
  if (oembedTitle === null) return false;
  return oembedTitle === computed || oembedTitle.startsWith(`${computed} by `);
}

/** The event key: `Lab Series 002` (fictitious), or the bare series name when the number is null. */
export function nightKey(seriesName: string, number: number | null): string {
  return number === null ? seriesName : `${seriesName} ${String(number).padStart(3, "0")}`;
}

/** `2026-09-03` → `Thu 3 Sept 26` (fictitious example). */
export function civilDateLabel(civilDate: string): string {
  const { y, m, d } = splitCivilDate(civilDate);
  const weekday = WEEKDAYS[new Date(Date.UTC(Number(y), m - 1, d)).getUTCDay()];
  return `${weekday} ${d} ${MONTHS[m - 1]} ${shortYear(y)}`;
}

/** `"23:30:00"`, `"01:00:00"` → `23:30–01:00` (en dash). */
export function slotLabel(start: string, end: string): string {
  return `${start.slice(0, 5)}–${end.slice(0, 5)}`;
}

/** `5320` → `1:28:40`; `2885` → `48:05`. */
export function durationLabel(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}

const DURATION_HMS_RE = /^(\d+):(\d{2}):(\d{2})$/;
const DURATION_MS_RE = /^(\d+):(\d{2})$/;

/**
 * `h:mm:ss` or `mm:ss` → seconds. `null` when minutes or seconds are ≥ 60, or
 * when the result is outside (0, 86400).
 */
export function parseDuration(text: string): number | null {
  const value = text.trim();
  let h = 0;
  let m: number;
  let s: number;
  const hms = DURATION_HMS_RE.exec(value);
  if (hms) {
    h = Number(hms[1]);
    m = Number(hms[2]);
    s = Number(hms[3]);
  } else {
    const ms = DURATION_MS_RE.exec(value);
    if (!ms) return null;
    m = Number(ms[1]);
    s = Number(ms[2]);
    // `mm:ss` — minutes under an hour; longer goes through `h:mm:ss`.
  }
  if (m >= 60 || s >= 60) return null;
  const total = h * 3600 + m * 60 + s;
  if (total <= 0 || total >= 86400) return null;
  return total;
}
