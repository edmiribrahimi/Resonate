import Link from "next/link";
import type { ReactNode } from "react";
import { PageTitle, SectionHeading } from "@/components/ui/Typography";
import { SiteFooter } from "@/components/legal/SiteFooter";

/**
 * La cornice delle tre pagine legali: titolo, data di aggiornamento, sezioni.
 *
 * ── Cosa queste pagine sono, e cosa non sono ────────────────────────────────
 *
 * Sono **bozze scritte sui fatti del prodotto** — biglietto al portatore, sede
 * comunicata per mail, nessun rimborso salvo annullamento — pubblicate il
 * 2026-09-21 per decisione del proprietario, prima del listing della 003.
 * **Nessun professionista le ha validate**, e questo file non finge il
 * contrario: `legal-compliance.md`, gate *una domanda legale non si risponde
 * qui*. La validazione e' debito aperto, registrato in `.planning/todos/`.
 *
 * Nessuna ragione sociale: il proprietario ha scelto di indicare solo
 * `info@resonatemotion.com`. E' la prima cosa che un professionista chiedera'
 * di aggiungere, ed e' scritta qui perche' chi apre queste pagine fra sei mesi
 * sappia che il vuoto e' una scelta datata, non una dimenticanza.
 *
 * Questo file NON monta la shell ne' la navigazione: le monta ogni file di
 * rotta, perche' `verify:conversion` legge la superficie **nel file di rotta** —
 * il controllo D pretende l'import di `PageShell` li', e il controllo E legge
 * nello stesso file la coppia «wrapper che dichiara lo spazio della colonna +
 * `AppNav` come fratello». Provato il 2026-09-21: con shell e nav qui dentro,
 * D arrossiva su tutte e tre le rotte, ed era un rosso giusto — la forma di
 * una superficie si legge dove la superficie e' dichiarata.
 */
export const LEGAL_CONTACT = "info@resonatemotion.com";
export const LEGAL_UPDATED = "21 September 2026";

export function LegalBody({
  title,
  intro,
  children,
}: {
  title: string;
  intro: string;
  children: ReactNode;
}) {
  return (
    <>
      <div className="mx-auto max-w-2xl">
        <Link href="/events" className="inline-flex min-h-11 items-center text-sm text-muted hover:text-ink">
          &larr; Back to events
        </Link>
        <PageTitle className="mt-4">{title}</PageTitle>
        <p className="mt-1 text-xs text-muted">Last updated {LEGAL_UPDATED}</p>
        <p className="mt-4 text-sm text-ink-2">{intro}</p>
        <div className="mt-8 space-y-8">{children}</div>
        <nav className="mt-10 flex flex-wrap gap-4 text-sm">
          <Link href="/terms" className="inline-flex min-h-11 items-center text-accent">Terms</Link>
          <Link href="/refunds" className="inline-flex min-h-11 items-center text-accent">Refund policy</Link>
          <Link href="/privacy" className="inline-flex min-h-11 items-center text-accent">Privacy</Link>
        </nav>
      </div>
      <SiteFooter />
    </>
  );
}

export function LegalSection({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <section>
      <SectionHeading>{heading}</SectionHeading>
      <div className="space-y-3 text-sm leading-relaxed text-ink-2">{children}</div>
    </section>
  );
}
