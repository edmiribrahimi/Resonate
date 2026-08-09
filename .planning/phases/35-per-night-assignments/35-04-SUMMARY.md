---
phase: 35-per-night-assignments
plan: 04
subsystem: supabase-data
tags: [migration, security-definer, register, attribution, time-and-scheduling, wave-3]

# Dependency graph
requires:
  - plan: 35-02
    provides: "`public.party_assignments` con i suoi cinque vincoli e `public.party_end_instant`, piu' la voce 1 di `deferred-items.md` che correggeva questo piano prima che venisse eseguito"
  - plan: 43-final
    provides: "`public.membership_acts` e `public.record_membership_act` — APPLICATI in produzione il 2026-08-08, quindi il registro in cui questo piano scrive esiste davvero"
provides:
  - "il CHECK `membership_acts_act_check` allargato da sette a NOVE valori, con `assigned` e `unassigned`"
  - "`MembershipAct` a nove valori in `src/lib/membership/acts.ts`, nello stesso commit del CHECK"
  - "D-18 riscritta come `COMMENT ON COLUMN public.membership_acts.party_id`: il criterio non e' la scadenza, e' che ammettere una persona non e' concedere un potere"
  - "`public.record_party_assignment_act(uuid, uuid, text, text, uuid)` — il writer atomico: la riga e il suo atto in una transazione, per entrambi gli atti"
  - "le catture `35-04` e `35-04-final`: 70 policy, 22 tabelle con RLS, 308 celle di lettura, 924 sonde di scrittura"
affects: [35-05, 35-06, 35-08, 35-14, 35-18, 35-21]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "un writer atomico delega al writer che esiste invece di re-implementarlo: `subject_label` deve restare un `membership_code` imposto dal writer, e un secondo writer e' un secondo posto in cui quella regola si dimentica"
    - "una funzione sola per due atti opposti, perche' due funzioni della stessa forma divergono: il controllo successivo finisce solo su quella che qualcuno stava guardando"
    - "un paragrafo di una migration applicata non si modifica: la riscrittura vive su un `COMMENT ON COLUMN`, che sta sull'oggetto e non sul file, e dichiara quale dei due testi governa"
    - "un rifiuto per argomento sbagliato si solleva col proprio nome invece di lasciarlo arrivare come vincolo: tre codici diversi a seconda del ramo non lasciano ramificare sulla causa"

key-files:
  created:
    - supabase/migrations/20260809002000_assignment_acts.sql
    - .planning/phases/32-capability-model-in-the-database/baseline/32-BASELINE-policies.container.35-04.json
    - .planning/phases/32-capability-model-in-the-database/baseline/32-BASELINE-reads.container.35-04.json
    - .planning/phases/32-capability-model-in-the-database/baseline/32-BASELINE-writes.container.35-04.json
    - .planning/phases/32-capability-model-in-the-database/baseline/32-BASELINE-policies.container.35-04-final.json
    - .planning/phases/32-capability-model-in-the-database/baseline/32-BASELINE-reads.container.35-04-final.json
    - .planning/phases/32-capability-model-in-the-database/baseline/32-BASELINE-writes.container.35-04-final.json
  modified:
    - src/lib/membership/acts.ts

key-decisions:
  - "`ends_at` si calcola da `event_parties.date`, MAI da `events.date`: il piano istruiva il join sbagliato, e la divergenza di 24 ore e' stata misurata contro container invece che argomentata"
  - "D-18 e' riscritta e non affiancata: il criterio non e' che l'atto scada con la notte — anche un'assegnazione scade — ma che ammettere una persona non sia concedere un potere"
  - "La riscrittura sta su un `COMMENT ON COLUMN` perche' la migration del registro e' applicata in produzione dal 2026-08-08 e non si modifica"
  - "Una sola funzione per `assigned` e `unassigned`, con `p_act` come argomento invece di due funzioni gemelle"
  - "Un attore nullo viene rifiutato in testa alla funzione col proprio nome, invece di arrivare come `23502`, `23514` o `23514` a seconda del ramo"
  - "I quattro assi ruolo/stato NON restano NULL su un atto di assegnazione: il writer condiviso li calcola e escono uguali fra loro. L'affermazione contraria era nel piano ed era falsa"

# Metrics
metrics:
  duration: "~55 min"
  completed: 2026-08-08
  tasks_completed: 3
  tasks_total: 3
  checkpoint_open: false
---

# Fase 35 Piano 04: il registro delle assegnazioni — Summary

Assegnare e revocare sono **due atti registrati**, e la riga e il suo atto stanno
nella stessa transazione: non esiste lo stato in cui una persona tiene un potere
che il registro non sa chi le ha dato. La revoca aggiorna una riga e nessun
percorso di questo prodotto la cancella. E la contraddizione che la fase 43 aveva
lasciato aperta — D-18, che alla lettera avrebbe escluso anche l'assegnazione —
e' **riscritta**, non aggirata.

**La migration non e' applicata in produzione.** E' la riga 9 della coda di
`35-HUMAN-UAT.md` e si applica a mano. Ogni prova qui sotto viene da un container
`postgres:17.6` costruito con lo shim, lo schema base e tutte e 46 le migration
in ordine.

---

## Cosa e' stato fatto

| Task | Nome | Commit | File |
|---|---|---|---|
| 1 | I due valori d'atto, nel CHECK e nella union, nello stesso commit | `8c1a77d` | `supabase/migrations/20260809002000_assignment_acts.sql`, `src/lib/membership/acts.ts` |
| 2 | Riscrivere D-18 con il criterio corretto | `a123d4b` | la migration, le tre catture `35-04` |
| 3 | `public.record_party_assignment_act` — una transazione, due effetti | `9083a1b` | la migration, `src/lib/membership/acts.ts`, le tre catture `35-04-final` |

**Lingua dei commenti della migration:** inglese, come il suo template dichiarato
`20260808002000_membership_register.sql` e come `20260809000000_party_assignments.sql`
della stessa fase. Il paragrafo sull'idempotenza resta in italiano, come nel suo
precedente (`20260808001000_role_implies_approved.sql:103-111`).

---

## La correzione obbligatoria, misurata invece che accettata

Il piano, alla riga 207, istruiva il writer a calcolare `ends_at` con
`public.party_end_instant(e.date, …)` e un join a `public.events`.
**Non e' stato implementato come scritto.** L'espressione usata e'

```sql
public.party_end_instant(ep.date, coalesce(ep.end_time, '06:00'::time))
```

letta da `public.event_parties ep where ep.id = p_party_id`, **senza join a
`public.events`**.

Su una serata costruita apposta perche' la sub-serata cada il giorno dopo il
genitore, le due letture divergono di **ventiquattro ore esatte**, e la riga
scritta prende quella giusta:

| Misura | Valore |
|---|---|
| `events.date` | `2026-10-09` |
| `event_parties.date` | `2026-10-10` |
| `party_end_instant(ep.date, …)` | `2026-10-12T04:00:00Z` |
| `party_end_instant(e.date, …)` | `2026-10-11T04:00:00Z` |
| divergenza | **24 ore** |
| `ends_at` effettivamente scritto dalla funzione | `2026-10-12T04:00:00Z` — **quello della serata** |

La direzione dell'errore evitato e' quella insicura: un `ends_at` un giorno in
anticipo e' un'assegnazione che **scade prima della serata**, cioe' un membro
dello staff rifiutato alla porta davanti a una fila — la peggiore delle due
asimmetrie secondo `CLAUDE.md`, principio operativo 3.

Fonte della correzione: `deferred-items.md` voce 1, aperta dal piano 35-02 e
scritta anche nella sezione 3d di `20260809000000_party_assignments.sql`.
**La voce 1 puo' essere chiusa: era bloccante per questo piano ed e' consumata
qui.**

---

## Le prove, una per una

Non «i vincoli ci sono»: **ognuno e' stato fatto scattare, per nome**, contro il
container. Non esiste un test runner per il prodotto, quindi questa e' l'unica
prova che esistera'.

### Il CHECK, e la trappola che non e' scattata per caso

| Prova | Cosa e' stato chiesto | Esito osservato |
|---|---|---|
| A1 | quanti CHECK governano `act` dopo il `DROP`/`ADD` | **1** — non due |
| A1 | il CHECK porta i nove valori | i sette originali **piu'** `assigned` e `unassigned` |
| A2 | il `COMMENT ON COLUMN` di `party_id` esiste ed e' quello riscritto | 1186 caratteri, contiene il criterio, `door_scan_events` e la parola *supersedes* |
| A3 | inserire un atto `assigned` e uno `unassigned` | **accettati** |
| A3 | inserire un atto `suspended` | `23514` **`membership_acts_act_check`** |

**A1 e' la prova che conta, e il piano non la chiedeva.** Il `CHECK` originale era
dichiarato **inline** su una colonna, quindi auto-nominato: se Postgres l'avesse
chiamato diversamente da `membership_acts_act_check`, il `DROP … IF EXISTS`
sarebbe stato un no-op **silenzioso**, l'`ADD` sarebbe riuscito accanto al
vecchio, e il vincolo a sette valori avrebbe continuato a rifiutare `assigned` —
al momento in cui qualcuno assegna qualcuno a una notte, non all'applicazione del
file. Contare i vincoli che governano `act` e' l'unico modo di distinguere quel
caso da quello giusto: **uno**, ed e' il nuovo.

### Il writer

| Prova | Cosa e' stato tentato | Esito osservato |
|---|---|---|
| P1 | la concessione legittima di `door.operate` | **accettata**, ritorna l'id della riga |
| P2 | da dove viene `ends_at` | **dalla serata** — coincide con `party_end_instant(ep.date, …)`, non con quello dell'evento |
| P3 | l'atto e' atterrato nel registro con lo stesso `party_id` | 1 riga `assigned`, `subject_label` = il `membership_code`, `note` nulla |
| P4 | una seconda concessione **viva** identica | `23505` **`party_assignments_live_unique`** |
| P5 | assegnare a se stessi | `23514` **`party_assignments_no_self_grant`** |
| P6 | `p_act = 'promoted'` | `22023` `party_assignments.unknown_act: promoted` |
| P7 | attore nullo | `22023` `party_assignments.actor_required: …` |
| P8 | una notte che non esiste | `P0002` `party_assignments.party_not_found: …` |
| P9 | la revoca | **accettata** |
| P10 | **la riga esiste ancora dopo la revoca** | 1 riga · `revoked_at` valorizzato · `revoked_by` valorizzato · `assignee_role` a `NULL` · `granted_at` intatto |
| P11 | revocare una seconda volta, senza niente di vivo | `P0002` `party_assignments.no_live_assignment: …` |
| P12 | demotare il titolare **dopo** la revoca | **accettata** — la nullita' di `assignee_role` ha liberato la FK composta |
| P13 | ri-concedere dopo una revoca | **accettata** |
| P14 | cosa tiene il registro alla fine | `assigned, unassigned, assigned` — **tre righe, una per atto** |
| P15 | chi puo' eseguire la funzione | `anon` **false** · `authenticated` **false** · `service_role` **true** · `SECURITY DEFINER` true · `search_path=""` |

**P10 e' ASSIGN-03 misurato.** Una `DELETE` avrebbe mostrato zero righe; la riga
c'e', e con `granted_at` e `revoked_at` risponde ancora alla domanda che il drain
offline pone **dopo** la revoca: *era viva al tempo `scannedAt`?* Una riga
cancellata non risponde, e la scansione resta appesa.

**P12 e' D-B che continua a funzionare attraverso questo writer**, non solo
attraverso un `UPDATE` scritto a mano: e' la revoca prodotta dalla funzione ad
azzerare `assignee_role`, ed e' quell'azzeramento che permette la demotione dopo.

### La cattura, e la riga che conta di piu'

`npm run baseline:container -- --phase-point=35-04` e `--phase-point=35-04-final`,
senza `--overwrite`, exit 0 entrambe. Il container ha applicato **46** file di
migration (45 alla cattura `35-02`).

`npm run baseline:compare --target=container --before-point=35-02
--after-point=35-04-final --only=B1,B2,B3`:

> `B1 — 70 policies, every difference explained by the whitelist`
> `70 unchanged · 0 by T1 · 0 by T2 · 0 by both · 0 unexplained`
> `CAP-03: clean — B1, B2, B3 compared, nothing moved that the whitelist does not explain.`

**Zero differenze su tutti e tre i quadri.** Questa migration non aggiunge
nessuna policy, nessuna tabella e nessuna colonna: aggiunge due valori a un
CHECK, un commento e una funzione revocata a tutti tranne `service_role`. Il
confronto lo **misura** invece di affermarlo — 70 policy preesistenti
byte-identiche, 308 celle di lettura e 924 di scrittura invariate.

---

## Deviazioni dal piano

### 1. [Rule 1 — difetto noto, correzione obbligata] `ends_at` dalla serata, non dall'evento

- **Fonte:** `deferred-items.md` voce 1, marcata **BLOCCANTE per 35-04**, aperta
  dal piano 35-02 che l'aveva misurata sul proprio container.
- **Cosa istruiva il piano:** `35-04-PLAN.md:207`,
  `public.party_end_instant(e.date, …)` con join a `public.events`.
- **Cosa e' stato scritto:** `public.party_end_instant(ep.date, coalesce(ep.end_time,
  '06:00'::time))` da `public.event_parties ep`, senza join.
- **Perche':** `public.event_parties` ha una propria colonna `date` dal
  2026-02-26 (`20260226300000_multi_sub_events.sql:20-27`) proprio perche' una
  sub-serata puo' cadere su un giorno solare diverso. Le due letture divergono di
  24 ore, e l'errore evitato e' quello che rifiuta alla porta.
- **Misurato, non ereditato:** la tabella in cima a questo documento e' stata
  prodotta in questa sessione, contro un container, su una serata costruita
  apposta. La voce 1 diceva la stessa cosa; e' stata **riverificata** invece che
  citata (`ai-engineering.md`, gate *documentazione datata*).
- **Commit:** `9083a1b`

### 2. [Rule 1 — un'affermazione del piano che il container ha smentito] I quattro assi ruolo/stato NON restano `NULL`

- **Trovata durante:** task 3, alla prima esecuzione del probe.
- **Cosa dicevano il piano e i miei primi commenti:** che un atto di assegnazione
  lascia `role_before`, `role_after`, `status_before`, `status_after` a `NULL`,
  perche' *«`NULL` significa: questo atto non ha toccato quell'asse»*.
- **Cosa fa davvero il database:** `public.record_membership_act` calcola i
  quattro valori da se' — `role_before = v_subject.role`,
  `role_after = coalesce(p_role, v_subject.role)`
  (`20260808002000:459-460`). Passare `NULL` sui due assi **non** produce colonne
  vuote: produce `["staff","staff","approved","approved"]`, misurato.
- **Cosa e' stato fatto:** corretti i commenti nella migration e in `acts.ts`.
  Su un atto di assegnazione il fatto vero e' **`before == after` su entrambi gli
  assi**, ed e' il modo in cui questo registro dice che nessun asse si e' mosso.
- **E il sottoprodotto vale piu' della correzione:** `role_before` sull'atto
  `assigned` **conserva il ruolo che il titolare aveva alla concessione** — cioe'
  esattamente il fatto che `party_assignments.assignee_role` perde quando la riga
  viene revocata, e che il piano 35-02 aveva dichiarato come prezzo accettato del
  meccanismo della chiave composta. Il prezzo si paga sulla tabella operativa e
  si recupera qui. E' quello per cui esiste un registro invece di una seconda
  colonna.
- **Commit:** `9083a1b`

### 3. [Rule 2 — rifiuto senza categoria] L'attore nullo si rifiuta col proprio nome

- **Trovata durante:** task 3, scrivendo il ramo `unassigned`.
- **Il fatto:** un `p_actor_id` nullo fallisce comunque, ma **con tre codici
  diversi a seconda del ramo**: `23502` su `party_assignments.assigned_by`,
  `23514` su `party_assignments_revocation_paired`, `23514` su
  `membership_acts_actor_attributed`. Un chiamante che ramifica su `error.code`
  non puo' distinguere «hai dimenticato l'autore» da «hai violato una regola sul
  ruolo».
- **Cosa e' stato fatto:** una guardia in testa alla funzione che solleva
  `party_assignments.actor_required` con `ERRCODE = 'invalid_parameter_value'`,
  nominando solo identificatori. D-11: un atto non attribuito e' indistinguibile
  da un atto il cui autore semplicemente non e' stato scritto.
- **Commit:** `9083a1b`

### 4. [Rule 3 — una migration a meta' non deve restare applicabile] `COMMIT;` in ogni commit intermedio

- **Trovata durante:** task 1.
- **Il fatto:** il piano faceva aprire `BEGIN;` al task 1 e chiudere `COMMIT;` al
  task 3. Fra i due, il file committato sarebbe stato una transazione **aperta e
  mai chiusa**, e questa coda si applica a mano.
- **Cosa e' stato fatto:** ogni commit intermedio chiude con `COMMIT;`, e le
  sezioni successive vengono inserite **prima** di esso. Il file finale e'
  identico a quello che il piano descrive: una sola transazione, tre cambiamenti.
- **Commit:** `8c1a77d`, `a123d4b`, `9083a1b`

### 5. [dichiarazione, non correzione] Un `RAISE EXCEPTION` interpola anche `p_act`

- **Il criterio di accettazione del task 3** pretende che ogni `RAISE EXCEPTION`
  interpoli **solo** `p_party_id`, `p_subject_id` o `p_capability`.
- **Cosa c'e' in piu':** `party_assignments.unknown_act: %` interpola `p_act`.
- **Perche' resta:** `p_act` e' un valore di un vocabolario chiuso di nove
  parole. Non e' un nome, non e' un indirizzo, non e' un `membership_code` — non
  contiene dato personale, che e' cio' che quel criterio protegge. Toglierlo
  renderebbe il rifiuto muto sul **solo** dato che spiega perche' e' avvenuto, ed
  e' esattamente il pattern che `meta-gates.md` chiama fallimento silenzioso.
  La lettera del criterio e' piegata; il fatto che protegge no.
- **Verificato:** i cinque `RAISE EXCEPTION` del file interpolano
  `p_act`, `p_party_id`, `p_subject_id`, `p_capability` e nient'altro.

---

## Verifiche eseguite

| Verifica | Comando | Esito |
|---|---|---|
| Typecheck | `npm run build` | **PASS** — `✓ Compiled successfully` |
| La migration si applica in una transazione sola | 46 migration nel container, due volte | **PASS** — exit 0 |
| Un solo CHECK governa `act`, e porta nove valori | interrogazione di `pg_constraint` | **PASS** — 1 vincolo, 9 valori, un valore fuori vocabolario rifiutato `23514` |
| Il `COMMENT ON COLUMN` esiste ed e' quello riscritto | `col_description` | **PASS** — 1186 caratteri, criterio + `door_scan_events` + *supersedes* |
| `ends_at` viene dalla serata | serata con sub-serata il giorno dopo | **PASS** — 24 ore di divergenza, la funzione prende quella giusta |
| I quattro vincoli di riga scattano per nome attraverso il writer | P4, P5 | **PASS** — `23505`, `23514` |
| I rifiuti della funzione hanno categorie distinte | P6, P7, P8, P11 | **PASS** — `22023` × 2, `P0002` × 2, ognuno con il proprio nome |
| La revoca non cancella | P10 | **PASS** — riga presente, `assignee_role` a `NULL`, `granted_at` intatto |
| Il registro tiene un atto per operazione | P14 | **PASS** — `assigned, unassigned, assigned` |
| `EXECUTE` al solo `service_role` | `has_function_privilege` | **PASS** — anon/authenticated **false**, service_role **true** |
| `SECURITY DEFINER` con `search_path` fissato | `pg_proc.proconfig` | **PASS** — `search_path=""` |
| `REVOKE` prima di `GRANT` | riga 485 contro riga 488 | **PASS** |
| Nessun `DELETE FROM public.party_assignments` | `grep -c` | **PASS** — 0 |
| Il file non allarga niente a nessuno | `baseline:compare 35-02 → 35-04-final` | **PASS** — 70 policy invariate, `0 unexplained`, `CAP-03: clean` |

### Cosa queste verifiche NON provano

- **La migration non e' applicata in produzione.** E' la riga 9 della coda di
  `35-HUMAN-UAT.md`. Che gli oggetti si costruiscano e che i rifiuti scattino non
  dice che il prodotto funzioni con essi.
- **`npm run build` verde non dice niente su questa migration.** I tipi vengono
  da `src/types/database.ts`, non dal database vivo. E' il falso verde che
  `35-HUMAN-UAT.md` esiste per denunciare.
- **Nessun test del prodotto e' stato eseguito, perche' non ne esistono.** Le
  sonde sono uno script scritto per questa sessione e non committato: provano la
  funzione, non i percorsi che la useranno.
- **Nessuna superficie chiama ancora questo writer.** Il primo chiamante e' del
  piano 35-05. Che il rifiuto sia *osservabile* — e non solo sollevato — e'
  materia di quel piano, ed e' segnalato sotto.
- **`door.operate` e' l'unica capability provata.** Le altre tre che
  `party_assignments_capability_assignable` nomina — `door.supervise`,
  `media.upload`, `party.manage` — le conia la migration del piano 35-03, che non
  esiste in questo worktree.

---

## Threat Flags

Le voci del threat register del piano, con come sono coperte:

| ID | Disposizione | Come, e con quale prova |
|---|---|---|
| T-35-16 | mitigato | `REVOKE` poi `GRANT`, due statement in quest'ordine; misurato con `has_function_privilege`: anon **false**, authenticated **false**, service_role **true** |
| T-35-17 | mitigato | una sola funzione `plpgsql`: la riga e l'atto sono nella stessa transazione. P14 conta tre atti per tre operazioni |
| T-35-18 | mitigato | il ramo `unassigned` e' un `UPDATE`; `grep -c "DELETE FROM public.party_assignments"` = 0, e P10 misura che la riga sopravvive |
| T-35-19 | mitigato | i cinque `RAISE EXCEPTION` nominano solo identificatori e `p_act`; `subject_label` resta un `membership_code`, imposto dal writer delegato e misurato in P3 |
| T-35-20 | mitigato | `SELECT p.role … FOR UPDATE` nella stessa transazione dell'insert; P2 mostra `assignee_role = staff` copiato dalla lettura bloccata |
| T-35-21 | mitigato | nessun `ON CONFLICT`: P4 → `23505` `party_assignments_live_unique` |
| T-35-SC | non applicabile | nessun pacchetto installato o modificato |

**Nessuna superficie di sicurezza nuova oltre a quella pianificata**, e non e'
un'affermazione: `baseline:compare` riporta `0 unexplained` su B1, B2 e B3.

Una nota di **osservabilita'**, come segnalazione e non come difetto introdotto
qui: questa funzione aggiunge **cinque nuovi modi di rifiutare un'operazione**
(`unknown_act`, `actor_required`, `subject_not_found`, `party_not_found`,
`no_live_assignment`) piu' i quattro dei vincoli. In un prodotto senza error
tracking (`meta-gates.md`) un rifiuto che arriva solo come codice in un log non
raggiunge nessuno. **Ognuno ha una categoria distinta proprio perche' la
superficie possa ramificarci sopra e mostrarlo**, ma mostrarlo e' del piano
35-05: qui e' reso possibile, non fatto. E la regola per chi lo raccogliera' e'
scritta nella migration — si ramifica su `error.code`, mai su un messaggio
interpretato (Next redige il messaggio di una Server Action in produzione), e non
si logga mai `error.details`, che su queste tabelle porta l'intera riga fallita.

---

## Known Stubs

Nessuno stub di codice.

Due dipendenze in avanti, dichiarate e non lasciate scoprire a valle:

1. **Nessun chiamante.** `public.record_party_assignment_act` esiste e non e'
   invocata da nessuna riga di TypeScript in questo worktree. Il primo chiamante
   e' del piano 35-05, e la funzione e' stata scritta perche' quella superficie
   non abbia scelte: `EXECUTE` e' del solo `service_role`, e non esiste un
   secondo modo di scrivere in `public.party_assignments`.
2. **Tre delle quattro capability assegnabili non esistono ancora** nel
   catalogo — le conia `20260809001000_assignment_resolver.sql` (piano 35-03,
   riga 8 della coda, prima di questa). Fra le due righe una concessione con
   quelle chiavi non e' inseribile, e non c'e' niente da inserire nel frattempo.

---

## Voce fuori perimetro, aperta

> **Non e' stata scritta in `deferred-items.md` di proposito.** Tre agenti della
> stessa onda scrivono in parallelo, e tre append allo stesso file sono tre
> conflitti al momento del merge. Sta qui perche' l'orchestratore legge questo
> documento; va spostata in `deferred-items.md` quando l'onda e' chiusa.

**La semantica `NULL` documentata su `membership_acts` non e' quella che il suo
unico writer produce.**

`20260808002000_membership_register.sql:244-246` dichiara che `NULL` sui quattro
assi significa *«questo atto non ha toccato quell'asse»*, e che *«una promozione
scrive entrambe le colonne del ruolo e lascia nulla la coppia dello stato quando
lo stato non si e' mosso»*. Misurato: `public.record_membership_act` scrive
`role_before = v_subject.role` e `status_before = v_subject.status`, entrambe
`NOT NULL` sull'origine, e le after-values come `coalesce(argomento, before)`.
**Nessun atto passato per quel writer ha mai lasciato una di quelle quattro
colonne nulla, e nessuno potra'.**

- **Perche' non e' stato corretto qui:** la migration e' **applicata in
  produzione dal 2026-08-08**, e `supabase-data.md`, gate *migration in avanti*,
  vieta di modificarla. Correggere il comportamento significherebbe riscrivere
  `record_membership_act` in una nuova migration — un cambio al writer di ogni
  atto del registro, che non appartiene a questa fase.
- **Cosa deve succedere:** decidere quale delle due si adegua. Se vale il
  comportamento, il commento sulle colonne va riscritto (e questo file mostra
  come: un `COMMENT ON COLUMN` in una migration successiva). Se vale il commento,
  serve un writer che distingua *non toccato* da *toccato e invariato* — ed e'
  una decisione sul significato del registro, non un fix.
- **Chi la incontrera' per primo:** il piano 35-08 o 35-14, cioe' la prima
  superficie che **legge** il registro e deve decidere cosa mostrare quando
  `role_before === role_after`.
- **Dove e' gia' scritto il fatto:** `20260809002000_assignment_acts.sql`,
  sezione 3, e `src/lib/membership/acts.ts`.

---

## Self-Check: PASSED

- `supabase/migrations/20260809002000_assignment_acts.sql` — FOUND
- `src/lib/membership/acts.ts` — FOUND, contiene `unassigned`, non contiene piu' la frase che riservava i due valori
- `.planning/phases/32-capability-model-in-the-database/baseline/32-BASELINE-policies.container.35-04.json` — FOUND
- `.planning/phases/32-capability-model-in-the-database/baseline/32-BASELINE-reads.container.35-04.json` — FOUND
- `.planning/phases/32-capability-model-in-the-database/baseline/32-BASELINE-writes.container.35-04.json` — FOUND
- `.planning/phases/32-capability-model-in-the-database/baseline/32-BASELINE-policies.container.35-04-final.json` — FOUND
- `.planning/phases/32-capability-model-in-the-database/baseline/32-BASELINE-reads.container.35-04-final.json` — FOUND
- `.planning/phases/32-capability-model-in-the-database/baseline/32-BASELINE-writes.container.35-04-final.json` — FOUND
- commit `8c1a77d` — FOUND
- commit `a123d4b` — FOUND
- commit `9083a1b` — FOUND
- nessuna cancellazione di file nei tre commit — `git diff --diff-filter=D` vuoto
- `.planning/STATE.md` e `.planning/ROADMAP.md` — **NON MODIFICATI**, come da contratto worktree
- `.planning/phases/35-per-night-assignments/deferred-items.md` — **NON MODIFICATO**: la voce 1 e' consumata da questo piano ma la chiusura spetta a chi chiude l'onda, e una scrittura in parallelo su quel file sarebbe un conflitto a tre
