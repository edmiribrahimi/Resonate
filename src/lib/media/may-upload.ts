import "server-only";

import { getAccessContext } from "@/lib/capabilities/server";
import { CAP } from "@/lib/capabilities/keys";

/**
 * may-upload.ts — may this account file a photograph in the visual archive?
 *
 * ── Why the imports sit ABOVE this block ─────────────────────────────────────
 * The plan's acceptance criterion greps `head -3` of this file for
 * `server-only`. Written in the usual order — docblock first, imports after —
 * the check would read three lines of prose and fail on a file that satisfies
 * it. Same discipline, and the same reason, as
 * `src/lib/media/strip-metadata.ts:1-15`.
 *
 * `import "server-only"` resolves without a package: Next aliases it to
 * `next/dist/compiled/server-only`. Nothing was installed for this file, and
 * that is worth saying, because `src/lib/capabilities/server.ts:13-19` records
 * the opposite belief ("`server-only` is not a dependency of this repository")
 * — which was true of `package.json` and never of the resolver.
 *
 * ── 2026-10-02, DBT-13 (D-52.1-17): the per-night question LEFT with the gallery
 * `mayUploadToParty` and its refusals went with the event gallery; what stays is
 * `mayUploadToVisualSection`, because the visual archive still uploads.
 *
 * ── Why it is a module and not an export of an `actions.ts` ──────────────────
 * A file marked `"use server"` publishes **every** export as a public endpoint.
 * Leaving a predicate there and exporting it — so that a persistence route
 * could reuse it — would publish an oracle answering *"may this person
 * upload?"* to anyone who calls it. A plain module has no such behaviour: the
 * route that finalises an archive upload (`api/media/finalize-archive`)
 * imports ONE definition and does not become an extra door.
 *
 * ── It names no night, and that is not an omission ─────────────────────────
 *
 * The dj photograph archive has **no night**, and that is not an omission in its
 * model: it is the entire reason the archive exists. The listing goes out two
 * days before the night, so THAT NIGHT'S PHOTOGRAPH CANNOT EXIST YET — at an
 * artist's first date there is only their press photo, and from the second the
 * piece is pulled from an archive somebody has been building
 * (`brand-visual-system.md`, gate *l'archivio precede il listing*). A photograph
 * filed on a Thursday is filed for a listing nobody has scheduled.
 */

/**
 * The visual section's key was not held. A permission verdict.
 *
 * Spelled exactly as `visual/actions.ts` spells its own refusal, so that a
 * person refused by the archive upload and a person refused by the capitolato
 * write read the same words about the same key. Two spellings of one refusal are
 * two things to fix when the key is renamed, and only one would be found.
 */
export const MEDIA_VISUAL_UPLOAD_FORBIDDEN =
  "forbidden.production_visual_manage_required";

/**
 * May the current session file a photograph in the visual section's archive?
 *
 * **It names no night, and it cannot be given one.** See the paragraph in the
 * header: the archive precedes the listing, which precedes the night, so a
 * signature that accepted a party would be asking a question the archive has no
 * answer to — and would invite a caller to pass `null`.
 *
 * ── ONE ARM, AND IT IS THE SECTION'S OWN KEY ────────────────────────────────
 *
 * `production.visual.manage` and nothing else. Not `staff.manage`, which says
 * nothing about who owns the brand's material; not `admin.access`, which is the
 * master alone. D-45-06 makes the key that READS a section the key that WRITES
 * it, and filing a photograph in the archive is a write to that section — so
 * the archive upload and the capitolato write are refused and admitted
 * together, by construction rather than by two checks that agree today.
 *
 * ── WHAT THIS DOES **NOT** DECIDE, and the reader must find it here ─────────
 *
 * Widening WHO may file does not widen WHAT IS STRIPPED. The archive raises the
 * stakes rather than lowering them: an archive photograph is **kept for
 * months** and is drawn on for a listing, so an un-stripped file there is a
 * reveal path that stays open long after the upload is forgotten. The strip is
 * `src/lib/media/finalize.ts`'s, on the one path every destination shares, and
 * *a file that has not been stripped is reachable by nobody* is a property of
 * that module and of the destination bucket's policies — never of this
 * predicate.
 *
 * ── The identity backstop, and why it is a refusal rather than a throw ──────
 *
 * `getAccessContext` resolves the caller from the cookie-bound session. With no
 * identity there is no capability set worth asking, and the route above this one
 * has already refused an anonymous caller with its own category by the time
 * execution reaches here.
 */
export async function mayUploadToVisualSection(): Promise<boolean> {
  const ctx = await getAccessContext();

  if (!ctx.userId) {
    return false;
  }

  return ctx.capabilities.has(CAP.PRODUCTION_VISUAL_MANAGE);
}
