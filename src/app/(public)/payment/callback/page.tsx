"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, useRef, Suspense } from "react";
import { checkPaymentStatus, type PaymentCallbackStatus } from "./actions";
import { PageShell } from "@/components/ui/PageShell";
import { Card } from "@/components/ui/Card";
import { PageTitle } from "@/components/ui/Typography";
import { Button } from "@/components/ui/Button";

/**
 * The payment callback — converted onto the shared primitives by plan 41-05,
 * and **converted whole**: this surface is one file, so it either converts or
 * it does not.
 *
 * ── What this conversion deliberately did not touch ──────────────────────────
 *
 * This is a money surface. It reads the outcome of a SumUp payment, and the
 * rule this project applies everywhere it moves money — *ask the provider,
 * never believe the announcement* — is not relaxed, weakened or moved by a
 * layout change.
 *
 * So: **the whole effect above is byte-identical to what it was before the
 * conversion** — what it asks the server, when it asks, how often it asks
 * again, which outcome strings it branches on, and where it sends the visitor
 * when the money is confirmed. Only the returned markup changed.
 *
 * The five branches below stayed five. **None was merged with another on the
 * grounds that two of them now render the same component**, which is the exact
 * temptation a component extraction creates on a page whose branches are its
 * safety property. A callback that shows success on an unconfirmed payment is a
 * defect of a different order from a wrong padding, and the way to be certain a
 * visual pass could not produce one is to leave every decision alone.
 *
 * ── One `<h1>`, written five times ───────────────────────────────────────────
 *
 * The five page titles below — plus the one in the Suspense fallback — are
 * **mutually exclusive**, so the browser is handed exactly one. The invariant
 * §7.1 states is what renders, not what a grep counts in the file.
 */

type ViewStatus = "checking" | PaymentCallbackStatus;

function PaymentCallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const ctx = (searchParams.get("ctx") as "drink" | "ticket" | null) ?? null;
  const orderParam = searchParams.get("order");
  const purchaseParam = searchParams.get("purchase");
  const id = ctx === "drink" ? orderParam : purchaseParam;
  const slug = searchParams.get("slug") ?? undefined;
  const party = searchParams.get("party") ?? undefined;

  const [status, setStatus] = useState<ViewStatus>("checking");
  const pollCountRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!ctx || !id) {
      setStatus("NOT_FOUND");
      return;
    }

    let cancelled = false;

    async function poll() {
      if (cancelled) return;

      try {
        const result = await checkPaymentStatus({
          ctx: ctx as "drink" | "ticket",
          id: id!,
          slug,
          party,
        });
        if (cancelled) return;

        if (result.status === "PAID" && result.redirectTo) {
          router.replace(result.redirectTo);
          return;
        }

        if (result.status === "PENDING" && pollCountRef.current < 8) {
          setStatus("PENDING");
          pollCountRef.current += 1;
          timerRef.current = setTimeout(poll, 2000);
          return;
        }

        setStatus(result.status);
      } catch {
        if (!cancelled) setStatus("NOT_FOUND");
      }
    }

    poll();

    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [ctx, id, slug, party, router]);

  const eventUrl = slug ? `/events/${slug}` : "/events";

  return (
    <PageShell width="focus">
      <Card className="text-center">
        {/* Checking / Pending */}
        {(status === "checking" || status === "PENDING") && (
          <>
            <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-line border-t-accent" />
            <PageTitle>
              {status === "checking" ? "Verifying payment..." : "Payment processing..."}
            </PageTitle>
            <p className="mt-2 text-sm text-muted">
              {status === "checking"
                ? "Please wait while we confirm your payment."
                : "Your payment is being processed. This may take a moment."}
            </p>
          </>
        )}

        {/* Success (only shown briefly before auto-redirect, or as a fallback) */}
        {status === "PAID" && (
          <>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-sem-done/20">
              <svg aria-hidden="true" className="h-6 w-6 text-sem-done" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <PageTitle>Payment successful!</PageTitle>
            <p className="mt-2 text-sm text-muted">
              {ctx === "ticket"
                ? "Your ticket has been confirmed. Check your email for details."
                : "Your drink order has been confirmed."}
            </p>
            <Button href={eventUrl} size="lg" variant="primary" className="mt-4 w-full">
              Back to event
            </Button>
          </>
        )}

        {/* Failed / Expired */}
        {(status === "FAILED" || status === "EXPIRED") && (
          <>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-sem-crit/20">
              <svg aria-hidden="true" className="h-6 w-6 text-sem-crit" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <PageTitle>
              Payment {status === "EXPIRED" ? "expired" : "failed"}
            </PageTitle>
            <p className="mt-2 text-sm text-muted">
              {status === "EXPIRED"
                ? "The payment session has expired. Please try again."
                : "Something went wrong with your payment. Please try again."}
            </p>
            <Button href={eventUrl} size="lg" variant="primary" className="mt-4 w-full">
              Try again
            </Button>
          </>
        )}

        {/* Not Found */}
        {status === "NOT_FOUND" && (
          <>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-sem-warn/20">
              <svg aria-hidden="true" className="h-6 w-6 text-sem-warn" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <PageTitle>Payment not found</PageTitle>
            <p className="mt-2 text-sm text-muted">
              We couldn&apos;t find this payment. It may still be processing.
            </p>
            <Button href="/events" size="lg" variant="primary" className="mt-4 w-full">
              Go to events
            </Button>
          </>
        )}
      </Card>
    </PageShell>
  );
}

export default function PaymentCallbackPage() {
  return (
    <Suspense
      fallback={
        <PageShell width="focus">
          <Card className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-line border-t-accent" />
            <PageTitle>Loading...</PageTitle>
          </Card>
        </PageShell>
      }
    >
      <PaymentCallbackContent />
    </Suspense>
  );
}
