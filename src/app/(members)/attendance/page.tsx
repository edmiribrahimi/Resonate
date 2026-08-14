import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAccessContext } from "@/lib/capabilities/server";
import AppNav from "@/components/layout/AppNav";
import { Card } from "@/components/ui/Card";
import { PageShell } from "@/components/ui/PageShell";
import { PageTitle } from "@/components/ui/Typography";
import type { UserRole, UserStatus } from "@/types/database";

/**
 * The member's own attendance list — converted by plan 41.2-07.
 *
 * ── Why this file is the plan's control surface ──────────────────────────────
 *
 * It is the cheapest surface in the phase: four legacy tokens, no money, no
 * address, no dialog, and — measured by `verify-touch-targets` in wave 0 — zero
 * interactive elements. So if anything goes wrong in this commit it is the
 * navigation pair itself and not the surface, which is the whole reason the pair
 * was landed here first and read by three heavier plans afterwards.
 *
 * ── The pair, and what each half is for ──────────────────────────────────────
 *
 * Check E of `scripts/verify-conversion.mjs` asks the navigation question twice
 * and the two answers disagree today. Its route table already called this
 * surface *mounting*, because the navigation was reached **through** the
 * phone-locked wrapper; its pairing uses `importsDirectly` and counted the same
 * file as **not** mounting. Mounting, for this conversion, means importing the
 * responsive form DIRECTLY — so the change is an import specifier and a
 * component name, and the clearance declaration lands in the same commit.
 * Without the second half the content slides UNDER the 224px column from 768px
 * up, which is the loud failure direction and is the one this pair exists for.
 *
 * ── What did not change, and on this surface that sentence is load-bearing ───
 *
 * **No capability check touched.** `AppNav` receives the same four props, in the
 * same order, that the phone-locked wrapper received — role, status, the
 * capability set, the live-assignment capability set. Width may change layout,
 * never membership (`41-UI-SPEC.md` §0 rule 5). This is the member area, where
 * what a person can see *is* the product, so nothing here merges, reorders or
 * simplifies a conditional deciding what a member sees, and no query moved.
 *
 * ── The list this page cannot yet draw ───────────────────────────────────────
 *
 * `attendances` is a hardcoded empty literal with a `TODO` above it, which is
 * why the empty branch is the only one that renders today. That predates this
 * plan and is untouched by it: a visual conversion that started fetching rows
 * would be a feature wearing a conversion's commit message. The list branch is
 * converted anyway, because a branch that does not render still ships its class
 * strings to the gates.
 */
export default async function AttendancePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // A pure nav-prop read: `role` and `status` are PRESENTATION here — nothing
  // on this page branches on them, and no capability key belongs in this file.
  // Only their source changed, from an inbound header to the session. The
  // route itself stays gated by the middleware on `membership.card.view`.
  const { role, status, capabilities, liveAssignmentCapabilities } =
    await getAccessContext();

  // TODO: fetch attendance records from Supabase
  const attendances: { event_title: string; date: string }[] = [];

  return (
    <>
      {/*
        The declaring half of check E's pairing. It wraps the SHELL; the
        navigation below is its SIBLING — the placement settled by
        `src/app/(public)/gallery/page.tsx:110-132`, where putting the
        navigation inside would satisfy the textual pairing and pad the column
        by its own clearance.

        The line is copied byte for byte from that file. Since D-41.1-01 the
        stylesheet's ambient value is zero at every width, so without it the
        content slides UNDER the 224px column from 768px up. The utility is
        written whole in the class list and is not spelled in this comment:
        Tailwind cannot tell a description from a use.
      */}
      <div className="md:[--nav-inset-inline-start:14rem]">
        {/*
          `default` and not `wide`: §4's wide list is closed and does not name
          this route. `focus` is not merely undeclared here, it is unavailable —
          check E fails any focus surface that mounts a navigation, and this one
          does. The shell owns the root, the maximum, the gutter and both
          navigation clearances, so this page writes none of them.
        */}
        <PageShell width="default">
          <header className="mb-6">
            <PageTitle>Your Attendance</PageTitle>
            <p className="mt-1 text-muted">
              {attendances.length} {attendances.length === 1 ? "event" : "events"} attended
            </p>
          </header>

          {attendances.length === 0 ? (
            /*
              The card's padding comes from the primitive rather than from this
              call site: the container owns the step §3.1 names, which is the
              whole of what adopting it buys. The copy is byte-identical.
            */
            <Card className="text-center">
              <p className="text-4xl mb-3">🎵</p>
              <p className="text-muted">
                No attendance recorded yet. Come to the next event!
              </p>
            </Card>
          ) : (
            <div className="flex flex-col gap-3">
              {attendances.map((att, i) => (
                /*
                  A row, not a card: it keeps its own radius and its own
                  padding, and takes the line and surface tokens. `Card` fixes
                  the container radius and would change the shape of a row for
                  no reason a reader could name.
                */
                <div
                  key={i}
                  className="flex items-center gap-4 rounded-xl border border-line bg-surface p-4"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10 text-accent">
                    ✓
                  </div>
                  <div>
                    <p className="font-medium">{att.event_title}</p>
                    <p className="text-sm text-muted">
                      {(() => { const d = new Date(att.date); const M = ["January","February","March","April","May","June","July","August","September","October","November","December"]; return `${d.getDate()} ${M[d.getMonth()]} ${d.getFullYear()}`; })()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </PageShell>
      </div>

      <AppNav
        role={role as UserRole | null}
        status={status as UserStatus | null}
        capabilities={[...capabilities]}
        liveAssignmentCapabilities={
          liveAssignmentCapabilities ? [...liveAssignmentCapabilities] : null
        }
      />
    </>
  );
}
