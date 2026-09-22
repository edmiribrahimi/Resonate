---
phase: 51-via-le-superfici-da-socio-e-la-porta
plan: 01
subsystem: checkin-offline
tags: [manual-procedure, offline, door, guest-list, baseline, lab, MEM-04]

requires:
  - phase: 50-via-le-iscrizioni
    provides: "`P-50-8`, la porta percorsa a radio spenta il 2026-09-21 sullo stesso artefatto, e la forma di una procedura manuale con la sua rilettura dal catalogo"
provides:
  - "`51-PROCEDURES.md`: `P-51-1`, nove passi, scritta PRIMA di essere percorsa"
  - "`51-ESITI.md`: la corsa «prima» di MEM-04, datata 2026-09-22, non piu' recuperabile in seguito"
  - "tre baseline misurate sul codice di oggi: l'avviso della lista acceso e il 403 che lo rende vero, il check-in per nome senza ramo offline, la testata che scorre via"
  - "la precondizione di MEM-03: UNA voce `membership` lasciata in coda su un telefono vero, che dopo l'aggiornamento non sarebbe piu' fabbricabile"
  - "un invitato di guest list senza email sul laboratorio, con la sua chiave di cancellazione"
affects: [51-05, 51-06, 51-10, 51-11, 51-14]

tech-stack:
  added: []
  patterns:
    - "una procedura manuale si scrive con la colonna degli esiti VUOTA, e gli esiti vivono in un secondo file"
    - "la prova della radio spenta e' la barra di stato nella schermata, mai un avviso che la stessa fase sta riscrivendo"
    - "una precondizione seminata si registra con l'id catturato alla creazione: si cancella per chiave, mai per corrispondenza"

key-files:
  created:
    - .planning/phases/51-via-le-superfici-da-socio-e-la-porta/51-PROCEDURES.md
    - .planning/phases/51-via-le-superfici-da-socio-e-la-porta/51-ESITI.md
  modified: []

key-decisions:
  - "D-51-16 applicata: percorsi davvero i passi 1, 2, 5, 6 e la precondizione del passo 9; citati da P-50-8 i passi 3, 4, 7 e la riga unica del passo 8, perche' il laboratorio serve lo stesso identico artefatto"
  - "Il 403 su /api/membership/list con un account di staff assegnato per serata NON si corregge: e' un difetto pre-esistente che la fase cancella insieme al percorso soci"
  - "La precondizione del passo 9 e' stata prodotta con l'account master, non con quello di staff, perche' senza registro scaricato lo scanner non riconosce alcun codice socio"
  - "Il difetto di viewport visto su /login e sulla porta e' rinviato alla fase 52: non e' del percorso offline e non lo introduce questa fase"

patterns-established:
  - "Un passo la cui meta' non e' applicabile al «prima» si rilegge comunque dal catalogo, e la lettura si scrive: una casella vuota si legge come dimenticanza"
  - "Quando una corsa lascia uno stato sul dispositivo, l'istruzione di non toccarlo si scrive nel riquadro della corsa successiva, non in nota"

requirements-completed: [MEM-04]

duration: ~70min
completed: 2026-09-22
---

# Phase 51 Plan 01: La porta a radio spenta, prima Summary

**La linea di partenza di MEM-04 esiste e porta una data: il 2026-09-22 il proprietario ha percorso `P-51-1` su un telefono vero in modalita' aereo, e le tre cose che ha visto — l'avviso dei soci acceso perche' un 403 gli da' ragione, il check-in per nome che a radio spenta non esiste affatto, la testata che scorre via — sono il «prima» che dopo lo spiegamento non sarebbe piu' stato recuperabile.**

## Performance

- **Duration:** ~70 min (dalla scrittura della procedura alla trascrizione)
- **Started:** 2026-09-22T13:20Z circa
- **Completed:** 2026-09-22T14:38Z
- **Tasks:** 3 su 3 (il terzo e' un checkpoint umano, percorso dal proprietario)
- **Files modified:** 2, entrambi nuovi, entrambi sotto `.planning/`

## Cosa e' stato fatto

| Task | Cosa | Commit |
|---|---|---|
| 1 | `51-PROCEDURES.md` — `P-51-1`, nove passi, `PRE-LAB`, il riquadro della modalita' aereo con **prova propria**, due `Result: pending` | `da4c934` |
| 2 | `PRE-LAB` accertata: laboratorio `ACTIVE_HEALTHY` alle 13:28:11Z, `lab.resonatemotion.com` serve `03e443e` del 2026-09-21, nessun dispiegamento del ramo `lab` dopo | `811ea1d` |
| 3 | La corsa «prima», percorsa dal proprietario e **trascritta passo per passo** | `edcb891` |

## I tre fatti che i piani a valle devono conoscere

Non sono contorno: due di essi sono **input** di piani gia' scritti, e il terzo e' l'unica cosa che questa corsa poteva lasciare e che nessun'altra potra' ricostruire.

### 1. Il 403 sul registro dei soci — baseline, non difetto da riparare

Con **l'account di staff del banco assegnato alla serata** (`door.operate` **per assegnazione**, che e' il ruolo che D-51-12 prescrive per la prova):

| Chiamata | staff assegnato | master (per ruolo) |
|---|---|---|
| `GET /api/membership/list` | **403 Forbidden** | 200, 8 soci |
| `GET /api/tickets/attendance?partyId=…` | 200 | 200 |

`requireDoorOperator()` **senza `partyId`** risolve le sole capability **del ruolo**. Conseguenza: **su un telefono di staff assegnato per serata il registro dei soci non si scarica mai** — e l'avviso *«The member list on this device was NOT refreshed…»* resta acceso **anche col badge «Online» e la lista appena scaricata**, perche' dice il vero.

**Per 51-10 / 51-11:** la fase **cancella** quel percorso, quindi il 403 sparisce per rimozione, non per correzione. **Per 51-14:** se dopo la fase l'avviso e' spento, la prova non e' che il permesso sia stato aggiustato — e' che il registro dei soci non si scarica piu' per nessuno. Scritto perche' non lo si legga al contrario.

### 2. Il telefono porta UNA voce `membership` in coda, e la porta NON va riaperta su di esso

Prodotta alle **2026-09-22T14:32Z** (16:32 locali) con l'account master, in modalita' aereo vera: schermo verde, **«Member · Offline»**, testata **«Pending (1)»** — e **la coda non e' stata drenata**.

`sw.ts` e `sync-manager.ts`, a `03e443e`, **non usano Background Sync**: la coda si drena solo con la pagina aperta. Quindi la rete puo' tornare senza rischio, ma **una sola riapertura della porta su quel telefono, sul codice vecchio, manda la voce al server** e la precondizione e' persa — e dopo l'aggiornamento non e' piu' fabbricabile senza reinstallare la versione vecchia. E' la perdita di `DEF-42-04` a un tocco di distanza.

**Input diretto di 51-14** (la corsa «dopo», passo 9, MEM-03). L'istruzione e' scritta **dentro il riquadro della corsa «dopo»** in `51-ESITI.md`, dove verra' letta prima di toccare il telefono.

### 3. L'invitato di guest list senza email esiste, e si cancella per chiave

Seminato alle **2026-09-22T14:00:59Z**, perche' sul laboratorio **non ce n'era nessuno** e senza di lui il passo 5 non ha soggetto.

| | |
|---|---|
| Id | `63ebd88f-d2a7-4c65-81bf-afca5d52c350` |
| Nome | «Prova SenzaEmail» — fittizio |
| `email` | NULL |
| Stato riletto il 2026-09-22T14:35:11Z | **`invited`**, `checked_in_at` **NULL** |

**Per 51-14:** il passo 5 della corsa «dopo» ha gia' il suo soggetto, e a corsa finita la riga **si cancella per quell'id**, mai per corrispondenza sul nome (`ai-engineering.md`).

## Le tre baseline, in una riga ciascuna

| Passo | Cosa fa il codice di **oggi** |
|---|---|
| 2 | l'avviso dei soci e' **acceso** anche online con lista fresca — e ha ragione (il 403 sopra) |
| 5 | il check-in per nome a radio spenta **fallisce**: schermo rosso *«Connection error»*, **nessuna voce in coda**. Non ha ramo offline e non l'ha mai avuto (`ScannerClient.tsx` a `03e443e:2480`) |
| 6 | scorrendo la lista, titolo, badge e pulsante **«QR Scan» escono subito dalla vista** |

La piu' pesante e' la 5: **il percorso che D-51-10 tiene in vita, a radio spenta, oggi non esiste**. La corsa «dopo» non misurera' un miglioramento — misurera' la comparsa di un percorso.

## Deviations from Plan

### Deviazioni con la loro regola

**1. [Rule 3 — sbloccante] Il passo 5 non aveva soggetto: invitato di guest list senza email seminato prima della corsa**
- **Trovato durante:** il task 3, preparando il checkpoint
- **Problema:** `PRE-LAB` pretende «almeno un invitato di guest list **senza email**» e il laboratorio ne aveva **zero**. Senza, il passo che il «prima» deve davvero percorrere non e' percorribile.
- **Fatto:** una riga inserita in `guest_list_entries` sulla serata gratuita del laboratorio, con **l'id catturato alla creazione** per poterla cancellare per chiave.
- **Non e' una scrittura in produzione:** e' il laboratorio, ed e' la precondizione dichiarata dalla procedura.

**2. [Rule 3 — sbloccante] La precondizione del passo 9 e' stata prodotta con l'account master, non con quello di staff**
- **Trovato durante:** il passo 7 della corsa, alle 16:17 locali
- **Problema:** col telefono sull'account di staff, il codice socio dava **schermo rosso** e **nessuna voce in coda** — conseguenza del 403: il registro dei soci non era mai stato scaricato su quel dispositivo.
- **Fatto:** riaperta la porta sulla **stessa serata e stesso telefono** con **l'account master**, che scarica il registro, e prodotta li' la voce in coda. Dichiarato nel documento come struttura a due account, con la ragione — non come dettaglio.
- **Perche' non e' un aggiramento della prova:** il passo 9 misura **la coda**, non il permesso; e il permesso che manca e' proprio cio' che la fase rimuove.

**3. [fuori perimetro — differito] Il ritaglio della pagina sotto la tastiera**
- **Trovato durante:** i passi 1 e 2 (16:02 sul `/login`, 16:05 nella ricerca della porta)
- **Problema:** con la tastiera aperta la pagina **si ritaglia** invece di ridimensionarsi; la riga dell'invitato finisce mezza coperta.
- **NON corretto:** e' un difetto di viewport, pre-esistente, fuori dal perimetro di questo piano e di questa fase. Registrato come todo `door-and-login-viewport-crops-under-keyboard.md`, **fase 52**.

**4. [nessuna deviazione] Il passo 8 e' stato riletto anche dove non era applicabile**
- La meta' guest list del passo 8 non poteva risultare `checked_in`, perche' il check-in del passo 5 e' fallito. **Si e' riletto lo stesso** e la lettura e' scritta: il catalogo **conferma lo schermo rosso** invece di contraddirlo, e una casella lasciata vuota si sarebbe letta come una dimenticanza.

## Cio' che questo piano NON ha fatto, e non doveva

- **Nessun file di prodotto toccato.** `src/` non ha una riga diversa: e' la condizione che rende «prima» il «prima».
- **Nessun `git push`, nessun dispiegamento del ramo `lab`.** Il vincolo d'ordine dichiarato in testa a `51-ESITI.md` e' stato rispettato: il primo dispiegamento nuovo avrebbe sostituito il codice contro cui la corsa e' stata misurata.
- **Nessuna scrittura in produzione.** Tutte le letture di catalogo con `read_only`, tutte le scritture sul **laboratorio**, col rifiuto del ref di produzione eseguito prima della chiamata.
- **`STATE.md` e `ROADMAP.md` non aggiornati**, per istruzione dell'orchestratore: l'onda 1 non e' chiusa.

## Gate umani

Il task 3 e' un `checkpoint:human-verify` **bloccante**, e lo e' stato davvero: nessun comando poteva percorrerlo al posto di una persona, perche' l'esito primario e' **su uno schermo** e la prova della radio spenta e' **la barra di stato**. Il proprietario ha percorso fra le 16:02 e le 16:32 locali e ha riportato passo per passo; qui e' stato **trascritto**, non dedotto.

## Threat Flags

Nessuna nuova superficie di sicurezza: questo piano non ha toccato codice. Le tre mitigazioni del registro del piano sono state applicate percorrendo —

| Threat | Esito |
|---|---|
| `T-51-01` (esito scritto senza essere osservato) | il task 1 ha asserito `Result: pending` ×2 **prima** della corsa; la colonna e' stata riempita **dopo**, e il passo 8 dichiara esplicitamente dove la lettura di catalogo **conferma** invece di sostituire |
| `T-51-03` (`.planning/` e' pubblico) | zero ref di laboratorio, zero chiavi, zero nomi di persona nei due file. **Anche il codice della tessera socio e' stato tenuto fuori**: e' una credenziale che apre una porta |
| `T-51-04` («radio spenta» dichiarata e non vera) | prova **propria**: icona dell'aeroplano e nessun indicatore di rete, alle 16:08 e alle 16:32. L'avviso che `P-50-8` usava come prova interna **non e' stato usato** — e la corsa ha poi scoperto che quell'avviso non provava la radio spenta nemmeno allora, visto che resta acceso anche online |

## Self-Check: PASSED

- `51-PROCEDURES.md` — presente, 9 righe di passo, 2 `Result: pending` alla scrittura
- `51-ESITI.md` — presente, `ACTIVE_HEALTHY`, commit servito dichiarato, corsa «prima» `Result: PERCORSA`
- Verify del task 3, letterale: **PASS**
- Il grep di fuga del piano (ref del laboratorio, chiave di servizio, token della
  Management API) su `51-ESITI.md` → **0**; ref del laboratorio per intero → **0**;
  codice della tessera socio → **0**; nomi di persona → **0**. *(Il needle non si
  ricopia qui: contiene il prefisso del ref, ed e' esattamente cio' che il grep
  cerca di tenere fuori — vedi il debito registrato sotto.)*

> **Debito notato, non corretto qui.** `51-01-PLAN.md` porta quel needle in chiaro
> nei propri criteri di accettazione, ed e' **gia' pubblicato**: toglierlo da HEAD
> non lo ritira dai fork ne' dalla history (Guardrail 5). Si segnala perche' il
> prossimo piano che copia quel criterio non lo ricopi.
- Commit `da4c934`, `811ea1d`, `edcb891` — tutti presenti in `git log`
