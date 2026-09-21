"use client";

import Link from "next/link";

import { Button, FOCUS_RING } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";

/**
 * The guest sign-in invite on the drinks menu — a banner and a pre-checkout
 * question, converted while the feature is switched off.
 *
 * ── Why a file nothing renders was converted at all (D-41.2-03) ──────────────
 *
 * This file is reached by **no import closure**: its three call sites are
 * commented out — `menu/page.tsx:12-13` and `:179-183`, and
 * `GuestDrinkMenu.tsx:11` and `:259-267` — so no surface conversion in this
 * phase clears it as a by-product, and it sat on **two** ratchet lists that
 * could not otherwise reach zero.
 *
 * Three dispositions were available and only one decides nothing outside this
 * phase. **Deleting** would answer a product question — should the invite
 * exist? — that is not this phase's, and on a public repository a deletion is a
 * publication of that answer. **A permanent exemption** would be a lie about a
 * file whose own import comment says *re-enable by restoring this import*; the
 * exemption's rule is *a file that will never convert is not a debt*, and this
 * one is meant to come back. **Converting** costs the lines below, clears both
 * ratchets, and leaves the re-enable path warm: when the invite returns it
 * lands already converted instead of reopening a gate that had closed.
 *
 * **Nothing here re-enables it.** No import was restored and no render site was
 * uncommented. Finishing a job somebody deliberately stopped is a product
 * decision, and it is not this one.
 *
 * ── The three phone-tier prefixes are DELETED, not migrated ──────────────────
 *
 * The overlay below used to write its own sheet-versus-window pair — bottom
 * anchored on a phone, centred above the boundary, with the phone sheet's
 * bottom padding. **The primitive owns that pair** (`Dialog.tsx:278-280`), so
 * the three prefixed classes are gone rather than moved to the tier this
 * contract uses. Migrating them would have left a second author for a decision
 * the primitive already makes, and two authors is how two implementations
 * disagree.
 *
 * ── Le due destinazioni d'iscrizione sono uscite (fase 50, D-50-11) ──────────
 *
 * Questo paragrafo diceva che le due destinazioni verso la pagina d'iscrizione
 * erano byte-identiche a prima della conversione. **Non ci sono piu':** quella
 * pagina e' stata cancellata — nessuno si iscrive da solo, entra chi compra un
 * biglietto o chi e' invitato da guest list — e qui restano l'accesso e il
 * proseguimento da ospite.
 *
 * `src/lib/routes/next-redirect.ts:73` **nomina ancora per riga le due chiamate
 * cancellate** come produttrici di una voce della sua allow-list. La voce
 * `/events/<slug>/menu` **resta giusta** — la produce ora il solo link di
 * accesso qui sotto — ma la riga che la spiega e' invecchiata. Quel file sta
 * fuori dal perimetro di questo piano: la deriva e' **riportata, non riparata
 * in silenzio**, ed e' scritta nel SUMMARY di 50-06.
 *
 * ── Focus, and why no marker is declared ─────────────────────────────────────
 *
 * The question below has no destructive answer, so nothing here claims the
 * initial focus. The primitive then focuses **the close control**, which is
 * first in the DOM and is the least destructive control by construction
 * (`Dialog.tsx:117-147`). Said out loud rather than left to the default,
 * because the one answer that must never be focused — continuing without
 * saving the tokens — is on this panel.
 */

interface GuestLoginBannerProps {
  slug: string;
}

export default function GuestLoginBanner({ slug }: GuestLoginBannerProps) {
  // `menuUrl` — la versione percent-encoded dell'indirizzo del menu — e' uscita
  // insieme al link d'iscrizione che era la sua unica consumatrice (fase 50,
  // D-50-11). Il link che resta scrive il proprio `?next=` come ha sempre
  // fatto, non codificato, perche' e' la forma che l'allow-list di
  // `src/lib/routes/next-redirect.ts` ammette.
  return (
    <div className="rounded-xl border border-sem-info/30 bg-sem-info/10 p-3">
      <div className="flex items-center gap-3">
        <svg
          aria-hidden="true"
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="shrink-0 text-sem-info"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4" />
          <path d="M12 8h.01" />
        </svg>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-ink-2">
            Keep your drink tokens safe across devices.{" "}
            {/*
              ── Una risposta sola, dalla fase 50 (D-50-11) ──────────────────

              Qui c'erano due link — `Log in` **o** `Sign up` — uniti da un
              " or ". La pagina d'iscrizione non esiste piu', quindi resta
              *accedi*, e con la seconda risposta se ne va anche la parola che
              le univa: una congiunzione senza secondo termine e' una frase
              rotta.

              **La frase che precede e' cambiata con loro**, e non e' un
              ritocco di stile: diceva di tenere i token al sicuro e poi offriva
              di *crearsi un account*. Un account non si crea piu' da qui — ce
              l'ha gia' chi ha comprato — quindi la promessa si riscrive invece
              di restare a mezz'aria.

              L'inline link resta inline, con il pavimento dei 44px che aveva.
            */}
            <Link
              href={`/login?next=/events/${slug}/menu`}
              className={`inline-flex min-h-11 items-center align-middle font-medium text-accent underline transition-colors hover:text-accent-hover ${FOCUS_RING}`}
            >
              Log in
            </Link>
            {" with the account that came with your ticket."}
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * ── `onSignUp` e' uscito da questa firma con la fase 50 (D-50-11) ───────────
 *
 * Il pannello offriva tre risposte; ora ne offre due, perche' la seconda —
 * *iscriviti* — mandava alla pagina d'iscrizione, che non esiste piu'. Con il
 * ramo se ne va la prop che lo pilotava.
 *
 * **Il sito di render e' commentato** (`GuestDrinkMenu.tsx:360-369`, disabilitato
 * da prima di questa fase) e **passa ancora `onSignUp`**: quel file appartiene a
 * un altro perimetro e non si tocca qui. Chi riabilitera' il pannello deve
 * togliere quella riga, o il ripristino non compila — ed e' scritto qui perche'
 * lo scopra leggendo, invece che dal typecheck.
 */
export function GuestWarningModal({
  onContinue,
  onClose,
  onLogin,
  slug,
}: {
  onContinue: () => void;
  onClose: () => void;
  onLogin?: () => void;
  slug: string;
}) {
  return (
    <Dialog
      open
      onClose={onClose}
      title="Guest Checkout"
      /*
        **Due risposte, dalla fase 50** — erano tre: il pieno d'accento per
        accedere, il rung con il bordo per iscriversi, e il piu' silenzioso per
        proseguire senza ne' l'uno ne' l'altro. Quello di mezzo e' uscito con
        la pagina d'iscrizione (D-50-11). I due che restano **non cambiano
        rung**: chi
        accede tiene il pieno, chi prosegue da ospite tiene il piu' silenzioso,
        quindi la gerarchia e' quella di prima con un gradino in meno e non una
        gerarchia nuova.

        They sit in the actions region rather than in the body because the body
        is the only scroller: an answer inside it can be below the fold at the
        moment the question is asked.

        The two that navigate are given an `href` rather than a handler, which
        keeps them elements a person can middle-click and copy — the same
        choice `(public)/payment/callback/page.tsx:139` already made.
      */
      actions={
        <div className="space-y-2">
          {onLogin ? (
            <Button className="w-full" onClick={onLogin}>
              Log in
            </Button>
          ) : (
            <Button className="w-full" href={`/login?next=/events/${slug}/menu`}>
              Log in
            </Button>
          )}

          <Button variant="ghost" className="w-full" onClick={onContinue}>
            Continue as guest
          </Button>
        </div>
      }
    >
      <p className="text-sm text-sem-warn">
        You may lose your tokens if you don&apos;t log in.
      </p>
    </Dialog>
  );
}
