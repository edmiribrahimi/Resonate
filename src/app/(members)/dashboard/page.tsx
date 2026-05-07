import Link from "next/link";
import Image from "next/image";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import MobileNav from "@/components/layout/MobileNav";
import AnimatedSection from "@/components/motion/AnimatedSection";
import CopyReferralLink from "@/components/membership/CopyReferralLink";
import MyMediaSection from "@/components/media/MyMediaSection";
import LogoutButton from "@/components/auth/LogoutButton";
import ResetPasswordButton from "@/components/auth/ResetPasswordButton";
import ChangeEmailButton from "@/components/auth/ChangeEmailButton";
import DashboardDrinkTokens from "./DashboardDrinkTokens";
import ManagementSection from "@/components/account/ManagementSection";
import PostHogIdentify from "@/components/analytics/PostHogIdentify";
import type { UserRole, UserStatus } from "@/types/database";

export default async function DashboardPage() {
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

  // Read role and status from middleware-injected headers
  const headersList = await headers();
  const role = (headersList.get("x-user-role") as UserRole) || null;
  const status = (headersList.get("x-user-status") as UserStatus) || null;

  const isStaff = role === "master" || role === "organizer";
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

            {/* Management Tools — staff only */}
            {isStaff && (
              <ManagementSection role={role as "master" | "organizer"} />
            )}
          </>
        )}
      </AnimatedSection>

      <MobileNav role={role} status={status} />
    </div>
  );
}
