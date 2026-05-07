"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, useRef, Suspense } from "react";
import { checkPaymentStatus, type PaymentCallbackStatus } from "./actions";

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
    <div className="flex min-h-dvh items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-2xl border border-card-border bg-card p-6 text-center">
        {/* Checking / Pending */}
        {(status === "checking" || status === "PENDING") && (
          <>
            <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-card-border border-t-accent" />
            <h1 className="text-lg font-semibold text-foreground">
              {status === "checking" ? "Verifying payment..." : "Payment processing..."}
            </h1>
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
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-500/20">
              <svg className="h-6 w-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-lg font-semibold text-foreground">Payment successful!</h1>
            <p className="mt-2 text-sm text-muted">
              {ctx === "ticket"
                ? "Your ticket has been confirmed. Check your email for details."
                : "Your drink order has been confirmed."}
            </p>
            <a
              href={eventUrl}
              className="mt-4 inline-block w-full rounded-full bg-accent py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
            >
              Back to event
            </a>
          </>
        )}

        {/* Failed / Expired */}
        {(status === "FAILED" || status === "EXPIRED") && (
          <>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/20">
              <svg className="h-6 w-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-lg font-semibold text-foreground">
              Payment {status === "EXPIRED" ? "expired" : "failed"}
            </h1>
            <p className="mt-2 text-sm text-muted">
              {status === "EXPIRED"
                ? "The payment session has expired. Please try again."
                : "Something went wrong with your payment. Please try again."}
            </p>
            <a
              href={eventUrl}
              className="mt-4 inline-block w-full rounded-full bg-accent py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
            >
              Try again
            </a>
          </>
        )}

        {/* Not Found */}
        {status === "NOT_FOUND" && (
          <>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-yellow-500/20">
              <svg className="h-6 w-6 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h1 className="text-lg font-semibold text-foreground">Payment not found</h1>
            <p className="mt-2 text-sm text-muted">
              We couldn&apos;t find this payment. It may still be processing.
            </p>
            <a
              href="/events"
              className="mt-4 inline-block w-full rounded-full bg-accent py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
            >
              Go to events
            </a>
          </>
        )}
      </div>
    </div>
  );
}

export default function PaymentCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl border border-card-border bg-card p-6 text-center">
            <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-card-border border-t-accent" />
            <h1 className="text-lg font-semibold text-foreground">Loading...</h1>
          </div>
        </div>
      }
    >
      <PaymentCallbackContent />
    </Suspense>
  );
}
