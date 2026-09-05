---
phase: 49
slug: comprare-senza-account
status: ready
nyquist_compliant: true
wave_0_complete: true
created: 2026-09-05
updated: 2026-09-05
---

# Phase 49 — Validation Strategy

> Il contratto di verifica di questa fase, **e la prima riga e' un fatto
> d'ambiente che domina tutto il resto.**

---

## Il fatto che viene prima di ogni tabella

**Non esiste un test runner per il prodotto.** `package.json` non ha script
`test` e non esiste alcun file `*.test.*` o `*.spec.*`. **Nessun task di questa
fase puo' chiudersi perche' «i test passano»**, e nessun piano ne dichiara uno.

Cio' che esiste, ed e' l'intera automazione disponibile:

| Proprieta' | Valore |
|---|---|
| Typecheck | `npm run build` — non esiste uno script `typecheck` separato: `next build` **e'** il gate dei tipi |
| Gate strutturali | `npm run verify` (`scripts/verify-all.mjs`) — copre invarianti strutturali, **non** il comportamento del prodotto |
| Gate del venue | `npm run verify:venue-surfaces` — esteso da questa fase (piano 49-06) |
| Gate della persona | `npm run verify:persona` — copre coerenza, non correttezza |
| Durata | `npm run build` domina; i grep sono istantanei |

**Un verde non dice «e' corretto»: dice «e' coerente».** La distinzione va tenuta,
altrimenti il comando diventa un timbro.

---

## Frequenza di campionamento

- **Dopo ogni task:** `npm run build` piu' i grep dichiarati nei suoi
  `acceptance_criteria`.
- **Dopo ogni onda:** `npm run build` + `npm run verify`, piu'
  `npm run verify:venue-surfaces` sulle onde che toccano una superficie
  (2, 3, 4) e `npm run verify:persona` sull'onda 1 (piano 49-02 tocca due moduli
  della persona).
- **Prima della chiusura di fase:** tutti e quattro verdi, **piu' le cinque
  procedure manuali eseguite** (piano 49-11) e riportate in `49-VERIFICATION.md`
  con evidenza `file:riga`.

---

## Mappa task -> verifica

| Piano | Onda | Requisito | Minaccia | Comportamento verificato | Tipo | Comando automatico |
|---|---|---|---|---|---|---|
| 49-01 t1 | 1 | BUY-01, BUY-02 | T-49-01, T-49-02 | l'unicita' del checkout vive sull'ordine; RLS nella stessa migration; tetto con default 6 | statico + compilatore | `npm run build` + grep sui vincoli nella migration |
| 49-01 t2 | 1 | BUY-01 | T-49-01, T-49-04 | N righe da una INSERT, tetto e capienza dentro la transazione, uscita idempotente | statico | grep su `FOR UPDATE`, `generate_series`, `max_tickets_per_order` |
| 49-01 t3 | 1 | BUY-01, BUY-02 | T-49-01 | gli oggetti esistono in produzione; i conteggi pre-scrittura erano zero | catalogo | rilettura del catalogo + `npm run build` |
| 49-02 t1 | 1 | BUY-05 | T-49-06, T-49-08 | nessun `random()` nel blocco del codice; lunghezza 10; nessun codice esistente riscritto | statico + catalogo | grep negativo su `floor(random()` + rilettura della funzione |
| 49-02 t2 | 1 | BUY-05 | T-49-06 | la funzione morta non esiste; i due gate dicono il vero | statico | `npm run verify:persona` + grep a zero su `generateMembershipCode` |
| 49-03 t1 | 1 | BUY-03 | T-49-10, T-49-11 | il perimetro e' misurato dal catalogo, non dedotto | documentale | esistenza e contenuto di `49-PERIMETER.md` |
| 49-03 t2 | 1 | BUY-03 | T-49-10 | la decisione sull'arm 5 esiste ed e' datata | checkpoint | — (decisione umana) |
| 49-04 t1 | 2 | BUY-02, BUY-03 | T-49-13, T-49-16 | prezzo dal DB; nessuna colonna di venue letta | statico + compilatore | `npm run build` + grep a zero su venue |
| 49-04 t2 | 2 | BUY-03 | T-49-14, T-49-17 | nessun `auth.getUser`, nessun account creato prima del pagamento | statico | grep a zero su `auth.getUser` e `createUser` |
| 49-05 t1 | 2 | BUY-03 | T-49-19 | categoria presente da entrambi i lati, e i due conteggi coincidono | statico + catalogo | grep + rilettura del `CHECK` |
| 49-05 t2 | 2 | BUY-03, BUY-04 | T-49-18, T-49-21 | nessun luogo nel template; la mail non solleva mai | statico | grep a zero su parole di luogo e su `throw` |
| 49-06 t1 | 3 | BUY-04 | T-49-22, T-49-23, T-49-26 | apertura dalla sola firma; nessuna colonna di venue; `force-dynamic` | statico + compilatore | `npm run build` + grep |
| 49-06 t2 | 3 | BUY-04 | T-49-24, T-49-25 | risposta indistinguibile, invio registrato | statico | grep + lettura del ritorno unico |
| 49-06 t3 | 3 | BUY-04 | T-49-23 | il gate conosce la superficie nuova, **e lo si e' visto fallire** | eseguibile + mutazione | `npm run verify:venue-surfaces` |
| 49-07 t1 | 3 | BUY-03 | T-49-29 | identita' risolta o creata, con tre cause distinte, senza sollevare | statico + compilatore | `npm run build` + grep a zero su `throw` |
| 49-07 t2 | 3 | BUY-01, BUY-03 | T-49-27, T-49-28, T-49-31 | GET checkout invariato; esecuzione doppia = stesso stato | statico + esecuzione doppia | `npm run build` + i due conteggi nel SUMMARY |
| 49-07 t3 | 3 | BUY-03 | T-49-30 | un pagamento senza biglietti e' visibile a chi organizza | statico + compilatore | `npm run build` + `npm run verify` |
| 49-08 t1 | 3 | BUY-01 | T-49-33, T-49-34 | niente `maybeSingle` sui biglietti per `user_id` | statico | grep + `npm run verify:venue-surfaces` |
| 49-08 t2 | 3 | BUY-01, BUY-02, BUY-03 | T-49-32, T-49-35 | quantita' entro il tetto; nessun rimbalzo a `/register`; nessun nome chiesto | statico | grep a zero su `/register` e su campi di nome |
| 49-08 t3 | 3 | BUY-02 | T-49-32 | il tetto e' modificabile da chi organizza, in creazione e in aggiornamento | statico | grep su entrambi i percorsi |
| 49-09 t1 | 4 | BUY-03 | T-49-36, T-49-37 | guardia di tempo importata; guardia per serata non toccata | statico | grep a zero su `venue_reveal_email_sent` |
| 49-09 t2 | 4 | BUY-03 | T-49-38, T-49-39 | mail solo a rivelazione scattata; seconda esecuzione a zero destinatari | statico + esecuzione doppia | `npm run verify:venue-surfaces` + i due conteggi |
| 49-09 t3 | 4 | BUY-03 | T-49-36 | i cinque passi percorsi su una serata di prova | **checkpoint umano** | — |
| 49-10 t1 | 4 | BUY-01, BUY-04 | T-49-42 | l'etichetta arriva alla porta; stringa vuota trattata come assente | statico + compilatore | `npm run build` + grep su `holder_label` |
| 49-10 t2 | 4 | BUY-01 | T-49-40, T-49-43 | il doppio ingresso e' visibile; `sync-manager` invariato | statico | `git diff` vuoto + `npm run verify` |
| 49-11 t1 | 5 | BUY-01..05 | T-49-45 | cinque procedure scritte, con ruolo e osservabile | documentale | grep su `BUY-0` e sul divieto di materiale di produzione |
| 49-11 t2 | 5 | BUY-01..05 | T-49-44, T-49-46 | le cinque procedure percorse, esiti scritti | **checkpoint umano** | i quattro `verify` verdi |

---

## Onda 0

**Nessun file di test da creare: non esiste un framework, e questa fase non ne
introduce uno.** Introdurlo sarebbe una decisione di prodotto che nessun
requisito di questa fase chiede, in una fase gia' Critical su quattro domini.

L'unico automatismo **nuovo** che questa fase produce e' l'estensione di
`scripts/verify-venue-surfaces.mjs` (piano 49-06, task 3) — ed e' proprio dove
serve, perche' e' la fase che crea una superficie che il gate non conosceva.

---

## Verifiche solo manuali

| Comportamento | Requisito | Perche' manuale | Dove sta la procedura |
|---|---|---|---|
| Il venue non compare in nessuna superficie del percorso ospite prima della rivelazione | BUY-03 | comprende la mail e il riepilogo del fornitore, che non sono superfici nostre | `49-RUNBOOK.md` #1 |
| Un biglietto d'ospite passa alla porta, anche offline, in cache e **non** in cache | BUY-01, BUY-04 | serve il dispositivo reale, con la radio spenta, all'indirizzo a cui sara' mandato | `49-RUNBOOK.md` #2 |
| Un ordine multiplo produce codici distinti; la seconda scansione e' rifiutata; il doppio scan offline resta visibile | BUY-01 | serve una fotocamera, due dispositivi e due code offline | `49-RUNBOOK.md` #3 |
| Dopo la rivelazione, chi compra senza password raggiunge l'indirizzo | BUY-03 | il percorso attraversa cron, posta e stato della serata | `49-RUNBOOK.md` #4 + checkpoint 49-09 t3 |
| Un indirizzo scritto male non lascia l'ospite senza niente | BUY-03, BUY-04 | dipende dal comportamento del fornitore di posta | `49-RUNBOOK.md` #5 |
| Apple Pay sul merchant nuovo | — (differito) | serve un iPhone in Safari e dei tier realmente in vendita | `49-RUNBOOK.md`, voce differita |

---

## Sign-off

- [x] Ogni task ha un `<verify><automated>` eseguibile, oppure e' un checkpoint dichiarato
- [x] Nessuna sequenza di tre task senza verifica automatica
- [x] Nessun `MISSING` da colmare in onda 0: non esiste un framework da installare, e la ragione e' scritta
- [x] Nessun flag di watch
- [x] `nyquist_compliant: true` — nel senso che questo ambiente consente: **compilatore + gate statici + procedure scritte**, mai «i test passano»

**Approvazione:** in attesa dell'esecuzione della fase.
