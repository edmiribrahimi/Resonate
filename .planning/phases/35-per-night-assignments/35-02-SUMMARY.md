---
phase: 35-per-night-assignments
plan: 02
subsystem: supabase-data
tags: [migration, rls, constraints, composite-fk, time-and-scheduling, wave-2]

# Dependency graph
requires:
  - plan: 35-01
    provides: "la cattura `35-pre` (68 policy, 21 tabelle con RLS) e la coda di applicazione manuale: questa migration e' la riga 7"
  - plan: 43-final
    provides: "il ruolo `staff` nel CHECK di `profiles.role`, il vincolo `role ⇒ approved`, `private.capabilities` — tutti APPLICATI in produzione il 2026-08-08"
provides:
  - "`public.party_end_instant(date, time)` — la regola di mezzanotte in SQL, dichiarata come seconda implementazione di `src/utils/datetime.ts`"
  - "`profiles_id_role_unique UNIQUE (id, role)` — il vincolo che la foreign key composta richiede per poter esistere"
  - "`public.party_assignments` — il record temporale, cinque vincoli nominati, tre indici, RLS con due sole policy di SELECT"
  - "`PartyAssignmentRow` in `src/types/database.ts`, con il significato di ogni NULL"
  - "la sonda B3 di `party_assignments` in `scripts/rls-baseline.mjs`, senza la quale l'harness rifiuta di girare"
  - "la cattura `35-02`: 70 policy, 22 tabelle con RLS, 308 celle di lettura, 924 sonde di scrittura"
affects: [35-03, 35-04, 35-05, 35-06, 35-08, 35-14, 35-18, 35-21]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "una regola che legge un'altra riga di un'altra tabella non e' un CHECK (0A000): e' una foreign key composta, e il trigger si registra come considerato e rifiutato"
    - "la nullabilita' di una colonna referenziante e' un meccanismo: MATCH SIMPLE non verifica la FK quando una colonna e' NULL, e cio' libera la riga storica"
    - "quando un controllo meccanico greppa una forma vietata, la forma si descrive invece di scriverla: un controllo che va letto aggirandolo smette di funzionare"
    - "una tabella nuova con RLS obbliga ad aggiungere la sua sonda in `scripts/rls-baseline.mjs`, o l'harness rifiuta l'intera cattura"

key-files:
  created:
    - supabase/migrations/20260809000000_party_assignments.sql
    - .planning/phases/32-capability-model-in-the-database/baseline/32-BASELINE-policies.container.35-02.json
    - .planning/phases/32-capability-model-in-the-database/baseline/32-BASELINE-reads.container.35-02.json
    - .planning/phases/32-capability-model-in-the-database/baseline/32-BASELINE-writes.container.35-02.json
    - .planning/phases/35-per-night-assignments/deferred-items.md
  modified:
    - src/utils/datetime.ts
    - src/types/database.ts
    - scripts/rls-baseline.mjs

key-decisions:
  - "`ends_at` si legge da `event_parties.date`, MAI da `events.date`: le due divergono di 24 ore quando una sub-serata cade il giorno dopo, e la direzione dell'errore era quella insicura. Il piano istruiva il join sbagliato"
  - "La sonda B3 di `party_assignments` non usa `auth.uid()` per nessuna delle due colonne-soggetto: sarebbe un rifiuto per la ragione sbagliata su 2 personas su 14. `assigned_by` usa `coalesce(nullif(auth.uid(), {{profiles}}), <literal>)`, che soddisfa la FK nel seed e resta non-nullo e distinto nella sonda"
  - "Il seed inserisce righe VIVE e non revocate: e' l'unico posto dell'harness in cui la foreign key composta viene davvero esercitata, quindi che un'assegnazione legittima sia inseribile e' misurato invece che assunto"
  - "Le forme vietate — l'offset numerico di fuso e la clausola di cascata sull'update — sono DESCRITTE e non scritte, perche' i controlli del piano le greppano e l'unico match sarebbe la frase che le vieta"

# Metrics
metrics:
  duration: "~70 min"
  completed: 2026-08-08
  tasks_completed: 3
  tasks_total: 3
  checkpoint_open: false
---

# Fase 35 Piano 02: la tabella delle assegnazioni — Summary

`public.party_assignments` come record temporale, con le due garanzie che nessun
codice applicativo puo' fornire: **nessuna auto-assegnazione** in un `CHECK` di
riga e **solo i ruoli staff sono assegnabili** in una foreign key composta —
entrambe valutate anche quando a scrivere e' il client service, che bypassa ogni
policy e nessun vincolo. Piu' la regola di mezzanotte in SQL, dichiarata come
seconda implementazione e non come scoperta.

**La migration non e' applicata in produzione.** E' la riga 7 della coda di
`35-HUMAN-UAT.md` e si applica a mano. Tutte le prove qui sotto vengono da un
container `postgres:17.6` costruito con lo shim, lo schema base al commit
`dd2a2c2` e tutte e 45 le migration in ordine.

---

## Cosa e' stato fatto

| Task | Nome | Commit | File |
|---|---|---|---|
| 1 | `public.party_end_instant` — la regola di mezzanotte, in SQL, una volta sola | `0ffde92` | `supabase/migrations/20260809000000_party_assignments.sql`, `src/utils/datetime.ts` |
| 2 | `public.party_assignments` — il record temporale e le due garanzie strutturali | `ba7ee06` | la migration, `scripts/rls-baseline.mjs`, le tre catture `35-02` |
| 3 | `PartyAssignmentRow` — il tipo di riga, con il significato di ogni NULL | `66ccf2a` | `src/types/database.ts` |

**Lingua dei commenti della migration:** inglese, come il proprio template
dichiarato `20260808002000_membership_register.sql` e come `door_scan_events.sql`.
Il paragrafo sull'idempotenza resta in italiano, come nel suo precedente
(`20260808001000_role_implies_approved.sql:103-111`). La prosa dei documenti di
pianificazione e dei messaggi di commit e' italiana.

---

## Le cinque regole, provate una per una

Non «i vincoli ci sono»: **ognuno e' stato fatto scattare, per nome**, contro il
container. Non esiste un test runner per il prodotto, quindi questa e' l'unica
prova che esistera'.

| Prova | Cosa e' stato tentato | Esito osservato |
|---|---|---|
| P2 | `assigned_by = user_id` | `23514` **`party_assignments_no_self_grant`** |
| P3 | ruolo dichiarato `organizer` su un profilo che tiene `staff` | `23503` **`party_assignments_assignee_role_fk`** |
| P4 | `assignee_role = 'member'` su una riga viva | `23514` **`party_assignments_live_role_present`** |
| P5 | `capability = 'staff.manage'` | `23514` **`party_assignments_capability_assignable`** |
| P6 | la concessione legittima | **accettata** |
| P7 | seconda concessione VIVA su (notte, persona, capability) | `23505` **`party_assignments_live_unique`** |
| P8 | demotare a `member` chi tiene un'assegnazione **viva** | `23503` **`party_assignments_assignee_role_fk`** |
| P9/P10 | revoca a meta' (`revoked_at` senza `revoked_by`) | `23514` **`party_assignments_revocation_paired`** |
| P11 | revoca intera, che azzera `assignee_role` | **accettata** |
| P12 | **la stessa demotione di P8, dopo la revoca** | **accettata** |
| P13 | la riga revocata dopo la demozione | `revoked` ✓ · `attributed` ✓ · `role_released` ✓ · il titolare e' ora `member` |
| P14 | ri-concedere dopo una revoca | **accettata** — 1 viva + 1 revocata |

**P8 e P12 sono la stessa istruzione, e sono la prova di D-B.** Prima della
revoca il database la rifiuta; dopo, la accetta. Non e' una coincidenza di
timing: e' `MATCH SIMPLE` che smette di verificare la foreign key nel momento in
cui `assignee_role` diventa `NULL`. La nullabilita' **e'** il meccanismo, e P14
mostra che la riga revocata non blocca nemmeno una nuova concessione.

**Il prezzo, dichiarato nella migration e non nascosto:** una riga revocata non
conserva piu' quale ruolo la persona teneva alla concessione. E' accettabile
perche' questa tabella e' stato operativo e non registro — `public.membership_acts`
tiene chi e quando — ed e' scritto anche cosa NON fare per recuperarlo (una
seconda colonna che nessuna FK legge, mai `assignee_role NOT NULL`, che
riarmerebbe ogni riga storica contro il suo titolare per sempre).

---

## La cattura, e cosa dice il confronto

`npm run baseline:container -- --phase-point=35-02`, senza `--overwrite`, exit 0.
Il container ha applicato **45** file di migration (44 alla cattura `35-pre`),
seminato 12 profili, catturato e si e' distrutto.

| Cattura | `35-pre` | `35-02` |
|---|---|---|
| B1 policy | 68 policy, 21 tabelle con RLS | **70 policy, 22 tabelle con RLS** |
| B2 letture | 294 celle, 0 vacue | **308 celle, 0 vacue**, 14/14 persone |
| B3 scritture | 882 sonde, 22 inconcludenti | **924 sonde, 22 inconcludenti** |

`npm run baseline:compare --target=container --before-point=35-pre
--after-point=35-02 --only=B1,B2,B3` riporta **60 differenze, e sono tutte e
sole aggiunte di `party_assignments`**: 2 `policy_added`, 14 `b2_cell_added`, 42
`b3_cell_added`, 2 `supporting_count_changed` (68 → 70 policy, 21 → 22 tabelle).

La riga che conta di piu' e' quella che **non** e' cambiata:

> `68 unchanged · 0 by T1 · 0 by T2 · 0 by both · 0 unexplained`

Le 68 policy preesistenti sono **byte-identiche**. Questa migration non ha
allargato niente a nessuno: ha aggiunto una tabella e l'ha chiusa.

**Le 42 celle di scrittura nuove, tutte conclusive:**

| verbo | esito | celle |
|---|---|---|
| insert | `42501` | 14/14 |
| update | `ok:0` | 14/14 |
| delete | `ok:0` | 14/14 |

Nessuna persona — nemmeno `master/approved` — puo' inserire, modificare o
cancellare una riga direttamente. Le 22 celle inconcludenti sono le stesse 22 di
`35-pre`: **questa tabella non ne ha aggiunta nessuna**, che era il rischio
concreto (una sonda che sbatte su un vincolo invece che su una policy misura il
vincolo e non dice niente sulla policy).

---

## Deviazioni dal piano

### 1. [Rule 1 — difetto] `ends_at` si legge dalla serata, non dall'evento

- **Trovata durante:** task 2, costruendo il container per provare i vincoli:
  l'`INSERT` di prova su `event_parties` e' fallito su una colonna `type` che il
  piano dava per esistente e che **non esiste piu'**.
- **Il fatto:** `public.event_parties` ha una **propria** colonna `date` dal
  26 febbraio 2026 — `20260226300000_multi_sub_events.sql:20-27` la aggiunge, la
  riempie dal genitore e nello stesso file **elimina `type`** — e la ragione per
  cui esiste e' esattamente che una sub-serata puo' stare su un giorno solare
  diverso dall'evento che la contiene.
- **Misurato, non argomentato.** Su una serata con la sub-serata il giorno dopo:

  | Espressione | Risultato |
  |---|---|
  | `party_end_instant(ep.date, coalesce(ep.end_time,'06:00'))` | `2026-10-12 04:00:00+00` |
  | `party_end_instant(e.date,  coalesce(ep.end_time,'06:00'))` | `2026-10-11 04:00:00+00` |

  Ventiquattro ore esatte.
- **Perche' conta:** la direzione dell'errore e' quella **insicura**. `ends_at`
  un giorno in anticipo e' un'assegnazione che scade **prima** della serata,
  cioe' un membro dello staff rifiutato alla porta davanti a una fila — la
  peggiore delle due asimmetrie secondo `CLAUDE.md`, principio 3. E il piano
  aveva scritto la frase giusta («la direzione dell'errore e' quella sicura»)
  accanto all'espressione che la contraddice.
- **Il prodotto e' gia' d'accordo, senza eccezioni.** Ogni call site TypeScript
  passa la data della **serata**: `review/page.tsx:164`, `checkin/route.ts:438`,
  `venue-reveal/route.ts:40`, `event-reminders/route.ts:40`, e ogni
  `menuCloseInstant`. La funzione SQL e' la meta' della **stessa** regola:
  nutrita con un'altra colonna, le due meta' rispondono a domande diverse
  sembrando identiche — che e' il fallimento silenzioso per cui
  `src/utils/datetime.ts` esiste.
- **Fix:** la sezione 3d della migration usa
  `public.party_end_instant(ep.date, coalesce(ep.end_time, '06:00'::time))` da
  `public.event_parties ep`, **senza join a `public.events`**, con il paragrafo
  che dice perche' il join e' la cosa ovvia da scrivere e perche' e' sbagliata.
- **Commit:** `ba7ee06`
- **⚠️ Non e' chiusa qui.** `35-04-PLAN.md:207` porta la stessa espressione
  sbagliata, e quel piano scrive il writer che calcola davvero `ends_at`. Non e'
  stato modificato: appartiene a un'altra onda, e `ai-engineering.md` gate
  *multi-agent* dice di **sequenziare** due agenti sullo stesso file, non di
  parallelizzarli. La correzione e' registrata in
  **`.planning/phases/35-per-night-assignments/deferred-items.md`, voce 1**, ed
  e' scritta nella migration che chi esegue 35-04 deve comunque leggere.

### 2. [Rule 3 — bloccante] La sonda B3 di `party_assignments`

- **Trovata durante:** task 2, alla prima esecuzione di `baseline:container`.
- **Il fatto:** `scripts/rls-baseline.mjs:1513-1519` **rifiuta l'intera cattura**
  se una tabella con RLS non ha una voce in `PROBE_PAYLOADS` — *«a write matrix
  that silently skips a table is a matrix that cannot fail»*. Il criterio di
  accettazione del piano pretendeva che quel comando girasse; il piano non
  elencava il file fra quelli da modificare.
- **E il seed inserisce righe VERE.** `scripts/container/seed.mjs:478-531` usa
  gli stessi payload per riempire ogni tabella, come superuser e quindi senza
  RLS: la sonda deve reggere **due contratti opposti**.
- **La lacuna che il piano non aveva chiuso.** `35-PATTERNS.md § 13` l'aveva
  segnalata testualmente: la convenzione dice `auth.uid()` per ogni colonna che
  nomina il soggetto, ma qui **le colonne-soggetto sono due** — `user_id` e
  `assigned_by` — e `party_assignments_no_self_grant` rifiuta la riga quando
  sono uguali. *«Il piano deve dichiarare quale delle due prende `auth.uid()`,
  altrimenti B3 su questa tabella e' rosso per costruzione e non prova niente.»*
  Il piano non l'ha dichiarato. **E' dichiarato qui.**
- **La forma scelta:** `user_id` prende `{{profiles}}`; `assigned_by` prende
  `coalesce(nullif(auth.uid(), {{profiles}}), '35000002-…'::uuid)`.
  Nel seed `auth.uid()` diventa l'id della persona proprietaria e `{{profiles}}`
  quella referenziata — mai la stessa — quindi il fallback non si raggiunge e la
  foreign key verso `auth.users` e' soddisfatta da un account reale. Nella sonda
  il fallback intercetta esattamente le due persone che rifiuterebbero per la
  ragione sbagliata: `anon` (il cui `auth.uid()` e' nullo → `23502`) e
  `master/approved` (che **e'** il profilo con l'id minimo, quindi
  `assigned_by = user_id` → `23514`).
- **L'esito e' misurato:** 42 celle su 42 conclusive, `42501` su tutte e
  quattordici le persone per l'insert. Zero celle inconcludenti aggiunte.
- **Le righe seminate sono VIVE, non revocate**, e la scelta e' deliberata: e'
  l'unico punto dell'harness in cui la foreign key composta viene esercitata,
  quindi che un'assegnazione legittima sia inseribile e' **misurato** invece che
  assunto.
- **Commit:** `ba7ee06`

### 3. [Rule 1 — un controllo che si autoannulla] Le forme vietate si descrivono, non si scrivono

- **Trovata durante:** task 1, eseguendo il controllo del piano stesso.
- **Il fatto:** il criterio di accettazione pretende che la migration **non**
  contenga offset numerici di fuso, e greppa `\+0[12]|interval '[12] hour'`. La
  mia frase che li **vietava** — *«mai `+01` o `+02` o `interval '2 hours'`»* —
  era l'unico match del file. Lo stesso vale per `ON UPDATE CASCADE`, che il
  piano chiede di spiegare e di non contenere.
- **Cosa e' stato fatto:** le due forme sono **descritte** («una zona nominata,
  mai un offset numerico UTC ne' un intervallo orario che ne faccia le veci»;
  «senza un'azione referenziale a cascata sull'update della chiave referenziata»)
  con una riga che dice **perche'** non sono scritte per esteso.
- **Perche' non ho lasciato che il controllo andasse rosso:** un controllo che va
  letto aggirandolo — «e' rosso, ma e' rosso sulla frase che vieta la cosa» —
  e' un controllo che la terza volta viene ignorato. La fase 35-01 ha registrato
  la scelta opposta su un altro conteggio, dichiarandola («la forma e' stata
  piegata, il fatto no»); qui la scelta e' l'inversa e per la stessa ragione:
  li' piegare la forma salvava il fatto, qui piegare il testo salva il controllo.
- **Commit:** `0ffde92` (offset), `ba7ee06` (cascata)

### 4. [Rule 2 — dichiarazione mancante] L'asimmetria sulla cancellazione di un account

- **Trovata durante:** task 2, ragionando sulla lista di colonne del piano.
- **Il fatto:** lo stesso `MATCH SIMPLE` che libera le righe revocate fa si' che
  `ON DELETE CASCADE` sulla foreign key composta **si applichi alle righe vive e
  non a quelle revocate**. Cancellare un profilo rimuove le sue assegnazioni vive
  e lascia le revocate, che puntano a un `user_id` che non risolve piu'.
- **Cosa e' stato fatto:** dichiarato nella migration, sezione 3b, con la ragione
  per cui e' la direzione tollerabile — un orfano nello stato operativo e' inerte,
  mentre l'alternativa (una seconda chiave a cascata su `user_id`) cancellerebbe
  **la prova che una revoca e' avvenuta**, che e' l'unica cosa che ASSIGN-03
  esiste per impedire. E' la lezione della cascata di `ticket_refunds`
  (`20260808002000:149-153`) applicata invece che ricopiata.
- **Commit:** `ba7ee06`

---

## Verifiche eseguite

| Verifica | Comando | Esito |
|---|---|---|
| Typecheck | `npm run build` | **PASS** — `✓ Compiled successfully` |
| Le due meta' della regola di mezzanotte concordano | `party_end_instant` in SQL contro `partyEndInstant` in TS, tre campioni | **PASS** — identiche, incluso il salto d'ora legale (vedi sotto) |
| I cinque vincoli scattano per nome | 14 sonde contro il container | **PASS** — tabella sopra |
| La cattura di baseline | `npm run baseline:container -- --phase-point=35-02` | **PASS** — exit 0, tre artefatti |
| Il confronto con `35-pre` | `npm run baseline:compare … --only=B1,B2,B3` | **PASS** — 60 differenze, tutte e sole aggiunte di `party_assignments`, 68 policy invariate |
| Nessun offset numerico di fuso | `grep -nE "\+0[12]\|interval '[12] hour'"` | **PASS** — nessun match |
| Nessuna cascata sull'update | `grep -n "ON UPDATE CASCADE"` | **PASS** — nessun match |
| Nessuna policy di scrittura | `grep -nE "FOR (INSERT\|UPDATE\|DELETE)"` | **PASS** — nessun match |
| Ogni `ADD CONSTRAINT` e' preceduto da un `DROP … IF EXISTS` | lettura, un solo `ADD CONSTRAINT` nel file | **PASS** |
| Il segnaposto della fase 43 e' sparito | `grep -n "unwritten" src/types/database.ts` | **PASS** — nessun match |

### La prova che le due implementazioni concordano

Tre campioni, la stessa domanda posta ai due linguaggi:

| data · ora di chiusura | `public.party_end_instant` (SQL) | `partyEndInstant` (TypeScript) |
|---|---|---|
| 2026-10-10 · 06:00 | `2026-10-11T04:00:00Z` | `2026-10-11T04:00:00.000Z` |
| 2026-10-10 · 22:00 | `2026-10-10T20:00:00Z` | `2026-10-10T20:00:00.000Z` |
| 2026-01-10 · 06:00 | `2026-01-11T05:00:00Z` | `2026-01-11T05:00:00.000Z` |

Il terzo e' quello che conta: **stessa ora dichiarata, un'ora di scarto in meno**
— l'offset di Torino e' passato da 2 a 1 senza che una riga di codice lo dica,
perche' la zona e' nominata e non calcolata. E' `time-and-scheduling.md`, gate
*l'ora legale non e' costante*, verificato invece che citato.

### Cosa queste verifiche NON provano

- **La migration non e' applicata in produzione.** Ogni prova sopra viene da un
  container. Che gli oggetti si costruiscano e che i vincoli scattino non dice
  che il prodotto funzioni con essi: quello si vede solo applicando la riga 7
  della coda e deployando il codice.
- **`npm run build` verde non significa niente su questa migration.** I tipi
  vengono da `src/types/database.ts`, non dal database vivo. Il verde e' esatto
  esattamente come lo era prima che questa tabella esistesse — e' il falso verde
  che `35-HUMAN-UAT.md` esiste per denunciare.
- **Nessun test del prodotto e' stato eseguito, perche' non ne esistono.** Le 14
  sonde sono uno script SQL scritto per questa sessione, non una suite: provano
  i vincoli, non i percorsi che li useranno.
- **La RLS e' stata misurata sulle scritture, non sulle letture reali.** B2 dice
  quali persone leggono la tabella nel container con due righe seminate. Che la
  superficie giusta veda le righe giuste e' materia dei piani 35-05 e 35-14.

---

## Threat Flags

Le voci del threat register del piano, con come sono coperte:

| ID | Disposizione | Come, e con quale prova |
|---|---|---|
| T-35-04 | mitigato | `party_assignments_no_self_grant`; provato P2 → `23514`. Vale anche sotto `service_role`: il client service bypassa ogni policy e nessun vincolo |
| T-35-05 | mitigato | FK composta + `live_role_present`; provati P3 → `23503` e P4 → `23514` |
| T-35-06 | mitigato | `revocation_paired` provato (`23514`); **nessuna policy di DELETE** — misurato: `delete ok:0` su 14/14 persone |
| T-35-07 | mitigato | RLS abilitata, due sole policy di SELECT, entrambe nella cattura B1 |
| T-35-08 | mitigato | P8 rifiuta, P12 accetta la **stessa** istruzione dopo la revoca |
| T-35-09 | mitigato | `CREATE OR REPLACE`, `DROP CONSTRAINT IF EXISTS`, `CREATE TABLE IF NOT EXISTS`, `IF NOT EXISTS` sui tre indici, `DROP POLICY IF EXISTS` su entrambe |
| T-35-SC | non applicabile | nessun pacchetto installato o modificato |

**Nessuna superficie di sicurezza nuova oltre a quella pianificata.** Il confronto
delle catture lo misura invece di affermarlo: 68 policy preesistenti invariate,
`0 unexplained`.

Una nota di **osservabilita'**, che vale come segnalazione e non come difetto
introdotto qui: la sezione 3c aggiunge **un nuovo modo di rifiutare
un'operazione** — la demozione di chi tiene un'assegnazione viva. In un prodotto
senza error tracking (`meta-gates.md`) un rifiuto che arriva solo come `23503` in
un log non raggiunge nessuno. La migration scrive che il messaggio deve
**nominare le assegnazioni che bloccano** e che l'effetto dev'essere osservabile
sulla pagina dei membri; **realizzarlo e' del piano 35-08**, ed e' rimandato, non
fatto.

---

## Known Stubs

Nessuno stub di codice.

Due dipendenze in avanti, dichiarate nella migration e non scoperte a valle:

1. **Tre delle quattro capability assegnabili non esistono ancora.**
   `party_assignments_capability_assignable` nomina `door.operate`,
   `door.supervise`, `media.upload`, `party.manage`; oggi `private.capabilities`
   ne tiene solo la prima. Le altre tre le conia la migration successiva della
   coda (`20260809001000_assignment_resolver.sql`). Fra le due righe una riga con
   quelle chiavi non e' inseribile — **e non c'e' niente da inserire nel
   frattempo**, perche' la prima scrittura arriva da una superficie che non
   esiste ancora.
2. **`ends_at` non ha ancora un produttore.** Questa migration non installa
   nessun trigger che lo calcoli, di proposito: il calcolo vive nel writer atomico
   del piano 35-04, accanto all'insert nel registro con cui dev'essere atomico.

---

## Self-Check: PASSED

- `supabase/migrations/20260809000000_party_assignments.sql` — FOUND
- `src/utils/datetime.ts` — FOUND, contiene `party_end_instant`
- `src/types/database.ts` — FOUND, contiene `PartyAssignmentRow`, non contiene piu' `unwritten`
- `scripts/rls-baseline.mjs` — FOUND, contiene la voce `party_assignments`
- `.planning/phases/32-capability-model-in-the-database/baseline/32-BASELINE-policies.container.35-02.json` — FOUND
- `.planning/phases/32-capability-model-in-the-database/baseline/32-BASELINE-reads.container.35-02.json` — FOUND
- `.planning/phases/32-capability-model-in-the-database/baseline/32-BASELINE-writes.container.35-02.json` — FOUND
- `.planning/phases/35-per-night-assignments/deferred-items.md` — FOUND
- commit `0ffde92` — FOUND
- commit `ba7ee06` — FOUND
- commit `66ccf2a` — FOUND
- `.planning/STATE.md` e `.planning/ROADMAP.md` — **NON MODIFICATI**, come da contratto worktree
- `.planning/phases/35-per-night-assignments/35-04-PLAN.md` — **NON MODIFICATO**, altra onda; la correzione e' in `deferred-items.md`
