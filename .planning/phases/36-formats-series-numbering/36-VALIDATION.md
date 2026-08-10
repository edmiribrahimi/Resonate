---
phase: 36
slug: formats-series-numbering
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-08-10
---

# Phase 36 — Validation Strategy

> Contratto di validazione della fase. Distillato da `36-RESEARCH.md`
> § *Validation Architecture*, che porta le misure.
>
> **`nyquist_compliant: false` e' deliberato, non un lavoro da finire.** Cinque
> requisiti su sei non hanno alcuna prova automatica possibile in questo
> repository, e chiamarli coperti sarebbe una bugia che poi qualcuno userebbe
> per chiudere la fase. Il precedente esiste: `31-VALIDATION.md` fa lo stesso,
> per la stessa ragione.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | **NESSUNO** — `package.json` non ha script `test`; non esiste alcun `*.test.*` o `*.spec.*`. **E non se ne introduce uno in questa fase.** |
| **Config file** | nessuno |
| **Quick run command** | `npm run build` — che **e'** il typecheck (`next build` esegue il controllo dei tipi) |
| **Full suite command** | non esiste |
| **Estimated runtime** | build ~60–120s · `baseline:container` alcuni minuti (avvia `postgres:17.6`) |

**Nessun criterio di accettazione di questa fase puo' essere «i test passano».**
(`CLAUDE.md`, Environment Guardrail 1.)

### Cosa gli strumenti asseriscono davvero

| Comando | Asserisce | **Non** asserisce |
|---|---|---|
| `npm run build` | I tipi compilano; l'unione `Record<CapabilityKey, Binding>` e' totale; ogni rotta staff statica ha un binding | **Nessun nome di colonna.** Nessun client Supabase e' parametrizzato con `Database`: `format_id` scritto `fomat_id` compila |
| `npm run verify:capabilities` | Chiavi `CAP`, righe di `private.capabilities`, stringhe nei corpi delle policy e siti di chiamata sono lo stesso insieme | Che una chiave sia legata alla rotta **giusta**; che una policy sia **corretta** |
| `npm run verify:routes` | Ogni `revalidatePath` statico nomina un indirizzo dichiarato; ogni `page.tsx` sotto `(admin)` ha un pattern nella mappa | Le rotte non visibili staticamente |
| `npm run baseline:container` + `baseline:compare` | La matrice lettura/scrittura per persona, prima e dopo, contro lo schema costruito da tutte le migration | Che un movimento sia **voluto**. Il comparatore non distingue una policy da un vincolo |
| `npm run verify:persona` | Coerenza della persona | Nulla sul prodotto |

---

## Sampling Rate

- **A ogni commit di task:** `npm run build`
- **Al commit che tocca la mappa o una rotta:** `npm run build && npm run verify:routes`
- **Al commit che applica la migration:** `npm run verify:capabilities` + un punto
  `baseline:container` nuovo
- **Prima della chiusura di fase:** `baseline:compare` fra `pre-36` e `post-36`,
  **con una frase per ogni cella che si muove**, poi le cinque procedure manuali
- **Latenza massima di feedback:** un commit

---

## Per-Task Verification Map

> Si compila quando i PLAN.md esistono. La riga che conta gia' adesso:

| Requirement | Test Type | Automated Command | File Exists | Status |
|---|---|---|---|---|
| FMT-03 (terna duplicata) | constraint probe | `npm run baseline:container` | ❌ W0 | ⬜ pending |
| FMT-03 bis (format ≠ format della serie) | constraint probe | `npm run baseline:container` | ❌ W0 | ⬜ pending |
| FMT-01 · 02 · 04 · 05 · 06 | **manual only** | — | — | ⬜ pending |
| — (nessuna policy si e' mossa) | baseline diff | `npm run baseline:compare` | ✓ esiste, va esteso | ⬜ pending |
| — (mappa rotta↔capability intatta) | build gate | `npm run build && npm run verify:routes` | ✓ esiste | ⬜ pending |

---

## Wave 0 Requirements

Nessuna installazione di framework. Quello che serve e' **estendere gli
strumenti che gia' esistono**, perche' altrimenti smettono di misurare senza
dirlo:

- [ ] `scripts/rls-baseline.mjs:1226-1229` — il payload della sonda di scrittura
      su `event_parties` fornisce oggi solo `event_id, title, time`. Con una
      colonna `NOT NULL` in piu' **fallisce `23502` per ogni persona**, e
      `baseline:compare` etichetterebbe come *movimento* una riga che ha
      semplicemente smesso di misurare. **E' il fallimento silenzioso piu'
      probabile dell'intera fase.**
- [ ] `scripts/rls-baseline.mjs` `PROBE_REFERENCE_TABLES` — aggiungere le due
      tabelle nuove
- [ ] `scripts/container/seed.mjs` `SEED_ORDER` e `REFERENCEABLE` — le due
      tabelle **prima** di `event_parties`
- [ ] Due celle nuove nella matrice di lettura, una per tabella — senza, le loro
      policy non sono misurate da niente
- [ ] Le due sonde di vincolo (FMT-03 e la chiave composta)
- [ ] **Un punto di baseline `pre-36` catturato PRIMA che la migration parta.**
      Un baseline preso dopo il cambiamento non e' un baseline
      (`rls-baseline.mjs:6-11`). Questa casella e' `[BLOCKING]`.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|---|---|---|---|
| Un evento tiene due serate di format diversi | FMT-01 | Il rendering di una card aggregata non e' asseribile da qui | **V1** |
| Il numero e' memorizzato e non si ricalcola | FMT-02 | Richiede una cancellazione e l'osservazione di cio' che **non** e' cambiato | **V2** |
| Nessun conteggio, etichetta o codice rivela una serata non annunciata | FMT-06 | **Non c'e' alternativa.** Nessun meccanismo qui puo' asserire l'assenza di un canale | **V3** |
| Il filtro sopravvive alla navigazione e si condivide | FMT-04 | Navigazione reale, su due dispositivi | **V4** |
| Colore ed etichetta cambiano senza deploy; un ritiro non riscrive l'archivio | FMT-05 | «Senza deploy» si prova solo non facendo il deploy | **V5** |

### V1 — la serata doppia
Con un account che ha `catalogue.manage`: creare un evento con due serate di
format diversi, salvare, aprire `/events`. **Una sola card, due marker**,
nell'ordine di `sort_order`. Aprire il dettaglio: ogni serata mostra il proprio.

### V2 — il numero non si ricalcola
Assegnare *n* e *n+1* a due serate della stessa serie. **Cancellare quella con
*n*.** L'altra porta ancora *n+1* e non e' diventata *n*. Aprire il form di una
serata nuova nella stessa serie: la proposta e' **almeno *n+2*** — la
cancellazione non ha abbassato il livello.

### V3 — FMT-06, ed e' la procedura che decide la fase
Con un account `catalogue.manage`: seminare una serata su un evento **NON
pubblicato**, sotto un format scelto. **Entrambi gli eventi di produzione sono
pubblicati oggi: questa serata va creata apposta, o la prova non e' stata
fatta.** Poi, **in una finestra privata, senza sessione**:

1. `/events` — la riga di chip e' **identica** a quella che vede uno staff?
2. `/events?format=<quel format>` — la lista e' vuota, e la stringa vuota e' **la
   stessa** che compare per ogni altro format?
3. **Il sorgente reso**, non il rendering: `view-source` o `curl`. Nessun
   conteggio, nessun `aria-label`, nessun `title`, nessuna chiave JSON che nomini
   la serata seminata?
4. Il link condiviso, aperto da un dispositivo diverso, da' lo stesso risultato?
5. **La chiave anonima direttamente**, che e' il punto in cui la UI smette di
   contare: quante righe restituisce il catalogo delle serie? Solo quelle che una
   serata pubblicata referenzia?

Poi **pubblicare l'evento e ripetere il punto 2: ora deve comparire.** Un rifiuto
che non si e' mai visto diventare un'ammissione non e' stato provato.

### V4 — il filtro nell'indirizzo
Scegliere un format, navigare a un evento, tornare indietro: il filtro c'e'
ancora? Copiare l'indirizzo, aprirlo in una finestra nuova: stesso filtro?
Scegliere `Past` **e poi** un format: il tab e' ancora `Past`? Digitare
`?format=` con un valore inesistente: la lista e' **completa**, `All` e'
corrente — **non** una lista vuota, **non** un errore, **non** un redirect.

### V5 — dati e non codice
Cambiare il colore di un format dal catalogo e ricaricare `/events` **senza
deploy**: il pallino e' cambiato. Ritirare un format: il chip sparisce, la voce
sparisce dal selettore per un'assegnazione nuova, **e una serata d'archivio che
lo portava continua a mostrarlo**.

---

## Cosa questa fase NON puo' validare

Scritto invece che aggirato.

1. **Che il gate rifiuti qualcuno.** Nessuno strumento di questo repository puo'
   autenticarsi come un ruolo. E' il debito di **32 voci `human_needed`** fra
   `43-VERIFICATION.md`, `35-VERIFICATION.md` e `34-VERIFICATION.md`. Questa fase
   **non lo consuma e non lo peggiora** — e costruisce superfici pubbliche sopra
   un modello dei permessi che nessuno ha ancora visto rifiutare qualcuno.
2. **Che un nome di colonna nuovo sia scritto giusto ovunque.** Nessun client e'
   parametrizzato con `Database`. Un `select` sbagliato e' un errore a runtime,
   non di build.
3. **Che nessuna superficie pubblica porti un conteggio.** Non esiste un
   meccanismo che lo asserisca. La cosa piu' vicina a una prova e' la lettura del
   **sorgente reso** al punto 3 di V3 — e va fatta, non evocata.

---

## Validation Sign-Off

- [ ] Wave 0 completa — in particolare il payload della sonda di scrittura e il
      punto `pre-36`
- [ ] `baseline:compare` verde, **o** una frase scritta per ogni cella mossa
- [ ] V1 … V5 eseguite e datate, ognuna con cio' che si e' osservato
- [x] Nessuna modalita' watch — non esiste un runner
- [ ] `nyquist_compliant` resta **`false`**: e' la descrizione corretta di una
      fase in cui cinque requisiti su sei si provano solo a mano

**Approval:** pending
