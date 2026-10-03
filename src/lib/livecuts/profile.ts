/**
 * The SoundCloud profile behind the «Listen elsewhere» line (UI-SPEC §A.1,
 * block 3; option O-8).
 *
 * It is `null` on purpose: the profile URL has not been given, and a profile
 * is not something to invent. While it stays `null` the «Listen elsewhere»
 * line is not mounted at all — no placeholder, no dead link. When the owner
 * gives the URL, this line is the only one that changes.
 */
export const MUSIC_SOUNDCLOUD_PROFILE_URL: string | null = null;
