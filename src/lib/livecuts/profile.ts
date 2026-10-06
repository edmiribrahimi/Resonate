/**
 * The SoundCloud profile behind the «Listen elsewhere» line (UI-SPEC §A.1,
 * block 3; option O-8).
 *
 * Set on 2026-10-06 (plan 52.3-23): the collective's public profile, the one
 * that hosts the LiveCuts the owner linked on 2026-10-03 and 2026-10-06. It
 * is ALSO the URL the player's widget loads (`MusicPlayer.tsx`): a profile is
 * a multi-sound widget, so ⏮/⏭ are `skip(i)` calls that never reload the
 * iframe — measured on Chrome and the iOS simulator (`52.3-SPIKE.md`,
 * «skip() sul profilo»). Were it `null` again the «Listen elsewhere» line
 * would unmount and the player would fall back to one `load()` per track.
 */
export const MUSIC_SOUNDCLOUD_PROFILE_URL: string | null = "https://soundcloud.com/resonatemotion";
