"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/admin/members", label: "Members" },
  { href: "/admin/events", label: "Events" },
  { href: "/admin/artists", label: "Artists" },
  { href: "/admin/venues", label: "Venues" },
  { href: "/admin/newsletter", label: "Newsletter" },
];

export default function AdminNav() {
  const pathname = usePathname();

  return (
    <div className="px-6 mb-6">
      <div className="flex flex-row flex-wrap gap-2">
        {tabs.map((tab) => {
          const isActive = pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`inline-block rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-accent text-white"
                  : "bg-card border border-card-border text-muted hover:text-foreground"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
