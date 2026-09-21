import type { Metadata } from "next";
import Link from "next/link";
import AppNav from "@/components/layout/AppNav";
import type { UserRole } from "@/types/database";
import { getAccessContext } from "@/lib/capabilities/server";
import { PageShell } from "@/components/ui/PageShell";
import { LegalBody, LegalSection, LEGAL_CONTACT } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Terms — re:sonate",
  description: "Terms of sale and participation for re:sonate events.",
};

/**
 * I termini, scritti sui fatti del prodotto — vedi il docblock di `LegalPage`
 * per cosa queste pagine sono e non sono. Ogni frase qui sotto corrisponde a un
 * comportamento del codice o a una decisione del proprietario del 2026-09-21:
 * biglietto al portatore (`D-49-03`), tetto per ordine (`BUY-02`), sede per
 * mail (`D-49-04`), nessun rimborso salvo annullamento, 18+, foto e video.
 */
export default async function TermsPage() {
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
      title="Terms"
      intro="These terms apply when you buy a ticket, reserve a place or attend a re:sonate event. Buying or reserving means you accept them."
    >
      <LegalSection heading="Who we are">
        <p>
          re:sonate is a motion music hub organising music events in Turin and elsewhere. For
          anything about these terms, your tickets or an event, write to{" "}
          <a href={`mailto:${LEGAL_CONTACT}`} className="inline-flex min-h-11 items-center text-accent">{LEGAL_CONTACT}</a>.
        </p>
      </LegalSection>

      <LegalSection heading="Tickets">
        <p>
          A ticket is a QR code. It admits <strong>one person, once</strong>: the first scan at the
          door uses it up, and a second scan of the same code is refused.
        </p>
        <p>
          Tickets are <strong>not named</strong>. You can forward a ticket to somebody else, and
          whoever shows the code first gets in. Keep your codes private until the night, and share
          each code with one person only. We are not responsible for a code that was shared with
          more people than it admits.
        </p>
        <p>
          One order can hold up to the number of tickets shown on the event page. Each ticket in an
          order is a separate code, labelled so you can tell them apart when forwarding.
        </p>
        <p>
          Your tickets are sent by email to the address you give at checkout and are available on
          the order page linked in that email. Check your address carefully: that email is your
          ticket.
        </p>
      </LegalSection>

      <LegalSection heading="Prices and payment">
        <p>
          Prices are shown in euro and include VAT where applicable. There is no service fee on top
          of the price shown. Payments are processed by SumUp; we never see or store your card
          details.
        </p>
        <p>
          Some events offer a free reservation instead of a paid ticket. A free reservation is a
          ticket like any other, with the same rules at the door.
        </p>
        <p>
          A ticket is issued only when the payment is confirmed. If a payment session expires or
          fails, nothing is charged and no ticket is issued.
        </p>
      </LegalSection>

      <LegalSection heading="Refunds and cancellations">
        <p>
          Tickets are for an event on a fixed date, so there is no right of withdrawal after
          purchase and <strong>tickets are not refunded</strong> if you cannot come.
        </p>
        <p>
          If we cancel an event, or move it to another date, you get a full refund. The details are
          in the <Link href="/refunds" className="inline-flex min-h-11 items-center text-accent">refund policy</Link>.
        </p>
      </LegalSection>

      <LegalSection heading="The venue">
        <p>
          Some events are held at a venue that is announced only to ticket holders. When that is the
          case, the address is sent by email to the address on your order, before the event. It is
          not shown on the public event page. If you forward a ticket, forward the address with it.
        </p>
      </LegalSection>

      <LegalSection heading="Entry and conduct">
        <p>
          Our events are for people aged <strong>18 and over</strong>. You may be asked to show a
          valid ID at the door.
        </p>
        <p>
          Entry may be refused, or a person asked to leave, for behaviour that endangers others,
          the venue or the event. No refund is due in that case.
        </p>
        <p>
          Door times, line-ups and set times can change. A change of line-up or set times is not a
          cancellation.
        </p>
      </LegalSection>

      <LegalSection heading="Drinks">
        <p>
          At some events you can buy drinks in advance through the event page. Each purchase gives
          you drink tokens, redeemed at the bar during the event. Tokens are valid for that event
          only, until the bar menu closes, and <strong>unused tokens are not refunded</strong>.
        </p>
      </LegalSection>

      <LegalSection heading="Photos and video">
        <p>
          Our events are photographed and filmed, and the material is used to tell what re:sonate
          is: recaps, after movies, the gallery, social media. By attending you accept that you may
          appear in it. If you recognise yourself in a published image and want it removed, write to{" "}
          <a href={`mailto:${LEGAL_CONTACT}`} className="inline-flex min-h-11 items-center text-accent">{LEGAL_CONTACT}</a>: we will
          take it down from what we control.
        </p>
      </LegalSection>

      <LegalSection heading="Your data">
        <p>
          How we handle your name, email and orders is described in the{" "}
          <Link href="/privacy" className="inline-flex min-h-11 items-center text-accent">privacy notice</Link>.
        </p>
      </LegalSection>

      <LegalSection heading="Changes and law">
        <p>
          We may update these terms. The version that applies to an order is the one published when
          the order was placed. Italian law applies.
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
