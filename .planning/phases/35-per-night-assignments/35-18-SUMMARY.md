---
phase: 35-per-night-assignments
plan: 18
subsystem: supabase-data
tags: [event-media, per-night, trigger, rls, backfill, security-definer, wave-5]

# Dependency graph
requires:
  - plan: 35-02
    provides: "la disciplina di idempotenza di questa fase (WR-04), e la forma dell'intestazione che dichiara come fallisce ogni meta' applicata"
  - plan: 35-03
    provides: "`private.has_capability(p_capability, p_party_id)` — il braccio per-notte, che confronta due identificatori e quindi non puo' essere soddisfatto da `NULL`"
  - plan: 35-06
    provides: "il terzo asse del seed e la cattura `35-06-final`, che e' la cattura contro cui questo piano si misura"
provides:
  - "`public.event_media.party_id` — la serata sulla riga, con la sua FK `ON DELETE CASCADE` e il suo indice"
  - "il trigger `event_media_require_party` — nessuna riga nuova senza serata, **anche** per il service role"
  - "`private.party_event_id(uuid)` — a quale evento appartiene una serata, risposto come FATTO e non come lettura del chiamante"
  - "`EventMediaRow` con `party_id: string | null` e la regola di NULL scritta accanto al campo"
  - "la voce di sonda di `event_media` con una coppia (evento, serata) coerente **per costruzione**"
  - "la cattura `35-18`: 72 policy, 23 tabelle con RLS, 322 celle di lettura, 966 sonde di scrittura"
affects: [35-14, 35-16, 35-20, 35-21]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "una sottoquery dentro il corpo di una policy legge con i privilegi del CHIAMANTE: un `EXISTS` in linea trasforma un controllo sulla FORMA della riga in un controllo su CHI la scrive — misurato, non dedotto"
    - "`SECURITY DEFINER` non e' un'ottimizzazione: e' l'unico modo perche' un predicato di policy non dipenda da cosa il soggetto controllato ha il diritto di leggere"
    - "una guardia che deve valere anche per il service role e' un trigger o un vincolo, mai una policy — e la differenza si prova togliendo la guardia e riprovando"
    - "un backfill non dichiara quante righe tocca: le **stampa** al momento dell'applicazione, perche' un numero scritto in un piano non e' un numero misurato in produzione"
    - "l'idempotenza di una colonna e' il CONTRARIO di quella di un vincolo: rimuovere e riaggiungere una colonna butterebbe via il backfill a ogni riesecuzione"

key-files:
  created:
    - supabase/migrations/20260809004500_event_media_party_id.sql
    - .planning/phases/32-capability-model-in-the-database/baseline/32-BASELINE-policies.container.35-18.json
    - .planning/phases/32-capability-model-in-the-database/baseline/32-BASELINE-reads.container.35-18.json
    - .planning/phases/32-capability-model-in-the-database/baseline/32-BASELINE-writes.container.35-18.json
  modified:
    - scripts/rls-baseline.mjs
    - src/types/database.ts

key-decisions:
  - "Il controllo di coerenza (evento, serata) passa da `private.party_event_id`, SECURITY DEFINER, **non** da un `EXISTS` in linea come chiedeva il piano. Misurato: con l'`EXISTS` in linea la stessa identica riga risponde `ok:1` a un master e `42501` a un member, perche' la sottoquery legge `event_parties` con i privilegi del chiamante e `event_parties_select_published` mostra solo gli eventi pubblicati. Sarebbe stato un controllo sulla forma della riga travestito da controllo su chi scrive — cioe' esattamente cio' che il piano vieta"
  - "Il backfill riempie solo gli eventi con **esattamente una** serata; gli altri restano `NULL`. Attribuire una foto scattata dentro una sede segreta alla serata `main` sarebbe inventare la notte, e la notte e' cio' che dice se quella sede era segreta"
  - "Il numero di righe toccate non e' dichiarato: e' **stampato** da un `RAISE NOTICE` al momento dell'applicazione, e la query per leggerlo prima e' scritta nella migration. Nessun conteggio misurato su un portatile e' un conteggio della produzione"
  - "`BEFORE INSERT` e mai un vincolo di tabella: un `CHECK` dichiarato non-validato non viene verificato sulle righe esistenti ma **viene comunque applicato a ogni UPDATE**, e romperebbe la moderazione di ogni riga legacy. Misurato: `updateMediaStatus` su righe con `party_id` NULL risponde `ok:2`"
  - "`ON DELETE CASCADE` e non `RESTRICT`: `event_media.event_id` e' gia' in cascata su `events`, e con `RESTRICT` la cancellazione di un evento fallirebbe per colpa di una riga di media — cioe' questa migration cambierebbe il comportamento della cancellazione, che non e' in nessuno degli otto requisiti"
  - "`EventMedia` diventa un alias di `EventMediaRow`: due forme per una tabella divergono, e questa aveva gia' iniziato. Misurato che non ha nessun lettore in `src/` prima di collassarla"

# Metrics
metrics:
  duration: "~75 min"
  completed: 2026-08-09
  tasks_completed: 3
  tasks_total: 3
  checkpoint_open: false
---

# Fase 35 Piano 18: la serata sulla riga, e il NULL che non puo' diventare un jolly — Summary

`public.event_media` porta `event_id` e non la serata. Con una chiave per-notte
che scrive su una tabella per-evento, essere assegnati come «photo» a **una**
notte apre il caricamento su **ogni** notte di quell'evento — e il Criterio di
Successo 1 della ROADMAP dice, testualmente, *«nothing changes for them on any
other night»*. Questo piano rende vera quella frase.

**La migration non e' applicata in produzione.** E' la **dodicesima riga** della
coda di `35-HUMAN-UAT.md` e si applica a mano. Ogni misura qui sotto viene da un
container `postgres:17.6` costruito con lo shim, lo schema base al commit
iniziale e le migration in ordine.

---

## Cosa e' stato fatto

| Task | Nome | Commit | File |
|---|---|---|---|
| 1 | La colonna, la FK, l'indice, il backfill, il trigger, la policy | `1ccc2fd` | la migration |
| 2 | La sonda con una coppia coerente per costruzione | `79f25bd` | `scripts/rls-baseline.mjs` + le tre catture `35-18` |
| 3 | `EventMediaRow` e la regola di NULL | `6ced627` | `src/types/database.ts` |

**Lingua.** I commenti della migration e del tipo sono in inglese, come i loro
template dichiarati; il paragrafo sull'idempotenza resta in italiano, come nel
suo precedente (`35-05`, `35-19`). Una sola frase italiana entra in
`src/types/database.ts`, ed e' dichiarata come deliberata: e' la frase che non
deve essere fraintesa.

---

## La correzione che questo piano registra invece di ripetere

Il piano dice — e la ricerca prima di lui — che `event_parties` porta
`UNIQUE (event_id, type)` su tre valori, quindi **al massimo tre serate per
evento**. **Non e' piu' vero, e lo si scopre applicando le migration in ordine.**

`20260226300000_multi_sub_events.sql:11-17` ha rimosso il vincolo unico, il
`CHECK` e la **colonna** `type`, e ha dato a ogni serata il suo `date` (`:20-27`)
proprio perche' una sotto-serata possa stare su un giorno diverso dall'evento che
la contiene — la stessa lezione da cui e' nato il difetto delle 24 ore di questa
fase.

**Conseguenza:** un evento puo' avere un numero arbitrario di serate, quindi il
raggio d'azione di una chiave per-notte scritta su una tabella per-evento era
**l'intero evento**, non tre serate. Il difetto era piu' grande di come e'
descritto, non piu' piccolo.

Come e' emerso, e non e' un dettaglio metodologico: un fixture scritto contro la
forma vecchia — `insert into public.event_parties (…, type, …)` — ha fatto
fallire il container con *«column "type" of relation "event_parties" does not
exist»*. La citazione era stata presa da un file reale, ma da un file **superato**
da un altro file reale: e' il `Gate documentazione datata` di
`ai-engineering.md` colto sul fatto.

Seconda citazione superata, stessa natura: il piano riporta la policy di
inserimento nella forma di `20260807010000:198-203`. Il testo vivo e' quello
**avvolto** di `20260807020000:103-108` (`(select auth.uid())` invece di
`auth.uid()`). La policy e' stata riscritta partendo da quest'ultimo.

---

## Task 1 — la migration, misurata riga per riga

Tutte le misure vengono da un container costruito **fermandosi prima** di questa
migration, in modo che esistano righe **legacy** vere prima che la colonna
esista: quattro righe di `event_media`, due su un evento con **una** serata e due
su un evento con **tre**.

### Il backfill riempie solo dove la risposta e' un fatto

```
FIRST APPLY notice:  event_media.party_id backfill: 2 row(s) given their night
                     (single-night events); 2 row(s) left NULL = legacy,
                     event-scope (multi-night events, where a night would have
                     been invented).

  proof-one-night    proof-1  party_id = …0000a1
  proof-one-night    proof-2  party_id = …0000a1
  proof-three-nights proof-3  party_id = NULL
  proof-three-nights proof-4  party_id = NULL
```

`…0000a1` **e'** l'unica serata dell'evento a una notte: la riga non e' una
scelta, e' l'unica possibilita'. Le due righe dell'evento a tre notti restano
`NULL`, ed e' la decisione: attribuirle a `main` sarebbe inventare un fatto.

### L'idempotenza, provata eseguendo il file due volte

```
SECOND APPLY notice: event_media.party_id backfill: 0 row(s) given their night;
                     2 row(s) left NULL …
```

Exit 0, zero righe riscritte. Questa coda si applica a mano, una riga alla volta:
senza `DROP … IF EXISTS`, `IF NOT EXISTS` e il `party_id IS NULL` nella `WHERE`,
una seconda esecuzione solleverebbe `42710` e lascerebbe **non applicata tutta la
coda che segue** (WR-04).

**L'eccezione dichiarata:** per la **colonna** si scrive `ADD COLUMN IF NOT
EXISTS` e non si rimuove prima, perche' rimuoverla butterebbe via il backfill a
ogni riesecuzione. E' la disciplina di questa fase applicata al contrario, ed e'
scritta nel file come eccezione e non lasciata come apparente dimenticanza.

### Quante righe tocca in produzione: la migration non lo dichiara, lo stampa

**Non ho accesso alla produzione da questo worktree, e un conteggio misurato su
un portatile non sarebbe un conteggio della produzione.** Un backfill e' una
scrittura su righe reali, quindi la scala non poteva restare un'affermazione:

- la migration emette un `RAISE NOTICE` al momento dell'applicazione, nel
  terminale di chi la applica, con **quante righe ha riempito** e **quante ha
  lasciato `NULL`** — cioe' la dimensione dell'insieme legacy che ogni lettore
  futuro incontrera';
- la stessa coppia di numeri si puo' leggere **prima** di applicare qualsiasi
  cosa, con la query scritta per esteso nella sezione 3 del file.

In un prodotto senza error tracking, un effetto osservabile e' l'unica differenza
fra «e' successo» e «qualcuno lo sa».

### Il trigger vale sulla connessione che nessuna policy raggiunge

| Sonda | Esito |
|---|---|
| INSERT **privilegiato**, senza serata | **`23514`** (sollevato dal trigger) |
| INSERT **privilegiato**, con serata | `ok:1` |

La RLS non si applica al service role; il trigger si'. E' la stessa frase che
`20260809000000:302-304` scrive una tabella piu' in la', per la stessa ragione.

### Prova per mutazione B — senza il trigger, la scrittura passa

Il rifiuto sopra dev'essere **del trigger**, non di qualcos'altro che si trova
sulla stessa strada. Quindi il trigger e' stato **tolto**, e la mutazione e'
stata **asserita come applicata prima di leggerne l'esito**:

```
MUTATION B applied?  trigger rows now 0
  privileged INSERT without a night   -> ok:1        ← passa
MUTATION B reverted? trigger rows now 1
  privileged INSERT without a night   -> 23514       ← rifiuta di nuovo
```

Senza il trigger la riga senza serata entra. Con il trigger no. Il segnale non e'
ambiguo, ed e' asserito nelle due direzioni.

### Le righe legacy restano leggibili e moderabili

| Sonda | Esito |
|---|---|
| `master`, `UPDATE status` su righe con `party_id` **NULL** | **`ok:2`** |
| `master`, `UPDATE status` su righe con `party_id` valorizzato | `ok:2` |

E' la ragione per cui la forma scelta e' un trigger `BEFORE INSERT` e **non** un
vincolo di tabella dichiarato non-validato: quel vincolo non verrebbe verificato
sulle righe esistenti ma **verrebbe applicato a ogni UPDATE**, e romperebbe la
revisione di ogni file caricato prima di questa fase. La frase sta nel file,
perche' senza la frase qualcuno «semplifichera'» il trigger in quel vincolo.

---

## La deviazione che vale piu' di tutto il resto: l'`EXISTS` in linea

Il piano chiede, al passo 5, *«un `EXISTS` che verifica che quella serata
appartenga a questo `event_id` leggendo `public.event_parties`»*, e chiede — nello
stesso piano — che la matrice di scrittura **non si muova**. **Le due cose sono
incompatibili, e la seconda ha ragione.**

Una sottoquery dentro il corpo di una policy e' valutata con i privilegi del
**chiamante**, quindi vede `public.event_parties` attraverso le sue policy di
lettura: `event_parties_select_published`
(`20260225150000_party_architecture.sql:30-37`) mostra solo le serate di eventi
pubblicati, mentre `event_parties_select_admin` le mostra tutte a chi ha
`staff.manage`.

### Prova per mutazione A — la stessa riga, due risposte diverse

La policy e' stata **sostituita** con la forma in linea che il piano descrive, e
la sostituzione e' stata **asserita prima** di leggerne l'esito:

```
MUTATION A applied?  with_check now contains EXISTS: true
  member, coppia coerente, evento NON pubblicato  -> 42501      ← rifiutato
  master, coppia coerente, evento NON pubblicato  -> ok:1       ← ammesso
MUTATION A reverted? EXISTS gone: true
  member, coppia coerente, evento NON pubblicato  -> ok:1       ← ammesso
```

**La stessa identica riga.** Con l'`EXISTS` in linea un controllo sulla **forma**
della riga diventa un controllo su **chi la scrive** — e rifiuta esattamente i
membri per cui questa tabella esiste, in silenzio, con un `42501` che si legge
come una decisione di accesso e non lo e'.

### La forma scelta

`private.party_event_id(p_party_id uuid) RETURNS uuid`, `STABLE`,
`SECURITY DEFINER`, `SET search_path = ''`, `GRANT EXECUTE … TO authenticated,
anon`. E' la stessa risposta che `private.has_capability` da' alla stessa domanda
(`20260807000000_capability_model.sql:186-190`): **un predicato di policy non
deve dipendere da cosa il soggetto controllato ha il diritto di leggere.**

La policy chiude cosi' — due congiunzioni aggiunte, il braccio del *chi*
identico carattere per carattere:

```sql
WITH CHECK (
  ((select auth.uid()) = uploaded_by)
  AND (select private.has_capability('membership.active'))
  AND (party_id IS NOT NULL)
  AND ((select private.party_event_id(party_id)) = event_id)
)
```

Fallisce chiuso: una serata inesistente fa restituire `NULL`, `NULL = event_id`
vale `NULL`, e un `WITH CHECK` che non e' `TRUE` rifiuta.

### Le quattro celle che dicono cosa il piano fa e cosa non fa

| Sonda, persona `member/approved` | Esito | Cosa prova |
|---|---|---|
| coppia coerente, evento **non pubblicato** | **`ok:1`** | il controllo e' sulla forma, non su chi scrive (T-35-96 non e' costato l'accesso a nessuno) |
| serata di **un altro** evento | **`42501`** | T-35-96 mitigato |
| nessuna serata | **`23514`** | T-35-95 mitigato, e il trigger scatta prima della policy |
| `uploaded_by` di qualcun altro | **`42501`** | il braccio del *chi* e' intatto |

---

## Task 2 — la sonda, e la non-differenza che era dichiarata prima

`{{events}}` e `{{event_parties}}` sono risolti **indipendentemente** — un
`min(id::text)` privilegiato per tabella — quindi non c'e' niente che li
correli: con la voce vecchia la sonda avrebbe composto una coppia incoerente e
ogni cella di inserimento sarebbe diventata un rifiuto **per il motivo
sbagliato**.

La coppia si rende coerente **dentro** il payload: `party_id` prende il
segnaposto, `event_id` si deriva da lui con
`(select private.party_event_id({{event_parties}}))`. **La derivazione e' una
funzione e non una sotto-selezione per la stessa ragione della deviazione sopra**:
una sotto-selezione avrebbe dato l'evento a un master e `NULL` a un member, cioe'
un `23502` per una persona e una sonda vera per un'altra. Con la funzione
`SECURITY DEFINER` il valore e' **lo stesso per ogni persona**, che e'
l'invariante che rende la matrice una matrice.

`PROBE_REFERENCE_TABLES` e `resolveProbeReferences`: **invariati**, verificato con
`git diff | grep -c '^[-+].*PROBE_REFERENCE_TABLES'` = 0.

### L'esito, dichiarato prima e verificato dopo

| Confronto | Esito |
|---|---|
| **B3**, 966 celle, `35-06-final` → `35-18` | **nessuna differenza** — `CAP-03: clean` |
| **B2**, 322 celle, stesse due catture | **nessuna differenza** |
| **B1**, 72 policy, stesse due catture | **una sola** differenza, su `event_media_insert_member`; **71 policy invariate** |

La matrice di scrittura di `event_media` e' **identica**: questo piano cambia la
**forma** della riga, non **chi** puo' scriverla. Se fosse cambiata, il piano
avrebbe fatto piu' di quello che dichiara e sarebbe stato da fermare.

La differenza di B1 e' l'unica policy che questa migration tocca, ed era
dichiarata prima di misurarla. Il comparatore la classifica
`predicate_unexplained` perche' la whitelist D-23 conosce due sole
trasformazioni: e' il comportamento corretto — fallisce rumorosamente su un
cambio reale invece di assorbirlo.

### Perche' il confronto e' contro `35-06-final` e non contro `35-19`

Contro `35-19` il comparatore riporta **12 difetti `b2_count_changed`** su
`profiles` (12 → 15 righe) e `party_assignments` (2 → 5). **Non vengono da questo
piano**, che tocca solo `event_media`: vengono dai tre commit del piano 35-06
(`453a766`, `6539123`, `6f40458`) che hanno aggiunto il **terzo asse** al seed —
tre account e tre assegnazioni — e che sono atterrati **dopo** che il piano 35-19
aveva preso la sua cattura in un worktree piu' vecchio.

`35-06-final` e' la cattura presa **sullo stesso harness** su cui gira questa, ed
e' quindi l'unico confronto che misura una differenza invece di misurare una
divergenza di harness. La cosa e' segnalata sotto come constatazione fra piani.

---

## Task 3 — il tipo, e il limite che un build verde non copre

`EventMediaRow` con `party_id: string | null` e la regola scritta accanto al
campo, nella **stessa formulazione** del `COMMENT ON COLUMN` e del commento del
trigger — tre posti, perche' il prossimo lettore arriva da uno dei tre, e due
formulazioni della stessa regola sono due regole.

La frase che conta e' scritta due volte, in inglese e in italiano:
**`null` non significa «tutte le serate»**. E' l'unica lettura sbagliata che il
tipo da solo non impedisce, ed e' quella che trasformerebbe un permesso
circoscritto a una sera in uno illimitato.

E il limite, dichiarato nel file: nessuno dei quattro client Supabase e'
tipizzato con un generico `Database` (`src/lib/supabase/server.ts:7`), quindi
`EventMediaRow` e' **un catalogo per chi legge**, non un vincolo che il
compilatore applica alle query. **Un `npm run build` verde non dimostra che una
query scriva `party_id`.** Lo dimostra il database, rifiutando l'insert.

---

## Deviazioni dal piano

### 1. [Rule 1 — bug] L'`EXISTS` in linea della policy restringe **chi** puo' scrivere

- **Trovata durante:** task 1, scrivendo il passo 5.
- **Il fatto:** una sottoquery dentro una policy legge con i privilegi del
  chiamante. Con l'`EXISTS` in linea, `member` → `42501` e `master` → `ok:1`
  **sulla stessa riga**.
- **Cosa e' stato fatto:** `private.party_event_id(uuid)`, `SECURITY DEFINER`,
  e la policy confronta il risultato con `event_id`.
- **Provato per mutazione**, con la mutazione asserita come applicata prima di
  leggerne l'esito (sezione sopra).
- **Commit:** `1ccc2fd`

### 2. [Rule 1 — bug] La stessa trappola nel payload di sonda

- **Trovata durante:** task 2.
- **Il fatto:** il piano chiede una **sotto-selezione** che legge `event_id` da
  `public.event_parties`. Girerebbe sotto le policy della persona, quindi
  darebbe `NULL` a un member e un `23502` invece di una sonda.
- **Cosa e' stato fatto:** la stessa funzione `SECURITY DEFINER`. Il criterio di
  accettazione *«contiene una sotto-selezione che legge `event_id` da
  `public.event_parties`»* e' quindi soddisfatto nel suo **intento** — una coppia
  coerente per costruzione, uguale per ogni persona — e non nella sua lettera.
- **Commit:** `79f25bd`

### 3. [Rule 3 — bloccante] Le due catture del piano sono state collassate in una

- **Il fatto:** il task 1 chiede `--phase-point=35-18` **prima** del task 2. Non
  e' eseguibile: `scripts/container/seed.mjs` materializza `PROBE_PAYLOADS` in
  righe reali, quindi con la migration applicata e il payload vecchio il seed
  stesso viene rifiutato dal trigger e il container non si costruisce. E' la
  prova, per via traversa, che il trigger vale anche sulla connessione
  privilegiata.
- **Cosa e' stato fatto:** una sola cattura, `35-18`, presa dopo entrambe le
  modifiche. `35-18-probe` **non esiste**: due nomi per gli stessi identici byte
  farebbero credere che siano stati misurati due stati.
- **Commit:** `79f25bd`

### 4. [Rule 2 — un tipo che mente] `EventMedia` era una seconda forma della stessa tabella

- **Il fatto:** `EventMedia` precede `party_id` e dichiarava `uploaded_by` non
  nullabile dove la colonna lo e' (`20260225120000_phase7_media.sql:8`). Con la
  colonna nuova sarebbero diventate due descrizioni divergenti di una tabella.
- **Cosa e' stato fatto:** e' diventata un **alias** di `EventMediaRow`.
  Misurato prima: `grep -rn "EventMedia" src/` non trova nessun lettore fuori da
  `src/types/database.ts`, quindi la correzione non rompe niente.
- **Commit:** `6ced627`

### 5. [Rule 3 — bloccante] Due citazioni del piano erano superate

- `UNIQUE (event_id, type)` e il tetto di tre serate: rimossi da
  `20260226300000_multi_sub_events.sql:11-17`. Scoperto perche' il container ha
  rifiutato un fixture scritto contro la forma vecchia.
- Il testo della policy di inserimento: quello vivo e' la forma avvolta di
  `20260807020000:103-108`, non `20260807010000:198-203`.
- **Cosa e' stato fatto:** entrambe corrette **dentro** la migration, con la
  ragione accanto.
- **Commit:** `1ccc2fd`

### 6. [Rule 3 — ambiente] Il worktree non aveva `node_modules`

Un symlink al `node_modules` del repository principale. `/node_modules` e' in
`.gitignore`: nessuna modifica al repository, `git status` resta pulito.

---

## Verifiche eseguite

| Verifica | Comando / misura | Esito |
|---|---|---|
| Typecheck | `npm run build` | **PASS** — `✓ Compiled successfully` |
| Colonna idempotente | `grep` su `ADD COLUMN IF NOT EXISTS party_id` | **PASS** — 1 |
| Nessuna rimozione di colonna | `grep -c "DROP COLUMN"` | **PASS** — **0** |
| FK verso le serate | `grep "REFERENCES public.event_parties"` + `ON DELETE CASCADE` | **PASS** |
| Trigger su INSERT | `grep "BEFORE INSERT ON public.event_media"` | **PASS** — 1 |
| Nessun trigger su UPDATE della tabella | grep della forma corrispondente | **PASS** — **0** |
| Nessun vincolo non-validato | `grep -c "NOT VALID"` | **PASS** — **0** |
| Il significato di NULL e' nel database | `grep "COMMENT ON COLUMN public.event_media.party_id"` + `legacy` | **PASS** — 1 e 7 |
| Backfill rieseguibile | `grep "party_id IS NULL"` | **PASS** — 5 |
| Wrapper sul resolver | `grep -i "select private.has_capability"` | **PASS** — 2 |
| **Una sola** policy toccata | `grep -c "CREATE POLICY"` | **PASS** — **1**, ed e' `event_media_insert_member` |
| Le altre policy sono intatte | `pg_policy` riletto in container | **PASS** — le altre 6 di `event_media` invariate |
| **Backfill: solo i fatti** | container, 2 eventi (1 e 3 serate), 4 righe legacy | **PASS** — 2 riempite, 2 lasciate NULL |
| **Idempotenza** | seconda applicazione dello stesso file | **PASS** — exit 0, 0 righe riscritte |
| **Il trigger vale sul privilegiato** | INSERT senza serata, connessione superuser | **PASS** — `23514` |
| **Mutazione B: il trigger e' cio' che rifiuta** | trigger rimosso (asserito: 0 righe) e rimesso (1) | **PASS** — `ok:1` senza, `23514` con |
| **La moderazione legacy non si rompe** | `master` aggiorna `status` su righe con `party_id` NULL | **PASS** — `ok:2` |
| **Mutazione A: l'`EXISTS` in linea sposta il *chi*** | policy sostituita (asserito: contiene `EXISTS`) e ripristinata (asserito: non lo contiene) | **PASS** — member `42501` / master `ok:1` con; member `ok:1` senza |
| Serata di un altro evento | sonda `member` | **PASS** — `42501` |
| `uploaded_by` altrui | sonda `member` | **PASS** — `42501` |
| Nessuna riga lasciata dalle sonde | conteggio riletto a fine script | **PASS** — 4 = 4 |
| `PROBE_REFERENCE_TABLES` invariato | `git diff \| grep -c` | **PASS** — **0** |
| La cattura di baseline | `npm run baseline:container -- --phase-point=35-18` | **PASS** — 50 migration, 23 tabelle RLS, 322 letture, 966 scritture, 1/1 sonda di vincolo |
| **B3 non si muove** | `baseline:compare --only=B2,B3` `35-06-final` → `35-18` | **PASS** — `CAP-03: clean`, 966 + 322 celle, zero differenze |
| B1 si muove di una sola policy | `baseline:compare --only=B1` | **PASS come previsto** — 71 invariate, 1 `predicate_unexplained` su `event_media_insert_member` |
| Nessun file cancellato | `git diff --diff-filter=D HEAD~3 HEAD` | **PASS** — nessuno |

### Cosa queste verifiche NON provano

- **Nessuna migration di questa fase e' applicata in produzione.** Questa e' la
  dodicesima riga della coda manuale. Che gli oggetti si costruiscano in un
  container non dice che il prodotto funzioni con essi.
- **`npm run build` verde non dice niente sulla migration.** I tipi vengono da
  `src/types/database.ts`, non dal database vivo. Il verde e' esatto esattamente
  come lo era prima.
- **Non e' stato misurato quante righe il backfill tocca in produzione**, perche'
  da qui non si legge la produzione. La migration stampa i due numeri quando la
  si applica, e la query per leggerli prima e' scritta dentro il file. Finche'
  qualcuno non la esegue, la scala dell'insieme legacy **e' ignota** — e va detto
  invece di lasciar credere il contrario.
- **Nessun test del prodotto e' stato eseguito, perche' non ne esistono.**
- **Nessuna superficie scrive ancora `party_id`.** Che il database lo pretenda e'
  misurato; che qualcuno lo mandi e' materia del piano che insegna la serata a
  `registerMedia`.
- **`private.party_event_id` non e' stata esercitata su una serata inesistente in
  produzione.** Il ramo che fallisce chiuso e' provato in container
  (`42501` sulla serata di un altro evento), non su dati reali.

---

## La finestra che questa riga apre, dichiarata invece che scoperta

Applicata questa migration, **un insert su `public.event_media` che non nomina
una serata viene rifiutato** — e l'unico scrittore che il prodotto ha oggi,
`registerMedia` (`src/app/(public)/events/[slug]/actions.ts:84-95`), non la
nomina. Il piano 35-20 registra che la serata diventa compito di `registerMedia`
(*«quella resta `registerMedia`, che porta il suo predicato e la serata»*); fino
a quel deploy, applicare questa riga rompe quel percorso con un `23514`.

**Chi ci arriva oggi, misurato e non assunto:** `validateMediaUpload` (`:38-57`)
lascia passare `organizer` e `master` senza condizioni, e manda tutti gli altri
su una tabella chiamata `attendance` mentre la tabella e' `public.attendances` —
PostgREST risponde con un errore, il codice destruttura solo `{ data }`, quindi
quel ramo rifiuta sempre. **Il percorso che questa riga romperebbe e' quello di
organizer e master, non quello di un membro ordinario**, che oggi non ha nessun
caricamento funzionante. Quel difetto e' stato lasciato intatto di proposito:
ripararlo **allarga** chi puo' caricare, che e' una decisione d'accesso e non una
colonna.

**In una riga: questa migration si applica insieme al deploy che insegna la
serata a `registerMedia`, o dopo — mai prima.** La frase e' anche in testa al
file.

---

## Constatazioni fra piani (nessun file fuori dai miei `files_modified` e' stato toccato)

1. **La cattura `35-19` e' vecchia rispetto a HEAD.** Confrontarla con una
   cattura odierna produce 12 difetti `b2_count_changed` che vengono dal terzo
   asse del seed introdotto dal piano 35-06, non dal piano che confronta. Chi
   verifica la fase dovrebbe usare `35-06-final` — o piu' recente — come «cattura
   precedente». Vale anche per i piani della wave 5 che stanno girando in
   parallelo.
2. **Il tetto di tre serate per evento non esiste piu'.** Ogni documento della
   fase che lo cita (`35-18-PLAN.md` in testa all'obiettivo, e probabilmente
   `35-RESEARCH.md`) descrive uno schema superato dal 2026-02-26. La conseguenza
   e' che ogni ragionamento sul «raggio d'azione» di una chiave per-notte va
   letto come *l'intero evento*.
3. **`private.party_event_id(uuid)` esiste ora**, ed e' la forma da riusare in
   ogni policy dei piani 35-16 e 35-20 che debba mettere in relazione una serata
   e il suo evento: un `EXISTS` in linea al suo posto restringerebbe chi scrive
   senza che nessuna riga di codice lo dichiari.
4. **La convenzione di quoting dei segnaposto:** `substituteReferences` espande
   `{{table}}` in `'<uuid>'::uuid` — le virgolette e il cast fanno parte della
   sostituzione. Un segnaposto scritto fra apici in un payload produce un errore
   di sintassi, non una misura sbagliata; e' successo qui una volta.

---

## Threat Flags

Le voci del threat register del piano, con come sono coperte:

| ID | Disposizione | Come, e con quale prova |
|---|---|---|
| T-35-94 | mitigato | Il confronto per-notte e' un'uguaglianza fra identificatori (`pa.party_id = p_party_id`, `20260809001000:348`) e `NULL` non e' uguale a niente. La frase e' scritta nel `COMMENT ON COLUMN`, nel commento del trigger e in `EventMediaRow` — tre posti, stessa formulazione |
| T-35-95 | mitigato | Trigger `BEFORE INSERT` che solleva `23514`, **misurato sulla connessione privilegiata** (`23514`) e provato per mutazione nelle due direzioni (`ok:1` senza trigger). Piu' `party_id IS NOT NULL` nella policy |
| T-35-96 | mitigato | `private.party_event_id(party_id) = event_id` nella `WITH CHECK`. Sonda `member` con la serata di un altro evento → `42501` |
| T-35-97 | mitigato | Il backfill riempie solo gli eventi con esattamente una serata: 2 riempite, 2 lasciate NULL, misurato. La ragione e' scritta nel file |
| T-35-98 | mitigato | Trigger su `BEFORE INSERT` e non su UPDATE; nessun vincolo non-validato (`grep` = 0). Misurato: `master` aggiorna `status` su righe legacy → `ok:2` |
| T-35-99 | mitigato | L'esito atteso e' dichiarato prima: nessuna differenza nelle celle di `event_media`. B3 su 966 celle: **zero** differenze |
| T-35-SC | mitigato | **Nessun pacchetto installato.** `package.json` non e' fra i file modificati |

### Una superficie non prevista dal piano

| Flag | File | Descrizione |
|---|---|---|
| threat_flag: auth-path | `supabase/migrations/20260809004500_event_media_party_id.sql` | `private.party_event_id(uuid)` e' una funzione **`SECURITY DEFINER` nuova, eseguibile da `authenticated` e `anon`**, che risponde a *quale evento contiene questa serata*. E' una relazione fra due identificatori gia' entrambi nella `URL` di una pagina pubblica e non rivela ne' l'indirizzo ne' il fatto che una sede sia segreta — `venue_secret` sta su `event_parties` e questa funzione non lo legge. Va comunque registrata: e' un percorso che scavalca `event_parties_select_published`, e **il prossimo che volesse allargarne il tipo di ritorno a piu' di una colonna aprirebbe una lettura che quella policy nega**. La firma resta a una colonna, o e' un'altra decisione |

---

## Known Stubs

Nessuno stub di codice: nessun valore vuoto codificato a mano, nessun
segnaposto, nessun `TODO`.

Due dipendenze in avanti, dichiarate e non scoperte a valle:

1. **Nessuna superficie scrive ancora `party_id`.** La colonna esiste e il
   database la pretende; chi la manda e' il piano che insegna la serata a
   `registerMedia`. Fino a quel deploy questa riga della coda **non si applica**.
2. **Le righe legacy restano `NULL` per sempre**, per costruzione. Non e' un
   debito da chiudere: e' la decisione. Ogni piano futuro che le incontri deve
   leggerle come *ambito evento*, mai come *ogni serata* — ed e' esattamente per
   questo che la frase e' scritta in tre posti.

---

## Self-Check: PASSED

- `supabase/migrations/20260809004500_event_media_party_id.sql` — FOUND, applicata due volte in container con exit 0
- `scripts/rls-baseline.mjs` — FOUND, modificata la sola voce `event_media` di `PROBE_PAYLOADS`
- `src/types/database.ts` — FOUND, contiene `EventMediaRow` e `party_id: string | null`, `npm run build` verde
- `.planning/phases/32-capability-model-in-the-database/baseline/32-BASELINE-policies.container.35-18.json` — FOUND
- `.planning/phases/32-capability-model-in-the-database/baseline/32-BASELINE-reads.container.35-18.json` — FOUND
- `.planning/phases/32-capability-model-in-the-database/baseline/32-BASELINE-writes.container.35-18.json` — FOUND
- commit `1ccc2fd` — FOUND
- commit `79f25bd` — FOUND
- commit `6ced627` — FOUND
- `.planning/STATE.md`, `.planning/ROADMAP.md` e `deferred-items.md` — **NON MODIFICATI**, come da contratto worktree
- Nessun file di prova nel repository: lo script di misura vive in `/tmp` e non e' committato — `git status` pulito
- Nessuna coordinata reale, nessun nome di sede, nessuna data non annunciata, nessuna persona nominata in questo documento ne' nei file di questo piano: i fixture sono ruoli (`Proof Persona member`, `Proof Persona master`) e indirizzi `@example.invalid`
