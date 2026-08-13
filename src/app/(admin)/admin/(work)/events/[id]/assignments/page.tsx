import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getServiceClient } from "@/lib/supabase/service";
import { getAccessContext } from "@/lib/capabilities/server";
import { ownsOrIsMaster } from "@/lib/capabilities/guards";
import { CAP } from "@/lib/capabilities/keys";
import AssignmentsClient from "@/app/(admin)/admin/events/[id]/assignments/AssignmentsClient";
import { PageShell } from "@/components/ui/PageShell";
import { PageTitle } from "@/components/ui/Typography";
import { Card } from "@/components/ui/Card";
import { FOCUS_RING } from "@/components/ui/Button";
import type { AssignableCapability } from "@/app/(admin)/admin/events/[id]/assignments/actions";
import type { UserRole } from "@/types/database";

/**
 * Who works this night — the surface for ASSIGN-01 and ASSIGN-03.
 *
 * ── Where this lives, and why it moved ───────────────────────────────────────
 *
 * It used to live in the organizer tree and said so, deferring its address to
 * phase 34. This is that phase (D-34-03): the surface has **no `/admin` twin**,
 * so this was a move and not a merge, and the prior address answers with a
 * redirect emitted by `src/middleware.ts`.
 *
 * The file sits inside the `(work)` route group, which changes no URL — it is a
 * LAYOUT boundary, not an address, and it exists so that `admin/(work)/
 * layout.tsx` reaches every collapsed work surface without reaching
 * `/admin/scanner`. Measured on this move rather than assumed: `(work)/events/
 * [id]/assignments/` inside the group coexists with `admin/events/[id]/{edit,
 * tickets,sales,…}/` outside it, sharing the same `/admin/events/[id]/` prefix
 * and the same `[id]` slug name, and `next build` lists this page as
 * `/admin/events/[id]/assignments` with no `(work)` in it.
 *
 * Its two former siblings — `actions.ts` and `AssignmentsClient.tsx` — did NOT
 * come into the group. R-WORK-ROUTES (plan 34-07): only route files enter
 * `(work)`, because a route group governs routing and nothing else. That is why
 * the two imports above are absolute.
 *
 * ── The error state is not the empty state, and that is the part not to
 *    simplify ──────────────────────────────────────────────────────────────────
 *
 * `[]` is a VALID answer on every read below — "nobody is assigned to this
 * night" — so a transient failure collapsed into `?? []` would render as a night
 * with no staff. This repository has **no error tracking** (`meta-gates.md`), so
 * the `console.error` reaches nobody: the screen is the only observer. And the
 * error it would hide is the one that matters, because an organizer looking at
 * an apparently empty roster the afternoon of the night assigns somebody who is
 * already assigned, or worse concludes nobody is covering the door.
 *
 * The outcome is decided by POSITION — `error` truthy or not — never by
 * inspecting a message.
 */

interface PageProps {
  params: Promise<{ id: string }>;
}

/** What the surface shows about a person: a name and the door's credential. Never an address. */
type RosterEntry = {
  id: string;
  full_name: string;
  membership_code: string;
  role: UserRole;
};

type LiveAssignment = {
  party_id: string;
  user_id: string;
  capability: AssignableCapability;
  granted_at: string;
};

export default async function AssignmentsPage({ params }: PageProps) {
  const { id: eventId } = await params;

  // Identity from the session, not from an inbound header.
  const ctx = await getAccessContext();

  // Defense in depth, and it stays (D-34-09): the middleware and this page give
  // the same verdict because they read the SAME entry —
  // `/admin/events/[id]/assignments` is bound to `organizer.access` in
  // `src/lib/routes/capability-routes.ts`. A page that stops asking is a page
  // protected by a redirect alone, and `access-gating.md` is explicit that a
  // redirect is not a boundary.
  //
  // The two nav mounts and the two `as UserRole` / `as UserStatus` casts that
  // stood here are gone: `admin/(work)/layout.tsx` resolves the context once for
  // the whole tree and draws both navs (D-34-07). `getAccessContext` is
  // `cache()`-scoped per request, so this second ask costs no round trip.
  if (!ctx.capabilities.has(CAP.ORGANIZER_ACCESS)) {
    redirect("/dashboard");
  }

  const supabase = await createClient();

  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id, title, created_by")
    .eq("id", eventId)
    .single();

  // The collapsed address, not the prior one. Both refusals below used to send
  // the caller to `/organizer/events`, which now answers with a redirect to
  // `/admin/events` — so the destination is unchanged and only the hop is gone.
  // Verdict-identical by construction: this branch is only reached by somebody
  // who already cleared `organizer.access` above, which is the key
  // `/admin/events` is bound to.
  if (eventError || !event) {
    redirect("/admin/events");
  }

  // Ownership — one call, never a re-inlined comparison.
  //
  // On this page the check carries more than an interface decision. Everything
  // below is read with the **service-role client**, which bypasses every
  // row-level policy (`access-gating.md`, gate *service role*). On those reads
  // there is no second boundary: this `if` is the only thing scoping them to an
  // event the caller may see.
  if (!ownsOrIsMaster(ctx, event.created_by)) {
    redirect("/admin/events");
  }

  const serviceClient = getServiceClient();

  const { data: parties, error: partiesError } = await serviceClient
    .from("event_parties")
    .select("id, title, date, time")
    .eq("event_id", eventId)
    .order("sort_order", { ascending: true });

  const partyList = (parties ?? []) as {
    id: string;
    title: string;
    date: string;
    time: string;
  }[];

  // The LIVE assignments of this event's nights.
  //
  // `.in()` on an empty array is a query with no possible answer, so it is not
  // asked: an event with no parties has no assignments, and that is an EMPTY
  // state and not a failed one. Keeping the two apart here is the same rule the
  // rest of this page follows.
  const assignmentsQuery = partyList.length
    ? await serviceClient
        .from("party_assignments")
        .select("party_id, user_id, capability, granted_at")
        .in(
          "party_id",
          partyList.map((p) => p.id)
        )
        .is("revoked_at", null)
        .order("granted_at", { ascending: false })
    : { data: [], error: null };

  const assignmentsError = assignmentsQuery.error;

  // Who may be assigned at all — D-A, held by the interface as well as by the
  // database.
  //
  // The composite foreign key refuses a live assignment to a `member`
  // (`23503`), so offering one here would produce a refusal the interface could
  // have avoided. The filter is the affordance; the foreign key is the boundary,
  // and the two are not the same thing: a Server Action is a public endpoint,
  // and `assignToParty` returns `assignee_not_staff` for a request that goes
  // round this list.
  const { data: roster, error: rosterError } = await serviceClient
    .from("profiles")
    .select("id, full_name, membership_code, role")
    .in("role", ["master", "organizer", "staff"])
    .order("full_name", { ascending: true });

  // ── One outcome for the whole load, decided by position ────────────────────
  //
  // Three reads, one verdict: if ANY of them failed, the page cannot honestly
  // draw a roster, because a partial answer here reads exactly like a complete
  // one. The category is logged with the code alone — never the field that
  // carries the failing row.
  const lookupFailed = partiesError ?? assignmentsError ?? rosterError ?? null;

  if (lookupFailed) {
    console.error(
      `[assignments.lookup_failed] could not read the assignments of ` +
        `${eventId}: ${lookupFailed.code ?? "unknown"}. This is NOT an empty ` +
        `list — nobody may be treated as unassigned on the strength of it.`
    );
  }

  const liveAssignments = (assignmentsQuery.data ?? []) as LiveAssignment[];
  const rosterList = (roster ?? []) as RosterEntry[];

  // `default` — this route is NOT on §4's closed `wide` list, and that is not a
  // fallback: it is the answer for every surface nobody had to argue about. The
  // roster is a short stack of night cards rather than a dense table, so the
  // content stops widening at 1024px.
  //
  // The shell owns the maximum, the gutter, the vertical rhythm and the
  // navigation clearance in both tiers, so this page writes none of them.
  return (
    <PageShell width="default">
      <header className="mb-6">
        {/*
          Still a `Link`: this is navigation inside the app and `next/link` is
          what keeps the client transition. What it gains is §6.1's 44px floor
          and the one focus expression, imported rather than re-spelled (§5.4).
        */}
        <Link
          href="/admin/events"
          className={`inline-flex min-h-11 items-center text-xs text-muted transition-colors hover:text-ink ${FOCUS_RING}`}
        >
          &larr; Back to Events
        </Link>
        <PageTitle>Who works</PageTitle>
        <p className="mt-1 text-sm text-muted">{event.title}</p>
      </header>

      {lookupFailed ? (
        // Every word of this refusal survives the conversion, and the assertive
        // role is added rather than traded for the ink: the raw red fill is gone
        // because §5 gives the alarm to one semantic ink with a computed
        // contrast (6.99 : 1 on the card ground) instead of to a colour family
        // with none, and §12 forbids colour being the only channel — so the
        // sentences and the role are what carry it now.
        <Card role="alert">
          <p className="text-sm font-semibold text-sem-crit">
            The assignments could not be loaded.
          </p>
          <p className="mt-2 text-sm text-ink">
            This is <strong>not</strong> an empty roster — the read failed. Do
            not assume a night is uncovered, and do not assign over somebody on
            the strength of this screen.
          </p>
          <p className="mt-3 text-xs text-muted">
            Reload the page. If it fails again, report this code:{" "}
            <code>{lookupFailed.code ?? "unknown"}</code>
          </p>
        </Card>
      ) : (
        <AssignmentsClient
          eventId={eventId}
          parties={partyList}
          assignments={liveAssignments}
          roster={rosterList}
        />
      )}
    </PageShell>
  );
}
