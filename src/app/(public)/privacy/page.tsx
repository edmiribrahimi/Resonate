import type { Metadata } from "next";
import AppNav from "@/components/layout/AppNav";
import type { UserRole } from "@/types/database";
import { getAccessContext } from "@/lib/capabilities/server";
import { PageShell } from "@/components/ui/PageShell";
import { LegalBody, LegalSection, LEGAL_CONTACT } from "@/components/legal/LegalPage";
import { musicPageEnabled } from "@/lib/livecuts/enabled";

export const metadata: Metadata = {
  title: "Privacy — re:sonate",
  description: "What re:sonate collects about you, why, and what you can ask for.",
};

/**
 * L'informativa, scritta su cio' che il codice fa davvero (verificato il
 * 2026-09-21): profili e ordini su Supabase (eu-west-1, Irlanda), funzioni su
 * Vercel (Dublino), pagamenti su SumUp senza che i dati della carta ci passino,
 * mail via Resend, analytics **solo lato server** su PostHog (nessun cookie di
 * tracciamento, quindi nessun banner), pass Apple Wallet generato su richiesta.
 * La cancellazione dell'account la fa un organizer dall'app su richiesta: non
 * esiste un tasto self-service, e la pagina non lo promette.
 *
 * Aggiunto il 2026-09-30 (fase 52.2, CART-06): la mail di ripresa — una sola,
 * `order_resume`, piano 52.2-05 — e le colonne `device` / `payment_method` su
 * `ticket_orders` (CART-01, contate dal database, Q1). Via libera del
 * professionista del 2026-09-30, registrato in `52.2-CONTEXT.md` (Garante,
 * provv. 17 luglio 2024, doc. web 10084158). «may send» perche' il freno per
 * indirizzo e il tetto giornaliero possono saltare l'invio; «not sent if you
 * pay in the meantime» e' vera per costruzione: il webhook annulla la mail
 * dell'ordine pagato prima di emettere, e su `completed` annulla anche quelle
 * degli altri ordini aperti dello stesso indirizzo per la stessa serata (piani
 * 52.2-05 e 52.2-08). La mail non si accende (`ORDER_RESUME_EMAIL_ENABLED`)
 * prima che questo testo sia in produzione.
 *
 * Aggiunto il 2026-10-03 (fase 52.3, MUS-10): il paragrafo sul player di terzi
 * — in «Where it is kept, and who helps us» e in «Cookies» — compare **con**
 * l'interruttore della pagina Music (`musicPageEnabled()`, l'unico lettore di
 * `NEXT_PUBLIC_MUSIC_PAGE_ENABLED`), cosi' informativa e pagina arrivano nello
 * stesso build per costruzione: mai prima, mai dopo. Spento, il testo della
 * pagina e' identico a prima. E' la mitigazione che MUS-10 nomina, quindi Q4 di
 * `52.3-LEGALE.md` non e' un cancello; Q1-Q3 hanno risposta datata il
 * 2026-10-03. «Nothing from SoundCloud loads until you press play» e' vera per
 * costruzione: `api.js` e l'iframe del widget si iniettano solo al primo tocco
 * su play (MUS-06).
 *
 * Cambiato il 2026-10-05 (fase 52.3, piano 13), per decisione del proprietario
 * al checkpoint (D-LEG-1, D-LEG-2 in `52.3-LEGALE.md`, applicate come
 * raccomandate): tolta la frase sulle foto e i video caricati dai partecipanti,
 * e tolta la galleria dai luoghi di pubblicazione delle foto — la superficie
 * e' uscita dal prodotto il 2026-10-02 (`media-and-storage.md`). La data unica
 * delle tre pagine (`LEGAL_UPDATED`) e' ora quella del deploy dichiarato.
 */
export default async function PrivacyPage() {
  // La navigazione, come su ogni pagina pubblica: il wrapper dichiara lo
  // spazio della colonna e `AppNav` e' suo fratello — la forma di
  // `src/app/(public)/events/page.tsx`, letta dal controllo E di
  // `verify:conversion` in QUESTO file. Nessun'altra lettura.
  const { role, capabilities, liveAssignmentCapabilities } = await getAccessContext();
  const musicOn = musicPageEnabled();
  return (
    <>
    <div className="md:[--nav-inset-inline-start:14rem]">
    <PageShell width="default">
    <LegalBody
      title="Privacy"
      intro="This notice says what we collect when you use re:sonate, why, where it is kept, and what you can ask us to do with it."
    >
      <LegalSection heading="Who is responsible">
        <p>
          The organiser of re:sonate events, reachable at{" "}
          <a href={`mailto:${LEGAL_CONTACT}`} className="inline-flex min-h-11 items-center text-accent">{LEGAL_CONTACT}</a>. Write
          there for anything in this notice.
        </p>
      </LegalSection>

      <LegalSection heading="What we collect, and why">
        <p>
          <strong>When you buy or reserve a ticket:</strong> your name, your email address, what
          you ordered and when, and the payment confirmation from SumUp (a transaction reference,
          never your card details). We need these to issue your tickets, send them to you, let you
          in at the door and handle any refund.
        </p>
        <p>
          <strong>If you start an order and don&apos;t finish paying:</strong> about an hour later
          we may send you one email with a link back to that same order, so you can complete it if
          you still want to. It is a service message about the order you opened, not marketing: it
          contains no offer or discount, it is sent at most once per order and never followed by
          another, and it is not sent if you pay in the meantime. We rely on our
          legitimate interest in letting you complete a purchase you started, within the limits set by the
          Italian data protection authority for a single message of this kind (Garante per la
          protezione dei dati personali, decision of 17 July 2024, doc. web 10084158).
        </p>
        <p>
          <strong>How an order was placed:</strong> on each order we also record whether it was
          opened from a phone or a computer and how it was paid (card or Apple Pay). We use this
          only as counts — how many orders are opened, paid or left unfinished — to see where
          checkout gets stuck.
        </p>
        <p>
          <strong>When you have an account:</strong> the same, plus your sign-in details and the
          tickets and drink orders linked to the account. An account is created for you when you
          buy or when you are invited; you choose a password to use it.
        </p>
        <p>
          <strong>At the event:</strong> the time your ticket was scanned at the door, and the
          drinks you redeem with your tokens.
        </p>
        <p>
          <strong>If you subscribe to the newsletter:</strong> your email address, until you
          unsubscribe.
        </p>
        <p>
          We keep this data for as long as you have an account or tickets with us, and afterwards
          for as long as the law requires for accounting.
        </p>
      </LegalSection>

      <LegalSection heading="Where it is kept, and who helps us">
        <p>
          Our database is hosted by Supabase in Ireland, and the application runs on Vercel, in
          Dublin. Payments are processed by SumUp. Emails are sent through Resend. We measure how
          the site is used with PostHog, on servers in the EU, from our own server and without any
          tracking script or cookie in your browser. If you add a ticket to Apple Wallet, the pass
          is generated by us and stored on your device.
        </p>
        {musicOn && (
          <p>
            The Music page plays our recordings through SoundCloud&apos;s player. Nothing from
            SoundCloud loads until you press play. When you do, your browser connects to
            SoundCloud, which receives your IP address and may set its own cookies, under
            SoundCloud&apos;s privacy policy.
          </p>
        )}
        <p>
          These services process your data on our behalf and under contract. We do not sell your
          data and we do not share it with anyone else.
        </p>
      </LegalSection>

      <LegalSection heading="Cookies">
        <p>
          We use only the cookies needed to keep you signed in. There are no advertising or
          tracking cookies, which is why there is no cookie banner.
        </p>
        {musicOn && (
          <p>
            The one exception is the Music page: if you press play, SoundCloud&apos;s player may
            set its own cookies. We do not set them and cannot read them.
          </p>
        )}
      </LegalSection>

      <LegalSection heading="Photos and video at events">
        <p>
          Events are photographed and filmed, and the material may be published in recaps, after
          movies and social media. We do this in our legitimate interest to tell what
          re:sonate is. If you appear in a published image and want it removed, write to{" "}
          <a href={`mailto:${LEGAL_CONTACT}`} className="inline-flex min-h-11 items-center text-accent">{LEGAL_CONTACT}</a>: we will
          remove it from everything we control.
        </p>
      </LegalSection>

      <LegalSection heading="Your rights">
        <p>
          You can ask us what we hold about you, ask us to correct it, ask for a copy, or ask us to
          delete your account and its data. Write to{" "}
          <a href={`mailto:${LEGAL_CONTACT}`} className="inline-flex min-h-11 items-center text-accent">{LEGAL_CONTACT}</a> from the
          address on your account. Deleting an account removes your profile; tickets already used
          and payment records we must keep for accounting are retained for the period the law
          requires.
        </p>
        <p>
          You can also complain to the Italian data protection authority (Garante per la
          protezione dei dati personali).
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
