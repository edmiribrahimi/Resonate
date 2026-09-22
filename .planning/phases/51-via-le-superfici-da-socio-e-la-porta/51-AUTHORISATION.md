---
phase: 51-via-le-superfici-da-socio-e-la-porta
document: autorizzazione a scrivere in produzione — la quarta del progetto
written: 2026-09-22
granted: yes
granted_date: 2026-09-22
granted_by: il proprietario
scope: un deploy, due migration nominate per file, una cancellazione senza soggetti, una rilettura
answer: TUTTO
status: ESAURITA
exhausted: "2026-09-22T19:24:05Z"
---

# Autorizzazione a scrivere in produzione — 2026-09-22

`ai-engineering.md`, gate *l'autorizzazione a scrivere in produzione e' un atto,
non un permesso*: **si consuma una volta**, copre esattamente cio' che e' stato
descritto quando e' stata chiesta, e chi la riceve dichiara **quando l'ha usata e
quando l'ha esaurita**.

Le tre autorizzazioni precedenti — le due della fase 49 (**2026-09-06** e
**2026-09-08**) e quella della fase 50 (**2026-09-21**) — sono **ESAURITE**, e lo
dichiarano da se'. La riga finale di `50-AUTHORISATION.md` dice *«da qui in poi
questo documento non autorizza piu' niente»*: una riga «applicata» trovata li'
dentro e' **una ricevuta, non un permesso**. Questa e' la **quarta**.

> **Questo documento e' stato scritto PRIMA che la domanda venisse posta.**
> *«Mi autorizzi ad applicare la fase?»* non e' un perimetro, e' una delega. Qui
> sotto ci sono i nomi dei file, gli identificativi, il numero di commit che il
> push pubblica e **i conteggi presi oggi**, in sola lettura, prima di chiedere
> qualunque cosa.

> **Stato al momento della scrittura: nulla e' stato concesso e nulla e' stato
> speso.** Zero scritture in produzione, zero push, zero deploy. Ogni misura di
> questo documento viene da `POST /v1/projects/{ref}/database/query` con
> `read_only: true`, eseguita come **`supabase_read_only_user`** — riletto, non
> supposto (§3.0).

---

## 1. Il perimetro, e non un byte oltre

Progetto di produzione: **`cjsfocnhfzycbbgkwocx`** — gia' pubblico per
costruzione, viaggia nel bundle del browser dentro `NEXT_PUBLIC_SUPABASE_URL`.
**Il laboratorio non compare in questo documento**, e la ragione e' il Guardrail
5: questo repository e' pubblico.

| # | Passo | Che cosa tocca, alla lettera |
|---|---|---|
| **(a)** | `git push origin main` → **deploy Vercel di produzione** | **82 commit** fra `78f4a81` (dispiegato il 2026-09-21 alle 20:15:09Z) e `98ab62c`, misurati oggi. **109 file**, di cui **67 fuori da `.planning/`**. Nessuna scrittura sul database. Inventario in §1.3 |
| **(b)** | migration `20260922120000_role_attendee_and_capability_keys.sql` | vedi §1.1 |
| **(c)** | `scripts/purge-attendances.mjs` sulle righe di `public.attendances` | **ZERO righe da cancellare**, misurate oggi. Vedi §1.0 — **questo passo non ha soggetti** |
| **(d)** | migration `20260922180000_drop_membership_code_and_rename_acts.sql` | vedi §1.2 |
| **(e)** | la rilettura di controllo, e i due gate che questo atto chiude | vedi §1.4 — e **uno dei due non e' una lettura**, va nominato o resta fuori |

**Fuori perimetro, esplicitamente:** ogni altra scrittura in produzione — righe
seminate, account creati a mano, profili cancellati, cambi di cascata, `GRANT` o
`REVOKE` non contenuti nelle due migration, qualunque campo di `config/auth`,
qualunque ridispiegamento di un commit diverso da `98ab62c`, e **il ripristino
manuale del modello di posta B.2 lasciato aperto dalla fase 50**. Per quelle
serve **un atto nuovo, con la sua data**.

### 1.0 La cancellazione non ha soggetti — e la ragione e' una misura

D-51-04 (decisione del proprietario) cancella le presenze registrate da scansioni
socio. Il piano 51-05 aveva contato il 2026-09-22 alle 13:42:35Z; **il conteggio
e' stato ripreso oggi** alle **18:46:10Z**, con la stessa query, sulla produzione:

```sql
select count(*) filter (where party_id is not null) as da_porta,
       count(*) filter (where party_id is null)     as pre_porta,
       count(*)                                     as totale
from   public.attendances;
```

| Popolazione | Che cosa e' | **Produzione, 18:46:10Z** |
|---|---|---|
| `da_porta` (`party_id IS NOT NULL`) | scritta da una scansione socio — **cio' che D-51-04 autorizza a cancellare** | **0** |
| `pre_porta` (`party_id IS NULL`) | residuo pre-porta — **D-51-04 non la nomina** | **0** |
| **totale** | | **0** |

> # ⚠ Ci sono ZERO righe da cancellare in produzione.
>
> Le due popolazioni che questa fase teneva separate — quella autorizzata e
> quella da riportare al proprietario come **seconda domanda** — **sono entrambe
> vuote**.

Quindi: **nessun `DELETE` su `public.attendances`, nessuna lista di `id`
catturata, nessuna istantanea di righe da prendere, nessun sottoinsieme non
cancellabile da riportare.** E' la stessa forma di `50-AUTHORISATION.md` §1.0:
**una decisione senza soggetti non si esegue**, e il numero si mette **davanti**
alla domanda invece di lasciarlo scoprire a meta' di un runbook. Un'autorizzazione
si consuma una volta: chiederla per cancellare nulla la spende per nulla.

**E il numero non puo' piu' crescere dopo il passo (a).** `51-RESEARCH.md:300`
dice che l'unico scrittore vivo di `attendances` e'
`src/app/api/membership/verify/route.ts:528`. **Quel file e' fra i sette cancellati
dal deploy** (§1.3): dall'istante in cui (a) chiude, nessun percorso del prodotto
puo' scrivere una riga in quella tabella. Lo zero smette di essere una fotografia
e diventa uno stato.

**D-51-14 non decade.** Svuotare non e' togliere: la tabella esiste comunque, con
**5 vincoli, 4 indici e 2 policy** letti oggi alle 18:46:33Z
(`attendances_pkey`, `…_event_id_fkey`, `…_party_id_fkey`, `…_user_id_fkey`,
`…_checked_in_by_fkey`; `attendances_pkey`, `attendances_party_user_unique`,
`attendances_event_user_unique`, `idx_attendances_party`; `attendances_all_admin`,
`attendances_select_own`). Il `DROP` e' dentro la migration (d). Che sia gia'
vuota lo rende **piu' semplice**, non superfluo — e **toglie dal percorso la parte
irreversibile sui dati**.

**La cascata, enumerata dal catalogo vivo alle 18:46:10Z** — non da un documento:

- **Chi pende da `attendances` (`confrelid`): ZERO righe.** Nessuna tabella, in
  nessuno schema, ha una chiave esterna verso `public.attendances`. **La cascata
  in uscita e' vuota.**
- **Da cosa pende lei: quattro chiavi esterne** — verso `events` (`ON DELETE
  CASCADE`), `event_parties` (`ON DELETE CASCADE`), `auth.users` (`ON DELETE
  CASCADE`) e `auth.users` per `checked_in_by` (**senza `ON DELETE`**). Sono
  dipendenze **in entrata su di lei**: toglierla non tocca nessuna delle quattro.

### 1.0-bis Quante righe di dati si cancellano, in tutto

**ZERO.** Nessuna presenza (non ce ne sono), nessun profilo, nessun biglietto,
nessun ordine, nessuna consegna, nessuna riga di registro.

Le **quattro** righe che escono da `private.role_capabilities` con la migration
(b) sono **concessioni per ruolo**, non righe di persone — un catalogo di
permessi. Misurate oggi alle 18:46:33Z: sono le quattro di
**`membership.card.view`**, a `master`, `member`, `organizer`, `staff`.

> **Una correzione, misurata e non ricordata.** `membership.active` ha **zero**
> concessioni in produzione: la fase 50 le aveva gia' cancellate tutte e quattro,
> lasciando **la chiave** inerte in `private.capabilities` e dichiarando il debito
> col nome della fase che lo chiude — questa. Quindi la migration (b) toglie
> **due chiavi** dal catalogo (`membership.active`, `membership.card.view`) e
> **quattro** concessioni, non otto. Chi si aspettasse otto leggerebbe un numero
> che non torna e ne dedurrebbe un guasto.

### 1.1 Migration (b) — `20260922120000_role_attendee_and_capability_keys.sql`

**642 righe, nove sezioni, una transazione sola.** Nessun `BEGIN;` esplicito:
l'endpoint `POST /v1/projects/{ref}/database/migrations` avvolge il corpo da se'
(§4.2). D-51-06 e D-51-07.

| Sezione | Istruzioni |
|---|---|
| **1-2. i due `CHECK` allargati a CINQUE valori** | `profiles_role_check` e `role_capabilities_role_check`. Oggi ammettono `master, organizer, staff, member` — letti dal catalogo alle 18:46:11Z |
| **3-4. le concessioni prima, i profili dopo** | `UPDATE … SET role = 'attendee' WHERE role = 'member'` su `private.role_capabilities` e poi su `public.profiles`. **In produzione tocca 2 profili** e **1 riga** di concessione |
| **5-6. i due `CHECK` stretti a QUATTRO, e il `DEFAULT`** | `master, organizer, staff, attendee`; `profiles.role SET DEFAULT 'attendee'` — oggi il default e' **`'member'::text`** |
| **7. le due funzioni che portano il letterale nel corpo** | `handle_new_user()` (7a) e **`reconcile_master(text)`** (7b), che **gira a ogni deploy** |
| **8-9. il `DO` che rilegge `pg_policies`, poi le due chiavi** | la cancellazione delle chiavi avviene **solo dopo** che un blocco `DO` ha verificato che nessuna policy le nomina; se una la nomina, solleva e la transazione non passa |

**Il trigger che nessun elenco nominava, e che scatta qui.** `public.profiles`
porta **un solo** trigger non interno, riletto oggi alle 18:50:00Z:
**`profiles_release_expired_assignments`**, che sull'`UPDATE` del ruolo scrive su
`public.party_assignments`. Misurato alle 18:46:11Z:

| Misura | Produzione |
|---|---|
| Assegnazioni che il trigger rilascerebbe | **0** |
| Assegnazioni dei profili con ruolo `member` | **0** |
| `party_assignments`, righe totali | **0** |

Il trigger scattera' **due volte** (una per profilo) e **non scrivera' nulla**.
Il numero va **ripreso dopo** la migration, e una differenza da zero va spiegata
riga per riga o e' un errore.

### 1.2 Migration (d) — `20260922180000_drop_membership_code_and_rename_acts.sql`

**932 righe, sette sezioni, una transazione sola.** D-51-02, D-51-08, D-51-14,
D-51-15.

| Sezione | Istruzioni |
|---|---|
| **1-3. lo scrittore e i suoi chiamanti** | `record_membership_act` ridefinito senza leggere `membership_code`; `handle_new_user()` per intero senza il conio; `record_party_assignment_act` e **`reconcile_master(text)`** (3b) |
| **4-5. i due rinomina** | `ALTER FUNCTION … RENAME TO record_account_act`; `membership_acts` → `account_acts`, con i **sette vincoli** e i **tre indici** col prefisso vecchio, rinominati uno per uno — riletti oggi alle 18:46:12Z: **7 e 3**, non 2 e 2 |
| **6. la colonna** | `ALTER TABLE public.profiles DROP COLUMN membership_code` — oggi `text NOT NULL`, **senza default** (18:46:11Z) |
| **7. le presenze** | una guardia `DO` che **rifiuta se la tabella non e' vuota**, poi `DROP TABLE public.attendances` **senza `CASCADE`** |

> **`reconcile_master(text)` e' ridefinita DUE VOLTE, e l'ordine e' il
> meccanismo.** La (b) la riscrive togliendo il letterale `'member'`; la (d) la
> riscrive di nuovo, ripartendo **dal corpo della (b)**. **Invertire i due passi
> resusciterebbe `'member'`** in una funzione che gira a ogni deploy — e lo
> farebbe in silenzio, perche' `role_after` e' `text` senza `CHECK`. L'ordine
> (b) → (d) non e' una preferenza: e' cio' che impedisce a una migration di
> disfare quella precedente.

**La guardia del passo 7 e cio' che significa per l'opzione `senza-cancellazione`.**
Con zero righe in produzione la guardia passa da sola. Se fra oggi e l'atto
qualcuno scrivesse una riga in `attendances` — cosa che dopo il passo (a) **non
e' piu' possibile**, §1.0 — la migration (d) **si fermerebbe li'**, e l'atto
resterebbe a meta' con una finestra aperta.

### 1.3 Che cosa pubblica `git push origin main` — inventario, non fiducia

**Il repository e' PUBBLICO e un push e' irreversibile** (Guardrail 5): un file
spinto resta nei fork, nelle cache dei mirror e nella history anche dopo la
rimozione. Misurato oggi:

| Misura | Valore |
|---|---|
| Commit `78f4a81..98ab62c` | **82** |
| File toccati in tutto | **109** |
| File **fuori** da `.planning/` | **67** — 4 aggiunti, 7 cancellati, 53 modificati, 3 rinominati |
| File sotto `docs/`, `.firecrawl/` o `.env*` nel diff | **0** |
| `npm run verify:persona` | **7/7 verdi**, controllo **F** verde — `docs`, `.firecrawl` e `.claude/settings.local.json` presenti **e ignorati**, zero file tracciati al loro interno |
| Chiavi nel diff (`eyJhbGciOi`, `sbp_…`, `sb_secret_`, `re_…`, `sup_sk_`) | **0 occorrenze**, per ognuna |

**I quattro file aggiunti:** i due file di migration, `scripts/purge-attendances.mjs`
e `src/lib/door/judge-at-scan-time.ts`.

**I sette file cancellati** — ed e' il cuore visibile del deploy:
`src/app/(members)/membership-card/page.tsx` e `loading.tsx`,
`src/components/membership/MembershipCardView.tsx`,
`src/app/(members)/attendance/page.tsx`,
`src/app/api/membership/list/route.ts`,
`src/app/api/membership/verify/route.ts`,
`src/app/(members)/dashboard/DashboardDrinkTokens.tsx`.
**Spariscono la tessera, la pagina delle presenze, il registro dei soci e la
verifica socio alla porta.**

> ## Una cosa che questo push pubblica per la PRIMA volta, e va detta prima
>
> **Il ref del progetto di laboratorio compare 5 volte, in 4 file di
> `.planning/`** — i piani 51-01, 51-05, 51-13 e 51-14. Misurato oggi contro
> `origin/main`: **oggi quel ref non e' ancora pubblicato**. Il push lo
> pubblicherebbe, e la pubblicazione **non si annulla**.
>
> *(Il nome dell'host del laboratorio, invece, e' **gia'** su `origin/main` da
> prima di questa fase — fasi 49 e 50 e `v1.6-LAB-DESIGN.md`. Quello e' gia'
> uscito; il ref no.)*
>
> `.continue-here.md` registra che il proprietario **lo ha accettato per ora**,
> con la decisione se ruotare il progetto di laboratorio lasciata aperta. Si
> riporta qui **come costo del passo (a)**, perche' un'accettazione data prima
> che il numero fosse misurato non e' la stessa cosa di un'accettazione data
> davanti al numero. **Nessuna chiave del laboratorio e' nel diff**, e i due file
> che ne portano una — `.env.lab.local`, `.env.lab.seed.json` — sono coperti da
> `.gitignore:34` (`.env*`), verificato con `git check-ignore`.

**Contro quale codice va la produzione, e perche' conta.** `main` e' a `98ab62c`;
i due commit in testa sono **documentazione soltanto**. Il codice e' quello di
**`44e8c65`** — lo stesso che il **laboratorio serve** e contro cui il
proprietario ha percorso la corsa «dopo» di `P-51-1` il **2026-09-22 fra le
18:09Z e le 18:36Z**, nove passi su nove, su un telefono vero in modalita' aereo
vera. **La produzione riceve codice che ha gia' passato la prova alla porta**,
compreso il correttivo nato durante quella corsa (un rapporto guest dalla coda si
giudica al momento della scansione, come un biglietto).

### 1.4 I due gate rossi contro la produzione, e quale dei due non e' una lettura

- **`verify:capabilities`** — lanciato oggi alle **18:49:45Z** contro la
  produzione (Management API, `read_only`): **FALLITO 3/5**, exit 1. Rosse le
  asserzioni **0** (il catalogo ha **17** chiavi, ne dichiara 15), **1** (le due
  chiavi sono nel database e non in `src/lib/capabilities/keys.ts`) e **5** (un
  ruolo non dichiarato, `member`, tiene una capability). Verdi la 2 e la 3;
  avviso sulla 4. **E' esattamente il rosso che la migration (b) chiude**, ed e'
  scritto qui **prima** che il permesso sia chiesto: *un gate rosso lasciato
  indietro e' un gate che nessuno rilancia*.

- **`verify:refusal` — NON e' stato lanciato oggi, e la ragione va detta invece
  che aggirata.** Lo script e' read-only sulle **tabelle**, ma per misurare un
  rifiuto **conia sessioni sull'identita' di una persona reale** con
  `generateLink` + `verifyOtp`, e le revoca alla fine. Il suo stesso docblock lo
  dichiara: *«minting a session on a real person's identity is an act, and in
  this project an act needs a dated authorisation»*, e per questo
  `scripts/verify-all.mjs` lo tiene sotto `NEEDS_AUTHORISATION` e **non lo lancia
  mai** da solo. Coniare una sessione era **fuori perimetro** nella fase 50, e
  resta fuori qui **a meno che questo documento non la nomini**.

> **Conseguenza operativa sul passo (e), e non e' una formalita'.** Il piano
> 51-13 chiede a `verify:refusal` di essere verde contro la produzione alla fine
> dell'atto. **Quel comando e' un atto, non un controllo.** O l'autorizzazione lo
> nomina — e allora il passo (e) include *«coniare e revocare fino a due sessioni
> su identita' esistenti, senza creare profili, senza stamparne indirizzo ne'
> token»* — **o non si lancia**, e il gate resta rosso con la sua ragione scritta
> invece che con un verde inventato. **La domanda di §5 lo mette sul tavolo.**
>
> Vale la pena sapere anche questo: le sue undici tabelle sono i
> `production_*` del calendario, e **contro il laboratorio non puo' essere verde**
> (D-51-08-B, `deferred-items.md`). La produzione e' l'unico posto dove quella
> misura esiste.

### 1.5 Le due finestre che l'ordine (a)→(d) apre, dichiarate prima

Non sono effetti da scoprire a meta': sono **costi scritti**, su un progetto che
nella finestra **non ha una sola serata futura** (§3.5).

| Finestra | Che cosa e' rotto, alla lettera |
|---|---|
| **fra (a) e (b)** | il codice dispiegato scrive gia' `'attendee'` e il `CHECK` ammette ancora solo `'member'`: **ogni creazione di account riceve `23514`**. E `verify:capabilities` resta **3/5** contro la produzione fino a (b) |
| **fra (a) e (d)** | il codice dispiegato chiama `public.record_account_act` e legge `public.account_acts`, che **non esistono ancora**: `42883` e `42P01`. La creazione di un account fallisce, e **la pagina del registro mostra il proprio stato d'errore** |

Entrambe durano **il tempo fra due passi consecutivi dello stesso atto**. Il verso
opposto — migration prima del deploy — le renderebbe lunghe quanto un deploy, ed
e' il criterio scritto in testa a entrambi i file: *fra due peggioramenti
temporanei si sceglie il piu' corto*.

**Chi non e' toccato da nessuna delle due:** chi compra un biglietto (zero serate
in vendita), chi entra alla porta, chi legge il sito da anonimo.

---

## 2. L'ordine, e il cancello prima di ogni passo

Ogni passo si conferma leggendo **da una fonte diversa** da quella con cui si e'
agito. Una misura presa con lo strumento che ha causato l'effetto e' un'eco.

| # | Passo | Cancello per passare al successivo |
|---|---|---|
| **1** | `git push origin main` | `npm run build` verde su artefatto fresco; controllo **F** verde; zero `docs/`, `.firecrawl/`, `.env*` e zero chiavi nel diff; **nessuna serata nella finestra ieri/oggi/domani**; produzione inerte. Poi il push, e il deploy Vercel in stato **`READY`**, letto dall'API Vercel — **non** dal terminale del push. Poi, da anonimo su `www.resonatemotion.com`: `/events` → 200, `/membership-card` → 404, `/attendance` → 404 |
| **2** | migration (b), con `POST /v1/projects/{ref}/database/migrations` | rilettura **dal catalogo**: i due `CHECK` a quattro valori con `attendee`, il `DEFAULT` a `'attendee'`, profili per ruolo (**2 `attendee`, 0 `member`**), `private.capabilities` **17 → 15**, `role_capabilities` **32 → 28**, `party_assignments` **ancora 0**, la versione coniata in `schema_migrations`. Piu' `npm run verify:capabilities`: **5/5** |
| **3** | (c) la cancellazione | **non ha soggetti** (§1.0). Si lancia comunque `--dry-run`, e **se il numero non e' zero ci si ferma e si riporta**: un numero diverso da quello scritto qui riaccende tutti e sette i passi della rimozione, e nessuno di essi e' stato autorizzato su righe che questo documento non ha contato |
| **4** | migration (d) | rilettura **dal catalogo**: `profiles.membership_code` **assente**, `public.account_acts` **presente** e `public.membership_acts` **assente**, i sette vincoli e i tre indici rinominati, `public.attendances` **inesistente**, le quattro funzioni vive, i privilegi riletti |
| **5** | (e) la rilettura | `reconcile_master` — che gira a ogni deploy — **senza errori**; `npm run verify:capabilities` verde; `verify:refusal` **solo se il perimetro lo nomina**; istantanea ripresa e differenza spiegata riga per riga |

**Se un cancello non risponde come sopra, ci si ferma li'.** In particolare: **se
il passo 1 non chiude, il passo 2 non parte** — con il codice non dispiegato, la
migration (b) aprirebbe la finestra `23514` per tutta la durata del deploy invece
che per il tempo fra due passi, che e' esattamente cio' che l'ordine esiste per
evitare.

---

## 3. I conteggi, presi oggi in sola lettura — 2026-09-22, 18:46:09Z → 18:50:01Z

### 3.0 Zero scritture, e come si verifica

Ogni misura di questa sezione e' una `select` su
`POST /v1/projects/cjsfocnhfzycbbgkwocx/database/query` con `read_only: true` nel
corpo. Lo script che le ha prese **scarta qualunque query che non cominci per
`select` o `with` prima di spedirla**. L'utente che le ha eseguite e'
**`supabase_read_only_user`**, riletto con `current_user` alle 18:46:09Z e non
supposto. *Leggere non ha bisogno di un'autorizzazione datata; scrivere si', e
qui non si e' scritto.*

**Nessun profilo e' nominato**: si contano, non si nominano. Nessun indirizzo,
nessuna persona, nessuna sede, nessuna data non annunciata.

### 3.1 `public.attendances` — le due popolazioni, separate

Vedi §1.0: **`da_porta` 0, `pre_porta` 0, totale 0.** Cascata in uscita **vuota**.
La tabella porta comunque 5 vincoli, 4 indici e 2 policy.

### 3.2 Profili, per ruolo

```
select role, count(*)::int from public.profiles group by role
  → [{"master":1},{"member":2},{"organizer":1}]      totale 4
```

**Quattro profili. Due con ruolo `member`** — sono i due che la migration (b)
rinomina `attendee`. **Zero `attendee` oggi**, zero `staff`.

### 3.3 I due `CHECK`, il `DEFAULT` e la colonna che cade

```
profiles_role_check            CHECK (role = ANY (ARRAY['master','organizer','staff','member']))
role_capabilities_role_check   CHECK (role = ANY (ARRAY['master','organizer','staff','member']))
profiles.role                  text NOT NULL DEFAULT 'member'::text
profiles.membership_code       text NOT NULL, nessun default
```

### 3.4 Il catalogo dei permessi

| Misura | Oggi | Dopo (b) |
|---|---|---|
| `private.capabilities` | **17** chiavi | 15 |
| `private.role_capabilities` | **32** concessioni | 28 |
| chiavi da togliere | **2** (`membership.active`, `membership.card.view`) | — |
| concessioni da togliere | **4**, tutte di `membership.card.view` (`master`, `member`, `organizer`, `staff`) | — |
| concessioni di `membership.active` | **0** — gia' tolte dalla fase 50 | — |

### 3.5 La produzione e' inerte, e non e' un'impressione

```
select ep.date, ep.access_type, (livelli) from public.event_parties
  → 2026-02-07 paid · 2026-02-07 free_rsvp · 2026-05-08 paid
```

**Tre serate, tutte PASSATE.** Oggi e' il **2026-09-22**: **zero serate future,
zero serate nella finestra ieri/oggi/domani, zero serate in vendita.**

| Tabella | Righe |
|---|---|
| `tickets` | **0** |
| `ticket_orders` | **0** |
| `door_scan_events` | **0** |
| `guest_list_entries` | **0** |
| `attendances` | **0** |
| `party_assignments` | **0** |
| `membership_acts` | **2** |
| `event_parties` / `events` | 3 / 2 |

**Nessuna scansione in corso, nessun ordine aperto, nessuna porta aperta.** E'
la condizione in cui le due finestre di §1.5 costano zero a chiunque.

### 3.6 Il registro degli atti

```
membership_acts                        2 righe
vincoli col prefisso membership_acts   7
indici                                 3
to_regclass('public.account_acts')     null      ← non esiste ancora
to_regclass('public.attendances')      attendances
```

**Sette vincoli e tre indici, non due e due**: e' il catalogo che smentisce
l'elenco letto dai file, e la migration (d) li rinomina uno per uno.

### 3.7 L'istantanea, ri-derivata e non ricordata

```
41 tabelle in public · 2397 righe in tutto      (18:46:14Z)
```

**Il numero atteso dopo l'atto: 2397.** Nessuna riga di dati viene creata ne'
cancellata da questo perimetro. `public.attendances` esce dal conteggio delle
**tabelle** — **41 → 40** — portando con se' **zero** righe.
`private.role_capabilities` **non e' in `public`** e non entra in questo totale:
la sua variazione e' **32 → 28**, misurata a parte. **Ogni altra differenza va
spiegata riga per riga o e' un errore.**

### 3.8 Le migration gia' registrate

```
20260921163121  free_order
20260921162827  drop_status_and_referral
20260908111437  20260908120000_guest_list_update_after_profile
```

Le due di questa fase **non ci sono**, come atteso: nessuna e' stata applicata
alla produzione.

### 3.9 Il codice in attesa, e quello dispiegato

**Dispiegato oggi in produzione: `78f4a81`**, deploy `dpl_8CQLLCaKoDuVNnDCDTYT4MsXt4C9`,
`READY` dal **2026-09-21 20:15:09Z** — letto dall'API Vercel, non dedotto.
**In attesa: 82 commit**, fino a `98ab62c`.

---

## 4. Le condizioni, e cio' che lo strumento fa davvero

### 4.1 Le cinque condizioni, le stesse delle tre autorizzazioni precedenti

1. **Istantanea prima**, su ogni tabella raggiungibile per cascata, **enumerata
   leggendo il catalogo e non ricordandola** — §3.7, gia' presa: 41 tabelle,
   2397 righe. **Da riprendere dopo**, e la differenza si spiega riga per riga.
2. **Rilettura dal catalogo dopo ciascuna**, **mai dalla risposta del `POST`**.
3. **Endpoint `POST /v1/projects/{ref}/database/migrations`**, **mai**
   `/database/query`, cosi' la storia delle migration resta veritiera.
4. **Se una fallisce, ci si ferma** e non si prosegue con le successive.
5. **Nessuna cascata nuova.** Nessun `ON DELETE` modificato, nessuna riga
   collegata rimossa «per fare spazio», nessuna pulizia preparatoria.

### 4.2 Le tre proprieta' misurate dello strumento

**(i) La versione registrata NON e' il timestamp del file.** L'endpoint conia la
versione con **l'istante dell'applicazione** — misurato **dieci volte su dieci**
fra le fasi 49 e 50, e altre due sul laboratorio in questa fase. Chi cerchera'
domani `20260922120000` o `20260922180000` in `supabase_migrations.schema_migrations`
**per il numero del file non lo trovera'**. Non manca: e' registrata con l'istante
dell'applicazione, col nome del file senza timestamp.

**(ii) Chi esegue non e' lo stesso per i due endpoint.** `/database/query` gira
come **`supabase_read_only_user`** — riletto oggi, non supposto — e
`/database/migrations` con il ruolo di migrazione, che e' l'unico che puo'
applicare.

**(iii) `CREATE OR REPLACE` su firma identica conserva l'ACL** — verificato sette
volte fra le fasi 49 e 50 leggendo `proacl` byte per byte. **Da rimisurare qui**
sulle funzioni ridefinite dalle due migration: e' un criterio di accettazione,
non una memoria.

### 4.3 La reversibilita', detta come sta

**Questo progetto NON ha PITR** — decisione del proprietario, registrata, non
riaperta qui. Cambia cosa significa sbagliare, e per questo il perimetro conta.

| Passo | Torna indietro? |
|---|---|
| **(a)** il deploy | **si'**, ridispiegando `78f4a81` da Vercel. **Ma il push NO**: `github.com/edmiribrahimi/Resonate` e' pubblico e una pubblicazione non si ritira (§1.3) |
| **(b)** i due `CHECK`, il `DEFAULT`, i due `UPDATE` | **si'**, sono ricostruibili: il valore di partenza e' `'member'` su **2 profili** e **1** riga di concessione, scritto in §3.2 e §3.4 |
| **(b)** le 2 chiavi e le 4 concessioni | **si'**, sono sei `INSERT` ricostruibili da §3.4 |
| **(c)** la cancellazione | **non ha soggetti**: zero righe, quindi zero da recuperare |
| **(d)** `profiles.membership_code` | **NO.** Una colonna cancellata non si ripristina. **E il suo contenuto NON e' scritto qui, di proposito**: sono codici socio di quattro persone reali, e questo repository e' pubblico. Il contenuto e' nel database fino all'istante del `DROP`, e **da quell'istante non esiste piu' da nessuna parte** |
| **(d)** `DROP TABLE public.attendances` | **NO** — ma **zero righe di dati** si perdono. Si perdono la tabella, 5 vincoli, 4 indici e 2 policy, il cui testo e' nelle migration gia' in `supabase/migrations/` |
| **(d)** i rinomina | **si'**, un `RENAME` si rifa' al contrario |

**Nessuna istantanea di backup viene presa prima**, e la ragione e' dichiarata
invece che sottintesa: **nessuna riga di dati viene cancellata**. L'unico
contenuto che si perde davvero e' `profiles.membership_code` su quattro righe, e
non si scrive qui perche' finirebbe su un repository pubblico. **Se il proprietario
lo vuole conservare, va detto PRIMA dell'atto e conservato fuori dal repo** — dopo
il `DROP` non c'e' piu' un posto da cui prenderlo.

---

## 5. La domanda, alla lettera — e le due domande che porta con se'

> «La fase 51 e' pronta e provata sul laboratorio, e il codice che la produzione
> riceverebbe e' **lo stesso** contro cui hai percorso la corsa «dopo» alla porta
> stasera, nove passi su nove. In produzione restano **cinque passi**: il deploy
> di **82 commit**, due migration nominate per file, una cancellazione che **non
> ha soggetti** (`public.attendances` ha **zero righe**, misurate oggi alle
> 18:46:10Z), e una rilettura. Due dei passi sono **irreversibili** e questo
> progetto **non ha PITR**: il `DROP` della colonna del codice socio e il `DROP`
> della tabella delle presenze — quest'ultimo **senza perdere una sola riga**.
> Mentre l'atto e' in corso ci sono **due finestre** in cui creare un account
> fallisce, e durano il tempo fra due passi consecutivi, su un progetto che **non
> ha una sola serata futura**. Mi autorizzi, e per quale perimetro?»

**Un'autorizzazione con una sola strada e' una firma, non una decisione.**

### `tutto` — (a) → (e), nell'ordine, oggi

- **Cosa succede:** push e deploy; migration (b); il `--dry-run` della
  cancellazione, che riportera' zero; migration (d); la rilettura e i gate.
- **Pro:** la produzione si allinea al laboratorio in **un atto solo**; i due
  gate rossi si chiudono; le finestre durano il tempo fra due passi consecutivi.
- **Contro:** le due scritture irreversibili sono spese oggi, e il push pubblica
  per la prima volta il ref del progetto di laboratorio (§1.3).
- **Il rischio e' misurato, non stimato:** zero righe di dati cancellate, zero
  ordini, zero biglietti, zero serate future, quattro profili.

### `senza-cancellazione` — il deploy e le due migration, NON la cancellazione

- **Oggi questa strada e' indistinguibile da `tutto`**, e va detto invece che
  lasciato scoprire: **la cancellazione non ha soggetti**. Non c'e' niente da
  non-cancellare.
- Il contro che il piano scriveva — *«la guardia della migration rifiuta di
  togliere `attendances` se contiene righe»* — **non si applica con zero righe**:
  la guardia passa e la (d) arriva in fondo.
- **Resta una strada solo se il `--dry-run` del passo 3 riportasse un numero
  diverso da zero.** In quel caso e' l'unica strada che si ferma prima di
  cancellare righe che questo documento non ha contato — e a quel punto il passo
  (d) **non e' eseguibile**, e l'atto si chiude a meta' dichiarandolo.

### `solo-deploy` — solo il deploy, le migration un altro giorno

- **Cosa succede:** il codice arriva in produzione senza toccare lo schema.
- **Contro — ed e' il peggiore dei quattro esiti:** le **due finestre di §1.5
  restano APERTE** invece di durare minuti. Fino alla migration, **creare un
  account in produzione fallisce** (`23514`, poi `42883`/`42P01`), e il registro
  degli account mostra il proprio stato d'errore. Entrambi i gate restano rossi.
- **Il push, invece, e' gia' irreversibile** appena avvenuto.

### `niente` — nessuna scrittura

- **Cosa succede:** niente. Nessun push, nessuna migration, nessuna
  cancellazione.
- **Pro:** nessun rischio assunto per conto tuo, e nulla di pubblicato. **E il
  prodotto regge**: la produzione continua a servire `78f4a81`, che e' coerente
  con lo schema che ha.
- **Contro:** la fase resta chiusa sul laboratorio; i due gate restano rossi; la
  corsa «dopo» di `P-51-1` resta percorribile **solo li'**.

**Oppure: un perimetro diverso, descritto a parole.** Va bene, e diventa il
perimetro di questo documento.

---

### La seconda domanda — le righe pre-porta, e perche' si pone lo stesso

Le righe di `public.attendances` con **`party_id IS NULL`** sono un residuo
pre-porta che **D-51-04 non nomina**: la decisione autorizzava a cancellare cio'
che una **scansione socio** ha scritto, e quella popolazione non lo e'. D-51-14
toglie comunque la tabella, quindi una risposta **serve**, perche' senza una
risposta quelle righe uscirebbero dallo schema senza che nessuno abbia deciso.

> **In produzione le righe con `party_id IS NULL` sono ZERO**, misurate oggi alle
> 18:46:10Z. **La domanda si chiude da sola: non c'e' un residuo su cui
> decidere**, e il `DROP` della tabella non porta via nulla che questa domanda
> avrebbe dovuto proteggere.

Si pone lo stesso, e non per formalita': **la risposta va registrata**, perche' il
`--dry-run` del passo 3 rilegge il numero il giorno dell'atto e **un numero
diverso da zero riaprirebbe la domanda a meta' del runbook** — che e' esattamente
il posto in cui non deve essere posta. La risposta attesa e' *«non c'e' niente da
decidere, sono zero»*; se preferisci dichiarare comunque una regola per il caso
in cui non lo fossero, si scrive qui e vale.

### La terza cosa da decidere — `verify:refusal` conia sessioni

Vedi §1.4. **O il perimetro lo nomina** — e allora il passo (e) include *«coniare
e revocare fino a due sessioni su identita' gia' esistenti, senza creare profili,
senza stampare indirizzi ne' token»* — **o non si lancia**, e il gate resta rosso
con la sua ragione scritta. Non c'e' una terza forma: lanciarlo senza nominarlo
sarebbe un passo fuori perimetro eseguito «gia' che ci siamo», che e' la minaccia
**T-51-62** di questo stesso piano.

---

## 5-bis. La risposta, alla lettera — 2026-09-22, ~19:05Z

> **`TUTTO`**

Una parola sola, ed e' la prima delle quattro opzioni di §5: **(a) → (e),
nell'ordine, oggi**. **`granted_by`: il proprietario.** La risposta e' riportata
**letterale** e non riassunta: il frontmatter porta `answer: TUTTO`.

### Le due domande che restavano, e chi ne ha dato la lettura

**Queste due righe non sono parole del proprietario.** Sono la **lettura
dell'orchestratore**, scritta come tale perche' una lettura attribuita a chi non
l'ha detta e' la minaccia **T-51-58** nella sua forma piu' facile.

| Domanda | Lettura dell'orchestratore | Che cosa comporta |
|---|---|---|
| **La seconda** — le righe pre-porta (`party_id IS NULL`) | *«sono zero, niente da decidere»* — il numero e' **0**, misurato alle **18:46:10Z** (§1.0) | La domanda **si chiude da sola**. Nessuna regola per il caso non-zero e' stata dichiarata: se il `--dry-run` del passo 3 riportasse un numero diverso da zero, **ci si ferma e si torna a chiedere**, perche' su quel caso non esiste una risposta |
| **La terza** — `verify:refusal`, che **conia sessioni** | **fuori perimetro**: il proprietario **non lo ha nominato**, e la lettura conservativa e' quella della fase 50 — **non si lancia** | Il gate **resta rosso con la sua ragione scritta** (§1.4), invece che verde per un passo che nessuno ha autorizzato. Lanciarlo sarebbe il *«gia' che ci siamo»* di **T-51-62** |

**`TUTTO` copre i cinque passi di §1 come sono scritti li'**, e §1.4 scrive che
`verify:refusal` e' fuori a meno che il documento non lo nomini. **Questo
documento non lo nomina.**

### Una misura che si e' mossa fra la scrittura e la concessione

§1 riga (a) dice **82 commit fino a `98ab62c`**, misurati prima della domanda.
Fra quella misura e questa concessione il ramo ha guadagnato **due commit di sola
documentazione**: `c8cf7c6`, che e' **questo documento**, e quello che registra
**questa risposta**. Rimisurato alle **18:58Z**:

| Misura | Alla scrittura | Alla concessione |
|---|---|---|
| Commit `78f4a81..main` | 82 | **84** |
| File **fuori** da `.planning/` nel diff | 67 | **67 — invariati** |
| Diff `98ab62c..main` fuori da `.planning/` | — | **0 file** |
| Codice che la produzione riceve | `44e8c65` | **`44e8c65`, lo stesso** |

**La riga (a) del perimetro non viene riscritta**: la smentita sta qui e nel
registro d'uso, mai al posto dell'originale (T-51-58). E cio' che cambia e' il
**numero di commit**, non **cio' che viene dispiegato**: il codice resta quello
contro cui il proprietario ha percorso la corsa «dopo» di `P-51-1`.

---

## 6. Registro d'uso

> **Compilato MENTRE si spendeva, non dopo.** Ogni riga e' stata scritta quando
> il passo era chiuso e riletto, prima di partire col successivo. Il registro
> lungo — con ogni ora, ogni fonte e ogni smentita — e' in **`51-ESITI.md`**,
> capitolo *«L'atto di produzione — 2026-09-22»*.

| # | Passo | Eseguito (UTC) | Versione coniata / valore letto | Riletto da | Esito |
|---|---|---|---|---|---|
| (a) | `git push origin main` + deploy Vercel | **19:11:22Z** → **`READY` 19:13:04.994Z** | `78f4a81..c61760f`, **84 commit**; `dpl_F2pAcyhQfbJPx7sjWNyD7T4XHU53` | **API Vercel**, non dal terminale del push; poi `/events` **200**, `/membership-card` **404**, `/attendance` **404** da anonimo alle 19:13:22Z | **ESEGUITO** |
| (b) | `20260922120000_role_attendee_and_capability_keys` | **19:15:08.774Z** (853 ms) | versione coniata **`20260922191508`** | **catalogo** alle 19:15:55Z e 19:17:08Z — due `CHECK` a quattro valori con `attendee`, `DEFAULT 'attendee'`, **0 `member`** / **2 `attendee`**, `capabilities` **15**, `role_capabilities` **28**, `party_assignments` **0** | **ESEGUITO** — 9 controlli su 9 |
| (c) | `purge-attendances.mjs` | **19:19:13Z → 19:19:15Z** | `--dry-run`, uscita **0** | **due fonti**: Management API **0** e PostgREST con la chiave di servizio **0** | **ESEGUITO, SENZA SOGGETTI** — zero righe, nessun `DELETE`, **lo strumento NON ha consumato il permesso** |
| (d) | `20260922180000_drop_membership_code_and_rename_acts` | **19:20:24.987Z** (685 ms) | versione coniata **`20260922192024`** | **catalogo** alle 19:20:57Z e 19:21:51Z — colonna **assente**, `account_acts` **presente** (2 righe, 7 vincoli, 3 indici, 1 policy, **RLS attiva**), `membership_acts` e `attendances` **inesistenti**, `REVOKE` su `service_role` **intatto**, 4 funzioni vive | **ESEGUITO** — 13 controlli su 13 |
| (e) | la rilettura e i gate | **19:22:58Z → 19:24:05Z** | `verify:capabilities` **5/5 verde, 0 avvisi** contro la produzione | firma di `reconcile_master` letta dal catalogo e confrontata col chiamante; PostgREST: `account_acts` **206/2**, `membership_acts` e `attendances` **404** | **ESEGUITO** — vedi le due note qui sotto |
| — | istantanea, ripresa | **19:21:51Z** | atteso **40** tabelle / **2397** righe; `role_capabilities` **28** | **letto: 40 / 2397 / 28** | **RIPRESA — nessuna differenza da spiegare** |

### Le quattro smentite, che stanno qui e non al posto delle righe originali

**1. Il ref del laboratorio NON si e' pubblicato.** §1.3 lo dichiarava come costo
del passo (a) — *«compare 5 volte, in 4 file di `.planning/`»*. Rimisurato alle
**19:02Z**: **zero occorrenze** nel diff, **zero** nell'albero di lavoro, e
`git log -S` dice che **non e' mai stato nella history**. Cio' che quella misura
aveva contato e' il **nome dell'host**, che era **gia' pubblico** dalle fasi 49 e
50. **Il proprietario ha accettato un costo che non esisteva.** Il verso e'
innocuo; l'errore di misura resta, e va letto prima che qualcuno lo citi come
fatto. §1.3 **non viene riscritta**.

**2. Il push ha pubblicato 84 commit, non 82** — gia' dichiarato in §5-bis prima
dell'atto. **Zero file fuori da `.planning/` nel delta**: il codice dispiegato e'
quello di `44e8c65`, lo stesso contro cui e' stata percorsa la corsa «dopo» di
`P-51-1`.

**3. `verify:refusal` NON e' stato lanciato.** §1.4 e §5 ponevano la scelta come
binaria: **o il perimetro lo nomina, o non si lancia**. **Questo documento non lo
nomina** e il proprietario non lo ha nominato. **Il gate resta rosso con la sua
ragione scritta**, che e' l'esito previsto e non un passo mancato. Per lanciarlo
serve **un atto nuovo, con la sua data**, il cui perimetro sara' *«coniare e
revocare fino a due sessioni su identita' gia' esistenti, senza creare profili,
senza stamparne indirizzo ne' token»*.

**4. Nessun account di prova e' stato creato in produzione**, perche' §1 mette
«account creati a mano» **fuori perimetro**. Al suo posto si e' verificato in
sola lettura che il **chiamante e il catalogo concordino** sulla firma di
`reconcile_master`. E riletto dal codice: quella funzione **non gira a ogni
deploy** — gira al **primo accesso dopo un deploy**
(`src/app/api/auth/callback/route.ts:173`). §1.1 e §2 lo dicevano in forma
abbreviata, e la forma abbreviata fa cercare un'esecuzione che nessuno ha
innescato.

### Cio' che il permesso copriva e non e' stato speso

**Il `DELETE` su `public.attendances`.** Non per scelta e non per prudenza:
**non aveva soggetti**, e lo strumento lo ha confermato da due fonti il giorno
dell'atto. `spent: yes` nel blocco di §8 e' stato messo **a mano**, perche' lo
strumento marca il documento **solo dopo aver cancellato qualcosa** — e non ha
cancellato niente.

---

## 7. Chiusura

# ⚠ ESAURITA — 2026-09-22T19:24:05Z

**Cinque passi su cinque eseguiti, zero falliti.** L'atto e' durato **12 minuti
e 43 secondi**, dalle **19:11:22Z** (il push) alle **19:24:05Z** (l'ultimo gate).

- **Passi eseguiti:** (a), (b), (c), (d), (e).
- **Passi falliti:** **nessuno.**
- **Passi eseguiti ma senza soggetti:** **(c)** — zero righe da cancellare,
  confermate da due fonti.
- **Passi che il perimetro non nominava e che non sono stati eseguiti:**
  `verify:refusal` e la creazione di un account di prova. **Dichiarati, non
  aggirati.**
- **Righe di dati cancellate in produzione: ZERO.** 2397 righe prima, **2397
  dopo**, su **40** tabelle invece di 41.

Le smentite stanno **nella nota d'uso di §6**, non al posto delle righe
originali: **una smentita sta nella nota d'uso, mai al posto della riga
originale** (minaccia T-51-58). Il registro lungo — ogni ora, ogni fonte, ogni
differenza fra atteso e osservato — e' in **`51-ESITI.md`**, capitolo *«L'atto di
produzione — 2026-09-22»*.

> **Da qui in poi questo documento non autorizza piu' niente.** Ogni scrittura in produzione successiva — un'altra
> migration, una riga seminata, un account creato, una sessione coniata, un campo
> di configurazione — avra' bisogno di **un atto nuovo, con la sua data**.
> `ai-engineering.md`: un'autorizzazione si consuma una volta e **non si estende
> da se'**. Un piano successivo che trovasse qui una riga «applicata» e ne
> concludesse di poter scrivere starebbe leggendo **una ricevuta come un
> permesso**.

---

## 8. Il blocco che `scripts/purge-attendances.mjs` legge

Lo strumento **fa rispettare** questa autorizzazione invece di ricordarla: legge
il documento, verifica l'atto, la concessione, la data e il non-esaurimento, e
**lo marca esaurito da solo** dopo l'atto. Rifiuta con uscita **2** se il blocco
manca, se `granted` non e' `yes`, se `spent` non e' `no`, o se `granted_on` non
coincide con la data passata a `--dated`.

**Lanciato alle 19:19:13Z con `--dry-run` contro la produzione, lo strumento ha
letto questo documento e lo ha accettato**: atto, concessione, data e
non-esaurimento, tutti e quattro. Poi ha contato **zero righe su due fonti** ed
e' uscito **0 senza consumare il permesso**, come dichiara lui stesso.

**`spent: yes` e' quindi stato messo A MANO**, alle **19:24:05Z**, e va detto
invece che lasciato dedurre: lo strumento marca il documento **solo dopo aver
cancellato qualcosa**, e qui non ha cancellato niente. **Da adesso rifiutera'
questo documento con uscita 2**, ed e' corretto — il permesso e' speso.

> **Una nota sulla forma, misurata e non dedotta.** Lo strumento cerca i campi con
> `new RegExp("^" + nome + ":", "m")` e prende **la prima occorrenza nel file**.
> Il frontmatter di questo documento sta **sopra** il blocco, quindi un campo
> `granted:` nel frontmatter **oscura** quello del blocco. Provato il 2026-09-22:
> con `granted: 2026-09-22` nel frontmatter, lo strumento legge `2026-09-22` al
> posto di `yes` e **rifiuta un documento che e' concesso**. Per questo il
> frontmatter di questa autorizzazione porta `granted: no` / `granted: yes` —
> **la stessa parola che il blocco usa** — e la data sta in `granted_date`.
> `50-AUTHORISATION.md` scriveva una data in quel campo; li' non importava,
> perche' quella fase non aveva uno strumento che leggesse il proprio permesso.

<!-- purge-attendances: grant -->
act: attendances.purge
target: production
granted: yes
granted_on: 2026-09-22
spent: yes
spent_at: 2026-09-22T19:24:05Z

---

*Scritto il 2026-09-22 dal piano 51-13, task 1, PRIMA che la domanda fosse posta.*
*Conteggi presi in sola lettura fra le 18:46:09Z e le 18:50:01Z, come*
*`supabase_read_only_user`.*

***Concesso** il 2026-09-22 verso le 19:05Z con la risposta letterale `TUTTO`.*
***Speso** fra le 19:11:22Z e le 19:24:05Z, cinque passi su cinque, zero*
*falliti, zero righe di dati cancellate. **Nessuna sessione coniata**, nessun*
*account creato, nessun campo di configurazione toccato.*

***ESAURITA.***
