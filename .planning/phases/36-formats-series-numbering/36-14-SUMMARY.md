---
phase: 36-formats-series-numbering
plan: 14
subsystem: verification
tags: [V1, V2, V4, V5, FMT-01, FMT-02, FMT-04, FMT-05, seeded-and-removed, data-loss, incident, production, measured]

# Dependency graph
requires:
  - phase: 36-formats-series-numbering
    provides: "V3 run and dated, and the seed → measure → remove → read-back-row-by-row method (36-13)"
  - phase: 36-formats-series-numbering
    provides: "the catalogue surface and its six manual procedures, executed (36-09)"
  - phase: 36-formats-series-numbering
    provides: "the three catalogue fields on the surface that creates a night (36-10)"
  - phase: 36-formats-series-numbering
    provides: "the filter, the chip row and the shared empty state on the public list (36-11, 36-12)"
  - phase: 36-formats-series-numbering
    provides: "the applied schema, the four policies, and the pre-36/post-36 baseline points (36-01, 36-04, 36-05)"
provides:
  - "V1, V2, V4 and V5 run and dated, each with the values observed rather than a verdict"
  - "The number seen NOT to recalculate: 2 deleted, 3 surviving, 4 proposed"
  - "A colour changed on a public surface with the serving process unchanged — the only way `without a deploy` can be proved"
  - "The validation record closed with nyquist_compliant left false on purpose"
  - "The six FMT-* ticked in REQUIREMENTS.md, each with its evidence beside it (D-36-19)"
  - "D11 — retiring a format does not unlist it, so restoring republishes a chip nobody decided to republish"
  - "D12 — 63 rows of production data deleted during this verification, in seven tables, not recovered"
affects: [phase 36 closure, phase 37, the owner's decision on D12]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A destructive act is driven by primary key with a guard that re-reads the row and refuses on a mismatch — NEVER by matching text on a surface. A loop written for two rows hit four, and nothing protested"
    - "`without a deploy` is proved by the serving process id being the same before and after, not by asserting it"
    - "A CDP port has no default: 9222 may already belong to a human's browser, and a default is what makes that invisible"

key-files:
  created:
    - .planning/phases/36-formats-series-numbering/36-14-SUMMARY.md
  modified:
    - .planning/phases/36-formats-series-numbering/36-VALIDATION.md
    - .planning/phases/36-formats-series-numbering/deferred-items.md
    - .planning/REQUIREMENTS.md

key-decisions:
  - "V2 e' stata girata su un format e una serie creati apposta e rimossi dopo, perche' la filigrana e' monotona e girarla su una serie vera avrebbe lasciato un salto in un progressivo reale"
  - "Il numero della serata sotto un format REALE e' stato lasciato vuoto di proposito: la proposta arrivava a 1 e salvarla avrebbe alzato per sempre una filigrana vera"
  - "V5 e' stata girata sul format usa-e-getta, cosi' che nessuna riga reale sia stata ritirata nemmeno per un minuto"
  - "I due difetti trovati (D11, D12) sono stati registrati e NON riparati: un difetto riparato in silenzio durante la propria verifica non e' stato verificato"
  - "nyquist_compliant resta false — cinque requisiti su sei si provano solo a mano"

patterns-established:
  - "Il registro apre con cio' che non puo' provare e con cio' che ha rotto, prima di cio' che prova"

requirements-completed: [FMT-01, FMT-02, FMT-03, FMT-04, FMT-05, FMT-06]

# Metrics
duration: 105min
completed: 2026-08-10
---

# Phase 36 Plan 14: V1, V2, V4, V5 — e un incidente che il registro nomina per primo — Summary

**Le quattro procedure rimaste sono state eseguite e hanno dato i numeri che
dovevano dare — una card con due marker, il 3 che resta 3 mentre il 2 sparisce
e il form che propone 4, il filtro che sopravvive a una navigazione e a una
scheda nuova, un colore cambiato sul chip pubblico senza che il processo del
server si muovesse. E, durante la rimozione delle righe create per provarle,
questo esecutore ha cancellato i due eventi reali di produzione: eventi e
serate sono stati ripristinati byte-identici da un'istantanea, 63 righe in
sette altre tabelle no.**

---

## L'incidente, dichiarato per primo perche' e' la cosa piu' importante di questo piano

### Cosa e' successo

Alle **~16:56 UTC del 2026-08-10**, per rimuovere i due eventi creati apposta
per V1 e V2, l'esecutore ha guidato `/admin/events` con uno snippet che cercava
i pulsanti `Delete` e li abbinava alla card giusta **risalendo l'albero del DOM
in cerca del titolo usa-e-getta**.

La risalita arriva a un antenato che contiene **l'intera lista**. Dopo i primi
due passaggi il criterio corrispondeva quindi a **qualunque** pulsante `Delete`,
e il ciclo ha premuto quattro volte. I due eventi reali sono stati cancellati, e
con loro, in cascata, ogni riga che li referenziava.

**Il ciclo aveva anche un contatore di controllo, e non ha aiutato:** rileggeva
quante volte il titolo usa-e-getta comparisse ancora nel testo della pagina, e
ha stampato `0` mentre continuava a premere. Un controllo che guarda la stessa
superficie che sta manipolando non e' un controllo.

### Cosa e' tornato

| Tabella | Righe | Come |
|---|---|---|
| `events` | **2** | ripristinate da un'istantanea presa **prima di toccare qualsiasi cosa**, con id, slug, `created_at` e ogni colonna originali |
| `event_parties` | **3** | idem |

**Verificate riga per riga**, per chiave primaria, contro due riferimenti
indipendenti — l'istantanea di partenza di questa sessione **e** quella che il
piano 36-13 aveva lasciato:

| Tabella | aggiunte | rimosse | **cambiate** | md5 |
|---|---|---|---|---|
| `events` | 0 | 0 | **0** | identico all'istantanea di partenza |
| `event_parties` | 0 | 0 | **0** | identico |
| `formats` | 0 | 0 | **0** | identico |
| `party_series` | 0 | 0 | **0** | identico |

Le filigrane sono tornate esattamente all'insieme di partenza: `RSNT=2`, tutte
le altre `0`. **Nessun progressivo reale si e' mosso in nessun momento.**

### Cosa NON e' tornato

Nessuna istantanea copriva queste tabelle, e il progetto **non ha PITR**
(`pitr_enabled: false`, e l'API di gestione non elenca alcun backup, letta alle
17:00 UTC):

| Tabella | Righe alle 16:43 UTC | Ora |
|---|---|---|
| `drink_orders` | **28** | 0 |
| `drink_tokens` | **16** | 0 |
| `drink_items` | **10** | 0 |
| `pending_purchases` | **6** | 0 |
| `tickets` | **1** | 0 |
| `ticket_tiers` | **1** | 0 |
| `guest_list_entries` | **1** | 0 |

**63 righe.** Il *prima* non e' una stima: viene da `table_row_counts` in
`32-BASELINE-reads.post-36.json`, catturato **oggi alle 16:43 UTC**, che porta
venticinque tabelle. Tutte e venticinque sono state riconfrontate una per una:
**si sono mosse solo quelle sette** — `profiles` 4, `venues` 5, `artists` 7,
`newsletter_subscribers` 0 e le altre sono dove erano.

### Cosa significa, e cosa resta al proprietario

I due eventi sono **passati** (febbraio e maggio 2026): nessuna porta di stasera
e nessuna vendita in corso dipendono da queste righe. Quello che si e' perso e'
**il registro applicativo** di consumazioni acquistate, dei loro token, di un
biglietto e di una voce di guest list. **La verita' finanziaria non e' persa** —
le transazioni stanno su SumUp — ma `drink_orders.sumup_transaction_code` era il
ponte fra le due, ed e' il ponte che e' andato.

Le opzioni stanno in `deferred-items.md` **D12**, e sono del proprietario:
guardare la dashboard Supabase di persona prima di dare la perdita per
definitiva (`walg_enabled` e' `true` anche se l'API non elenca nulla);
ricostruire gli ordini dall'estratto SumUp; oppure accettare la perdita e
dichiararla con la data.

### Cosa e' cambiato subito nel modo di lavorare

Tutte le cancellazioni successive della sessione — la serie e il format
usa-e-getta — sono state fatte **per chiave primaria, con una guardia che
rilegge la riga e rifiuta se il codice non e' quello atteso e se qualcosa la
referenzia**, e la rimozione e' stata riletta dal database. La regola generale,
scritta perche' valga oltre questo piano: **nessun atto distruttivo va guidato
per corrispondenza di testo su una superficie.**

---

## Il secondo atto sull'identita' del proprietario, e come e' stato chiuso

Prima dell'incidente ne e' avvenuto un altro, di natura diversa, e va detto con
la stessa chiarezza.

L'esecutore ha lanciato un Chrome con un profilo usa-e-getta su
`--remote-debugging-port=9222`. **Quella porta era gia' occupata da Chrome del
proprietario**, avviato prima con `--restore-last-session`. Il nuovo processo non
ha potuto legarsi alla porta e **ogni comando emesso e' finito nel browser vivo
di una persona**: la prova e' che l'indirizzo cambiava da solo mentre lui
navigava — `/admin/members`, `/admin/artists`, la scheda di un locale.

Cosa e' stato fatto con quella porta prima che l'errore fosse capito: **quattro
letture** (URL, titolo, elenco di pulsanti, registrazioni service worker) e
**una scrittura** — il cookie di sessione coniato per la verifica, impostato
sull'origine del server di sviluppo locale.

Cosa e' stato fatto dopo:

| | |
|---|---|
| Il cookie iniettato | **cancellato chirurgicamente**, per nome e per origine. `Storage.clearCookies` **non** e' stato usato: avrebbe svuotato l'intera giara del proprietario. Riletto dopo: `none` |
| Il driver | riscritto perche' **`CDP_PORT` sia obbligatorio e senza default**, con la ragione scritta nel file. Un default e' cio' che rende invisibile un errore del genere |
| Il browser dell'esecutore | rilanciato su **9333**, con un profilo nuovo, e verificato isolato — un solo target, `about:blank`, aperto da noi |
| Il profilo del proprietario | **mai copiato.** E' la stessa linea che 36-13 aveva rifiutato di superare: copiare un profilo Chrome e' un'estrazione di credenziali |

**La sessione usata per la verifica era autorizzata** — il proprietario l'aveva
autorizzata esplicitamente il 2026-08-10 e l'autorizzazione copre la semina per
la verifica. E' stata **revocata globalmente alle 17:00 UTC** e la revoca e'
stata verificata: il token non risolve piu' ad alcun utente (`400`). Il file dei
cookie e' stato cancellato dal disco. **Costo della revoca globale, dichiarato:**
disconnette anche le altre sessioni del proprietario, ed e' la stessa scelta che
36-13 aveva fatto.

---

## V1 — la serata doppia · eseguita 2026-08-10

Un evento creato da `/admin/events/new` con due serate di **format diversi**: la
prima sotto un format e una serie creati apposta, la seconda sotto un format
reale con **il numero lasciato vuoto**.

**Perche' vuoto:** scelta la serie reale, il campo e' arrivato precompilato con
`1` — la filigrana di quella serie e' `0`. Salvarlo l'avrebbe portata a `1` per
sempre, e la prima serata vera di quella serie si sarebbe vista proporre `2`.
E' la stessa trappola che 36-13 aveva rifiutato, incontrata su un altro campo.

| Cosa V1 chiede | Cosa si e' visto |
|---|---|
| una sola card | **1** |
| due marker | **2** |
| in ordine di `sort_order` | reso `sort_order` 0 poi 1, verificato contro le righe |
| uniti da `×` | il testo reso e' *nome · `×` · nome* |
| ogni serata mostra il proprio, sul dettaglio | due marker distinti, con i **due colori** dei due format: `#8C82A6` e `#FFB25E` |
| nessun numero, nessun codice | **nessuno dei due codici compare nel documento intero, payload RSC compreso.** L'unica occorrenza della parola `number` e' nello script di runtime di React |

**E una misura che il piano non chiede.** Con la sessione in piedi, la riga di
chip e' stata letta due volte sullo stesso indirizzo:

| | anonimo | sessione che vede le bozze |
|---|---|---|
| chip | **5**, stesso ordine, `All` corrente | **5**, stesso ordine, `All` corrente |
| card | **2** | **3** |
| il format creato per la verifica | **nessun chip** | **nessun chip** |

Il format usa-e-getta nasce `listed = false` (D-36-17): la sua **card** era
visibile a chi vede le bozze mentre il suo **chip** non esisteva per nessuno.
E' D-36-16 osservato su un caso piu' netto di quello di 36-13 — li' i chip erano
identici perche' non c'era nulla di nuovo da mostrare; qui c'era, e sono rimasti
identici lo stesso.

**Limite:** la card e' stata osservata su una superficie che vede le bozze.
Osservarla pubblicamente avrebbe richiesto di **pubblicare** un evento inventato.

---

## V2 — il numero non si ricalcola · eseguita 2026-08-10

**Girata su un format e una serie creati apposta**, per la ragione che il piano
stesso nomina: `bump_series_watermark`
(`20260810120000_formats_and_series.sql:590-604`) alza `highest_assigned` con
`GREATEST` e **non lo abbassa mai, nemmeno cancellando la serata**. Su una serie
reale, V2 l'avrebbe lasciata alzata per sempre.

| Passo | Numero |
|---|---|
| Proposta sulla serie nuova (filigrana 0) | **1** |
| Assegnati a due serate della stessa serie | **2** e **3** |
| Cancellata | quella con **2** |
| La superstite, riletta dal database | **3** — non e' diventata 2 |
| La cancellata, chiesta per nome | `[]` |
| Filigrana dopo la cancellazione | **3** — non abbassata |
| **Proposta per una serata nuova** | **4** |

**4 e' la cifra che decide la procedura.** Dopo la cancellazione in quella serie
resta **una** serata: una proposta derivata da un conteggio avrebbe offerto
**2** — un numero gia' assegnato, e potenzialmente gia' su una locandina,
offerto una seconda volta. Ne ha offerto 4, che e' `n+2` e che e' maggiore del
piu' alto mai assegnato.

---

## V4 — il filtro nell'indirizzo · eseguita 2026-08-10

| Passo | Cosa si e' visto |
|---|---|
| format scelto → dentro un evento → indietro | `/events?format=<slug>` → dettaglio → **indietro** → `/events?format=<slug>`, chip corrente ancora quello |
| l'indirizzo aperto in una finestra nuova | scheda **nuova, `history.length === 1`** — apertura a freddo, come un link ricevuto: filtro applicato, `border-color` **preso dal catalogo**, stato vuoto condiviso |
| `Past` **e poi** un format | `Past` su pagina filtrata → `/events?format=…&tab=past`, **il format sopravvive**; poi un altro chip → `/events?format=<altro>&tab=past`, **il tab sopravvive**. Ogni href di chip porta `&tab=past` finche' il tab e' `Past` |
| `?format=` con un valore inesistente | **lista completa, `All` corrente, `200`, nessun redirect, nessun errore** |

E tre varianti dello stesso input non fidato, misurate perche' costavano una
richiesta: `?format=` vuoto, `?format=a&format=b` ripetuto, `?format=RESONATE`
con il caso sbagliato. **Tutte e tre si comportano come l'indirizzo nudo.** Uno
slug reale scritto male e uno inventato sono indistinguibili — la proprieta' che
tiene la pagina lontana dall'essere un oracolo di enumerazione.

**Non rieseguito, e citato:** lo **swipe con un dito** e il **casing dei nomi di
format accanto a due tab in maiuscolo**, osservati dal **proprietario su un
secondo dispositivo in navigazione privata** il 2026-08-10 (36-13). Nessuno
strumento qui ha un pollice.

**Un fatto osservato di passaggio, registrato e non riparato.** I due tab sono
**`<button>` che chiamano `router.replace`**, non `<Link>`: la scelta del tab
**non entra nella cronologia**, quindi premere `Past` e poi indietro riporta
alla pagina precedente a `/events`, non al tab `Upcoming`. Il filtro per format,
che e' un `<a>`, fa il contrario. Nessuna delle due contraddice FMT-04 —
l'indirizzo porta entrambi gli assi e si condivide — ma sono due grammatiche
diverse sulla stessa schermata.

---

## V5 — dati e non codice · eseguita 2026-08-10

**Girata sul format usa-e-getta**, cosi' che nessuna riga reale sia stata
ritirata nemmeno per un minuto.

### Il colore, cambiato senza deploy

| | |
|---|---|
| Prima, sul chip pubblico letto anonimo | `#8C82A6` |
| Atto | `Edit format` → un'altra tinta → `Save format` |
| Dopo, sullo stesso chip | **`#F6B6D2`** |
| Processo del server | **PID 65002, avviato 18:12:27 — lo stesso** |
| `.next/BUILD_ID` | **non toccato** |

*«Senza deploy» si prova solo non facendo il deploy.* Qui e' provato dal fatto
che il processo che ha servito la seconda pagina e' **lo stesso** che aveva
servito la prima.

### Il ritiro

| Cosa V5 chiede | Cosa si e' visto |
|---|---|
| il chip sparisce da `/events` | **6 → 5**, chiave anonima |
| la voce sparisce dal selettore per un'assegnazione nuova | il `<select>` del format su `/admin/events/new`: **5 → 4** |
| **una serata che lo portava continua a mostrarlo** | la serata **rende ancora il suo marker**, con il colore del format |
| lo slug ritirato nell'indirizzo | risponde **come l'indirizzo nudo** |

La conferma dice, verbatim: *«New nights can no longer be assigned to it. Nights
already recorded under it keep their name and stay where they are»* — che e'
esattamente cio' che le due righe centrali hanno misurato. Il fuoco all'apertura
era su **`Cancel`**, misurato su `document.activeElement`.

### Il ripristino — e una divergenza fra la procedura scritta e il comportamento

La procedura chiede di *«confermare che il chip torna solo dopo averlo
elencato»*. **Non e' cio' che accade.** `retireFormat` scrive **solo**
`retired_at`; `listed` resta `true`. Il solo `Restore format` ha rimesso il chip
su `/events` per ogni visitatore — misurato: **5 → 6**, subito.

L'asimmetria *«solo dopo averlo elencato»* **esiste**, ma sta sulla
**creazione** (D-36-17), ed e' stata misurata all'inizio della sessione: un
format creato nasce `listed = false` e non ha chip finche' qualcuno non preme
`Show on /events`.

**Registrata come D11, non riparata**, con le due letture possibili scritte
accanto. Non e' un difetto d'accesso: e' una decisione — se ripristinare debba
implicare ripubblicare — che oggi il codice prende al posto di una persona.

---

## Il catalogo, riletto riga per riga

Dopo la rimozione di tutto cio' che questo piano ha creato — due eventi, tre
serate, una serie, un format:

| Tabella | righe | aggiunte | rimosse | **cambiate** |
|---|---|---|---|---|
| `formats` | 5 → 5 | 0 | 0 | **0** |
| `party_series` | 6 → 6 | 0 | 0 | **0** |
| `event_parties` | 3 → 3 | 0 | 0 | **0** |
| `events` | 2 → 2 | 0 | 0 | **0** |

Confrontate **due volte**: contro l'istantanea presa all'inizio di questa
sessione e contro quella che 36-13 aveva lasciato. Gli md5 delle quattro tabelle
coincidono con quelli di partenza. **Filigrane:** `RSNT=2`, tutte le altre `0` —
identiche a prima, e la serie usa-e-getta e' sparita con la propria.

**Ma «byte-identica» vale per queste quattro tabelle e non per il database.**
Sette altre tabelle hanno perso 63 righe, e la frase corretta e' quella, non
l'altra.

---

## `baseline:compare pre-36 → post-36`, rieseguito

Stesso comando di 36-05, alle **17:02 UTC**: **38 difetti, ognuno con la propria
frase**, identici a quelli che 36-05 aveva gia' spiegato — 6 in B1 (le quattro
policy nuove su due tabelle che prima non esistevano, piu' i due conteggi di
supporto), 28 in B2 (14 persona × 2 tabelle nuove), 4 in B5 (piu' `unused_index`
non ancorato). Le due righe che contano:

- **`72 unchanged · 0 unexplained` — nessuna policy preesistente si e' mossa di
  un bit**, e il cancello pubblico `event_parties_select_published` e'
  byte-identico fra le due catture.
- **322 celle condivise, `0` mosse.**

Il dettaglio, cella per cella, sta in `36-VALIDATION.md`.

---

## Cosa questo piano NON prova

1. **Non prova che il cancello rifiuti un *ruolo*.** Le 32 voci `human_needed` a
   monte restano intatte: questa fase non le consuma e non le peggiora, e ha
   costruito superfici pubbliche sopra un modello dei permessi che nessuno ha
   ancora visto rifiutare qualcuno.
2. **Non ha guardato la produzione distribuita.** Tutte le letture sono contro
   il dev server, che esegue il codice di questa fase sul database di
   produzione. Il sito distribuito non ha ancora queste superfici.
3. **Non prova nulla su un dispositivo reale**, tranne cio' che il proprietario
   ha guardato di persona (36-13).
4. **Non prova che V1 renda due marker a un visitatore**: l'evento era una
   bozza, e pubblicarlo era la sola cosa che non si poteva fare.
5. **Non ha eseguito `npm run build`**, e non proverebbe nulla: questo piano non
   cambia una riga di TypeScript.
6. **Non c'e' un test runner per il prodotto.** Niente qui e' verificato perche'
   i test passano.

---

## Deviations from Plan

### Departures dal testo del piano, deliberate e dichiarate

1. **I task 1 e 2 sono checkpoint del piano, e la loro parte automatizzabile e'
   stata eseguita invece di essere consegnata.** V1, V2, V4 e V5 sono letture di
   database e di sorgente reso piu' atti su una superficie: consegnarle avrebbe
   sostituito una misura con uno sguardo. Solo cio' che richiede un dispositivo
   e un pollice e' rimasto al proprietario — ed era gia' stato fatto in 36-13.
   Stessa forma della deviazione 5 di `36-13-SUMMARY.md`.
2. **V2 e V5 sono state girate su un format e una serie creati apposta**, non su
   righe reali. Il piano lo suggerisce per V5 e l'orchestratore lo impone per
   V2; per entrambe la ragione e' la stessa filigrana monotona.
3. **Il numero della serata sotto un format reale e' stato lasciato vuoto**,
   contro la proposta del form. Stessa ragione, altro campo.
4. **La rimozione della serie e del format e' stata fatta con la service key**,
   non dalla superficie: la superficie del catalogo **non ha un controllo di
   rimozione**, per disegno (36-09), e lasciarli in produzione avrebbe reso il
   catalogo falso.
5. **Il piano dice «Anything created for these procedures has been removed,
   confirmed by a read-back». E' vero — ed e' anche il passo in cui e' avvenuto
   l'incidente.** Le due frasi convivono e vanno lette insieme.

### Auto-fixed issues

**Nessuna.** Le regole 1–3 non sono scattate e non dovevano: questo piano misura
e non ripara. I due riscontri (**D11**, **D12**) sono stati registrati e
lasciati intatti — e D12 non e' un difetto del prodotto, e' un danno di questo
esecutore.

### Non fatto, apposta

- **`production-calendar.md` non e' stato emendato.** I due emendamenti dovuti —
  il gate *progressivo per sede o per format* chiuso da D-36-07, e la serie di
  Nizza scritta con la R maiuscola contro il gate *grafia del brand* — sono
  lavoro di `ai-engineering` (versione + changelog + `npm run verify:persona`) e
  restano del proprietario. Registrati in `36-VALIDATION.md`.
- **Nessuna policy sfiorata**, ne' su `venues` (D-36-18, fase 37) ne' altrove.
- **I diciotto scarti della migration history non sono stati toccati.**
- **Nessun pacchetto installato.**

## Issues Encountered

- **Porta 9222 gia' occupata dal browser del proprietario.** Raccontato sopra
  per intero. Il driver ora pretende `CDP_PORT` e non ha un default.
- **Il ciclo di cancellazione ha colpito quattro righe invece di due.**
  Raccontato sopra per intero.
- Il form dell'evento rifiuta il salvataggio con la validazione HTML nativa se
  `Start Time` e' vuoto su una serata: il primo tentativo non e' partito e non
  ha lasciato traccia. **Un rifiuto prima dell'insert e' il comportamento
  giusto**, ed e' stato letto da `form.checkValidity()` invece che dedotto dal
  fatto che non fosse successo nulla.

## Known Stubs

Nessuno. Questo piano non aggiunge codice di prodotto.

## Threat Flags

| Minaccia | Esito |
|---|---|
| T-36-14-01 · righe di test lasciate nell'archivio | **Chiusa, ma non come previsto.** Tutto cio' che questo piano ha creato e' stato rimosso e la rimozione riletta per chiave primaria — e nello stesso passo sono state cancellate righe che non erano di test. Vedi D12 |
| T-36-14-02 · un numero bruciato da un test | **Accettata a costo zero.** Il numero bruciato sta in una serie usa-e-getta che e' stata cancellata con la propria filigrana. **Nessuna filigrana reale si e' mossa**, misurato prima e dopo |
| T-36-14-03 · un registro che lusinga la fase | `nyquist_compliant` resta `false`; ogni casella di sign-off porta un'osservazione; nessun requisito e' spuntato sulla forza di un build; e il registro **apre** con l'incidente |
| T-36-14-04 · un ritiro eseguito su un format vivo | **Chiusa:** il ritiro e' avvenuto solo sul format usa-e-getta. Nessuna riga reale ritirata, nemmeno per un minuto |
| T-36-14-SC · installazioni di pacchetti | Nessun pacchetto installato |

**Due minacce non nel registro, comparse in esecuzione:** la collisione sulla
porta CDP (chiusa: cookie rimosso chirurgicamente, driver senza default, browser
isolato su un'altra porta) e la cancellazione a cascata (aperta: D12, decisione
del proprietario).

## Self-Check: PASSED

- `.planning/phases/36-formats-series-numbering/36-VALIDATION.md` — presente,
  `grep -c "nyquist_compliant: false"` → **1**
- `.planning/phases/36-formats-series-numbering/deferred-items.md` — presente,
  contiene **D11** e **D12**
- `.planning/REQUIREMENTS.md` — i sei `FMT-*` spuntati, ognuno con l'evidenza
  accanto, e la tabella di tracciabilita' aggiornata
- `b3e3047` — presente in `git log`
- Nessun file tracciato cancellato dai commit di questo piano
- `docs/36-14/` confermato ignorato da git **prima** di scriverci dentro
- Controllo di segretezza su questo file: nessun nome di sede, nessuna serie
  reale nominata, nessuna data non annunciata, nessun nome di persona, nessun
  token, nessun uuid intero

---
*Phase: 36-formats-series-numbering*
*V1, V2, V4 e V5 eseguite e datate: **2026-08-10**. Quattro procedure con i
numeri che hanno prodotto, un catalogo riletto riga per riga e trovato
byte-identico, e 63 righe in sette altre tabelle che non ci sono piu' — e il
testo dice sempre quale delle tre cose sta descrivendo.*
