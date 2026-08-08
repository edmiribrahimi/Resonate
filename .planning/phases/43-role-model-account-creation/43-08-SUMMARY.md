---
phase: 43-role-model-account-creation
plan: 08
subsystem: access-gating
tags: [baseline, personas, write-matrix, re-baseline, staff, evidence]
requires:
  - "43-05 — il ruolo `staff` nei due CHECK"
  - "43-06 — `profiles_role_implies_approved`, la regola che rende sei stati irrappresentabili"
  - "43-07 — il punto di cattura da cui questo confronto parte"
provides:
  - "`staff` come persona sondata: PERSONA_ROLES a quattro valori, PERSONA_SQL allineato"
  - "sei scritture vietate invece di quattro — `staff/pending` e `staff/rejected` incluse"
  - "il punto di cattura `43-08`: la baseline da cui ogni piano successivo di questa fase confronta"
  - "la misura cella per cella di D-02: `staff` non raggiunge niente che `member` non raggiunga"
affects:
  - "ogni piano successivo della fase 43 — il `--before-point` diventa `43-08`"
  - "scripts/rls-baseline-container.mjs — l'intestazione contava nove personas, ora dodici"
tech-stack:
  added: []
  patterns:
    - "l'attesa scritta e committata PRIMA della cattura, con una previsione falsificabile sull'impronta"
    - "il conteggio derivato dalla lunghezza della lista, mai digitato — un `4/4` fisso avrebbe continuato a stampare il pieno su sei"
key-files:
  created:
    - ".planning/phases/32-capability-model-in-the-database/baseline/32-BASELINE-policies.container.43-08.json"
    - ".planning/phases/32-capability-model-in-the-database/baseline/32-BASELINE-reads.container.43-08.json"
    - ".planning/phases/32-capability-model-in-the-database/baseline/32-BASELINE-writes.container.43-08.json"
  modified:
    - "scripts/rls-baseline.mjs"
    - "scripts/container/seed.mjs"
    - "scripts/rls-baseline-container.mjs"
decisions:
  - "`'staff'` accodato dopo `'member'`: lascia `min(id)` su `master/approved` e non muove le celle `profiles × update`"
  - "`EXPECTED_PERSONAS.production` lasciata invariata — produzione non ha righe `staff` e asserirle fallirebbe per una ragione vera che non è un difetto"
  - "L'uguaglianza letterale del piano è stata misurata dove può valere e riportata dove non può: la proprietà delle righe, non una capability, separa la coppia `approved`"
  - "Verificato contro il container; nessuna migration applicata a produzione"
metrics:
  tasks: 2
  duration: ~50m
  completed: 2026-08-08
---

# Phase 43 Plan 08: `staff` diventa una persona sondata — Summary

Il ruolo che questa fase ha creato era, fino a questo piano, **invisibile all'unico
strumento di questo repository che abbia mai colto un difetto reale**. La write
matrix sondava undici personas e nessuna di esse era `staff`: una capability
trapelata nel nuovo ruolo non avrebbe mosso nessun artefatto. Ora ne sonda
quattordici.

<!--
  SEZIONE SCRITTA PRIMA DELLA CATTURA.
  Tutto ciò che sta sotto "L'attesa, scritta prima" è stato committato nel file
  prima che `baseline:container --phase-point=43-08` girasse. Le previsioni
  numeriche qui sotto sono derivate dalla cattura 43-07 e dal codice del seed,
  mai dal risultato che devono giudicare.
-->

## L'attesa, scritta prima di leggere qualunque risultato

*(Sezione redatta e salvata su disco prima di lanciare la cattura `43-08`.)*

### 1. Le tre etichette nuove

`staff/approved`, `staff/pending`, `staff/rejected`.

### 2. I conteggi impliciti

La cattura `43-07` porta **21 tabelle** con RLS e **11 personas**. Quindi:

| classe | previsione | derivazione |
|---|---|---|
| `b2_persona_added` | **3** | le tre etichette sopra |
| `b2_cell_added` | **63** | 3 personas × 21 tabelle |
| `b3_cell_added` | **189** | 3 personas × 21 tabelle × 3 verbi |

### 3. Le celle preesistenti che **si muoveranno**, e perché

Il piano scrive *«nessuna cella preesistente può muoversi — la fase non ha
cambiato nessuna policy dal punto precedente»*. La premessa sulle policy è vera,
e la conclusione **non lo è**: la griglia delle personas *è* il contenuto di
`public.profiles`, e `public.profiles` è una delle 21 tabelle sondate. Tre
personas in più sono tre righe in più nella tabella che B2 impronta.

Previsione, letta dall'artefatto `43-07` e non dal risultato:

- **sei celle** cambiano — `master/{approved,pending,rejected}` e
  `organizer/{approved,pending,rejected}` × `profiles` — da `count: 9` a
  `count: 12`, classe `b2_count_changed`. Sono le sei che nella cattura `43-07`
  portano `pk_md5: 4cb329035935f5a8f9208f45756cbfd8`, cioè vedono **tutta** la
  tabella.
- **previsione falsificabile sull'impronta**: il nuovo `pk_md5` di quelle sei
  celle sarà **`ff5c062e45c840688c0796ae43bf22dd`**.

  Calcolato prima della cattura come `md5` dei dodici id sintetici
  `32000004-0000-4000-8000-0000000000NN` ordinati come testo e uniti da `,`. Il
  metodo è stato validato all'indietro: lo stesso calcolo sui **nove** id
  restituisce `4cb329035935f5a8f9208f45756cbfd8`, che è esattamente il valore
  nell'artefatto `43-07`. Se il valore osservato differirà da quello previsto,
  le righe visibili non sono le dodici personas e la differenza **non** è
  aritmetica.
- **non devono muoversi**: i tre `member/*` × `profiles` (`count: 1`, la propria
  riga), `anon` e `authenticated/no-profile` × `profiles` (`count: 0`), e
  **nessuna** cella di nessun'altra tabella, in B2 o in B3.
- `table_row_counts.profiles` passa 9 → 12. Non è una classe di difetto.
- B1: **zero** differenze. Nessuna migration è stata aggiunta fra `43-07` e
  questo punto.
- B3: **nessuna** cella preesistente si muove. La sonda `update` e la sonda
  `delete` puntano `min(pk)`, e `min(pk)` su `profiles` resta l'id `…0001`,
  cioè `master/approved` — `'staff'` è stato **accodato** dopo `'member'`
  proprio per questo.

Totale differenze attese: **3 + 63 + 189 + 6 = 261**.

### 4. L'uguaglianza `staff` ≡ `member`, e come va misurata davvero

Il piano chiede che `staff/approved` sia identica a `member/approved` cella per
cella. **Presa alla lettera quella misura non può riuscire, e il motivo non è una
capability**: è la proprietà delle righe.

`scripts/container/seed.mjs` assegna la proprietà di ogni riga a due sole
personas — `rowOwners = [member/approved, master/approved]`. Quindi
`member/approved` possiede la riga 1 di **ogni** tabella con una colonna di
proprietà, e `staff/approved` non possiede **nulla**. Ogni policy della forma
`auth.uid() = user_id` risponde diversamente alle due, e risponde diversamente
per una ragione che non ha niente a che vedere con `private.has_capability`.
Su `profiles` vale lo stesso in forma più netta: ciascuna vede **la propria**
riga, quindi stesso `count` e `pk_md5` diverso per costruzione.

Previsione, in tre parti:

1. **`staff/pending` ≡ `member/pending` e `staff/rejected` ≡ `member/rejected`,
   esattamente**, su ogni tabella e ogni verbo, con l'unica eccezione del
   `pk_md5` di `profiles` (la propria riga). Nessuna delle quattro possiede
   righe, quindi la proprietà non le separa e resta solo la capability — che è
   la stessa. **Queste due coppie sono la vera misura di D-02.**
2. **`staff/approved` vs `member/approved`**: uguali ovunque **tranne** dove il
   seed ha dato la proprietà a `member/approved`. Ogni differenza deve essere
   della forma «member vede/scrive di più perché possiede», mai il contrario.
3. **L'asserzione direzionale, che è quella che conta per la sicurezza e che
   vale su tutte e tre le coppie**: `staff` non deve **mai** leggere più di
   `member` né scrivere dove `member` è rifiutata. Una capability trapelata nel
   nuovo ruolo si manifesterebbe esattamente così — e questa direzione non ha
   eccezioni ammesse.

Qualunque differenza fuori da queste tre forme è un difetto che questo piano
**riporta e non ripara**.

> **La prova che l'attesa precede il risultato non è la mia parola.** Il testo qui
> sopra è il commit `f98d7af`, *«the expectation, written before the capture
> runs»*. La cattura è il commit `1996272`, successivo. Un'attesa letta dal
> proprio risultato non può fallire, e questo è l'unico modo di renderlo
> verificabile da terzi in un repository senza test.

---

## Task 1 — la quarta persona, tre siti e uno che non si muove (`0e6d716`)

### Il sito che non deriva dall'array

`PERSONA_ROLES` è passata a quattro valori, e questo da solo **non basta**:
`PERSONA_SQL` (`scripts/rls-baseline.mjs`) porta la lista dei ruoli come
**letterale SQL**, non interpolata dall'array. Un ruolo aggiunto all'array e
dimenticato lì verrebbe seminato, verrebbe contato nella griglia, e poi
`resolvePersonas` lo salterebbe in silenzio: la persona tornerebbe `absent` su un
target che invece la possiede — che si legge come *«niente da misurare»* invece
che come *«il resolver ha un refuso»*. Entrambi i siti sono stati toccati, e il
motivo è scritto accanto al letterale.

### L'ordine dei due array, che è portante

`'staff'` è stato **accodato dopo `'member'`**. Non è estetica:

- gli id delle personas sono `32000004-0000-4000-8000-<indice>`, assegnati dal
  ciclo annidato `for role of PERSONA_ROLES { for status of PERSONA_STATUSES }`;
- la sonda `update` della write matrix punta `min(pk)` (`resolveProbeKeys`
  `:1221-1231`, `buildProbeStatement` `:1270-1271`);
- dal piano 43-06 il container ripristina `profiles_role_implies_approved`
  **NOT VALID**, e un CHECK `NOT VALID` rifiuta **ogni** update a una riga già in
  violazione, anche su una colonna che il predicato non nomina.

Quindi se `min(id)` finisse su una coppia vietata, **tutte** le celle
`profiles × update` smetterebbero di essere un verdetto RLS e diventerebbero un
`23514`. Erano **undici** prima di questo piano; sono **quattordici** dopo.

Cosa è sicuro, scritto dove qualcuno modificherà:

| edit | sicuro? | perché |
|---|---|---|
| `'staff'` dopo `'member'` | **sì** | indice 1 resta `master/approved`, conforme |
| `'staff'` prima di `'master'` | sì | `staff/approved` è comunque conforme |
| riordinare `PERSONA_STATUSES` | **NO** | indice 1 diventerebbe `master/pending` |

`assertProbeRowSatisfiesTheRule` lo asserisce a ogni run, perché **un commento non
è una guardia**. Osservato:
`profiles × update probes master/approved — satisfies profiles_role_implies_approved`.

### `EXPECTED_PERSONAS.production` invariata, e la ragione accanto

Produzione non ha righe `staff`: la migration che crea il ruolo è committata e
**non applicata**. Aggiungere `staff/*` a quella lista farebbe uscire 1 ogni
cattura di produzione per una ragione **vera** che **non è un difetto** — il modo
più rumoroso possibile di insegnare al prossimo lettore che quella lista è
rumore. Ci entrerà il giorno in cui una riga `staff` esisterà davvero.

### Quattro scritture vietate diventano sei

`ROLE_IMPLIES_APPROVED.predicate` nomina tre ruoli e ci sono due stati non
approvati: la regola vieta **3 × 2 = 6** coppie. Fino a oggi la lista ne teneva
quattro — le sole che la griglia sapesse produrre — cioè un detector che
sorvegliava due terzi della regola e ne certificava il tutto.

`staff/pending` e `staff/rejected` sono **le due create da questa fase**, quindi
esattamente le due la cui refusal era meno documentata. Osservato:

```
refused organizer/pending   23514 profiles_role_implies_approved
refused organizer/rejected  23514 profiles_role_implies_approved
refused master/pending      23514 profiles_role_implies_approved
refused master/rejected     23514 profiles_role_implies_approved
refused staff/pending       23514 profiles_role_implies_approved
refused staff/rejected      23514 profiles_role_implies_approved
6/6 forbidden writes refused, profiles still 12 rows
seeded 21 tables, 12 profiles, 12/12 role × status cells
```

Il tally `6/6` è **derivato** da `FORBIDDEN_WRITES.length`. Il `4/4` che c'era
prima era digitato a mano, e avrebbe continuato a stampare il punteggio pieno
mentre due delle sei non venivano guardate. È lo stesso difetto che questo piano
sta correggendo un piano più in su, in scala ridotta.

`expectedCells` non è stato toccato: deriva dal prodotto delle due lunghezze — che
è il motivo per cui il seed e la lista delle personas si muovono nello stesso
piano.

### La griglia

`profiles role × status: master/approved=1 master/pending=1 master/rejected=1
member/approved=1 member/pending=1 member/rejected=1 organizer/approved=1
organizer/pending=1 organizer/rejected=1 staff/approved=1 staff/pending=1
staff/rejected=1` — 12/12 celle, exit 0.

---

## Task 2 — la cattura, il confronto e l'uguaglianza (`f98d7af`, `1996272`)

### La cattura

```
npm run baseline:container -- --phase-point=43-08
```

- B1 → 68 righe, postgres 17.6, 21 tabelle con RLS
- B2 → 294 righe, **14/14 personas risolte**, 21 tabelle, **0 celle vacue**
- B3 → 882 righe, 882 sonde inviate, 221 rifiuti, 639 successi, 22 inconcludenti

294 = 14 × 21. 882 = 14 × 21 × 3. Nessun artefatto sovrascritto: `43-08` è un nome
nuovo e le catture `43-05`, `43-06`, `43-07` sono intatte — `--overwrite` non è
stato usato e non serviva.

### Il confronto, letto contro l'attesa

Il comando del piano esce **FATAL** senza `--only`, ed è corretto:

```
FATAL: B5 is the Supabase advisor and has no container equivalent.
There is nothing to compare. Ask for --only=B1,B2,B3 on the container.
```

Comando eseguito:

```
npm run baseline:compare -- --target=container \
  --before-point=43-07 --after-point=43-08 --only=B1,B2,B3
```

**Verdetto: `CAP-03: 261 defects`.** Previsto: 261.

| classe | previsto | osservato |
|---|---|---|
| `b3_cell_added` | 189 | **189** |
| `b2_cell_added` | 63 | **63** |
| `b2_count_changed` | 6 | **6** |
| `b2_persona_added` | 3 | **3** |
| **totale** | **261** | **261** |

Nessun'altra classe. In particolare **nessun** `b3_cell_changed`, **nessun**
`b2_fingerprint_changed`, **nessun** `b2_persona_missing`.

**B1: `68 unchanged · 0 by T1 · 0 by T2 · 0 by both · 0 unexplained`** — nessuna
policy si è mossa, come doveva essere: fra `43-07` e questo punto non è stata
aggiunta nessuna migration.

### Le sei celle mosse, e la previsione falsificabile che le spiega

Le sei sono **esattamente** quelle attese —
`master/{approved,pending,rejected}` e `organizer/{approved,pending,rejected}` ×
`profiles`, tutte `9 → 12 rows visible` — e non ce n'è una settima.

La previsione dell'impronta, scritta prima:

| | previsto | osservato |
|---|---|---|
| `pk_md5` delle sei celle | `ff5c062e45c840688c0796ae43bf22dd` | **`ff5c062e45c840688c0796ae43bf22dd`** |

Il metodo era stato validato all'indietro sui nove id (`4cb32903…`, il valore
letterale nell'artefatto `43-07`) prima di essere usato in avanti. **Questo è ciò
che distingue "aritmetica" da "allargamento":** le righe che quelle sei personas
vedono adesso sono **le dodici personas seminate e nient'altro**. Se una policy si
fosse allargata, il conteggio sarebbe salito lo stesso e l'impronta **no**.

Il piano scriveva *«nessuna cella preesistente può muoversi — la fase non ha
cambiato nessuna policy»*. La premessa è vera e la conclusione no: **la griglia
delle personas è il contenuto di `public.profiles`, e `public.profiles` è una
delle 21 tabelle sondate.** È la seconda metà, non dichiarata, del prezzo
inderogabile che questo piano paga — ed è riportata, non riparata: nessuna soglia,
nessuna attesa e nessuna asserzione è stata abbassata per far concordare il run.

### L'uguaglianza `staff` ≡ `member` — il motivo per cui questo piano esiste

Comando esatto, riproducibile, **non committato come script** (il piano lo vieta):

```bash
node -e '
const B = ".planning/phases/32-capability-model-in-the-database/baseline/";
const rd = require(B + "32-BASELINE-reads.container.43-08.json");
const wr = require(B + "32-BASELINE-writes.container.43-08.json");
const readOf  = p => new Map(rd.rows.filter(r => r.persona === p).map(r => [r.table, r]));
const writeOf = p => new Map(wr.rows.filter(r => r.persona === p).map(r => [r.table + " × " + r.verb, r]));
for (const st of ["approved","pending","rejected"]) {
  const m = readOf("member/"+st),  s  = readOf("staff/"+st);
  const mw = writeOf("member/"+st), sw = writeOf("staff/"+st);
  const dC=[], dM=[], dW=[], more=[];
  const perm = x => String(x).startsWith("ok:") && x !== "ok:0";
  for (const [k, mc] of m) { const sc = s.get(k);
    if (mc.count !== sc.count) dC.push(k+": member "+mc.count+" vs staff "+sc.count);
    else if (mc.pk_md5 !== sc.pk_md5) dM.push(k);
    if (sc.count > mc.count) more.push("READ "+k); }
  for (const [k, mc] of mw) { const sc = sw.get(k);
    if (mc.result !== sc.result) dW.push(k+": member "+mc.result+" vs staff "+sc.result);
    if (perm(sc.result) && !perm(mc.result)) more.push("WRITE "+k+": staff "+sc.result+", member "+mc.result); }
  console.log("staff/"+st, "| read count≠", dC.length, "| read md5≠", dM.length,
              "| write≠", dW.length, "| staff EXCEEDS member:", more.length, more.join(" ; "));
  dC.concat(dW).forEach(x => console.log("    " + x));
}'
```

Risultato, sulle tre coppie:

| coppia | read `count` ≠ | read `md5` ≠ | write verdetto ≠ | **staff supera member** |
|---|---|---|---|---|
| `staff/pending` vs `member/pending` | **0** | 1 (`profiles`) | **0** | **0** |
| `staff/rejected` vs `member/rejected` | **0** | 1 (`profiles`) | **0** | **0** |
| `staff/approved` vs `member/approved` | 8 | 1 (`profiles`) | 1 | 1 → **spiegato sotto** |

**Le due coppie pulite sono la misura di D-02, e sono perfette.** 21 celle di
lettura e 63 celle di scrittura identiche, su 21 tabelle e 3 verbi, con l'unica
eccezione dell'impronta di `profiles` — dove ciascuna vede **la propria** riga,
quindi `count` uguale e `pk_md5` diverso *per costruzione*. Nessuna delle quattro
personas possiede righe, quindi la proprietà non le separa e resta solo la
capability: che è la stessa.

#### Le otto differenze di lettura sulla coppia `approved`: proprietà, non permesso

Tutte e otto hanno la stessa forma — `attendances`, `drink_orders`,
`drink_tokens`, `event_media`, `pending_purchases`, `rsvps`, `ticket_refunds`,
`tickets`: **`member 1 vs staff 0`**. `seed.mjs` assegna la proprietà a due sole
personas (`rowOwners = [member/approved, master/approved]`), quindi
`member/approved` possiede la riga 1 di ogni tabella con colonna di proprietà e
`staff/approved` non possiede **nulla**. Ogni policy della forma
`auth.uid() = user_id` risponde diversamente per una ragione che non ha niente a
che vedere con `private.has_capability`.

**La direzione è quella giusta in tutti e otto i casi: member vede di più, mai
staff.** Zero celle di lettura, su tutte e tre le coppie, in cui `staff` vede più
di `member`.

#### L'unico verdetto di scrittura diverso, e perché non è una capability trapelata

```
rsvps × insert : member/approved 23505  ·  staff/approved ok:1
```

Non è un allargamento, ed è dimostrabile senza appellarsi agli interni di
Postgres:

1. **L'harness stesso ha già marcato quella cella `conclusive_for_rls: false`**,
   e l'aveva marcata così **nella cattura `43-07`, prima che `staff` esistesse**
   (verificato: `43-07 member/approved rsvps insert: 23505 conclusive_for_rls=
   false`). È una proprietà preesistente del seed, non qualcosa che questo piano
   ha introdotto.
2. `23505` è `unique_violation`, e `supabase/schema.sql:203` porta
   `unique(event_id, user_id)` su `rsvps`. `member/approved` **possiede già** la
   riga 1 di `rsvps`, quindi la sua insert collide con la propria riga.
   `staff/approved` non possiede nulla, quindi non collide.
3. La policy è `rsvps_insert_approved`, con
   `WITH CHECK ((auth.uid() = user_id) AND private.has_capability('membership.active'))`.
   **`membership.active` è una delle due capability che `staff` e `member`
   condividono.** Quindi quell'`ok:1` non è un permesso in più: è la stessa
   identica grant che produce la stessa identica decisione, su una riga che non
   era già occupata.

La riga di controllo negativa, che è quella decisiva: `staff/pending`,
`staff/rejected`, `member/pending` e `member/rejected` prendono tutte e quattro
**`42501`** su `rsvps × insert` — un rifiuto RLS vero. `requires_approved` sta
lavorando sul nuovo ruolo esattamente come sul vecchio.

**Nessuna cella, su nessuna delle tre coppie, mostra `staff` scrivere dove
`member` è rifiutata da una policy.** D-02 e D-14 sono misurati, non argomentati.

---

## La trappola, controllata e ancora in piedi

Le due righe `door.operate` con `requires_approved = false` (master e organizer)
**non sono state toccate** — nessun diff su `scripts/verify-capabilities.mjs`,
nessuna migration modificata da questo piano — e il lato 5 le ha lette verdi:
`20 grants and 16 refusals over 4 roles × 9 keys, both directions, 20 rows read`.
Restano il `false` che tiene aperta la porta davanti a una fila.

## Deviazioni dal piano

### 1. [Rule 3 — bloccante] Il comando di confronto del piano esce FATAL

- **Trovata durante:** task 2, al primo confronto.
- **Sintomo:** `npm run baseline:compare -- --target=container --before-point=43-07
  --after-point=43-08` (esattamente come scritto nel `<verify>` del piano) esce
  `FATAL: B5 is the Supabase advisor and has no container equivalent.`
- **Fix:** aggiunto `--only=B1,B2,B3`, che è ciò che il messaggio stesso chiede.
  Nessuna soglia toccata.

### 2. [decisione dell'esecutore] La premessa «nessuna cella preesistente può muoversi» era incompleta

Il piano la dava per vera. È vera sulle policy e falsa sui dati: sei celle si
muovono perché `public.profiles` è insieme la sorgente delle personas e una
tabella sondata. È stata **prevista prima del run** (commit `f98d7af`) e
**riportata, non riparata**. Nessuna asserzione è stata indebolita.

### 3. [decisione dell'esecutore] L'uguaglianza letterale del piano non è misurabile sulla coppia `approved`

Il piano chiede che `staff/approved` sia identica a `member/approved` cella per
cella. Il seed rende quella misura impossibile per costruzione — `member/approved`
possiede una riga di ogni tabella ownable, `staff/approved` nessuna. Al posto di
dichiarare un falso fallimento o di cancellare in silenzio la richiesta, la misura
è stata data in tre forme: uguaglianza **esatta** sulle due coppie che il seed non
separa, differenze **enumerate una a una con la loro causa** sulla terza, e
l'asserzione direzionale `staff ⊆ member` su **tutte e tre** — che è quella che
conta per la sicurezza. Nessuna approvazione dell'utente è coinvolta: è una
decisione dell'esecutore.

### 4. [Rule 3] `scripts/rls-baseline-container.mjs` contava nove personas

L'intestazione di quel file dichiarava *«seeds nine personas»* e *«seven of eleven
personas are absent on production»*. Le mie modifiche le hanno rese false. Corrette
a dodici e quattordici, con la nota che il divario che quel file esiste per colmare
si è **allargato**, non ridotto. Solo commenti; nessun comportamento cambiato.

## Che cosa non è stato fatto, e va detto

- **Nessuna migration è stata applicata a produzione.** Stesso precedente di
  43-05, 43-06 e 43-07: le migration sono committate e non applicate, e ogni
  osservazione qui è presa sul container.
- **`npm run baseline:rls --target=production` continua a rifiutare** — la
  conseguenza che 43-07 ha dichiarato: `PROBE_PAYLOADS names tables that are not
  RLS-enabled tables of this target: membership_acts`. Questo piano **non l'ha
  indebolita**, e non l'ha nemmeno eseguita: `.env.local` non esiste in questo
  worktree, quindi lo script non avrebbe misurato nulla. Lo dico invece di
  lasciarlo credere eseguito. Da questo piano in poi si aggiunge una seconda
  ragione perché una cattura di produzione non è confrontabile con questa: la
  griglia delle personas ne ha tre che produzione non può risolvere.
- **`npm run verify:capabilities` senza `--target`** (cioè su produzione) resta
  prevedibilmente rosso, per lo stato non deployato. Non misurato, stessa ragione.
- **Nessun test runner esiste** (CLAUDE.md, Guardrail 1) e nessuno è stato
  aggiunto. L'unico gate automatico sul prodotto è `npm run build`.

## Criteri di successo

1. **`staff` è una persona sondata dalla write matrix del container** (D-01) —
   ✅ 14/14 personas risolte, 189 celle di scrittura nuove.
2. **`staff/pending` e `staff/rejected` sono rifiutate dalla regola, nell'harness**
   (D-05) — ✅ `23514` sotto `profiles_role_implies_approved`, 6/6.
3. **`staff` raggiunge esattamente ciò che `member` raggiunge, misurato cella per
   cella** (D-02, D-14) — ✅ uguaglianza esatta sulle coppie `pending` e
   `rejected`; zero celle in cui `staff` supera `member`.
4. **L'aggiunta inderogabile di personas è pagata una volta sola, dichiarata** —
   ✅ 261 difetti, tutti previsti prima della lettura, tutti in quattro classi
   attese. Ogni piano successivo confronta da `43-08`.

## Known Stubs

Nessuno. Nessun valore vuoto codificato, nessun placeholder, nessun componente non
cablato. Le modifiche di questo piano sono tre array, sei commenti e tre artefatti
di evidenza.

## Threat Flags

Nessuna nuova superficie di sicurezza. Questo piano non tocca `src/`, non tocca
`supabase/`, non aggiunge endpoint e non aggiunge dipendenze — modifica soltanto
l'harness di misura e scrive tre artefatti di evidenza. T-43-08-04 (un uuid che
raggiunge un artefatto committato) è stato verificato meccanicamente e non
assunto: `grep -oE '[0-9a-f]{8}-[0-9a-f]{4}-…'` sui tre file nuovi restituisce
**zero** corrispondenze, e lo stesso vale per la forma di un indirizzo. Ci sono
etichette, conteggi, impronte md5 e SQLSTATE.

## Self-Check: PASSED

File dichiarati creati, verificati presenti sul disco:

- `.planning/…/baseline/32-BASELINE-policies.container.43-08.json` — FOUND
- `.planning/…/baseline/32-BASELINE-reads.container.43-08.json` — FOUND
- `.planning/…/baseline/32-BASELINE-writes.container.43-08.json` — FOUND

Commit dichiarati, verificati nel log:

- `0e6d716` — task 1, le tre modifiche all'harness — FOUND
- `f98d7af` — l'attesa scritta prima della cattura — FOUND
- `1996272` — i tre artefatti del punto `43-08` — FOUND

Gate automatici, eseguiti dopo l'ultimo commit di codice:

- `npm run build` → `✓ Compiled successfully in 2.3s`
- `npm run verify:capabilities -- --target=container` → `5/5 green, 0 warnings`
  (`TS 9 · DB 9 · POLICY 5 · SRC 7 · GRANT 20 rows`)
- `npm run baseline:container -- --seed-only --report` → 12/12 celle, exit 0
- `node --check` su tutti e tre gli script modificati → parse OK
