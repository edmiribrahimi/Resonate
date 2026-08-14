"use client";

import { useState } from "react";
import { FOCUS_RING } from "@/components/ui/Button";

/**
 * A labelled disclosure — the account page's own, and the one the Management
 * Tools list sits inside.
 *
 * It takes the shape `ui/DataTable.tsx:221-253` fixed for the disclosure plan
 * 41.1-12 converted: the 44 px floor declared on the control rather than
 * inherited from padding, the open state announced with `aria-expanded` rather
 * than only drawn by a rotating caret, the imported focus expression, and the
 * caret marked decorative so it is not read out beside the title.
 *
 * It differs from that one on the only axis that matters here: that control is
 * icon-only and therefore needs a label prop, this one **is** its label — the
 * title is visible text inside the control, so naming it again would announce
 * it twice.
 */
interface CollapsibleSectionProps {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export default function CollapsibleSection({
  title,
  defaultOpen = false,
  children,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        className={`flex min-h-11 w-full items-center justify-between py-3 ${FOCUS_RING}`}
      >
        <span className="text-sm font-semibold uppercase tracking-widest text-muted">
          {title}
        </span>
        <svg
          className={`h-4 w-4 text-muted transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19.5 8.25l-7.5 7.5-7.5-7.5"
          />
        </svg>
      </button>
      <div
        className={`grid transition-all duration-200 ease-out ${isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
      >
        <div className="overflow-hidden">{children}</div>
      </div>
    </div>
  );
}
