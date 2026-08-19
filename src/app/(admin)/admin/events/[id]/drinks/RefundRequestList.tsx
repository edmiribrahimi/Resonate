"use client";

import { useState, useTransition } from "react";

import { Badge } from "@/components/ui/Chip";
import { Button, FOCUS_RING } from "@/components/ui/Button";
import {
  approveDrinkRefund,
  rejectDrinkRefund,
} from "@/app/(admin)/admin/events/actions";

/**
 * Le richieste di rimborso in attesa di una serata, con accanto **quante volte
 * quel token e' stato attivato**.
 *
 * ── Il numero e' un fatto, non un giudizio ──────────────────────────────────
 *
 * Non e' colorato, non porta un'etichetta di sospetto, non ordina la lista.
 * **Quattro attivazioni possono essere quattro ripensamenti in una fila lunga**,
 * e possono essere qualcuno che ha ciclato il token tutta la sera: la superficie
 * porta il fatto, il giudizio e' della persona — ed e' esattamente per questo che
 * questa strada e' manuale invece che automatica.
 *
 * Il numero esiste perche' **prima non c'era modo di distinguere i due casi**:
 * `deactivate_drink_token` azzerava l'unica traccia. E vale in entrambe le
 * direzioni — senza di esso non si puo' nemmeno **dimostrare che al banco si e'
 * lavorato bene**. Vedi `.planning/v1.6-PHASE-47-PROBE.md`.
 *
 * ── Nessuna richiesta viene respinta da sola ────────────────────────────────
 *
 * Un rifiuto automatico e' un rimborso automatico con il segno cambiato, e la
 * decisione del proprietario riguarda entrambi i segni. Qui non c'e' nessun ramo
 * che chiuda una richiesta senza che qualcuno prema.
 *
 * ── Disegnare questa lista non protegge niente ──────────────────────────────
 *
 * Il confine sono le policy di `drink_refund_request`, che chiedono
 * `staff.manage`. Questo file e' `"use client"`: riceve righe gia' lette dal
 * server e non porta alcun controllo di permesso — un controllo qui sarebbe un
 * controllo che chi guarda puo' modificare.
 */
export interface PendingRefund {
  tokenId: string;
  drinkName: string;
  price: number;
  activationCount: number | null;
  requestedAt: string;
  redeemed: boolean;
}

export default function RefundRequestList({
  requests,
}: {
  requests: readonly PendingRefund[];
}) {
  if (requests.length === 0) {
    return (
      <p className="text-sm text-muted">
        Nessuna richiesta di rimborso in attesa per questa serata.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {requests.map((r) => (
        <RefundRow key={r.tokenId} request={r} />
      ))}
    </ul>
  );
}

function RefundRow({ request }: { request: PendingRefund }) {
  const [pending, start] = useTransition();
  const [esito, setEsito] = useState<string | null>(null);

  if (esito) {
    return (
      <li className="rounded-xl border border-line p-4 text-sm text-ink-2">
        {esito}
      </li>
    );
  }

  const decidi = (fn: () => Promise<{ ok: boolean; message?: string }>) =>
    start(async () => {
      const r = await fn();
      setEsito(
        r.ok
          ? "Fatto."
          : // Il messaggio arriva intero da chi ha rifiutato. Un riassunto qui
            // rimetterebbe il «qualcosa e' andato storto» che questa fase toglie.
            (r.message ?? "Non riuscito.")
      );
    });

  return (
    <li className="rounded-xl border border-line p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-ink">{request.drinkName}</p>
          <p className="mt-0.5 text-xs text-muted">
            &euro;{request.price.toFixed(2)} · chiesto il{" "}
            {new Date(request.requestedAt).toLocaleDateString("it-IT")}
          </p>
        </div>
        {/*
          Nessun tono per esito: `Badge` neutro. Il conteggio e' un numero, e
          «attivato 4 volte» non e' piu' allarmante di «attivato 0 volte» finche'
          qualcuno non lo interpreta — e a interpretarlo e' la persona, non il
          colore.
        */}
        <Badge className="shrink-0">
          {request.activationCount === null
            ? "attivazioni: nessun dato"
            : `attivato ${request.activationCount} ${request.activationCount === 1 ? "volta" : "volte"}`}
        </Badge>
      </div>

      {request.redeemed && (
        <p className="mt-2 text-xs text-ink-2">
          Questo drink risulta <strong>servito</strong>.
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          disabled={pending}
          onClick={() => decidi(() => approveDrinkRefund(request.tokenId))}
        >
          Rimborsa
        </Button>
        <button
          type="button"
          disabled={pending}
          onClick={() => decidi(() => rejectDrinkRefund(request.tokenId))}
          className={`min-h-11 text-sm text-muted underline decoration-dotted underline-offset-4 transition-colors hover:text-ink disabled:opacity-50 ${FOCUS_RING}`}
        >
          Respingi
        </button>
      </div>
    </li>
  );
}
