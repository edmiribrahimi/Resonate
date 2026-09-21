"use client";

import { useId, useState, useTransition } from "react";
import { Button, FOCUS_RING } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { reserveFreeTickets } from "./free-order-actions";

/**
 * FreeOrderForm — il modulo con cui si prenota una serata gratuita.
 *
 * ── UNO SOLO, PER TUTTI — `D-50-20` ─────────────────────────────────────────
 *
 * Questo controllo sostituisce il pulsante «I'm going», e la sostituzione non
 * e' estetica: quel pulsante scriveva in `rsvps` per chi aveva una sessione, e
 * per chi non ce l'aveva salvava un'intenzione nel browser e lo mandava alla
 * pagina d'iscrizione — che dal piano 50-06 risponde 404. Da qui **tutti**
 * passano per la stessa strada e ottengono la stessa cosa: un ordine a totale
 * zero, biglietti veri, la stessa mail con QR e link firmato, la stessa porta
 * (`D-50-18`).
 *
 * La differenza per chi ha una sessione e' **solo** che i due campi arrivano
 * gia' compilati, e restano modificabili: qualcuno prenota per se' e qualcun
 * altro dalla mail del telefono che ha in mano. Precompilare non e' decidere.
 *
 * ── I DUE CAMPI SONO GLI STESSI DEL MODULO A PAGAMENTO — `D-50-18b` ─────────
 *
 * `Full name` e mail, nello stesso ordine, con le stesse proprieta' di
 * compilazione automatica. **Il nome va all'account e non al biglietto**:
 * `holder_label` resta un progressivo dentro l'ordine, il biglietto resta al
 * portatore (`D-49-03`), e lo schermo dello staff alla porta non mostra un
 * nome — un nome letto alla porta e' un ospite valido rifiutato davanti a una
 * fila (`checkin-offline.md`).
 *
 * ── NESSUNA VALIDAZIONE DI FORMA QUI ────────────────────────────────────────
 *
 * La forma la controlla il server, e la frase che ne torna e' l'unica. Una
 * seconda copia sarebbe una seconda verita' che nessuno confronta — e' la
 * regola gia' scritta accanto al campo gemello in `TierSelection.tsx`. Le
 * undici cause dell'azione sono distinte apposta: si mostrano
 * **come arrivano**, senza riscriverle e senza fonderne due in una. Il
 * precedente contrario e' in questo progetto: il modulo della newsletter
 * risponde con una frase sola per la rete assente, per la chiave mancante e
 * per l'indirizzo gia' iscritto, e rende quei tre casi indistinguibili sia per
 * chi legge sia per chi ripara.
 *
 * ── IL PANNELLO NON SI CHIUDE DA SOLO, E LA PAGINA NON SI RICARICA ──────────
 *
 * Difetto registrato il 2026-08-22 su questa stessa superficie: alla conferma
 * il pannello spariva dopo due secondi e mezzo e la pagina tornava a caricarsi,
 * lasciando come unico artefatto una mail che il fornitore puo' accettare e non
 * consegnare mai. Qui l'esito **resta sullo schermo**, dice quanti biglietti
 * esistono, dice **se la mail e' partita davvero**, e offre l'indirizzo dove i
 * biglietti stanno. Questo progetto non ha error tracking: un fallimento che
 * conta deve avere un effetto osservabile, e l'unico effetto osservabile e' cio'
 * che la persona legge.
 *
 * ── IL TETTO ARRIVA DALLA SERATA ────────────────────────────────────────────
 *
 * `maxTicketsPerOrder` limita cio' che si puo' **scegliere**, e nient'altro:
 * tutto cio' che sta in un componente client e' pubblico. Il tetto autoritativo
 * e la capienza vivono dentro la transazione di `reserve_ticket_order`, che e'
 * l'unico posto dove reggono sotto concorrenza. Il numero ha una casa sola —
 * `event_parties.max_tickets_per_order`, 6 per default (`D-50-26`) — e non
 * diventa una costante di questo file.
 */

interface FreeOrderFormProps {
  /** La serata. L'azione la rilegge dal database: qui e' solo cio' che si invia. */
  partyId: string;
  /** Il tetto per ordine **di questa serata**, non una costante di questo file. */
  maxTicketsPerOrder: number;
  /** La mail della sessione, quando c'e'. Precompila, non decide. */
  sessionEmail?: string | null;
  /** Il nome gia' noto all'account, quando c'e'. Stessa regola. */
  sessionName?: string | null;
  /** Serve solo a ricostruire il ritorno verso questa pagina. */
  eventSlug: string;
}

type Outcome = {
  orderId: string;
  ticketCount: number;
  emailSent: boolean;
  email: string;
};

export default function FreeOrderForm({
  partyId,
  maxTicketsPerOrder,
  sessionEmail = null,
  sessionName = null,
  eventSlug,
}: FreeOrderFormProps) {
  // Stesso calcolo, stessa ragione del modulo a pagamento: un valore assente o
  // fuori scala vale 1, cosi' il controllo resta vivo e si prenota un biglietto
  // per volta invece di offrirne sei su una serata che ne ammette due.
  const cap =
    Number.isInteger(maxTicketsPerOrder) && maxTicketsPerOrder > 0
      ? maxTicketsPerOrder
      : 1;

  const [fullName, setFullName] = useState(sessionName ?? "");
  const [email, setEmail] = useState(sessionEmail ?? "");
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [isPending, startTransition] = useTransition();

  const nameFieldId = useId();
  const emailFieldId = useId();
  const quantityFieldId = useId();

  function handleReserve() {
    setError(null);
    setOutcome(null);

    startTransition(async () => {
      const result = await reserveFreeTickets({
        partyId,
        quantity,
        email,
        fullName,
      });

      if (result.success) {
        setOutcome({
          orderId: result.orderId,
          ticketCount: result.ticketCount,
          emailSent: result.emailSent,
          email: email.trim(),
        });
        return;
      }

      // La frase arriva dal server e si mostra com'e'. I rifiuti di questa
      // azione sono **valori di ritorno** e non eccezioni, apposta: Next redige
      // il messaggio di un errore sollevato da una Server Action in un build di
      // produzione, e frasi diverse arriverebbero identiche proprio dove
      // contano.
      setError(result.error);
    });
  }

  // L'indirizzo dei biglietti per chi non ha una sessione: l'ordine si risolve
  // in una pagina aperta da una **firma**, non da un login. E' lo stesso
  // percorso che il piano 49-06 ha costruito per chi compra da ospite, e
  // riusarlo significa che **nessuna superficie nuova nasce qui** — in
  // particolare nessuna che possa mostrare un luogo (`D-49-04`).
  const ticketsHref = outcome
    ? `/payment/callback?${new URLSearchParams({
        order: outcome.orderId,
        ctx: "ticket_order",
        slug: eventSlug,
      }).toString()}`
    : null;

  if (outcome && ticketsHref) {
    return (
      <div
        role="status"
        className="rounded-2xl border border-sem-done/30 bg-sem-done/10 p-4"
      >
        <p className="text-sm font-medium text-sem-done">
          {outcome.ticketCount === 1
            ? "You have a ticket for this night."
            : `You have ${outcome.ticketCount} tickets for this night.`}
        </p>

        {/*
          L'esito della mail si dichiara in entrambi i versi. Il ramo negativo
          non annulla niente — i biglietti esistono gia' — ma chi ha prenotato
          deve sapere che non deve aspettare un messaggio che non arrivera'.
        */}
        {outcome.emailSent ? (
          <p className="mt-2 text-xs text-ink-2">
            They are also on their way to {outcome.email}. You never need to open
            that email — showing the QR code from the ticket is enough.
          </p>
        ) : (
          <p className="mt-2 text-xs text-sem-warn">
            Your tickets exist, but the email to {outcome.email} did not go out.
            Open them from the link below and keep it: it is the only copy you
            have right now.
          </p>
        )}

        {/*
          Un collegamento, e nessuna chiusura automatica: chi ha prenotato
          decide quando lasciare questa schermata. La frase non promette un
          account, perche' per una parte di chi prenota l'account nasce ora e
          non ha ancora una password.
        */}
        <a
          href={ticketsHref}
          className={`mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-full bg-accent px-6 text-sm font-semibold text-ground transition-colors hover:bg-accent-hover active:scale-95 active:opacity-80 ${FOCUS_RING}`}
        >
          Open my tickets
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <div
          role="alert"
          className="rounded-2xl border border-sem-crit/40 bg-sem-crit/10 p-4"
        >
          <p className="text-sm text-sem-crit">{error}</p>
        </div>
      )}

      {/*
        Il nome **sopra** la mail, come sul modulo a pagamento: i due moduli
        devono somigliarsi, perche' chi passa dall'uno all'altro sta facendo la
        stessa cosa con un prezzo diverso.
      */}
      <Input
        id={nameFieldId}
        label="Full name"
        type="text"
        autoComplete="name"
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        disabled={isPending}
        placeholder="Your name"
        hint="It goes on the account these tickets belong to, never on the tickets."
      />

      {/*
        `inputMode` e `autoComplete` perche' questo campo si compila su un
        telefono, spesso in piedi.
      */}
      <Input
        id={emailFieldId}
        label="Where should the tickets go?"
        type="email"
        inputMode="email"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={isPending}
        placeholder="you@example.com"
        hint="Your tickets and, later, the address arrive here. No account needed."
      />

      <Select
        id={quantityFieldId}
        label="How many"
        value={String(quantity)}
        onChange={(e) => setQuantity(Number(e.target.value))}
        disabled={isPending}
        hint={
          cap > 1
            ? `Up to ${cap} per order — not per person.`
            : "One ticket per order on this night."
        }
      >
        {Array.from({ length: cap }, (_, i) => i + 1).map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </Select>

      <Button className="w-full" disabled={isPending} onClick={handleReserve}>
        {isPending ? "Reserving..." : quantity === 1 ? "Reserve" : `Reserve ${quantity}`}
      </Button>
    </div>
  );
}
