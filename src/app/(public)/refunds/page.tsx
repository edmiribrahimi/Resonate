import type { Metadata } from "next";
import AppNav from "@/components/layout/AppNav";
import type { UserRole } from "@/types/database";
import { getAccessContext } from "@/lib/capabilities/server";
import { PageShell } from "@/components/ui/PageShell";
import { LegalBody, LegalSection, LEGAL_CONTACT } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Refund policy — re:sonate",
  description: "When a re:sonate ticket is refunded, and when it is not.",
};

/**
 * La regola dei rimborsi, decisa dal proprietario il 2026-09-21: nessun
 * rimborso salvo annullamento o spostamento della data, e allora intero. I
 * token drink non usati **non** si rimborsano — confermato due volte dal
 * proprietario nella stessa sessione; il rimborso automatico che il prodotto
 * aveva e' stato rimosso il 2026-08-20 (`DRK-01`). Un rimborso, quando e'
 * dovuto, e' manuale su SumUp (`finance-lives-in-sumup`).
 */
export default async function RefundsPage() {
  // La navigazione, come su ogni pagina pubblica: il wrapper dichiara lo
  // spazio della colonna e `AppNav` e' suo fratello — la forma di
  // `src/app/(public)/events/page.tsx`, letta dal controllo E di
  // `verify:conversion` in QUESTO file. Nessun'altra lettura.
  const { role, capabilities, liveAssignmentCapabilities } = await getAccessContext();
  return (
    <>
    <div className="md:[--nav-inset-inline-start:14rem]">
    <PageShell width="default">
    <LegalBody
      title="Refund policy"
      intro="Short version: tickets are not refunded if you change your mind. They are refunded in full if we cancel or move the event."
    >
      <LegalSection heading="If you cannot come">
        <p>
          A ticket is for an event on a fixed date, so there is no right of withdrawal and{" "}
          <strong>tickets are not refunded</strong> if you cannot attend, arrive late, or leave
          early.
        </p>
        <p>
          Tickets are not named: if you cannot come, you can forward your ticket to somebody else.
          The code admits whoever shows it first, once.
        </p>
      </LegalSection>

      <LegalSection heading="If we cancel or move the event">
        <p>
          If we cancel an event, or move it to a different date, every ticket for that event is{" "}
          <strong>refunded in full</strong>, including free reservations (which have nothing to
          refund) and any drinks bought in advance for that event.
        </p>
        <p>
          The refund goes back to the payment method used for the order. We process it within 14
          days of the announcement; how long it takes to appear depends on your bank or card
          provider.
        </p>
        <p>
          A change of venue within the same city, a change of line-up or a change of set times is
          not a cancellation, and does not give a right to a refund.
        </p>
      </LegalSection>

      <LegalSection heading="Drinks bought in advance">
        <p>
          Drink tokens are valid for the event they were bought for, until the bar menu closes.{" "}
          <strong>Unused tokens are not refunded.</strong> The only exception is the one above: if
          the event is cancelled or moved, tokens are refunded together with the tickets.
        </p>
      </LegalSection>

      <LegalSection heading="Payments that did not go through">
        <p>
          If a payment session expired or failed, no ticket was issued and nothing should have
          been charged. If you see a charge for an order that has no tickets, write to{" "}
          <a href={`mailto:${LEGAL_CONTACT}`} className="inline-flex min-h-11 items-center text-accent">{LEGAL_CONTACT}</a> with the
          order email or the date and amount, and we will sort it out.
        </p>
      </LegalSection>

      <LegalSection heading="How to reach us">
        <p>
          For any question about a refund, write to{" "}
          <a href={`mailto:${LEGAL_CONTACT}`} className="inline-flex min-h-11 items-center text-accent">{LEGAL_CONTACT}</a>. Include
          the email address you used for the order.
        </p>
      </LegalSection>
    </LegalBody>
    </PageShell>
    </div>
    <AppNav
      role={role as UserRole | null}
      capabilities={[...capabilities]}
      liveAssignmentCapabilities={
        liveAssignmentCapabilities ? [...liveAssignmentCapabilities] : null
      }
    />
    </>
  );
}
