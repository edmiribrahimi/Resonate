---
paths:
  - "src/lib/offline/**"
  - "src/app/api/tickets/checkin/**"
  - "src/app/api/membership/**"
  - "src/utils/qr.ts"
  - "src/utils/haptics.ts"
  - "src/app/**/scanner/**"
  - "src/components/scanner/**"
  - "src/app/(admin)/door/**"
---

# Check-in & Offline — Operational Gates

## Before Touching

scanner QR, coda offline, sincronizzazione, presenze, annullamento,
verifica membership, feedback aptico
-> presentare l'analisi d'impatto su: comportamento **senza rete**, doppio scan,
scan dello stesso codice da due telefoni diversi, e cosa vede lo staff mentre
succede.

## Lo scenario di riferimento

Le due di notte. All'ingresso c'e' fila. Il telefono dello staff ha una tacca di
rete che va e viene. `src/lib/offline/checkin-store.ts` e `sync-manager.ts`
esistono per questo, insieme al service worker Serwist.

**Ogni modifica al check-in va valutata li'**, non alla scrivania con la fibra.
Se una feature funziona solo online, alla porta non funziona.

## L'asimmetria che decide i default

Rifiutare un ospite valido e ammettere due volte lo stesso biglietto **non sono
errori equivalenti**:

- Il **falso rifiuto** avviene davanti a una fila, richiede un intervento umano
  e danneggia la serata di una persona che ha pagato.
- Il **falso ingresso** e' un numero sbagliato in un report, correggibile dopo.

Quando l'informazione e' incerta — rete assente, stato non sincronizzato — il
default e' **ammettere e registrare**, non rifiutare. Chi progetta il contrario
sta ottimizzando per il report invece che per la porta.

## Quality Gates

- **Gate offline-first**: Nessuna funzione di check-in che richieda la rete per dare un esito allo staff. La decisione va presa in locale; la sincronizzazione e' successiva e asincrona.
- **Gate coda durevole**: Ogni scan effettuato offline sopravvive alla chiusura dell'app e al riavvio del telefono. Una coda in memoria non e' una coda: e' una speranza.
- **Gate riconciliazione del doppio scan**: Due telefoni possono scansionare lo stesso biglietto mentre sono entrambi offline. La sincronizzazione deve **rilevarlo e riportarlo**, non sceglierne uno in silenzio. Un doppio ingresso non segnalato e' indistinguibile da un ingresso singolo.
- **Gate feedback immediato**: Verde/rosso, flash e vibrazione arrivano **prima** di qualunque conferma di rete. Lo staff non aspetta un round-trip con una fila davanti.
- **Gate annullamento limitato**: L'annullamento esiste (ultimi 5 scan) ed e' un'operazione privilegiata. Ogni undo va registrato con chi lo ha fatto e quando: e' il percorso piu' semplice per far rientrare qualcuno.
- **Gate identita' del party**: Uno scan senza un party selezionato non ha significato. Il selettore di party e' una precondizione, non un filtro di comodo — registrare una presenza sull'evento sbagliato corrompe i dati di due serate.
- **Gate entropia dei codici**: Un codice scansionabile che concede l'ingresso deve resistere a un tentativo di indovinarlo. `src/utils/qr.ts:49` usa `Math.random()` — **difetto presente**. Vedi anche `access-gating.md`.
- **Gate rate limit sulla verifica**: `api/membership/verify` accetta un codice e dice se e' valido. Senza rate limiting e' un oracolo di forza bruta.
- **Gate la serata ha un runbook, non solo un'app**: Il codice offline risolve la rete, non l'organizzazione. Prima di ogni serata va deciso e scritto: **quali dispositivi** scansionano e chi li tiene, **come si entra** nell'app (chi ha le credenziali, con quale ruolo), **cosa si fa se lo scanner non funziona affatto**, e **chi decide** alla porta quando il sistema e una persona dicono cose diverse. Sono cinque righe, e valgono piu' di qualunque gate di questo file alle due di notte.
- **Gate provato prima della porta**: Il percorso di check-in va provato **quel giorno, su quel dispositivo, con quell'account** — non "ha funzionato l'ultima volta". Un aggiornamento del service worker, una sessione scaduta o un permesso fotocamera negato si scoprono in cinque minuti a casa o in dieci minuti davanti a una fila.
- **Gate l'indirizzo che si scalda e' quello che si usera'**: Niente in questo prodotto precache un documento — il manifest porta chunk, CSS, font e file di `public/`: **zero HTML, zero rotte, zero payload RSC**. Ogni documento offline viene da una cache runtime `NetworkFirst` a **24 ore** e **32 voci**, calda solo per una visita online precedente, e **le chiavi di cache sono URL**: i due indirizzi della porta sono due voci indipendenti, e scaldarne uno **non** scalda l'altro. Quindi la riga del runbook e': *apri la porta, online, su quel telefono, quella sera, **all'indirizzo a cui quel telefono sara' mandato***. Situazione che lo fa scattare: un telefono che fa la porta da mesi al vecchio indirizzo, mandato al nuovo, radio spenta, cache fredda, davanti a una fila. Estende `Gate provato prima della porta`: non basta che il percorso sia stato provato, va provato **a quell'indirizzo**.
- **Gate il fallimento va visto, non solo gestito**: Il progetto **non ha error tracking** (verificato: nessuna dipendenza di monitoraggio in `package.json`). Un errore di sincronizzazione notturno oggi non raggiunge nessuno. Finche' e' cosi', ogni percorso di errore del check-in deve **mostrarsi allo staff sul posto** — l'unico osservatore che esiste davvero.
- **Gate query a esito singolo**: Una `.single()` lancia con 0 o con piu' di 1 risultato. Ogni lookup di codice va gestito esplicitamente su entrambi i rami: "non esiste" e "ce ne sono due" sono errori diversi e vanno distinti nel log — il secondo e' una corruzione di dati.

## Imperative Behaviors

- When changing check-in: test it with the network disabled, not only online
- When queueing a scan offline: persist it durably, survive an app restart
- When syncing: detect and report duplicate scans, never silently pick a winner
- When giving scan feedback: fire it locally, before any network confirmation
- When allowing an undo: record who did it and when
- When recording attendance: require an explicit party selection
- When looking up a code: handle "not found" and "duplicate" as distinct errors
- When exposing a verification endpoint: rate-limit it
- When a night is coming: write the runbook — devices, accounts, fallback, who decides
- When the doors open: test the whole scan path that day, on that device, with that account
- When warming the door before a night: open the address that phone will actually be sent to — warming one address does not warm the other
- When an error happens at the door: show it to the staff present, since no monitoring will
