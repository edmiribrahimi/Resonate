"use client";

import { useState } from "react";
import MobileNav from "@/components/layout/MobileNav";

export default function NewsletterPage() {
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

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 pb-24">
      {success ? (
        <div className="text-center">
          <p className="text-5xl mb-4">✓</p>
          <h1 className="text-2xl font-bold mb-2">Subscribed!</h1>
          <p className="text-muted">You&apos;ll receive updates about upcoming events.</p>
        </div>
      ) : (
        <div className="w-full max-w-sm">
          <h1 className="mb-2 text-3xl font-bold tracking-tight">Newsletter</h1>
          <p className="mb-8 text-muted">
            Get updates about upcoming events right in your inbox.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <input
              type="email"
              placeholder="Your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-12 rounded-xl border border-card-border bg-card px-4 text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
            />

            {error && <p className="text-sm text-accent">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="h-12 rounded-full bg-accent font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
            >
              {loading ? "Subscribing..." : "Subscribe"}
            </button>
          </form>
        </div>
      )}

      <MobileNav />
    </div>
  );
}
