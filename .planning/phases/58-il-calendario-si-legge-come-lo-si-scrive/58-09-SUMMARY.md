---
phase: 58-il-calendario-si-legge-come-lo-si-scrive
plan: 09
subsystem: production-calendar
tags: [ics, specchio, cancellazione, istantanea, guardia-monotona, rifiuti, cascata, prova-per-mutazione]

# Dependency graph
requires:
  - phase: 58-il-calendario-si-legge-come-lo-si-scrive
    provides: "58-08 — ReconcilePlan come piano di uno specchio, MIRROR_DELETION_ORDER, le tre eccezioni separate, calendarKey obbligatorio"
  - phase: 58-il-calendario-si-legge-come-lo-si-scrive
    provides: "58-07 — calendar_key su quattro tabelle, nullabile, e CALENDAR_KEYS come vocabolario chiuso esportato"
  - phase: 58-il-calendario-si-legge-come-lo-si-scrive
    provides: "58-05 — il digest incondizionato degli identificativi, e l'audit dell'output della corsa"
  - phase: 58-il-calendario-si-legge-come-lo-si-scrive
    provides: "58-01 — il contratto dell'ordine dei rifiuti, scritto prima del codice"
provides:
  - "Lo scrittore e' uno specchio: rifiuta in quattro punti, scrive un'istantanea fuori dal processo, cancella nell'ordine dei vincoli, riscrive dal file e riaggancia"
  - "--calendar obbligatorio e senza default, validato contro il vocabolario chiuso PRIMA di raggiungere una query"
  - "--reauthorise-renumbering: la sola via per cambiare un progressivo, e resta scritta nel referto"
  - "--adopt-unkeyed-rows: la raccolta una tantum delle 150 righe che precedono la colonna di scopo"
  - "ICS-01b nell'applicazione, provata per mutazione: uscita 2, categoria renumber_refused, zero scritture"
  - "L'istantanea in docs/.mirror-snapshots/, scritta solo dopo che git check-ignore conferma il percorso"
  - "Il commento del trigger dice dove vive adesso la protezione — versione 20260820170701, letta da obj_description"
affects: [58-10, 58-11, 58-12]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Il confine di una cancellazione sta nel WHERE, non in JavaScript: leggere tutto e restringere dopo mette il confine dove il prossimo edit lo perde"
    - "Una transizione si chiude con un'istruzione separata e contata, non con un ramo «oppure senza chiave» dentro il selettore che cancella"
    - "Un'adozione e' un UPDATE della sola colonna di scopo: cosi' ogni DELETE conserva UNA condizione dichiarata"
    - "Un rifiuto non echeggia il valore che sta rifiutando: e' testo di fuori, e sta per finire in un referto che promette di restare pulito"
    - "Una sigla ha due meta' e solo la prima e' pubblica senza condizioni: la meta' per-sede e' l'abbreviazione di uno spazio"
    - "Un file d'ambiente su disco letto in cima trasforma un gate in un sondaggio"
    - "Una colonna nuda che nessuno scrive piu' e' indistinguibile da una che questa settimana tace: la prosa si aggiunge, non solo si riscrive"

key-files:
  created:
    - supabase/migrations/20260820122000_refuse_renumber_comment.sql
  modified:
    - scripts/import-production-calendar.mjs
    - src/types/database.ts
    - .planning/phases/58-il-calendario-si-legge-come-lo-si-scrive/deferred-items.md

key-decisions:
  - "--calendar e' obbligatorio SEMPRE, non solo con --apply: un giro a vuoto stampa lo scopo di una cancellazione, e uno che dovesse inventarsi la chiave stamperebbe il piano di una corsa che nessuno potrebbe eseguire"
  - "La sorgente registrata si legge SOLO da process.env, mai da .env.local, ed e' richiesta anche con --file: il file dice da dove arrivano i byte, la registrazione dice che questo deploy specchia quel calendario"
  - "L'adozione una tantum e' un UPDATE della sola calendar_key prima della cancellazione, non un secondo ramo del DELETE: cosi' ogni cancellazione porta UNA condizione"
  - "La cancellazione dei piani porta DUE condizioni — la chiave e la lista di identificativi — e la seconda restringe soltanto. E' ICS-03b piu' la disciplina «rimozione per chiave primaria» di ai-engineering.md, e in caso di disaccordo l'intersezione e' l'insieme piu' piccolo"
  - "Il rifiuto di rinumerare nomina la meta' di FORMAT della sigla, i due progressivi e il digest — non la sigla intera. Conflitto fra il piano e la migration della chiave di calendario, risolto nel verso restrittivo e misurato: la sigla intera faceva andare rosso l'audit dell'output su un token"
  - "L'istantanea vive in docs/.mirror-snapshots/, dentro la directory che il controllo F di verify:persona tiene ignorata e non tracciata, e non ha un argomento: un argomento sarebbe un modo per puntare un file che porta il nome di una persona verso una directory tracciata"
  - "Le prose di absent_since diventano TRE dove ce n'era UNA: sui pezzi e sugli impegni la colonna era nuda"

requirements-completed: [ICS-01, ICS-01b, ICS-02, ICS-03, ICS-03b, ICS-07]

# Metrics
duration: 95min
completed: 2026-08-20
---

# Fase 58 Piano 09: Lo specchio, dentro l'unico scrittore che questo progetto possiede — Summary

**L'importatore cancella e riscrive un calendario alla volta: rifiuta in quattro
punti prima di toccare qualunque cosa, scrive un'istantanea fuori dal processo,
cancella nell'ordine che le chiavi esterne impongono, e rimette spunte e legami
con l'autore che li aveva messi. La terza guardia monotona del progetto e'
scesa dal database all'applicazione — con l'autorizzazione datata che
`meta-gates.md` pretende, il costo scritto nel commento del trigger, e una
prova per mutazione che il rifiuto scatta davvero.**

## Performance

- **Duration:** ~95 min
- **Started:** 2026-08-20T16:35:00Z
- **Completed:** 2026-08-20T18:10:00Z
- **Tasks:** 3 / 3
- **Files:** 1 creato, 3 modificati
- **`import-production-calendar.mjs`:** 1.648 → 2.301 righe

## Task Commits

1. **Task 1: la chiave, l'ordine dei rifiuti, l'istantanea** — `8dff1c9` (feat)
2. **Task 2: cancellazione ordinata, riaggancio, guardia del progressivo** — `87b9e07` (feat)
3. **Task 3: la prosa che diventa falsa, e il commento del trigger** — `b4738e1` (docs)
4. *(voce differita)* **P-58-C passo 5 non ha ancora uno strumento** — `664b08d` (docs)

---

## La cascata, enumerata leggendo i vincoli — e cosa la corsa perde

Il piano lo chiede, e la regola del progetto e' che **una cascata e' un percorso
di scrittura che nessuno ha dichiarato**: si legge dai vincoli, non si ricorda.
Lettura: `grep -rn "REFERENCES public.production_" supabase/migrations/`.
**Un solo file** contiene riferimenti verso le tabelle specchiate, e sono **tre**
— la stessa misura del piano 58-08, riletta e non copiata:

| Da | A | `ON DELETE` | Conseguenza per questa corsa |
|---|---|---|---|
| `production_piece.plan_id` | `production_plan(id)` | **NO ACTION** | i pezzi si cancellano **prima** dei piani, o la chiave esterna blocca |
| `production_commitment.expanded_from` | `production_commitment(id)` | **NO ACTION** | auto-riferimento, verificato a fine istruzione: **un solo `DELETE`** |
| `production_checklist_item.plan_id` | `production_plan(id)` | **CASCADE** | **l'unica cascata.** Cancellare un piano porta via le sue voci **e le spunte sopra** |

**Cosa una cancellazione puo' portare via che nessuno ha chiesto:** solo le voci
di checklist, e con esse le spunte. Per questo la checklist e' il **primo** passo
ed e' **esplicita**: il numero di spunte che si perdono diventa un numero che
qualcuno ha contato invece di un effetto collaterale che nessuno ha visto — e
quando il passo 3 arriva, la cascata non trova piu' niente da prendere.

L'altro `ON DELETE CASCADE` del file — `production_pipeline_rule` verso il
catalogo — punta **verso l'esterno** e non e' raggiungibile da una riga che
questo codice cancella. E' registrato perche' in fase 48 la cancellazione di un
formato ne ha portate via due in silenzio.

**Nessuna cancellazione e' stata eseguita da questo piano.** L'unica cosa scritta
in produzione e' un commento su una funzione (task 3). La prima corsa vera e' il
piano 58-11, sorvegliata.

---

## Accomplishments

### 1. Quattro rifiuti, in un ordine che era gia' un contratto

Il gate del piano 58-01 e' stato scritto **prima** di questo codice e fissa
l'ordine. Adesso l'ordine e' quello:

| # | Passo | Categoria |
|---|---|---|
| 1 | argomenti sconosciuti / modo ambiguo | `unknown_argument`, `ambiguous_mode` |
| 2 | chiave di calendario assente o fuori vocabolario | `missing_calendar_key`, `unknown_calendar_key` |
| 3 | nessuna sorgente registrata per quella chiave | `missing_feed_source` |
| 4 | credenziali del database | `missing_credential` |

E la **seconda meta'** del contratto e' rispettata: `.env.local` si legge
**dentro** `loadEnvironment()`, cioe' dentro il passo 4. Il passo 3 guarda solo
`process.env` — che e' anche dove D-58-05 dice che l'indirizzo deve vivere.

Il blocco che importa il lettore condiviso e' salito **sopra** le credenziali,
perche' il vocabolario chiuso e' esportato da li'. Non costa niente: ogni modulo
dietro quel barrel e' puro — nessun client, nessun filesystem, nessun orologio.

> ⚠ **Il rifiuto della chiave sbagliata non stampa il valore ricevuto.** E' testo
> di fuori, sta per essere dichiarato cattivo, e riecheggiarlo metterebbe la
> stringa di qualcun altro dentro un referto che questo file promette di tenere
> pulito. Le tre risposte buone bastano per agire.

**Misurato — `node scripts/verify-mirror-guards.mjs`:**

```
✗ V0  il predicato non si carica          (guard.ts e' del piano 58-10)
✓ R1  --apply senza chiave                → uscita 2, missing_calendar_key
✓ R2  una chiave fuori vocabolario        → uscita 2, unknown_calendar_key
✓ R3  chiave valida, nessuna sorgente     → uscita 2, missing_feed_source
–  R4  rimandato a P-58-B, dichiarato
```

Prima di questo piano erano rossi **tutti e quattro**. `V0` resta rosso ed e'
corretto che lo sia: `src/lib/production/ics/guard.ts` non esiste ancora.

### 2. L'istantanea, e il percorso che si chiede a git invece di dedurlo

Prima di qualunque istruzione — prima ancora della riga del registro — la corsa
scrive **fuori dal processo** le due liste di ripristino di `ICS-03` piu' il
contenuto integrale delle righe che sta per cancellare.

Il percorso e' **fisso e senza argomento**: `docs/.mirror-snapshots/`. Due
ragioni, entrambe scritte nel codice:

- `docs/` non e' solo elencato in `.gitignore`, e' tenuto li' **meccanicamente**
  dal controllo **F** di `npm run verify:persona`, che pretende sia che la
  directory sia ignorata sia che nulla al suo interno sia gia' tracciato;
- **un argomento sarebbe un modo per puntare un file che porta il nome di una
  persona verso una directory tracciata.**

E il percorso non si deduce: si chiede a `git check-ignore`, sul **file** e non
sulla directory padre — una regola di negazione piu' in basso potrebbe
ri-includere il figlio. Se git non risponde `0`, la corsa **rifiuta**
(`snapshot_path_not_ignored`) e non cancella niente.

Misurato in questo worktree:

```
git check-ignore -q -- docs/.mirror-snapshots/mirror-rsnt-1.json   → 0  (ignorato)
git check-ignore -q -- .planning/mirror-rsnt-1.json                → 1  (NON ignorato)
```

Il referto dice **dove** e **quante righe**. Non dice il nome del file — porta
l'orologio della corsa, e l'audit in fondo legge ogni riga cercando un anno — e
non dice **niente** del contenuto.

### 3. La cancellazione, e il verso in cui puo' sbagliare

Quattro istruzioni, nell'ordine che i vincoli impongono:

```
checklist_item → piece → plan → commitment
```

- **checklist** — scopata **attraverso le righe di piano gia' lette**, mai con
  una seconda condizione scritta a parte. Copre **ogni** piano che la chiave
  seleziona, **sopravvissuti inclusi**: lasciare indietro le voci di una serata
  produrrebbe una checklist meta' di questa corsa e meta' della precedente;
- **piece** — `calendar_key` come unica condizione;
- **plan** — `calendar_key` **e** la lista di identificativi da cancellare. La
  seconda condizione **restringe soltanto**: e' `ICS-03b` scritto in positivo, ed
  e' anche la disciplina *rimozione per chiave primaria* che `ai-engineering.md`
  pretende. Se le due dovessero mai discordare, l'intersezione e' l'insieme piu'
  **piccolo** — l'unico verso in cui un disaccordo e' innocuo;
- **commitment** — `calendar_key`, e **in un solo comando**.

Il verso dell'errore e' scritto accanto: un selettore largo che sbaglia cancella
**di piu'**, uno stretto che sbaglia **non trova nulla**. Questo repository ha
gia' pagato la prima direzione: 63 righe in sette tabelle, non recuperabili.

### 4. La transizione della colonna di scopo, chiusa con un'adozione e non con un ramo

Le 156 righe che precedono `calendar_key` non la portano, e **non sono
attribuibili a un calendario da nessuno**. La scelta implementativa:

**adottarle** — un `UPDATE` della sola `calendar_key` — **prima** della
cancellazione, invece di aggiungere un ramo *«oppure senza chiave»* al `DELETE`.
Cosi' ogni cancellazione conserva **una** condizione dichiarata. Un `DELETE` con
due rami sarebbe stato un secondo selettore sulle stesse righe, ed e' il modo in
cui uno dei due finisce piu' largo dell'altro.

⚠ L'adozione tocca **solo** la colonna di scopo. Non tocca `number`, quindi il
trigger `BEFORE UPDATE OF number` non e' coinvolto e **nessuna guardia monotona
viene attraversata**.

**Misurato con un giro a vuoto sul file vero, contro il database di produzione
(sole letture):**

| | senza l'argomento | con `--adopt-unkeyed-rows` |
|---|---|---|
| piani letti | **0** | **2** |
| pezzi | **0** | **63** |
| impegni | **0** | **85** |
| voci di checklist | **0** | **14** |
| righe senza chiave raccolte | **0** | **150** |

**Lo zero della prima colonna e' il progetto che funziona.** Senza l'argomento
una riga senza chiave non e' letta, non e' contata e **non puo' essere toccata**:
e' il verso sicuro dell'errore, e adesso e' misurato invece che dichiarato.

### 5. `ICS-03b` e il riaggancio: cosa non se ne va, e cosa torna con il suo autore

Il referto conta le sopravvissute e, separatamente, **quante sono sopravvissute a
un'assenza** — che e' il numero da guardare, perche' la causa puo' essere un
export parziale o il file sbagliato.

Le spunte tornano con `ticked_at`, `ticked_by` e `ticked_by_name` **originali**,
scritte direttamente con il client di servizio sulla chiave stabile
`(source_uid, kind, label)`.

> **`/usr/bin/grep -c "record_checklist_tick" scripts/import-production-calendar.mjs` → 0**

Quella funzione **ri-registra l'autore a ogni chiamata**, per decisione dichiarata
nella migration di accesso: passarci un ripristino attribuirebbe ogni spunta del
calendario a chi ha lanciato l'import. **Un ripristino non e' un atto.**

E i due casi in cui il riaggancio **non trova la riga** non sono silenziosi: il
legame stampa una riga di ritrovamento, le spunte si contano a parte
(`⚠ N tick(s) name a night this run did not write`). Restano nell'istantanea e da
nessun'altra parte.

### 6. `ICS-01b` — la guardia scesa dal database, e la prova che scatta

Il confronto avviene **prima** della cancellazione e rifiuta **l'intera corsa**,
non la riga: un file in cui una voce nota torna rinumerata e' un file che
qualcuno deve guardare prima che se ne specchi una parte qualunque.

**Prova per mutazione, con la mutazione verificata prima di leggerne l'esito** —
il gate del piano 58-01 dichiara `R4` *rimandato a `P-58-B`* perche' legge il
database, quindi questa e' l'unica misura che oggi esista:

| # | Mutazione | Conferma | Esito |
|---|---|---|---|
| 1 | il confronto reso sempre disuguale (`+ 1000`) | `grep -c` → 1 occorrenza | **uscita 2**, `REFUSED [renumber_refused]`, *nothing was written* |
| 2 | stessa mutazione, con `--reauthorise-renumbering` | idem | **uscita 0**, riga `⚠ 2 RENUMBERING(S) RE-AUTHORISED by explicit argument` nel referto |
| 3 | mutazione rimossa | `grep -c` → 0 | **uscita 0**, nessun rifiuto, audit dell'output pulito |

> ⚠ **Un conflitto fra due regole scritte, risolto nel verso restrittivo e
> registrato — `meta-gates.md`.**
>
> Il piano dice che il rifiuto deve nominare la serata *«in una forma
> pubblicabile: la sigla e il progressivo»*. Ma la migration che ha chiuso il
> vocabolario delle chiavi di calendario dice l'opposto sulla **meta' per-sede**
> di una sigla: e' l'abbreviazione di uno **spazio**, e uno spazio in trattativa
> nominato in un referto e' nominato in ogni copia di quel referto.
>
> **E non e' teorico:** stampare la sigla intera ha fatto andare **rosso l'audit
> dell'output** su **un token**, correttamente, in una corsa che non perdeva
> nient'altro — la meta' per-sede di una sigla compare anche dentro un titolo del
> calendario. La riparazione che questo file prescrive per quel caso e' *dire di
> meno*, mai allargare la regola.
>
> Il rifiuto nomina quindi: la **meta' di format** (lo stesso vocabolario della
> chiave di calendario, che la stessa migration chiama pubblicabile), i **due
> progressivi**, e il **digest** dell'identificativo. Dopo la riscrittura l'audit
> torna verde: `0 of 27 residual title token(s)`.

### 7. Tre prose dove ce n'era una, e un commento che dice la verita'

`absent_since` compare su tre tabelle. **Solo la prima portava una prosa**; sui
pezzi e sugli impegni la colonna era **nuda** — e una colonna che nessuno scrive
e nessuno commenta e' indistinguibile da una che questa settimana tace. Adesso
sono tre, e ognuna dice: *nessuno la scrive piu'*, chi la difendeva, e cosa la
difende adesso (la guardia del feed di `ICS-10`, e la sopravvivenza di
`ICS-03b`).

La colonna **non si cancella**: sarebbe una porta a senso unico presa per ordine,
e i valori dentro sono il registro dei 17 timbri falsi per cui questa fase
esiste.

Riscritte anche: `number` (la guardia sta in due posti e difendono chiamanti
diversi), `conforms_to_rule` (ancora **scritto**, non piu' **letto**: il referto
delle divergenze era il suo unico lettore), e `divergences` (perde l'unico
produttore; l'importatore la lascia com'e' nata invece di scriverci una lista
vuota, che si leggerebbe come *misurato, e nessuna trovata*).

---

## Il referto del catalogo vivo (task 3)

**Versione assegnata dall'endpoint migrations: `20260820170701`**, nome
`20260820122000_refuse_renumber_comment`. Applicata alle
**2026-08-20T17:07:01Z** via `POST /v1/projects/{ref}/database/migrations` —
**l'endpoint migrations, non `/database/query`**, cosi' la history resta
veritiera. E' la **52ª** voce; la 51ª e' quella del piano 58-07.

Tutte le letture con `read_only: true`. Nessun token, project reference, URL o
host e' stato stampato.

### Il trigger, prima e dopo — **ancora installato, ancora `BEFORE UPDATE OF number`**

Letto da `pg_trigger`, con `pg_get_triggerdef`, alle 17:06:56Z e alle 17:07:05Z.
**Identico**:

```
production_plan_refuse_renumber  ·  tgenabled = O
CREATE TRIGGER production_plan_refuse_renumber BEFORE UPDATE OF number
  ON public.production_plan FOR EACH ROW
  EXECUTE FUNCTION refuse_production_plan_renumber()
```

### I conteggi di riga, prima e dopo — **identici**

| tabella | 17:06:56Z | 17:07:05Z |
|---|---|---|
| `production_plan` | 2 | **2** |
| `production_piece` | 63 | **63** |
| `production_commitment` | 85 | **85** |
| `production_checklist_item` | 14 | **14** |
| `production_import_run` | 6 | **6** |

### Il commento, letto da `obj_description` DOPO l'applicazione

**981 → 1.581 caratteri.** Prima cominciava con *«Refuses any change to a
production_plan.number that is already set…»*. Adesso, testualmente:

> STILL INSTALLED, STILL REFUSING: any change to a production_plan.number that is
> already set — including erasing it, since IS DISTINCT FROM counts a null as a
> different value. WHAT CHANGED IS WHO REACHES IT (D-58-01, phase 58). The
> importer is now a MIRROR: it deletes the rows of one declared calendar and
> writes the file back, so it performs no UPDATE of number and this BEFORE UPDATE
> OF number trigger cannot fire on that path. The import's own protection lives
> in scripts/import-production-calendar.mjs, BEFORE it removes anything: a
> source_uid already stored that comes back from the file with a different
> progressivo makes the whole run refuse, exit 2 and write nothing (ICS-01b). A
> renumbering somebody wants passes an explicit re-authorisation argument,
> recorded in that run's report. THE COST IS DECLARED, NOT HIDDEN: a guard in the
> database survives the caller that forgot it, and a guard in application code
> does not. That sentence is still true and is now the price of D-58-01, which is
> the dated written authorisation meta-gates.md requires before a one-way switch
> is weakened. This trigger keeps defending EVERY OTHER WRITER, which is why it
> stays installed. It is NOT a watermark comparison: the archive holds numbers far
> below party_series.highest_assigned (D-44-08) and a watermark test would refuse
> the entire past. It does not re-implement bump_series_watermark, which fires on
> event_parties and is untouched. The message names the plan id and nothing else —
> no venue word, no title, no date — because a raised message reaches a log and
> this repository is public.

Il file di migration contiene **una sola istruzione**: `COMMENT ON FUNCTION`.
Nessun `CREATE OR REPLACE`, nessun `BEGIN; … COMMIT;` — un comando solo non ha
uno stato applicato a meta' da proteggere, e il corpo della funzione **non viene
ridichiarato**: una seconda copia di un corpo `SECURITY DEFINER` sarebbe una
seconda risposta alla domanda *cosa rifiuta questa funzione?*.

---

## Deviations from Plan

### 1. [Rule 2 — funzionalita' critica mancante] `--calendar` e' obbligatorio SEMPRE, non solo con `--apply`

- **Trovato durante:** Task 1
- **Il piano dice:** *«Obbligatorio con `--apply`»*.
- **Perche' e' stato stretto:** il modulo pretende `calendarKey` per costruire il
  piano, e un giro a vuoto **stampa lo scopo di una cancellazione**. Un giro a
  vuoto che dovesse inventarsi la chiave stamperebbe il piano di una corsa che
  nessuno potrebbe eseguire — ed e' anche il *nessun default* che lo stesso
  paragrafo pretende, applicato a entrambi i modi.
- **Effetto sul gate:** nessuno. I tre casi passano `--apply`.
- **Committed in:** `8dff1c9`

### 2. [Rule 2] La sorgente registrata e' richiesta anche con `--file`

- **Trovato durante:** Task 1
- **Il problema:** `--file` dice **da dove arrivano i byte**; la registrazione
  dice che **questo deploy specchia quel calendario**. Una chiave che nessuno ha
  registrato e' una chiave che nomina un calendario di cui questo deploy non
  risponde, e lanciarci sopra una cancellazione e' esattamente il fallimento per
  cui il gate esiste.
- **Costo dichiarato:** finche' il piano 58-10 non porta il registro vero, ogni
  corsa — anche a vuoto — richiede la variabile d'ambiente. Il valore e'
  registrato fra i segreti appena letto, e non e' mai stampato.
- **Committed in:** `8dff1c9`

### 3. [Rule 1 — difetto trovato misurando] Il rifiuto di rinumerare non nomina la sigla intera

Registrato per esteso nella sezione 6 qui sopra. In breve: la meta' per-sede di
una sigla e' l'abbreviazione di uno spazio, la migration della chiave di
calendario la rifiuta per iscritto, e **misurato** stampare la sigla intera
faceva andare rosso l'audit dell'output su un token. Restrittivo vince, e il
conflitto e' scritto nel codice invece che scelto in silenzio.

- **Committed in:** `87b9e07`

### 4. [Rule 2] Le prose di `absent_since` sono state **aggiunte** su due tabelle, non solo riscritte

- **Trovato durante:** Task 3
- **Il piano dice:** *«su ciascuna la prosa dice oggi che…»*. **Misurato: falso.**
  Solo `ProductionPlan` portava un docblock; su `ProductionPiece` e
  `ProductionCommitment` la colonna era nuda.
- **Cosa e' stato fatto:** tre prose, una piena e due che rimandano alla prima
  con la frase che conta per la loro tabella — sui pezzi, i 17 timbri falsi; sugli
  impegni, il giorno che si libera cancellando invece che marcando, e la ragione
  per cui la guardia del feed conta li' piu' che altrove.
- **Committed in:** `b4738e1`

### 5. [Rule 2] Le due liste di inserimento dei pezzi diventano una

- **Trovato durante:** Task 2
- **Perche':** la separazione fra pezzi scritti e proposte esisteva perche' un
  `upsert` chiavato su `source_uid` avrebbe duplicato ogni proposta a ogni giro —
  una proposta non ha `UID`, e Postgres ammette molti null in una colonna unica.
  Con lo scopo svuotato prima non c'e' `upsert`, quindi non c'e' la ragione della
  separazione. Gli inserimenti sono `insert` puri: dopo una cancellazione, un
  conflitto **e' un ritrovamento**, non uno stato da fondere.
- **Committed in:** `87b9e07`

### 6. [Rule 3 — condizione d'ambiente] `node_modules` e `docs/` collegati e rimossi

Il worktree non ha ne' l'uno ne' l'altro. `node_modules` collegato con un symlink
al checkout principale; per `docs/` una **directory vera** contenente un symlink
al solo file `.ics` — perche' un symlink **chiamato** `docs` non sarebbe ignorato
(`docs/` con la barra finale corrisponde solo a una directory vera). `git status`
verificato subito dopo la creazione e alla fine: **pulito in ogni momento**, ed
entrambi rimossi prima della chiusura. Nessuna credenziale e' stata **copiata**
nel worktree: le variabili sono state caricate in memoria per la durata di un
comando, da un file che vive nel checkout principale.

**Total deviations:** 6 — due restrizioni nel verso sicuro, un difetto trovato
misurando, una prosa aggiunta dove il piano ne presumeva una, una semplificazione
che discende dallo specchio, una condizione d'ambiente.
**Impact on plan:** nessuno scope creep. Nessun file fuori dai tre che il piano
elenca, piu' `deferred-items.md` e questo SUMMARY. **Nessun pacchetto
installato.**

---

## ⚠ Due conseguenze che vanno viste, non trovate dopo

### (a) `P-58-C` passo 5 non ha ancora uno strumento

Registrata per esteso in `deferred-items.md`, voce **3**, e ripetuta qui perche'
riguarda la procedura che deve esistere **prima del primo `--apply`**.

Questo piano costruisce due cose che sembrano la stessa: **l'istantanea su
disco**, e **il riaggancio dentro la corsa**, che legge il database prima di
cancellare e tiene le liste in memoria. `P-58-C` esiste per la corsa che **muore
a meta'**: li' la memoria e' andata e le righe non ci sono piu', quindi la
seconda corsa riscrive il file (passo 4, funziona) ma le sue liste di riaggancio
sono **vuote**. Il passo 5 chiede *«il percorso di ripristino dedicato»*, e
**quel percorso oggi non esiste**: nessun argomento legge un file di istantanea.

**Misurato oggi il caso e' vuoto — 0 spunte e 0 legami in produzione** — quindi
un rientro non perderebbe niente. **Diventa grave alla prima spunta.**

### (b) `production_plan_source_uid_unique` resta un `UNIQUE`, e il caso resta aperto

Segnalata dal piano 58-08 e **non chiusa qui, di proposito**: una riga di piano
esclusa dalla cancellazione non puo' essere reinserita, quindi **smette di
specchiare il file**. Il piano 58-09 la esegue alla lettera — il codice salta
l'inserimento della sopravvissuta — e non decide al posto del proprietario.

Misurato oggi: **2 piani, 0 legati.** Il caso e' vuoto e cambiera' il giorno
della prima serata annunciata.

---

## Il registro delle minacce, verificato

| Threat ID | Come e' stato verificato |
|---|---|
| **T-58-09-01** — manomissione / DoS via il `WHERE` | La chiave si valida contro `ics.CALENDAR_KEYS` **prima** che il codice raggiunga una query; nessun default; rifiuto con uscita `2` e senza echeggiare il valore ricevuto. Provato dai casi **R1** e **R2** del gate. Ogni `DELETE` porta la chiave come condizione dichiarata; quella dei piani porta in piu' la lista di identificativi, che **restringe soltanto** |
| **T-58-09-02** — manomissione del progressivo | `ICS-01b` prima della cancellazione, **provata per mutazione**: uscita `2`, categoria `renumber_refused`, zero scritture; riautorizzazione esplicita registrata nel referto. Il trigger resta installato — letto da `pg_trigger` dopo l'applicazione |
| **T-58-09-03** — serata pubblicata orfanata | Le sopravvissute non entrano nella lista di cancellazione e il referto le conta, separando *sopravvissuta* da *sopravvissuta a un'assenza*. Misurato oggi: 0 legate in produzione |
| **T-58-09-04** — divulgazione via l'istantanea | Scritta solo dopo che `git check-ignore` risponde `0` **sul file**; rifiuto `snapshot_path_not_ignored` altrimenti; nessun argomento puo' spostarne il percorso. Le due risposte di git sono state misurate in questo worktree |
| **T-58-09-05** — divulgazione via `error.details` | `/usr/bin/grep -n "error.details\|console.error(error)"` → **nessuna occorrenza**. Ogni `catch` e ogni ramo d'errore passa da `describe()`, che estrae `code` e `message` |
| **T-58-09-06** — divulgazione via il transcript | L'audit dell'output della corsa e' stato **eseguito sul file vero**: `✓ 27 residual title token(s), 0 of them in what this run printed · 0 four-digit years`, su tutti e cinque i giri (a vuoto, con adozione, sotto mutazione, con riautorizzazione, dopo la revoca della mutazione). E ha fatto il suo lavoro: e' andato **rosso** su un token quando il rifiuto stampava la sigla intera |
| **T-58-09-07** — ripudio del commento del trigger | Riscritto e **letto dal catalogo vivo** con `obj_description`: 981 → 1.581 caratteri, testo riportato per intero qui sopra |
| **T-58-09-SC** — catena di fornitura | **Nessun pacchetto installato**, `package.json` immutato |

## Threat Flags

Nessuna nuova superficie di sicurezza raggiungibile dal prodotto. Lo script non
ha alcun percorso d'esecuzione dal prodotto — non c'e' superficie di caricamento,
per la meta' di `D-44-26` che **resta in piedi** — non apre endpoint, non crea
policy e non altera `GRANT`. La migration porta un solo `COMMENT`.

⚠ **Una superficie nuova esiste ed e' dichiarata, in attesa del piano 58-10:** la
variabile d'ambiente che registra l'indirizzo di un calendario. Questo piano ne
legge **solo la presenza** e la registra fra i segreti; **non la contatta**. Le
cinque difese di D-58-07 sono agganciate a `ICS-10` e vanno soddisfatte li'.

Questo documento non porta un solo `ics_alias`, `source_uid`, titolo, nome
proprio, data di serata o nome di spazio: solo conteggi, nomi di tabella, nomi di
vincolo, categorie di rifiuto e nomi di argomento.

## Known Stubs

**Uno, dichiarato, e discende dall'ordine delle onde.**

Il passo 3 dei rifiuti — `missing_feed_source` — verifica che una sorgente sia
**registrata**, e nient'altro. **Leggere da quell'indirizzo e' il piano 58-10**
(`ICS-09`, `ICS-10`, con la guardia del feed). Finche' non esiste, i byte
arrivano ancora da un file su disco, e **il referto lo dice** invece di lasciarlo
dedurre:

```
✓ a source is registered for this calendar (never printed, redacted everywhere)
  ⚠ reading FROM it is plan 58-10's. This run still takes its bytes from disk.
```

Nessun valore vuoto cablato, nessun testo segnaposto, nessun componente senza
sorgente dati: questo piano non tocca alcuna superficie.

## Il gate della verifica, in un repo senza test

**Non esiste un test runner per il prodotto**, quindi niente qui e' «verificato
perche' i test passano». Cio' che e' stato eseguito:

| Comando | Esito | Nota |
|---|---|---|
| `npm run build` | **0** | include il typecheck di Next. Eseguito tre volte, dopo ogni task |
| `node scripts/verify-mirror-guards.mjs` | **1** | `R1`, `R2`, `R3` **verdi** — erano rossi; `V0` resta rosso (`guard.ts` e' del 58-10); `R4` rimandato e dichiarato |
| `npm run verify:ics` | **0** | **nove** controlli su nove, sul file vero, con `docs/` collegato temporaneamente |
| `npm run verify:ics-reachable` | **0** | 7 moduli, 42 simboli esposti, 20 su 20 attesi |
| `node --check` sullo script | **0** | dopo ogni riscrittura di blocco |
| `npm run verify` | **1** | **identico alla linea di base** — vedi sotto |

**Piu' una prova che nessun gate sintetico puo' dare: cinque giri a vuoto
dell'importatore sul calendario vero, contro il database di produzione.**
`--dry-run` non apre transazioni, non inserisce la riga di registro e non scrive
nulla — e' il modo in cui il piano dice che si puo' esercitare. Le sole
istruzioni emesse sono state `SELECT`.

| Giro | Argomenti | Esito |
|---|---|---|
| 1 | `--dry-run --calendar rsnt` | `IMPORT_DRY_RUN_OK`, uscita **0** — 0 righe nello scopo, perche' nessuna porta ancora la chiave |
| 2 | `+ --adopt-unkeyed-rows` | `IMPORT_DRY_RUN_OK`, uscita **0** — 150 righe raccolte, contate e nominate nel referto |
| 3 | `+` mutazione della guardia | `REFUSED [renumber_refused]`, uscita **2**, *nothing was written* |
| 4 | `+ --reauthorise-renumbering` | uscita **0**, la riautorizzazione **scritta** nel referto |
| 5 | mutazione rimossa | `IMPORT_DRY_RUN_OK`, uscita **0** |

**`npm run verify`, prima e dopo, per confronto e non per pretesa di verde:**

| | prima (base `703c095`) | dopo (`664b08d`) |
|---|---|---|
| uscita | **1** | **1** |
| falliti | `verify:touch-targets` | `verify:touch-targets` |
| rifiutati | `verify:capabilities`, `verify:section-export` | idem |

`verify:touch-targets` e' rosso su
`src/app/(public)/events/[slug]/menu/GuestTokenDisplay.tsx` **dal commit di base
della fase 58** — due `<button>` senza altezza incondizionata. **Fuori
perimetro**, non riparato.

I due rifiuti sono la condizione onesta di un worktree senza `.env.local`.
`verify:mirror-guards` **non** e' in `package.json` e quindi non entra
nell'aggregato: e' la decisione del piano 58-01, non toccata qui.

## Self-Check: PASSED

File dichiarati, verificati sul disco:

- `scripts/import-production-calendar.mjs` — FOUND (2.301 righe)
- `src/types/database.ts` — FOUND
- `supabase/migrations/20260820122000_refuse_renumber_comment.sql` — FOUND
- `.planning/phases/58-il-calendario-si-legge-come-lo-si-scrive/deferred-items.md` — FOUND

Commit dichiarati, verificati in `git log`:

- `8dff1c9` — FOUND
- `87b9e07` — FOUND
- `b4738e1` — FOUND
- `664b08d` — FOUND

Nessuna cancellazione di file in alcuno dei commit
(`git diff --diff-filter=D` vuoto su tutti). `git status` pulito alla chiusura,
con il symlink di `node_modules` e la directory `docs/` rimossi.

Asserzioni dichiarate, rieseguite:

```
/usr/bin/grep -c "calendar_key"           scripts/import-production-calendar.mjs  →  21
/usr/bin/grep -c "record_checklist_tick"  scripts/import-production-calendar.mjs  →   0
/usr/bin/grep -c "P-58-C"                 scripts/import-production-calendar.mjs  →   8
/usr/bin/grep -c "error.details"          scripts/import-production-calendar.mjs  →   0
/usr/bin/grep -c "console.error(error)"   scripts/import-production-calendar.mjs  →   0
/usr/bin/grep -c "absent_since"           src/types/database.ts                   →   5
/usr/bin/grep -c "NOTHING WRITES THIS COLUMN ANY MORE"  src/types/database.ts     →   4
```

Le quattro cancellazioni, nell'ordine, lette dal file:

```
1892  production_checklist_item .delete().in("plan_id", scopedPlanIds)
1897  production_piece          .delete().eq("calendar_key", calendarKey)
1910  production_plan           .delete().eq(...).in("id", planIdsToRemove)
1918  production_commitment     .delete().eq("calendar_key", calendarKey)
```

⚠ **Nota per chi rieseguira' questi comandi:** i moduli sotto
`src/lib/production/ics/` contengono **byte NUL** preesistenti (i separatori di
chiave dei letterali di join). Un `grep` che tratta un file come binario salta il
conteggio **in silenzio**: si usa `/usr/bin/grep`, mai `grep` nudo.
