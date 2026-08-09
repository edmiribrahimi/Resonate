---
phase: 35-per-night-assignments
plan: 05
subsystem: supabase-data
tags: [migration, rls, venue-secrecy, structural-guarantee, verification-script, wave-3]

# Dependency graph
requires:
  - plan: 35-01
    provides: "la coda di applicazione manuale di `35-HUMAN-UAT.md`: questa migration e' la riga 10"
  - plan: 35-02
    provides: "`public.party_assignments`, la forma della sonda B3 di una tabella nuova, e la cattura `35-02` contro cui questa si confronta"
  - plan: 43-final
    provides: "`private.capabilities`, `private.has_capability`, la chiave `catalogue.manage` e il suo rifiuto a `staff` — APPLICATI in produzione il 2026-08-08"
provides:
  - "`public.party_credits` — l'attribuzione pubblica di una serata, senza nessuna colonna che nomini un account"
  - "`party_credits_select_published` — la lettura che eredita il gate di pubblicazione di `event_parties`, mai la lettura incondizionata del vicino"
  - "`party_credits_select_catalogue_manage` — chi cura il catalogo vede anche cio' che non e' pubblicato"
  - "la sezione 4 della migration: quale fonte vince fra `event_parties.lineup` e `party_credits`"
  - "`PartyCreditRow` e `PartyCredit` in `src/types/database.ts`, senza campo d'account"
  - "`npm run verify:no-credit-account` — la sola garanzia automatica di ASSIGN-07 in un repo senza test runner"
  - "la sonda B3 di `party_credits` e `artists` fra le tabelle referenziabili di `scripts/rls-baseline.mjs`"
  - "la cattura `35-05`: 72 policy, 23 tabelle con RLS, 322 celle di lettura, 966 sonde di scrittura"
affects: [35-06, 35-14, 35-18, 35-19, 35-21]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "la garanzia che un record non diventi un permesso e' l'ASSENZA di una colonna, non un commento: il join che qualcuno scriverebbe in buona fede non deve poter parsare"
    - "il vicino piu' somigliante non e' il modello: `public.artists` legge senza condizioni perche' e' un catalogo, `party_credits` e' una relazione verso una NOTTE e la notte porta il segreto"
    - "un perimetro di verifica si CALCOLA (per nome e per menzione), non si elenca: un file nuovo del percorso deve arrivare dentro la misura, non fuori"
    - "una misura vuota e' un rifiuto (exit 2), mai un verde: un controllo che non puo' fallire non e' un controllo"
    - "`ON DELETE RESTRICT` su una relazione verso un catalogo produce un nuovo modo di rifiutare un'operazione gia' esistente, e il confronto delle catture lo misura come NARROWING"

key-files:
  created:
    - supabase/migrations/20260809003000_party_credits.sql
    - scripts/verify-no-credit-account.mjs
    - .planning/phases/32-capability-model-in-the-database/baseline/32-BASELINE-policies.container.35-05.json
    - .planning/phases/32-capability-model-in-the-database/baseline/32-BASELINE-reads.container.35-05.json
    - .planning/phases/32-capability-model-in-the-database/baseline/32-BASELINE-writes.container.35-05.json
  modified:
    - src/types/database.ts
    - package.json
    - scripts/rls-baseline.mjs
    - scripts/container/seed.mjs
    - .planning/phases/35-per-night-assignments/deferred-items.md

key-decisions:
  - "La lettura eredita `event_parties_select_published` e NON la lettura incondizionata di `artists_select_public`: con quella, la line-up di una serata non annunciata diventerebbe pubblica nell'istante dell'insert, ed e' irreversibile. Misurato nella stessa cattura: `artists` = 2 righe per tutte e 14 le persone, `party_credits` = 0 per `anon`"
  - "Nessuna colonna nomina un account, e il paragrafo NOMINA il join che qualcuno scriverebbe in buona fede (`pc.user_id = auth.uid()` dentro il resolver) dicendo che non e' scrivibile senza una migration"
  - "`catalogue.manage` invece di una nona chiave: e' gia' la chiave di `artists` e `venues`, e coniarne una creerebbe un permesso che nessuno tiene e una decisione che nessuno ha preso"
  - "`ON DELETE RESTRICT` su `artist_id`: `CASCADE` lascerebbe che una cancellazione riscriva in silenzio cosa e' stata una serata, e `SET NULL` non esiste su una colonna `NOT NULL`. Il prezzo — tre celle B3 che si restringono — e' misurato e dichiarato"
  - "Il perimetro dello script di verifica si calcola per nome E per menzione: oggi contiene un solo file (`src/types/database.ts`), e il verde vale esattamente quanto quella lista, che viene stampata a ogni run"

# Metrics
metrics:
  duration: "~55 min"
  completed: 2026-08-09
  tasks_completed: 2
  tasks_total: 2
  checkpoint_open: false
---

# Fase 35 Piano 05: il credito pubblico — Summary

`public.party_credits` come **attribuzione e nient'altro**: una persona puo'
essere accreditata a una serata senza avere un account, e il credito non concede
niente — non perche' un commento lo dica, ma perche' **la colonna che lo
permetterebbe non esiste**. Piu' la policy di lettura che eredita il gate di
pubblicazione della notte invece di copiare la lettura incondizionata del
vicino, e la frase che dichiara quale fonte vince fra `lineup` e i crediti.

**La migration non e' applicata in produzione.** E' la riga 10 della coda di
`35-HUMAN-UAT.md` e si applica a mano. Ogni prova qui sotto viene da un container
`postgres:17.6` costruito con lo shim, lo schema base e tutte e 46 le migration
in ordine.

---

## Cosa e' stato fatto

| Task | Nome | Commit | File |
|---|---|---|---|
| 1 | `public.party_credits` — la tabella senza la colonna | `1707ea7` | la migration, `src/types/database.ts`, `scripts/rls-baseline.mjs`, `scripts/container/seed.mjs`, le tre catture `35-05`, `deferred-items.md` |
| 2 | `verify-no-credit-account.mjs` — la garanzia meccanica di ASSIGN-07 | `b4c45ac` | `scripts/verify-no-credit-account.mjs`, `package.json` |

**Lingua dei commenti della migration:** inglese, come il template dichiarato
`20260808002000_membership_register.sql` e come `20260809000000_party_assignments.sql`.
Il paragrafo sull'idempotenza resta in italiano, come nel suo precedente. La
prosa dei documenti di pianificazione e dei messaggi di commit e' italiana.

---

## D-G — la policy di lettura, che e' quella che poteva perdere

Il vicino piu' ovvio di questa tabella, `public.artists`, ha una `USING` il cui
predicato e' la costante vera (`20260226100000_artist_profiles.sql:25-27`), e la
simmetria sembrava la scelta ovvia. **Non lo e', e la prova sta nella stessa
cattura**, non in un ragionamento:

| Tabella | `anon` | `member/approved` | `staff/approved` | `organizer/approved` | `master/approved` | `master/pending` |
|---|---|---|---|---|---|---|
| `artists` | **2** | 2 | 2 | 2 | 2 | 2 |
| `event_parties` | 0 | 0 | 0 | 2 | 2 | **2** |
| `party_credits` | **0** | 0 | 0 | 2 | 2 | **0** |

Le due righe che contano:

1. **`artists` legge 2 righe per tutte e quattordici le persone**, `anon`
   compresa. Quello e' il comportamento che copiare la simmetria avrebbe
   prodotto qui: nel container gli eventi seminati non sono pubblicati, quindi
   con la lettura incondizionata `anon` avrebbe letto **2** crediti di serate
   non annunciate. La controprova non e' stata costruita: e' **accanto**, nella
   stessa cattura, sulla tabella che il piano indicava come modello sbagliato.

2. **`party_credits` e' piu' stretta di `event_parties`, mai piu' larga.**
   `master/pending` legge la serata (la vecchia `is_admin_or_organizer()` non
   chiede lo stato) e **non** legge i suoi crediti, perche' `catalogue.manage`
   porta `requires_approved = true`. Che l'attribuzione strutturata non sia mai
   piu' pubblica del testo comunicato della stessa notte e' l'invariante, ed e'
   verificata in questa direzione e non solo in quella dell'anonimo.

La policy catturata mostra anche che il riferimento non qualificato si e'
risolto dove doveva:

```
(EXISTS ( SELECT 1 FROM (event_parties ep JOIN events e ON ((e.id = ep.event_id)))
  WHERE ((ep.id = party_credits.party_id) AND (e.is_published = true))))
```

Il planner ha riscritto `party_id` in `party_credits.party_id`: la colonna
confrontata e' quella della tabella esterna, non una colonna di `event_parties`
che non esiste.

**La ragione e' scritta nella migration, sezione 2**, e non solo qui, perche' il
prossimo lettore vedra' il vicino prima di vedere questo piano.

> Nota di forma: `USING (true)` e' **descritta e non citata** nel file, perche' il
> criterio di accettazione greppa quel letterale e l'unico match sarebbe la frase
> che lo vieta. E' la stessa scelta registrata in `35-02-SUMMARY.md` deviazione
> 3, e la migration lo dice sul posto: un controllo che va letto aggirandolo
> smette di essere letto.

---

## D-F — la convivenza con `lineup`, dichiarata invece che assunta

`event_parties.lineup text[]` continua a esistere e non e' toccata. La sezione 4
della migration scrive quale fonte vince per cosa:

| Fonte | Cos'e' | Chi la usa |
|---|---|---|
| `event_parties.lineup` | **il testo comunicato** — il nome nella grafia con cui la serata si comunica, senza chiave esterna verso `artists` | cio' che una superficie pubblica **rende** |
| `public.party_credits` | **l'attribuzione** — una relazione verso una riga di `public.artists`, con un ruolo e un ordine | cio' che una query **giunta** |

**Chi vince:** per tutto cio' che si **mostra** come line-up di una serata vince
`lineup`; per tutto cio' che chiede **quale riga di artista** un nome indichi
vince `party_credits`. Nessuna delle due deriva dall'altra, e nessun codice di
questa fase scrive l'una dall'altra.

**Nessuna migrazione fra le due in questa fase**, e il rimando e' a una fase che
la nomini con le tre domande che questo file non risponde (che succede a un nome
senza riga di catalogo, se `lineup` diventa derivata o resta autorevole, cosa
leggono le superfici pubbliche durante il passaggio). Due fonti per la stessa
cosa senza una frase che dica quale vince e' *«il calendario batte il tracker»*
di `production-calendar.md`, dove il danno non era che le due divergessero ma
che nessuno avesse detto in anticipo a quale credere.

---

## ASSIGN-06 / ASSIGN-07 — la garanzia e' un'assenza, in tre punti

| Meta' | Dove | Cosa succede a chi prova ad aggirarla |
|---|---|---|
| Il database | `public.party_credits` non ha nessuna colonna che nomini un account — non `user_id`, non `profile_id`, non `auth_user_id` | `join public.party_credits pc on pc.user_id = auth.uid()` **non parsa**. Aggiungerla e' una migration: una decisione datata e visibile |
| Il compilatore | `PartyCreditRow` non ha nessun campo d'account | un credito che *provasse* a portarne uno **non compila**, e `npm run build` e' il gate dei tipi di questo repo |
| Il comando | `npm run verify:no-credit-account` | esce **1** nominando file e riga se un file del percorso del credito acquista la capacita' di **creare** un account |

Il ragionamento e' lo **stesso** della colonna `granted` che non esiste su
`private.role_capabilities` (`20260808000500_staff_role.sql:154-171`), e la
migration lo cita: li' un rifiuto e' l'assenza di una riga, qui un non-permesso
e' l'assenza di una colonna. In entrambi i casi e' la struttura a portare la
decisione, perche' un commento si puo' ignorare.

`created_by` **non e'** quella colonna: e' l'account che ha inserito la riga,
esattamente nel senso in cui `public.artists.created_by` gia' lo usa — mai chi e'
l'artista.

### La prova per mutazione, in quattro direzioni

Eseguita, e **ogni mutazione e' stata verificata come applicata prima di
leggerne l'esito** (`ai-engineering.md`, gate *prova per mutazione*: una
sostituzione che non va a segno produce un verde che sembra un esito).

| # | Mutazione | Applicata? verificata come | Esito |
|---|---|---|---|
| A | `auth.admin.createUser` aggiunta a `src/types/database.ts` (file gia' nel perimetro, **per menzione**) | il reader esportato dallo script vede 1 hit a `:654` | **exit 1**, nominando `src/types/database.ts:654` |
| A′ | rimossa con `git checkout --` | `grep -c` = 0 | **exit 0** |
| B | `src/lib/credits/mutation-probe.ts` creato con `auth.admin.generateLink` (file nuovo, entra **per nome**) | `perimeterReason()` = `name`, reader = 1 hit | **exit 1**, perimetro passato a 2 file, hit nominato con riga |
| B′ | directory rimossa | `ls` fallisce | **exit 0** |
| C | un percorso esentato ri-puntato a un file inesistente | `grep -n` mostra la riga sostituita | **exit 2**, «they were not scanned and they were not found» |
| D | `PATH_MARKER` e `MENTION_MARKERS` ri-puntati a marcatori che non matchano niente | `grep -n` mostra entrambe le righe sostituite | **exit 2**, «the credit path holds NO scannable file» |

A e B provano che il metro **scatta**, e su entrambe le vie d'ingresso al
perimetro. C e D provano che i due **rifiuti** sono veri e non decorativi: senza
di essi lo script avrebbe potuto passare misurando niente, che e' la forma di
verde che questo repository ha gia' registrato piu' volte.

### Cosa quel verde afferma, e cosa no — scritto nell'intestazione dello script

In un repository **senza test runner per il prodotto**, questa e' l'**unica**
garanzia automatica che ASSIGN-07 puo' avere, e garantisce un'**assenza
strutturale**. Non dice che il percorso del credito si comporti bene: non dice
chi puo' scrivere un credito (quello e' `catalogue.manage`, chiesto nella guardia
della superficie), non dice che un credito non conceda niente (quello e' la
colonna mancante), non dice che una line-up non annunciata resti privata (quello
e' la RLS, misurata sopra). L'assenza e' verificabile; il buon comportamento no.

**Il perimetro oggi contiene un solo file** — `src/types/database.ts`, entrato
per menzione — e lo script lo **stampa a ogni run** con la ragione per cui ogni
file e' entrato. Il verde vale esattamente quanto quella lista, e la superficie
di catalogo dei crediti non esiste ancora: quando arrivera', entrera' nella
misura da sola, perche' il perimetro e' calcolato e non elencato.

Le due esenzioni — `src/lib/guest-list/process-entry.ts` e
`src/app/(admin)/admin/members/actions.ts` — sono stampate a ogni run, pass o
fail: un'esenzione invisibile e' un'esenzione che cresce.

---

## La cattura, e cosa dice il confronto

`npm run baseline:container -- --phase-point=35-05`, exit 0. Il container ha
applicato **46** file di migration (45 alla cattura `35-02`), seminato 12
profili, catturato e si e' distrutto.

| Cattura | `35-02` | `35-05` |
|---|---|---|
| B1 policy | 70 policy, 22 tabelle con RLS | **72 policy, 23 tabelle con RLS** |
| B2 letture | 308 celle, 0 vacue | **322 celle, 0 vacue**, 14/14 persone |
| B3 scritture | 924 sonde, 22 inconcludenti | **966 sonde, 25 inconcludenti** |

`npm run baseline:compare --target=container --before-point=35-02
--after-point=35-05 --only=B1,B2,B3` riporta **63 differenze**: 2 `policy_added`,
14 `b2_cell_added`, 42 `b3_cell_added`, 2 `supporting_count_changed`, e
**3 `b3_result_changed`** — che sono la sola cosa non prevista dal piano e sono
trattate come deviazione 2 qui sotto.

**Le 42 celle di scrittura nuove, tutte conclusive:**

| verbo | esito | celle |
|---|---|---|
| insert | `42501` | 14/14 |
| update | `ok:0` | 14/14 |
| delete | `ok:0` | 14/14 |

Nessuna persona — nemmeno `master/approved` — puo' inserire, modificare o
cancellare un credito direttamente. **Questa tabella non ha aggiunto nemmeno una
cella inconcludente**, che era il rischio concreto: una sonda che sbatte su un
vincolo invece che su una policy misura il vincolo e non dice niente sulla
policy.

---

## Deviazioni dal piano

### 1. [Rule 3 — bloccante] La sonda B3 di `party_credits`, e `artists` fra le tabelle referenziabili

- **Trovata durante:** task 1, alla prima esecuzione di `baseline:container`.
- **Il fatto:** `scripts/rls-baseline.mjs:1536-1539` **rifiuta l'intera cattura**
  se una tabella con RLS non ha una voce in `PROBE_PAYLOADS`. Il criterio di
  accettazione del piano pretendeva che quel comando girasse; il piano non
  elencava il file fra quelli da modificare. E' **la stessa lacuna** che il piano
  35-02 ha incontrato e registrato (`35-02-SUMMARY.md`, deviazione 2), ripetuta
  su un piano scritto dopo.
- **E c'e' un secondo pezzo che 35-02 non aveva dovuto toccare.**
  `party_credits.artist_id` e' `NOT NULL REFERENCES public.artists`, e `artists`
  **non era** fra le tabelle referenziabili da un `{{placeholder}}`. Senza
  aggiungercelo: il **seed** rifiuta («a probe payload references "artists",
  which the seed cannot provide») e la **sonda** userebbe il nil uuid, fallendo
  `23503` su tutte e quattordici le persone — una misura che riporta la chiave
  esterna invece della policy, cioe' 42 celle inconcludenti al posto di 42
  conclusive.
- **Cosa e' stato fatto:** voce `party_credits` in `PROBE_PAYLOADS`, `'artists'`
  in `PROBE_REFERENCE_TABLES` (`scripts/rls-baseline.mjs`) e in `REFERENCEABLE`
  (`scripts/container/seed.mjs`). `artists` non entra in `SEED_ORDER` e non serve:
  `rest` e' ordinato alfabeticamente e `artists` precede `party_credits`, quindi
  i suoi id esistono quando i crediti vengono seminati — verificato dal fatto che
  il seed non ha sollevato l'errore che alza quando un riferimento manca.
- **Nessuna colonna del payload prende `auth.uid()`**, e non e' una dimenticanza
  rispetto alla convenzione: questa tabella **non ha** una colonna che nomini un
  account. Inventarne una nel payload avrebbe sondato una tabella che non esiste.
- **Commit:** `1707ea7`

### 2. [Rule 2 — dichiarazione mancante] `ON DELETE RESTRICT` produce un nuovo modo di rifiutare un'operazione, e non raggiunge nessuno

- **Trovata durante:** task 1, leggendo il confronto delle catture — misurando,
  non ragionando.
- **Il fatto, misurato:**

  | Cella | `35-02` | `35-05` |
  |---|---|---|
  | `master/approved × artists × delete` | `ok:1` | `23503` |
  | `master/pending × artists × delete` | `ok:1` | `23503` |
  | `master/rejected × artists × delete` | `ok:1` | `23503` |

  Il comparatore le etichetta **NARROWING**. Sono anche le **tre** celle
  inconcludenti in piu' (22 → 25): `23503` non e' ne' `ok:*` ne' `42501`, quindi
  D-19 le registra come non conclusive. I due numeri sono lo stesso fatto.
- **Nessuna policy e' cambiata:** `artists_delete_master` e' identica fra le due
  catture. E' un **vincolo**, non un permesso, e il comparatore confronta esiti e
  non puo' distinguerli. Nell'harness ogni artista seminato e' accreditato,
  quindi ogni delete incontra la chiave; in produzione solo un artista
  **accreditato** e' protetto.
- **Il vincolo resta com'e', e la ragione e' nella migration:** `CASCADE`
  lascerebbe che una cancellazione riscriva in silenzio cosa e' stata una serata
  — irreversibile — e `SET NULL` non esiste su una colonna `NOT NULL`. Un rifiuto
  si annulla staccando il credito.
- **Cosa NON e' stato fatto, ed e' il debito vero.** Il percorso di cancellazione
  in `src/app/(organizer)/organizer/artists` mostrerebbe oggi l'errore grezzo di
  PostgREST. **Non esiste error tracking** (`meta-gates.md`): un fallimento
  inspiegato su quel bottone raggiunge una persona solo se quella persona lo sta
  guardando. Il rifiuto deve **nominare le serate che lo bloccano**. Non e' fra i
  `files_modified` di questo piano: dichiarato nella migration sezione 5 e aperto
  come **voce 3 di `deferred-items.md`**.
- **Commit:** `1707ea7`

### 3. [Rule 1 — un controllo che si autoannulla] `USING (true)` si descrive, non si scrive

- **Trovata durante:** task 1, scrivendo il paragrafo del gate.
- **Il fatto:** il criterio di accettazione pretende che il file **non** contenga
  `USING (true)`. Il paragrafo che spiega perche' il vicino non va copiato
  sarebbe stato l'unico match del file.
- **Cosa e' stato fatto:** la forma e' **descritta** («a `USING` clause whose
  predicate is the constant true») con una riga che dice perche' non e' citata
  per esteso, e il rimando al precedente identico di `35-02-SUMMARY.md`
  deviazione 3.
- **Commit:** `1707ea7`

---

## Verifiche eseguite

| Verifica | Comando | Esito |
|---|---|---|
| Typecheck | `npm run build` | **PASS** — `✓ Compiled successfully` |
| Nessuna lettura incondizionata | `grep -n "USING (true)" <migration>` | **PASS** — nessun match |
| Il gate di pubblicazione e' ereditato | `grep -n "is_published = true"` | **PASS** — riga 226 |
| La sezione su `lineup` esiste | `grep -c "lineup"` | **PASS** — 10 occorrenze, sezione 4 |
| Nessuna colonna d'account | `grep -niE "user_id\|profile_id\|auth_user_id"` | **PASS** — 4 match, **tutti e quattro dentro il paragrafo 1a** che spiega perche' non esistono |
| Il tipo di riga esiste e non ha campi d'account | `grep -q "PartyCreditRow"` + lettura | **PASS** — nessun campo che finisca per `user_id` |
| La cattura di baseline | `npm run baseline:container -- --phase-point=35-05` | **PASS** — exit 0, tre artefatti |
| Il confronto con `35-02` | `npm run baseline:compare … --only=B1,B2,B3` | **PASS con una scoperta** — 63 differenze, 60 previste + 3 `b3_result_changed` (deviazione 2) |
| Anon non legge una line-up non annunciata | B2, cattura `35-05` | **PASS** — `party_credits` `anon` = 0, mentre `artists` `anon` = 2 |
| Il comando di ASSIGN-07 | `npm run verify:no-credit-account` | **PASS** — exit 0, perimetro 1 file, esenzioni stampate |
| La sensibilita' del comando | prova per mutazione, 4 direzioni | **PASS** — 1, 1, 2, 2, con ritorno a 0 dopo ognuna |

### Cosa queste verifiche NON provano

- **La migration non e' applicata in produzione.** E' la riga 10 della coda di
  `35-HUMAN-UAT.md`. Che gli oggetti si costruiscano e che le policy si
  comportino cosi' in un container non dice che il prodotto funzioni con essi.
- **`npm run build` verde non significa niente su questa migration.** I tipi
  vengono da `src/types/database.ts`, non dal database vivo. Il verde e' esatto
  esattamente come lo era prima che questa tabella esistesse.
- **Nessun test del prodotto e' stato eseguito, perche' non ne esistono.**
- **B2 misura cio' che le persone leggono nel container con due righe
  seminate**, su eventi non pubblicati. Che una serata **pubblicata** mostri i
  suoi crediti a `anon` e' il braccio dell'`EXISTS` che questa cattura non
  esercita: nel seed nessun evento ha `is_published = true`. E' una lacuna reale
  della misura e va chiusa dalla UAT manuale, non dedotta dalla policy.
- **Nessuna superficie legge o scrive ancora questa tabella.** La RLS di lettura
  e' provata; che la superficie giusta chieda `catalogue.manage` prima di
  scrivere e' materia dei piani a valle, e la migration lo dice invece di
  lasciarlo credere.

---

## Threat Flags

Le voci del threat register del piano, con come sono coperte:

| ID | Disposizione | Come, e con quale prova |
|---|---|---|
| T-35-22 | mitigato | La lettura eredita il gate di pubblicazione; il file non contiene la lettura incondizionata (grep) e `anon` legge **0** righe nella cattura, contro le **2** che legge sulla tabella vicina |
| T-35-23 | mitigato | Nessuna colonna d'account sulla tabella **e** nessun campo d'account sul tipo: il join che qualcuno scriverebbe non parsa, e un tipo che lo portasse non compila |
| T-35-24 | mitigato | `npm run verify:no-credit-account`, exit 1 nominando file e riga; esenzioni dichiarate e stampate; sensibilita' provata per mutazione in quattro direzioni, due delle quali sui rifiuti |
| T-35-25 | mitigato | `CREATE TABLE IF NOT EXISTS`, `IF NOT EXISTS` sull'indice, `DROP POLICY IF EXISTS` su entrambe. La migration dichiara esplicitamente che `artist_profiles.sql` **non** e' il modello di idempotenza, perche' non ne ha |
| T-35-26 | mitigato | La sezione 4, con la frase che dichiara quale fonte vince per cosa e il rinvio esplicito a una fase che nomini la migrazione |
| T-35-SC | non applicabile | Nessun pacchetto installato o modificato. `package.json` cambia di **una riga**, uno script `verify:*`, e nessuna dipendenza |

**Una superficie di sicurezza nuova oltre a quelle pianificate:** nessuna
policy preesistente e' cambiata (le 70 restano nella cattura), ma
`ON DELETE RESTRICT` aggiunge **un nuovo modo di rifiutare** una cancellazione
gia' possibile. E' la deviazione 2, misurata, dichiarata nella migration e aperta
in `deferred-items.md` perche' oggi quel rifiuto non ha effetto osservabile.

---

## Known Stubs

Nessuno stub di codice.

Due dipendenze in avanti, dichiarate e non scoperte a valle:

1. **La superficie di catalogo dei crediti non esiste.** Nessun file scrive o
   legge `public.party_credits`, e quindi il perimetro di
   `verify-no-credit-account` contiene oggi **un solo file di dichiarazioni**.
   Lo script lo stampa a ogni run: il verde e' vero e vale quanto quella lista.
   Quando la superficie arrivera' entrera' nella misura da sola.
2. **Nessuna migrazione fra `lineup` e `party_credits`**, di proposito. Le due
   coesistono sotto la frase della sezione 4, e la migrazione appartiene a una
   fase che la nomini, con le tre domande che quella sezione lascia aperte per
   iscritto.

---

## Self-Check: PASSED

- `supabase/migrations/20260809003000_party_credits.sql` — FOUND
- `scripts/verify-no-credit-account.mjs` — FOUND, 392 righe (`wc -l`), esce 0
- `src/types/database.ts` — FOUND, contiene `PartyCreditRow` e `PartyCredit`, nessun campo d'account
- `package.json` — FOUND, contiene `verify:no-credit-account`, una sola riga aggiunta
- `scripts/rls-baseline.mjs` — FOUND, contiene la voce `party_credits` e `'artists'` fra le referenziabili
- `scripts/container/seed.mjs` — FOUND, contiene `'artists'` in `REFERENCEABLE`
- `.planning/phases/32-capability-model-in-the-database/baseline/32-BASELINE-policies.container.35-05.json` — FOUND
- `.planning/phases/32-capability-model-in-the-database/baseline/32-BASELINE-reads.container.35-05.json` — FOUND
- `.planning/phases/32-capability-model-in-the-database/baseline/32-BASELINE-writes.container.35-05.json` — FOUND
- `.planning/phases/35-per-night-assignments/deferred-items.md` — FOUND, voce 3 aperta
- commit `1707ea7` — FOUND
- commit `b4c45ac` — FOUND
- `.planning/STATE.md` e `.planning/ROADMAP.md` — **NON MODIFICATI**, come da contratto worktree
- `src/lib/credits/` — **NON ESISTE**: la directory della prova per mutazione B e' stata rimossa, verificato
