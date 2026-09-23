import "server-only";

import { createClient } from "@/lib/supabase/server";

/**
 * Signed, short-lived addresses for event media — phase 52, NAV-07, D-52-25.
 *
 * ── WHY THIS EXISTS ─────────────────────────────────────────────────────────
 *
 * Until phase 52 every event photograph was drawn from `event_media.url`, a
 * public address on a public bucket: the row policy decided who SAW the row,
 * and anybody holding the address could fetch the object with no session at
 * all. A photograph taken inside a secret venue is material in exactly the
 * sense an address is (`venue-secrecy.md`), so the reader stops publishing and
 * starts signing: it reads the object's KEY (`storage_path`, backfilled by M1)
 * and asks Storage for an address that expires.
 *
 * ── THE SESSION CLIENT, DELIBERATELY ────────────────────────────────────────
 *
 * The signature is minted through the CALLER's session (`createClient()`),
 * never through the service role. The object policy M1 wrote,
 * `event_media_objects_select_by_row`, admits a SELECT on an object only when
 * a row in `event_media` pointing at it is visible to the caller — so a session
 * that cannot see the row cannot mint an address for its object, even if this
 * code were reached. As `signVisualAssets` puts it: the guard in the page is
 * the message, the policy is the boundary. Signing with the service role would
 * remove the boundary and leave only the message — an `if`.
 *
 * ── WHAT IT SIGNS, AND WHAT IT NEVER SIGNS ──────────────────────────────────
 *
 * Only rows the caller has ALREADY received from a query made under the same
 * session. It takes rows, not paths: there is no parameter through which a key
 * typed by somebody could arrive here, and this is a server module, not an
 * endpoint (the server-action directive would have made every export callable
 * from the browser — it is deliberately absent, and `server-only` above makes a
 * client import fail the build).
 *
 * ⚠ **The keys do not leave the server.** The answer is keyed by the ROW's
 * identifier, so a page hands its client components `id → signedUrl` and never
 * a pointer they could log, copy or link. The logs below carry a category and a
 * count, never a key and never an address.
 */

/**
 * How long a signed address on the gallery lives, in seconds.
 *
 * One hour, and the two directions it is chosen between are both real:
 *
 *   * **shorter** would expire under somebody watching: a video paused and
 *     resumed after the signature lapsed does not resume, and a thumbnail that
 *     fails to load is indistinguishable from an empty gallery;
 *   * **longer** is time in which an address forwarded into a chat still opens
 *     for somebody who does not hold `gallery.view`.
 *
 * The page is dynamic and signs again on every visit, so a lapsed address is
 * one reload away from a fresh one — that is what makes an hour enough.
 */
export const EVENT_MEDIA_SIGNATURE_SECONDS = 3600;

/**
 * How long a signed address on the moderation surface lives, in seconds.
 *
 * Five minutes, the archive's number (`ARCHIVE_SIGNATURE_SECONDS`), for the
 * archive's reason: what is under review is by definition NOT approved — it may
 * be rejected, it may carry a face or a place that must not go out — so the
 * window in which a copied address still works should be as short as the
 * surface allows.
 *
 *   * **shorter** would expire while the moderation grid is still loading on a
 *     phone connection, and a reviewer cannot judge a picture that did not
 *     arrive;
 *   * **longer** is time in which an address to an unmoderated photograph,
 *     pasted somewhere, still opens.
 *
 * Thumbnails are looked at, not played, so the video argument that sets the
 * gallery's hour does not apply here.
 */
export const EVENT_MEDIA_REVIEW_SIGNATURE_SECONDS = 300;

/**
 * The answer: addresses by row identifier, plus how many rows could not be
 * signed because they carry no key — or one refusal, with its cause.
 *
 * A row that is absent from `urls` is NOT silently dropped: the caller keeps it
 * in its list and the component says, in words, that the picture could not be
 * loaded.
 */
export type EventMediaSignatureResult =
  | { ok: true; urls: Record<string, string>; unsigned: number }
  | { ok: false; reason: "sign_failed" };

export async function signEventMedia(
  rows: readonly { id: string; storage_path: string | null }[],
  seconds: number
): Promise<EventMediaSignatureResult> {
  /*
    Rows without a key exist only in the window between this code's deploy and
    M2, which backfills again and sets the column NOT NULL. They are not signed
    — there is nothing to sign, and falling back to the public address would be
    the side channel this module closes — and they are COUNTED, with a category,
    so that a non-zero number in the logs is a finding and not a mystery. The
    number only: an identifier here would be the first step towards a key.
  */
  const signable = rows.filter(
    (row): row is { id: string; storage_path: string } =>
      typeof row.storage_path === "string" && row.storage_path !== ""
  );
  const unsigned = rows.length - signable.length;

  if (unsigned > 0) {
    console.error(
      `[gallery.unsigned_row] count=${unsigned} ` +
        "message=rows without a storage key were left unsigned and will be drawn as not loaded"
    );
  }

  if (signable.length === 0) {
    return { ok: true, urls: {}, unsigned };
  }

  const supabase = await createClient();

  // One call for the whole list: the question "may this session read these
  // objects" is asked per object by the policy, but a per-row request would be
  // one round trip per photograph on every render of the page.
  const { data: signed, error } = await supabase.storage
    .from("event-media")
    .createSignedUrls(
      signable.map((row) => row.storage_path),
      seconds
    );

  if (error || signed === null) {
    // Its own cause, kept apart from a failed read: the rows ARE there, only
    // the pictures are not. `code` and `message` come from Storage and do not
    // carry the keys that were asked for.
    const code =
      (error as { statusCode?: string; name?: string } | null)?.statusCode ??
      error?.name ??
      "unknown";
    console.error(
      `[gallery.sign_failed] code=${code} message=${error?.message ?? "storage returned no signatures"}`
    );
    return { ok: false, reason: "sign_failed" };
  }

  /*
    Back to row identifiers, by POSITION. `createSignedUrls` answers in the
    order it was asked and carries the path it signed; matching by position
    rather than by path means the keys are never held side by side with the
    answer beyond this line. An entry that failed on its own — the policy
    refused that one object, or it is missing from the bucket — arrives without
    an address and is simply absent from the map: the component draws that row
    as "could not be loaded", which is the honest shape of a partial answer.
  */
  const urls: Record<string, string> = {};
  signed.forEach((entry, index) => {
    const row = signable[index];
    if (row === undefined) return;
    if (typeof entry.signedUrl !== "string" || entry.signedUrl === "") return;
    urls[row.id] = entry.signedUrl;
  });

  return { ok: true, urls, unsigned };
}
