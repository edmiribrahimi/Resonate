"use server";

import { CAP } from "@/lib/capabilities/keys";
import { getAccessContext } from "@/lib/capabilities/server";
import { buildSoundManifesto } from "@/lib/production/export/manifesto";
import type { ExportResult } from "@/lib/production/sections/export-contract";

/**
 * The one arm that produces the sound manifesto — this section's key, and
 * nothing else.
 *
 * ── A SEPARATE FILE, FOR THE REASON THE WRITE PATH IS TWO FILES ─────────────
 *
 * Every export of a `"use server"` module is a **public endpoint with a
 * convenient signature**, invocable with a forged body by anybody who can reach
 * the deployment. D-45-06 makes the key that reads a section the key that writes
 * it, and the same follows for the key that carries it out of the building: one
 * shared export module would publish this document's endpoint to a holder of the
 * other authored section's key, and no build, no policy and no log would say so.
 * The sibling arm one directory over asks a different constant; this file names
 * exactly one, and that is a mechanical assertion rather than a promise.
 *
 * ── THE ARM DOES NOT QUERY, AND THAT IS WHAT MAKES THE PROOF WORTH ANYTHING ─
 *
 * There is no read here of any kind. The serialiser owns every one of them, so
 * the import closure `scripts/verify-section-export.mjs` walks from that module
 * is the **whole story** of what this document can reach. A read performed here
 * would be a read outside the thing being checked — a hole in the closure, with
 * the gate still reporting green over it.
 *
 * ⚠ The gate walks **outward from the serialiser**, and this file sits on the
 * other side of that arrow: it imports the serialiser, so the walk never arrives
 * here. The narrowness of this file is therefore held by a `grep`, not by the
 * closure — which is why it does nothing but ask a key and pass the result on.
 * That limit is recorded in the plan's summary rather than left for somebody to
 * discover by trusting a green.
 *
 * ── The gate asks one key, once, and is deliberately not exported ───────────
 *
 * Being imported from a page a capability opened protects nothing
 * (`nextjs-architecture.md`, gate *server action autorizzata*). It is called
 * FIRST, and it is not exported, for the reason `calendar/actions.ts:78-82`
 * gives — an exported predicate is an oracle.
 *
 * ⚠ **There is no identity check here, and the absence is deliberate.** The
 * sibling write module throws a second, separate category when the access
 * context resolves no caller id, because every row it writes carries
 * `updated_by`. This act writes nothing and attributes nothing, so an identity
 * check here would gate no column — and a check that guards nothing suggests
 * something is being recorded when nothing is. **Nothing records that a document
 * was produced**, and saying so is better than a ceremony that implies otherwise.
 *
 * ── Refusals are RETURNED, never thrown ────────────────────────────────────
 *
 * Next **redacts** the message of an error thrown out of a Server Action in a
 * production build (`src/lib/capabilities/server.ts:59-63`), so a cause carried
 * in a thrown message reaches the reader as a blank exactly where it counts —
 * and this product has no error tracking at all. Every failure the serialiser
 * knows about is a value with its own name; the single throw below is the gate
 * saying no, which the panel distinguishes by the shape of the failure and not
 * by reading a message it will not receive.
 */

/**
 * @throws `forbidden.production_manifesto_manage_required` — the answer is no.
 */
async function assertManifestoSection(): Promise<void> {
  const { capabilities } = await getAccessContext();

  if (!capabilities.has(CAP.PRODUCTION_MANIFESTO_MANAGE)) {
    throw new Error("forbidden.production_manifesto_manage_required");
  }
}

/**
 * Produce the sound manifesto as a document that can leave the building.
 *
 * What comes back is a filename and a body of Markdown. **No route serves it**:
 * the panel turns the string into a downloadable file in the browser, so there
 * is no second address for `capability-routes.ts` to bind and no URL somebody can
 * hold on to after their key is taken away.
 */
export async function exportSoundManifesto(): Promise<ExportResult> {
  // Asked FIRST, and once. Nothing is read before it answers.
  await assertManifestoSection();

  return buildSoundManifesto();
}
