"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PageTitle } from "@/components/ui/Typography";

/**
 * The subscribe form — converted by plan 41.2-03.
 *
 * ── One heading per branch, substituted where it stood ───────────────────────
 *
 * This component renders two mutually exclusive branches and each already had
 * its own top-level heading. They were **substituted in place**, not merged and
 * not lifted to the page file: `Typography.tsx:44-51` states the invariant as
 * *what the browser gets*, not the count in the file, so two written headings
 * across two exclusive branches is one heading per render. Adding a third on
 * `(public)/newsletter/page.tsx` would have made it two per render, which is
 * the correction `41.2-PATTERNS.md` §7.3 exists to prevent.
 *
 * ── The 384px column is RETAINED, and that is a decision ─────────────────────
 *
 * Check D reads the page file only (`verify-conversion.mjs:3161`), so a maximum
 * inside a component is invisible to it. **That is a limit, not a permission**,
 * so the reason is written rather than left to the blind spot: this is the
 * FORM's own entry column, not the PAGE's container maximum. The shell now owns
 * the page measure at 1024px, and a single-field subscribe form run across
 * 1024px is not a form. The page centres this column inside that measure; the
 * shell decides the page, this decides the field.
 *
 * ── What was deliberately NOT repaired ───────────────────────────────────────
 *
 * The catch below is this repository's recorded precedent for one message
 * collapsing distinct causes — a network fault, a missing key and an address
 * already on the list are indistinguishable to the person reading it and to
 * whoever has to debug it. It is left **byte for byte** as it was. Repairing it
 * would be a behaviour change delivered under a visual mandate, and there is no
 * error tracking in this repository, so deciding what a subscriber is told when
 * a subscription fails deserves its own thinking rather than a ride-along. It
 * is recorded at its `file:line` in
 * `.planning/phases/41.2-public-member-and-money-surfaces/41.2-03-FINDINGS.md`.
 */
export default function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) throw new Error();
      setSuccess(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="text-center">
        <p className="mb-4 text-5xl">&#10003;</p>
        <PageTitle className="mb-2">Subscribed!</PageTitle>
        <p className="text-muted">You&apos;ll receive updates about upcoming events.</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm">
      <PageTitle className="mb-2">Newsletter</PageTitle>
      <p className="mb-8 text-muted">
        Get updates about upcoming events right in your inbox.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          id="newsletter-email"
          type="email"
          aria-label="Email"
          placeholder="Your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        {/*
          The accent is reserved for the primary fill, the active navigation
          entry, a link in prose and the lineup pills — never a state signal
          (§5.1). A failure is a state, so it takes the critical semantic, and
          it is announced rather than merely coloured. The analog is
          `src/app/(auth)/login/page.tsx:170-174`.
        */}
        {error && (
          <p role="alert" className="text-sm text-sem-crit">
            {error}
          </p>
        )}

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Subscribing..." : "Subscribe"}
        </Button>
      </form>
    </div>
  );
}
