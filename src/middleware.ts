import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import {
  REDIRECT_STATUS,
  resolveOrganizerRedirect,
} from "@/lib/routes/organizer-redirects";

/**
 * ── This file is the FIRST importer of `organizer-redirects.ts`, and that
 *    changes where its fences fire ─────────────────────────────────────────────
 *
 * Plan 34-01 left the module with three module-load throws and one measured
 * warning: nothing imported it, webpack does not bundle an unreachable module,
 * so a mutation pointing a redirect at `/admin/scanner` still exited
 * `npm run build` 0. That warning stops being about "nothing imports it" here.
 *
 * **Measured on this tree, with this import in place** (plan 34-03, 2026-08-09):
 * the `/scanner` fence is STILL a runtime throw and `npm run build` still exits
 * 0 under that mutation. Importing the module gets it bundled; it does not get
 * it evaluated. Module-load code in a middleware bundle runs when the edge
 * runtime instantiates the bundle — that is **the first request**, not the
 * build. The half the build does carry is unchanged and is a type, not a throw:
 * `RedirectRow` types `from` as `` `/organizer${string}` `` and `to` as
 * `` `/admin${string}` ``, so a reverse row fails to compile.
 *
 * So: a row naming the door is caught **on the first request after deploy**, by
 * a 500 on every route this middleware covers — loud, immediate, and impossible
 * to miss, but after the deploy rather than before it. Written here rather than
 * only in a SUMMARY, because the person who adds a sixteenth row will read this
 * file and not that document.
 *
 * ── The matcher is deliberately byte-identical ────────────────────────────────
 *
 * Three measured reasons, none of them inertia. Server Functions are handled as
 * POST requests to the route where they are used, and this phase moves the
 * hosting routes of several server actions — a matcher edit can silently remove
 * proxy coverage from one. The door's `/api/tickets/checkin` passes through this
 * middleware on every scan, and `src/lib/supabase/middleware.ts:136-140` counts
 * that round trip. And `/membership-card` and `/attendance` are still judged
 * downstream and sit outside the collapsed tree.
 *
 * ── And the filename is deliberately unchanged ────────────────────────────────
 *
 * Next 16.0.0 deprecated the `middleware.ts` convention in favour of
 * `proxy.ts`. This repository is on `next@16.1.6` and builds. Renaming the most
 * safety-critical file in the repo in the same commit that rewrites what it does
 * would produce two changes that look like each other in a diff. It is recorded
 * as work for its own small plan, after Phase 39.
 */
export async function middleware(request: NextRequest) {
  // ── Address translation. It has no subject, and that is the requirement ─────
  //
  // `/organizer/*` and `/admin/*` are the same surface after this phase
  // (D-34-01). Which of the two addresses a request used is a fact about the
  // URL and about nothing else: not about who is asking, not about whether they
  // are signed in, and not about what they may do once they arrive.
  //
  // So this runs BEFORE `updateSession`, and the ordering is load-bearing in a
  // way that has nothing to do with permissions. A response that varies by
  // viewer without a `Vary` is a response a shared cache can hand to the wrong
  // person, and with `REDIRECT_STATUS` due to become 308 that response is one a
  // browser keeps. This redirect reads one string, carries no cause, sets no
  // header and reaches no session.
  //
  // The check for that is mechanical: a grep for the stem of the permission
  // model's own noun must return **0** over this file. The vocabulary of that
  // model may not appear in an address translation — not even inside a comment
  // asserting that it does not, which is why this paragraph names the stem
  // nowhere and describes it instead. A criterion a comment can defeat is a
  // criterion nobody can run; the first draft of this very paragraph defeated
  // it twice.
  //
  // `clone()` rather than a fresh URL, so the query string survives the hop:
  // `?party=<id>` on the review surface is the parameter the per-night gate
  // downstream resolves the night from, and dropping it here would turn a
  // working link into a refusal that looks like a permission problem.
  //
  // `REDIRECT_STATUS` is **307 while the phase is in flight** (D-34-15). The
  // flip to 308 belongs to plan 34-17, after the fifteen-address walk is green,
  // and is deliberately not made here: a 308 cannot be withdrawn from a client
  // that has already cached it, and this project has no error tracking that
  // would notice it had been sent.
  const destination = resolveOrganizerRedirect(request.nextUrl.pathname);
  if (destination !== null) {
    const url = request.nextUrl.clone();
    url.pathname = destination;
    return NextResponse.redirect(url, REDIRECT_STATUS);
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
