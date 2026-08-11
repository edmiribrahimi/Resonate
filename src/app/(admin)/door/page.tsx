import DoorSurface from "@/app/(admin)/admin/scanner/DoorSurface";

/**
 * `/door` — the door's permanent address (D-39-01), chosen because in this
 * project `admin` in an address is an **address and not an authorisation**, and
 * the person working the door is not an administrator.
 *
 * `/admin/scanner` serves the same surface permanently and as a **real page,
 * never a redirect** (D-39-02): a redirect needs a network the door is designed
 * not to have.
 *
 * **Both addresses are opened by one entry in `capability-routes.ts`** — the
 * `door.operate` entry, whose `assignmentOpenable` is a property of the entry
 * and therefore admits the person rostered to tonight's door at *either* one —
 * and never by a second predicate.
 *
 * The file sits under `(admin)`, which contributes no URL segment, **so that
 * `npm run verify:routes` censuses it**: outside that group nothing would,
 * `_everyStaffRouteIsBound` cannot see a route that is not under `/admin`, and
 * the middleware's `isUnderWorkTree` fail-closed branch does not reach `/door`
 * either.
 */
export default async function DoorPage() {
  return <DoorSurface />;
}
