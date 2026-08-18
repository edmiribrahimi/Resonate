---
phase: 42-scanner-conversion
plan: 12
subsystem: docs
tags: [verification, baseline-diff, mutation-proof, door, evidence, open-items]

requires:
  - phase: 42-scanner-conversion (42-02)
    provides: il reperto meccanico pre-conversione e le dieci procedure, tutte a pending
  - phase: 42-scanner-conversion (42-06 … 42-11)
    provides: la porta convertita e misurata dagli stessi gate di ogni altra superficie
provides:
  - la sezione AFTER del reperto, accanto alla BEFORE, con la comparazione e il suo verdetto
  - un normalizzatore delle sole posizioni di riga, provato per mutazione in quattro versi
  - le tre differenze residue argomentate una per una, con il piano e il commit che le ha prodotte
  - 42-12-FINDINGS.md — evidenza a file:riga per requisito, e l'elenco delle righe aperte con l'evento che le chiude
  - il criterio 3 dichiarato NON CHIUDIBILE, e non contato fra i chiusi
affects: [42-VERIFICATION, la fase che paghera' DEF-42-03, la fase che decidera' su DEF-42-06]

tech-stack:
  added: []
  patterns:
    - "un diff grezzo su un reperto che cita posizioni di riga non e' la risposta: la normalizzazione va provata per mutazione prima di fidarsene"
    - "il verdetto di una comparazione si scrive PRIMA della corsa, in entrambi i rami, cosi' che l'esito non possa essere argomentato in forma"
    - "un criterio senza termine di paragone non e' aperto: e' privo, e i due stati non si scrivono con la stessa parola"

key-files:
  created:
    - .planning/phases/42-scanner-conversion/42-12-FINDINGS.md
    - .planning/phases/42-scanner-conversion/42-12-SUMMARY.md
  modified:
    - .planning/phases/42-scanner-conversion/42-BASELINE.md
    - .planning/phases/42-scanner-conversion/42-PROCEDURES.md
    - .planning/phases/42-scanner-conversion/deferred-items.md
  deleted: []

key-decisions:
  - "La regione BEFORE non e' stata toccata: 519 righe aggiunte, 0 rimosse, e la riestrazione post-modifica e' byte per byte identica a quella pre-modifica"
  - "La riga 3h NON e' stata riscritta per farla tornare: chiude nel senso che proteggeva e fallisce in quello in cui e' formulata, ed e' scritto cosi'"
  - "Zero Result compilati in 42-PROCEDURES.md, perche' zero osservazioni: un Result riempito da un'inferenza plausibile e' peggio di uno vuoto"
  - "Il criterio 3 e' dichiarato non chiudibile, mai deferred o pending, in ogni documento prodotto qui"
  - "Il difetto dello strumento (DEF-42-07) non e' stato riparato: uno strumento riscritto dalla misura che lo usa non e' piu' un riferimento indipendente"

patterns-established:
  - "Prova per mutazione di un NORMALIZZATORE, non solo di un gate: un filtro fra una misura e chi la legge e' esattamente cio' che puo' produrre un silenzio comodo"
  - "Un'estrazione per marcatore si ancora all'INTERA riga del marcatore, mai a una sottostringa: un documento che nomina i propri marcatori in prosa rompe qualunque range che li cerchi dentro una riga"

requirements-completed: []

duration: ~35min
completed: 2026-08-18
---

# Fase 42 Piano 12: la sola affermazione falsificabile della fase, messa alla prova — Summary

**Il reperto e' stato ripreso sull'albero convertito e confrontato con quello di partenza: 118 righe diverse su 295 nel diff grezzo, di cui 115 sono sole posizioni di riga, e **tre** differenze di contenuto — i due riempimenti degli esiti e un censimento di file — tutte e tre argomentate con il piano e il commit che le hanno prodotte. Il normalizzatore che separa le due categorie e' stato provato rompendolo quattro volte. E il criterio 3 e' scritto come **non chiudibile**, che non e' la stessa cosa di aperto.**

## Performance

- **Durata:** ~35 min
- **Task:** 2 su 2
- **File di prodotto modificati:** **0**. `git status --porcelain -- src/ scripts/` vuoto a ogni commit
- **Commit:** due di task, uno di voci differite, piu' quelli che portano questo documento. **Il numero non e' scritto qui, ed e' una scelta:** un summary non puo' contare i commit che lo seguono senza diventare falso nel momento in cui ne arriva un altro — e' successo, due volte, scrivendo questa riga. Li conta un comando: `git log --oneline --grep '42-12'`. La tabella del self-check piu' in basso ne verifica **quattro**: sono i quattro che esistevano quando e' stata eseguita, e verificare dall'interno di se' stesso il commit che la porta non sarebbe una verifica.

## Cosa e' stato misurato, in numeri

| | valore |
|---|---|
| Regione d'invarianza | **295** righe |
| Diff grezzo | **118** righe diverse |
| di cui **sole posizioni di riga** | **115** |
| Differenze di contenuto residue | **3**, tutte argomentate |
| Mutazioni del normalizzatore, tutte catturate | **4** su 4 |
| Citazioni `file:riga` in `42-12-FINDINGS.md` | **37** distinte, su **32** righe |
| Gate eseguiti | **20** — 18 passed, 0 failed, **2 REFUSED** |
| `npm run build` | exit **0** |
| `Result:` compilati da questo piano | **0** |

## Task 1 — il reperto dopo, e la comparazione

**Il verdetto era scritto prima della corsa, in entrambi i rami.** Il piano fissava cosa fare se il diff fosse stato silenzioso e cosa fare se non lo fosse stato, e la seconda strada e' quella che e' stata percorsa: **non toccare il reperto precedente**, citare ogni riga diversa, nominare il piano e il commit che l'hanno prodotta, dire quale comportamento governa quella costante, e poi argomentarla per iscritto o registrarla come difetto.

### Perche' il diff grezzo non era la risposta

Il reperto **cita posizioni di riga** — le tre del lampo, le ventisei di `showFlash`, le sei dei glifi, i quattro letterali della decodifica. La conversione ha aggiunto righe sopra quasi tutte, quindi il diff grezzo mostra 118 differenze **senza che un solo valore si sia mosso**.

Il normalizzatore riscrive **solo** le posizioni: quattro regole, ognuna ancorata perche' non possa raggiungere un valore, un conteggio, un token di colore o un messaggio. La regola col pavimento a due cifre e' quella che porta il peso: la colonna finale del blocco 4 e' il **numero di argomenti** — `3` su venticinque siti e `2` su uno — e una regola che avesse ingoiato una cifra sola avrebbe cancellato l'unico sito che ne passa due.

### Il normalizzatore provato rompendolo

Un filtro messo fra una misura e chi la legge e' esattamente cio' che puo' produrre un silenzio comodo, quindi e' stato mutato quattro volte — permanenza `1500`→`1600`, `DB_VERSION` `5`→`6`, il pattern aptico del rifiuto, la larghezza del riquadro di decodifica — **e ogni mutazione e' stata asserita applicata prima di leggerne l'esito**, perche' una sostituzione andata a vuoto produce un verde che non significa niente. Tutte e quattro catturate: **8** righe diverse contro le **6** della corsa onesta.

### Le tre differenze, e cosa sono

| # | differenza | chi | cosa governa |
|---|---|---|---|
| 1 | il riempimento del terzo stato | piano **42-06**, commit `f5ae994` | cio' che una persona vede a schermo pieno. Non raggiunge un verdetto, una voce di coda, una vibrazione o una permanenza |
| 2 | il riempimento del rifiuto | idem | idem, un passo piu' scuro per allontanarlo dall'accettazione e dal colore che altrove significa *premi qui* |
| 3 | censimento file **306 → 305** | piano **42-07**, commit `47933c4` | niente alla porta: e' la dimensione dell'albero che un gate percorre. Il file cancellato non disegnava nulla sulla porta, e il verdetto del gate e' invariato su entrambe le meta' |

Le prime due **sono il mandato della fase che arriva dove era puntato**, non una regressione: le coppie precedenti misuravano 4,5 dalla pillola in deuteranopia e 7,0 dall'accettazione in protanopia, contro una soglia di 10. **E le permanenze stanno sulle stesse righe e non si sono mosse.**

### Cosa la comparazione chiude, e cosa no

Chiuse cinque righe di `42-VALIDATION.md`: **3i** (permanenze e pattern aptici), **3j** (i 26 siti con la stessa distribuzione), **3k** (`DB_VERSION` e il tetto dei tentativi), **3l** (le quattro tabelle di messaggi byte per byte, comprese le loro righe), **2c** (la configurazione della decodifica).

**La riga 3h e' l'eccezione, e la parola giusta non e' *chiusa*.** Chiede *«identico riga per riga»*; riga per riga **non** lo e'. Chiude nel senso che proteggeva — nessuna costante e nessuna strada si e' mossa — e fallisce in quello in cui e' formulata. **La riga non e' stata riscritta**: riscrivere il criterio dopo averne visto l'esito e' piegare la misura al risultato, ed e' registrato come DEF-42-08 perche' lo decida chi possiede il contratto di validazione.

## Task 2 — l'evidenza, e l'elenco di cio' che resta aperto

`42-12-FINDINGS.md` porta **due tabelle di requisito** e **tre di criterio**, ognuna che cita le parole della propria fonte invece di parafrasarle, con **37 citazioni `file:riga` distinte**. Nessuna riga cita *i test*: non ce ne sono, e dirlo una volta in cima e' parte dell'evidenza.

**42-PROCEDURES.md ha ricevuto zero `Result`.** Nessuna osservazione e' stata fatta fra l'onda 7 e l'onda 8, quindi dieci righe restano `pending` — che e' lo stato letterale, non `skipped` e non `n/a`. Cio' che e' stato aggiunto sono **due puntatori e nessuna osservazione**: un riquadro nella sezione della spina, perche' chi legge quella sezione e si ferma prima della riga 3m ne uscirebbe convinto che la fase non sia partita, e una nota di chiusura che dice che **nessuno ha ancora guardato** — un documento di chiusura con dieci risultati vuoti si legge in due modi opposti, e solo uno e' vero.

Ogni riga aperta e' elencata con **l'evento** che la chiudera' — *la prima porta reale* — e **mai con una data**: questo repository e' pubblico e la serata non e' annunciata.

## Il criterio 3, scritto come va scritto

**Non e' chiuso, non e' aperto, non e' rimandato: non e' chiudibile.**

Il criterio chiede che ogni comportamento sia invariato **rispetto a prima della conversione**, *«verified by running the door pass again on a device»*. La misura di quel *prima* era la riga 3m, il cancello d'ordine e' stato scavalcato dal proprietario con il costo enunciato prima della scelta, e le onde 3-8 sono partite comunque. **Da quel momento la riga non e' rimandata: e' impossibile, perche' il codice su cui andava misurata non esiste piu'.** La riga 3n, eseguita da sola, produce una descrizione e non un confronto.

**Questa fase non lo rivendica, e nessuno dei tre documenti prodotti qui lo conta fra i criteri chiusi.**

E il secondo motivo per cui quel vincolo esisteva **non e' coperto dalla deroga**: alla prima porta reale, correzioni di comportamento mai esercitate e una superficie ridipinta gireranno **insieme**, senza alcun error tracking che dica quale delle due ha ceduto.

## Due voci aperte portate avanti, perche' nessun gate le trova da solo

- **DEF-42-06** — tre confini di controllo della porta a **2,05 : 1** contro i **3 : 1** che WCAG 1.4.11 chiede: il selettore della serata, il pulsante della fotocamera, e il campo di ricerca ospiti — **quello che si usa quando la scansione ha gia' fallito**. La destinazione giusta esiste ed era stata costruita apposta, misurata fra 6,29 e 7,14. Nessun controllo verifica che un confine di controllo porti quel nome: **un verde su questa porta non dice nulla su questa voce.**
- **DEF-42-03** — **quattordici** bersagli tattili sotto il minimo, adesso un debito con un tetto congelato invece di un'esenzione invisibile. Due meritano di essere nominati e non solo contati: la riga della cronologia **e' la strada dell'annullamento**, e i due elementi piu' piccoli dell'intero prodotto sono **le pillole che annunciano che qualcosa non e' stato registrato**.

Nessuna delle due e' stata riparata qui, ed e' la stessa ragione per entrambe: ingrandire un bersaglio e cambiare il colore di un bordo sono **cose che una persona vede**, e la seconda meta' di RESP-05 e' che il comportamento non cambi per effetto del lavoro visivo.

## Deviazioni dal piano

### 1. [Rule 3 — bloccante] Il piano si apre con un banner ⛔ BLOCKED sulla riga 3m

- **Trovato durante:** la lettura del piano, prima del task 1.
- **Situazione:** l'intestazione del piano dice di fermarsi e riportare se la riga 3m legge `pending`. Legge `pending`, e continuera' a leggerlo per sempre.
- **Perche' non e' un arresto:** il cancello e' stato **scavalcato dal proprietario**, con il costo messo per iscritto nell'opzione scelta, e la decisione e' registrata in tre posti — commit `5e85d6b`, DEF-42-04, e il blocco di deroga datato dentro `42-PROCEDURES.md` alla riga 3m. Le onde 3-7 sono gia' state eseguite sotto la stessa deroga. Fermarsi qui avrebbe lasciato la fase senza il documento che dice **che cosa e' stato perso** — cioe' proprio la conseguenza che il banner esisteva per prevenire.
- **Cosa e' stato fatto invece:** il piano e' stato eseguito, e la deroga e' scritta in ogni documento prodotto, come **stato permanente** e mai come attesa.

### 2. [Rule 2 — funzionalita' critica mancante] L'estrazione della regione si rompeva scrivendo il documento che la usa

- **Trovato durante:** task 1, alla prima esecuzione dell'asserzione «la regione precedente non e' stata toccata».
- **Difetto:** il comando `sed -n '/BEGIN/,/END/p'` **riapre il range a ogni riga successiva che matcha l'apertura** — e questo documento **nomina i propri marcatori in prosa**. Il risultato: undici righe di prosa dentro la regione estratta, exit 0, silenziosamente.
- **La prima riparazione non e' bastata:** un `awk` che cerca la sottostringa ha estratto otto righe di troppo, perche' una frase nomina il marcatore dentro una clausola.
- **Riparazione:** ancoraggio all'**intera riga del marcatore**. Una frase che menziona un marcatore porta sempre altro sulla stessa riga, quindi l'uguaglianza e' fuori dalla portata della prosa.
- **Cosa lo ha trovato:** l'asserzione, non la rilettura del comando. **Un'asserzione che conferma sempre cio' che ci si aspetta non sta facendo una domanda** — questa ha risposto due volte di no.

### 3. [Rule 2] Aperte due voci differite che il piano non prevedeva

- **DEF-42-07** — `scripts/capture-scanner-baseline.mjs` stampa *«At this commit the scanner is unconverted»* come **stringa fissa** a ogni esecuzione. Sta sopra il marcatore, quindi non ha inquinato nessuna misura, ma un documento prodotto oggi mente alla quarta riga. **Non riparata**, e per una ragione piu' forte della regola 7 del piano: uno strumento riscritto dalla misura che lo usa smette di essere un riferimento indipendente, e la cattura AFTER sarebbe stata prodotta da un binario diverso da quello della BEFORE.
- **DEF-42-08** — la riga 3h chiede un'identita' riga per riga su un reperto che cita posizioni di riga: **irraggiungibile per costruzione** da qualunque fase che modifichi il file. **La riga non e' stata riscritta.**

### 4. [Rule 2] Due puntatori aggiunti a `42-PROCEDURES.md`

La sezione della spina descriveva il cancello d'ordine come vivo, e la deroga sta cento righe piu' in basso: chi si fermava li' ne usciva convinto che la fase non fosse partita. Aggiunto un riquadro che punta alla deroga, **senza riscrivere la regola** — che resta scritta com'era, perche' e' quella che era stata scavalcata. E il blocco di chiusura affermava che il criterio 3 sarebbe stato chiuso da due documenti: la frase e' barrata e sostituita, perche' il secondo non esistera' mai.

## Verifica

| comando | esito |
|---|---|
| `node scripts/capture-scanner-baseline.mjs` | exit **0** |
| diff delle due regioni, grezzo | exit 1 — 118 righe, 115 delle quali sole posizioni |
| diff delle due regioni, normalizzato | exit 1 — **3** righe, tutte argomentate |
| mutazioni del normalizzatore | **4 su 4** catturate, ognuna asserita applicata prima |
| `git diff --numstat` sul reperto | **519 aggiunte, 0 rimozioni** |
| riestrazione della regione BEFORE post-modifica | **silenziosa** |
| riestrazione della regione AFTER contro la cattura grezza | **silenziosa** |
| `npm run verify` | exit **2** — 20 gate, 18 passed, 0 failed, 2 **REFUSED** per credenziali assenti in un worktree |
| `npm run build` | exit **0** |
| citazioni `file:riga` in FINDINGS | **32** righe, **37** distinte |
| `^Result: pending` in PROCEDURES | **10** |
| `git status --porcelain -- src/ scripts/` | **vuoto** |

> **Sul `2` di `npm run verify`.** Due gate non hanno misurato niente perche' `SUPABASE_ACCESS_TOKEN` e `NEXT_PUBLIC_SUPABASE_URL` non esistono in un worktree — `.env.local` e' ignorato da git e vive nel checkout principale. **Un rifiuto non e' un pass e non e' un fallimento**, e questo documento ripete le parole dell'aggregato invece di arrotondarle: *«no gate that reached a verdict reported a failure»* e' un'affermazione piu' stretta di *«niente e' fallito»*. Sull'albero principale la stessa suite e' stata misurata a **20 eseguiti, 20 passati, exit 0**.
>
> **E non esiste un test runner per il prodotto.** Nessuna riga di questa fase dice che qualcosa e' verificato perche' i test passano.

## Cosa questo piano NON ha provato

- Che il lampo si legga a distanza di braccio, al buio, con una mano — righe **1h** e **1i**.
- Che il telefono vibri, e che i tre esiti si distinguano al solo tatto — riga **3o**. Su una delle due famiglie di sistema operativo la risposta onesta attesa e' *niente affatto*.
- Che la coda offline sopravviva a un riavvio, che la torcia si accenda, che il ritorno automatico **riabiliti la decodifica**, che la porta renderizzi con la radio spenta, che l'annullamento funzioni offline e sia attribuito — righe **3p**, **3q**, **3r**, **3s**.
- Che il mirino sia raggiungibile con un pollice su tre dispositivi veri — riga **2d**.
- **E che il comportamento sia invariato rispetto a prima**, perche' quel *prima* non esiste.

Il reperto prova che le **costanti** e le **strade** non si sono mosse. Non prova che il **comportamento** non si sia mosso — e questa distinzione e' scritta dentro il reperto stesso dal giorno in cui e' stato preso.

---

## Self-Check: PASSED

Ogni affermazione di questo documento e' stata riverificata dopo averlo scritto, con
un comando invece che con una rilettura.

| affermazione | comando | esito |
|---|---|---|
| I cinque file esistono su disco | `[ -f … ]` per ognuno | **5 su 5 FOUND** |
| I quattro commit esistono | `git log --oneline --all \| grep` | **4 su 4 FOUND** — `9dd20ec`, `0d96ee0`, `1eac770`, `7de9ad8` |
| Il reperto porta una sezione AFTER | `grep -c 'AFTER-DIFFABLE-BEGIN'` | **4** occorrenze (marcatore + le citazioni in prosa) |
| Le due voci differite sono state aperte | `grep -c 'DEF-42-07\|DEF-42-08'` | **2** |
| Nessun `Result` compilato | `grep -c '^Result: pending'` | **10** su 10 |
| Le citazioni `file:riga` superano il minimo di quindici | `grep -cE …` | **32** righe, **37** citazioni distinte |
| Nessun file di prodotto toccato | `git status --porcelain -- src/ scripts/` | **0 righe** |
| `STATE.md` e `ROADMAP.md` non toccati | `git diff --name-only fd3bf46..HEAD \| grep -c` | **0** — li aggiorna l'orchestratore |
| Il ramo non porta cancellazioni | `git diff --diff-filter=D --name-only` | **0** |
| Il ramo tocca **solo** `.planning/phases/42-scanner-conversion/` | `git diff --name-only fd3bf46..HEAD` | **5 file**, tutti li' dentro |

**Una nota sull'ambiente, perche' non venga scoperta come sorpresa.** Un worktree
nasce senza `node_modules`, e sia la cattura sia il build ne hanno bisogno. E' stato
usato un **collegamento simbolico** alla copia del checkout principale, per la durata
delle misure, **e rimosso prima del commit di questo documento**: `node_modules` e'
ignorato da git e non e' mai entrato in un commit, ma un collegamento lasciato dietro
in un worktree che sta per essere rimosso non e' uno stato che valga la pena lasciare.
