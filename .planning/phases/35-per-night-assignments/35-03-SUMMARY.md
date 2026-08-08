---
phase: 35-per-night-assignments
plan: 03
subsystem: supabase-data
tags: [migration, capability-model, resolver, rls, access-gating, wave-3]

# Dependency graph
requires:
  - plan: 35-02
    provides: "`public.party_assignments` — le colonne che il braccio 2 legge: `party_id`, `user_id`, `capability`, `revoked_at`, `ends_at`; e la riga 7 della coda di applicazione manuale"
  - plan: 32-06
    provides: "`private.has_capability(text, uuid)` con `p_party_id` accettato e inutilizzato, e il commento che istruisce ad aggiungere qui il secondo braccio — APPLICATO in produzione"
  - plan: 43-final
    provides: "`profiles_role_implies_approved`, il ruolo `staff`, `private.capabilities` — APPLICATI in produzione il 2026-08-08"
provides:
  - "`door.supervise`, `media.upload`, `party.manage` — tre chiavi nel catalogo, con dodici decisioni (sei grant, sei rifiuti)"
  - "il secondo braccio di `private.has_capability`: l'assegnazione per-notte, spenta quando la notte non e' nominata"
  - "`public.my_access_context(uuid)` — l'overload che permette al DAL di fare la domanda per-notte"
  - "`CAP.DOOR_SUPERVISE`, `CAP.MEDIA_UPLOAD`, `CAP.PARTY_MANAGE` in `keys.ts`, con le descrizioni nel `Record` totale"
  - "`ROLE_GRANTS` a 48 coppie / 26 grant / 22 rifiuti, e `EXPECTED_KEY_COUNT` a 12"
  - "le catture `35-03` e `35-03-final`: 70 policy, 308 letture, 924 scritture — tutte identiche a `35-02`"
affects: [35-04, 35-06, 35-07, 35-08, 35-09, 35-10, 35-11, 35-13, 35-16, 35-17, 35-21, 34]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "una seconda fonte di permesso entra nel corpo del resolver, non accanto alle policy: le policy PERMISSIVE si sommano in OR e aggiungerne una allarga piu' di quanto si intende"
    - "la guardia sul NULL non e' difensiva: e' il requisito, perche' ogni chiamante esistente passa NULL e in SQL un'uguaglianza contro NULL e' NULL, non false"
    - "un overload invece di un cambio di firma, quando la coda si applica a mano: rimuovere-e-ricreare apre una finestra in cui la funzione non esiste, e in una coda manuale la finestra puo' non chiudersi"
    - "un argomento che nomina un CONTESTO non e' un argomento che nomina un SOGGETTO: la regola contro l'oracolo di enumerazione non si applica al secondo"

key-files:
  created:
    - supabase/migrations/20260809001000_assignment_resolver.sql
    - .planning/phases/32-capability-model-in-the-database/baseline/32-BASELINE-policies.container.35-03.json
    - .planning/phases/32-capability-model-in-the-database/baseline/32-BASELINE-reads.container.35-03.json
    - .planning/phases/32-capability-model-in-the-database/baseline/32-BASELINE-writes.container.35-03.json
    - .planning/phases/32-capability-model-in-the-database/baseline/32-BASELINE-policies.container.35-03-final.json
    - .planning/phases/32-capability-model-in-the-database/baseline/32-BASELINE-reads.container.35-03-final.json
    - .planning/phases/32-capability-model-in-the-database/baseline/32-BASELINE-writes.container.35-03-final.json
  modified:
    - src/lib/capabilities/keys.ts
    - scripts/verify-capabilities.mjs

key-decisions:
  - "`EXPECTED_KEY_COUNT` 9 -> 12: il piano nominava tre totali, ma la costante che governa l'asserzione 0 e l'aritmetica di `flattenDeclaration` e' una quarta. Senza, `verify:capabilities` esce 1 prima di leggere qualunque database"
  - "La guardia sul NULL e la forma sbagliata che la annulla sono DESCRITTE e non scritte per esteso: il controllo del piano pretende che la guardia compaia una volta sola e prima del confronto sulla notte, e un paragrafo che la citasse alla lettera sarebbe l'unico match"
  - "Lo statement di rimozione della funzione a zero argomenti e' descritto e non scritto, per lo stesso motivo — e' la scelta che 35-02 ha gia' registrato per gli offset di fuso"
  - "Il braccio dell'assegnazione non consulta `requires_approved` ne' lo stato: la FK composta piu' `profiles_role_implies_approved` rendono lo stato non-approved irraggiungibile per un assegnatario, e un test di stato li' sarebbe un nuovo modo di rifiutare qualcuno alla porta"
  - "Il warning del quarto lato — tre chiavi che nessuno chiede — non e' stato silenziato: e' il fallimento della CAP-02 di fase 34 che arriva in anticipo, ed e' previsto da `35-RESEARCH.md` Pitfall 5"

# Metrics
metrics:
  duration: "~75 min"
  completed: 2026-08-08
  tasks_completed: 3
  tasks_total: 3
  checkpoint_open: false
---

# Fase 35 Piano 03: il secondo braccio del resolver — Summary

L'assegnazione a una notte diventa visibile alle **70 policy RLS senza toccarne
nessuna**, perche' entra nel corpo della funzione che tutte gia' chiamano — e la
prima condizione del braccio nuovo e' la guardia sul NULL, che non e' prudenza ma
e' ASSIGN-01. Piu' le tre chiavi che il modello nominava senza averle, e
l'overload che permette al data-access layer di porre la domanda per-notte senza
che la funzione a zero argomenti — quella che il middleware chiama a ogni
navigazione — sia mai stata rimossa.

**La migration non e' applicata in produzione.** E' la riga 8 della coda di
`35-HUMAN-UAT.md` e si applica a mano, dopo la riga 7 (`35-02`). Ogni prova qui
sotto viene da container `postgres:17.6` costruiti con lo shim, lo schema base e
tutte e 46 le migration in ordine.

---

## Cosa e' stato fatto

| Task | Nome | Commit | File |
|---|---|---|---|
| 1 | Tre chiavi, nominate dalla domanda che rispondono | `41bdde0` | la migration (sez. 1-2), `src/lib/capabilities/keys.ts`, `scripts/verify-capabilities.mjs` |
| 2 | Il secondo braccio dell'OR, null-safe | `9de3a48` | la migration (sez. 3), le tre catture `35-03` |
| 3 | L'overload `public.my_access_context(uuid)` | `42ba5b7` | la migration (sez. 4), le tre catture `35-03-final` |

**Lingua dei commenti della migration:** inglese, come il proprio template
dichiarato `20260808002000_membership_register.sql` e come la migration di
`35-02`. Il paragrafo sull'idempotenza resta in italiano, come nel suo precedente.

---

## Le dodici decisioni

Sei grant e sei rifiuti, e **un rifiuto e' l'assenza di una riga** — non una
colonna booleana, che nell'`EXISTS` del resolver *concederebbe* invece di negare.

| Chiave | `master` | `organizer` | `staff` | `member` |
|---|---|---|---|---|
| `door.supervise` | grant, `requires_approved = false` | grant, `false` | **rifiutata** | **rifiutata** |
| `media.upload` | grant, `true` | grant, `true` | **rifiutata** | **rifiutata** |
| `party.manage` | grant, `true` | grant, `true` | **rifiutata** | **rifiutata** |

**I due `false` di `door.supervise` non si "puliscono".** Portano il loro
paragrafo, nella migration e in `ROLE_GRANTS`, nella stessa forma di quelli di
`door.operate`: accanto a `profiles_role_implies_approved` sembreranno ridondanti
e qualcuno proporra' di ribaltarli. I due guardano cose diverse — il vincolo
protegge il database, l'impostazione protegge la notte dal giorno in cui il
vincolo viene rilassato per un caso speciale. E l'asimmetria che decide e' il
soggetto stesso di questa chiave: un supervisore che non puo' annullare un
rifiuto sbagliato e' una fila che resta rifiutata.

**Il `true` sulle altre due non e' un'incoerenza.** Nessuna delle due avviene
davanti a una fila, quindi la ragione dei due `false` non le raggiunge, e un
account il cui accesso non e' mai stato approvato non ha titolo su nessuna delle
due.

**Il rifiuto di `media.upload` a `staff` e' il punto della fase.** Essere `staff`
non concede la capacita' di caricare i media di una notte: un fotografo la
ottiene **dall'assegnazione**, per la notte che ha lavorato, e scade con quella.
Se la portasse il ruolo, ogni collaboratore passato caricherebbe su ogni notte
futura e l'assegnazione sarebbe un'etichetta su qualcosa di gia' vero.
`20260808000500_staff_role.sql:125-136` aveva scritto quel rifiuto **prima che la
chiave esistesse**; questa riga e' quella frase che acquista una coppia su cui
essere verificata.

---

## La prova che il braccio funziona, e la prova che la guardia serve

Non esiste un test runner per il prodotto: queste sedici sonde sono uno script
scritto per questa sessione contro un container, non una suite. Sono l'unica
prova che esistera'.

Persona: un account **`staff`** — scelto apposta, perche' `staff` e' **rifiutato**
su tutte e tre le chiavi nuove, quindi il braccio 1 non puo' mai rispondere `true`
e ogni `true` qui sotto viene per forza dal braccio 2.

| # | Domanda posta al resolver | Atteso | Osservato |
|---|---|---|---|
| P1 | nessuna assegnazione, notte A nominata | `false` | `false` |
| P2 | assegnazione VIVA, **notte A nominata** | `true` | **`true`** |
| P3 | assegnazione viva su A, **notte B nominata** | `false` | `false` |
| P4 | assegnazione viva, `p_party_id` = `NULL` esplicito | `false` | `false` |
| P5 | assegnazione viva, **chiamata a un argomento** — come chiamano tutte e 70 le policy | `false` | `false` |
| P6 | `staff.manage` (non assegnata), notte A nominata | `false` | `false` |
| P7 | `membership.card.view` — il braccio 1 risponde ancora | `true` | `true` |
| P8 | `my_access_context(A)` contiene `door.supervise` | `true` | `true` |
| P9 | `my_access_context()` **non** lo contiene | `false` | `false` |
| P10 | `my_access_context(B)` **non** lo contiene | `false` | `false` |
| P11 | l'overload restituisce le stesse quattro chiavi di payload | `true` | `true` |
| P12 | `ends_at` spostato nel passato (ASSIGN-02) | `false` | `false` |
| P13 | `ends_at` riportato avanti: torna viva | `true` | `true` |
| P14 | revocata — la riga c'e' ancora (ASSIGN-03) | `false` | `false` |
| P15 | la riga revocata **non** e' stata cancellata | 1 riga | 1 riga |
| P16 | `anon`, con l'assegnazione viva su quella notte | `false` | `false` |

**16/16.**

### La prova per mutazione — perche' P4 e P5 non sono banali

`ai-engineering.md`, gate *prova per mutazione*: un controllo mai visto fallire
non prova niente. La guardia sul NULL e' stata **tolta deliberatamente** e
sostituita con la forma «tollerante» che il commento della migration nomina come
sbagliata — un `coalesce` dell'argomento con la colonna della riga. La mutazione
e' stata **verificata applicata** con `git diff` prima di leggerne l'esito:

```
-    where p_party_id is not null
-      and pa.party_id = p_party_id
+    where pa.party_id = coalesce(p_party_id, pa.party_id)
```

Esito, sullo stesso container e con le stesse sedici sonde: **13/16, e i tre che
cambiano sono esattamente P4, P5 e P9.**

| # | Con la guardia | Senza la guardia |
|---|---|---|
| P4 | `false` | **`true`** |
| P5 | `false` | **`true`** |
| P9 | `false` | **`true`** |

P5 e' la riga che conta: e' la forma con cui **tutte e 70 le policy** chiamano il
resolver. Senza quella guardia, un'assegnazione a **una** notte concede
`door.supervise` a un account `staff` **ovunque, su ogni tabella, per sempre** —
senza errore, senza build rotto, senza una sola definizione di policy cambiata.
La mutazione e' stata revertita e il file ripristinato dal commit.

---

## Le catture, e la riga che conta e' quella che non e' cambiata

Due catture, `npm run baseline:container -- --phase-point=35-03` (dopo il task 2)
e `--phase-point=35-03-final` (dopo il task 3), entrambe exit 0, entrambe da un
container che ha applicato **46** file di migration e seminato 12 profili.

`npm run baseline:compare --target=container --before-point=35-02
--after-point=35-03 --only=B1,B2,B3`, e lo stesso contro `35-03-final`:

| Matrice | Esito |
|---|---|
| B1 policy | **70 unchanged · 0 by T1 · 0 by T2 · 0 by both · 0 unexplained** |
| B2 letture | **308 celle confrontate, nessuna differenza**, 14/14 persone, 0 vacue |
| B3 scritture | **924 celle confrontate, nessuna differenza**, 22 inconcludenti — le stesse 22 di `35-02` |

**Zero differenze su tutte e tre.** Il braccio nuovo esiste ed e' completamente
**muto** quando la notte non e' nominata: e' T-35-10 misurato invece che
argomentato, ed e' anche il segnale d'allarme di `35-RESEARCH.md` § Pitfall 1
(*«una cella della matrice B3 che cambia su una tabella che questa fase non ha
toccato»*) che non e' scattato.

`CAP-03: clean` su entrambi i confronti.

---

## Deviazioni dal piano

### 1. [Rule 3 — bloccante] `EXPECTED_KEY_COUNT` 9 → 12

- **Trovata durante:** task 1, leggendo `scripts/verify-capabilities.mjs` prima
  di modificarlo.
- **Il fatto:** il piano nomina **tre** totali da aggiornare — 36/20/16 →
  48/26/22 — ma la costante che governa l'**asserzione 0** (*«both declarations
  hold the pre-registered N keys»*, `:126`) e che entra nel messaggio
  dell'aritmetica di `flattenDeclaration` (`:416`) e' una **quarta**,
  `EXPECTED_KEY_COUNT`. Con dodici chiavi in `keys.ts` e nel catalogo e la
  costante ferma a nove, l'asserzione 0 fallisce su **entrambi i lati** e il
  criterio di accettazione del task 1 non e' raggiungibile.
- **Fix:** alzata a 12, con il paragrafo che dice **quando** e **perche'** si e'
  mossa — nella stessa forma dei due precedenti registrati (8 → 9 per il piano
  43-07), perche' *«se questo scatta, guarda il modello, non questa costante»*
  vale anche per chi la sta alzando.
- **Commit:** `41bdde0`

### 2. [Rule 1 — un controllo che si autoannulla] La guardia sul NULL e' descritta, non citata

- **Trovata durante:** task 2, eseguendo il controllo del piano stesso.
- **Il fatto:** il criterio pretende che `grep -n "p_party_id is not null"`
  restituisca **una** riga, e che quella riga **preceda** `pa.party_id` nel file.
  Il paragrafo che spiegava la guardia la citava alla lettera nel proprio titolo,
  e citava anche la forma sbagliata (`coalesce(p_party_id, pa.party_id)`) —
  quindi il grep restituiva due righe, e la prima occorrenza di `pa.party_id`
  cadeva **prima** dello statement SQL.
- **Cosa e' stato fatto:** il titolo diventa «THE NULL GUARD IS THE FIRST
  CONDITION», la forma sbagliata e' **descritta** («coalescing the argument with
  the row's own night column»), e una riga dice **perche'** non sono scritte per
  esteso. La guardia compare una volta sola, nel corpo della funzione, seguita
  dal confronto sulla notte.
- **Perche' non ho lasciato il controllo rosso:** e' la scelta che `35-02` ha
  gia' registrato per gli offset di fuso e per la cascata sull'update — un
  controllo che va letto aggirandolo e' un controllo che la terza volta viene
  ignorato.
- **Commit:** `9de3a48`

### 3. [Rule 1 — stesso motivo] Lo statement di rimozione e' descritto, non scritto

- **Trovata durante:** task 3.
- **Il fatto:** il criterio pretende `grep -c 'DROP FUNCTION' = 0`, e il piano
  chiede **contemporaneamente** di spiegare perche' l'alternativa (cambiare la
  firma della funzione a zero argomenti) e' stata rifiutata — spiegazione che
  nomina proprio quello statement.
- **Cosa e' stato fatto:** «the existing function would have to be removed and
  re-created inside this transaction», con `42P13` citato per nome e la ragione
  scritta: in una coda applicata **a mano**, rimuovere-e-ricreare apre una
  finestra in cui la funzione **non esiste**, e se la transazione si interrompe
  li' la finestra non si chiude — sulla funzione che il middleware chiama a ogni
  navigazione, cioe' a ogni scan, su un telefono, davanti a una fila.
- **Commit:** `42ba5b7`

### 4. [Rule 2 — artefatti fuori da `files_modified`] Le sei catture di baseline

- **Il fatto:** i criteri di accettazione dei task 2 e 3 pretendono che
  `baseline:container` giri; il comando **scrive tre artefatti per cattura** in
  `.planning/phases/32-.../baseline/`, directory che il `files_modified` del
  piano non elenca.
- **Cosa e' stato fatto:** committati insieme al task che li ha prodotti, con i
  nomi `…container.35-03.json` e `…container.35-03-final.json` — unici per questo
  piano, quindi senza collisione con gli altri agenti dell'onda. E' la stessa
  scelta di `35-02`. Non committarli avrebbe significato **perderli**: il
  worktree viene rimosso a fine onda, e con essi l'unica prova che le 70 policy
  non si sono mosse.
- **Commit:** `9de3a48`, `42ba5b7`

---

## Verifiche eseguite

| Verifica | Comando | Esito |
|---|---|---|
| Typecheck | `npm run build` | **PASS** — `✓ Compiled successfully` |
| I cinque lati del modello | `npm run verify:capabilities -- --target=container` | **PASS** — exit 0, `5/5 green, 1 warning(s)` (vedi sotto), TS 12 · DB 12 · GRANT 26 righe |
| I tre totali del piano | `grep` su `scripts/verify-capabilities.mjs` | **PASS** — `EXPECTED_PAIR_COUNT = 48`, `EXPECTED_GRANT_COUNT = 26`, `EXPECTED_REFUSAL_COUNT = 22` |
| Nessuna colonna di negazione nella migration | `grep -c granted` | **PASS** — 0 |
| Nessuna policy scritta in questo file | `grep -c 'CREATE POLICY'` | **PASS** — 0 |
| La funzione a zero argomenti non e' stata rimossa | `grep -c 'DROP FUNCTION'` | **PASS** — 0 |
| La guardia compare una volta e precede il confronto sulla notte | `grep -n` | **PASS** — riga 347, `pa.party_id` alla 348 |
| `REVOKE` prima di `GRANT` sull'overload | `grep -n` | **PASS** — 484 prima di 486 |
| `SET search_path = ''` su ogni funzione definita | lettura + `grep -c` | **PASS** — 2 definizioni, 2 occorrenze |
| Il braccio nuovo, esercitato | 16 sonde contro il container | **PASS** — 16/16, tabella sopra |
| La guardia sul NULL e' load-bearing | mutazione applicata e verificata con `git diff`, poi revertita | **PASS** — 13/16, e i tre che cadono sono P4, P5, P9 |
| Le catture | `baseline:container -- --phase-point=35-03` e `35-03-final` | **PASS** — exit 0, sei artefatti |
| Il confronto | `baseline:compare … --before-point=35-02 --only=B1,B2,B3` | **PASS** — 70 policy invariate, 0 unexplained, 308 e 924 celle identiche |

### Il warning del quarto lato, che non e' stato silenziato

```
  ! 4 · every catalogue key is asked for by a policy or by src/
      "door.supervise" is in the catalogue but NEITHER a policy NOR src/ asks for it.
      "media.upload" is in the catalogue but NEITHER a policy NOR src/ asks for it.
      "party.manage" is in the catalogue but NEITHER a policy NOR src/ asks for it.
```

**E' previsto e non e' un difetto introdotto qui.** `35-RESEARCH.md` § Pitfall 5
lo nomina testualmente come il segnale d'allarme di questa situazione, e il
quarto lato e' un `warn` per costruzione — *«Phase 34's CAP-02 will fail the
production build for a capability mapped to no route. This is that failure,
arriving early and cheaply»*. L'esito resta `5/5 green` ed exit 0.

I consumatori arrivano nelle onde successive, e sono nominati nel commento di
`keys.ts` e in quello di `verify-capabilities.mjs` invece di essere lasciati da
ricostruire: `party.manage` al piano **35-09** (terzo braccio della policy del
registro della porta) e **35-17**; `media.upload` ai piani **35-16** e **35-21**;
`door.supervise` ai piani **35-07**, **35-11** e **35-13**.

**Nulla e' stato modificato per farlo tacere.** Abbassare un totale o allargare
la lista dei consumatori attesi sarebbe modificare il rilevatore perche' concordi
con cio' che deve rilevare.

### Cosa queste verifiche NON provano

- **La migration non e' applicata in produzione.** Ogni prova sopra viene da un
  container. Che gli oggetti si costruiscano e che il braccio risponda non dice
  che il prodotto funzioni con essi: quello si vede applicando la riga 8 della
  coda e deployando il codice.
- **`npm run build` verde non significa niente su questa migration.** I tipi
  vengono da `src/types/database.ts`, non dal database vivo. Il verde e' esatto
  esattamente come lo era prima che queste chiavi esistessero.
- **Nessun test del prodotto e' stato eseguito, perche' non ne esistono.**
- **Non e' stato misurato l'effetto del braccio su una policy reale.** Le 70
  policy chiamano il resolver **senza** notte, quindi il braccio e' muto per
  tutte: e' proprio cio' che il confronto B1/B2/B3 dimostra. La prima policy che
  passera' una notte e' del piano **35-09**, ed e' li' che il braccio verra'
  misurato *dentro* un predicato invece che da solo.
- **Il costo di esecuzione del braccio non e' stato misurato.**
  `idx_party_assignments_lookup` esiste (`35-02`, sezione 3e) e nessuna policy
  nuova e' stata aggiunta qui, ma nessun `EXPLAIN` e' stato eseguito su un
  predicato che passi una notte. Appartiene al piano che scrivera' quel
  predicato.

---

## Threat Flags

Le voci del threat register del piano, con come sono coperte:

| ID | Disposizione | Come, e con quale prova |
|---|---|---|
| T-35-10 | mitigato | La guardia sul NULL e' la **prima** condizione del braccio 2. Provata in due direzioni: 16/16 con la guardia (P4, P5), **13/16 senza**, con P5 — la forma con cui chiamano tutte e 70 le policy — che diventa `true`. Piu' B1/B2/B3 identiche a `35-02`, `0 unexplained` |
| T-35-11 | mitigato | `now() < pa.ends_at`, orologio del server. Provato: P12 `false` con `ends_at` nel passato, P13 `true` riportandolo avanti |
| T-35-12 | mitigato | `my_access_context(uuid)` risponde su `auth.uid()` e non ha modo di nominare nessun altro: entrambi i bracci del resolver sono ancorati al chiamante. `REVOKE ALL … FROM public, anon, authenticated` poi `GRANT … TO authenticated`. Il paragrafo che distingue **contesto** da **soggetto** e' scritto nella migration perche' l'obiezione arrivera' in buona fede |
| T-35-13 | mitigato | REVOKE **poi** GRANT, due statement, **per la firma nuova**: `CREATE OR REPLACE` eredita l'ACL solo quando sostituisce, e questo e' un oggetto nuovo su cui Postgres concede `EXECUTE` a `PUBLIC` per default |
| T-35-14 | mitigato | `SET search_path = ''` su entrambe le funzioni definite, ogni riferimento schema-qualificato. `now()` resta non qualificata deliberatamente: `pg_catalog` e' cercato implicitamente anche con `search_path` vuoto ed e' l'unico schema che un chiamante non puo' oscurare |
| T-35-15 | mitigato | Nessuna policy nuova in questo piano, quindi nessun call site nuovo. Le 70 esistenti sono byte-identiche: misurato, non affermato |
| T-35-SC | non applicabile | nessun pacchetto installato o modificato |

**Nessuna superficie di sicurezza nuova oltre a quella pianificata.** L'unica
funzione esposta che questo file aggiunge e' `public.my_access_context(uuid)`,
ed e' nel registro sopra con la sua disposizione.

Una nota di **osservabilita'**, come segnalazione e non come difetto introdotto
qui: il braccio nuovo aggiunge **un nuovo modo di rispondere `false`** — la notte
sbagliata, la notte finita, l'assegnazione revocata. In un prodotto senza error
tracking (`meta-gates.md`) un `false` non e' un errore e non raggiunge nessuno:
si presenta come un permesso che non c'e'. **I tre casi devono essere
distinguibili sulla superficie**, non collassati in un unico rifiuto — e'
`35-RESEARCH.md` § Pitfall 2 (un `403` per un'assegnazione revocata manda la coda
offline in `blocked` e non la sblocca piu'). Realizzarlo appartiene ai piani
**35-07**, **35-11** e **35-13**; qui e' **dichiarato, non fatto**.

---

## Known Stubs

Nessuno stub di codice.

Tre dipendenze in avanti, dichiarate qui e nei due file che le contengono, non
lasciate da scoprire a valle:

1. **Le tre chiavi non hanno ancora un consumatore.** E' il warning del quarto
   lato, sopra, con i piani che lo chiudono nominati uno per uno.
2. **Nessuna policy passa ancora una notte al resolver.** Il braccio esiste e
   nessun predicato lo interroga: la prima e' del piano **35-09**.
3. **`public.my_access_context(uuid)` non ha ancora un chiamante.** Il DAL la
   raggiunge dal piano **35-07** (`hasCapability(key, { partyId })`). Fino ad
   allora la funzione e' esposta, corretta e inutilizzata — che e' lo stato che
   il piano voleva, non una svista.

### Perche' `deferred-items.md` non e' stato toccato

Non e' emerso nulla fuori perimetro che appartenga ad altri piani. E se fosse
emerso, non sarebbe stato scritto li' **in questa onda**: `35-04` e `35-05`
girano in parallelo su worktree separati e `ai-engineering.md`, gate
*multi-agent*, dice di **sequenziare** due agenti sullo stesso file, non di
parallelizzarli. Le tre dipendenze in avanti qui sopra sono scritte nei file che
chi esegue i piani a valle attraversa comunque — `src/lib/capabilities/keys.ts`,
`scripts/verify-capabilities.mjs` e questo SUMMARY.

---

## Self-Check: PASSED

- `supabase/migrations/20260809001000_assignment_resolver.sql` — FOUND
- `src/lib/capabilities/keys.ts` — FOUND, contiene `DOOR_SUPERVISE`, `MEDIA_UPLOAD`, `PARTY_MANAGE` e le tre descrizioni
- `scripts/verify-capabilities.mjs` — FOUND, contiene `EXPECTED_KEY_COUNT = 12` e i tre totali 48/26/22
- `.planning/phases/32-capability-model-in-the-database/baseline/32-BASELINE-{policies,reads,writes}.container.35-03.json` — FOUND (3 file)
- `.planning/phases/32-capability-model-in-the-database/baseline/32-BASELINE-{policies,reads,writes}.container.35-03-final.json` — FOUND (3 file)
- commit `41bdde0` — FOUND
- commit `9de3a48` — FOUND
- commit `42ba5b7` — FOUND
- `.planning/STATE.md` e `.planning/ROADMAP.md` — **NON MODIFICATI**, come da contratto worktree
- `.planning/phases/35-per-night-assignments/deferred-items.md` — **NON MODIFICATO**, altri agenti in parallelo
- `supabase/migrations/20260807000000_capability_model.sql` — **NON MODIFICATO**: e' applicata in produzione, e `supabase-data.md` gate *migration in avanti* non ammette eccezioni nemmeno per la prosa
- lo script delle sedici sonde e' rimasto in `/tmp` e **non e' committato**: e' materiale di sessione, non un artefatto del repo
