---
phase: 43-role-model-account-creation
plan: 07
subsystem: access-gating
tags: [register, audit, rls, capability, security-definer, append-only]
requires:
  - "43-05 — the `staff` role, in both role CHECKs"
  - "43-06 — `profiles_role_implies_approved`, which this plan's function is judged by"
  - "32-06 — `private.capabilities`, `private.role_capabilities`, `private.has_capability`"
provides:
  - "public.membership_acts — the register of acts on an account's role and status, append-only"
  - "public.record_membership_act(uuid,text,uuid,text,text,text,text,uuid) -> uuid — the only writer"
  - "`register.read` — the ninth capability, granted to master and organizer, both requires_approved = true"
  - "MembershipAct / MembershipActorKind — the register's vocabulary, in a module that imports nothing"
  - "MembershipActRow — the row shape, documented and enforced by nothing"
affects:
  - "43-09 — instruments the six existing acts; calls the function above"
  - "43-11 — writes `admin_manual` on creation; calls the function above"
  - "43-12 — the register-read surface, gated on `register.read`"
  - "35 — per-night assignment writes this same register, using `party_id`"
  - "scripts/rls-baseline.mjs — PROBE_PAYLOADS now names a table production does not have"
tech-stack:
  added: []
  patterns:
    - "append-only by construction: RLS on, a SELECT policy, deliberately no write policy"
    - "the mutation and its record in one SECURITY DEFINER function, because two PostgREST calls cannot be atomic"
    - "actor_kind beside the actor, with a two-directional CHECK, so an unattributed act is unrepresentable"
key-files:
  created:
    - "supabase/migrations/20260808002000_membership_register.sql"
    - "src/lib/membership/acts.ts"
    - ".planning/phases/32-capability-model-in-the-database/baseline/32-BASELINE-policies.container.43-07.json"
    - ".planning/phases/32-capability-model-in-the-database/baseline/32-BASELINE-reads.container.43-07.json"
    - ".planning/phases/32-capability-model-in-the-database/baseline/32-BASELINE-writes.container.43-07.json"
  modified:
    - "src/lib/capabilities/keys.ts"
    - "src/types/database.ts"
    - "scripts/verify-capabilities.mjs"
    - "scripts/rls-baseline.mjs"
decisions:
  - "D-19 settled by minting a ninth key rather than flipping `staff.manage`'s requires_approved; the door's two `false` rows are untouched"
  - "No own-row read for the subject of an act — a rejection row visible to the rejected person turns `rejected` into a communication"
  - "D-18 recorded in the migration: a door override stays in `door_scan_events`"
  - "This is a register of ACTS, not the association's libro soci — stated plainly below"
  - "Verified against the container; the migration is committed and NOT applied to production"
metrics:
  tasks: 3
  duration: ~1h
  completed: 2026-08-08
---

# Phase 43 Plan 07: The Register of Acts — Summary

Il primo registro di questo repository: una tabella append-only che tiene creazione,
approvazione, rifiuto, promozione, retrocessione, disattivazione e riattivazione —
ognuna con il suo autore, il *tipo* del suo autore, e i valori di ruolo e stato
prima e dopo — scritta da una sola funzione `SECURITY DEFINER` che compie la
mutazione e la sua registrazione **nella stessa transazione**.

---

## Che cosa è questo registro, e che cosa non è

**È un registro di ATTI compiuti dentro il prodotto** su `role` e `status` di un
account.

**NON è il libro soci dell'associazione.** `legal-compliance.md` (gate *un
ingresso riservato ai soci ha bisogno di soci veri*) e `community-membership.md`
(gate *socio e utente non sono la stessa cosa*) dicono la stessa cosa da due lati:
se la piattaforma diventa il registro dei soci, **è una decisione da dichiarare**,
perché cambia che cosa significano `member` e `approved` e che cosa lo scanner
offline deve poter fare alla porta. Quella decisione **non esiste**, e questo piano
non l'ha presa per implicazione. La frase è scritta anche dentro la migration
(righe 44-56), perché chi un domani volesse usare questa tabella per quello scopo
non le sta aggiungendo una colonna: le sta aggiungendo un obbligo di legge.

---

## Task 1 — la migration (`62c5284`)

`supabase/migrations/20260808002000_membership_register.sql`, una sola
transazione, quattro cambiamenti.

**Il prefisso.** `20260808002000` è stato verificato libero prima di scrivere il
file (`ls supabase/migrations/`: gli occupati erano `…000000`, `…000500`,
`…001000`) e ordina dopo `20260808001000_role_implies_approved.sql`. L'ordine di
deploy `staff_role` → `role_implies_approved` → *questo* è preservato: il file
inserisce righe in `private.role_capabilities`, che dopo 43-05 ha un CHECK a
quattro valori, e la sua funzione scrive `public.profiles`, che dopo 43-06 ha il
vincolo `role ⇒ approved`.

**1 · `register.read`, la nona capability.** Concessa a `master` e a `organizer`,
entrambe con `requires_approved = true`. La ragione di D-19 è scritta accanto alle
grant: *il registro contiene rifiuti*, e `staff.manage` avrebbe ammesso un
organizer il cui accesso non è mai stato approvato, perché quella chiave porta
`requires_approved = false`. Quel `false` **non è stato girato**: è lo stesso che
tiene aperto `door.operate`. **Le due righe `door.operate` con
`requires_approved = false` sono intatte** — verificato meccanicamente da
`verify:capabilities`, lato 5, assertion 2.

Rifiutati e dichiarati: `staff` (D-03 — leggere una stagione di rifiuti non è il
lavoro di una serata), `member`, `anon`, e **il soggetto dell'atto su se stesso**.
Quest'ultimo è il rifiuto che sembra scortese e non lo è:
`attendances_select_own` (`schema.sql:243-244`) offriva il precedente ed è stato
deliberatamente non seguito, perché una riga di rifiuto visibile alla persona
rifiutata trasforma `rejected` da stato in **comunicazione**, e quella
formulazione si sceglie una volta sola, con cura — non si lascia trapelare da una
tabella.

**2 · `public.membership_acts`.** Colonne come da piano. Due scelte portano peso:

- `subject_label text NOT NULL` — **un codice di membership, mai un indirizzo e
  mai un nome**. La regola è imposta dall'unico scrittore, non dalla memoria di
  chi chiama: la funzione legge `profiles.membership_code` e nient'altro.
- `role_before` / `role_after` / `status_before` / `status_after` sono `text`
  nudi, **senza FK e senza CHECK**. Un'etichetta di ruolo conservata è *prova di
  che cosa era vero allora*: vincolarla la renderebbe una quarta enumerazione da
  allargare e, il giorno in cui un ruolo venisse ritirato, renderebbe
  irrappresentabile la storia di quel ruolo.
- `party_id` esiste, nullable, non scritto da nulla oggi — per la fase 35, con il
  precedente citato alla lettera da `20260807000000_capability_model.sql:206-208`.

**2b · D-22, la divergenza deliberata dall'analogo.** `door_scan_events.operator_id`
è `NOT NULL`: alla porta qualcuno teneva il telefono. Qui no — la retrocessione da
riconciliazione di D-16 non ha autore umano. Quindi `actor_kind` sta accanto
all'attore e un CHECK a livello di tabella rende irrappresentabili **entrambe** le
combinazioni che significherebbero "nessuno":

```sql
CONSTRAINT membership_acts_actor_attributed CHECK (
  (actor_kind = 'user'   AND actor_id IS NOT NULL) OR
  (actor_kind = 'system' AND actor_id IS NULL)
)
```

La seconda direzione conta quanto la prima: un atto `system` *con* un attore è un
atto umano che indossa il nome del sistema, e si leggerebbe come automazione in
ogni revisione successiva.

**3 · RLS.** Abilitata, **una** policy `FOR SELECT` con il wrapper `(select …)` —
che è ciò che produce la valutazione una volta per statement, non `STABLE` — e
**nessuna** policy di scrittura, con il paragrafo che dice che l'omissione è un
progetto e non un difetto.

**4 · `record_membership_act`.** `plpgsql`, `SECURITY DEFINER`,
`SET search_path = ''`, ogni riferimento qualificato di schema. Blocca e legge il
soggetto (`for update`), scrive il profilo quando un asse si muove, inserisce la
riga con i valori prima/dopo, restituisce l'id. `REVOKE ALL` da `public`, `anon`,
`authenticated`; `GRANT EXECUTE` al solo `service_role`.

Il commento D-18 è presente: un override alla porta resta in `door_scan_events`,
perché non cambia *chi qualcuno è*, e due registri con verità sovrapposte sono
peggio di entrambi.

**Verifiche automatiche del task 1**, tutte eseguite:

| Controllo | Atteso | Osservato |
|---|---|---|
| `BEGIN;` reali | 1 | 1 (riga 61; l'altro match è dentro un commento) |
| `ENABLE ROW LEVEL SECURITY` | 1 | 1 |
| policy di scrittura | 0 | 0 (l'unico match del grep è `for update` in un commento indentato) |
| `search_path = ''` | 1 | 1 |
| `revoke all on function` | 1 | 1 |
| `npm run baseline:container -- --smoke` | exit 0 | *"applied the shim, the base schema and 41 migration files · 21 tables with row-level security"*, exit 0 |

---

## Task 2 — il lato TypeScript (`e2897fb`)

`src/lib/membership/acts.ts` — **zero import** (verificato con
`grep -nE "^\s*import "`, nessun match), le due union `MembershipAct` (sette
valori) e `MembershipActorKind`, con la regola del commit unico e il motivo per
cui una divergenza non fallirebbe rumorosamente: aggiungere un valore qui e non
là produce un `23514` nel momento in cui qualcuno compie l'atto; aggiungerlo là e
non qui produce una riga che il registro tiene e che nessun lettore del repository
sa nominare.

`keys.ts` — nona chiave `REGISTER_READ` e la sua descrizione. **La totalità di
`CAP_DESCRIPTIONS` è l'unica parte di questo contratto che il compilatore
sostiene**, e l'ha sostenuta: `npm run build` passa, il che in un repository senza
test runner è l'unico gate automatico che esista sul prodotto. Vale la pena dirlo
con precisione: quel verde prova che le nove chiavi hanno nove descrizioni. Non
prova nulla sul database.

`src/types/database.ts` — `MembershipActRow`, che importa le due union invece di
ri-dichiarare i literal, nella stessa direzione invertita che il file usa già per
la porta e per le capability. Sopra l'interfaccia c'è il commento che dice che
**nessun client Supabase di questo repository è parametrizzato con `Database`**,
quindi quei nomi di colonna non sono controllati da niente in nessun call site:
un `select` che scrive `subject_lable` compila, gira e restituisce `undefined`.

`scripts/verify-capabilities.mjs` — `EXPECTED_KEY_COUNT` 8 → 9 e quattro nuove
coppie dichiarate. **Totali nuovi: 36 coppie, 20 grant, 16 rifiuti** (da
32/18/14). Accanto ai due rifiuti c'è la riga di D-19.

**Osservato:** `npm run verify:capabilities -- --target=container` →

```
TS 9 · DB 9 · POLICY 5 (46 call sites in 68 policies) · SRC 7 (237 files walked) · GRANT 20 rows
5/5 green, 0 warnings.
```

Il lato 4 non emette warning perché la policy del registro chiede `register.read`
in `pg_policies`: la chiave è *raggiunta*, anche se nessun file sotto `src/` la
nomina ancora — quel consumatore è il piano 43-12.

---

## Task 3 — la verifica, e la deviazione dichiarata (`dc3bf37`)

### La deviazione, per prima cosa

Il piano marcava il task 3 `checkpoint:human-action`, con dieci passi operativi da
eseguire su **produzione**. Non è stato fatto, ed è una decisione dell'esecutore.
Il proprietario ha dichiarato di non poter compiere operazioni tecniche e ha
delegato la scelta dell'approccio; l'istruzione operativa di questa fase è
esplicita — *non applicare nessuna migration a produzione*. Restituire un
checkpoint che consegna SQL da incollare in un pannello avrebbe bloccato la fase
su una domanda a cui nessuno può rispondere.

Quindi: **la migration è committata e non applicata**, e tutte le osservazioni del
task 3 sono state eseguite contro il container. È lo stesso precedente di 43-05 e
43-06, che hanno lasciato le loro migration committate e non applicate e hanno
preso le loro misure sul container.

**Nessuna approvazione dell'utente esiste per nulla di questo piano.** Ogni
decisione qui è dell'esecutore.

### Le sei osservazioni, misurate sul container

Sonda usa-e-getta, eseguita e poi rimossa; il container è distrutto a ogni run.
L'account throwaway è stato creato e distrutto **dentro** quel container, e non
porta né un indirizzo reale né un nome reale.

**1 · Il catalogo.**

```
select count(*) from private.capabilities             -> 9
select role, requires_approved from private.role_capabilities
 where capability='register.read'                     -> master  true
                                                         organizer true
```

**2 · RLS.** `relrowsecurity = t` (`relforcerowsecurity = f`).

**3 · Le policy.** Esattamente una riga:

```
polname = membership_acts_select_register_read
polcmd  = r          (SELECT)
qual    = ( SELECT private.has_capability('register.read'::text) AS has_capability)
with_check = null
```

Il wrapper `(select …)` è presente nella forma che Postgres ristampa. **Nessuna
policy di scrittura** — che è il progetto, non un'omissione.

**4 · La funzione — e la firma esatta, che i piani 43-09, 43-11 e 43-12 devono
chiamare:**

```
public.record_membership_act(
  p_subject_id uuid,
  p_act        text,
  p_actor_id   uuid,
  p_actor_kind text,
  p_role       text,
  p_status     text,
  p_note       text,
  p_party_id   uuid
) RETURNS uuid
```

`prosecdef = t` · `proconfig = ["search_path=\"\""]`.

**5 · Il privilegio di esecuzione** — è il controllo che, se fosse `true`, fermerebbe
la fase:

| ruolo | `has_function_privilege(…, 'execute')` |
|---|---|
| `authenticated` | **false** |
| `anon` | **false** |
| `public` | **false** |
| `service_role` | true |

ACL grezza: `{postgres=X/postgres,service_role=X/postgres}`.

**6 · Una chiamata reale, e la riga che sopravvive al suo soggetto.**

Due account throwaway creati; `handle_new_user()` li ha materializzati come
`member`/`pending` con i loro codici. Poi, come `service_role`:

```sql
select public.record_membership_act(
  '…aa', 'promoted', '…bb', 'user', 'staff', 'approved',
  'promoted by the 43-07 probe', null);
-> aafb04dc-b88b-4fa5-836a-e2371da7f54d
```

Una sola riga apparsa:

| campo | valore |
|---|---|
| `act` | `promoted` |
| `subject_label` | `RSN-BY5LFJDZ` — **un codice di membership, non un indirizzo** |
| `actor_kind` | `user` |
| `role_before` → `role_after` | `member` → `staff` |
| `status_before` → `status_after` | `pending` → `approved` |
| `party_id` / `note` | `null` / la nota della sonda |
| `at` | valorizzato (clock del server) |

Il profilo dopo la chiamata: `staff` / `approved`. Poi l'account è stato
cancellato — `auth.users` 0 righe, `public.profiles` 0 righe — e **la riga di
registro è sopravvissuta**, con `subject_id` a `null` e `subject_label` ancora
`RSN-BY5LFJDZ`. È la decisione `ON DELETE SET NULL` che si dimostra da sola.

### Quattro osservazioni in più, non chieste dal piano

**7 · Il CHECK di attribuzione, in entrambe le direzioni.**

| tentativo | esito |
|---|---|
| `actor_kind='user'` con attore nullo | rifiutato `23514` · `membership_acts_actor_attributed` |
| `actor_kind='system'` che porta un attore | rifiutato `23514` · `membership_acts_actor_attributed` |
| `act='suspended'` (valore fuori union) | rifiutato `23514` · `membership_acts_act_check` |
| `actor_kind='system'` con attore nullo | **accettato** — l'atto di sistema legittimo |

Un atto non attribuito non è irrappresentabile per convenzione: è irrappresentabile
per costruzione, provato per mutazione in tre direzioni.

**8 · Il `23514` di 43-06 aborta l'intera chiamata.** Promuovere a `organizer` un
account `pending`, passando solo `p_role` e non `p_status`:

```
refused 23514 profiles_role_implies_approved
register rows before 2, after 2      (uguali)
profile after: member / pending      (non mosso)
```

L'atto e la sua registrazione falliscono insieme. È il punto del progetto, non un
rischio: il registro non afferma mai qualcosa che il database ha rifiutato.

**9 · Un soggetto inesistente solleva senza nominare un indirizzo.**

```
refused P0002 — membership_acts.subject_not_found: 00000000-0000-4000-8000-0000000000ff
```

Solo l'identificatore. `P0002` è `no_data_found`, distinguibile da `23514` da chi
chiama.

### La cattura e il confronto

Attesa **dichiarata prima di leggerla**: una policy aggiunta, una tabella RLS in
più, e celle nuove per `membership_acts` soltanto — 11 di lettura e 33 di
scrittura — con nessuna cella preesistente mossa.

**Osservato**, `baseline:compare --target=container --before-point=43-06
--after-point=43-07 --only=B1,B2,B3`, 47 differenze, tutte contate:

| classe | n | che cosa |
|---|---|---|
| `policy_added` | 1 | `membership_acts_select_register_read` |
| `supporting_count_changed` | 2 | `policy_count` 67 → 68 · `rls_enabled_tables` 20 → 21 |
| `b2_cell_added` | 11 | `membership_acts`, un persona ciascuna |
| `b3_cell_added` | 33 | `membership_acts` × 11 personas × 3 verbi |

`1 + 2 + 11 + 33 = 47`. **B1: `67 unchanged · 0 by T1 · 0 by T2 · 0 by both · 0
unexplained`** — nessuna policy esistente si è mossa. Nessuna cella preesistente
di B2 o B3 è cambiata: ogni differenza nomina `membership_acts`.

**B3 — l'append-only, misurato.** Le 33 celle sono tutte `conclusive_for_rls` e
sono **identiche a quelle di `door_scan_events`**, l'unico altro registro
append-only del repository:

```
insert -> 42501   × 11 personas
update -> ok:0    × 11 personas
delete -> ok:0    × 11 personas
```

Compreso `master/approved`, che è la cella che conta:
`insert → 42501`, `update → ok:0`, `delete → ok:0`.

> **Precisione dovuta.** `update` e `delete` non sollevano `42501`: **toccano zero
> righe**. È così che RLS si comporta su UPDATE/DELETE quando nessuna policy le
> concede — le righe semplicemente non esistono per quel comando. Non è un
> rifiuto più debole (niente viene scritto) ma è un *meccanismo* diverso, e
> scrivere "rifiutano tutte e tre con 42501" sarebbe stato falso. `door_scan_events`
> mostra esattamente la stessa forma, che è la ragione per cui la si può leggere
> come conferma e non come sorpresa.

**B2 — e questa cattura NON è vacua.** Il registro contiene due righe seminate,
quindi il matrice di lettura sta misurando un predicato reale e non concordando
sul vuoto (`0/220 vacuous`):

| persona | righe lette |
|---|---|
| `master/approved` | **2** |
| `organizer/approved` | **2** |
| `master/pending`, `master/rejected` | 0 |
| `organizer/pending`, `organizer/rejected` | 0 |
| i tre `member`, `anon`, `authenticated/no-profile` | 0 |

**Questo è D-19 misurato, non affermato.** I due persona `pending` e i due
`rejected` con ruolo di staff leggono zero: è il `requires_approved = true` che
lavora davvero. Con `staff.manage` — `requires_approved = false` — quelle quattro
righe avrebbero letto il registro dei rifiuti. Le quattro personas che lo provano
esistono nel container solo perché `scripts/container/seed.mjs` rilassa il vincolo
di 43-06 e lo ripristina `NOT VALID`: è esattamente il valore che 43-06 aveva
scritto di volerne conservare.

---

## Deviazioni dal piano

### 1. [Rule 3 — bloccante] `PROBE_PAYLOADS` non aveva una voce per la nuova tabella

- **Trovata durante:** task 3, alla prima cattura.
- **Sintomo:** `PROBE_PAYLOADS has no entry for: membership_acts. The seed cannot
  invent a row shape the write matrix does not declare — one declaration, two
  readers.` L'harness rifiuta di eseguire: una write matrix che salta una tabella
  in silenzio è una matrix che non può fallire.
- **Fix:** aggiunta la voce in `scripts/rls-baseline.mjs`. Il piano prevedeva che
  la dichiarazione fosse compito di questo task (`b3_cell_added` non ha flag di
  override), quindi è deviazione solo nel momento in cui è emersa.
- **La scelta dentro il fix, che non è cosmetica.** La convenzione del file dice
  di usare `auth.uid()` per le colonne che nominano il soggetto. Qui è **sbagliato**:
  non esiste predicato di proprietà da soddisfare, e Postgres valuta i vincoli di
  tabella **prima** del `WITH CHECK` di RLS — quindi un payload con `auth.uid()`
  avrebbe riportato `23514` (il CHECK di attribuzione) invece di `42501` per ogni
  persona con `auth.uid()` nullo: un rifiuto per la ragione sbagliata, che è
  proprio il fallimento contro cui l'intestazione di quel file mette in guardia.
  Il payload usa `actor_kind = 'system'` senza attore. Il ragionamento è scritto
  accanto alla voce.
- **File:** `scripts/rls-baseline.mjs` · **Commit:** `dc3bf37`

### 2. [decisione dell'esecutore] Il checkpoint bloccante è stato eseguito sul container

Descritta per esteso sopra. Nessuna migration applicata a produzione, nessuna
approvazione dell'utente coinvolta.

---

## Conseguenza da dichiarare, e non è piccola

**`npm run baseline:rls --target=production` ora rifiuta di girare**, finché
`20260808002000_membership_register.sql` non è applicata:

```
PROBE_PAYLOADS names tables that are not RLS-enabled tables of this target:
membership_acts. Nothing was written — the payload table has drifted from the schema.
```

È corretto e voluto dall'harness: la tabella dei payload e lo schema del target
sono in disaccordo, e il rifiuto lo dice. Ma è **una conseguenza reale per i piani
successivi**: chiunque catturi una baseline di produzione prima del deploy incontra
questo messaggio. L'alternativa — non dichiarare la voce — sarebbe stata peggiore:
l'harness avrebbe rifiutato anche sul container, e non ci sarebbe alcuna evidenza
B3 per questo piano.

Nella stessa famiglia, e già nota dall'onda precedente:
**`npm run verify:capabilities` senza `--target` (cioè su produzione) è
prevedibilmente ROSSO**, perché il catalogo in produzione ha otto chiavi e la
dichiarazione ne ha nove. Quel rosso è lo stato non deployato, non un difetto.
**Non è stato misurato in questa esecuzione** — `.env.local` non esiste nel
worktree e non è stato caricato, quindi lo script sarebbe uscito con codice 2
("nothing was measured"). Lo dico invece di lasciarlo credere eseguito.

---

## Il vincolo che nessuno ha ancora esercitato, e che va detto

`meta-gates.md`, *zero fallimenti silenziosi*: non esiste error tracking in questo
progetto. La funzione `record_membership_act` solleva — `23514` da 43-06, `P0002`
per un soggetto assente — e **il suo effetto osservabile dipende interamente da
chi la chiama**, che oggi non esiste. Il piano 43-09 è quello che deve rendere
quei due codici visibili all'operatore sulla pagina dei membri, e deve ramificare
su `error.code`, mai su un messaggio (Next redige il messaggio di una Server Action
in build di produzione) e **mai loggare `error.details`**, che su questa tabella
porta l'intera riga fallita — codice di membership e indirizzo compresi.

Finché quel piano non atterra, la funzione esiste e nessuna superficie la chiama:
il registro è vuoto in produzione perché non è deployato, e sarebbe vuoto anche
dopo il deploy perché nulla ci scrive ancora. **Una tabella vuota si legge come
"nessun atto è mai stato compiuto"**, ed è il motivo per cui 43-09 e 43-11 non sono
rifiniture di questo piano ma la sua metà mancante.

---

## Criteri di successo

1. **Un registro per tutti e cinque gli atti, append-only per costruzione** (D-11,
   ACCT-04) — ✅ misurato: 33 celle B3 identiche a `door_scan_events`, `master/approved`
   compreso.
2. **Un atto di sistema si registra come tale; un atto non attribuito non si
   registra affatto** (D-22) — ✅ provato per mutazione in entrambe le direzioni.
3. **Leggere richiede un ruolo di staff approvato, con una chiave coniata per la
   domanda invece che girando il flag della porta** (D-19) — ✅ misurato in B2:
   solo `master/approved` e `organizer/approved` leggono; i quattro persona non
   approvati leggono zero.
4. **Un override alla porta non è in questo registro, e la migration dice perché**
   (D-18) — ✅ presente.
5. **La forma accoglie lo scrittore della fase 35 senza un altro `ALTER TABLE`** —
   ✅ `party_id` nullable dal primo giorno.

---

## Known Stubs

Nessuno. Nessun valore vuoto codificato, nessun placeholder, nessun componente non
cablato. Le due cose non ancora usate — `party_id` e la funzione stessa — sono
dichiarate come tali con il piano che le userà, e non alimentano nessuna
superficie.

---

## Threat Flags

Nessuna nuova superficie di sicurezza fuori dal `<threat_model>` del piano. Le due
introdotte — una funzione `SECURITY DEFINER` in `public` e una tabella con dati
non pubblici — sono T-43-07-01/02 e T-43-07-07, tutte con disposizione *mitigate*
e mitigazione misurata sopra.

---

## Self-Check: PASSED

File dichiarati creati, verificati presenti:

- `supabase/migrations/20260808002000_membership_register.sql` — FOUND
- `src/lib/membership/acts.ts` — FOUND
- `.planning/…/baseline/32-BASELINE-policies.container.43-07.json` — FOUND
- `.planning/…/baseline/32-BASELINE-reads.container.43-07.json` — FOUND
- `.planning/…/baseline/32-BASELINE-writes.container.43-07.json` — FOUND

Commit dichiarati, verificati nel log:

- `62c5284` — FOUND
- `e2897fb` — FOUND
- `dc3bf37` — FOUND

Gate automatici, eseguiti dopo l'ultimo commit di codice:

- `npm run build` → `✓ Compiled successfully`
- `npm run verify:capabilities -- --target=container` → `5/5 green, 0 warnings`
- `npm run baseline:container -- --smoke` → exit 0
