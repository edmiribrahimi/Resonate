import { redirect } from "next/navigation";
import { getAccessContext } from "@/lib/capabilities/server";
import { CAP } from "@/lib/capabilities/keys";

/**
 * `/admin` — the entrance to the work surface, and until now a door with no
 * lock on it.
 *
 * **Finding F2.** This page was four lines: `redirect("/admin/events")`, with
 * **no gate at all**. It was held up solely by `src/lib/supabase/middleware.ts`'s
 * `/admin/*` prefix rule — and D-34-02 dissolves that rule, because after the
 * collapse `/admin` is an address and not an authorisation. Closing this is
 * therefore not an improvement bolted onto the move: it is a consequence of it.
 * Leaving the redirect ungated while the rule that protected it disappears
 * would hand `/admin` to anybody with a session.
 *
 * **`organizer.access`, and not `admin.access`.** It is the binding plan 34-01
 * gave `/admin` in `src/lib/routes/capability-routes.ts`, and it is the LEAST
 * of the capabilities any collapsed surface needs, so the root refuses an
 * unentitled visitor before the redirect runs without refusing an organizer who
 * is entitled to everything the redirect leads to. Gating the root on
 * `admin.access` would close `/admin` to the master alone and bounce every
 * organizer off the entrance to their own area.
 *
 * The refusal is `redirect("/dashboard")` — the same shape every other page in
 * this tree uses, not a 404 and not a bare 403 (D-34-08, state 2).
 *
 * `getAccessContext()` is resolved by `(work)/layout.tsx` for the whole tree and
 * is `cache()`-scoped per request, so asking it again here costs no round trip.
 * It is not wrapped in `try/catch`: a resolve failure stays a throw.
 */
export default async function AdminPage() {
  const { capabilities } = await getAccessContext();

  if (!capabilities.has(CAP.ORGANIZER_ACCESS)) {
    redirect("/dashboard");
  }

  redirect("/admin/events");
}
