"use server";

import { CAP } from "@/lib/capabilities/keys";
import { getAccessContext } from "@/lib/capabilities/server";
import { buildVisualCapitolato } from "@/lib/production/export/capitolato";
import type { ExportResult } from "@/lib/production/sections/export-contract";

/**
 * The one arm that produces the visual capitolato — this section's key, and
 * nothing else.
 *
 * ── A SEPARATE FILE, FOR THE REASON THE WRITE PATH IS TWO FILES ─────────────
 *
 * Every export of a `"use server"` module is a **public endpoint with a
 * convenient signature**. D-45-06 makes the key that reads a section the key that
 * writes it, and the same follows for the key that carries it out of the
 * building: one shared export module would publish this document's endpoint to a
 * holder of the other authored section's key, and no build, no policy and no log
 * would say so. The sibling arm one directory over asks a different constant;
 * this file names exactly one.
 *
 * ── THE ARM DOES NOT QUERY ─────────────────────────────────────────────────
 *
 * There is no read here of any kind. The serialiser owns every one of them, so
 * the import closure `scripts/verify-section-export.mjs` walks from that module
 * is the whole story of what this document can reach — and on this document that
 * is the whole point: the capitolato goes to somebody outside the project, and
 * `venue-secrecy.md` calls it an exit route. A read performed here would be a
 * hole in the closure with the gate still reporting green over it.
 *
 * ⚠ The gate walks **outward from the serialiser**, so the walk never arrives at
 * this file: it is held by a `grep` and not by the closure. That limit is
 * recorded rather than left for somebody to discover by trusting a green.
 *
 * ── The gate asks one key, once, and is deliberately not exported ───────────
 *
 * Being imported from a page a capability opened protects nothing. It is called
 * FIRST, and it is not exported, for the reason `calendar/actions.ts:78-82`
 * gives — an exported predicate is an oracle.
 *
 * ⚠ **No identity check, deliberately.** This act writes nothing and attributes
 * nothing, so a check on the caller's id would gate no column — and a check that
 * guards nothing suggests something is being recorded when nothing is. **Nothing
 * records that a capitolato was produced or who it went to**, and that is worth
 * saying plainly about a document whose whole nature is to leave.
 *
 * ── Refusals are RETURNED, never thrown ────────────────────────────────────
 *
 * Next redacts the message of an error thrown out of a Server Action in a
 * production build, so a cause carried in a thrown message reaches the reader as
 * a blank. Every failure the serialiser knows about is a value with its own name;
 * the single throw below is the gate saying no.
 */

/**
 * @throws `forbidden.production_visual_manage_required` — the answer is no.
 */
async function assertVisualSection(): Promise<void> {
  const { capabilities } = await getAccessContext();

  if (!capabilities.has(CAP.PRODUCTION_VISUAL_MANAGE)) {
    throw new Error("forbidden.production_visual_manage_required");
  }
}

/**
 * Produce the visual capitolato as a document that can leave the building.
 *
 * What comes back is a filename and a body of Markdown. **No route serves it**:
 * the panel turns the string into a downloadable file in the browser, so there is
 * no second address for `capability-routes.ts` to bind and no URL that outlives
 * the key which produced it.
 */
export async function exportVisualCapitolato(): Promise<ExportResult> {
  // Asked FIRST, and once. Nothing is read before it answers.
  await assertVisualSection();

  return buildVisualCapitolato();
}
