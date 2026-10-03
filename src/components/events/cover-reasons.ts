/**
 * The cover refusal sentences, shared by the night form (`EventForm.tsx`) and,
 * from plan 52.3-10, the LiveCut form: both post to the same
 * `/api/media/finalize-cover`, so they read the same categories and must say
 * the same thing. Moved here unchanged from `EventForm.tsx` on 2026-10-03
 * (phase 52.3) — the texts are byte for byte the ones the night form showed.
 *
 * One sentence per way `/api/media/finalize-cover` can say no. A string record,
 * not a total one, because the categories cross HTTP as strings: an unknown one
 * falls back to a sentence that still prints it, never to a shared one.
 */
export const COVER_REASON_TEXT: Record<string, string> = {
  "event_cover.unauthenticated": "Your session has expired, so the cover was not published. Sign in again and retry.",
  "event_cover.bad_request": "The cover request was malformed and was refused. Reload the page and retry.",
  "event_cover.path_not_yours": "The uploaded file did not belong to this session, so it was refused. Reload the page and retry.",
  "event_cover.forbidden": "You do not have permission to change this night's cover.",
  "event_cover.event_not_found": "This night no longer exists, so its cover cannot be changed.",
  "event_cover.permission_unresolved": "We could not confirm your permission just now. Nothing was refused; try again in a moment.",
  "media_finalize.source_missing": "The uploaded file was not found on the server. Choose the image again.",
  "media_finalize.source_unreadable": "The server could not read the uploaded file just now. Try again in a moment.",
  "media_finalize.type_not_accepted": "Only JPEG, PNG and WebP images can be used as a cover.",
  "media_finalize.already_published": "This cover was already published by an earlier attempt. Choose the image again to retry.",
  "media_finalize.publish_failed": "The cover could not be written to storage just now. Try again in a moment.",
  "media_finalize.unexpected": "Something unforeseen stopped the cover. Try again; if it repeats, tell the team which night it was.",
  "media_strip.unsupported_type": "The file is not the image type it claims to be, so it was refused. Export it as JPEG or PNG and retry.",
  "media_strip.tool_unavailable": "The image processor is unavailable right now, so no cover can be published. Try again later.",
  "media_strip.failed": "The image could not be read — it may be damaged. Export it again as JPEG or PNG and retry.",
};
