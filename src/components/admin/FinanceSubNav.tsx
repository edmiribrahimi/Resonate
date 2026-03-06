"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const subTabs = [
  { href: "/admin/finance", label: "Transactions", exact: true },
  { href: "/admin/finance/payouts", label: "Payouts" },
];

export default function FinanceSubNav() {
  const pathname = usePathname();

  return (
    <div className="mb-4 flex gap-2">
      {subTabs.map((tab) => {
        const isActive = tab.exact
          ? pathname === tab.href
          : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              isActive
                ? "bg-accent/20 text-accent border border-accent/30"
                : "text-muted hover:text-foreground"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
