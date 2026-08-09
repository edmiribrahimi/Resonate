---
phase: 35-per-night-assignments
plan: 15
subsystem: access-gating
tags: [migration, capabilities, access-context, middleware, coarse-gate, assign-01, wave-5]

# Dependency graph
requires:
  - plan: 35-02
    provides: "`public.party_assignments` con `user_id`, `capability`, `revoked_at`, `ends_at` e `idx_party_assignments_lookup` — migration NON applicata"
  - plan: 35-03
    provides: "l'overload `public.my_access_context(p_party_id uuid)` e il secondo braccio di `private.has_capability` — migration NON applicata"
  - plan: 35-07
    provides: "`interpretAccessContext()`, il punto unico in cui il payload viene letto, e `getPartyAccessContext(partyId)`"
  - plan: 33-01
    provides: "`public.my_access_context()` con quattro chiavi — **applicata in produzione il 2026-08-08**"
provides:
  - "`live_assignment_capabilities` su ENTRAMBE le firme di `public.my_access_context`, come sottoquery dentro il payload esistente — zero round trip in piu'"
  - "`AccessContextResult.liveAssignmentCapabilities: Set<string> | null` — tre stati, e `null` significa «riga 14 non applicata», mai «nessuna assegnazione»"
  - "la cattura di controllo che prova che questo piano non muove nessuna cella di B1/B2/B3"
affects: [35-17]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "la domanda grossolana viaggia dentro il payload gia' richiesto, non in una seconda RPC: il percorso gira prima di ogni scansione alla porta"
    - "un campo piu' largo del permesso reale dichiara di esserlo nel punto in cui lo si scopre — migration e docblock — invece di lasciarlo dedurre"
    - "«assente» e «vuoto» sono due valori decisi per posizione (`null` contro `Set`), mai una stringa da interpretare"
    - "una cattura di CONTROLLO a seed identico, con e senza il file, e' l'unico modo di attribuire una differenza in un repo dove il seed cambia fra una cattura e l'altra"

key-files:
  created:
    - supabase/migrations/20260809005000_live_assignment_flag.sql
  modified:
    - src/lib/capabilities/server.ts

key-decisions:
  - "La chiave NON e' ristretta a `p_party_id` neanche sull'overload: due payload con forme diverse dietro un solo tipo TypeScript sono il modo in cui un campo assente diventa un `false`. La risposta per-notte su quella firma e' gia' `capabilities`"
  - "`capabilities` malformato continua a lanciare, `live_assignment_capabilities` malformato o assente risolve a `null`: senza la prima non c'e' nessuna risposta, l'assenza della seconda ha una causa nota e temporanea, e lanciare farebbe cadere ogni richiesta — porta compresa — per una chiave con cui nessuno puo' decidere da solo"
  - "`ANONYMOUS_CONTEXT` prende l'insieme VUOTO e non `null`: per chi non ha sessione «nessuna assegnazione» e' vero, e un `null` li' accenderebbe il segnale «migration mancante» a ogni visita anonima"
  - "`Set<string>` e non `Set<CapabilityKey>`: `capabilities` deriva dal catalogo per costruzione della query, questa viene da una colonna la cui FK e' un vincolo su un'altra tabella — asserire l'union sarebbe riciclare un vincolo in un tipo"
  - "Il `COMMENT ON FUNCTION` dell'overload e' riemesso: diceva «Same four payload keys», che questo file rende falso, e un commento su un oggetto vivo viene letto come corrente"

# Metrics
metrics:
  duration: "~50 min"
  completed: 2026-08-09
  tasks_completed: 2
  tasks_total: 2
  checkpoint_open: false
---

# Fase 35 Piano 15: la domanda che il middleware puo' fare — Summary

`src/lib/supabase/middleware.ts:90` chiama `my_access_context()` **senza
argomenti**, e non e' un difetto: al momento del routing la notte non esiste
ancora, perche' la persona non l'ha scelta. Questo piano non prova a dargliela.
Le fa fare l'unica domanda che puo' fare — *«una qualche assegnazione viva, e
per quali mestieri?»* — **dentro il payload che gia' chiede**.

**Nessun gate e' stato allargato.** Verificato meccanicamente: le uniche
occorrenze di `live_assignment_capabilities` e `liveAssignmentCapabilities` in
tutto il repository stanno nei due file di questo piano. Nessuna superficie
legge il campo, nessun `if` ci ramifica sopra, il middleware e' identico a
prima. E' questo che rende sicuro far atterrare la wave prima del piano 35-17:
una chiave che nessuno legge non apre niente. Il verso opposto — allargare il
gate prima che la chiave esista — non lo sarebbe.

---

## Cosa e' stato fatto

| Task | Nome | Commit | File |
|---|---|---|---|
| 1 | `live_assignment_capabilities` su entrambe le firme | `e482c0b` | `supabase/migrations/20260809005000_live_assignment_flag.sql` |
| 2 | Il campo nel DAL, e i tre stati | `9cbb95e` | `src/lib/capabilities/server.ts` |

**Lingua:** commenti e identificatori in inglese, come i due file che estendono.

---

## Task 1 — la migration, riga 14 della coda

Una chiave sola, aggiunta in coda al payload di **entrambe** le firme. Le
quattro chiavi esistenti — `capabilities`, `user_id`, `role`, `status` — sono
riprodotte dalla definizione applicata: il diff contro di essa e' una pura
aggiunta.

```sql
'live_assignment_capabilities', coalesce(
  (
    select jsonb_agg(distinct pa.capability order by pa.capability)
    from public.party_assignments pa
    where pa.user_id = (select auth.uid())
      and pa.revoked_at is null
      and now() < pa.ends_at
  ),
  '[]'::jsonb
)
```

Tre condizioni, ognuna un requisito e non una precauzione: `revoked_at is null`
e' ASSIGN-03 (una revoca **aggiorna** la riga, non la cancella, perche' il drain
offline deve poter chiedere alle 03:00 *«era viva all'01:40?»*); `now() <
ends_at` e' ASSIGN-02 sull'orologio del **server**, che nessun dispositivo
sposta; il `coalesce` evita il terzo stato di troppo.

### I tre paragrafi che dicono cosa la chiave NON e'

Sono la parte del file che conta di piu', perche' senza di essi qualcuno la
usera' come permesso:

1. **Non dice quale notte.** Dirlo richiederebbe una notte, e il chiamante per
   cui la chiave esiste non la conosce. Aggiungere qui la dimensione notte
   significherebbe fare **N domande invece di una**, sul percorso che gira prima
   di ogni scansione.
2. **Non e' un confine di sicurezza.** Il confine per-notte e'
   `private.has_capability(key, party_id)` nelle policy e
   `requireDoorOperator({ partyId })` sulle tre route della porta, che scrivono
   con il client service e quindi non passano da nessuna policy.
3. **E' piu' larga del permesso reale, sempre e per costruzione.** Chi ha
   un'assegnazione su **un'altra** notte e' dentro. Non e' un difetto da
   correggere dopo: e' il prezzo di una domanda grossolana invece di N precise.

### Le due correzioni al piano, scritte nella migration

- Il piano la chiama *«la migration 12 della coda — l'ultima»*. E' la **riga 14
  di 15**, ultima del **blocco A2**, non della coda: la riga 15
  (`20260809006000_event_media_server_upload_only.sql`) si applica **dopo** il
  deploy. `35-HUMAN-UAT.md` e' l'unico posto in cui l'ordine e' scritto per
  intero ed e' l'autorita'; il piano e' il documento da correggere.
- Il piano la chiama *«quarta chiave»*. E' la **quinta**: il piano cita il
  payload da `capability_model.sql:262-297`, che e' la definizione
  **superata** da `20260808000000_access_context_user_id.sql` — applicata in
  produzione, e con `user_id` dentro.

### Cosa il file non fa, e perche' e' scritto

Nessuna policy, nessuna tabella, nessuna colonna, **nessun indice nuovo**:
`idx_party_assignments_lookup` ha `user_id` come colonna guida e porta lo stesso
predicato parziale, quindi serve gia' questa lettura. Un indice in piu' su una
tabella nata quattro righe fa e' costo di scrittura senza una lettura che lo
chieda.

Nessuna rimozione-e-ricreazione della funzione: la firma non cambia, quindi non
esiste una finestra in cui la funzione che il middleware chiama a ogni
navigazione non esista — e in una coda applicata a mano una finestra aperta da
una transazione interrotta non si richiude.

Il `COMMENT ON FUNCTION` dell'overload e' **riemesso** perche' diceva *«Same
four payload keys»*, che questo file rende falso. Un commento su un oggetto vivo
che descrive una forma che l'oggetto non ha piu' e' peggio di nessun commento:
viene letto come corrente. Il `COMMENT` sulla firma senza argomenti e' **nuovo**
— quella funzione non ne aveva — e porta la stessa avvertenza.

---

## Task 2 — il DAL, e la distinzione che tutto il resto presuppone

`liveAssignmentCapabilities: Set<string> | null` su `AccessContextResult`,
popolato in `interpretAccessContext()` — il punto unico che il piano 35-07 ha
estratto — quindi lo restituiscono **entrambe** le funzioni di contesto, con lo
stesso tipo.

| Valore | Significato | Perche' non collassa negli altri |
|---|---|---|
| `null` | la chiave **non c'era** nel payload | una causa nota: la riga 14 non e' applicata mentre gira gia' il codice che la presume |
| `Set` vuoto | **nessuna assegnazione viva** | e' una risposta, non un guasto |
| `Set` pieno | i mestieri | — |

Collassare il primo nel secondo renderebbe *«la coda di migration e' indietro»*
indistinguibile da *«questa persona non lavora stanotte»*, e la seconda frase e'
quella che qualcuno leggerebbe **davanti a una fila**. Non esiste error
tracking: nient'altro riporterebbe la differenza. Percio' e' un valore deciso
per **posizione**, mai una stringa da interpretare — la stessa regola di
`guards.ts:73-79`.

Il falso verde che rende `null` uno stato reale e non teorico e' gia'
dichiarato in `35-HUMAN-UAT.md`: **`npm run build` e' verde con zero migration
applicate**, perche' i tipi vengono da `src/types/database.ts` e nessun client
di questo repository e' parametrizzato con un generico `Database` —
`supabase.rpc("my_access_context")` non e' tipizzato e il compilatore il payload
non lo vede mai.

### Tre asimmetrie deliberate, ognuna con la sua ragione

- **`capabilities` malformato lancia, questa chiave no.** Senza la prima non c'e'
  nessuna risposta; l'assenza della seconda ha una causa nota e temporanea, e
  lanciare farebbe cadere ogni richiesta — porta compresa — per una chiave con
  cui nessuno puo' decidere da solo. Un valore presente ma non-array riceve lo
  stesso trattamento di `null`: e' un payload senza la forma dichiarata, cioe'
  «nessuna risposta», e tre stati sono gia' il massimo che si possa chiedere a
  un chiamante di distinguere.
- **`ANONYMOUS_CONTEXT` prende l'insieme vuoto, non `null`.** Per chi non ha
  sessione «nessuna assegnazione» e' semplicemente **vero**; un `null` li'
  accenderebbe il segnale «migration mancante» a ogni visita anonima, annegando
  l'unica occasione in cui deve accendersi.
- **`Set<string>` e non `Set<CapabilityKey>`.** `capabilities` deriva dal
  catalogo per costruzione della query (`select c.key from
  private.capabilities c`); questa viene da una **colonna**, e la FK che la
  vincola allo stesso catalogo e' un vincolo su un'altra tabella, non una
  proprieta' di questa query. Asserire l'union sarebbe riciclare un vincolo in
  un tipo. `.has(CAP.DOOR_OPERATE)` typechecka comunque.

Nessun `catch` che restituisca un valore (la parola compare solo nella prosa che
lo vieta), nessun uso del client service.

---

## Verifica — e cosa questi verdi dicono davvero

**Non esistono test del prodotto.** Nessuna riga qui sotto e' «i test passano».

### La prova che conta: una cattura di controllo a seed identico

Il confronto chiesto dal piano — `35-15` contro `35-pre` — **non poteva dare
zero**, e non e' un fallimento del piano: fra le due catture stanno le migration
`20260809000000` e `20260809003000`, che le policy le creano davvero. E c'era un
secondo rumore: `scripts/container/seed.mjs` e' cambiato dopo la cattura `35-19`
(commit `6f40458`, il terzo asse del piano 35-06), quindi anche `35-19` non e'
un comparatore pulito sulle letture.

Cosi' la cattura e' stata fatta **due volte, con lo stesso seed**, spostando via
il file e rimettendolo:

| Artefatto | `35-15-control` (senza il file) | `35-15` (con il file) | Differenza |
|---|---|---|---|
| B1 policies | 72 righe | 72 righe | **0** |
| B2 reads | 322 righe, 0 celle vacue | 322 righe, 0 celle vacue | **0** |
| B3 writes | 966 sonde, 249 rifiuti, 692 successi | 966 sonde, 249 rifiuti, 692 successi | **0** |

Nessuna riga solo nell'una o solo nell'altra, in nessuno dei tre artefatti.
**Questo piano non muove una cella.**

Per completezza, il confronto chiesto dal piano, con l'attribuzione:

- `35-pre` → `35-15`: **+4 policy, 0 rimosse, 0 cambiate** — tutte e quattro
  (`party_assignments_select_own`, `party_assignments_select_staff_manage`,
  `party_credits_select_published`, `party_credits_select_catalogue_manage`)
  appartengono alle migration 7 e 10 della coda, **nessuna a questo file**.
- `35-19` → `35-15` sulle policy: **0 / 0 / 0**.

### Gli altri controlli

| Controllo | Esito |
|---|---|
| `npm run baseline:container -- --phase-point=35-15` | applica tutta la coda in `postgres:17.6` e cattura B1+B2+B3. **Che la migration si applichi e' di per se' una prova**: Postgres valida il corpo di una funzione `LANGUAGE sql` al `CREATE`, quindi l'aggregato `distinct … order by` e' stato pianificato davvero, non solo letto |
| `npm run verify:capabilities -- --target=container` | **5/5 green, 0 warnings** — 12 chiavi, 26 grant e 22 rifiuti su 4 ruoli. Questo piano non conia chiavi e non tocca `ROLE_GRANTS` |
| `npm run build` | passa |
| `git diff --name-only -- src/` | **un solo file**: `src/lib/capabilities/server.ts` |
| `grep -rn 'liveAssignmentCapabilities\|live_assignment_capabilities' src scripts supabase` | 19 occorrenze, **tutte nei due file di questo piano**. Nessun lettore esiste |

**E cosa quei verdi NON dicono.** Il verde del container prova che lo schema
regge, non che il prodotto si comporti. La migration **non e' applicata in
produzione**: e' la riga 14 della coda, e finche' non lo e' la chiave
semplicemente non arriva — il DAL risponde `null` e il gate grossolano del piano
35-17 si comporta come oggi. E' il **verso sicuro** dell'accoppiamento
migration→codice.

---

## Deviazioni dal piano

### 1. [Regola 1 — dato errato nel piano] «migration 12 della coda»

- **Trovata durante:** Task 1
- **Problema:** il piano dichiara che questo file e' la riga 12 e *«l'ultima»*.
  `35-HUMAN-UAT.md`, l'unico documento in cui l'ordine e' scritto per intero e
  che i piani devono leggere invece di ricostruire, lo mette alla **riga 14 di
  15**, ultima del blocco A2 ma non della coda.
- **Fatto:** scritta la correzione nella migration e nel docblock del DAL,
  nominando la riga che supera. Il piano non e' stato modificato — e' un
  artefatto con la sua data.
- **Commit:** `e482c0b`, `9cbb95e`

### 2. [Regola 1 — dato errato nel piano] «quarta chiave»

- **Trovata durante:** Task 1
- **Problema:** il piano cita il payload da `capability_model.sql:262-297`
  (`capabilities`, `role`, `status`), che e' la definizione **superata** da
  `20260808000000_access_context_user_id.sql`. Il payload applicato ha quattro
  chiavi; la nuova e' la **quinta**. Riprodurre tre chiavi invece di quattro
  avrebbe cancellato `user_id` dal payload — cioe' l'identita' che undici
  superfici hanno smesso di leggere da un header per leggerla da li'.
- **Fatto:** riprodotte tutte e quattro, correzione scritta nell'intestazione.
- **Commit:** `e482c0b`

### 3. [Regola 2 — correttezza mancante] Il `COMMENT` dell'overload era diventato falso

- **Trovata durante:** Task 1
- **Problema:** `20260809001000` lascia `COMMENT ON FUNCTION
  public.my_access_context(uuid)` con la frase *«Same four payload keys»*. Dopo
  questo file sono cinque. Un commento su un oggetto vivo viene letto come
  corrente, e questo avrebbe detto a chi interroga il database che una chiave
  che c'e' non c'e'.
- **Fatto:** `COMMENT` riemesso con cinque chiavi e con la frase che dice che la
  chiave nuova **non** e' ristretta alla notte. Aggiunto anche un `COMMENT` sulla
  firma senza argomenti, che non ne aveva: e' quella che il middleware chiama, ed
  e' il posto in cui l'avvertenza si scopre.
- **Commit:** `e482c0b`

### 4. [Regola 3 — la verifica chiesta non era eseguibile come scritta] La cattura di controllo

- **Trovata durante:** Task 1, verifica
- **Problema:** l'acceptance criterion chiede *«il confronto con `35-pre` mostra
  zero differenze nelle definizioni di policy»*. Contro `35-pre` le differenze
  sono **quattro** e nessuna e' di questo file: sono delle migration 7 e 10 della
  coda, gia' presenti nell'albero. Un criterio impossibile da soddisfare
  letteralmente e' un criterio che si impara a leggere di sbieco.
- **Fatto:** catturato un **punto di controllo** `35-15-control` con lo stesso
  seed e senza il file, e confrontati B1, B2 e B3 riga per riga. Zero differenze
  in tutti e tre. Le quattro policy contro `35-pre` sono attribuite per nome.
  Entrambe le catture sono committate come prova.
- **Commit:** `e482c0b`

### 5. [Fuori da `files_modified`] I sei artefatti di baseline

Sei file nuovi sotto
`.planning/phases/32-capability-model-in-the-database/baseline/` — le due
catture `35-15` e `35-15-control` — non sono in `files_modified`, ma sono
**l'evidenza** dell'acceptance criterion. Sono puramente additivi, hanno nomi che
nessun altro piano puo' produrre, e senza di essi la riga «non muove nessuna
cella» sarebbe un'affermazione invece di una misura.

---

## Note per gli altri piani della wave

- **Per il piano 35-17, che e' l'altra meta' inseparabile di questo:** il campo
  e' `Set<string> | null` e la distinzione **e' il contratto**. Un
  `ctx.liveAssignmentCapabilities?.has(...) ?? false` la butta via in un
  carattere: quel `?? false` trasforma «la migration non e' applicata» in «non
  sei assegnato», che e' un rifiuto davanti a una fila. Il ramo `null` va
  trattato **per posizione** e va reso **osservabile** — un effetto visibile,
  non una riga di log, perche' non esiste error tracking.
- **Per chiunque tocchi `my_access_context`:** da questo file le firme sono
  **due oggetti con cinque chiavi ciascuno**, e devono restare la stessa forma.
  Aggiungere una chiave a una sola delle due rimette in piedi esattamente il
  difetto che la sezione 3 della migration descrive.
- **Nessuna collisione rilevata** con i piani 35-09, 35-10, 35-11, 35-12 e
  35-18: nessuno dei loro `files_modified` tocca i miei due file, e nessuno dei
  loro PLAN nomina `my_access_context`.
- **Osservazione trasversale, non un'azione:** la cattura `35-19` non e' piu' un
  comparatore valido sulle letture, perche' `scripts/container/seed.mjs` e'
  cambiato dopo di essa (commit `6f40458`). Chi confronta B2 fra due punti di
  fase deve controllare prima se il seed e' lo stesso, o catturare il proprio
  controllo come ha fatto questo piano.

---

## Known Stubs

Nessuno. Il campo non e' uno stub: e' un valore risolto dal database, e il fatto
che nessuno lo legga ancora e' la proprieta' che rende sicuro far atterrare
questo piano prima del 35-17, dichiarata nell'obiettivo del piano.

---

## Threat Flags

Nessuna superficie di rete, di autenticazione o di accesso ai file nuova. Il
campo introdotto e' **piu' largo del permesso reale**, ed e' esattamente il
T-35-72 gia' registrato nel `<threat_model>` del piano: la mitigazione — il
paragrafo nella migration **e** nel docblock del DAL — e' applicata in entrambi i
posti.

---

## Self-Check: PASSED

| Affermazione | Esito |
|---|---|
| `supabase/migrations/20260809005000_live_assignment_flag.sql` | FOUND |
| `src/lib/capabilities/server.ts` | FOUND |
| `.planning/.../baseline/32-BASELINE-policies.container.35-15.json` | FOUND |
| `.planning/.../baseline/32-BASELINE-policies.container.35-15-control.json` | FOUND |
| commit `e482c0b` | FOUND |
| commit `9cbb95e` | FOUND |
| `STATE.md`, `ROADMAP.md`, `deferred-items.md` non toccati | confermato — `git diff --name-only` contro la base non li elenca |
