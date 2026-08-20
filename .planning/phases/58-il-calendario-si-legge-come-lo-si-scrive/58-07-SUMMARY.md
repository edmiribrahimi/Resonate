---
phase: 58-il-calendario-si-legge-come-lo-si-scrive
plan: 07
subsystem: database
tags: [ics, specchio, calendar-key, migration, check-constraint, indice, vocabolario, catalogo-vivo, management-api]

# Dependency graph
requires:
  - phase: 58-il-calendario-si-legge-come-lo-si-scrive
    provides: "58-02 — M1 (i conteggi d'apertura) e M4 (i nomi di vincolo letti da pg_constraint, e la ragione per cui si leggono)"
  - phase: 58-il-calendario-si-legge-come-lo-si-scrive
    provides: "58-06 — l'endpoint migrations come via di applicazione, e la prova che pg_constraint e' l'unica fonte leggibile per i vincoli"
  - phase: 44-il-calendario-di-produzione
    provides: "le quattro tabelle, la forma di un CHECK di vocabolario chiuso, e la disciplina di scrivere sopra un indice la lettura che lo motiva"
provides:
  - "calendar_key su production_plan, production_piece, production_commitment e production_import_run — applicata, versione 20260820160046"
  - "CALENDAR_KEYS — il settimo vocabolario chiuso specchiato da un CHECK: rsnt, rmdb, mtnlb"
  - "Quattro CHECK scritti come «nulla, oppure una delle tre», e quattro indici la cui lettura dichiarata e' il WHERE di un DELETE"
  - "Quattro COMMENT ON COLUMN: la transitorieta' e il suo chiudente vivono nel catalogo, non solo nel file"
  - "Il controllo G esteso alla settima coppia, con il rosso datato che prova che asserisce"
  - "La riga di PASS del controllo G conta i vocabolari da mirrored.length invece che da un letterale"
affects: [58-09, 58-11, 58-12]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Un confine di cancellazione si dichiara, non si deduce: ne' dal contenuto (circolare) ne' dal nome del file (porta una data)"
    - "Una nullabilita' transitoria porta scritto accanto CHI la chiude e QUANDO, o non e' una transizione"
    - "Il rosso di un gate si prende di proposito prima di renderlo verde: e' l'unica prova che l'asserzione nuova sia viva e non saltata in silenzio"
    - "Un conteggio in un'intestazione si rilegge accanto all'applicazione: copiato in avanti ha smesso di essere una misura"
    - "Un numero fisso in una riga di PASS e' un numero che nessuno rilegge quando scade — si conta dalla struttura"

key-files:
  created:
    - supabase/migrations/20260820121000_production_calendar_key.sql
  modified:
    - src/lib/production/ics/vocabulary.ts
    - src/types/database.ts
    - scripts/verify-ics-import.mjs

key-decisions:
  - "La colonna nasce NULLABILE e senza backfill: le righe che esistono non sono attribuibili a un calendario, e un ripiego sarebbe un fatto inventato nella colonna che governa un DELETE"
  - "Nessun quarto membro «sconosciuto»: riaprirebbe il vocabolario che D-58-06 chiude, e uno scopo ignoto in un WHERE e' la stringa libera che ICS-02 esiste per vietare"
  - "production_import_run conserva la colonna nullabile PER SEMPRE: il registro non si cancella mai, e riempire le sue righe storiche lo farebbe mentire sul passato che esiste per conservare"
  - "I quattro nomi di vincolo si scrivono per esteso perche' sono NUOVI: M4 legge i nomi vivi, qui la stessa disciplina significa STABILIRE il nome in un file leggibile invece di lasciarlo dedurre a Postgres"
  - "checkVocabularies NON e' stato adattato: legge gia' ogni IN (...) dentro uno span CHECK ( ... ), quindi la forma «nulla, oppure una delle tre» passa — come passa production_piece_unresolved_check dal 44-02"
  - "Quattro COMMENT ON COLUMN aggiunti oltre a quanto il piano chiedeva: la dichiarazione della transizione deve stare dove sta la colonna, non solo nel file che l'ha creata"

requirements-completed: [ICS-02]

# Metrics
duration: 12min
completed: 2026-08-20
---

# Fase 58 Piano 07: Il confine dello specchio — Summary

**Lo specchio ha un confine: `calendar_key` esiste su tutte e quattro le tabelle
in produzione, chiusa a tre chiavi da un `CHECK` che ammette anche il nullo,
indicizzata perche' la lettura che serve e' il `WHERE` di un `DELETE`, e
specchiata in TypeScript con lo stesso guardiano degli altri sei vocabolari —
e nessuna delle 156 righe esistenti ha ricevuto un'attribuzione che nessuno
poteva fare onestamente.**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-08-20T15:53:00Z
- **Completed:** 2026-08-20T16:05:00Z
- **Tasks:** 3 / 3
- **Files:** 1 creato, 3 modificati

## Task Commits

1. **Task 1: La colonna, il vocabolario chiuso e i quattro indici** — `8b3d422` (feat)
2. **Task 2: Il controllo G, esteso alla settima coppia** — `d77b10a` (feat)
3. **Task 3: Applicare la migration e leggerla dal catalogo** — `d6cafdd` (fix, la
   correzione di un conteggio nell'intestazione). Cio' che il task 3 produce
   davvero e' **uno stato del database piu' un referto**, che sta qui sotto

---

## Il referto del catalogo vivo (task 3)

**Versione assegnata dall'endpoint migrations: `20260820160046`**, nome
`20260820121000_production_calendar_key`. Applicata alle **2026-08-20T16:00:46Z**
via `POST /v1/projects/{ref}/database/migrations` — **l'endpoint migrations, non
`/database/query`**, cosi' la history del progetto resta veritiera. E' la
**51ª** voce della history; la 50ª e' quella del piano 58-06.

Tutte le letture con `read_only: true`. Nessun token, project reference, URL o
host e' stato stampato.

### Le quattro colonne, con la nullabilita' MISURATA

Lettura `information_schema.columns` alle **16:00:49Z**:

| tabella | colonna | tipo | `is_nullable` | default |
|---|---|---|---|---|
| `production_plan` | `calendar_key` | `text` | **YES** | nessuno |
| `production_piece` | `calendar_key` | `text` | **YES** | nessuno |
| `production_commitment` | `calendar_key` | `text` | **YES** | nessuno |
| `production_import_run` | `calendar_key` | `text` | **YES** | nessuno |

Prima dell'applicazione, alle 16:00:19Z, la stessa interrogazione restituiva
**0 colonne**.

**«Nessun default» e' misurato, non atteso**, ed e' la meta' della decisione che
il piano dichiara: una colonna con un default sarebbe una colonna in cui ogni
riga nuova entra gia' attribuita, cioe' esattamente il passo che un giorno
qualcuno salta senza accorgersene.

> ⚠ **Nota che corregge in avanti la voce 2 di `deferred-items.md`.**
> `information_schema.table_constraints` restituisce zero righe per il ruolo
> dell'endpoint — e' il ritrovamento del piano 58-06 — ma
> `information_schema.columns` **funziona**: ha restituito zero righe prima e
> quattro dopo, cioe' ha misurato una differenza vera. Le due viste non si
> comportano allo stesso modo, e generalizzare dal fallimento della prima al
> rifiuto di tutto `information_schema` sarebbe una deduzione, non una misura.
> Per i **vincoli** la fonte resta `pg_constraint`; per le **colonne** la vista
> standard e' utilizzabile e qui e' stata usata.

### I quattro indici

Lettura `pg_indexes`, 16:00:49Z. **Zero prima, quattro dopo:**

| tabella | indice |
|---|---|
| `production_plan` | `idx_production_plan_calendar_key` |
| `production_piece` | `idx_production_piece_calendar_key` |
| `production_commitment` | `idx_production_commitment_calendar_key` |
| `production_import_run` | `idx_production_import_run_calendar_key` |

Tutti `USING btree (calendar_key)`, letti dalla definizione e non dedotti dal
nome.

**Sopra ognuno dei primi tre, nel file, sta scritto che la lettura servita e' il
`WHERE` di un `DELETE`** — non una lettura di superficie. Il quarto porta invece
la ragione **diversa** che gli spetta, scritta per esteso invece di lasciare
credere che i quattro siano identici: `production_import_run` non si cancella
mai, e il suo indice serve la lettura che **segue** una cancellazione — *cosa ha
fatto l'ultima corsa per QUESTO calendario?*, che e' il referto ai piedi del
calendario, cioe' l'effetto osservabile che questo progetto pretende al posto di
un error tracking che non esiste.

### I quattro `CHECK`, letti da `pg_get_constraintdef`

Fonte: **`pg_constraint`**, per la ragione registrata nella voce 2 di
`deferred-items.md`.

| tabella | vincolo | definizione |
|---|---|---|
| `production_plan` | `production_plan_calendar_key_check` | `CHECK (((calendar_key IS NULL) OR (calendar_key = ANY (ARRAY['rsnt'::text, 'rmdb'::text, 'mtnlb'::text]))))` |
| `production_piece` | `production_piece_calendar_key_check` | identica |
| `production_commitment` | `production_commitment_calendar_key_check` | identica |
| `production_import_run` | `production_import_run_calendar_key_check` | identica |

**Esattamente le tre chiavi piu' il nullo**, su tutte e quattro. Nessun quarto
valore, nessun default, nessun membro fuori vocabolario.

### Nessun vincolo scomparso nel passaggio

| tabella | `CHECK` prima | `CHECK` dopo |
|---|---|---|
| `production_plan` | 1 | **2** |
| `production_piece` | 6 | **7** |
| `production_commitment` | 0 | **1** |
| `production_import_run` | 0 | **1** |

**7 → 11**, esattamente `+1` per tabella. I sei di `production_piece` sono i
sei di M4, e il settimo e' quello aggiunto qui.

### Nessuna riga mossa, e nessuna riga valorizzata

| tabella | righe **prima** (16:00:19Z) | righe **dopo** (16:00:49Z) | `calendar_key IS NOT NULL` |
|---|---|---|---|
| `production_plan` | 2 | **2** | **0** |
| `production_piece` | 63 | **63** | **0** |
| `production_commitment` | 85 | **85** | **0** |
| `production_import_run` | 6 | **6** | **0** |

**156 righe, zero mosse, zero attribuite.** E' la prova che la decisione dichiarata
in testa al piano e' stata eseguita e non solo scritta: nessun backfill, nessun
valore di ripiego, nessuna attribuzione che nessuno poteva fare onestamente.

**Nessuna riga di produzione e' stata cancellata o modificata da questo piano.**

### I quattro commenti di colonna, letti dal catalogo

Non erano nei criteri di accettazione e sono stati aggiunti lo stesso — vedi
*Deviations*, voce 2. Letti da `col_description` alle 16:01Z:

| tabella | commento |
|---|---|
| `production_plan` | 460 caratteri — la versione lunga: il confine, le due deduzioni rifiutate, la pubblicabilita', il chiudente |
| `production_piece` | 254 caratteri |
| `production_commitment` | 254 caratteri |
| `production_import_run` | 321 caratteri — **e dice «NULLABLE FOREVER, on purpose»**, che e' la meta' che non va persa |

### Il controllo G, rosso prima e verde dopo

| ora | stato | cosa diceva |
|---|---|---|
| **15:54:29Z** | ✓ passed | linea di base sul commit `df48a80`: 22 membri, 6 vocabolari, 11 `CHECK` da 3 migration |
| **15:58:09Z** | ✓ passed | dopo il **task 1** — e questo verde **non prova niente**: `CALENDAR_KEYS` esisteva ma non era ancora in `mirrored`, quindi non era asserita affatto |
| **15:58:47Z** | ✗ **FAILED** | dopo l'aggiunta della **sola** coppia a `mirrored`: *«CALENDAR_KEYS declares a member no CHECK constraint accepts»*, **tre volte**, una per chiave |
| **15:58:56Z** | ✓ passed | dopo l'aggiunta della migration a `MIGRATIONS`: 25 membri, 15 `CHECK` da **4** migration |
| **16:01:17Z** | ✓ passed | identico, **dopo** l'applicazione in produzione |

> ⚠ **Il rosso delle 15:58:47Z e' stato preso di proposito, ed e' il pezzo di
> referto che conta.** Un vocabolario **nuovo** ha una modalita' di fallimento che
> un vocabolario gia' sorvegliato non ha: aggiungerlo al modulo e dimenticarlo in
> `mirrored` lascia il gate **verde** — non perche' lo specchio regga, ma perche'
> nessuno lo sta guardando. Il verde delle 15:58:09Z e' esattamente quello stato,
> e da solo sarebbe indistinguibile da un successo.
>
> Il rosso e' l'unica cosa che dimostra che la settima coppia sia davvero
> asserita: tre membri dichiarati, tre volte nessun `CHECK` che li accetti. La sua
> ora e la sua ragione sono scritte anche nel commento di `MIGRATIONS`, dove il
> prossimo lettore le trova senza aprire questo file.

> ⚠ **E vale ancora quel che il piano 58-06 ha dovuto dire: il controllo G legge
> i file di migration su disco, non il database.** Il suo verde delle 15:58:56Z
> prova che TypeScript e SQL **scritto** concordano, non che la colonna esista in
> produzione; il verde delle 16:01:17Z e' una conferma di stabilita', non una
> seconda prova. **La prova dell'applicazione e' la lettura del catalogo qui
> sopra.** E `npm run build` non prova niente qui per la ragione di sempre:
> i tipi vengono da `src/types/database.ts`, che in questo progetto si edita a
> mano, quindi passerebbe anche con la migration mai applicata.

---

## `npm run verify` — prima e dopo, per confronto e non per pretesa di verde

| | prima (base `df48a80`, misurato dal 58-06) | dopo (`d6cafdd`) |
|---|---|---|
| uscita | **1** | **1** |
| falliti | `verify:touch-targets` | `verify:touch-targets` |
| rifiutati | `verify:capabilities`, `verify:section-export` | idem |

`verify:touch-targets` e' rosso su
`src/app/(public)/events/[slug]/menu/GuestTokenDisplay.tsx` **dal commit di base
della fase 58**. **Fuori perimetro:** non riparato, e il gate stesso vieta di
ripararlo allargando un'esenzione.

I due rifiuti sono la condizione onesta di un worktree: `.env.local` e'
gitignorato e vive nel checkout principale. **Nessuna credenziale e' stata
copiata qui** — il task 3 ha letto quel file dal suo percorso originale.

Gate eseguiti al commit finale: `npm run build` → **0** · `npm run verify:ics` →
**0**, otto controlli su otto · `npm run verify:ics-grammar` → **0**.

---

## Accomplishments

### 1. La colonna esiste su QUATTRO tabelle, non su tre

Tre sono le tabelle specchiate — `production_plan`, `production_piece`,
`production_commitment` — e la quarta, `production_import_run`, e' li' **per una
ragione diversa**, scritta nel file invece di lasciarla dedurre: il referto di
una corsa dice quante righe ha scritto, e un referto che non puo' dire **per
quale calendario** smette di essere leggibile il giorno in cui esiste un secondo
calendario.

L'intestazione della migration dichiara perche' le quattro sono **una
transazione sola**: una versione applicata a meta' darebbe al `WHERE` della
cancellazione un confine su alcune tabelle e non su altre — che e' **peggio di
nessun confine**, perche' si legge come protezione mentre una tabella resta
scoperta.

**La strada ovvia e' chiusa da una misura, e il file la registra.** Le due
istantanee `.ics` dichiarano lo **stesso** `X-WR-CALNAME`, il parser non espone
alcuna proprieta' di livello calendario, e un nome di file porta una **data**, non
uno scopo. Quindi lo scopo **si dichiara** — arriva come argomento obbligatorio
dell'importatore, senza default — e la ragione sta scritta accanto alla colonna e
non solo in un piano.

### 2. Il vocabolario e' chiuso a tre, e nessuna chiave nomina uno spazio

`rsnt`, `rmdb`, `mtnlb` (D-58-06). Vengono dalle sigle di format, che sono
**pubbliche** — stanno stampate sui materiali. Le sigle **per locale** restano
fuori: questa chiave e' per **calendario**, non per **serie**.

Il docblock di `CALENDAR_KEYS` lo scrive come divieto e non come nota:

```
⚠ NO KEY MAY EVER NAME A SPACE.
```

con la ragione per esteso — il nome di uno spazio qui finirebbe in ogni referto
di import, in `@/types/database` e in ogni documento `.planning/` che ne citi
uno, e **questo repository e' pubblico**, quindi quella pubblicazione e'
irreversibile (`venue-acquisition.md`, gate *uno spazio non acquisito non si
nomina*).

Verificato meccanicamente:

```
/usr/bin/grep -ciE "(booze|muro|perlone)"  nella regione di CALENDAR_KEYS  →  0
```

Le due occorrenze che il file porta (righe 189 e 257) sono **preesistenti**,
stanno nei docblock di `UNRESOLVED_REASONS` e `ANCHOR_KINDS`, e nominano una
serie gia' pubblica.

### 3. La nullabilita' e' transitoria, e la transizione ha un chiudente NOMINATO

E' la decisione che il piano prende al posto di `58-RESEARCH.md`, che poneva la
scelta senza farla. Il file scrive per esteso le **due alternative rifiutate**:

- **`NOT NULL DEFAULT '<una delle tre>'`** scriverebbe un **fatto inventato**
  nella colonna che governa un `DELETE`. La prima corsa dello specchio
  cancellerebbe righe sulla forza di un'attribuzione che nessuno ha fatto;
- **un quarto membro «sconosciuto»** riaprirebbe il vocabolario che D-58-06
  chiude — e uno scopo *ignoto* dentro un `WHERE` che cancella e' la stringa
  libera che `ICS-02` esiste per vietare, travestita da `CHECK`.

**Chi la chiude e quando** e' scritto in tre posti: nell'intestazione della
migration, nel docblock di `CALENDAR_KEYS`, e nei quattro `COMMENT ON COLUMN` che
vivono nel catalogo. Una transizione senza un chiudente dichiarato e' una
transizione che non finisce.

**E `production_import_run` non si stringe mai.** Il registro **non si cancella
mai** — e' l'unico strumento diagnostico del dominio, quello che ha permesso di
datare i 17 timbri falsi — quindi le sue righe storiche resteranno senza chiave.
La mossa onesta e' **dirlo**, non sistemarlo: un registro le cui righe vecchie
fossero riempite per sembrare completo e' un registro che ha cominciato a mentire
sul passato che esiste per conservare.

### 4. La RLS: dichiarata, non lasciata da dedurre

Il progetto pretende che una colonna nuova dichiari **esplicitamente** cosa
succede alla RLS e alle policy esistenti. Il file lo fa, e la risposta e' scritta
per intero invece che come «nulla cambia»:

> una policy row-level di Postgres e' un predicato sulla **riga**, non un
> permesso per colonna, quindi una colonna aggiunta a una tabella sotto RLS e'
> leggibile e scrivibile esattamente da chi poteva gia' leggere e scrivere quella
> riga. **Nessuna policy va riscritta e nessuna nuova serve**: non esiste una
> lettura di questa colonna che un chiamante possa fare senza avere gia' diritto
> alla riga su cui sta.

Nessuna policy creata, rimossa o ridefinita; nessun `GRANT` alterato; nessuna
funzione ridefinita. Le quattro tabelle tengono le policy che
`20260815120100_production_calendar_access.sql` gli ha dato.

**Le guardie monotone sono intatte:** nessun progressivo assegnato, rinumerato o
letto; niente in questo file puo' anticipare una rivelazione di venue o muovere
uno stato di pagamento. In particolare `production_plan_refuse_renumber` e' un
trigger `BEFORE UPDATE OF number` e **questo file non esegue alcun `UPDATE`** —
misurato dai conteggi identici prima e dopo.

### 5. Il guardiano legge gia' la forma che dichiara la transizione

Il piano ammetteva l'ipotesi che `checkVocabularies` non riconoscesse un `CHECK`
scritto come *«nulla, oppure una delle tre»* e chiedeva, in quel caso, di
**adattare l'estrattore invece di riscrivere il vincolo**.

**Non e' servito, ed e' stato verificato invece che assunto.** L'estrattore cerca
ogni `IN (…)` **dentro** uno span `CHECK ( … )`, non pretende che lo span **sia**
un `IN` — che e' anche il modo in cui legge gia'
`production_piece_unresolved_check`, scritto in quella stessa forma dal 44-02. Il
verde delle 15:58:56Z lo dimostra: **15** vocabolari `CHECK` letti da 4 migration,
contro gli 11 di prima, cioe' i quattro nuovi sono stati letti tutti.

La ragione — **e la direzione della riparazione, se un giorno servisse** — e'
scritta nel commento sopra `mirrored`: il vincolo dice la verita' sulla
transizione, e un gate che non sapesse leggerla sarebbe **il gate** a essere
incompleto.

**La direzione che conta di piu' non e' stata toccata:** un `CHECK` cresciuto di
un membro che il TypeScript non conosce resta un errore, ed e' quella meta' che
impedisce a un valore di essere memorizzato senza che nessun codice ci ramifichi
sopra.

---

## Deviations from Plan

### 1. [Rule 1 — difetto] La riga di PASS del controllo G contava sei vocabolari mentre ne misurava sette

- **Trovato durante:** Task 2
- **Problema:** la riga verde e' `${membersChecked} declared members across 6
  vocabularies` — **con il `6` scritto a mano**. Dopo l'aggiunta di
  `CALENDAR_KEYS` il gate misurava sette vocabolari e ne dichiarava sei: 25
  membri contati su 7 insiemi, riportati come *«across 6»*.
- **Perche' non e' cosmetico:** e' un numero **sbagliato dentro una riga verde**,
  cioe' la forma silenziosa dell'errore — nessuno rilegge un controllo che passa.
  Ed e' un difetto **introdotto da questo task**: la riga era corretta prima.
- **Cosa e' stato fatto:** il numero si legge da `mirrored.length`, con sopra il
  commento che dice perche' non e' un letterale. Il prossimo vocabolario non
  potra' piu' scadere quella riga.
- **Verifica:** `npm run verify:ics` → `G  25 declared members across 7
  vocabularies`, uscita **0**.
- **Committed in:** `d77b10a`

### 2. [Rule 2 — funzionalita' critica mancante] Quattro `COMMENT ON COLUMN`

- **Trovato durante:** Task 1
- **Problema:** il piano chiede che *«la nullabilita' porti scritto accanto che
  e' transitoria e chi la chiudera'»*. Scriverlo **solo** nel file di migration
  soddisfa la lettera e non la cosa: chi legge questa colonna fra sei mesi la
  incontra in `psql`, in Studio o in un dump — **non nel file che l'ha creata**,
  che nel frattempo e' uno fra cinquantuno. Una transizione dichiarata dove
  nessuno la legge e' una transizione che non ha un chiudente.
- **Cosa e' stato fatto:** un `COMMENT ON COLUMN` per tabella, ognuno con le tre
  cose che non devono andare perse — il valore **si dichiara**, la colonna e'
  **pubblicabile**, il nullo e' **transitorio** e lo chiude il piano 58-09 — piu'
  la quarta, sul solo registro: **`NULLABLE FOREVER, on purpose`**.
- **Perche' non e' scope creep:** e' `meta-gates.md`, *zero fallimenti
  silenziosi*, applicato a un dato di schema invece che a un errore. Non aggiunge
  vincoli, non muove righe, non tocca policy — e i quattro sono stati **riletti
  dal catalogo** dopo l'applicazione.
- **Verifica:** `col_description` su tutte e quattro → 460, 254, 254 e 321
  caratteri, nessuna `NULL`.
- **Committed in:** `8b3d422`

### 3. [Rule 1 — fatto] L'intestazione della migration citava un conteggio scaduto

- **Trovato durante:** Task 3
- **Problema:** il paragrafo sulle righe esistenti citava *«5 corse di import»*,
  numero preso da M1 del piano 58-02, misurato alle **14:52Z**. Il catalogo alle
  **16:00:19Z** ne dice **6**: la sesta e' arrivata in mezzo. Le altre tre cifre
  (2, 63, 85) coincidono.
- **Perche' conta:** e' precisamente il difetto che questa fase ha gia' corretto
  una volta in `production-calendar.md` — un conteggio **copiato in avanti** ha
  smesso di essere una misura, e sta in un file che si legge come autorevole.
- **Cosa e' stato fatto:** il numero viene ora dalla lettura presa **accanto
  all'applicazione**, con la vecchia misura e la sua ora fra parentesi, cosi' la
  divergenza e' documentata invece di essere cancellata. La correzione e' stata
  fatta **prima** di applicare, quindi il testo applicato e' quello corretto.
- **Committed in:** `d6cafdd`

### 4. [Rule 3 — leggibilita' dell'ambiente] `node_modules` e `docs/` collegati e rimossi

Il worktree non ha ne' l'uno ne' l'altro. Entrambi collegati con un symlink al
checkout principale, entrambi ignorati (`/node_modules` alla riga 4, `docs/` alla
67), entrambi **rimossi alla fine**. `git status` e' rimasto pulito in ogni
momento.

⚠ **La trappola registrata dal piano 58-06 e' stata evitata alla fonte:** un
symlink **chiamato** `docs` non e' ignorato, perche' `docs/` con la barra finale
corrisponde solo a una directory vera. Qui e' stata creata una **directory vera**
contenente un symlink al solo file `.ics`, e `git status` e' stato verificato
subito dopo.

**Total deviations:** 4 — un difetto introdotto e riparato, una funzionalita'
mancante aggiunta, un fatto corretto, una condizione d'ambiente.
**Impact on plan:** nessuno scope creep. Nessun file fuori dai quattro che il
piano elenca, piu' questo SUMMARY. Nessun pacchetto installato (`T-58-07-SC`
rispettato).

## Il registro delle minacce, verificato

| Threat ID | Come e' stato verificato |
|---|---|
| **T-58-07-01** — manomissione del `WHERE` del `DELETE` | I quattro `CHECK` esistono nel database e sono stati **riletti da `pg_get_constraintdef`**: un valore fuori vocabolario non puo' entrare nella colonna neanche per errore, e la garanzia e' sul database e non in un filtro applicativo. La validazione dell'argomento resta al piano 58-09, come il piano dichiara |
| **T-58-07-02** — divulgazione via `CALENDAR_KEYS` | Le tre chiavi vengono dalle sigle di format, pubbliche; il docblock porta il divieto in maiuscolo; `grep` sulla regione → **0** |
| **T-58-07-03** — manomissione dello schema di produzione | Colonna nullabile, **nessun backfill**, conteggi letti prima e dopo (156 righe, identici) e `calendar_key IS NOT NULL` = **0** su tutte e quattro. Tutte le letture `read_only: true` |
| **T-58-07-04** — ripudio della transizione | Chi la chiude e quando e' scritto in **tre** posti: migration, `CALENDAR_KEYS`, e i quattro commenti di colonna nel catalogo |
| **T-58-07-SC** — catena di fornitura | Nessun pacchetto installato, `package.json` immutato |

## Threat Flags

Nessuna nuova superficie di sicurezza. La migration non tocca policy, `GRANT`,
funzioni o trigger, e non muove righe. Questo documento non porta un solo
`ics_alias`, `source_uid`, titolo, nome proprio o data di serata: solo conteggi,
nomi di vincolo, nomi di indice e i tre valori del vocabolario, che sono sigle di
format gia' pubbliche.

## Known Stubs

Nessuno. La colonna e' un confine di schema e non alimenta una superficie: non ci
sono componenti, valori vuoti cablati o testi segnaposto introdotti da questo
piano. **Il consumo della colonna e' del piano 58-09**, ed e' dichiarato come
dipendenza in `affects`, non come debito nascosto.

## Self-Check: PASSED

File dichiarato creato, verificato presente:

- `supabase/migrations/20260820121000_production_calendar_key.sql` — FOUND

File dichiarati modificati, verificati nel diff dei tre commit:

- `src/lib/production/ics/vocabulary.ts` — FOUND
- `src/types/database.ts` — FOUND
- `scripts/verify-ics-import.mjs` — FOUND

Commit dichiarati, verificati in `git log`:

- `8b3d422` — FOUND
- `d77b10a` — FOUND
- `d6cafdd` — FOUND

Stato del database dichiarato, verificato dal catalogo vivo alle 16:00:49Z:
quattro colonne, quattro indici, quattro `CHECK`, 156 righe immobili, zero
valorizzate.
