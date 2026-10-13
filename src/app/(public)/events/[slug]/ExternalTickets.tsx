import { Badge } from "@/components/ui/Chip";
import { Button, FOCUS_RING } from "@/components/ui/Button";
import { computeTierStatuses, type PublicTier, type TierStatus } from "@/lib/tickets/tier-status";

/**
 * I tier di una serata venduta da un TERZO (`event_parties.external_tickets_*`,
 * quick 2026-10-13).
 *
 * Stessa lista di `TierSelection` — nome, cosa include, stato, prezzo — ma
 * nessuna cassa: ogni riga disponibile e' un link verso l'evento sulla
 * piattaforma del venditore, e il bottone in fondo e' lo stesso link. E' un
 * componente SERVER senza stato e senza azioni, di proposito: la cassa nostra
 * per questa serata non esiste, e il confine vero sta nel preventivo d'ordine
 * (`order-quote.ts`, QUOTE_NIGHT_SOLD_ELSEWHERE), non qui. `scripts/verify-external-tickets.mjs`
 * controlla che questo file resti cosi'.
 *
 * `url` nullo = il link non esiste ancora: le righe restano, senza link, e il
 * bottone lascia il posto a «Tickets soon». Il sold out arriva A MANO
 * (`ticket_tiers.sold_out`): non vediamo le vendite del terzo, e i prezzi sono
 * copiati da chi organizza — la frase in fondo dice a chi legge di chi sono
 * biglietti, ingresso e rimborsi.
 */
interface ExternalTicketsProps {
  seller: string;
  url: string | null;
  label: string | null;
  tiers: PublicTier[];
}

function formatPrice(price: number) {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(price);
}

function statusLabel(status: TierStatus): string {
  switch (status) {
    case "coming_soon":
      return "Coming soon";
    case "available":
      return "Available";
    case "sold_out":
      return "Sold out";
    case "expired":
      return "Expired";
  }
}

export default function ExternalTickets({ seller, url, label, tiers }: ExternalTicketsProps) {
  const statuses = computeTierStatuses(tiers);
  const buttonText = label?.trim() || "Get tickets";

  return (
    <div>
      {tiers.length > 0 && (
        <div className="space-y-2 mb-4">
          {tiers.map((tier, i) => {
            const status = statuses[i];
            const clickable = status === "available" && url !== null;
            const body = (
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink">{tier.name}</p>
                  {tier.description ? (
                    <p className="mt-1 whitespace-pre-line text-xs text-ink-2">{tier.description}</p>
                  ) : null}
                  <div className="mt-1 flex items-center gap-2">
                    <Badge className="shrink-0">{statusLabel(status)}</Badge>
                  </div>
                </div>
                <p className="shrink-0 text-sm font-bold text-accent">{formatPrice(tier.price)}</p>
              </div>
            );
            return clickable ? (
              <a
                key={tier.id}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className={`block min-h-11 w-full rounded-2xl border border-line bg-surface p-4 text-left transition-all hover:border-accent/50 active:scale-95 active:opacity-80 ${FOCUS_RING}`}
              >
                {body}
              </a>
            ) : (
              <div
                key={tier.id}
                aria-disabled="true"
                className="block min-h-11 w-full rounded-2xl border border-line bg-surface/50 p-4 text-left opacity-50"
              >
                {body}
              </div>
            );
          })}
        </div>
      )}

      {url ? (
        <Button className="w-full" href={url} target="_blank" rel="noopener noreferrer">
          {buttonText}
        </Button>
      ) : (
        <div role="status" className="rounded-xl border border-line bg-surface px-4 py-3 text-center">
          <p className="text-sm font-medium text-ink">Tickets soon</p>
        </div>
      )}

      <p className="mt-3 text-xs text-muted">
        Tickets are sold by {seller}. Entry, refunds and support for this night are handled by the
        seller, under its own terms.
      </p>
    </div>
  );
}
