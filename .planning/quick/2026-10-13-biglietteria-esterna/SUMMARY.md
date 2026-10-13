---
task: quick 2026-10-13 — serata venduta da un terzo (biglietteria esterna)
branch: feat/biglietteria-esterna
classification: Structured (pagina pubblica, admin, migration) + Critical sul confine della cassa (buildOrderQuote)
requirements: nessun ID di requisito — richiesta diretta del proprietario del 2026-10-13
completed: 2026-10-13 (codice e prova sul laboratorio; produzione su autorizzazione)
---

# Quick 2026-10-13 — una serata i cui biglietti li vende un terzo

**In una riga:** una serata `paid` puo' dichiarare che i biglietti li vende un
terzo (il locale, su una piattaforma di biglietteria): la pagina mostra i tier
con i prezzi e ogni click esce verso il link unico del venditore; la cassa
nostra rifiuta quella serata anche lato server; niente QR, niente scanner,
niente mail, niente rimborsi nostri. Prezzi e «Sold out» restano a mano.

## Decisioni del proprietario (2026-10-13)

1. Sede pubblica dal primo giorno: nessuna rivelazione.
2. Biglietti e liste interamente del venditore: nessuna guest list nostra, nessuno scanner nostro.
3. La serata esiste sul sito con il suo progressivo (archivio, numerazione, LiveCut).
4. Tier come sulla piattaforma, con prezzo; click = uscita verso il link unico dell'evento.
5. Prezzi e sold out a mano; interruttore «Sold out» per tier.
6. Link assente all'inizio: la pagina dice «Tickets soon».
7. Etichette libere (venditore e testo del bottone), non cablate a una piattaforma.
8. Nessun menu drink, nessun gettone.
9. Termini: per le serate vendute da terzi valgono le condizioni del venditore.
10. Chi compra altrove non entra nella community: nessun account, nessuna mail. Accettato.
11. Ramo da `main`, prova sul laboratorio, produzione prima del listing della prossima notte.

## Cosa e' cambiato

| Dove | Cosa |
|---|---|
| `supabase/migrations/20261013120000_external_tickets.sql` | `event_parties.external_tickets_seller / _url / _label` con CHECK (seller 1..60 dopo trim; url `^https://\S+$` ≤ 500 e solo con seller; label 1..40 e solo con seller); `ticket_tiers.sold_out boolean NOT NULL DEFAULT false`; `COMMENT` su ogni colonna. RLS invariata. Nessun `BEGIN;`. |
| `scripts/lab-apply-migration.mjs` | applica UNA migration al laboratorio dalla Management API (rifiuta il ref di produzione come prima riga) e rilegge il catalogo `read_only` per le colonne passate |
| `src/types/database.ts` | `EventParty.external_tickets_*`, `TicketTier.sold_out` |
| `src/lib/tickets/tier-status.ts` | `PublicTier.sold_out?`; `tierStatus` lo mette **prima** di tutto: a mano vince su date e conteggi |
| `src/lib/tickets/order-quote.ts` | select della serata con `external_tickets_seller`; **`quote_night_sold_elsewhere`** subito dopo «serata trovata», prima di pubblicazione e tetto («Tickets for this night are sold elsewhere, not here. Nothing was charged. They are sold by <seller>.»); `sold_out` letto sul tier e nella catena, onorato nella `statusMap` |
| `src/app/(public)/tickets/order/[token]/resume-actions.ts` | `quote_night_sold_elsewhere → no_longer_on_sale` (il `Record` e' totale) |
| `src/app/(admin)/admin/events/actions.ts` (`purchaseTicket`) e `src/lib/tickets/purchase-refusals.ts` | **la seconda strada verso SumUp** — sessione, Event Pass, intento ripreso da `localStorage` — non passa da `buildOrderQuote`. Trovata dalla revisione indipendente del ramo: senza questo, chi ha una sessione pagava noi per una serata venduta dal locale. Ora rilegge la serata **del tier** (`tier.party_id`, non il `partyId` passato, che puo' essere nullo) e rifiuta con `night_sold_elsewhere`; legge `sold_out` sui tier e lo onora nella mappa degli stati |
| `src/app/(public)/events/[slug]/ExternalTickets.tsx` | **nuovo**, componente server: righe = link in uscita (`target=_blank`, `rel=noopener noreferrer`) quando `available` e con link, altrimenti `aria-disabled`; bottone con il testo scelto (default «Get tickets») o riquadro «Tickets soon» senza link; frase «Tickets are sold by <seller>…». Nessuna azione, nessun SumUp |
| `src/app/(public)/events/[slug]/page.tsx` | select delle tre colonne; `PartyWithTiers.externalTickets`; sulle serate esterne nessun conteggio e **nessuna chiusura di default a −2 h** (un tier scade solo con `expires_at`); monta `ExternalTickets` al posto del controllo d'acquisto, che resta dietro `party.externalTickets === null &&` |
| `src/app/(public)/events/[slug]/event-metadata.ts` | legge `external_tickets_seller`; sulle serate esterne ignora i tier a 0 € nel prezzo minimo (prima diceva «free entry») |
| `src/components/events/EventForm.tsx` | tre campi sotto «Tickets per order», solo su serata `paid`, in entrambi i percorsi (serata singola e sotto-serate); `externalTicketsProblem` ripete la regola lato client, perche' in produzione Next omette il messaggio di un'eccezione lanciata da una server action |
| `src/app/(admin)/admin/events/actions.ts` | `PartyInput` con i tre campi; validazione nel ciclo delle serate; scritti sempre in creazione e aggiornamento; **su una serata non `paid` i tre campi si azzerano** (server e form), o un venditore sopravvissuto a un cambio di tipo farebbe rifiutare ogni prenotazione gratuita con «sold elsewhere» (rilievo della revisione) |
| `src/app/(admin)/admin/(work)/events/[id]/edit/page.tsx` | select e `initialData` |
| `src/components/tickets/AddTierForm.tsx`, `TierCard.tsx`, `src/app/(admin)/admin/events/[id]/tickets/actions.ts` | casella «Sold out (set by hand — wins over quantity and dates)» in creazione e modifica; badge nella vista; salvato in create e update |
| `src/app/(public)/terms/page.tsx` | paragrafo: per le serate vendute da terzi valgono termini e rimborsi del venditore |
| `scripts/verify-external-tickets.mjs`, `package.json`, `scripts/verify-all.mjs` | gate statico: A la cassa legge il seller e rifiuta **su entrambe le strade** (`buildOrderQuote` e `purchaseTicket`, che deve anche leggere e onorare `sold_out`); B il componente non e' client e non nomina azioni di acquisto ne' SumUp; C il controllo d'acquisto della serata sta dietro la guardia. Registrato in `verify` (26 gate). Visto rosso senza la correzione di `purchaseTicket` (A6-A9) e verde con |

Il percorso del denaro cambia in **due punti**, uno per strada: il rifiuto in
`buildOrderQuote`, che `purchaseTicketsGuest`, `free-order-actions` e
`resume-actions` attraversano, e lo stesso rifiuto in `purchaseTicket`, la
strada con sessione che **non** passa dal preventivo. Il piano diceva «un
punto solo»: era falso, e l'ha trovato la revisione indipendente, non la prova
manuale, perche' la prova aveva chiamato solo la strada ospite. Rivelazione
del venue, scanner, lista `/events` (card «Tickets») e pass Wallet non sono
toccati.

## Verifica

- `npm run build`: verde (typecheck compreso).
- `npm run verify`: **25/25** gate eseguiti (il nuovo compreso); nessun gate peggiorato. Build e verify rilanciati dopo il passaggio di correzioni della revisione. `verify:touch-targets` aveva fermato una prima versione delle righe (classi in una costante): corretto mettendo la stringa sull'elemento, non allargando il gate.
- `verify:venue-surfaces`: invariato (la pagina non e' fra le `GUEST_SURFACES`; il componente non nomina colonne di luogo).

### Prova sul laboratorio (2026-10-13, `npm run dev:lab -- -p 3100`, serata di prova «Lab External Night», venditore «Test Club», link `example.com`)

| # | Passo | Esito |
|---|---|---|
| 1 | Admin, serata singola `paid`: campi `main-external-seller/url/label` presenti, compilati e salvati dal form (Chrome headless, sessione master senza password) | **ok** — `POST …/edit 200`, redirect a `/admin/events`, le tre colonne scritte |
| 2 | Pagina pubblica senza link | **ok** — tier con prezzi, «Available», tutti `aria-disabled`, riquadro «Tickets soon», frase «Tickets are sold by Test Club…»; nessun «Buy Ticket», nessun codice sconto |
| 3-4 | Link + «Tickets on Example» | **ok** — righe e bottone escono su `https://example.com/…` in nuova scheda con `noopener noreferrer`; «Tickets soon» sparisce |
| 5 | Link `http://` dal form | **ok** — «The ticket link must start with https:// and contain no spaces.» leggibile in pagina, nessuna scrittura |
| 6 | Tier «Sold out» a mano | **ok** — riga opaca con «Sold out», senza link; l'altra resta cliccabile |
| 7 | Tier con `expires_at` nel passato | **ok** — «Expired», senza link; il bottone in fondo resta |
| 8 | Serata con fine fra meno di 2 h | **ok** — nessuna chiusura −2 h: tutti «Available» e cliccabili |
| 9 | `/events` | **ok** — card con «Tickets» |
| 10 | Anteprima social | **ok** dopo la correzione — «Monday 2 Nov · 22:00 → 06:00 · from 15 €» (prima: «free entry», per un tier a 0 €) |
| 11 | `purchaseTicketsGuest` chiamata **direttamente** (header `Next-Action`, tecnica di `probe-forged-identity.sh`) sulla serata esterna | **ok** — `success:false`, «Tickets for this night are sold elsewhere, not here. Nothing was charged. They are sold by Test Club.»; ordini sulla serata: 0 prima, 0 dopo |
| 12 | Attendee con biglietto su un'altra serata apre quella esterna | **non provato a mano** — `userTickets` e' per `party_id`, vuoto per costruzione; nessun ramo nuovo |
| 13 | Serata **nostra** (seller tolto) con tier «Sold out» a mano e quantita' libera, stessa chiamata diretta | **ok** — «This ticket type is sold out. Nothing was charged.»; pagina: «Sold out». Nessuna chiamata di controllo dopo il revert: avrebbe aperto un checkout SumUp vero |
| 14 | **Dopo la revisione** — `purchaseTicket` chiamata direttamente **con sessione** (cookie `sb-<ref>-auth-token` coniato con generateLink + verifyOtp) sulla serata esterna, `partyId` della serata | **ok** — `ok:false`, `reason:night_sold_elsewhere`; `pending_purchases` sul tier: 0 prima, 0 dopo; nessun checkout SumUp |
| 15 | Idem con **`partyId = null`** (aggiramento del controllo sulla serata passata) | **ok** — stesso rifiuto: la serata si rilegge dal tier |
| 16 | Serata nostra, tier «Sold out» a mano, stessa strada con sessione | **ok** — `reason:tier_not_available` (sold_out); 0 righe. Nessuna chiamata di controllo senza sold_out |

Misurato e corretto durante la prova: (a) l'anteprima diceva «free entry» per
un tier a 0 € — `event-metadata` ora li ignora sulle serate esterne; (b) un
tier a 0 € su una serata `paid` veniva chiuso da `closeZeroPriceTiers` al
salvataggio dall'admin — **dal pomeriggio del 2026-10-13 non piu' sulle serate
esterne** (`ensureFreeRsvpTier` salta la chiusura quando c'e' un venditore), e
la pagina li mostra: il proprietario ha chiesto biglietti gratuiti e a
pagamento sulla stessa serata, entrambi emessi dal venditore.

La serata di prova e' stata cancellata dal laboratorio a fine prova.

## Revisione indipendente del ramo (2026-10-13)

Un revisore su contesto fresco ha letto l'intero diff. **Un rilievo Critical**:
`purchaseTicket` era una seconda strada verso SumUp ignara di
`external_tickets_seller` e di `sold_out` — corretto (vedi tabella), gate A
esteso, riprovato sul lab con sessione (passi 14-16). **Un rilievo Minor**
corretto: il venditore sopravviveva al cambio da `paid` a `free_rsvp`. **Un
rilievo Minor accettato come limite**: nessun tier a 0 € sulle serate esterne
(sotto). Messi da parte dal revisore, e qui registrati: Event Pass su un evento
con una serata esterna (caso non reale oggi); menu drink su serata esterna
(nessun rifiuto server, ma senza voci di menu non c'e' nulla da comprare);
ordini `pending` aperti prima di un sold out a mano completano comunque
(D-46-07, gia' accettato).

## Limiti dichiarati

- **Prezzi a mano.** Se il venditore cambia un prezzo, la pagina non lo sa.
- **Sold out a mano.** Non vediamo le vendite del terzo: la casella la spunta chi organizza quando il venditore avvisa.
- **Nessun conteggio.** Dashboard vendite e capienza restano a zero su quella serata: non vendiamo noi.
- **Chi compra altrove non entra nella community**: nessun `attendee`, nessuna mail, nessun recupero carrello. Decisione del proprietario.
- **Tier a 0 € ammessi sulle serate esterne** (ripreso il 2026-10-13 pomeriggio su richiesta del proprietario: la serata ha biglietti gratuiti e a pagamento, entrambi del venditore). Il salvataggio dall'admin non li chiude piu' su queste serate; la pagina li mostra; l'anteprima social ignora lo 0 € nel «from». Sulle serate nostre resta tutto com'era.
- **La chiusura di default a −2 h non si applica** alle serate esterne: scadenze solo esplicite.

## Passi di produzione (su autorizzazione del proprietario, come il 2026-10-05)

1. `set -a; source .env.local; set +a` e applicare `20261013120000_external_tickets.sql` in produzione con la stessa POST alla Management API (il ref di produzione, a mano, non dallo script lab); rileggere il catalogo `read_only` per le quattro colonne.
2. Merge fast-forward di `feat/biglietteria-esterna` su `main`, push, deploy Vercel.
3. Dall'admin: creare la serata vera con sede pubblica, venditore e link quando esiste; i tier con i prezzi copiati dalla piattaforma; «Sold out» a mano quando il venditore avvisa.
4. Rispettare l'ordine: migration **prima** del deploy (la pagina seleziona le colonne nuove).

Il nome del venditore, la piattaforma, la data e il progressivo della serata
vera **non stanno qui**: il repo e' pubblico.
