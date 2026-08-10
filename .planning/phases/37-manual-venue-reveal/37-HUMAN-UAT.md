---
status: partial
phase: 37-manual-venue-reveal
source: [37-VERIFICATION.md, 37-13-SUMMARY.md, deferred-items.md]
started: 2026-08-11
updated: 2026-08-11
---

## Current Test

[in attesa di prova umana]

> **Precondizione che governa quasi tutta questa lista.** Nessuna riga di questa
> fase e' in produzione: il ramo e' 221 commit avanti a `origin/main`, e delle
> due migration solo la prima e' applicata. **Sette delle nove voci non sono
> eseguibili prima del deploy**, e dirlo e' parte della verifica — non un rinvio.
>
> Le due che si possono fare **prima**, e che costano meno adesso che dopo, sono
> la **9** (una decisione, non una prova) e la **7** se si accetta di eseguirla
> contro un database di container invece che contro la produzione.

## Tests

### 1. I tre livelli su una pagina che rende davvero
expected: I tre verdetti corrispondono ai rami misurati in container (P1–P9 di 37-13) — chi ha biglietto o RSVP vede l'indirizzo subito, il membro approvato senza nessuno dei due lo vede all'apertura della finestra o dopo una rivelazione manuale, l'esterno vede solo l'indizio.
precondition: deploy della seconda migration **insieme** al codice. Oggi la pagina lancia `PGRST202`.
result: [pending]

### 2. Il primo atto vero, con destinatari reali
expected: la mail parte, la pagina apre, la traccia registra nome e istante, il bottone passa a spento con «Revealed on … by …».
precondition: deploy completo **e una nuova autorizzazione a scrivere in produzione**. Quella di questa fase si e' esaurita all'`HTTP 200` della prima migration e non si eredita. Chiuso `rimanda` il 2026-08-11: con `tickets` e `rsvps` a zero l'atto avrebbe speso l'irreversibilita' senza provare deduplicazione, lotti e invio parziale — cioe' la parte che vale.
result: [pending]

### 3. Il secondo tentativo, dall'interfaccia e per chiamata diretta
expected: bottone spento con data e nome; la server action risponde `already_revealed`; `venue_revealed_at` invariato.
precondition: una serata gia' rivelata. Oggi ce ne sono zero. Il ciclo `revealed → completed → re_hidden` e' stato eseguito in container con esito conforme, mai su una sessione autenticata vera.
result: [pending]

### 4. Il modello dei permessi visto accettare **e** rifiutare
expected: l'organizer approvato non proprietario rivela con successo (D-37-13); l'organizer `pending` non raggiunge la capability (`requires_approved = true`).
precondition: in produzione non esistono sessioni `organizer` ne' `staff`. **Questa e' la voce piu' pesante della lista:** la fase costruisce un percorso irreversibile sopra un modello di permessi che nessuno ha ancora visto rifiutare qualcuno.
result: [pending]

### 5. La traccia allo staff, e non all'anonimo
expected: lo staff legge nome e istante; l'anonimo ottiene zero righe.
note: **la meta' anonima e' gia' misurata** — `200 []` con la sola chiave anonima (A6 di 37-13). Manca la meta' `staff`, che richiede una sessione di ruolo.
result: [pending]

### 6. La cache attraverso l'istante, nelle due direzioni
expected: nessuna pagina servita stale attraverso l'istante di rivelazione — ne' l'indizio a chi avrebbe titolo all'indirizzo, ne' l'indirizzo a chi non deve.
precondition: tre cose mancano insieme — il service worker nuovo non e' in produzione, in locale la pagina non si apre nemmeno con la rete, e **non esiste alcuna serata rivelata, quindi non esiste un istante da attraversare**.
note operativa: `skipWaiting`/`clientsClaim` aggiornano il **worker**, non le **voci**. Le copie pre-deploy sopravvivono fino a 24 h: la prima misura va presa in finestra privata, o si misura il worker vecchio.
result: [pending]

### 7. Il pavimento a 25 ore, e il rifiuto che dice perche'
expected: salvare una finestra sotto 25 ore da una serata segreta e' rifiutato, **e il messaggio nomina la causa** — sotto le 25 ore la mail puo' partire dopo l'inizio della serata.
note: il codice del rifiuto e' letto e citato (`admin/events/actions.ts:464-478`), mai eseguito da un form. Senza il «perche'», al primo rifiuto qualcuno alza il limite invece della finestra.
result: [pending]

### 8. Il dialogo dell'indizio dice la finestra effettiva
expected: su una serata con finestra `NULL` il dialogo scrive **25 hours**, non tace, e nomina il caso RSVP.
result: [pending]

### 9. La decisione su `is_published` — **CHIUSA il 2026-08-11 (piano 37-14)**
expected: su una **bozza**, `venue_for_parties` risponde a chi ha `staff.manage`.
deciso: si'. `is_published` e' stato spostato **dentro** i rami: i quattro rami del pubblico continuano a richiederlo, il ramo dello staff no.
ragione: **non e' un allargamento.** Chi ha `staff.manage` legge gia' `public.venues` direttamente per la policy `venues_select_staff` — misurato da 37-13. La funzione che gli negava il nome su una bozza non lo proteggeva da niente: gli chiudeva una strada mentre un'altra restava aperta. Toglie un'incoerenza, non aggiunge un lettore.
verificato: container Postgres con entrambe le migration — su una bozza: staff 1 riga, membro approvato 0, anonimo 0. Il pavimento della pubblicazione regge per i quattro rami del pubblico.
result: [resolved]

### 10. La cucitura fra il pannello e il server sulla sede testuale
expected: su una serata segreta con la sola sede testuale, il bottone non dovrebbe armarsi.
misurato: il pannello arma su `venueName ?? venue_text`, il server rifiuta su `venue_id === null`. Il bottone risulta acceso e la pressione riceve il rifiuto tipizzato.
perche' e' aperta e non urgente: **il verso e' quello sicuro** — si spreca un clic, non esce un indirizzo. Chiuderla costa due file di superficie e nessun cambio di regola. `deferred-items.md` voce 8.
result: [pending]

## Summary

total: 10
passed: 0
issues: 0
pending: 9
skipped: 0
blocked: 0
resolved: 1

## Gaps

Nessun gap di codice. Lo stato `human_needed` non dice che qualcosa manca: dice
che il percorso e' **costruito, letto e misurato in container, e mai esercitato**
contro la produzione con una sessione vera.

**Cinque delle nove voci — 1, 3, 4, 5, 8 — si chiudono con una sola sessione a
cinque account** (master, organizer/approved, organizer/pending, staff, member),
dopo il deploy. E' lo stesso debito che le fasi 43, 35 e 34 hanno gia' aperto
per 32 voci: non e' di questa fase, ma le sta sotto.
