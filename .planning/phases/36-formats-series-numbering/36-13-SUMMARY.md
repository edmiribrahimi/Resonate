---
phase: 36-formats-series-numbering
plan: 13
subsystem: verification
tags: [V3, FMT-06, FMT-04, seeded-and-removed, anonymous-key, rendered-source, production, measured, identity-act]

# Dependency graph
requires:
  - phase: 36-formats-series-numbering
    provides: "the applied schema and the four policies as production holds them (36-05), with the anon baseline 4/1/6 it measured"
  - phase: 36-formats-series-numbering
    provides: "the catalogue surface, read row by row before and after a session (36-09)"
  - phase: 36-formats-series-numbering
    provides: "the three catalogue fields on the work surface that creates a night (36-10)"
  - phase: 36-formats-series-numbering
    provides: "the filter, the chip row and the shared empty state on the public list (36-11, 36-12)"
provides:
  - "V3 run, dated, with what each probe returned — the only kind of evidence FMT-06 can have here"
  - "The first refusal in this phase observed against something that actually existed to hide"
  - "The chip row measured identical between an anonymous reader and a drafts-visible one, on the same address"
  - "The series-name branch proved APART from its fallback — the thing 36-12 declared unobservable"
  - "A production database left byte-identical to how it was found, verified row by row"
affects: [36-14, phase verification]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A refusal is measured by IDENTITY, not by count: asking the anonymous key for the seeded id by primary key answers `[]`, which a stable total could never distinguish from a coincidence"
    - "A verification that leaves a monotone counter moved has broken what it verified — the seed carries no number, and the watermark is read back to prove it"
    - "A hidden Chrome tab is throttled and React never hydrates: `document.visibilityState === 'hidden'` is a browser fact, not an application defect, and it must not be recorded as one"

key-files:
  created:
    - .planning/phases/36-formats-series-numbering/36-13-SUMMARY.md
  modified:
    - .planning/phases/36-formats-series-numbering/deferred-items.md

key-decisions:
  - "La sessione e' stata coniata con la service key su autorizzazione esplicita e datata del proprietario, dopo che l'esecutore si e' fermato a chiederlo invece di farlo"
  - "La serata seminata porta `number` NULL: un numero avrebbe alzato per sempre una filigrana monotona, e una verifica che lascia un salto nel progressivo ha rotto cio' che verificava"
  - "Serie scelta fra le due del format: quella con zero serate, cioe' l'unica che mette alla prova il Pitfall 3"
  - "`venue_secret = false` e data lontana, perche' il cron della rivelazione non filtra `is_published` (D9)"
  - "Nessun FMT-* spuntato in REQUIREMENTS.md — D-36-19"

patterns-established:
  - "Prima di seminare si cattura il *prima*: senza, «si e' allargato?» non ha una risposta, solo un'impressione"

requirements-completed: []  # deliberately empty — D-36-19

# Metrics
duration: 95min
completed: 2026-08-10
---

# Phase 36 Plan 13: V3 — il rifiuto visto rifiutare qualcosa che esisteva davvero — Summary

**Una serata non annunciata e' stata creata apposta in produzione dalla superficie
vera, la chiave anonima e il sorgente reso sono stati interrogati con quella
serata in piedi, e nessuno dei due l'ha nominata: `party_series` resta a 1 riga
su 6, gli otto aghi sono assenti da ogni documento payload compreso, e la riga
di chip e' identica byte per byte fra un lettore anonimo e uno che la bozza la
vede. Poi tutto e' stato rimosso, e le quattro tabelle sono byte-identiche a
come erano.**

---

## L'atto sull'identita' del proprietario, dichiarato per primo

Questo piano ha avuto bisogno di una sessione con `catalogue.manage`, perche'
il Task 1 pretende — giustamente — che la serata nasca da `/admin/events/new` e
non da un insert diretto.

**Nessuno strumento di questo repository puo' autenticarsi come un ruolo.** Non
e' un'assunzione: `scripts/rls-baseline.mjs:796` costruisce le sue persona con
`set_config('request.jwt.claims', …)` sull'endpoint SQL, cioe' le *simula*. E'
il debito delle 32 voci `human_needed` che `36-VALIDATION.md` dichiara, e questo
piano non lo consuma.

L'esecutore si e' quindi **fermato e ha chiesto**, invece di procurarsi la
sessione da solo. Le due strade offerte erano un login manuale del proprietario
in un browser preparato, oppure il conio di una sessione con la service key.

> **Il proprietario ha autorizzato esplicitamente il conio della sessione, il
> 2026-08-10.**

Cosa e' stato fatto con quell'autorizzazione, per intero:

| | |
|---|---|
| Meccanismo | `auth.admin.generateLink` (service key) → `verifyOtp` (chiave anonima) → il cookie nella forma che `@supabase/ssr` 0.8 scrive |
| Utente | `24b3d327` — l'unico con la capability richiesta |
| Durata | coniata alle 15:22 UTC, **revocata alle 16:31 UTC** con `admin.signOut(…, "global")` |
| Revoca verificata | il token non risolve piu' ad alcun utente: `400` |
| Perimetro | ha creato **una** bozza dal form e nient'altro. Nessuna riga preesistente toccata, nessuna policy, nessuna delle tre serate, nessuna delle sei serie |

Non e' un dettaglio di procedura ed e' scritto qui come un atto: **il fatto che
sia stato chiesto e' la ragione per cui si e' potuto fare.** Uno strumento che
si fosse procurato la sessione da solo avrebbe avuto lo stesso esito tecnico e
nessuna autorizzazione dietro.

---

## Il *prima*, catturato perche' altrimenti «si e' allargato?» non ha risposta

Il piano ordina semina → misura. E' stato aggiunto un passo che il piano non
chiede: **la stessa misura, prima della semina.** Senza, un `party_series = 1`
dopo la semina non distingue *«il cancello ha retto»* da *«e' sempre stato 1 e
nessuno ha guardato»*.

| Sonda, chiave anonima | Prima della semina | 36-05, subito dopo la migration |
|---|---|---|
| `formats` | **4** | 4 |
| `party_series` | **1** | 1 |
| `event_parties` | **3** | 3 |

**Fra l'applicazione della migration e oggi non si e' mosso nulla.** Lo stato
completo delle quattro tabelle e' stato catturato con la service key e hashato
prima di toccare qualsiasi cosa: `formats a2d3071c…` · `party_series 7e32d216…`
· `event_parties 452f5397…` · `events 96cda598…`.

Gli artefatti stanno in `docs/36-13-v3/`, **che e' ignorato da git** — verificato
con `git check-ignore`, non supposto. Contengono nomi di serie e di sede, e
questo repository e' pubblico.

---

## Task 1 — la serata che esiste per essere nascosta

Creata da `/admin/events/new` sul dev server locale, **non** dal sito
distribuito: questa fase sta su un branch e il sito in produzione non ha ancora
i tre campi, quindi il form vecchio avrebbe colpito `format_id NOT NULL` e
lasciato dietro una bozza orfana. Il `POST /admin/events/new 200` nel log del
server e' la prova che la scrittura e' passata dalla rotta vera.

**Riletto dal database con la service key, non dedotto da cio' che il form
mostrava:**

| | |
|---|---|
| Evento | `e07dfc20` — **`is_published: false`** |
| Serate | **una sola**: `70ac821c` |
| Format | `9d4cd203` — quello che **ha** serate pubblicate |
| Serie | `61327b21` — sotto quel format, **zero serate**, oggi invisibile ad `anon` |
| `number` | **NULL** |
| `venue_secret` | `false` · `venue_id` NULL · `venue_text` NULL |
| Data | lontanissima, fuori dal calendario di produzione |
| Titolo | un segnaposto che grida cosa e' |

### Perche' proprio quella serie

Il format ne ha due. L'altra ha gia' tre serate pubblicate ed e' **gia' visibile**
ad `anon`: filtrarci sopra non avrebbe provato niente, perche' il cancello era
gia' aperto. `61327b21` invece e' referenziata **solo** dalla bozza, ed e'
esattamente la forma del *Pitfall 3*: se la policy fosse una tautologia
travestita, quella riga comparirebbe.

E lo stesso format ha serate pubblicate, quindi **rifiuto e ammissione si
osservano allo stesso indirizzo**, senza pubblicare mai nulla.

### Perche' `number` e' vuoto, che contraddice un criterio del piano

Il criterio di accettazione chiede `number` non nullo. **Non e' stato
soddisfatto, deliberatamente, e la ragione vale piu' del criterio.**

`bump_series_watermark` (`20260810120000_formats_and_series.sql:590-604`) alza
`party_series.highest_assigned` con `GREATEST` e **non lo abbassa mai** — nemmeno
cancellando la serata, come il commento della funzione dichiara. La serie scelta
sta a `0`. Qualunque numero l'avrebbe portata a `N` **per sempre**, e la prima
serata vera di quella serie si sarebbe vista proporre `N+1`: **un salto nel
progressivo prodotto da un test**, su un contatore che `meta-gates.md` elenca fra
le tre guardie monotone e che `production-calendar.md` protegge con il gate
*numerazione senza salti*.

Una verifica che lascia dietro di se' un buco nella numerazione **ha rotto cio'
che verificava**. E non e' servito forzare la mano: il campo **non e'
obbligatorio** e il suo placeholder dice *«Leave empty for a night with no number
of its own»* — e' una forma prevista dal form, non un aggiramento, e la
produzione ne ha gia' una.

**Misurato invece che sperato:** le sei filigrane, confrontate prima e dopo →
**0 mosse**.

### Un fatto osservato di passaggio, che nessuno aveva ancora visto

Scelta la serie, il campo del numero **e' arrivato riempito con `1`** —
`highest_assigned` 0 piu' uno. 36-10 ha costruito quella proposta e ha scritto
che *«la proposta del numero non e' stata vista arrivare in un campo»*. Ora si',
e viene dalla filigrana, non da un conteggio.

---

## Task 2 — la chiave anonima, con la bozza in piedi

Tre richieste, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, nessuna sessione.

| Sonda | Righe | Verdetto |
|---|---|---|
| `formats` | **4** | invariato. **Zero righe con `listed = false`** — il ripiego ritirato non raggiunge nessuno |
| `party_series` | **1** su 6 | invariato. **La serie che solo la bozza referenzia non e' tornata** |
| `event_parties` | **3** | invariato. La serata seminata e' assente |

**E la parte che un conteggio non puo' dire.** Un totale fermo e' compatibile con
una coincidenza. Le tre righe sono state chieste **per chiave primaria**:

| Tabella | id chiesto | Risposta ad `anon` |
|---|---|---|
| `party_series` | `61327b21` | `[]` |
| `event_parties` | `70ac821c` | `[]` |
| `events` | `e07dfc20` | `[]` |

Non e' *«il totale non e' salito»*: e' **quella riga, chiesta per nome,
rifiutata**. `party_series_select_published` e `event_parties_select_published`
hanno risposto di no a qualcosa che esisteva — che e' la prima volta in questa
fase, perche' fino a oggi non c'era niente da rifiutare.

Nessun nome di serie, sede o indirizzo dalle risposte e' stato copiato qui
(T-36-13-02).

---

## Task 3 — le cinque osservazioni, con cio' che si e' visto

### 1 · La riga di chip, anonima contro chi vede le bozze — **identica**

L'osservazione che questa fase non aveva mai potuto fare, perche' nessun piano
aveva una sessione. **Stesso indirizzo, stesso codice, due lettori:**

| | anonimo | sessione che vede le bozze |
|---|---|---|
| chip, in ordine | `resonate · sunset · ramadub · motionlab` | `resonate · sunset · ramadub · motionlab` |
| il format ritirato | assente | assente |
| card elencate su `/events` | **2** | **3**, la bozza inclusa |

**La riga di chip non si muove di un elemento mentre la lista sotto cambia.**
D-36-16 osservato, non argomentato: il conteggio delle card diverge di uno e i
chip restano lo stesso insieme nello stesso ordine — che e' precisamente la
proprieta' che impedisce alla riga di essere un contatore.

### 2 · La stringa vuota, identica fra i format

| Indirizzo | Cosa rende |
|---|---|
| `?format=<il format con la bozza>` | `Nothing announced for {N}` |
| `?format=<secondo format>` | `Nothing announced for {N}` · `No past events for {N}` |
| `?format=<terzo format>` | `Nothing announced for {N}` · `No past events for {N}` |
| `?format=<quarto format>` | `Nothing announced for {N}` · `No past events for {N}` |

**Un solo template, il nome sostituito.** Il format che nasconde qualcosa dice
la stessa frase di quelli che non nascondono niente. Una frase che variasse per
format sarebbe un conteggio a un bit di risoluzione, ed e' l'errore che questa
superficie e' stata scritta per non fare.

Verificato anche il caso che rende la pagina non-oracolo:
`?format=<slug ritirato, che esiste davvero>` risponde **come l'indirizzo nudo** —
lista completa, `All` corrente, `200`, nessun redirect. Uno slug reale e uno
inventato sono indistinguibili.

### 3 · Il sorgente, non il rendering — **il passo che decide**

`curl` su sei indirizzi, con la bozza in piedi, e poi una ricerca dichiarata:
otto aghi — id della serata, id dell'evento, id della serie, titolo, slug, il
nome della serie, l'anno della data, e la frase del titolo — cercati **sull'intero
documento, payload RSC compreso**, che e' il posto dove una chiave JSON
sopravviverebbe alla rimozione dal DOM.

| | |
|---|---|
| Aghi cercati | 8 |
| Aghi trovati, su ognuno dei sei documenti | **0** |
| Cifre nel testo visibile della pagina filtrata vuota | **nessuna** |
| Cifre nel testo visibile delle pagine con card | due, e sono **il giorno del mese** di due date |
| `aria-label` / `title` in tutto il documento | **uno**, `"Filter events by format"` |
| `aria-label` / `title` che porti una cifra | **zero** |

**Ogni cifra sulla pagina e' spiegata.** Non ne resta nemmeno una senza nome — ed
e' questo il punto del passo, perche' un conteggio rivela senza mostrare e
nessuno sguardo al rendering l'avrebbe intercettato.

Lo strumento e' `docs/36-13-v3/probe-source.py` e non e' prosa: stampa cosa ha
cercato accanto a cosa ha trovato, cosi' che la prossima persona esegua la stessa
domanda invece di ricordarsela.

### 4 · Il link condiviso su un secondo dispositivo — **in attesa del proprietario**

**Non saltata, non passata: in attesa.** Il proprietario la esegue di persona,
in navigazione privata dal telefono sulla stessa rete, su
`…/events?format=resonate`, per verificare che il link condiviso apra gia' sul
filtro e per provare lo swipe con un pollice vero — che 36-12 ha lasciato aperto
dichiarandolo (*«that it does not wait is an argument from the shape, not an
observation»*).

Il server ha gia' servito richieste da quel dispositivo. **Cosa abbia visto lo
dice lui, e il posto per la sua osservazione e' questo:**

> _(osservazione del proprietario, dal telefono, in attesa)_

Il dev server e' stato lasciato in piedi apposta.

### 5 · La meta' dell'ammissione — osservata **senza pubblicare niente**

Sullo **stesso** format della bozza, con la bozza in piedi, letto anonimo:

| Indirizzo | Card elencate |
|---|---|
| `?format=<il format della bozza>` | **2**, entrambe pubblicate |
| `?format=<il format della bozza>&tab=past` | **2**, entrambe pubblicate |
| lo stesso indirizzo, con la sessione che vede le bozze | **3** |

**Un rifiuto che non si e' mai visto ammettere qualcosa non e' stato provato.**
Qui lo stesso indirizzo, nella stessa richiesta, ammette due serate pubblicate e
rifiuta quella che non lo e'. E lo fa senza che nulla di non annunciato sia mai
comparso sul sito: la bozza non e' stata pubblicata nemmeno per un istante, che
e' la versione di questo piano dell'ultimo passo di V3.

---

## Una cosa che 36-12 aveva dichiarato non osservabile, e che ora lo e'

`36-12-SUMMARY.md` chiude con un debito preciso: il ramo che rende il **nome
della serie** al posto del nome del format e' *«reached and not observable»*,
perche' l'unica serata non segreta in produzione porta una serie il cui nome
pubblico e' **la stessa stringa** del nome del suo format. Distinguere il ramo
dal suo ripiego, dice, richiede una serie con un nome diverso.

La serata seminata ha entrambe le proprieta' senza che siano state cercate:
`venue_secret = false`, e una serie il cui nome pubblico **differisce** da quello
del suo format. Sulla superficie che la vede, la card ha reso **il nome della
serie**, distinguibile dalle altre due card che rendono quello del format.

**Il ramo e' provato distinto dal suo ripiego.** Va detto con il suo limite: e'
stato osservato su una superficie che vede le bozze, non su una pubblica, perche'
osservarlo pubblicamente avrebbe richiesto di pubblicare — cioe' la sola cosa che
questo piano non poteva fare. Vale come prova che il ramo produce una stringa
diversa; **non** come prova di cosa vedrebbe un visitatore.

---

## La rimozione, e il catalogo riletto riga per riga

L'evento e' stato cancellato **dalla stessa superficie che l'ha creato**.

| Verifica | Esito |
|---|---|
| Eventi non pubblicati rimasti | `[]` |
| `e07dfc20`, chiesto **con la service key** — il lettore che vede tutto | `[]` |
| `70ac821c`, idem | `[]` |
| Conteggi anonimi | `4 / 1 / 3` — tornati alla linea di partenza |

E il confronto che il proprietario ha chiesto per nome, riga per riga contro gli
hash presi prima:

| Tabella | hash prima | hash dopo | righe | aggiunte | rimosse | **cambiate** |
|---|---|---|---|---|---|---|
| `formats` | `a2d3071c…` | `a2d3071c…` | 5 → 5 | 0 | 0 | **0** |
| `party_series` | `7e32d216…` | `7e32d216…` | 6 → 6 | 0 | 0 | **0** |
| `event_parties` | `452f5397…` | `452f5397…` | 3 → 3 | 0 | 0 | **0** |
| `events` | `96cda598…` | `96cda598…` | 2 → 2 | 0 | 0 | **0** |

**Byte-identiche, e per chiave primaria: nessuna riga aggiunta, rimossa o
cambiata.** Le tre serate, le sei serie, i cinque format e i due eventi sono
esattamente come erano. La filigrana non si e' mossa, che era l'unico modo in cui
una cancellazione poteva lasciare un segno.

---

## Due riscontri, registrati e **non** riparati

L'invariante di questo piano e' esplicita: un difetto riparato in silenzio
durante la propria verifica non e' stato verificato.

**D9 — il cron della rivelazione raggiunge le bozze.** (`57ce735`)
`src/app/api/cron/venue-reveal/route.ts:25-29` filtra su `venue_secret` e
`venue_reveal_email_sent`, **mai su `is_published`**. E a `:108-115`, quando per
una serata non esiste alcun destinatario, alza comunque
`venue_reveal_email_sent = true`. Una bozza rimasta non pubblicata fin **dentro**
la propria finestra di rivelazione si porta la guardia monotona gia' alzata:
pubblicata dopo e venduta, **la mail dell'indirizzo non partira' mai**, senza un
errore e senza che nessuno lo sappia — questo progetto non ha error tracking. E'
dominio della fase 37.

**Ha cambiato cosa era sicuro seminare**, ed e' la ragione per cui la serata
porta `venue_secret = false` e una data lontanissima: nessuno dei due predicati
del cron puo' selezionarla. La misura di FMT-06 non doveva produrre un effetto in
un dominio che non stava misurando.

**D10 — la e rovesciata sta nel `<title>` del sito.** (`37b739a`)
`src/app/layout.tsx:15,19,25,32`. Ogni piano di questa fase porta nel proprio
riepilogo *«la e rovesciata → 0»* misurata sui file che tocca; l'unico posto in
cui quel carattere **viene spedito davvero** non e' fra i file di nessuno. Scritto
come domanda al proprietario del brand, non come verdetto.

---

## Cosa questo piano NON prova

Scritto invece che aggirato, e con la stessa cura del resto.

1. **Non prova che il cancello rifiuti un *ruolo*.** `anon` e' un lettore vero e
   le sue risposte qui sono misure vere. `organizer` e `staff` **non esistono in
   produzione**, e nessuno strumento di questo repository puo' autenticarsi come
   uno: e' il debito delle **32 voci `human_needed`** fra `43-VERIFICATION.md`,
   `35-VERIFICATION.md` e `34-VERIFICATION.md`. **Questa fase non lo consuma e
   non lo peggiora — e costruisce superfici pubbliche sopra un modello dei
   permessi che nessuno ha ancora visto rifiutare qualcuno.**
   La sessione coniata qui non e' un'eccezione a questo: era il **proprietario**,
   cioe' l'unico ruolo che gia' esisteva.
2. **Non prova l'assenza di un canale in generale.** Prova che **otto aghi
   dichiarati** non compaiono in **sei documenti** letti in un momento preciso, e
   che tre righe chieste per chiave primaria sono state rifiutate. `nessun
   meccanismo qui puo' asserire l'assenza di un canale` resta la frase corretta
   (`36-VALIDATION.md`); questa e' la cosa piu' vicina a una prova che esista, ed
   e' stata **fatta**, non evocata.
3. **Non ha guardato la produzione distribuita.** Tutte le letture di superficie
   sono contro il dev server, che gira il codice di questa fase sul database di
   produzione. Il sito distribuito non ha ancora queste superfici.
4. **Non ha osservato il ramo del nome di serie su una superficie pubblica**, per
   la ragione detta sopra.
5. **Non ha eseguito `npm run build`**, e non proverebbe nulla: questo piano non
   cambia una riga di TypeScript.
6. **Non c'e' un test runner per il prodotto.** Niente qui e' verificato perche'
   i test passano.

---

## Deviations from Plan

### Departures dal testo del piano, deliberate e dichiarate

1. **`number` NULL contro un criterio di accettazione che lo vuole non nullo.**
   Motivata sopra per esteso, approvata dal proprietario, e misurata: le sei
   filigrane sono ferme.
2. **La misura di partenza e' stata presa prima della semina**, che il piano non
   chiede. Senza, la cifra dopo non e' un confronto.
3. **Il Task 1 non ha un commit.** Non ha modificato alcun file tracciato: la
   scrittura e' stata una riga di database, poi rimossa. Un commit li' sarebbe
   stato vuoto. Stessa forma della deviazione 2 di `36-05-SUMMARY.md`.
4. **L'osservazione 4 e' registrata come *in attesa*, non come saltata.** Il
   proprietario la esegue di persona e il posto per la sua frase e' lasciato
   aperto nel testo.
5. **Il Task 3 e' un checkpoint del piano, ma la sua parte automatizzabile e'
   stata eseguita invece di essere consegnata.** Le osservazioni 1, 2, 3 e 5
   sono letture di sorgente e di database: consegnarle a una persona avrebbe
   sostituito una misura con uno sguardo, che e' esattamente cio' contro cui il
   punto 3 di V3 mette in guardia. Solo la 4, che richiede un secondo
   dispositivo e un pollice, e' rimasta al proprietario.

### Auto-fixed issues

**Nessuna.** Le regole 1–3 non sono scattate, e non dovevano: questo piano
misura e non ripara. I due difetti trovati sono stati **registrati** (D9, D10) e
lasciati intatti.

### Non fatto, apposta

- **Nessun `FMT-*` spuntato in `REQUIREMENTS.md`** — D-36-19. Le spunte le mette
  la verifica di fase, una volta, con l'evidenza accanto.
- **Nessuna policy sfiorata**, ne' su `venues` (D-36-18, fase 37) ne' altrove.
  Nessuna migration inviata.
- **I diciotto scarti della migration history non sono stati toccati.**
- **Nessun pacchetto installato** (T-36-13-SC resta `accept` a costo zero).

## Issues Encountered

**Il form non si idratava, e non era un difetto dell'applicazione.** Per una
mezz'ora nessun controllo del form ha risposto: nessun fiber React su alcun nodo,
il click su un pulsante senza effetto, e la stessa cosa su `/events`. Nessun
errore in console, tutti e 27 gli script `200`.

La causa, misurata: **`document.visibilityState === "hidden"`**. Una scheda
nascosta viene strozzata da Chrome, lo scheduler di React non riceve una fetta e
l'idratazione non avviene mai. `Page.bringToFront` e la pagina si e' idratata in
quattro secondi.

E' registrato qui perche' la conclusione sbagliata era a portata di mano — *«il
form dell'admin non si idrata»* e' un difetto plausibile, sarebbe finito in un
registro, e qualcuno avrebbe passato un pomeriggio a cercarlo. La ragione sta
anche nel commento del driver in `docs/36-13-v3/cdp.mjs`.

**Chrome 136+ rifiuta `--remote-debugging-port` sul profilo di default.** E' la
difesa contro il furto dei cookie. La strada che l'avrebbe aggirata — copiare il
profilo del proprietario — **non e' stata presa**: e' un'estrazione di
credenziali, e non era autorizzata. E' anche il motivo per cui la domanda sulla
sessione e' stata posta.

## Known Stubs

Nessuno. Questo piano non aggiunge codice di prodotto.

## Threat Flags

| Minaccia | Cosa l'ha chiusa |
|---|---|
| T-36-13-01 · la bozza che diventa visibile | Non e' mai stata pubblicata, per nemmeno un istante; titolo che grida cosa e'; nessuna sede, nessuna data reale, nessuna line-up; rimossa e la rimozione riletta con la service key |
| T-36-13-02 · l'output delle sonde in un file tracciato | Conteggi, verdetti e prefissi di uuid. **Nessun nome di serie, sede o indirizzo** e' entrato in questo file; gli artefatti stanno in `docs/`, ignorato e verificato tale |
| T-36-13-03 · un conteggio sopravvissuto nel sorgente | Otto aghi su sei documenti, payload compreso → 0. Ogni cifra del testo visibile spiegata per nome. Un solo `aria-label`, senza cifre |
| T-36-13-04 · una procedura dichiarata passata senza essere stata eseguita | Ogni osservazione porta cio' che si e' visto; la 4 e' **in attesa** e detta tale |
| T-36-13-05 · sondare dalla service client invece che dal percorso vero | La serata nasce da `POST /admin/events/new` (nel log del server); le sonde usano la chiave anonima, che e' quella che ha un visitatore. La service key ha fatto solo letture e la cancellazione finale |
| T-36-13-SC · installazioni di pacchetti | Nessun pacchetto installato |

**Una minaccia non nel registro, comparsa in esecuzione e chiusa:** la sessione
coniata e' un credenziale a tempo. E' stata **revocata globalmente** e la revoca
e' stata verificata (`400`, il token non risolve piu' ad alcun utente). Il
profilo del browser che la conteneva vive fuori dal repository ed e' stato
chiuso.

## Self-Check: PASSED

- `.planning/phases/36-formats-series-numbering/36-13-SUMMARY.md` — presente
- `.planning/phases/36-formats-series-numbering/deferred-items.md` — presente, contiene D9 e D10
- `57ce735`, `37b739a` — presenti in `git log`
- Nessun file tracciato cancellato dai commit di questo piano
- `docs/36-13-v3/` confermato ignorato da git prima di scriverci dentro
- Controllo di segretezza su questo file: nessun nome di sede, nessuna serie
  nominata, nessuna data non annunciata, nessun nome di persona, nessun token,
  nessun host, nessun uuid intero — solo prefissi
- Le quattro tabelle di produzione rilette e confrontate riga per riga: **0
  differenze**

---
*Phase: 36-formats-series-numbering*
*V3 eseguita e datata: **2026-08-10**. Seminata alle 15:22 UTC, misurata, rimossa,
e il catalogo riletto byte per byte alle 16:31 UTC. Una sola osservazione resta
al proprietario, ed e' segnata in attesa invece che passata.*
