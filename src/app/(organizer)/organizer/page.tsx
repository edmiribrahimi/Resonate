import { redirect } from "next/navigation";

/**
 * Dead already, and now pointing at an address that exists.
 *
 * `ORGANIZER_REDIRECTS` row 1 translates `/organizer` to `/admin/events` in the
 * middleware, before route resolution, so this body does not run. Its literal
 * still had to move: plan 34-11 deleted `/organizer/events/page.tsx`, which took
 * that address out of the generated route union, and `typedRoutes` refuses a
 * `redirect()` to a page that is not there — turning a dead line into a build
 * failure for the whole tree.
 *
 * Plan 34-15 deletes this file. Retargeting rather than waiting for it keeps
 * `npm run build` green in between, which in a repository with no CI and no test
 * runner is the only gate there is.
 */
export default function OrganizerPage() {
  redirect("/admin/events");
}
