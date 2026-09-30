"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import SumUpCheckoutModal from "@/app/(public)/events/[slug]/SumUpCheckoutModal";
import { resumeTicketOrder } from "./resume-actions";

/**
 * «Resume payment» sulla pagina di un ordine non pagato (CART-04).
 *
 * Tutto cio' che decide sta nella Server Action: firma, preventivo, checkout.
 * Qui c'e' solo il pulsante, il modulo carta e la frase del rifiuto — ogni
 * rifiuto con la sua, perche' hanno rimedi diversi (riprovare, ricominciare
 * dalla serata, nessun rimedio). Nessun timer e nessuna «reservation»: il
 * prodotto non trattiene posti, e un conto alla rovescia lo prometterebbe.
 *
 * Il token viaggia gia' nell'indirizzo di questa pagina: passarlo all'azione
 * non consegna niente che il browser non abbia.
 */
export default function ResumePayment({ token }: { token: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [checkout, setCheckout] = useState<{ checkoutId: string; orderId: string } | null>(
    null
  );

  function handleResume() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await resumeTicketOrder(token);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        if ("alreadyPaid" in result) {
          window.location.assign(result.redirectTo);
          return;
        }
        setCheckout({ checkoutId: result.checkoutId, orderId: result.orderId });
      } catch (err) {
        console.error(
          `[tickets.resume_action_unreachable] ${err instanceof Error ? err.message : "errore non-Error"}`
        );
        setError(
          "We could not reach our server just now. Nothing was charged — try again in a moment."
        );
      }
    });
  }

  return (
    <>
      <Button size="lg" className="mt-4 w-full" onClick={handleResume} disabled={pending}>
        {pending ? "Opening payment…" : "Resume payment"}
      </Button>
      {error ? (
        <p role="alert" className="mt-3 text-sm text-sem-crit">
          {error}
        </p>
      ) : null}
      {checkout ? (
        <SumUpCheckoutModal
          checkoutId={checkout.checkoutId}
          onClose={() => setCheckout(null)}
          onPaymentComplete={() => setCheckout(null)}
          successOutcome={{
            message:
              "Your tickets are being issued. They also arrive by email — and they are transferable, so you can pass them on to whoever is coming with you.",
            href: `/payment/callback?order=${checkout.orderId}&ctx=ticket_order`,
            label: "Open my tickets",
          }}
        />
      ) : null}
    </>
  );
}
