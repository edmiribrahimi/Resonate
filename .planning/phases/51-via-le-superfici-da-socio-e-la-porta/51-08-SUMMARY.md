---
phase: 51-via-le-superfici-da-socio-e-la-porta
plan: 08
subsystem: access-gating
tags: [ruoli, capability, migration, laboratorio]
requires:
  - "51-05 (51-CATALOG.md) — il catalogo vivo di laboratorio e produzione"
  - "50 (20260921120000_drop_status_and_referral.sql) — la forma della migration e le funzioni vive"
provides:
  - "il valore di ruolo `attendee` accettato e scritto dal database di LABORATORIO"
  - "un catalogo di capability a 15 chiavi e 28 concessioni, su entrambi i lati"
  - "le quattro costanti di verify-capabilities allineate, con la loro riga di storia"
affects:
  - "51-06 — i nove file di codice che scrivono il valore del ruolo"
  - "51-12 — ridefinira' di nuovo reconcile_master e handle_new_user"
  - "51-13 — l'atto che applica questa migration alla produzione"
tech-stack:
  added: []
  patterns:
    - "CHECK allargato a cinque valori, UPDATE, CHECK stretto a quattro — in una transazione sola"
    - "blocco DO che rilegge pg_policies prima di cancellare una chiave di capability"
    - "prova per mutazione su una query viva, con verifica che la mutazione sia stata applicata"
key-files:
  created:
    - supabase/migrations/20260922120000_role_attendee_and_capability_keys.sql
    - .planning/phases/51-via-le-superfici-da-socio-e-la-porta/deferred-items.md
  modified:
    - src/lib/capabilities/keys.ts
    - src/lib/routes/capability-routes.ts
    - scripts/verify-capabilities.mjs
    - scripts/verify-refusal.mjs
    - scripts/rls-baseline.mjs
    - scripts/container/seed.mjs
    - scripts/seed-lab-door.mjs
decisions:
  - "D-51-06 e D-51-07 applicati insieme, in un file solo: i due CHECK e le due chiavi condividono la transazione, quindi o passa tutto o non passa niente"
  - "reconcile_master(text) ridefinita qui, che la ricerca non chiedeva: il catalogo ha trovato il letterale che l'assunzione A5 negava"
  - "l'ordine del piano (CHECK stretto, poi DEFAULT) tenuto invece di quello suggerito dal catalogo: dentro una transazione sola il lock ACCESS EXCLUSIVE chiude la finestra, e la divergenza e' scritta nel file"
metrics:
  duration: "~65 minuti"
  completed: 2026-09-22
---

# Fase 51 Piano 08: `member` diventa `attendee`, due chiavi escono dal catalogo — Riepilogo

Una migration sola, applicata al **solo laboratorio** e riletta dal catalogo:
il ruolo di chi compra si chiama `attendee`, `membership.active` e
`membership.card.view` escono dal catalogo dei permessi, e le quattro costanti,
le due query vive e i due banchi si muovono nello stesso atto — quindi nessun
gate resta rosso senza il nome di chi lo chiude.

## Cosa e' stato fatto

| Task | Cosa | Commit |
|---|---|---|
| 1 | La migration `20260922120000_role_attendee_and_capability_keys.sql` — nove passi, una transazione, zero `BEGIN;` | `a32a9a6` |
| 2 | Applicata al **laboratorio**, riletta dal catalogo. Nessun file cambiato, quindi nessun commit proprio: l'evidenza e' qui sotto | — |
| 3 | Le costanti del gate, le query vive e i banchi | `56e6fd2` |

## Task 2 — le cinque riletture, dal catalogo e non dalla risposta del POST

**Bersaglio: laboratorio. Zero scritture sul progetto di produzione**
(`cjsfocnhfzycbbgkwocx`), dichiarato qui e verificabile: lo strumento usato
rifiuta il ref di produzione come prima riga eseguita, e la produzione la tocca
il piano **51-13** sotto autorizzazione datata.

La risposta del `POST /v1/projects/{ref}/database/migrations` e' stata `[]` alle
**2026-09-22 14:53:19Z**, e non e' stata usata come prova. La prova e' il
catalogo.

**Versione registrata nella history del progetto: `20260922145319`**, nome
`20260922120000_role_attendee_and_capability_keys`, in coda a
`20260921130920 free_order`.

### (a) `pg_get_constraintdef` dei due `CHECK` — letto 14:53:19Z

| Tabella | Vincolo | Prima (13:28:06Z) | Dopo |
|---|---|---|---|
| `public.profiles` | `profiles_role_check` | `master, organizer, staff, member` | `master, organizer, staff, **attendee**` |
| `private.role_capabilities` | `role_capabilities_role_check` | idem | idem |

Quattro valori per entrambi, con `attendee` e **senza** `member`.

### (b) Il `DEFAULT` di `public.profiles.role` — letto 14:53:19Z

`'member'::text` → **`'attendee'::text`**. `is_nullable` resta `NO`.

### (c) Conteggi per valore di ruolo — letto 14:53:19Z

| Tabella | Ruolo | Prima (13:31:26Z) | Dopo |
|---|---|---|---|
| `public.profiles` | `master` | 1 | 1 |
| `public.profiles` | `organizer` | 1 | 1 |
| `public.profiles` | `staff` | 1 | 1 |
| `public.profiles` | `member` | 5 | **0 — la riga non esiste piu'** |
| `public.profiles` | `attendee` | — | **5** |
| `private.role_capabilities` | `master` | 16 | **15** |
| `private.role_capabilities` | `organizer` | 14 | **13** |
| `private.role_capabilities` | `staff` | 1 | **0 — la riga non esiste piu'** |
| `private.role_capabilities` | `member` | 1 | **0 — la riga non esiste piu'** |

**Zero righe con ruolo `member` su entrambe le tabelle.** E il conteggio dice da
solo il fatto della sezione successiva: `staff` e `attendee` spariscono dal
raggruppamento perche' non tengono piu' nulla.

### (d) Le chiavi — letto 14:53:20Z

| Misura | Prima (13:32:05Z) | Dopo |
|---|---|---|
| `private.capabilities` | 17 | **15** |
| `private.role_capabilities` | 32 | **28** |
| Righe di `membership.active` / `membership.card.view` | 2 chiavi, 4 concessioni | **0 e 0** |

### (e) `pg_get_functiondef` delle due funzioni — letto 14:53:20Z

| Funzione | Firma | `prosecdef` | `proconfig` | letterale `'attendee'` | letterale `'member'` |
|---|---|---|---|---|---|
| `handle_new_user` | *(nessun argomento)* | `true` | `search_path=""` | **si** | no |
| `reconcile_master` | `p_email text` | `true` | `search_path=""` | **si** | no |

`SECURITY DEFINER` e `search_path=""` sono **sopravvissuti al `REPLACE`** su
entrambe — il `CREATE OR REPLACE` non li eredita da solo, e sono stati riscritti
esplicitamente nel file.

### Il percorso di scrittura del trigger, misurato invece di assunto

`profiles_release_expired_assignments` e' `BEFORE UPDATE OF role ON
public.profiles`, e chiama `release_expired_assignee_roles`, che **scrive su
`public.party_assignments`**. Il passo 4 della migration lo fa scattare **cinque
volte** sul laboratorio, una per profilo toccato.

| Misura su `public.party_assignments` | Prima (13:38:57Z, `51-CATALOG.md`) | Dopo (14:53:39Z) |
|---|---|---|
| Righe totali | 3 | **3** |
| Righe scadute (`expired_at` non nullo) | 0 | **0** |
| Righe senza `assignee_role` | — | **0** |

**Il trigger e' scattato cinque volte e non ha scritto nulla**, come previsto:
nessun profilo di chi compra ha assegnazioni. Il numero va **ripreso il giorno
dell'atto in produzione** (li' la tabella ha zero righe in totale, misurato
13:39:03Z), non ereditato da qui.

Il conteggio e' stato preso da una **fonte diversa** da quella su cui si e'
agito: la scrittura e' passata dall'endpoint `migrations`, la conferma
dall'endpoint `query` in sola lettura.

## Il fatto che nessun documento della fase aveva, e che il catalogo ha trovato

### `reconcile_master(p_email text)` portava il letterale, e gira a ogni deploy

`51-RESEARCH.md:388` affermava in grassetto che **nessuna** funzione viva
contenesse `'member'` oltre a `handle_new_user`. Il catalogo (§1b, 13:28:46Z) ne
ha trovate **due**: la seconda passa `p_role => 'member'` a
`record_membership_act` per ogni master retrocesso.

Non scrive su `profiles.role` — verificato, zero `update`/`insert`/`delete` nel
corpo spogliato — ma il valore atterra in `public.membership_acts.role_after`,
che e' `text` **senza `CHECK`**. Lasciata com'era, dal giorno dopo il registro
avrebbe inciso `'member'` — un valore che nessun vincolo ammette e che nessun
profilo porta — **a ogni deploy, senza sollevare nulla**. E' la definizione di
fallimento silenzioso di `meta-gates.md`.

### ⚠ La sequenza con il piano 51-12 su `reconcile_master`

**Questa funzione viene ridefinita due volte, e l'ordine non e' indifferente.**

1. **Qui (51-08):** `CREATE OR REPLACE` su firma identica, cambia **solo** il
   letterale del ruolo. Chiama ancora `public.record_membership_act`.
2. **51-12:** la stessa funzione va ridefinita di nuovo, perche' D-51-08 rinomina
   `membership_acts` in `account_acts` e con essa lo scrittore
   (`record_membership_act` → `record_account_act`, D-51-15).

**Se le due si invertissero, quella del 51-12 riporterebbe il letterale
vecchio**: `CREATE OR REPLACE` sostituisce il corpo per intero, non lo fonde. Il
piano 51-12 deve partire dal corpo che questo file ha lasciato — quello con
`p_role => 'attendee'` — e cambiarvi il solo nome dello scrittore. La stessa
avvertenza e' scritta dentro la migration, alla sezione 7b, perche' e' li' che
chi scrivera' la prossima andra' a guardare.

Il registro delle minacce del piano 51-13 (T-51-61) attribuisce la ridefinizione
al solo 51-12: **e' una sequenza a due passi, non a uno**, e questo riepilogo e'
il posto in cui la divergenza e' scritta.

## ⚠ Dopo questa fase, due ruoli hanno zero concessioni

Togliendo `membership.card.view` il catalogo passa da 32 righe a 28, e le quattro
che escono sono **l'intero patrimonio di `attendee` e l'intero patrimonio di
`staff`**: entrambi ne avevano **una sola**, ed era quella. Master resta a 16,
organizer a 14.

- **Per `attendee` e' voluto**: chi compra un biglietto non ha capacita' di
  lavoro (D-51-09).
- **Per `staff` no, e va guardato.** `20260808000500_staff_role.sql:88-94`
  dichiara che il modo di fallire contro cui quel file fu scritto e' *«una
  produzione che ammette un ruolo che non possiede alcuna capacita'»*, e per riga
  di catalogo lo staff e' ora esattamente li'. **Non e' un difetto**: cio' che lo
  fa lavorare alla porta non e' piu' il ruolo ma l'assegnazione alla serata
  (`party_assignments`, `live_assignment_capabilities` in `my_access_context`) —
  la stessa ragione per cui `door.operate` gli e' gia' `REFUSED`.

La riga di storia che il docblock di `EXPECTED_KEY_COUNT` pretende **dice
questo**, non «17 → 15», e la stessa asimmetria e' scritta tre volte: nella
migration, in `verify-capabilities.mjs` dentro il blocco `staff`, e qui.

## Lo stato dei gate

| Gate | Contro il LABORATORIO | Contro la PRODUZIONE | Chi lo chiude |
|---|---|---|---|
| `npm run build` | **exit 0** | — | — |
| `verify:capabilities` | **5/5 verde**, 0 warning — TS 15 · DB 15 · GRANT 28 · 28 concessioni e 32 rifiuti su 4×15 | **ROSSO**: il database porta ancora 17 chiavi e il ruolo `member` | **51-13** |
| `verify:refusal` | **uscita 2** — vedi sotto | **ROSSO**: nessun profilo `attendee` esiste ancora | **51-13** |

### `verify:refusal` esce 2, e il 2 non riguarda il ruolo

Le undici tabelle che quello strumento dichiara sono tutte `production_*`, e sul
laboratorio **dieci hanno zero righe**: il controllo positivo tace, e lo
strumento **rifiuta** invece di riportare un pass — *«su una tabella con zero
righe la risposta dell'abilitato e quella del non abilitato sono identiche»*. E'
l'esito che la sua stessa intestazione chiama onesto.

**La parte che questo piano ha mosso funziona, e la riga misurabile lo dimostra:**

```
attendee    one attendee profile resolved
attendee    session minted
production_pipeline_rule   16   0   0   pair held — entitled reads, unentitled reads nothing
master      signed out globally · token still resolves to a user: false
attendee    signed out globally · token still resolves to a user: false
```

**Provato per mutazione** (`ai-engineering.md`, gate *prova per mutazione*), con
la mutazione verificata applicata via `git diff --stat` **prima** di leggerne
l'esito: rimettendo `.eq("role", "member")` lo strumento muore alla riga 52 con
`FATAL: no attendee profile could be resolved` **prima di misurare qualsiasi
cosa**. Ripristinato, e il ripristino verificato (`grep -c '"role", "member"'` →
0). La query era load-bearing, ed e' il motivo per cui stava in questo piano.

Registrato in `deferred-items.md` (D-51-08-B): quel gate non puo' essere verde
contro il laboratorio senza importarvi il calendario di produzione, che e'
materiale che non si duplica per far passare un controllo.

## Deviazioni dal piano

### 1. `[Rule 2 — funzionalita' critica mancante]` `reconcile_master` ridefinita

- **Trovata in:** Task 1, leggendo `51-CATALOG.md` §1b
- **Problema:** la funzione che gira a ogni deploy avrebbe continuato a incidere
  un valore di ruolo morto in un registro senza `CHECK`, in silenzio
- **Fatto:** ridefinita nella stessa transazione, `CREATE OR REPLACE` su firma
  identica, con `SECURITY DEFINER` e `search_path=''` riportati
- **Commit:** `a32a9a6`

### 2. `[divergenza dichiarata]` L'ordine `DEFAULT` ↔ restringimento del `CHECK`

`51-CATALOG.md` §1d raccomandava di spostare il `DEFAULT` **prima** di stringere
i `CHECK`. Il piano lo mette dopo (passo 6 contro passo 5). **Tenuto l'ordine del
piano**, e la ragione e' scritta dentro la migration: il primo
`ALTER TABLE public.profiles` prende un lock `ACCESS EXCLUSIVE` che tiene fino al
commit, quindi fra il passo 5 e il passo 6 nessun'altra sessione puo' inserire e
la finestra che il catalogo teme non esiste. **Fuori** da una transazione sola
l'ordine del catalogo sarebbe l'unico giusto, e il file lo dice.

### 3. `[Rule 2]` Prosa correttiva nei file toccati

Togliere due chiavi lascia indietro conteggi scritti a parole. Corretti, con la
data e la fase accanto: `keys.ts` (*seventeen* → *fifteen* dove descrive
l'insieme vivo; gli **ordinali di aggiunta non si rinumerano**, ed e' scritto
perche' non lo si faccia), `capability-routes.ts` (i pattern a un segmento, e le
cinque voci `scope: "table"` che diventano quattro), `verify-capabilities.mjs`
(l'ottava mossa dei tre numeri, aggiunta in coda all'elenco invece di riscriverlo).

### 4. `[Rule 3]` Allineamento della tabella di `verify-refusal`

`attendee` e' due caratteri piu' lungo di `member`: la colonna e' passata da
`padStart(7)` a `padStart(8)` **sia nell'intestazione sia nella riga dei dati**.
Cambiarne una sola avrebbe prodotto una tabella disallineata, che si legge come
un numero nella colonna sbagliata.

## Debito differito

`deferred-items.md`, tre voci trovate ma **non riparate**, con la ragione:

- **D-51-08-A** — `rls-baseline.mjs` stampa `measured against: production` anche
  quando l'ambiente punta al laboratorio. Il numero e' giusto, l'etichetta no.
  Rinominare i bersagli tocca il vocabolario di `rls-baseline-compare.mjs`, che
  e' esplicitamente fuori perimetro (D-50-02). Condizione preesistente dal
  2026-09-07.
- **D-51-08-B** — `verify:refusal` non puo' essere verde contro il laboratorio.
- **D-51-08-C** — `src/lib/supabase/middleware.ts:665` nomina `/membership-card`
  e `/attendance` come «nella mappa»: dal piano 51-04 le pagine non esistono e da
  questo la voce e' uscita. **Non toccato**: quel file e' del piano 51-06 in
  questa onda e del 51-10 nell'onda 3, e due agenti sullo stesso file vanno
  sequenziati.

## Perimetro rispettato

- `scripts/rls-baseline-compare.mjs` **non compare nel diff**.
- `src/lib/rbac/roles.ts`, `src/lib/supabase/middleware.ts`, `next.config.ts`,
  `AppNav.tsx`, `ScanFlash.tsx`, `ScannerClient.tsx` e gli altri file dei piani
  51-06 e 51-07 **non toccati**.
- `STATE.md` e `ROADMAP.md` **non toccati**: li scrive l'orchestratore.
- **Nessuna scrittura sul progetto di produzione.** Gli strumenti usati (due
  script monouso, tenuti fuori dal repository nello scratchpad perche' `.planning/`
  e' pubblico) rifiutano il ref di produzione come prima riga eseguita.
- Nessun ref di laboratorio, nessuna chiave e nessun identificativo di persona in
  questo documento ne' nella migration.

## Note per chi viene dopo

- **51-06** scrive `attendee` nei nove file di codice. Contro il laboratorio la
  migration e' gia' applicata: il valore che quel codice scrivera' e' ammesso.
- **51-12** riparte dal corpo di `reconcile_master` lasciato qui. Vedi la sezione
  sulla sequenza.
- **51-13** e' l'atto che chiude i due gate rossi contro la produzione. Il verso
  del deploy e' **codice prima, migration subito dopo**, e la finestra fra i due
  — una creazione di account che riceve `23514` — e' T-51-59, gia' dichiarata nel
  testo dell'autorizzazione.
- Il conteggio di `party_assignments` va **rimisurato il giorno dell'atto**: zero
  oggi non e' zero per sempre.

## Self-Check: PASSED

File dichiarati creati, verificati sul disco:

- `supabase/migrations/20260922120000_role_attendee_and_capability_keys.sql` — FOUND
- `.planning/phases/51-via-le-superfici-da-socio-e-la-porta/deferred-items.md` — FOUND

Commit dichiarati, verificati in `git log`:

- `a32a9a6` — FOUND
- `56e6fd2` — FOUND
