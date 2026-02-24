"use client";

import { useState, useCallback, useRef } from "react";

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
    <div className="rounded-2xl border border-card-border bg-card p-5">
      <p className="mb-3 text-sm text-muted">Invite a friend</p>
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="text"
          readOnly
          value={referralLink}
          className="min-w-0 flex-1 truncate rounded-lg border border-card-border bg-background px-3 py-2 font-mono text-sm text-foreground"
        />
        <button
          onClick={handleCopy}
          className="shrink-0 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
    </div>
  );
}
