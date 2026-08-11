import DoorSurface from "./DoorSurface";

/**
 * `/admin/scanner` — the door's first address, kept.
 *
 * It is kept **permanently**, and as a **real page, never a redirect**
 * (D-39-02). The reason is STAFF-04's own justification for existing as a phase
 * of its own: a redirect needs a network the door is designed not to have. This
 * address is not deprecated on a timer and is not removed in a later phase — it
 * is part of the deliverable.
 *
 * The guard, the `ScannerClient` mount and the `MobileNav` mount all live in
 * `./DoorSurface`, which `/door` mounts too. The long explanation of the gate
 * moved there with it, because it explains the gate rather than this address.
 */
export default async function ScannerPage() {
  return <DoorSurface />;
}
