---
phase: 58-il-calendario-si-legge-come-lo-si-scrive
plan: 05
subsystem: scripts
tags: [production-calendar, ics, output-audit, secrecy, transcript, digest]

# Dependency graph
requires:
  - phase: 58-il-calendario-si-legge-come-lo-si-scrive
    plan: "02"
    provides: "M5 — la causa di ICS-07 attribuita per misura: la riga delle assenze, che stampava l'id grezzo"
  - phase: 44-the-production-calendar-comes-inside
    provides: "scripts/import-production-calendar.mjs — printableUid, auditOwnOutput e la dottrina «Reword the output; never widen the rule»"
provides:
  - "La regola generale «nessun identificativo grezzo raggiunge il transcript», scritta nell'intestazione dello script"
  - "printableUid senza il ramo che restituiva il valore com'e': ogni identificativo esce come digest a token singolo"
  - "Le tre righe candidate di ICS-07 chiuse tutte e tre, non solo quella che la misura indicava"
  - "Il contatore degli identificativi stampati, piu' un secondo contatore che conserva la misura sul FILE"
affects: [58-09, 58-10, 58-11]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Una funzione che non deve mai restituire il valore grezzo non tiene un ramo che lo restituisce: il ramo e' l'unico posto da cui il grezzo puo' uscire"
    - "Una regola generale si scrive dove si applica — nell'intestazione dello script — non in un documento di fase che i piani a valle non aprono mentre scrivono una say()"
    - "Un contatore che cambia significato cambia nome, o il prossimo lettore legge il numero vecchio"
    - "Il controllo negativo si esegue: stesso file, stesso database, stesso minuto, con la versione precedente dello script"

key-files:
  created: []
  modified:
    - scripts/import-production-calendar.mjs

key-decisions:
  - "Il digest e' INCONDIZIONATO: printableUid non ha piu' un ramo che restituisce l'argomento. Il ramo condizionale chiudeva meta' del problema (l'uid derivato da un titolo) e lasciava aperta l'altra meta' (l'uuid opaco con un gruppo di quattro cifre)"
  - "Tutte e tre le righe candidate sono state riparate, non solo quella che M5 indicava: la misura dice quale ha sparato, la regola vale per tutte"
  - "Il runId di apertura di un --apply esce anch'esso per digest, con la nota su come si ricorrela — sha256 troncato a dodici caratteri, riga piu' recente del registro"
  - "La misura «questo uid porta una parola di un titolo» resta come CONTEGGIO anche se non decide piu' niente: e' un fatto sul FILE, e lasciarlo cadere perche' la decisione di stampa si e' spostata sarebbe perderlo"
  - "auditOwnOutput non e' stato toccato: nessuna esenzione, nessun ramo in piu' nella regex, nessun interruttore. Il diff non contiene una sola riga della funzione"

patterns-established:
  - "Pattern 1: ogni riga che nomina una riga passa da printableUid prima di raggiungere say() — verificabile con un grep delle interpolazioni di id/uid"
  - "Pattern 2: la riparazione di un audit rosso e' una riga da riscrivere, mai una regola piu' larga"

requirements-completed: [ICS-07]

# Metrics
duration: 25min
completed: 2026-08-20
---

# Fase 58 Piano 05: La regola prima delle righe nuove — Summary

**Il digest smette di essere condizionale: `printableUid` non ha piu' un ramo che restituisce l'identificativo com'e', tutte e tre le righe candidate di `ICS-07` passano da li', e la regola che le tiene cosi' e' scritta nell'intestazione dello script — dove i tre piani a valle che aggiungeranno righe nuove la trovano prima di scriverle, invece che la prima volta che l'audit va rosso.**

## Performance

- **Duration:** ~25 min
- **Task:** 1/1
- **Commit:** `b520f66`

## Cosa e' stato fatto

### 1. `printableUid` perde il ramo che restituiva il grezzo

Prima la funzione misurava se l'`uid` portasse una parola di un titolo, e **solo
in quel caso** faceva il digest. Il resto usciva intero.

Quel ramo chiudeva meta' del problema. L'altra meta' e' l'uuid **opaco**: non
porta nessun titolo, quindi il ramo lo lasciava passare — e un uuid spezzato ai
trattini produce cinque gruppi, di cui tre da quattro caratteri, e un gruppo di
quattro cifre e' esattamente cio' che la regex degli anni dell'audit cerca nel
transcript della corsa.

La riparazione e' una sola e vale per entrambe le meta': **il digest e'
incondizionato**. La forma — un prefisso piu' dodici caratteri esadecimali — e'
**un token solo**, e un token di dodici caratteri esadecimali non puo' essere
letto come un anno.

La funzione oggi non ha alcun percorso che restituisce l'argomento, e il commento
lo dice esplicitamente: *un chiamante che volesse il valore intero non ne ha uno
qui, e non deve aggiungerlo*.

### 2. Le tre righe, tutte e tre

`58-02-SUMMARY.md` (M5) attribuisce la causa alla riga delle **assenze** — l'unica
delle tre che stampava l'identificativo senza passare da `printableUid`. Il piano
chiedeva comunque di chiudere tutte e tre, e cosi' e' stato:

| Riga | Prima | Dopo |
|---|---|---|
| blocco delle **divergenze** | passava da `printableUid`, che pero' restituiva il grezzo se l'uid non portava parole di titolo | digest, sempre |
| blocco delle **assenze** | interpolava l'`id` **grezzo**, senza passare da `printableUid` | passa da `printableUid` |
| apertura di un **`--apply`** | interpolava il `runId` grezzo | digest, con la nota su come si ricorrela |

Le altre due chiamate gia' esistenti — i due blocchi che stampano un `uid` con il
proprio codice di motivo — ereditano il digest incondizionato senza modifiche al
punto di chiamata.

**Sulla correlazione del `runId`.** La riga esiste per legare il referto alla riga
del registro delle corse. Il digest e' `sha256` dell'identificativo tagliato a
dodici caratteri, quindi e' **stabile**: chi ha in mano l'identificativo lo
ricalcola e ritrova la riga. Il commento accanto alla riga lo dice, e aggiunge il
secondo appiglio: la riga nominata e' la piu' recente della tabella delle corse.

### 3. La regola, scritta dove si applica

L'intestazione dello script ha un blocco nuovo — *nessun identificativo grezzo
raggiunge il transcript* — che dichiara quattro cose:

1. **ogni riga che nomina una riga la nomina per digest**, e `printableUid` e'
   l'unica via per cui un identificativo diventa stampabile;
2. **perche' la regola e' generale invece che una riparazione**: il meccanismo
   dell'uuid spezzato ai trattini, con la misura (due centomila uuid casuali,
   circa tre su mille portano un gruppo del genere; un transcript che ne stampa
   qualche decina fallisce il proprio audit circa una corsa su sei);
3. **che l'audit non va istruito a distinguerli**: allargare la regola perche'
   passi l'identificativo di oggi e' cio' che farebbe passare la data vera di
   domani — con il rimando alla frase che lo script gia' si detta in fondo;
4. **che una riga aggiunta piu' avanti eredita la regola nel momento in cui viene
   scritta**, non la prima volta che va rossa. E' la frase per i piani `58-09`,
   `58-10` e `58-11`, che aggiungeranno al referto quante righe cancellate,
   quante riagganciate, quante sopravvissute e da quale calendario.

Il blocco che gia' descriveva l'output come superficie di pubblicazione e' stato
aggiornato di conseguenza: il referto stampa *conteggi, identificativi digeriti e
codici di motivo*.

### 4. Il contatore, che cambia significato e quindi nome

Il contatore diceva *«quante volte ho dovuto nascondere»*. Con il digest
incondizionato quel numero e' diventato *«quanti identificativi ho stampato»*, e
un contatore il cui nome sopravvive al proprio significato e' un numero che il
prossimo lettore legge come quello vecchio. E' stato rinominato, e la riga di
referto riscritta di conseguenza.

**La misura vecchia non e' stata buttata.** Un secondo contatore conserva *quanti
degli identificativi stampati portano una parola di un titolo*: non decide piu'
niente sulla stampa, ma e' un fatto **sul file** — alcune applicazioni derivano
l'`UID` dal titolo della voce — e lasciarlo cadere perche' la decisione di stampa
si e' spostata sarebbe perdere un ritrovamento, non semplificare un ramo. Esce
come conteggio, che non nomina niente.

## Verifica

### Il controllo negativo, che e' la prova vera

Lo stesso snapshot, lo stesso database, lo stesso minuto, due versioni dello
script:

| | uscita | riga dell'audit | token finale |
|---|---|---|---|
| script **prima** della modifica (estratto da `HEAD`) | `1` | `1 four-digit year(s) appear above` | `IMPORT_DRY_RUN_WITH_LEAKED_OUTPUT` |
| script **dopo** | `0` | `✓ output audit: 27 residual title token(s), 0 of them in what this run printed · 0 four-digit years` | `IMPORT_DRY_RUN_OK` |

La corsa ha attraversato **entrambi** i blocchi che erano a rischio: il referto
riporta 32 divergenze e 28 assenze, e **70 identificativi stampati, tutti come
digest**. Il contatore delle parole di titolo e' rimasto a zero — nessun `UID` di
questo file e' derivato da un titolo — quindi la riga di avviso non e' comparsa,
che e' il comportamento corretto.

Il copione di controllo e' stato rimosso subito dopo la misura; l'albero di lavoro
non ne porta traccia.

> ⚠ La corsa e' stata un **`--dry-run`**, che per costruzione non apre transazioni
> e non scrive nulla — nessuna riga di corsa, nessun timbro. Nessuna scrittura in
> produzione.

### I gate

| Comando | Esito |
|---|---|
| `node scripts/import-production-calendar.mjs --help` | `0` |
| `node --check scripts/import-production-calendar.mjs` | `0` |
| `npm run build` | `0` |
| `npm run verify` | `1` — **immutato rispetto alla base** |

**Su `npm run verify`.** Il rosso e' quello dichiarato in apertura di fase e non e'
di questo piano: `verify:touch-targets` fallisce su **due elementi di un file
sotto `src/app/(public)/events/[slug]/menu/`**, fuori fase e fuori da questo
piano. Due gate REFUSED (`verify:capabilities`, `verify:section-export`) misurano
zero perche' un worktree non ha `.env.local`; anche quello e' lo stato di partenza,
non un effetto della modifica. Ventuno gate corsi, diciotto passati — gli stessi
numeri della base.

L'elemento fuori scopo **non e' stato toccato**: il perimetro di questo piano e'
un solo file sotto `scripts/`.

### I criteri di accettazione, uno per uno

| Criterio | Esito |
|---|---|
| Le tre righe stampano l'identificativo **solo** per digest | ✅ nessuna interpolazione di `id`/`uid`/`runId` grezzo raggiunge una `say()` — le tre interpolazioni rimaste nel file sono chiavi di una mappa e non vengono stampate |
| L'intestazione contiene la regola generale, scritta come regola | ✅ blocco dedicato, con il meccanismo, la misura e il divieto di allargare |
| `auditOwnOutput` immutato nella sua regola | ✅ il diff non contiene **una sola riga** della funzione; nessuna lista di esenzioni, nessun argomento che disattivi il controllo |
| `/usr/bin/grep -cE "(19\|20)" scripts/import-production-calendar.mjs` non aumenta | ✅ **5 prima, 5 dopo** — le righe nuove sono state scritte deliberatamente senza quelle due cifre, per non far salire il conteggio che questo criterio misura |
| Il nome o il commento del contatore riflette il significato nuovo | ✅ rinominato, con un commento che dice esplicitamente cosa contava prima |
| `--help` esce `0` | ✅ |
| `--dry-run` sul file vero non produce la riga dell'anno | ✅ eseguito, con controllo negativo |
| `npm run verify` esce `0` | ⚠️ **no, ed e' il rosso preesistente dichiarato dalla fase** — invariato prima/dopo |

## Deviazioni dal piano

### Aggiunte automatiche

**1. [Regola 2 — Mancante critico] Il secondo contatore, che conserva la misura sul file**

- **Trovato durante:** Task 1
- **Problema:** Il piano chiede di aggiornare il contatore al significato nuovo. Preso alla lettera, il modo piu' corto e' rinominarlo e basta — ma cosi' lo script smette di dire una cosa che diceva: che un `UID` di questo file porta (o non porta) una parola di un titolo. Quel fatto riguarda **il file**, non la decisione di stampa, e la decisione di stampa e' l'unica cosa che questo piano ha spostato.
- **Cosa e' stato fatto:** Il contatore principale diventa *quanti identificativi ho stampato*; un secondo contatore conserva *quanti di essi portano una parola di un titolo* e viene stampato **solo se maggiore di zero**, come faceva la riga vecchia. Entrambi sono conteggi che non nominano niente.
- **File modificati:** `scripts/import-production-calendar.mjs`
- **Verifica:** nella corsa di prova il secondo contatore e' zero e la riga non compare.
- **Commit:** `b520f66`

**2. [Regola 2 — Mancante critico] La nota su come si ricorrela il `runId`**

- **Trovato durante:** Task 1
- **Problema:** La riga di apertura di un `--apply` esiste per legare il referto alla riga del registro. Sostituire l'identificativo con un digest **senza dire come si torna indietro** avrebbe reso quel legame un mistero per chi legge il referto — un fallimento silenzioso di tipo diverso: non un errore ingoiato, un dato reso inutilizzabile senza dirlo.
- **Cosa e' stato fatto:** Un commento accanto alla riga dichiara che il digest e' `sha256` dell'identificativo tagliato a dodici caratteri e che la riga nominata e' la piu' recente della tabella delle corse. La stessa spiegazione sta anche nell'intestazione, a chiusura del blocco della regola.
- **File modificati:** `scripts/import-production-calendar.mjs`
- **Commit:** `b520f66`

**3. [Regola 3 — Blocco] Il worktree non aveva `node_modules` ne' `.env.local`**

- **Trovato durante:** verifica
- **Problema:** Senza dipendenze non gira ne' `npm run verify`, ne' `npm run build`, ne' il `--dry-run`; senza credenziali il `--dry-run` si rifiuta.
- **Cosa e' stato fatto:** `node_modules` collegato in simbolico al checkout principale; `.env.local` copiato per la durata delle misure e **rimosso subito dopo**. Entrambi sono ignorati da git e l'albero di lavoro e' rimasto pulito: l'unico file modificato del commit e' lo script.
- **File modificati:** nessuno di tracciato.

### Cosa NON e' stato fatto, deliberatamente

- **L'audit non e' stato allargato.** Nessuna eccezione nella regex, nessuna lista di token esentati, nessun argomento che disattivi il controllo. La funzione non compare nel diff.
- **L'audit continua a non stampare cio' che ha trovato.** Restano i tre numeri che non nominano niente: quanti, di quale delle due specie, su quale insieme residuo.
- **Nessun pacchetto nuovo.**

## Cosa un verde qui NON significa

- Il `--dry-run` pulito e' evidenza su **un file in un giorno**, non una proprieta' dello script. E' precisamente cio' che l'intestazione dello script dice gia' di se stessa.
- L'audit prova il transcript **di quella corsa**. Non puo' provare che una modifica futura non stampera' un titolo, e non vede cosa una persona scrive accanto all'output quando lo incolla.
- **Non ci sono test in questo repository.** Niente di quanto sopra e' un test e niente va descritto come tale.
- Il fatto che il contatore delle parole di titolo sia a zero dice qualcosa sul file di oggi, non sull'applicazione che lo esporta: un aggiornamento di quella applicazione puo' cambiare la forma degli `UID` domani. E' per questo che la misura resta, invece di essere rimossa perche' «tanto e' zero».

## Nota per i piani a valle

`58-09`, `58-10` e `58-11` aggiungeranno righe al referto. **La regola che devono
rispettare e' nell'intestazione dello script**, non in un documento di fase: ogni
riga che nomina una riga la nomina per digest, e l'unico modo di rendere
stampabile un identificativo e' `printableUid`. Se un audit va rosso dopo una di
quelle aggiunte, la risposta e' **quella riga da riscrivere**, mai una regola piu'
larga.

## Self-Check: PASSED

- `scripts/import-production-calendar.mjs` — FOUND (modificato, non creato)
- `.planning/phases/58-il-calendario-si-legge-come-lo-si-scrive/58-05-SUMMARY.md` — FOUND
- Commit `b520f66` — FOUND
