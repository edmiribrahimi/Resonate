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
  /**
   * Civil date `YYYY-MM-DD` of the event this LiveCut belongs to — for the
   * card's line (`civilDateLabel`); never `new Date()` on it.
   */
  date: string;
  /**
   * How many PUBLISHED LiveCuts the event has, counted before any filter: with
   * an artist filter, the PT2 card of a two-part event stays PT2. The `PT<n>`
   * badge shows only when this is ≥ 2 (`showsPartNumber`, owner's request of
   * 2026-10-05).
   */
  partCount: number;
  /** Amplitude peaks 0..255 from our own recording (plan 52.3-22); null = no waveform, the bar shows a plain line. */
  peaks: number[] | null;
}

/**
 * One event and its LiveCuts, the group the page renders.
 *
 * No series name, no progressivo, no event slug, no end time: the series key is
 * internal to us (owner's request 13, 2026-10-05) and the public page neither
 * reads nor composes it. The group has no visible heading; `date` and `time`
 * only order the groups (two events on the same day sort by start time).
 */
export interface NightBlock {
  partyId: string;
  /** Civil date `YYYY-MM-DD`. */
  date: string;
  time: string | null;
  liveCuts: LiveCutView[];
}
