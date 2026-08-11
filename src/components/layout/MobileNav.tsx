"use client";

import AppNav from "@/components/layout/AppNav";
import type { UserRole, UserStatus } from "@/types/database";
import type { CapabilityKey } from "@/lib/capabilities/keys";

/**
 * The bottom navigation, locked to its phone form — and the fence that keeps
 * Phase 41 out of Phase 42's territory.
 *
 * ── Why this file still exists (D-41-21) ─────────────────────────────────────
 *
 * `src/app/(admin)/admin/scanner/DoorSurface.tsx` imports this module, and
 * `src/app/(admin)/door/page.tsx` is a thin shell over it. **Both are inside
 * Phase 42's declared paths**, which this phase does not open — not to fix an
 * import, not to add a comment.
 *
 * The rename was never the question. The question is that **the door mounts the
 * navigation**, so letting `AppNav`'s responsive form reach it would put a
 * 224 px column on a scanner screen — a tablet at an entrance losing that much
 * width to navigation is a change to the door's surface, delivered by a phase
 * whose scope fence says the door is Phase 42's.
 *
 * So: `AppNav` carries both tiers, and this file renders it **locked to the
 * phone form**. The door's layout ends this phase byte-for-byte as it began,
 * and zero Phase 42 files are edited. This is the mechanism that holds the
 * fence, not a rename dodge.
 *
 * **Phase 42 deletes this file** when it converts the door and decides what the
 * door should look like at tablet width — which is its decision, not this
 * phase's. Until then one file in the tree carries a name describing a tier the
 * primitive no longer has. That cost is accepted, and it is written here rather
 * than discovered.
 *
 * ── The prop type is byte-compatible with what the 13 mount sites pass ───────
 *
 * Unchanged, deliberately, including the requiredness below.
 */
interface MobileNavProps {
  role: UserRole | null;
  status: UserStatus | null;
  /**
   * Held by role. Empty for an anonymous visitor — `ANONYMOUS_CONTEXT`.
   *
   * **Required, deliberately.** All 13 mount sites pass it, so a fourteenth
   * that forgets is a build error naming the file rather than a surface that
   * compiles, renders, and draws a plausible but wrong navigation — which this
   * repository has no error tracking to notice.
   */
  capabilities: readonly CapabilityKey[];
  /**
   * Held by a live per-night assignment, or `null` when the payload did not
   * carry the key. `null` is **not** flattened to `[]` on the way in: absent and
   * empty are different facts (`capabilities/server.ts`).
   */
  liveAssignmentCapabilities: readonly string[] | null;
}

export default function MobileNav(props: MobileNavProps) {
  return <AppNav {...props} form="phone" />;
}
