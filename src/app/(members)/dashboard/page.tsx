import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAccessContext } from "@/lib/capabilities/server";
import MobileNav from "@/components/layout/MobileNav";
import AnimatedSection from "@/components/motion/AnimatedSection";
import CopyReferralLink from "@/components/membership/CopyReferralLink";
import MyMediaSection from "@/components/media/MyMediaSection";
import LogoutButton from "@/components/auth/LogoutButton";
import ResetPasswordButton from "@/components/auth/ResetPasswordButton";
import ChangeEmailButton from "@/components/auth/ChangeEmailButton";
import DashboardDrinkTokens from "./DashboardDrinkTokens";
import ManagementSection from "@/components/account/ManagementSection";
import { visibleStaffTabs } from "@/lib/routes/staff-tabs";
import PostHogIdentify from "@/components/analytics/PostHogIdentify";
import type { UserRole, UserStatus } from "@/types/database";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // ── The flags that land HERE, and why they are read in one place ────────────
  //
  // `/dashboard` is where several degraded paths deposit the person, each
  // carrying its reason in the URL. A flag that nothing renders is a **silent
  // failure with a URL**: the person is bounced, the reason is right there in
  // the address bar, and the screen says nothing. In a product with no error
  // tracking that is the recorded newsletter defect wearing a query string —
  // and worse than the newsletter's, because here the diagnosis already exists
  // and is simply not drawn.
  //
  // So they are read together, drawn together, and each keeps its own sentence.
  // No two collapse.
  const params = await searchParams;
  const readParam = (value: string | string[] | undefined) =>
    typeof value === "string" ? value : null;

  // ── `?access=`, which now carries THREE causes and never collapses them ─────
  //
  // WR-04 is closed on this surface and stays closed: every value below is
  // rendered, none is merely read.
  //
  // `bounceToDashboard()` in `src/lib/supabase/middleware.ts` sets one of three
  // values, decided by position, or no parameter at all. Each gets its own
  // sentence below, and the sentences say **what to do**, not only what
  // happened: the person reading one of them may be standing at a door at two
  // in the morning, and "an error occurred" is worth nothing there. None of
  // them names a migration or a table — that is the vocabulary of whoever
  // maintains this, not of whoever is refused by it.
  //
  // A value that is none of the three renders **nothing**. A query string is
  // attacker-supplied input, and a notice drawn from an invented value would be
  // an authoritative-looking sentence written by whoever sent the link.
  const accessCause = readParam(params.access);

  // The lookup itself failed. NOT a refusal: a refusal bounces here with no
  // parameter at all. Keeping the two distinguishable is the whole point; the
  // recorded newsletter defect collapsed a network fault, a missing key and an
  // already-subscribed address into one "Qualcosa è andato storto" and made all
  // three undebuggable for the user and for whoever maintains it.
  const accessUnavailable = accessCause === "unavailable";

  // The context resolved, but it did not carry tonight's assignments — so the
  // question *"is this person working tonight"* could not be asked at all. It
  // has one known cause and it is a configuration one, which is why the notice
  // says so instead of implying a decision about the account. It is emphatically
  // **not** the same sentence as the one below: telling somebody who is on
  // tonight's rota that they are not assigned is the refusal this product has
  // decided it will not manufacture.
  const accessContextStale = accessCause === "context-stale";

  // Assignments exist and none of them opens the page that was asked for.
  // Also not a fault, and also not "you have no business here": it is a real
  // answer about a real assignment, and the way out is a person, named.
  const accessNotAssignedHere = accessCause === "not-assigned-here";

  // `?link=refused` is set by `src/app/api/auth/callback/route.ts` (plan 43-04)
  // when the `next` target of a sign-in link was not on its allow-list and the
  // default was substituted. It always lands here, because the default IS this
  // page.
  //
  // It matters more than it looks. The person followed a link that promised to
  // take them somewhere — most often the page where a new account sets its
  // password — and arrived at a dashboard instead. Without this notice the only
  // thing they can conclude is that the link did not work, which is wrong: the
  // link worked, and it is the destination that was refused. Somebody who has
  // just been given an account and cannot find the password field will ask for
  // a second invitation, and the second one will do exactly the same thing.
  const linkRefused = readParam(params.link) === "refused";

  // `?master=` is set by the auth callback when reconciling the configured
  // master account did not go as expected at sign-in (plan 43-12).
  //
  // ── Why this one is drawn by PRESENCE and prints its raw value ─────────────
  //
  // The other two are matched against a value read from the code that sets it.
  // This one is not: the emitting file belongs to another plan running in
  // parallel and its value vocabulary was not readable from here. Inventing the
  // values would be worse than not handling the flag at all — a renderer keyed
  // on guessed strings stays mute AND looks handled, so the next reader stops
  // looking.
  //
  // So the CATEGORY is named, which is known, and the exact value is printed
  // verbatim, which is honest. It is the same rule this phase applies to an
  // unrecognised failure detail on the members surface: name the category, show
  // the word the server used, never invent a sentence for it. When 43-12's
  // vocabulary is on record, this gains one sentence per value — and until then
  // the flag is visible instead of mute.
  const masterFlag = readParam(params.master);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const fullName = user.user_metadata?.full_name || "Member";

  const { data: profile } = await supabase
    .from("profiles")
    .select("membership_code, role, created_at")
    .eq("id", user.id)
    .single();

  const userEmail = user.email ?? "";
  const memberSince = profile?.created_at
    ? (() => {
        const d = new Date(profile.created_at);
        const M = ["January","February","March","April","May","June","July","August","September","October","November","December"];
        return `${M[d.getMonth()]} ${d.getFullYear()}`;
      })()
    : null;

  const roleLabel =
    profile?.role === "master"
      ? "Admin"
      : profile?.role === "organizer"
        ? "Organizer"
        : "Member";

  // Fetch user's tickets (only for regular members — admin/organizer don't buy tickets)
  const isMemberRole = !profile?.role || profile.role === "member";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let tickets: any[] | null = null;
  if (isMemberRole) {
    const { data } = await supabase
      .from("tickets")
      .select(
        "id, amount_paid, created_at, party_id, events(title, date, slug, cover_image), ticket_tiers(name), event_parties(title, date, time)"
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    tickets = data;
  }

  // Fetch user's drink tokens grouped by event
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let drinkTokenGroups: { eventTitle: string; eventSlug: string; eventDate: string; tokens: any[] }[] = [];
  if (isMemberRole) {
    const { data: allTokens } = await supabase
      .from("drink_tokens")
      .select("id, drink_name, price, token, status, created_at, redeemed_at, refunded_at, event_id, events(title, slug, date)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    // Group by event, show events with unredeemed tokens first
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const groupMap = new Map<string, { eventTitle: string; eventSlug: string; eventDate: string; tokens: any[] }>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (allTokens ?? []).forEach((t: any) => {
      const evt = Array.isArray(t.events) ? t.events[0] : t.events;
      const eid = t.event_id;
      if (!groupMap.has(eid)) {
        groupMap.set(eid, {
          eventTitle: evt?.title ?? "Event",
          eventSlug: evt?.slug ?? "",
          eventDate: evt?.date ?? "",
          tokens: [],
        });
      }
      groupMap.get(eid)!.tokens.push(t);
    });
    drinkTokenGroups = Array.from(groupMap.values())
      .filter(g => g.tokens.some((t: { status: string }) => t.status === "purchased") ||
        g.tokens.some((t: { status: string; redeemed_at: string | null; refunded_at?: string | null }) => {
          const completedAt = t.status === "refunded" ? t.refunded_at : t.redeemed_at;
          if (!completedAt) return false;
          const completed = new Date(completedAt);
          const nowDate = new Date();
          return (nowDate.getTime() - completed.getTime()) < 48 * 60 * 60 * 1000;
        }))
      .sort((a, b) => {
        const aHasUnredeemed = a.tokens.some((t: { status: string }) => t.status === "purchased");
        const bHasUnredeemed = b.tokens.some((t: { status: string }) => t.status === "purchased");
        if (aHasUnredeemed && !bHasUnredeemed) return -1;
        if (!aHasUnredeemed && bHasUnredeemed) return 1;
        return 0;
      });
  }

  // Fetch user's media grouped by event
  const { data: myMedia } = await supabase
    .from("event_media")
    .select("id, url, type, status, file_size, created_at, event_id, events(id, title, date, slug)")
    .eq("uploaded_by", user.id)
    .order("created_at", { ascending: false });

  // Group media by event
  const mediaGroupMap = new Map<string, {
    eventId: string;
    eventTitle: string;
    eventDate: string;
    eventSlug: string;
    items: { id: string; url: string; type: "photo" | "video"; status: "pending" | "approved" | "rejected"; file_size: number | null; created_at: string }[];
  }>();
  (myMedia ?? []).forEach((m) => {
    const evt = Array.isArray(m.events) ? m.events[0] : m.events;
    const eventData = evt as { id: string; title: string; date: string; slug: string } | null;
    const eid = eventData?.id ?? m.event_id;
    if (!mediaGroupMap.has(eid)) {
      mediaGroupMap.set(eid, {
        eventId: eid,
        eventTitle: eventData?.title ?? "Event",
        eventDate: eventData?.date ?? "",
        eventSlug: eventData?.slug ?? "",
        items: [],
      });
    }
    mediaGroupMap.get(eid)!.items.push({
      id: m.id,
      url: m.url,
      type: m.type as "photo" | "video",
      status: m.status as "pending" | "approved" | "rejected",
      file_size: m.file_size,
      created_at: m.created_at,
    });
  });
  const mediaGroups = Array.from(mediaGroupMap.values());

  // Separate upcoming vs past tickets
  const now = new Date().toISOString().split("T")[0];
  const upcomingTickets = (tickets ?? []).filter((t) => {
    const evt = Array.isArray(t.events) ? t.events[0] : t.events;
    return evt && (evt as { date: string }).date >= now;
  });
  const pastTickets = (tickets ?? []).filter((t) => {
    const evt = Array.isArray(t.events) ? t.events[0] : t.events;
    return evt && (evt as { date: string }).date < now;
  });
  const sortedTickets = [...upcomingTickets, ...pastTickets];

  // Role, status and the resolved capability set, from the SESSION. Only the
  // source changed. `capabilities` is read for one thing only — deciding which
  // management links this page may draw — and it crosses to the client as an
  // array, because a `Set` is not serialisable across the boundary.
  const { capabilities, role, status, liveAssignmentCapabilities } =
    await getAccessContext();
  const managementCapabilities = [...capabilities];

  // ── The role predicate this line used to hold is gone (STAFF-03)
  //
  // It read `role === "master" || role === "organizer"`, and the comment that
  // stood here said phase 34 would rewrite the whole family at once against four
  // roles. This is that rewrite. The question is no longer *which role is this*
  // but *would the section draw anything* — answered by the same declaration the
  // middleware reads, so the affordance and the refusal cannot disagree.
  //
  // The set of accounts is unchanged, and it was checked rather than assumed
  // against `20260807000000_capability_model.sql:407-412`: `master` holds
  // `admin.access` and `organizer.access`, `organizer` holds `organizer.access`,
  // and no other role holds either. The fourth role — `staff` — holds neither,
  // so it still sees nothing here, and it now does so because the model says so
  // rather than because a literal happens to omit it.
  //
  // Both expressions still KEEP THEIR FORM in the sense that matters: neither
  // redirects and neither narrows a query. They decide what this page RENDERS.
  // Hiding this section is not what protects `/admin/*` — the middleware and each
  // page's own guard do that.
  const canReachManagementTools =
    visibleStaffTabs(managementCapabilities).length > 0;
  const isPendingOrRejected = status === "pending" || status === "rejected";

  return (
    <div className="min-h-dvh pb-24">
      <PostHogIdentify
        userId={user.id}
        email={userEmail}
        role={role ?? "member"}
      />
      <AnimatedSection>
        <header className="px-6 pt-12 pb-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted">Hey,</p>
              <h1 className="text-3xl font-bold tracking-tight">{fullName}</h1>
            </div>
            <span className="mt-2 shrink-0 rounded-full bg-accent/20 px-3 py-1 text-xs font-medium text-accent">
              {roleLabel}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted truncate">{userEmail}</p>
          {memberSince && (
            <p className="text-xs text-muted/60">Member since {memberSince}</p>
          )}
        </header>
      </AnimatedSection>

      <AnimatedSection delay={0.1} className="flex flex-col gap-4 px-6">
        {accessUnavailable && (
          <div
            role="status"
            className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4"
          >
            <p className="text-sm font-semibold text-amber-200">
              We couldn&apos;t check your permissions just now
            </p>
            <p className="mt-1 text-sm text-amber-100/80">
              This is a temporary problem on our side, not a decision about your
              account. Nothing has changed about what you have access to. Please
              try again in a moment.
            </p>
          </div>
        )}

        {accessContextStale && (
          <div
            role="status"
            className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4"
          >
            <p className="text-sm font-semibold text-amber-200">
              We couldn&apos;t check tonight&apos;s assignments
            </p>
            <p className="mt-1 text-sm text-amber-100/80">
              You were sent here because this app could not read who is assigned
              to work tonight — so it could not tell whether you are. That is a
              configuration problem on our side, not a decision about your
              account, and nothing about your access has changed. If you are due
              to work a door or a night, tell whoever set that night up:
              retrying will land you in the same place until it is fixed.
            </p>
          </div>
        )}

        {accessNotAssignedHere && (
          <div
            role="status"
            className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4"
          >
            <p className="text-sm font-semibold text-amber-200">
              You are assigned — but not to that
            </p>
            <p className="mt-1 text-sm text-amber-100/80">
              Nothing is wrong with your account, and you do hold an assignment.
              It just does not cover the page you asked for: assignments are
              given one night and one job at a time, so working one night&apos;s
              door does not open another night, or another job. If this one
              should be yours, ask the organiser for that night to add it.
            </p>
          </div>
        )}

        {linkRefused && (
          <div
            role="status"
            className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4"
          >
            <p className="text-sm font-semibold text-amber-200">
              Your link worked — but it could not send you where it said
            </p>
            <p className="mt-1 text-sm text-amber-100/80">
              You are signed in, and nothing is wrong with your account. The
              page the link pointed at was not one we allow it to open, so you
              were brought here instead. If you were opening an invitation in
              order to set a password, ask whoever invited you to send it again
              rather than reusing this one — a second copy of the same link will
              land in the same place.
            </p>
          </div>
        )}

        {masterFlag && (
          <div
            role="status"
            className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4"
          >
            <p className="text-sm font-semibold text-amber-200">
              A check on the owner account did not complete at sign-in
            </p>
            <p className="mt-1 text-sm text-amber-100/80">
              You are signed in and your own access is unaffected. This concerns
              the account that holds the top-level role, and it is shown rather
              than logged because nothing in this product would tell anybody
              otherwise. If you are not that person, there is nothing for you to
              do; if you are, this is worth looking at before the next night.
            </p>
            <p className="mt-2 break-words font-mono text-xs text-amber-100/60">
              {masterFlag}
            </p>
          </div>
        )}
        {isPendingOrRejected ? (
          <>
            {/* Pending / Rejected state */}
            <div className="rounded-2xl border border-accent/30 bg-gradient-to-br from-card to-accent/5 p-6">
              <p className="text-lg font-semibold">
                {status === "pending"
                  ? "Your account is pending approval"
                  : "Your account has been reviewed"}
              </p>
              <p className="mt-2 text-sm text-muted">
                You can browse events while you wait. Once approved, you&apos;ll
                have full access to membership features.
              </p>
            </div>

            {/* Discover events link */}
            <div className="rounded-2xl border border-card-border bg-card p-5">
              <p className="mb-3 text-sm text-muted">
                Explore what&apos;s coming up
              </p>
              <Link
                href="/events"
                className="inline-block text-sm font-medium text-accent hover:text-accent-hover"
              >
                Discover events →
              </Link>
            </div>

            {/* Settings */}
            <div>
              <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-muted">Settings</p>
              <div className="flex flex-col gap-2">
                <ChangeEmailButton />
                <ResetPasswordButton />
                <LogoutButton />
              </div>
            </div>
          </>
        ) : (
          <>
            <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-muted">My Stuff</p>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-3">
              <Link href="/membership-card">
                <div className="rounded-2xl border border-accent/30 bg-gradient-to-br from-card to-accent/5 p-4 transition-all hover:border-accent/50 active:scale-95 active:opacity-80 h-full">
                  <span className="text-2xl">&#127915;</span>
                  <p className="mt-2 text-sm font-semibold">Membership Card</p>
                </div>
              </Link>
              <Link href="/attendance">
                <div className="rounded-2xl border border-card-border bg-card p-4 transition-all hover:border-accent/50 active:scale-95 active:opacity-80 h-full">
                  <span className="text-2xl">&#128202;</span>
                  <p className="mt-2 text-sm font-semibold">Event History</p>
                </div>
              </Link>
            </div>

            {/* My Tickets — only for regular members */}
            {isMemberRole && (
            <div>
              <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-muted">My Tickets</p>
              {sortedTickets.length === 0 ? (
                <div className="rounded-2xl border border-card-border bg-card p-5">
                  <p className="text-sm text-muted/60">No tickets yet</p>
                  <Link
                    href="/events"
                    className="mt-3 inline-block text-sm font-medium text-accent hover:text-accent-hover"
                  >
                    Discover events &rarr;
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {sortedTickets.map((ticket) => {
                    const evt = Array.isArray(ticket.events)
                      ? ticket.events[0]
                      : ticket.events;
                    const tier = Array.isArray(ticket.ticket_tiers)
                      ? ticket.ticket_tiers[0]
                      : ticket.ticket_tiers;
                    const eventData = evt as {
                      title: string;
                      date: string;
                      slug: string;
                      cover_image: string | null;
                    } | null;
                    const tierData = tier as { name: string } | null;
                    const isUpcoming = eventData
                      ? eventData.date >= now
                      : false;

                    return (
                      <Link key={ticket.id} href={`/tickets/${ticket.id}`}>
                        <div
                          className={`rounded-2xl border border-card-border bg-card p-4 transition-all hover:border-accent/50 active:scale-[0.98] active:opacity-80 ${
                            !isUpcoming ? "opacity-60" : ""
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl">
                              {eventData?.cover_image ? (
                                <Image
                                  src={eventData.cover_image}
                                  alt={eventData.title ?? ""}
                                  width={48}
                                  height={48}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="h-full w-full bg-gradient-to-br from-accent/30 to-accent/10" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-semibold text-foreground truncate">
                                  {eventData?.title ?? "Event"}
                                </p>
                                {isUpcoming && (
                                  <span className="shrink-0 rounded-full bg-green-500/20 px-2 py-0.5 text-[10px] font-medium text-green-400">
                                    Upcoming
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                {tierData?.name && (
                                  <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[10px] font-medium text-accent">
                                    {tierData.name}
                                  </span>
                                )}
                                <span className="text-xs text-muted">
                                  {eventData
                                    ? (() => {
                                        const d = new Date(eventData.date + "T00:00:00");
                                        const M = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
                                        return `${d.getDate()} ${M[d.getMonth()]}`;
                                      })()
                                    : ""}
                                </span>
                              </div>
                            </div>
                            <span className="shrink-0 text-muted">&#8250;</span>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
            )}

            {/* My Drinks — drink tokens with full redeem capability */}
            {isMemberRole && drinkTokenGroups.length > 0 && (
              <DashboardDrinkTokens groups={drinkTokenGroups} />
            )}

            {/* My Media — only show if user has uploads */}
            {mediaGroups.length > 0 && <MyMediaSection groups={mediaGroups} />}

            {/* Settings */}
            <div>
              <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-muted">Settings</p>
              <div className="flex flex-col gap-2">
                {profile?.membership_code && (
                  <CopyReferralLink membershipCode={profile.membership_code} />
                )}
                <ChangeEmailButton />
                <ResetPasswordButton />
                <LogoutButton />
              </div>
            </div>

            {/* Management Tools — the surfaces this account's capabilities
                open, and only those. The cast that stood here, narrowing `role`
                to a two-member union, is deleted: a cast is how a new role value
                gets laundered into an old union without anything saying so, and
                Phase 43 recorded seventeen of them doing exactly that. */}
            {canReachManagementTools && (
              <ManagementSection capabilities={managementCapabilities} />
            )}
          </>
        )}
      </AnimatedSection>

      <MobileNav
        role={role as UserRole | null}
        status={status as UserStatus | null}
        capabilities={[...capabilities]}
        liveAssignmentCapabilities={
          liveAssignmentCapabilities ? [...liveAssignmentCapabilities] : null
        }
      />
    </div>
  );
}
