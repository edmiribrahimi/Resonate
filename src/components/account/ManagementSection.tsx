"use client";

import Link from "next/link";
import CollapsibleSection from "@/components/account/CollapsibleSection";

interface ManagementSectionProps {
  role: "master" | "organizer";
  pendingMembers: number;
  nextEvent: { title: string; date: string } | null;
  totalRevenue: number;
}

const masterLinks = [
  { label: "Events", href: "/admin/events" },
  { label: "Members", href: "/admin/members" },
  { label: "Artists", href: "/admin/artists" },
  { label: "Venues", href: "/admin/venues" },
  { label: "Newsletter", href: "/admin/newsletter" },
  { label: "Finance", href: "/admin/finance" },
];

const organizerLinks = [
  { label: "Events", href: "/organizer/events" },
  { label: "Members", href: "/organizer/members" },
  { label: "Artists", href: "/organizer/artists" },
  { label: "Venues", href: "/organizer/venues" },
];

export default function ManagementSection({
  role,
  pendingMembers,
  nextEvent,
  totalRevenue,
}: ManagementSectionProps) {
  const links = role === "master" ? masterLinks : organizerLinks;
  const membersHref =
    role === "master" ? "/admin/members" : "/organizer/members";

  const formattedRevenue = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(totalRevenue);

  const formattedDate = nextEvent
    ? new Date(nextEvent.date + "T00:00:00").toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : null;

  return (
    <div className="border-t border-card-border pt-6 mt-6">
      <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-muted">
        Management
      </p>

      {/* Quick-stats cards */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <Link href={membersHref}>
          <div className="rounded-2xl border border-card-border bg-card p-4">
            <p className="text-xs text-muted">Pending</p>
            <p className="text-lg font-bold text-foreground">
              {pendingMembers}
            </p>
          </div>
        </Link>

        <div className="rounded-2xl border border-card-border bg-card p-4">
          <p className="text-xs text-muted">Next Event</p>
          {nextEvent ? (
            <>
              <p className="text-sm font-bold text-foreground truncate">
                {nextEvent.title}
              </p>
              <p className="text-xs text-muted">{formattedDate}</p>
            </>
          ) : (
            <p className="text-sm text-muted/60">No upcoming</p>
          )}
        </div>

        <div className="rounded-2xl border border-card-border bg-card p-4">
          <p className="text-xs text-muted">Revenue</p>
          <p className="text-lg font-bold text-foreground">
            {formattedRevenue}
          </p>
        </div>
      </div>

      {/* Management links */}
      <CollapsibleSection title="Management Tools" defaultOpen>
        <div>
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center justify-between py-3 border-b border-card-border last:border-0"
            >
              <span className="text-sm font-medium text-foreground">
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
