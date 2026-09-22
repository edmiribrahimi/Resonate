---
phase: 51-via-le-superfici-da-socio-e-la-porta
plan: 15
subsystem: checkin-offline
tags: [scanner, door, offline, guest-list, queue, gap-closure]

# Dependency graph
requires:
  - phase: 51-via-le-superfici-da-socio-e-la-porta
    plan: 02
    provides: "coda v6, `QueuedSubjectType = ticket | guest`, `checkInLocally` che accetta `guest_list_entry`, e il caso `guest` del drenaggio che manda `guestListEntryId` a `/api/tickets/attendance` trattando 200 e 409 come successo"
  - phase: 51-via-le-superfici-da-socio-e-la-porta
    plan: 07
    provides: "`showFlash(type, title, subtitle)` nella convenzione D-51-05 — titolo = esito, sottotitolo = tipo e provenienza via `ticketKindLabel` — piu' `recordedFact` e il modello del ramo offline in `ticketOffline`"
provides:
  - "`handleGuestCheckIn` ha due rami: online invariato, offline che AMMETTE e accoda"
  - "L'invitato di guest list senza email entra a radio spenta, come il biglietto ha sempre fatto"
  - "La voce accodata e' di tipo `guest`: il drenaggio esistente la spedisce senza una riga nuova"
  - "Il `catch` non si ferma al rosso: `navigator.onLine` che mente prende la stessa strada, con categoria di log propria"
  - "Il passo 5 della corsa «dopo» di `P-51-1` ha finalmente qualcosa da misurare"
affects: [51-14]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Un ramo offline si costruisce chiamando il negozio esistente, non duplicando il drenaggio: la strada del tipo `guest` c'era gia' e non e' stata toccata"
    - "Le due cause di un ingresso offline — radio dichiarata spenta, radio che mente — si tengono distinte nei log da una categoria sola, non da due righe per lo stesso evento"

key-files:
  created:
    - ".planning/phases/51-via-le-superfici-da-socio-e-la-porta/51-15-SUMMARY.md"
  modified:
    - "src/app/(admin)/admin/scanner/ScannerClient.tsx"

key-decisions:
  - "Il fatto di `already_recorded` si legge da `result.attendee.checkedInBy` con `THIS_DEVICE_LABEL` come ripiego, invece di scrivere sempre l'etichetta di questo dispositivo: se la lista scaricata sapeva gia' chi lo aveva fatto entrare, dirlo e' il fatto; sovrascriverlo con «questo dispositivo» sarebbe un'affermazione falsa su una superficie che promette un fatto."
  - "Sul record della cronologia viaggia anche `localKey`: senza, l'annullamento a radio spenta rifiuterebbe se stesso con «It was recorded on the server», che per una voce appena accodata da questo telefono e' falso. La supervisione davanti all'annullamento resta invariata — questo rende reversibile la voce per chi e' gia' autorizzato a reversarla, non allarga chi lo e'."
  - "Il `catch` logga `scanner:guest_checkin_queued_after_unreachable` al posto di `scanner:guest_checkin_unreachable`, non in aggiunta: due righe di console per un evento solo sono il modo in cui una categoria smette di significare qualcosa. L'ammissione a radio dichiarata spenta resta silenziosa, come quella del biglietto — non e' un percorso d'errore."
  - "La riga della lista si aggiorna a entrata con `result.at`, il valore da cui la coda e' stata scritta, non con un `Date.now()` calcolato a parte: due orari per lo stesso ingresso sono due verita' che prima o poi divergono."

patterns-established:
  - "Quando un commento deve citare la frase che un gate `grep` vieta, la descrive invece di riportarla — il precedente e' di 51-07, ed e' scattato di nuovo qui sulla prima stesura del docblock"

requirements-completed: []

# Metrics
duration: 30min
completed: 2026-09-22
---

# Phase 51 Plan 15: Il ramo offline del check-in per nome — Summary

**Il pulsante «Check in» accanto a un invitato di guest list ammette e accoda a
radio spenta, sulla coda e sul drenaggio che esistevano gia' dal piano 51-02: un
piano di chiusura di una riga di codice e nessuna superficie nuova.**

## Cos'e' cambiato, e perche' era un buco

`handleGuestCheckIn` aveva un ramo solo — `fetch`, tre esiti, e un `catch` che
mostrava *«Connection error — The guest was not checked in»*. Il suo docblock lo
dichiarava senza giri: non aveva mai avuto un secondo ramo.

Quel ramo mancante cadeva **sull'unico soggetto che non si puo' scansionare**.
Un biglietto porta un QR firmato e ha il suo percorso offline da sempre
(`ticketOffline`); un invitato di guest list **senza email non ha un QR**: alla
porta lo si cerca per nome nella lista scaricata prima, ed e' esattamente il
caso che D-51-10 tiene in vita quando decide che il download resta. Con la radio
spenta, la sola strada che quella persona ha finiva in rosso, senza accodare
nulla.

**Non e' dedotto: e' stato misurato**, al telefono, in modalita' aereo vera, sul
laboratorio — `51-ESITI.md`, corsa «prima» di `P-51-1`, passo 5, registrato come
baseline e non come fallimento. `checkin-offline.md` chiama il falso rifiuto il
peggiore dei due errori *«perche' avviene davanti a una fila»*.

## Il ramo nuovo, in concreto

`ScannerClient.tsx:2385-2465` — `queueGuestLocally`, condiviso dai due percorsi
offline:

| Caso | Cosa fa | Cosa si vede |
|---|---|---|
| prima pressione, radio spenta | `checkInLocally(partyId, "guest_list_entry", id, { token: null, name })` (`:2387-2392`) | **verde**, titolo `Admitted`, sottotitolo **`Guest list · Offline`**, «Pending (n)» che sale |
| seconda pressione, stesso invitato | la prima voce in coda tiene il suo `scannedAt`: nessun secondo ingresso | `Already recorded` + il **fatto** (ora e dispositivo) + ` · Offline` |
| `navigator.onLine === true` ma la richiesta non parte | stesso ramo, `:2554-2555` | come la prima pressione, piu' una riga di log propria |
| nessuna serata selezionata | `refuse("no_party_selected", …)` (`:2473`) | rifiuto dichiarato — irraggiungibile dalla UI, scritto perche' la chiave del record e' per serata |

Il `token` e' `null` **per costruzione**, e non e' un'omissione: un invitato
ammesso per nome non ha una firma da consegnare. E' l'unico chiamante per cui la
firma `token: string | null` del negozio era stata allargata.

### Cosa NON e' stato costruito

Niente coda, niente tipo, niente drenaggio, nessuna rotta. `checkInLocally`
mappa `guest_list_entry` in una voce `guest` della coda
(`checkin-store.ts`, `QUEUE_TYPE_BY_SUBJECT`), e il `case "guest"` del
`sync-manager.ts` manda `guestListEntryId` a `/api/tickets/attendance`
trattando **200 e 409** come successo. Entrambi arrivati con il piano 51-02 e
**non toccati qui** — il perimetro del piano lo vietava, e non c'e' stato niente
da correggere.

### Il ramo online e' invariato, e si puo' controllare

Il diff di questo commit rimuove **dieci righe in tutto**: le sei del vecchio
docblock e le quattro del corpo del `catch`. Dentro `if (res.ok)` e
`if (res.status === 409)`: **zero righe rimosse, zero aggiunte**. Con la rete, il
pulsante fa quello che faceva.

## Cosa misura la corsa dopo

Questo piano **non puo' provare il proprio effetto**: non esiste un test runner
per il prodotto, il ramo offline vive dentro `navigator.onLine` e IndexedDB, e
il drenaggio reale passa da un telefono. Quello che segue e' la **sequenza
attesa**, scritta prima di vederla, perche' chi percorre la corsa «dopo» sappia
cosa confrontare — e perche' un esito diverso sia riconoscibile come esito
diverso invece che come ricordo sfocato.

### Passo 5 — *«far entrare un invitato di guest list senza email, per nome, a radio spenta»*

Sulla serata di prova del laboratorio, con la riga
`63ebd88f-d2a7-4c65-81bf-afca5d52c350` (nome «Prova SenzaEmail»), lasciata
`invited` dalla corsa «prima»:

1. cercato **per nome** nella lista scaricata, la riga compare con la pastiglia
   `Guest List` e il pulsante **«Check in»** a destra;
2. premuto il pulsante: **schermo verde**, segno di spunta, titolo **`Admitted`**,
   sottotitolo **`Guest list · Offline`**. **Nessun nome sullo schermo** — D-51-05
   vale su questo ramo come su quello del biglietto;
3. in testata la pastiglia dei pendenti **sale di uno**: se la corsa «prima» ha
   lasciato la voce `membership`, «Pending (1)» diventa **«Pending (2)»**; su un
   telefono senza quella voce, **«Pending (1)»**;
4. dopo il dismiss del flash, la riga dell'invitato nella lista **non e' piu'
   *Not arrived***: porta il segno di spunta verde con l'orario, e il contatore
   della serata sale di uno. *(Questo e' l'aggiornamento locale: offline non c'e'
   un `fetchAttendance` che risponda.)*

**Una seconda pressione**, sempre a radio spenta, deve dare
**`Already recorded`** con il fatto — *«Recorded at HH:MM by …»* seguito da
` · Offline` — e **non** un rifiuto: la pastiglia dei pendenti **non sale
un'altra volta**.

> **Se invece si vede «Connection error — The guest was not checked in»**, il
> laboratorio sta servendo il codice della corsa «prima»: e' la precondizione
> `PRE-LAB` che non regge, non il ramo che non funziona. Si verifica il commit
> servito prima di scrivere l'esito.

### Passo 8 — la rilettura dal catalogo, meta' guest list

Dopo il passo 7 (rete riaccesa, coda drenata), letta con la chiave di servizio
**del laboratorio**, in sola lettura:

| Cosa | Atteso dopo | Letto nella corsa «prima» |
|---|---|---|
| `guest_list_entries` riga `63ebd88f-…` | **`checked_in`**, con `checked_in_at` valorizzato | `status = invited`, `checked_in_at = NULL` |

**Su `checked_in_by` non si pretende nulla, e va detto invece di scoprirlo.** Il
`case "guest"` del drenaggio manda `guestListEntryId`, `partyId`, `scannedAt` e
`source`, e **non manda un device id**: il suo docblock dichiara gia' che una
voce di guest list, dopo, **non e' distinguibile come arrivata dalla coda**.
Quindi `checked_in_by` sara' valorizzato da cio' che la rotta scrive sul proprio
percorso normale, non da questo ramo. Una casella «`checked_in_by` = il
dispositivo della porta» sarebbe un'attesa che nessuno ha costruito.

**E non si deve trovare una riga nuova in `door_scan_events` per questo
ingresso**, per la stessa ragione: e' la meta' che quel registro non copre sul
percorso guest list. Cercarla e non trovarla non e' un guasto.

### Cosa questo piano NON ha potuto verificare

- **Il drenaggio reale della voce `guest`.** Che la coda contenga la voce giusta
  e' garantito dal tipo (`QUEUE_TYPE_BY_SUBJECT`, e il `switch` del drenaggio e'
  esaustivo su quell'unione: un ramo mancante sarebbe un errore di tipo). Che il
  telefono la spedisca davvero, con la sessione che ha, contro il laboratorio,
  lo vede **solo** la corsa «dopo».
- **Che la pastiglia «Pending» si muova sullo schermo.** `refreshQueueCounts()`
  e' chiamato e atteso dentro il ramo, ma un contatore che sale e' una cosa
  osservata, non una chiamata scritta.
- **Che l'annullamento a radio spenta funzioni su questa voce.** `localKey`
  viaggia, quindi l'arma offline di `handleUndo` ha di che lavorare — ma la
  supervisione davanti puo' rifiutare, ed e' giusto che rifiuti. Non e' un passo
  di `P-51-1` e non e' stato provato.

**Nessuna cella di `51-ESITI.md` e' stata toccata da questo piano**, ne' della
corsa «prima» ne' di quella «dopo». Riempirne una da qui sarebbe la prova falsa
che `T-51-01` vieta.

## Il gate della verifica, detto per intero

`npm run build` **esce 0** — ed e' il typecheck di Next, non una suite: **non
esiste alcun test runner per il prodotto**, e nessuna riga di questo riepilogo
va letta come «i test passano». `npm run verify:scan-legibility` resta verde
(nessuna tinta e' stata toccata).

Il ramo aggiunto tocca **la porta**: il suo gate vero e' la procedura manuale
scritta, `P-51-1`, sul laboratorio, mai in produzione.

## Deviazioni dal piano

### Correzioni applicate durante l'esecuzione

**1. [Rule 1 — Bug] La prima stesura del docblock citava la frase che il gate vieta**
- **Trovato durante:** Task 1, alla verifica `! grep -q "never had one"`
- **Problema:** per spiegare cosa il commento diceva prima, ne era stata
  riportata la frase letterale — che e' esattamente la stringa su cui
  l'asserzione del piano insiste. Il gate ha fatto il suo mestiere.
- **Correzione:** la frase e' **descritta** invece che citata. E' il pattern
  gia' stabilito da 51-07 (*«la prosa si riscrive per non rompere il grep che la
  sorveglia — mai il contrario»*), scattato per la quarta volta nella fase.
- **File:** `src/app/(admin)/admin/scanner/ScannerClient.tsx`
- **Commit:** `55ca648`

### Aggiunte rispetto alla lettera del piano

**2. [Rule 2 — Funzionalita' critica mancante] `localKey` sul record della cronologia**
- Il piano elencava `addScanRecord({ id, type, name, ticketType, status, canUndo })`.
  Senza `localKey`, `canUndo: true` e' una promessa che il ramo offline di
  `handleUndo` non puo' mantenere: rifiuterebbe con *«It was recorded on the
  server»*, che per una voce appena accodata da questo telefono e' **falso**.
  `ticketOffline` lo passa gia' su entrambi i suoi rami di ammissione.
- **Non allarga chi puo' annullare:** le tre uscite della supervisione offline
  restano prima, invariate.

**3. [Rule 2] La guardia su `selectedPartyId`**
- La chiave del record e' per serata (`attendeeKey`), quindi senza una serata
  non c'e' niente da archiviare. Irraggiungibile dalla UI — il pulsante esiste
  solo dentro la lista di una serata aperta — e scritta lo stesso, con la stessa
  frase che una scansione riceve.

**4. [Rule 1] Il fatto di `already_recorded` non e' hardcodato**
- Il piano scriveva `recordedFact(at, THIS_DEVICE_LABEL)`. Il codice legge
  `result.attendee.checkedInBy ?? THIS_DEVICE_LABEL`: se la lista scaricata
  sapeva gia' chi aveva fatto entrare quella persona, quello **e'** il fatto.
  Sovrascriverlo con «questo dispositivo» sarebbe un'affermazione falsa su una
  superficie che promette un fatto, ed e' il difetto che D-51-05 sta riparando
  altrove.

### Scelte di lessico

**5. Il sottotitolo e' `Guest list · Offline`, con la l minuscola**
- Il piano lo scriveva in prosa come «Guest List · Offline». Il codice usa
  `ticketKindLabel("guest")`, che e' **la** fonte di quella stringa per tutto lo
  schermo dal piano 51-07, e che rende `Guest list`. Divergere qui avrebbe
  significato due grafie per la stessa cosa sulla stessa superficie. Chi
  trascrive la corsa «dopo» vedra' `Guest list`.

## Guardie e domini toccati

- **`checkin-offline.md`** — *gate offline-first* (l'esito si decide in locale),
  *gate coda durevole* (IndexedDB, non memoria), *gate feedback immediato* (il
  flash parte prima di qualunque round-trip), *gate identita' del party*, *gate
  annullamento limitato* (registrato, non cancellato).
- **`meta-gates.md`** — *zero fallimenti silenziosi*: il nuovo percorso d'errore
  che resta e' il guasto del negozio, che ha la sua frase propria
  (`reportStoreFault`, «This device could not read its own list») e non
  condivide il messaggio con la rete. L'ammissione offline **non e' un percorso
  d'errore** e resta silenziosa, come quella del biglietto; il suo effetto
  osservabile e' la pastiglia dei pendenti.
- **Guardie monotone:** nessuna coinvolta — niente venue, niente pagamento,
  niente progressivo di serie.
- **`access-gating.md`:** nessun ampliamento. L'id viene dalla riga della lista
  scaricata, non c'e' input libero, e cio' che il ramo apre e' esattamente cio'
  che il pulsante apriva gia' online (T-51-15-02).

## Known Stubs

Nessuno. Il ramo e' completo e cablato ai dati che gli servono.

## Threat Flags

Nessuna superficie di sicurezza nuova: nessun endpoint, nessun percorso di
autenticazione, nessuna modifica di schema. Il ramo scrive solo su IndexedDB di
questo dispositivo e sullo stato React, e la rotta che il drenaggio chiama
esisteva gia' con lo stesso corpo.

## Self-Check: PASSED

- `src/app/(admin)/admin/scanner/ScannerClient.tsx` — FOUND
- `.planning/phases/51-via-le-superfici-da-socio-e-la-porta/51-15-SUMMARY.md` — FOUND
- commit `55ca648` — FOUND
- `npm run build` — EXIT 0
- `npm run verify:scan-legibility` — EXIT 0
- `grep -c '"guest_list_entry"'` = 3 · `grep -c "never had one"` = 0 ·
  `grep -c "guest_checkin_queued_after_unreachable"` = 1
