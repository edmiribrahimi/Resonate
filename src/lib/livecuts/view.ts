/**
 * The shapes the Music page, the player and the admin read.
 *
 * Types only — no runtime code. The query layer builds these from
 * `LiveCutRow` / `LiveCutArtistRow` (`src/types/database.ts`); the page and the
 * player never see a database row.
 *
 * This repository is public: no example in this file carries a real artist
 * name, a real date or a place.
 */

/**
 * The families of recordings the Music page knows about. Today: one.
 *
 * The Podcast — mixes sent by djs who might be booked — will get its own
 * table, its own title and its own section WHEN it exists (MUS-08,
 * `production-calendar.md`): a podcast is the mix of someone who is not on a
 * line-up, and showing it beside the LiveCuts with the same look would read as
 * an announcement. So today there is no string, no component and no
 * placeholder for it — only this one-member type, which is where the second
 * member will be added.
 */
export type MusicFamily = "livecut";

/** One artist credited on a LiveCut, linked to `/artists/<slug>`. */
export interface LiveCutArtistView {
  name: string;
  slug: string;
}

/** One LiveCut — one recording per timetable slot (a b2b is one, with two artists). */
export interface LiveCutView {
  id: string;
  /** Order inside the event; slots are sorted by this, never by clock time (00:30 comes after 22:00). */
  partNumber: number;
  /** `HH:MM[:SS]`, the slot as it stood on the timetable. */
  slotStart: string;
  slotEnd: string;
  /** Typed by the owner: the oEmbed answer carries no duration. */
  durationSeconds: number;
  coverUrl: string;
  soundcloudUrl: string;
  /** Text, not a number: the widget uses it as a string. */
  soundcloudTrackId: string;
  mixcloudUrl: string | null;
  artists: LiveCutArtistView[];
  /** Computed by `liveCutTitle` — never stored. */
  title: string;
  /** The FORMAT of the event (`formats.name`), never the series name. */
  formatName: string;
  formatSlug: string;
  formatColor: string;
}

/** One event and its LiveCuts, the block the page renders. */
export interface NightBlock {
  partyId: string;
  eventSlug: string;
  /** `nightKey(series, number)` — e.g. `Lab Series 002` (fictitious). */
  key: string;
  /** Civil date `YYYY-MM-DD`. */
  date: string;
  time: string | null;
  endTime: string | null;
  liveCuts: LiveCutView[];
}
