"use client";

import { useState, useCallback, useRef } from "react";

import { FOCUS_RING, Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

/**
 * The referral control — the copyable path into the community.
 *
 * ── Converted here as spine, and that is a scheduling decision ───────────────
 *
 * **Two of this phase's ten closures reach this file** — `/membership-card`,
 * converted in the same plan, and `/dashboard`, three waves later. D-41.1-15
 * says a shared component two plans would both touch is either converted in an
 * earlier wave as spine or assigned to exactly one plan. It is
 * converted here, ahead of both, so that this plan and the dashboard plan stay
 * two plans instead of being merged into one. Recorded in the file rather than
 * only in a SUMMARY so the next reader knows the merger was avoided
 * deliberately rather than missed — the shape `RefundActions.tsx:14-22` models.
 * The dashboard plan therefore does not list this file among the ones it
 * modifies, and says so.
 *
 * ── The referral value is untouched, and that is the point ───────────────────
 *
 * A referral changes the **path** into the community, never the standard
 * (`community-membership.md`), and what this control puts on somebody's
 * clipboard is that path. So: **what is copied, how it is produced, and what is
 * reported on success or on failure are all byte-identical.** The origin read,
 * the query parameter, the server-render fallback, the clipboard call, the
 * `execCommand` fallback behind it, the confirmation label and its two-second
 * life are all the ones that were here. The diff is class strings and two
 * primitives.
 *
 * ── Why the input is not the input primitive, and it is not an oversight ─────
 *
 * `ui/Input.tsx` does not take a `ref` — its props are the intrinsic attributes
 * minus the ones it owns — and **the ref IS the fallback copy path**: in a
 * browser without the clipboard API the only route that works is selecting this
 * element and asking the document to copy the selection. Adopting the primitive
 * would have deleted that route silently while looking like an adoption. The
 * element therefore stays raw and **declares the floor itself** — the 44px
 * minimum, the control boundary, the sunk well and the one imported focus
 * expression, which is spelled nowhere and read from the ladder.
 *
 * ── One thing carried forward rather than fixed ──────────────────────────────
 *
 * The confirmation below is set unconditionally, so a copy that failed on both
 * routes still reports success. It is pre-existing, it is recorded at its
 * `file:line` in this plan's `41.2-07-FINDINGS.md`, and it is **not** repaired
 * here: telling the two failures apart is a rewrite of this surface's copy and
 * belongs to a plan that owns that decision. This repository has no error
 * tracking, so a failure nobody is shown is a failure nobody ever learns about.
 */

interface CopyReferralLinkProps {
  membershipCode: string;
}

export default function CopyReferralLink({
  membershipCode,
}: CopyReferralLinkProps) {
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const referralLink =
    typeof window !== "undefined"
      ? `${window.location.origin}/register?ref=${membershipCode}`
      : `/register?ref=${membershipCode}`;

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
    } catch {
      // Fallback for browsers without clipboard API
      const input = inputRef.current;
      if (input) {
        input.select();
        document.execCommand("copy");
      }
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [referralLink]);

  return (
    <Card>
      <p className="mb-3 text-sm text-muted">Invite a friend</p>
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="text"
          readOnly
          aria-label="Your referral link"
          value={referralLink}
          className={`min-h-11 min-w-0 flex-1 truncate rounded-xl border border-control bg-sunk px-4 font-mono text-sm text-ink ${FOCUS_RING}`}
        />
        <Button size="sm" onClick={handleCopy} className="shrink-0">
          {copied ? "Copied!" : "Copy"}
        </Button>
      </div>
    </Card>
  );
}
