"use client";

import Link from "next/link";
import CollapsibleSection from "@/components/account/CollapsibleSection";

interface ManagementSectionProps {
  role: "master" | "organizer";
}

const masterLinks = [
  { label: "Events", href: "/admin/events" },
  { label: "Members", href: "/admin/members" },
  { label: "Artists", href: "/admin/artists" },
  { label: "Venues", href: "/admin/venues" },
  { label: "Newsletter", href: "/admin/newsletter" },
  { label: "Finance", href: "/admin/finance" },
  { label: "Analytics", href: "/admin/analytics" },
];

const organizerLinks = [
  { label: "Events", href: "/organizer/events" },
  { label: "Members", href: "/organizer/members" },
  { label: "Artists", href: "/organizer/artists" },
  { label: "Venues", href: "/organizer/venues" },
];

export default function ManagementSection({
  role,
}: ManagementSectionProps) {
  const links = role === "master" ? masterLinks : organizerLinks;

  return (
    <div className="border-t border-card-border pt-6 mt-6">
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
