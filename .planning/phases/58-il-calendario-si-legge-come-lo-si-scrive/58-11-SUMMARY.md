---
phase: 58-il-calendario-si-legge-come-lo-si-scrive
plan: 11
subsystem: production-calendar
tags: [specchio, primo-apply, autorizzazione-per-atto, catalogo-non-referto, not-null, procedure, superficie]

# Dependency graph
requires:
  - phase: 58-il-calendario-si-legge-come-lo-si-scrive
    provides: "58-02 — M1, la misura d'apertura del catalogo e il conteggio delle righe senza chiave"
  - phase: 58-il-calendario-si-legge-come-lo-si-scrive
    provides: "58-07 — calendar_key nullabile su quattro tabelle, con il closer dichiarato per nome"
  - phase: 58-il-calendario-si-legge-come-lo-si-scrive
    provides: "58-09 — lo scrittore come specchio, l'ordine di cancellazione, il riaggancio, l'istantanea"
  - phase: 58-il-calendario-si-legge-come-lo-si-scrive
    provides: "58-10 — la sorgente per indirizzo registrato e la guardia del feed"
provides:
  - "Il primo specchio APPLICATO, presidiato, su due chiavi di calendario, con la prova a vuoto letta per intero prima di ognuna"
  - "Il passaggio una tantum eseguito: 150 righe senza chiave adottate, e l'adozione dichiarata come RIVENDICAZIONE e non come fatto che le righe portano"
  - "I conteggi post-specchio riconfermati DAL CATALOGO con read_only: true — non dal referto dello strumento che ha causato l'effetto"
  - "supabase/migrations/20260820123000_production_calendar_key_not_null.sql — la chiave di calendario obbligatoria sulle tre tabelle specchiate"
  - "production_import_run esclusa dalla stretta, con la ragione scritta in una sezione propria invece che in un silenzio"
  - "src/types/database.ts — le tre colonne perdono `| null`, e i commenti smettono di annunciare una transizione gia' chiusa"
  - "P-58-B passo 23 ESEGUITO: l'argomento di riautorizzazione e' inerte quando non c'e' niente da riautorizzare"
  - "Il blocco dichiarato che dice perche' P-58-A e P-58-B restano ferme, e le due strade che le sbloccano"
affects: [58-12]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Il conteggio di controllo si chiede al catalogo, mai al referto: una misura presa con lo strumento che ha causato l'effetto e' un'eco"
    - "Una misura d'apertura vale fino alla prima scrittura che non l'ha attraversata — anche se quella scrittura era legittima"
    - "Due specchi che si compensano si lanciano di fila: fra il primo e il secondo la piattaforma e' senza i pezzi che solo il secondo rimette"
    - "SET NOT NULL senza USING: un USING inventerebbe un valore nella colonna che governa un DELETE"
    - "Un CHECK con un ramo irraggiungibile si lascia: riscriverlo compra quattro scan di validazione e quattro occasioni di sbagliare un nome, per niente di osservabile"
    - "Un Result diverso da `pending` AFFERMA che la procedura e' stata eseguita: un ritrovamento scritto li' e' una falsa affermazione, e va scritto in un blocco dichiarato"
    - "Coniare una sessione su un'identita' vera e' un ATTO che vuole la sua autorizzazione datata — non e' coperto da un'autorizzazione a scrivere righe"

key-files:
  created:
    - supabase/migrations/20260820123000_production_calendar_key_not_null.sql
  modified:
    - src/types/database.ts
    - .planning/phases/58-il-calendario-si-legge-come-lo-si-scrive/58-PROCEDURES.md
    - .planning/phases/58-il-calendario-si-legge-come-lo-si-scrive/deferred-items.md

key-decisions:
  - "L'autorizzazione del 2026-08-20 e' stata SPESA per il primo specchio, dopo che i numeri veri — invecchiati di una corsa rispetto a M1 — sono stati rimessi davanti al proprietario"
  - "mtnlb NON e' stato lanciato: rifiuta feed_empty perche' il format non ha date, e il codice ha ragione. Il rumore che quel rifiuto produrra' sul cron e' del piano 58-12"
  - "I due --apply si sono susseguiti senza pausa: lo specchio rsnt rimuove anche i pezzi di RamaDub, e solo lo specchio rmdb li rimette"
  - "production_import_run resta nullabile PER SEMPRE, e la migration gli dedica una sezione che non contiene nessuna istruzione — il rifiuto vale una sezione, non un silenzio"
  - "I tre tipi in database.ts si stringono: un tipo che dichiara nullabile una colonna NOT NULL e' un commento che descrive un database diverso da quello sotto"
  - "Nessun Result bloccato e' stato riempito con un ritrovamento: il contratto del file dice che un Result non-pending afferma l'esecuzione"
  - "Nessuna spunta e' stata scritta dal catalogo attribuendola a chi non l'ha premuta: sarebbe il danno che il passo 14 esiste per intercettare, prodotto di proposito"

requirements-completed: [ICS-01, ICS-02, ICS-07]
requirements-open: [ICS-03, ICS-03b]

# Metrics
duration: 55min
completed: 2026-08-20
---

# Fase 58 Piano 11: Lo specchio ha girato con qualcuno che guardava — e la colonna di scopo non e' piu' facoltativa — Summary

**Il primo specchio e' stato applicato a mano su due chiavi di calendario, i suoi
conteggi sono stati riconfermati da uno strumento diverso da quello che li ha
prodotti, e la chiave di calendario e' diventata obbligatoria sulle tre tabelle
specchiate — mentre le due procedure che nessun gate puo' provare si sono fermate
su una porta che chi esegue non ha il diritto di aprire.**

## Performance

- **Duration:** ~55 min (continuazione; il task 1 e i due ritrovamenti che l'hanno
  preceduta sono di sedute precedenti dello stesso giorno)
- **Tasks:** 3 / 3 — il task 2 chiuso **parzialmente**, e la parte non chiusa e'
  nominata invece che arrotondata
- **Files:** 1 creato, 3 modificati
- **Scritture in produzione:** 3, tutte autorizzate — due `--apply` e una migration

## Task Commits

1. **Task 1: l'autorizzazione, datata e per atto** — `39f54d1` (docs, seduta precedente)
2. **Task 3: la chiave di calendario diventa obbligatoria** — `611b6fc` (feat)
3. **Task 2: il passo 23 eseguito, gli altri dicono perche' no** — `b8d1190` (docs)

---

## L'autorizzazione, spesa il 2026-08-20

**Spesa alle 20:46Z**, opzione `autorizza-tutte-e-tre`, e i numeri messi davanti
al proprietario **prima** della risposta non erano piu' quelli di `M1`:

| | `M1`, 14:52:43Z | il vero, 20:46:20Z |
|---|---|---|
| piani | 2 | **2** |
| pezzi | 46 | **63** |
| impegni | 79 | **85** |
| voci di checklist | 14 | **14** |
| corse di import | 5 | **6** |
| **spunte** | **0** | **0** |
| **legami** | **0** | **0** |

La voce 6 di `deferred-items.md` prescriveva esattamente questo: *rileggere i
conteggi dal catalogo il giorno in cui il primo specchio parte davvero, e non
riusare `M1`*. La prescrizione e' stata eseguita, e ha prodotto un'osservazione
in piu': la lettura delle 20:46:20Z e' **identica** a quella delle 18:08:54Z, che
la voce 6 aveva preso — quindi fra le 18:08 e l'atto **nessuna ulteriore
scrittura e' avvenuta**, e la sesta corsa resta l'unica non attraversata da `M1`.

Al proprietario e' stato messo davanti anche cio' che l'autorizzazione originale
**non** conteneva:

- che lo specchio rimuove **164 righe** — 150 nelle tre tabelle specchiate piu'
  14 voci di checklist che la cascata porta via — e ne riscrive **123**: 96 su
  `rsnt` e 27 su `rmdb`;
- che quelle righe mancanti sono la differenza fra lo snapshot esportato a mano e
  cio' che i calendari vivi portano, e che **nessuna misura separa oggi «uscito
  per decisione» da «non coperto dai feed»** (voce 8);
- che `P-58-B` riscritta **inserisce una riga sonda** invece di cambiarne una
  esistente — una scrittura in piu' rispetto alla descrizione su cui
  l'autorizzazione era stata chiesta.

Ha aggiornato il calendario RamaDub e ha risposto **«aggiorna e procedi»**.

**Il cron NON e' autorizzato da nulla di quanto sopra**, ed e' del piano 58-12.

---

## La prova a vuoto, letta per intero

Riletta integralmente **prima di ogni** `--apply`, come il piano pretende, e non
soltanto l'ultima riga.

### `rsnt --dry-run --adopt-unkeyed-rows`, uscita `0`

| | |
|---|---|
| cio' che e' arrivato | 29319 byte · 971 righe · **45 voci** · 45 UID distinti · **0 righe malformate** · 0 ricorrenze non supportate · 0 proprieta' rifiutate |
| la guardia del feed | nessuno specchio precedente applicato per questa chiave · 45 voci in arrivo · **ammessa** (*una prima corsa e' ammessa; la guardia non puo' vietare l'inizio*) |
| il catalogo | 4 format · 5 serie · 1 serie con un alias · 14 regole di pipeline |
| le quattro classi | notti **2** · pezzi **17** (17 canonici, 0 legacy) · impegni **24** · **non classificate 2** |
| il motivo delle non classificate | `kind_without_series_and_number` su **entrambe**, ed e' l'unico motivo rimasto |
| gia' in questo calendario | piani 2 · pezzi 63 · impegni 85 · voci di checklist 14 · **0 spunte** · **0 notti dietro un annuncio** |
| il passaggio una tantum | **150 righe senza chiave adottate** |
| riscrive | piani 2 · pezzi 25 · impegni 55 · voci di checklist 14, di cui **8 PROPOSTE** |
| fuori dalla rimozione | **0** righe di notte · di quelle, **0 sopravvissute a un'ASSENZA** |
| rimette | **0 spunte** e **0 legami** |
| audit d'uscita | 23 termini residui, **0 dei quali in cio' che la corsa ha stampato** · **0 anni a quattro cifre** |

### `rmdb --dry-run`, uscita `0`

29 byte a parte, la stessa forma: 21759 byte · 629 righe · **27 voci** · 27 UID
distinti · 0 malformate. Classi: notti 0 · pezzi 12 (12 canonici) · impegni 15 ·
**non classificate 0**. Gia' in questo calendario: **0 · 0 · 0 · 0**. Riscrive:
piani 0 · pezzi 12 · impegni 15 · checklist 0, **0 proposte**. Audit: 7 termini
residui, 0 stampati, 0 anni a quattro cifre.

### Le condizioni d'arresto, verificate una per una

| condizione | `rsnt` | `rmdb` | esito |
|---|---|---|---|
| spunte > 0 | 0 | 0 | non scatta |
| legami > 0 | 0 | 0 | non scatta |
| righe di notte annunciata > 0 | 0 | 0 | non scatta |
| **sopravvissute a un'ASSENZA > 0** | **0** | **0** | non scatta |
| non classificate **salite** | 2, invariato | 0, invariato | non scatta |

L'ultima riga merita una parola: il referto stesso dichiara che una sopravvissuta
a un'assenza *«e' un ritrovamento, non una pulizia — la causa puo' essere un
export parziale o il file sbagliato»*. Zero su entrambe le chiavi significa che
**nessuna voce e' sparita dalla sorgente fra la corsa e la precedente**, non che
non ci fosse niente da guardare.

### `mtnlb` non e' stato lanciato, ed e' una decisione

Rifiuta con uscita `2`, categoria `feed_empty`, e **il codice ha ragione**:
MotionLab non ha date perche' lo spazio non e' acquisito. Specchiare un feed
vuoto significherebbe cancellare tutto cio' che quella chiave tiene, e nessun
argomento lo autorizza. Il rumore che quel rifiuto produrra' su un cron notturno,
in un progetto **senza error tracking**, e' la voce 10 di `deferred-items.md` ed
e' assegnato al piano 58-12.

---

## Il confronto con `M1`, e la parte che non e' eseguibile

I conteggi di cancellazione tornano con la misura del giorno — **150 righe senza
chiave**, che sono esattamente `2 + 63 + 85` letti dal catalogo alle 20:46:20Z.
Con `M1` **non** tornano, e non devono: `M1` diceva `2 + 46 + 79 = 127`, ed e'
invecchiata di una corsa (voce 6).

**Il confronto sulle non classificate che il task 2 chiede non e' eseguibile come
scritto**, ed e' la voce 9 di `deferred-items.md`. Entrambi i numeri, con la loro
popolazione dichiarata invece che arrotondata:

| | popolazione | non classificate | quota |
|---|---|---|---|
| misura d'apertura (onda 1, dallo snapshot su disco) | 92 voci | **31** | 34% |
| oggi (dai due feed vivi specchiati) | 72 voci — 45 + 27 | **2** | **3%** |

**Le due popolazioni non coincidono** (voce 8): lo snapshot su disco e i feed
pubblicati non sono lo stesso calendario, e da `ICS-09` non lo sono piu' per
costruzione. Il criterio del task e' **soddisfatto nella sostanza** — il motivo
dominante d'apertura, `kind_without_series_and_number`, produce oggi 2 voci
invece di 31 ed e' l'unico rimasto — e **non lo e' nella forma che chiedeva**.
La differenza si scrive invece di arrotondarla.

---

## I due specchi, e perche' si sono susseguiti senza pausa

**`rsnt --apply --adopt-unkeyed-rows`, uscita `0`.** Istantanea di **164 righe**
scritta nella directory ignorata *prima* che qualcosa venisse toccato; git
conferma che quella directory e' ignorata, e il suo contenuto non e' mai stampato
perche' un campo e' un nome di persona. Poi: **150 righe senza chiave adottate**,
rimozione di due checklist, dei pezzi, di due notti e dei giorni occupati, **0
notti risparmiate da `ICS-03b`**, **0 spunte e 0 legami rimessi**. **42 passi di
scrittura completati**, riga del registro chiusa.

**`rmdb --apply`, uscita `0`, subito dopo.** Istantanea di **0 righe** — non c'era
niente da salvare, perche' quella chiave non teneva nulla. Rimozione di zero.
**4 passi di scrittura completati.**

**Perche' di fila e non in due momenti.** Lo specchio `rsnt`, con l'argomento una
tantum, **rivendica tutte** le righe senza chiave — compresi i pezzi che
appartengono a RamaDub, scritti prima che la colonna esistesse — e poi riscrive
solo cio' che il feed `rsnt` porta. Fra il primo `--apply` e il secondo, quindi,
la piattaforma e' **senza i pezzi di RamaDub**, e solo lo specchio `rmdb` li
rimette. Quella finestra e' stata tenuta al minimo tecnico: due comandi
consecutivi, nessuna verifica in mezzo.

> **L'adozione e' una RIVENDICAZIONE, non un fatto che le righe portano.** Il
> referto lo dice con le sue parole — *«sono attribuite al calendario nominato
> sopra, che e' una RIVENDICAZIONE che qualcuno sta facendo e non un fatto che le
> righe portano»* — e va ripetuto qui perche' e' la sola cosa di questo piano che
> non e' misurata: quelle 150 righe vengono da import lanciati quando la colonna
> non esisteva, e **nessuno puo' dire da quale calendario venissero** senza
> inventare la risposta. Se un giorno si scoprisse che alcune erano di `rmdb`,
> la traccia di questa decisione e' questo paragrafo.

### `ICS-07`, chiuso contro un `--apply` che scrive proposte

Il referto del primo `--apply` **non contiene** la riga *«four-digit year(s)
appear above»*: l'audit d'uscita dichiara **`0 anni a quattro cifre`** ed elenca
23 termini residui di cui **0 stampati**. E' la chiusura che il piano chiedeva —
la regola del piano 58-05 verificata non su un giro a vuoto ma su una corsa che
ha scritto **8 proposte**, cioe' su righe nuove, generate dalle regole di
pipeline e non copiate dal file. I due identificativi non classificati compaiono
come **digest** (`uid#…`), e il referto lo dichiara: *«nessuno e' letterale»*.

---

## I conteggi, riconfermati DAL CATALOGO

> ⚠ **Questi numeri vengono dal catalogo vivo, letto con `read_only: true` via
> Management API alle 2026-08-20T20:46:46Z. NON vengono dal referto dello
> script.** E' la prescrizione che il piano mette al primo posto, e la ragione e'
> il precedente del 2026-08-10: 63 righe di produzione in sette tabelle, perse
> senza PITR, con il conteggio di controllo chiesto alla stessa superficie su cui
> si era agito.

| tabella | `rsnt` | `rmdb` | senza chiave | totale |
|---|---|---|---|---|
| `production_plan` | 2 | 0 | **0** | 2 |
| `production_piece` | 25 | 12 | **0** | 37 |
| `production_commitment` | 55 | 15 | **0** | 70 |
| `production_checklist_item` *(per il piano)* | 14 | 0 | — | 14 |
| `production_import_run` | 1 | 1 | **6** | 8 |

**Spunte: 0. Legami: 0.** Invariati rispetto alla misura d'apertura dell'atto.

**Prima → dopo, nelle tre tabelle specchiate piu' la checklist:** `164 → 123`,
**41 righe in meno**. Le 41 sono la differenza fra cio' che lo snapshot esportato
a mano portava e cio' che i due feed vivi portano oggi — e **quale parte di
quelle 41 sia uscita per decisione e quale non sia coperta dai feed, oggi nessuna
misura lo dice** (voce 8).

**Il catalogo e il referto concordano numero per numero** — `2 · 25 · 55 · 14` su
`rsnt` e `12 · 15` su `rmdb` — ma la concordanza e' l'esito della verifica, non
il metodo: se avessero discordato, la fonte da credere sarebbe stata il catalogo.

---

## Task 3 — la colonna si stringe

**La precondizione, asserita e non ricordata.** Letta dal catalogo alle
20:46:46Z, **prima** di scrivere la migration:

```
production_plan        calendar_key IS NULL → 0
production_piece       calendar_key IS NULL → 0
production_commitment  calendar_key IS NULL → 0
```

Zero su tutte e tre. **Nessun `USING` compare nel file**, e la migration scrive
perche' non potra' mai comparirne uno: un `USING` inventerebbe un calendario per
una riga che non ne porta traccia, dentro la colonna che governa un `DELETE`.

**Applicata dall'endpoint migrations** — `POST /v1/projects/{ref}/database/migrations`,
non `/database/query`, cosi' la history del progetto resta veritiera.

- **Versione assegnata: `20260820205137`**, nome
  `20260820123000_production_calendar_key_not_null`
- **53ª voce** della history; la 52ª e' quella del piano 58-09, la 51ª quella del 58-07

### `is_nullable`, letto da `information_schema.columns`

| tabella | prima, 20:51:23Z | dopo, 20:51:43Z |
|---|---|---|
| `production_plan` | YES | **NO** |
| `production_piece` | YES | **NO** |
| `production_commitment` | YES | **NO** |
| `production_import_run` | YES | **YES** |

Nessuna delle quattro ha un default, prima o dopo — misurato, non atteso.

### I conteggi di riga, prima e dopo: identici

| tabella | prima | dopo |
|---|---|---|
| `production_plan` | 2 | 2 |
| `production_piece` | 37 | 37 |
| `production_commitment` | 70 | 70 |
| `production_checklist_item` | 14 | 14 |
| `production_import_run` | 8 | 8 |

`SET NOT NULL` prende uno scan di validazione e **non riscrive niente**: la prova
e' presa invece che assunta.

### `production_import_run` non si stringe, e la migration le dedica una sezione vuota

La sezione 4 del file **non contiene nessuna istruzione**, e questo e' il punto:
l'istruzione che le spetterebbe e' quella che il file rifiuta di scrivere, e un
rifiuto vale una sezione, non un silenzio che il prossimo lettore interpreta come
una dimenticanza.

La ragione, scritta li' e ripetuta qui: **il registro non si cancella mai.** E'
l'unico strumento diagnostico di questo dominio — quello che ha permesso di
datare i 17 timbri falsi confrontandoli con l'ora degli import, e quello che ha
risposto *chi ha scritto quella sesta corsa* quando nessuno se lo ricordava.
Poiche' non si cancella mai, le sue **6 righe** anteriori alla colonna resteranno
senza chiave **per sempre**: sono state scritte quando la colonna non esisteva, e
niente in esse dice quale calendario specchiassero. Riempirle renderebbe il
registro **una fonte che afferma cio' che non e' avvenuto**.

### I quattro `CHECK` restano come sono

Il loro predicato e' *null, oppure una delle tre*, e su una colonna `NOT NULL` il
ramo nullo e' semplicemente **irraggiungibile** — un predicato con un braccio
morto, non una contraddizione. Riscriverli significherebbe quattro `DROP` piu'
quattro `ADD`, cioe' quattro scan di validazione e quattro occasioni di sbagliare
un nome, per comprare niente di osservabile. E quello di `production_import_run`
ha ancora bisogno del suo ramo nullo, quindi andrebbe lasciato comunque: toccare
gli altri tre romperebbe anche la simmetria che li rende leggibili affiancati.

### `src/types/database.ts`

Le tre colonne specchiate perdono `| null` e diventano `CalendarKey`. Non e' un
ritocco: i loro commenti dicevano *«Null e' TRANSITORIO, lo chiude il piano
58-09»*, e un tipo che annuncia una transizione **gia' chiusa** e' un commento
che descrive un database diverso da quello che ha sotto. Il commento di
`production_import_run` passa al passato per la stessa ragione, e aggiunge che la
migration che ha stretto le altre tre **dice** di non aver stretto lui.

`npm run build` — che qui e' anche il typecheck — esce **`0`**: nessun consumatore
dipendeva dal ramo nullo.

---

## Task 2 — la parte che non ha girato, e perche'

**`P-58-A` non e' partita, e `P-58-B` si e' fermata al solo passo che non tocca
la superficie.** Ventitre' `Result` su ventiquattro restano `pending`.

### Il fatto, misurato in due letture indipendenti

- **Dal catalogo**, `read_only: true`: la capacita' che apre la superficie del
  calendario e' tenuta da **due ruoli**, con **un conto ciascuno**, ed **entrambi
  quei conti sono di persone**. Non esiste un conto non umano che la porti.
- **Dal browser**: la superficie di produzione risponde **`/login`**. Nessuna
  sessione aperta esiste su questa macchina.

Il passo 11 di `P-58-A` — *la spunta, messa dalla superficie* — e' l'unico della
procedura che non si esegue con la Management API. I passi 12, 14 e 15 leggono
cio' che l'11 avrebbe scritto. Di `P-58-B`, i passi 19, 21 e 24 pretendono una
lettura o una pressione sulla stessa superficie.

### Perche' non e' stato aggirato, ed e' la meta' che conta

L'unica via sarebbe **coniare una sessione sull'identita' di una persona vera**.
Questo repository lo ha gia' scritto, per un altro strumento: `verify-all.mjs`
dichiara che un controllo che firma come un ruolo reale *«e' un ATTO e ha bisogno
dell'autorizzazione datata del proprietario per quella seduta — non di una
variabile d'ambiente che questo runner potrebbe controllare»*. **L'autorizzazione
del 2026-08-20 nomina tre scritture, e nessuna delle tre e' una sessione**, ed e'
la stessa regola per cui quella di `P-58-A` non copre `P-58-B`.

**Due cose non sono state fatte di proposito:**

1. **Nessuna spunta scritta dal catalogo attribuendola a chi non l'ha premuta.**
   `record_checklist_tick` prende l'identificativo e il nome dell'autore come
   argomenti, quindi tecnicamente era possibile. Sarebbe stata una riga d'autore
   che afferma un gesto mai avvenuto, nella colonna che esiste per rispondere a
   *chi ha deciso questo* — il danno esatto che il passo 14 e' scritto per
   intercettare, prodotto di proposito invece che scoperto.
2. **Nessun `Result` bloccato riempito con un ritrovamento.** Il blocco di
   chiusura del file dice che un `Result` diverso da `pending` **afferma che la
   procedura e' stata eseguita**. Il ritrovamento sta quindi in un blocco
   dichiarato dentro `P-58-A`, leggibile da chi non conosce questa seduta, e in
   `deferred-items.md` voce 11.

### Il passo 23, eseguito

L'unico passo di `P-58-B` che non tocca ne' la superficie ne' una scrittura, e
l'unico `Result` compilato.

Due giri a vuoto sulla stessa chiave e sulla stessa sorgente, il secondo con
l'argomento esplicito di riautorizzazione. **I due referti sono identici byte per
byte** — `diff` restituisce zero righe — ed entrambi escono `0`. Nessuno dei due
porta la riga di riautorizzazione: una ricerca insensibile alle maiuscole su
entrambi i testi non trova nessuna occorrenza ne' di *riautorizzazione* ne' di
*rinumerazione*.

Che non abbiano scritto e' confermato **dal catalogo e non dal referto**: il
registro delle corse contava **8** righe prima dei due lanci e **8** dopo, di cui
**0** a vuoto.

**Entrambi i fatti, perche' il secondo senza il primo si legge come una prova piu'
grande di quella che e':** *(i)* l'argomento e' **inerte** quando non c'e' niente
da riautorizzare; *(ii)* questo **non** e' la prova che la riautorizzazione
funzioni — quella e' nel piano 58-09, per mutazione del codice.

> **Un'osservazione in piu', prodotta dallo stesso passo e non chiesta da lui:
> lo specchio e' idempotente, misurato.** Il primo dei due referti dice *cio' che
> questo calendario gia' tiene: piani 2 · pezzi 25 · impegni 55 · voci di
> checklist 14* e, quattro righe sotto, *riscrive: piani 2 · pezzi 25 · impegni
> 55 · voci di checklist 14*. Gli stessi quattro numeri, e sono anche quelli che
> il catalogo aveva dato. E la guardia del feed, che alla prima corsa non aveva un
> precedente contro cui misurare, ora ne ha uno: *precedenti 45 · in arrivo 45 ·
> soglia 34*.

### Cosa questo lascia aperto

- **`ICS-03`** (le due eccezioni di stato) e **`ICS-03b`** (l'eccezione di
  sopravvivenza) **non sono chiusi dall'evidenza di una procedura**, e la fase non
  chiude finche' non lo sono.
- **`ICS-01b`** e' comunque provato altrove — piano 58-09, per mutazione del
  codice, uscita `2`, categoria `renumber_refused`, zero scritture — e **non
  dipende** da questa voce.
- **`P-58-C` resta `pending` per intero**, e deve: e' una procedura di **rientro**,
  e un `Result` compilato senza che l'incidente sia avvenuto sarebbe una spunta che
  nessuno si e' guadagnato.

**Le due strade che lo sbloccano** — voce 11 di `deferred-items.md`, e la scelta
e' del proprietario: **(1)** il ruolo che possiede la chiave di sezione preme la
casella dalla superficie e lo dice, e chi esegue riprende dal passo 12; **(2)** il
proprietario autorizza, con la data e per quella seduta, che chi esegue conii una
sessione su un'identita' reale, nella forma che `npm run verify:refusal` gia'
pretende per se'. La seconda sblocca anche ogni futura esecuzione presidiata; la
prima no.

---

## Deviazioni dal piano

### `[Rule 3 - Blocco]` I tipi in `database.ts` sono stati stretti

Il piano dice di aggiornarli **solo se** la nullabilita' cambiava qualcosa per un
consumatore. Cambiava qualcosa per un lettore: i commenti annunciavano una
transizione che questo piano ha chiuso. Lasciarli sarebbe stato tenere in piedi
un tipo che dichiara nullabile una colonna che il catalogo dichiara `NOT NULL` —
la forma esatta di *«un documento che descrive un database diverso da quello che
ha sotto»* che questa fase ha gia' corretto due volte. `npm run build` esce `0`:
**nessun consumatore** dipendeva dal ramo nullo, il che e' anche la misura che
dice che la deviazione non ha rotto niente.

### `[Fuori perimetro]` `npm run verify` esce `1`, e il rosso precede il piano

`verify:touch-targets` segnala **due** elementi in un componente del menu drink
che non dichiarano l'altezza minima. Gli altri **ventitre'** controlli passano,
compresi tutti quelli del calendario e dello specchio. Il file non e' stato
toccato qui — l'ultimo commit che lo modifica e' della fase 47 — e la regola di
perimetro vieta di ripararlo. Registrato come voce **12** di `deferred-items.md`.

⚠ Il criterio d'accettazione del task 3 chiede `npm run verify` a `0`. **Non lo
e', e il motivo non e' di questo piano**: lo si scrive invece di dichiarare verde
un rosso che c'era prima.

---

## Voci differite

- **Voce 4 — CHIUSA il 2026-08-20.** La sorgente e' registrata, la corsa parte,
  e la sua chiusura ha immediatamente prodotto il ritrovamento della voce 7.
  Questo piano lo conferma sul campo: **due specchi applicati**, nessuno dei due
  fermato al gate 2.
- **Voci 8 e 9 — aperte**, e questo piano le documenta con i numeri veri invece
  di aggirarle: quale parte delle 41 righe in meno sia uscita per decisione resta
  indecidibile con le misure di oggi.
- **Voce 10 — aperta**, e il piano non l'ha toccata: `mtnlb` non e' stato
  lanciato.
- **Voce 11 — nuova.** La superficie non e' raggiungibile da chi esegue.
- **Voce 12 — nuova.** `verify:touch-targets` era gia' rosso.

---

## Cosa questo piano lascia al 58-12

1. Il cron, che **ora puo' girare** senza essere la prima esecuzione dello
   specchio — che e' l'unica ragione per cui questo piano esisteva prima di
   quello.
2. La distinzione, **dichiarata prima della corsa**, fra un format senza date e
   un feed che ha smesso di rispondere (voce 10).
3. Lo strumento del passo 5 di `P-58-C` e la guardia che rifiuta la corsa non
   presidiata quando spunte o legami sono `> 0` (voce 3).

---

## Self-Check: PASSED

- `supabase/migrations/20260820123000_production_calendar_key_not_null.sql` — FOUND
- La migration contiene `SET NOT NULL` — 3 occorrenze, una per tabella specchiata
- `.planning/phases/58-il-calendario-si-legge-come-lo-si-scrive/58-PROCEDURES.md` — FOUND, contiene `Result:`
- Commit `611b6fc` — FOUND
- Commit `b8d1190` — FOUND
- `Result: pending` in `58-PROCEDURES.md`: **23** (era 24)
- `is_nullable` riletto dal catalogo: `NO · NO · NO · YES` — FOUND

*Fase 58, piano 11. Non contiene nessuna sede, nessuna data di serata, nessuna
line-up, nessun nome di persona, nessun indirizzo di calendario e nessun
identificativo grezzo. `re:sonate` si scrive con la e normale.*
