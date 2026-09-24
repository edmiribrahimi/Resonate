"use client";

import { useId, useState, useTransition } from "react";
import { resendOrderTickets } from "@/app/(public)/events/[slug]/guest-purchase-actions";
import { Button } from "@/components/ui/Button";

/**
 * «Non hai ricevuto la mail?» — il primo posto nel prodotto che espone
 * `resendOrderTickets`, che esisteva dalla fase 49 senza un bottone.
 *
 * ── Perche' si chiede l'indirizzo invece di prenderlo dall'ordine ────────────
 *
 * Questa pagina si apre con un link **al portatore** e per decisione scritta
 * nel suo docblock non seleziona `buyer_email`: chi riceve un biglietto
 * inoltrato non deve leggere l'indirizzo di chi ha pagato. Prenderlo dall'ordine
 * qui rifarebbe dal lato client cio' che il server ha scelto di non fare.
 * L'azione, del resto, e' disegnata cosi': accetta un indirizzo e risponde con
 * **la stessa frase** che l'indirizzo abbia ordini o no, cosi' che nessuno possa
 * usarla per scoprire chi ha comprato.
 *
 * ── Cosa NON promette ────────────────────────────────────────────────────────
 *
 * Se la mail non e' partita per una causa di configurazione, ripartira' con la
 * stessa causa: questo bottone copre la posta finita nello spam, cancellata o
 * un intoppo passeggero del fornitore, non un guasto nostro. Il guasto nostro
 * lo vede chi organizza, sulla lista dei venduti, come esito «not delivered» o
 * «no send recorded». Detto qui invece di lasciarlo intendere.
 *
 * I rifiuti arrivano come valore di ritorno e si mostrano come arrivano: Next
 * redige il messaggio di un'eccezione sollevata da una Server Action in
 * produzione, e le tre cause distinte diventerebbero una sola frase vuota.
 */
export default function ResendTicketsForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<{ tone: "ok" | "crit"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const inputId = useId();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage(null);
    startTransition(async () => {
      const result = await resendOrderTickets({ email });
      if (result.success) {
        setMessage({ tone: "ok", text: result.message });
        return;
      }
      setMessage({ tone: "crit", text: result.error });
    });
  }

  return (
    <form onSubmit={handleSubmit} className="w-full" noValidate>
      <p className="text-sm font-semibold">Didn&apos;t get the email?</p>
      <p className="mt-1 text-sm text-muted">
        Enter the address you used when you bought and we&apos;ll send the tickets
        again. Check your spam folder first.
      </p>
      <label htmlFor={inputId} className="sr-only">
        Email used for the order
      </label>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          id={inputId}
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          disabled={isPending}
          className="min-h-11 flex-1 rounded-full border border-control bg-sunk px-4 text-sm text-ink placeholder:text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        />
        <Button type="submit" variant="secondary" size="md" disabled={isPending}>
          {isPending ? "Sending..." : "Send again"}
        </Button>
      </div>
      {message ? (
        <p
          role="status"
          className={`mt-3 text-sm ${message.tone === "ok" ? "text-sem-done" : "text-sem-crit"}`}
        >
          {message.text}
        </p>
      ) : null}
    </form>
  );
}
