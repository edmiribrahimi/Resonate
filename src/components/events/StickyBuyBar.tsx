"use client";

import { useEffect, useRef, useState } from "react";
import { FOCUS_RING } from "@/components/ui/Button";
import { formatTime } from "@/utils/formatTime";
import { lowestOnSalePrice, type PublicTier } from "@/lib/tickets/tier-status";

/**
 * La barra fissa in fondo alla pagina della serata: prezzo, quando, «Buy».
 *
 * ═════════════════════════════════════════════════════════════════════════════
 * COSA NON PORTA, E PERCHE' E' LA SUA PROPRIETA' PRINCIPALE
 * ═════════════════════════════════════════════════════════════════════════════
 *
 * **Nessun luogo.** Le props sono data, ora e tier: non esiste un campo in cui
 * un indirizzo o un nome di locale possa entrare, e aggiungerlo «per rendere la
 * barra piu' utile» violerebbe `venue-secrecy.md` sulla superficie piu' letta
 * del prodotto. Il file sta sotto `src/components/events/**` apposta: e' il
 * routing che carica quel modulo su chi lo tocca.
 *
 * ── Cosa mostra ──────────────────────────────────────────────────────────────
 *
 * Decisione del proprietario, 2026-09-21: il **minimo fra i tier in vendita
 * ora**, con «from» solo se ne e' in vendita piu' d'uno; «Free» a zero; e la
 * barra **sparisce** quando nulla e' in vendita. Lo stato dei tier e' lo stesso
 * calcolo del controllo d'acquisto (`src/lib/tickets/tier-status.ts`): una
 * barra che promette un prezzo che il controllo non offre e' un difetto che chi
 * compra vede per primo.
 *
 * Il pulsante **non compra**: scorre fino ai tier. La barra e' un dito puntato,
 * il denaro passa solo dal controllo che gia' esiste.
 *
 * ── Quando si nasconde ───────────────────────────────────────────────────────
 *
 * Quando la sezione dei biglietti e' gia' sullo schermo (IntersectionObserver
 * sull'ancora): una barra che copre il modulo che indica e' peggio di nessuna
 * barra. E prima del mount non rende nulla: lo stato dei tier dipende
 * dall'orologio, e un calcolo fatto sul server e ripetuto nel browser puo'
 * dare due risposte a cavallo di una scadenza.
 *
 * ── Dove sta ─────────────────────────────────────────────────────────────────
 *
 * Sopra la barra di navigazione del telefono, che e' fissa in basso: l'offset e'
 * `--nav-inset-block-end`, la stessa variabile che `PageShell` usa per non
 * finire sotto la nav, e che vale 0 dal tablet in su. `z-40`: sotto la nav
 * (`z-50`) e sotto i dialoghi (`z-[60]`).
 */
export interface StickyBuyBarNight {
  id: string;
  /** ISO date, `YYYY-MM-DD`. */
  date: string;
  /** `HH:MM:SS`. */
  time: string;
  tiers: PublicTier[];
}

interface StickyBuyBarProps {
  nights: StickyBuyBarNight[];
  /** L'`id` dell'elemento a cui il pulsante scorre. */
  anchorId: string;
}

function formatPrice(price: number) {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(price);
}

function formatDay(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function StickyBuyBar({ nights, anchorId }: StickyBuyBarProps) {
  const [offer, setOffer] = useState<{
    priceLabel: string;
    when: string;
  } | null>(null);
  const [anchorInView, setAnchorInView] = useState(false);

  // Dopo il mount, e ogni minuto: le scadenze dei tier passano mentre la pagina
  // e' aperta, e una barra che continua a dire «from €15» dopo la fine
  // dell'early bird e' esattamente il difetto che questo file evita.
  useEffect(() => {
    function compute() {
      const now = new Date();
      const sorted = [...nights].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
      for (const night of sorted) {
        const lowest = lowestOnSalePrice(night.tiers, now);
        if (!lowest) continue;
        const priceLabel =
          lowest.price === 0
            ? "Free"
            : `${lowest.several ? "from " : ""}${formatPrice(lowest.price)}`;
        setOffer({ priceLabel, when: `${formatDay(night.date)} · ${formatTime(night.time)}` });
        return;
      }
      setOffer(null);
    }
    compute();
    const interval = setInterval(compute, 60_000);
    return () => clearInterval(interval);
  }, [nights]);

  useEffect(() => {
    const anchor = document.getElementById(anchorId);
    if (!anchor || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => setAnchorInView(entries.some((e) => e.isIntersecting)),
      { rootMargin: "0px 0px -20% 0px" }
    );
    observer.observe(anchor);
    return () => observer.disconnect();
  }, [anchorId]);

  // The bar is `fixed`, so it takes no room in the flow and covers whatever
  // ends the page — the footer's Terms, Refund policy, Privacy and Contact,
  // seen covered on 2026-09-24. The spacer below gives the document that room,
  // measured from the bar itself so a longer price label or a taller button
  // never desynchronises the two. It stays while the bar is merely hidden
  // behind the tickets section, so the end of the page does not jump by a
  // bar's height every time the anchor scrolls in and out of view.
  const barRef = useRef<HTMLDivElement>(null);
  const [barHeight, setBarHeight] = useState(0);
  useEffect(() => {
    const el = barRef.current;
    if (!el) return;
    const measure = () => setBarHeight(el.getBoundingClientRect().height);
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [offer, anchorInView]);

  if (!offer) return null;

  // Always mounted once there is an offer, so it can FADE (owner, 2026-09-24)
  // instead of appearing: hidden while the tickets section is in view —
  // transparent, nudged down 8px, inert to the pointer and to assistive tech —
  // and eased back in 300ms when the section scrolls away. Reduced motion gets
  // the state change without the transition.
  return (
    <>
    <div aria-hidden style={{ height: barHeight }} />
    <div
      ref={barRef}
      // A floating pill, like the navigation under it (owner, 2026-09-24):
      // inset 1rem from the edges, fully rounded, same glass. Its bottom is
      // the content clearance, which already holds the navigation pill and
      // 0.75rem of air above it — so the two pills stack with that gap. In
      // the column form the start inset moves past the column.
      className={`fixed start-4 end-4 z-40 rounded-full border border-line bg-ground/75 shadow-lg backdrop-blur-xl md:start-[calc(var(--nav-inset-inline-start)+1rem)] transition-[opacity,transform] duration-300 ease-out motion-reduce:transition-none ${
        anchorInView ? "pointer-events-none translate-y-2 opacity-0" : "translate-y-0 opacity-100"
      }`}
      style={{ bottom: "var(--nav-inset-block-end, 0px)" }}
      role="region"
      aria-label="Tickets on sale"
      aria-hidden={anchorInView || undefined}
    >
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 py-1.5 ps-5 pe-1.5">
        <div className="min-w-0">
          <p className="truncate text-base font-bold text-ink">{offer.priceLabel}</p>
          <p className="truncate text-xs text-muted">{offer.when}</p>
        </div>
        <a
          href={`#${anchorId}`}
          onClick={(e) => {
            e.preventDefault();
            document.getElementById(anchorId)?.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
          className={`flex h-11 shrink-0 items-center justify-center rounded-full bg-accent px-6 text-sm font-semibold text-ground transition-transform active:scale-95 ${FOCUS_RING}`}
        >
          Buy tickets
        </a>
      </div>
    </div>
    </>
  );
}
