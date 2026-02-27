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
    <>
      <style>{`
        .admin-nav-scroll { -ms-overflow-style: none; scrollbar-width: none; -webkit-overflow-scrolling: touch; }
        .admin-nav-scroll::-webkit-scrollbar { display: none; }
      `}</style>
      <div className="admin-nav-scroll mb-6 overflow-x-auto">
        <div className="flex gap-2 px-6" style={{ width: "max-content" }}>
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
    </>
  );
}
