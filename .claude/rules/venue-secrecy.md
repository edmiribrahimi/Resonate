---
paths:
  - "src/app/api/cron/venue-reveal/**"
  - "src/emails/venue-reveal.tsx"
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
- **Gate percorsi enumerati**: L'indirizzo puo' uscire da piu' punti — pagina pubblica, mail di rivelazione, mail di conferma acquisto, pass Wallet, payload analytics, risposta API, mappa incorporata, meta tag Open Graph. Prima di modificare, **enumera i percorsi leggendo il codice**, non elencando quelli che ti vengono in mente. Un percorso dimenticato e' una fuga.
- **Gate default chiuso**: Se lo stato di rivelazione non e' determinabile — dato mancante, errore di query, utente non identificato — il venue **non si mostra**. Il fallback e' il segreto, mai l'indirizzo. E' l'unico dominio del progetto in cui il default sicuro e' negare (contrapposto a `checkin-offline.md`, dove il default e' ammettere: li' l'errore e' recuperabile, qui no).
- **Gate autorizzazione per destinatario**: La rivelazione e' per-biglietto e per-RSVP (`tickets.venue_reveal_sent`, `rsvps.venue_reveal_sent`), non per-evento. Un percorso che rivela "a tutti quelli dell'evento" salta il controllo su chi ha effettivamente titolo.
- **Gate idempotenza del cron**: `api/cron/venue-reveal` puo' essere eseguito due volte. Marcare `venue_reveal_sent` **prima o insieme** all'invio, mai solo dopo: una seconda esecuzione non deve rispedire. E se l'invio fallisce dopo la marcatura, va loggato come tale — un destinatario che non ha ricevuto l'indirizzo e' un problema visibile, una doppia mail e' rumore.
- **Gate indizio non equivalente all'indirizzo**: `venue_secret_hint_reveal_hours` esiste per dare un indizio prima dell'indirizzo. L'indizio non deve essere sufficiente a identificare il luogo: se lo e', hai rivelato in anticipo con piu' passaggi.
- **Gate cache e pre-render**: Una pagina di evento generata staticamente o messa in cache mentre l'indirizzo era visibile continua a servirlo dopo. Ogni superficie che mostra il venue va marcata come dinamica e non cacheabile.

## Imperative Behaviors

- When touching anything that can reveal a venue: treat it as Critical, ask before acting
- When modifying a reveal path: enumerate all exit points by reading the code, not from memory
- When reveal state is unknown: hide the venue, always
- When revealing: check per-ticket / per-RSVP entitlement, never per-event
- When writing the reveal cron: mark before or with the send, and log a failed send explicitly
- When writing a hint: verify it does not identify the place on its own
- When a page can show the venue: mark it dynamic and uncacheable
