import type { VenueRevealFailureKind } from "@/lib/venue-reveal/reveal-party-venue";

/*
 * order-reveal-outcome.ts — la tabella che legge l'esito della rivelazione
 * tardiva per UN ordine, condivisa dai due chiamanti di
 * `revealPartyVenueForOrder` che emettono biglietti:
 *
 *   - il webhook del pagato, `src/app/api/webhooks/sumup/route.ts`, dove e'
 *     nata;
 *   - la prenotazione gratuita, `src/app/(public)/events/[slug]/free-order-actions.ts`,
 *     dal 2026-10-13 (revisione 52.4, WR-01; D-52.4-07, decisione del
 *     proprietario: «stessa funzione e stesso scope anche nel ramo gratuito»).
 *
 * Spostata qui senza cambiare un valore. Nessuna logica di guardia vive in
 * questo file: la decisione se la rivelazione e' scattata resta in
 * `venue-disclosure.ts`, la spedizione in `reveal-party-venue.ts`. Il testo
 * qui sotto parla di «chi ha pagato» perche' e' nato sul webhook; sulla strada
 * gratuita vale parola per parola per «chi ha prenotato» — i biglietti nascono
 * nella stessa chiamata con `venue_reveal_sent = false`, e il ramo si
 * raggiunge una volta sola per ordine.
 */

/**
 * Quali esiti della rivelazione tardiva lasciano **chi ha pagato senza
 * l'indirizzo**.
 *
 * Un `Record` **totale** e non una lista di tre nomi, per la stessa ragione per
 * cui `REPORTABLE_FAILURE` nel cron lo e': una lista risponde alla domanda di
 * oggi e tace su un esito futuro, che sarebbe semplicemente assente — e assente
 * qui significa **nessuna traccia**, cioe' una persona che ha pagato, non ha
 * ricevuto l'indirizzo, e di cui nessuno sa niente. Totale, un esito nuovo e' un
 * errore di compilazione finche' qualcuno non dichiara da che parte sta.
 *
 * Due esiti valgono `false` e i due `false` non hanno la stessa ragione:
 *
 *   `none`           — almeno una mail e' partita. Su questa strada il
 *                      destinatario e' uno, quindi «almeno una» e' «la sua».
 *   `reveal_not_due` — non era dovuto niente. Il cron ci arrivera'.
 *
 * `no_recipients` vale **`true` qui e `false` nel cron**, e la divergenza e'
 * deliberata. Nel cron significa *«questa serata e' gia' stata servita»*, che e'
 * lo stato di regime. Qui non puo' significare quello: i biglietti sono nati in
 * questa stessa consegna con `venue_reveal_sent = false`, e il ramo si
 * raggiunge una volta sola per ordine (la seconda consegna esce su
 * `status = 'completed'`). Zero destinatari vuol dire quindi che **chi ha appena
 * pagato non e' stato visto da chi spedisce** — un'assenza da dire, non uno
 * stato di regime.
 */
export const SENZA_INDIRIZZO: Record<VenueRevealFailureKind, boolean> = {
  none: false,
  reveal_not_due: false,
  no_recipients: true,
  send_failed: true,
  recipients_unavailable: true,
  party_not_found: true,
};
