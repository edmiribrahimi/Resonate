import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getAccessContext } from "@/lib/capabilities/server";
import { CAP } from "@/lib/capabilities/keys";
import MobileNav from "@/components/layout/MobileNav";
import AnimatedSection from "@/components/motion/AnimatedSection";
import StaffNav from "@/components/staff/StaffNav";
import EventList from "@/components/events/EventList";
import type { UserRole, UserStatus } from "@/types/database";

export default async function OrganizerEventsPage() {
  // Identity and capabilities come from the session, not from an inbound
  // request header a client can set.
  const { capabilities, userId, role, status } = await getAccessContext();

  // Reachability: "may this person reach the organizer area" —
  // `organizer.access`, `keys.ts:64`, the same question the middleware asks
  // for `/organizer/*`.
  if (!capabilities.has(CAP.ORGANIZER_ACCESS)) {
    redirect("/dashboard");
  }

  // Narrow `userId` from `string | null` to `string` before it reaches the
  // filter below. Unreachable in practice — `organizer.access` is only ever
  // granted to an authenticated subject, and an anonymous caller resolves to
  // the empty set and was already sent away above.
  //
  // NOT `userId ?? ""`. The two are different requests on the wire, not two
  // spellings of one: postgrest-js serialises the value through a template
  // literal (`PostgrestFilterBuilder.ts:115`,
  // `searchParams.append(column, ` + "`eq.${value}`" + `)`), so `null` leaves as
  // `created_by=eq.null` and `""` leaves as `created_by=eq.`. Sending either
  // one silently is how a list page starts returning a set nobody asked for.
  //
  // ⚠️ MEASURED, and it is the reason this line is written rather than assumed:
  // **the typechecker does not enforce it.** Removing this block entirely and
  // passing `string | null` straight to `.eq()` produces NO error, and so does
  // passing an object literal — both were tried, the mutation was asserted
  // applied, and `npx tsc --noEmit` stayed green for both. The cause is the one
  // `keys.ts:22-24` already names: no Supabase client in this repository is
  // parameterised with a `Database` generic, so `eq()`'s value argument
  // degrades to an unchecked type and its `NonNullable` constraint never bites.
  // `npm run build` is this project's only automatic gate, and on this line it
  // is blind. This runtime refusal is the whole guard.
  if (!userId) {
    redirect("/dashboard");
  }

  // The resolver types these `string | null` deliberately, so that no decision
  // can branch on them. They are not a decision here: they are props for two
  // `"use client"` navs that cannot import the DAL. Phase 34 (STAFF-03)
  // converts the navs and this pass-through goes with them.
  const navRole = role as UserRole | null;
  const navStatus = status as UserStatus | null;

  const supabase = await createClient();

  const query = supabase
    .from("events")
    .select("id, title, date, is_published, created_by")
    .order("date", { ascending: false });

  // Master sees all; everyone else who reached this page sees their own.
  //
  // The polarity is deliberately "NOT master" rather than "IS organizer", and
  // that flip is the point of this line. Today the truth table is identical —
  // a master holds `master.manage` and gets the unfiltered query, an organizer
  // does not and gets `created_by = <their id>` — so this changes no verdict
  // for the three roles that exist. It changes what happens to the fourth.
  // `staff` arrives one phase later and grants no work permission; under the
  // old allow-list of one — a bare equality against the organizer role — a
  // `staff` account that reached this page would fail that equality, skip the
  // filter entirely, and see EVERY organizer's events.
  // Under a deny-list it inherits the narrow scope and sees its own, which is
  // none. A new role lands on the safe side by default, without anyone having
  // to remember this file.
  //
  // The key is `master.manage` because the question is "may this person manage
  // events they do not own" — the reserved-operation question `keys.ts:55`
  // names. Not `admin.access`, which asks "may they reach the admin area"; this
  // page is not in the admin area. The two are granted to the same role today
  // and are not the same question, and picking by predicate instead of by
  // question is invisible until the day the grants diverge.
  //
  // This scope is a filter written in Node, not a security boundary. What a
  // caller may actually read from `events` is decided by the row-level
  // policies; this decides what the page asks for.
  if (!capabilities.has(CAP.MASTER_MANAGE)) {
    query.eq("created_by", userId);
  }

  const { data: events, error } = await query;

  if (error) {
    return (
      <div className="min-h-dvh pb-24">
        <header className="flex items-center justify-between px-6 pt-12 pb-6">
          <h1 className="text-3xl font-bold tracking-tight">Events</h1>
        </header>
        <div className="px-6">
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-center">
            <p className="text-red-400">
              Failed to load events: {error.message}
            </p>
          </div>
        </div>
        <MobileNav role={navRole} status={navStatus} />
      </div>
    );
  }

  return (
    <div className="min-h-dvh pb-24">
      <AnimatedSection>
        <header className="flex items-center justify-between px-6 pt-12 pb-6">
          <h1 className="text-3xl font-bold tracking-tight">Organizer</h1>
          <Link
            href="/organizer/events/new"
            className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
          >
            Create Event
          </Link>
        </header>
      </AnimatedSection>

      <StaffNav capabilities={[...capabilities]} />

      <AnimatedSection delay={0.1} className="px-6">
        <EventList events={events ?? []} />
      </AnimatedSection>

      <MobileNav role={navRole} status={navStatus} />
    </div>
  );
}
