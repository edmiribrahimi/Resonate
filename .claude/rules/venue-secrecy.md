---
paths:
  - "src/lib/venue-reveal/**"
  - "src/app/api/cron/venue-reveal/**"
  - "src/emails/venue-reveal.tsx"
  - "src/app/(public)/events/**"
  - "src/app/**/venues/**"
  - "src/components/venues/**"
  - "src/components/events/**"
---

# Venue Secrecy — Operational Gates

## Before Touching

`venue_reveal_on_purchase`, `venue_reveal_sent`, `venue_secret_hint_reveal_hours`,
cron di rivelazione, mail di rivelazione, dialog del venue segreto, pagina
pubblica dell'evento
-> presentare l'analisi d'impatto su: **chi puo' vedere l'indirizzo, e da
quando**. Se la risposta non e' certa, la modifica e' Critical.

## Perche' questo dominio esiste

La location segreta non e' un vezzo di marketing: e' parte del meccanismo che
rende la community valuable. `@ Secret Venue` compare nelle locandine come
scelta deliberata, e il progetto ha tre colonne di database e un cron dedicati
al momento in cui il segreto cade.

**Una rivelazione anticipata non ha rimedio.** La mail e' partita, lo screenshot
esiste, il gruppo Telegram lo ha girato. Non c'e' rollback.

## La guardia monotona

`venue_reveal_sent` e' un interruttore **a senso unico**. Un intervento puo'
solo rendere piu' difficile farlo scattare, mai piu' facile — salvo
autorizzazione esplicita documentata nel commit.

## Quality Gates

- **Gate irreversibilita'**: Ogni modifica a un percorso che puo' rivelare un venue e' Critical e richiede validazione esplicita. Non esiste "lo sistemiamo dopo": dopo, l'indirizzo e' pubblico.
- **Gate percorsi enumerati**: L'indirizzo puo' uscire da piu' punti. **Rienumerati leggendo il codice il 2026-08-10**: `src/lib/venue-reveal/reveal-party-venue.ts` — **il cuore condiviso, l'unico posto che spedisce** — con i suoi due chiamanti, `api/cron/venue-reveal/**` e il percorso manuale; la mail `emails/venue-reveal.tsx`; `(public)/events/[slug]/page.tsx` col suo `SecretVenueDialog.tsx`, `(public)/events/EventTabs.tsx`, `(public)/events/page.tsx`, `(public)/tickets/[id]/page.tsx`, `components/events/EventForm.tsx`, `components/venues/**`, e la superficie di lavoro `admin/(work)/venues/**`. **Uscito dalla lista**: la pagina pubblica di una sede non esiste piu' (D-37-23). **Fuori dai `paths:` di questo modulo, e dichiarato invece che taciuto**: `(public)/tickets/[id]/page.tsx`, dove il gate non si carica. **A questi si aggiungono i percorsi che non sono codice**: il capitolato al grafico esterno, il brief a chi va in console, un post o una storia. Prima di modificare, **rienumera leggendo il codice**: questa lista e' datata per costruzione, e un percorso dimenticato e' una fuga.

- **Gate il capitolato e' un percorso di uscita**: Le locandine della notte le produce **un grafico esterno**: quello che esce da noi e' il capitolato. E' un percorso di rivelazione a tutti gli effetti — con l'aggravante che finisce a un terzo, fuori da ogni sistema che possiamo controllare. Nel capitolato l'after party e' **`@ Secret Venue`**, mai l'indirizzo; se il grafico ha bisogno di sapere dove si svolge, non ne ha bisogno per disegnare. Vale identico per il brief ai selector (`sound-manifesto.md`).
- **Gate default chiuso**: Se lo stato di rivelazione non e' determinabile — dato mancante, errore di query, utente non identificato — il venue **non si mostra**. Il fallback e' il segreto, mai l'indirizzo. E' l'unico dominio del progetto in cui il default sicuro e' negare (contrapposto a `checkin-offline.md`, dove il default e' ammettere: li' l'errore e' recuperabile, qui no).
- **Gate autorizzazione per destinatario — RISCRITTO il 2026-08-10 (D-37-02/03)**:

  **Il paragrafo superato, citato e non cancellato** (stessa forma di `20260809002000_assignment_acts.sql:110-203`; una regola cancellata senza la sua ragione torna folklore e qualcuno la «ripara»): *«La rivelazione e' per-biglietto e per-RSVP (`tickets.venue_reveal_sent`, `rsvps.venue_reveal_sent`), non per-evento. Un percorso che rivela "a tutti quelli dell'evento" salta il controllo su chi ha effettivamente titolo.»*

  **Governa quello che segue: i canali sono due e il criterio non e' lo stesso.**

  | Canale | Criterio | Cambiato? |
  |---|---|---|
  | **La mail** | **per-destinatario, sempre** — `tickets.venue_reveal_sent`, `rsvps.venue_reveal_sent` | **no, e non e' negoziabile** |
  | **La pagina** | tre livelli (D-37-02): biglietto **o RSVP** subito · **approvato, per-evento, alla finestra o all'atto manuale** · esterno, mai | **si', il livello 2 e' nuovo** |

  **Il livello 2 e' per-evento, ed e' l'allargamento**: un **approvato** vede l'indirizzo in pagina alla finestra, o appena qualcuno rivela a mano, **senza biglietto ne' RSVP**. Decisione del proprietario, 2026-08-10, presa dopo che il costo era per iscritto — piu' persone conoscono l'indirizzo di quante ne entrano, su sedi da **150–300** in spazi privati **senza licenza di pubblico spettacolo** (`legal-compliance.md`). E' l'**autorizzazione esplicita** che la guardia monotona di `meta-gates.md` pretende, non un'eccezione dedotta.

  **Cosa resta vietato:**
  - **Nessun percorso spedisce «a tutti quelli dell'evento».** La mail resta per-destinatario e la marcatura resta sulla riga del biglietto o dell'RSVP.
  - **Il livello 2 richiede `approved`.** Non e' «tutti quelli dell'evento»: e' chi il gating ha gia' filtrato — `member` non e' `approved`, e confonderli allarga di un ordine di grandezza.
  - **Non esiste livello 2 senza finestra**, e la finestra non puo' essere piu' stretta dell'intervallo del cron (minimo **25 ore**, D-37-06).
  - **Senza login, o non approvato: solo l'indizio.** Sempre, e nessun ramo lo scavalca.
- **Gate idempotenza del cron**: `api/cron/venue-reveal` puo' essere eseguito due volte. Marcare `venue_reveal_sent` **prima o insieme** all'invio, mai solo dopo: una seconda esecuzione non deve rispedire. E se l'invio fallisce dopo la marcatura, va loggato come tale — un destinatario che non ha ricevuto l'indirizzo e' un problema visibile, una doppia mail e' rumore.
- **Gate indizio non equivalente all'indirizzo**: `venue_secret_hint_reveal_hours` esiste per dare un indizio prima dell'indirizzo. L'indizio non deve essere sufficiente a identificare il luogo: se lo e', hai rivelato in anticipo con piu' passaggi.
- **Gate cache e pre-render**: Una pagina di evento generata staticamente o messa in cache mentre l'indirizzo era visibile continua a servirlo dopo. Ogni superficie che mostra il venue va marcata come dinamica e non cacheabile.

## Imperative Behaviors

- When touching anything that can reveal a venue: treat it as Critical, ask before acting
- When modifying a reveal path: enumerate all exit points by reading the code, not from memory
- When briefing an external designer or a selector: write `@ Secret Venue`, never the address
- When reveal state is unknown: hide the venue, always
- When sending the reveal mail: check per-ticket / per-RSVP entitlement, never per-event
- When deciding what the PAGE shows: apply the three levels — ticket or RSVP at once, approved member at the window or at the manual act, everyone else the hint
- When an RSVP is involved: treat it as a ticket, and never behind `venue_reveal_on_purchase`
- When writing the reveal cron: mark before or with the send, and log a failed send explicitly
- When writing a hint: verify it does not identify the place on its own
- When a page can show the venue: mark it dynamic and uncacheable
