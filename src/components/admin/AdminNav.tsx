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
    <div className="mb-6 overflow-x-auto" style={{ WebkitOverflowScrolling: "touch" }}>
      <style>{`
        .admin-tabs { -ms-overflow-style: none; scrollbar-width: none; }
        .admin-tabs::-webkit-scrollbar { display: none; }
      `}</style>
      <div className="admin-tabs flex gap-2 px-6 overflow-x-auto" style={{ minWidth: "max-content" }}>
        {tabs.map((tab) => {
          const isActive = pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
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
