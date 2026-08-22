---
paths:
  - "src/lib/venue-reveal/**"
  - "src/app/api/cron/venue-reveal/**"
  - "src/emails/venue-reveal.tsx"
  - "src/app/(public)/events/**"
  - "src/app/(public)/tickets/**"
  - "src/app/**/venues/**"
  - "src/components/venues/**"
  - "src/components/events/**"
---

# Venue Secrecy — Operational Gates

## Before Touching

`venue_reveal_on_purchase`, `venue_reveal_sent`, `venue_secret_hint_reveal_hours`,
cron di rivelazione, mail di rivelazione, dialog del venue segreto, pagina
pubblica dell'evento, **pagina del biglietto**, **il modulo
`src/lib/venue-reveal/venue-disclosure.ts`**
-> presentare l'analisi d'impatto su: **chi puo' vedere l'indirizzo, e da
quando**. Se la risposta non e' certa, la modifica e' Critical.

## Perche' questo dominio esiste

La location segreta e' parte del meccanismo che rende la community valuable, non
un vezzo di marketing. **Una rivelazione anticipata non ha rimedio**: la mail e'
partita, lo screenshot esiste, il gruppo Telegram l'ha girato.

## La guardia monotona

`venue_reveal_sent` e' un interruttore **a senso unico**. Un intervento puo'
solo rendere piu' difficile farlo scattare, mai piu' facile — salvo
autorizzazione esplicita documentata nel commit.

## Quality Gates

- **Gate irreversibilita'**: Ogni modifica a un percorso che puo' rivelare un venue e' Critical e richiede validazione esplicita. Non esiste "lo sistemiamo dopo": dopo, l'indirizzo e' pubblico.
- **Gate percorsi enumerati**: L'indirizzo esce da piu' punti. **Rienumerati leggendo il codice il 2026-08-22.**

  **Chiusi:** `(public)/events/[slug]/page.tsx`, `EventTabs.tsx` — mai, per nessuno; `(public)/tickets/[id]/page.tsx` — solo al titolare, solo dopo la rivelazione. Entrambe leggono l'unico predicato, `src/lib/venue-reveal/venue-disclosure.ts`.

  **Aperti:** `lib/venue-reveal/reveal-party-venue.ts` (**l'unico posto che spedisce**) coi suoi due chiamanti; `emails/venue-reveal.tsx`; il **pass Wallet** (`api/tickets/[id]/wallet/route.ts` -> `lib/apple-wallet.ts`), che scrive `venue_text` su un file che finisce su un telefono e **non si ritira**, senza alcun termine di segretezza; il **payload di `(public)/events/page.tsx`**, che passa `venue_text` a un componente `"use client"` **anche per le serate segrete** — nel documento di una pagina che chiunque apre; `components/events/EventForm.tsx`, `components/venues/**`, `admin/(work)/venues/**`.

  **E il confine, piu' largo di ogni superficie:** `public.venue_for_parties`, concessa a `authenticated`, risponde ancora con l'indirizzo di una serata segreta via `POST /rest/v1/rpc/`, senza passare da nessuna pagina. Piu' largo e' la direzione sicura, ma e' una divergenza, e sta scritta.

  **Piu' i percorsi che non sono codice**: capitolato, brief, un post, **e una foto che inquadra l'insegna**. Rienumera leggendo: questa lista e' datata per costruzione.
- **Gate il capitolato e' un percorso di uscita**: Le locandine della notte le produce **un grafico esterno**, e quello che esce da noi e' il capitolato — un percorso di rivelazione che finisce a un terzo, fuori da ogni sistema che controlliamo. L'after party e' **`@ Secret Venue`**, mai l'indirizzo: chi disegna non ha bisogno di sapere dove si svolge. Identico per il brief ai selector (`sound-manifesto.md`).
- **Gate default chiuso**: Se lo stato di rivelazione non e' determinabile — dato mancante, errore di query, utente non identificato — il venue **non si mostra**. Il fallback e' il segreto, mai l'indirizzo. E' l'unico dominio del progetto in cui il default sicuro e' negare (contrapposto a `checkin-offline.md`, dove il default e' ammettere: li' l'errore e' recuperabile, qui no).
- **Gate autorizzazione per destinatario — RISCRITTO il 2026-08-22 (decisione del proprietario)**:

  **I due paragrafi superati, citati e non cancellati** (una regola tolta senza la sua ragione torna folklore e qualcuno la «ripara»):

  1. *«La rivelazione e' per-biglietto e per-RSVP, non per-evento»* — **ancora vero, e governa la mail.**
  2. *«La pagina: tre livelli (D-37-02) — biglietto o RSVP subito · approvato alla finestra o all'atto manuale · esterno mai»* — **superato.** Il livello 2 era **l'allargamento** del 2026-08-10; e' stato tolto **insieme agli altri due**. Il costo con cui fu preso — *piu' persone conoscono l'indirizzo di quante ne entrano, su sedi da 150-300 senza licenza di pubblico spettacolo* — e' la ragione per cui e' stato ripreso.

  | Superficie | Prima | Dopo |
  |---|---|---|
  | **pubblica** (evento, lista) | `Secret Venue` | **`Secret Venue` — mai, nemmeno a serata finita** |
  | **mail al titolare** | — | l'indirizzo, **per destinatario** |
  | **pagina del proprio biglietto** | niente | il venue, **appena la rivelazione scatta** |

  **La rivelazione non rende l'indirizzo pubblico: lo rende noto a chi ha comprato.** E' il criterio con cui si giudica ogni modifica futura, e stringe due superfici senza allargarne nessuna — la direzione che la guardia monotona consente.

  **Cosa resta vietato:**
  - **Nessun percorso spedisce «a tutti quelli dell'evento».** La mail resta per-destinatario, marcata sulla riga del biglietto o dell'RSVP.
  - **Nessun ruolo scavalca la regola della superficie**, e l'assenza di un ramo per lo staff e' la decisione: una pagina che mostra due cose a due sessioni **non si verifica guardandola**. Lo staff ha `admin/`.
  - **Senza biglietto: solo l'indizio** — che ora e' **l'ultima cosa che una pagina pubblica dice sul luogo**, quindi il gate sull'indizio pesa piu' di prima.
  - **Il predicato si legge, non si riscrive.** `venue-disclosure.ts` e' l'unica casa della decisione. Due espressioni per una decisione divergono, e qui divergere pubblica un indirizzo: e' come nacque la divergenza fra pagina evento e pagina biglietto, durata mesi.

  **Cosa NON copre, e va deciso a parte:** il **pass Wallet**, che porta lo stesso testo fuori dal prodotto; **chi compra dopo la rivelazione**, la cui mail e' un secondo percorso; **il titolare di un RSVP**, che non ha una pagina del biglietto e da oggi riceve l'indirizzo **solo per mail** — una strada sola dove le altre ne hanno due.

- **Gate idempotenza del cron**: `api/cron/venue-reveal` puo' essere eseguito due volte. Marcare `venue_reveal_sent` **prima o insieme** all'invio, mai solo dopo: una seconda esecuzione non deve rispedire. E se l'invio fallisce dopo la marcatura, va loggato come tale — un destinatario che non ha ricevuto l'indirizzo e' un problema visibile, una doppia mail e' rumore.
- **Gate indizio non equivalente all'indirizzo**: `venue_secret_hint_reveal_hours` esiste per dare un indizio prima dell'indirizzo. L'indizio non deve essere sufficiente a identificare il luogo: se lo e', hai rivelato in anticipo con piu' passaggi.
- **Gate cache e pre-render**: Una pagina cacheata mentre l'indirizzo era visibile continua a servirlo dopo. Ogni superficie che mostra il venue e' dinamica e non cacheabile — **dichiarandolo, non derivandolo**. Dal 2026-08-22 quella superficie e' `(public)/tickets/[id]`, il cui predicato ha un termine temporale che **scatta da solo a un istante che nessuno scrive**.

## Imperative Behaviors

- When touching anything that can reveal a venue: treat it as Critical, ask before acting
- When modifying a reveal path: enumerate all exit points by reading the code, not from memory
- When briefing an external designer or a selector: write `@ Secret Venue`, never the address
- When reveal state is unknown: hide the venue, always
- When sending the reveal mail: check per-ticket / per-RSVP entitlement, never per-event
- When deciding what a PUBLIC surface shows: `Secret Venue`, always, at every moment of the night's life — there is no reader, no hour and no role that changes it
- When deciding what the HOLDER'S OWN ticket shows: the venue, once the night's reveal has fired, and nothing before it
- When you need the predicate: read it from `src/lib/venue-reveal/venue-disclosure.ts` — never restate it at a render site
- When an RSVP is involved: treat it as a ticket, and never behind `venue_reveal_on_purchase`
- When writing the reveal cron: mark before or with the send, and log a failed send explicitly
- When writing a hint: verify it does not identify the place on its own
- When a page can show the venue: mark it dynamic and uncacheable
