"use client";

import Link from "next/link";
import type { CapabilityKey } from "@/lib/capabilities/keys";
import { visibleStaffTabs } from "@/lib/routes/staff-tabs";
import CollapsibleSection from "@/components/account/CollapsibleSection";
import { FOCUS_RING } from "@/components/ui/Button";

/**
 * The Management Tools list on the account page — the third hand-maintained
 * menu, and the one most likely to be forgotten.
 *
 * It held **two** literal lists, one of seven addresses and one of four, picked
 * by a `role: "master" | "organizer"` prop. Both are gone. The seven surfaces
 * are declared once, in `src/lib/routes/staff-tabs.ts`, which reads the same map
 * the middleware reads (`src/lib/routes/capability-routes.ts`), and this list is
 * that declaration filtered by what the viewer holds — through the same
 * `visibleStaffTabs` call the tab bar makes. One filter, one list, no second
 * copy to fall behind.
 *
 * ── Hiding a nav item is not protecting a route ──────────────────────────────
 *
 * A link is drawn here only when the viewer holds the capability the middleware
 * will ask for at that address (STAFF-03). That holds in **one** direction. The
 * converse is not true and is not claimed: **hiding a nav item is not protecting
 * a route.** Nothing here refuses anybody — the middleware refuses, and the RLS
 * policies in the migrations are the boundary on the data.
 * `access-gating.md`, gate *coerenza navigazione/permessi*.
 *
 * This is a `"use client"` component: it receives the resolved keys as props and
 * never imports the resolver or the guard helpers under `src/lib/capabilities/`.
 * A capability check that moved from the server to the browser would be a check
 * the viewer can edit.
 */
interface ManagementSectionProps {
  /** The keys resolved server-side for this viewer. Serialisable — an array, not a `Set`. */
  capabilities: readonly CapabilityKey[];
}

export default function ManagementSection({
  capabilities,
}: ManagementSectionProps) {
  const links = visibleStaffTabs(capabilities);

  return (
    <div className="border-t border-line pt-6 mt-6">
      <CollapsibleSection title="Management Tools" defaultOpen>
        <div>
          {/*
            Each entry is a navigation target, so it declares the 44 px floor
            and carries the focus expression. The separator keeps a line token:
            it is the edge of a row and not the boundary of a control, which is
            the triage `ui/Card.tsx:20-33` states both halves of.
          */}
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`flex min-h-11 items-center justify-between py-3 border-b border-line last:border-0 ${FOCUS_RING}`}
            >
              <span className="text-sm font-medium text-ink">
                {link.label}
              </span>
              <span className="text-muted">&rsaquo;</span>
            </Link>
          ))}
        </div>
      </CollapsibleSection>
    </div>
  );
}
