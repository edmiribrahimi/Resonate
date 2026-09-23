---
phase: 51-via-le-superfici-da-socio-e-la-porta
milestone: v1.6
verified: 2026-09-22
status: passed
requirements_total: 4
requirements_closed: 4
requirements_partial: 0
requirements_contradicted: 0
decisions_total: 16
decisions_contradicted: 0
procedure_expectations_contradicted: 1
gates_red: 0
manual_steps_open: 0
lab_cleanup_owed: 0
reopened: 2026-09-23
closed: 2026-09-23
environment: produzione (`c61760f`, due migration applicate il 2026-09-22) + laboratorio permanente (`.planning/v1.6-LAB-DESIGN.md`), dove sono state percorse le due corse della porta
evidence: 51-ESITI.md (due corse di `P-51-1` PERCORSE + l'atto di produzione), 51-AUTHORISATION.md (ESAURITA), 51-CATALOG.md, i quindici SUMMARY, deferred-items.md
---

# Fase 51 — Verifica

> ## Riletto il 2026-09-23 — tre delle quattro cose aperte sono chiuse
>
> Le tre voci che tenevano questo documento a `human_needed` erano **due
> decisioni e un atto**. Il 2026-09-23 il proprietario ha deciso la prima e
> autorizzato il terzo; la seconda resta aperta ed e' l'unica ragione per cui lo
> stato non cambia.
>
> 1. **L'avviso della guest list a radio spenta — DECISO.** Resta acceso per
>    tutta la durata del lavoro offline; cambia la frase, che era falsa («NOT
>    refreshed (updated 3s ago)») e ora dice *«cannot refresh while the radio is
>    off»*. Commit `514c497`, decisione registrata sopra `guestListWarningText`.
>    La riga della tabella dei gate qui sotto e la sezione *La domanda aperta*
>    restano come sono: descrivono la misura del 2026-09-22, e il documento non
>    si riscrive al posto della riga originale.
> 2. **La riga di console del passo 9 — OSSERVATA, su desktop e non su telefono,
>    e la differenza si dichiara.** 2026-09-23, 10:58:36Z: Chrome headless
>    isolato contro il dev server del laboratorio, sessione del master di banco;
>    IndexedDB `resonate-checkin` seminato **a versione 5** con una voce
>    `membership` in `pendingCheckins`, una voce `guest` di controllo in
>    `failedCheckins`, lo store `members` e la chiave `rosterPredatesRole`;
>    aperto `/admin/scanner`. Console: **`checkin-store:v6_dropped_membership_entries
>    {count: 1}`**, tipo `warning`. Riletto lo store dopo: versione **6**,
>    `members` **assente**, `pendingCheckins` **0**, `failedCheckins` **[guest]**
>    (il controllo e' sopravvissuto), `rosterPredatesRole` **null**. Il database
>    e' stato cancellato a fine prova e il profilo del browser era usa e getta.
>    **Cosa NON prova:** che la riga venga scritta da Safari su iPhone — e' lo
>    stesso codice, ma un altro motore di IndexedDB. La riserva di MEM-03 si
>    chiude sul codice, non sul dispositivo.
> 3. **`verify:refusal` — LANCIATO, sotto `51-AUTHORISATION-REFUSAL.md`**
>    (2026-09-23, ESAURITA): 11 righe, **8 con la coppia che regge, 3 RIFIUTATE**
>    perche' le tre tabelle sono vuote e il controllo positivo e' muto; **due
>    sessioni coniate e revocate, revoca riletta**. Uscita 2 per costruzione,
>    che e' l'esito onesto e non un rosso: `gates_red` scende a **2**, i due
>    preesistenti che la fase 52 possiede.
>
> **La pulizia dovuta e' FATTA, con una smentita.** Sul laboratorio, il
> 2026-09-23 alle 10:41:18Z, per chiave primaria dalla lista catturata in sola
> lettura due minuti prima: **19 righe** di `door_scan_events` della
> riproduzione con fotocamera finta cancellate (1 `recorded`/`online` + **18**
> `already_recorded` — non 19 come `51-ESITI.md` diceva: 19 era il totale della
> riproduzione, riletto dal catalogo), e il biglietto «1 di 2» riportato a **non
> scansionato** (`checked_in = false`, ora e operatore a `NULL`). Riletto da una
> **fonte diversa** — PostgREST con la chiave di servizio del laboratorio, non il
> Management API con cui si e' scritto: sulla serata restano **2 righe**,
> entrambe `recorded` / `offline_sync` (quella di `P-50-8` e quella del
> proprietario); `door_scan_events` in tutto **23 → 4**. **La riga di guest list
> `63ebd88f-…` NON C'ERA PIU'**: la lettura del 2026-09-23 alle 10:39:24Z trova
> **una sola** riga in `guest_list_entries`, del 2026-09-21, `ticket_issued`, che
> non e' lei. Chi l'abbia cancellata non risulta da nessun registro di questa
> fase; la cancellazione dovuta **non aveva soggetto** e non e' stata eseguita.
> Gli altri residui dichiarati (l'account di prova della fase 50, l'account
> `@lab.invalid` del piano 51-12) restano, per scelta del proprietario: sono
> evidenza citata dai SUMMARY.
>
> **I due gate rossi ereditati dalla fase 50 — CHIUSI il 2026-09-23** (commit
> di questa data, `npm run verify` → **VERIFY_OK, 24 gate**, era `VERIFY_FAIL —
> 2`). `verify:venue-surfaces` G2: `sumup_checkout_id` e' stato **pesato** —
> riferimento opaco del fornitore, stampato da nessuna parte, nessun luogo — e
> ammesso nell'allow-list positiva insieme al docblock che lo dichiara; non e'
> un allentamento, e' il passaggio che la lista esiste per imporre.
> `verify:touch-targets`: i due `<button>` di `GuestTokenDisplay.tsx` portano
> `min-h-11`, e l'`<a>` di `ticket-order.tsx` e' diventato il `Button` di
> `@react-email/components`, come gli altri link delle mail. **WR-05** ha la
> sua migration di solo `COMMENT`, `20260923120000_role_capabilities_comment.sql`,
> **applicata sul laboratorio** (versione `20260923105525`, commento riletto
> dal catalogo con 15 e 13) **e in produzione** sotto `51-AUTHORISATION-COMMENT.md`
> (ESAURITA): versione `20260923110143` alle 11:01:44Z, commento riletto,
> concessioni 28 prima e dopo.
>
> **Il debito della code review, riletto.** Chiusi il 2026-09-23 con un commit
> ciascuno: **WR-03** (`7c6c859`, il flag di revoca viaggia nella risposta guest
> e il drain lo archivia come `recorded_after_revocation`), **WR-04**
> (`514c497`), **WR-06** (`c730b1d`), **WR-08** e **IN-01** (`778af39`),
> **IN-02..05** (`482c450`), **IN-06** e **IN-07** (dentro `514c497`). **WR-05** e' sopra: migration scritta e applicata sul laboratorio, produzione
> in attesa dell'atto. E la persona: `CLAUDE.md`, `access-gating.md`,
> `checkin-offline.md` e `community-membership.md` non descrivono piu' il codice
> socio come vivo ne' `member` come ruolo (**1.25.0**, `282d809`); la
> ricognizione lessicale completa resta alla fase 57.

> **Cosa significa `human_needed` qui, e cosa NON significa.**
>
> **I quattro requisiti sono chiusi, tutti e quattro con prove eseguite**: due
> corse della porta percorse dal proprietario su un telefono vero in modalita'
> aereo vera, due migration applicate alla produzione e rilette dal catalogo,
> ventidue controlli di catalogo su ventidue, e `verify:capabilities` **5/5
> contro la produzione**.
>
> `human_needed` non riguarda un requisito. Riguarda **due decisioni che
> spettano al proprietario e una che spetta a un atto datato**, e stanno qui
> sopra invece che in fondo:
>
> 1. **L'avviso della guest list si accende appena la radio si spegne.** Dice il
>    vero, ma non e' cio' che il passo 2 di `P-51-1` si aspettava. **Decisione di
>    prodotto, non difetto** — sezione *La domanda aperta*.
> 2. **La riga di console del passo 9 NON e' stata osservata**, perche' nessun
>    Web Inspector era collegato al telefono. Si dichiara invece di dedurla.
> 3. **`verify:refusal` resta ROSSO contro la produzione** e serve **un atto
>    nuovo con la sua data**: conia sessioni su identita' di persone reali, e il
>    perimetro del 2026-09-22 non lo nominava.
>
> **Non esiste un test runner per il prodotto.** Riverificato oggi:
> `package.json` non ha uno script `test` (`grep -c '"test"'` → **0**) e non
> esiste alcun file `*.test.*` o `*.spec.*`. `npm run build` **e'** il typecheck,
> non una prova di comportamento. **Nessuna riga di questo documento dice che
> qualcosa e' verificato perche' una suite e' verde**: ogni riga dice dove sta la
> cosa, e cosa si e' osservato percorrendola.

## Il goal, in una riga, e dove e' stato osservato

*Esce dal prodotto tutto cio' che esisteva perche' c'erano i soci — la card, lo
storico delle presenze, la verifica alla porta per codice socio con il suo
precache e la sua coda — e la rimozione si prova a rete spenta, prima e dopo.*

**Osservato in questa sequenza:** la porta percorsa **prima** della rimozione il
2026-09-22 fra le 14:02Z e le 14:32Z sul commit `03e443e`, con la precondizione
che solo il «prima» poteva produrre; la fase costruita; la **corsa «dopo»**
percorsa fra le **18:09Z e le 18:36Z**, tutti e nove i passi, con un difetto
trovato al passo 7 e **corretto in corsa** (`44e8c65`) invece di essere
arrotondato; poi la produzione, `READY` alle **19:13:04.994Z**, le due migration
alle **19:15:08.774Z** e alle **19:20:24.987Z**, e i gate riletti alle
**19:22:58Z**.

**Dove e' provato cosa — e la distinzione non e' formale.**

| Prova | Laboratorio | Produzione |
|---|---|---|
| Le due migration applicate e rilette dal catalogo | si', 17:45:54Z | **si'**, 19:15:08.774Z e 19:20:24.987Z, 22 controlli su 22 |
| `/membership-card` e `/attendance` a 404 da anonimo | — | **si'**, 19:13:22Z |
| `verify:capabilities` 5/5 | — | **si'**, 19:22:58Z (era 3/5 rosso alle 18:49:45Z) |
| La porta a radio spenta, prima e dopo | **si'** — e **solo li'** | **no, e non deve esserlo** |
| Il drenaggio della coda, l'ammissione guest offline, lo scarto v6 | **si'** | **no** |

**Le prove della porta non sono state fatte in produzione, e non e' una lacuna:
e' la regola.** Le corse scrivono righe — ammissioni, scansioni, ingressi in
guest list — e questo progetto le fa sul laboratorio permanente, mai sulla
produzione (`meta-gates.md`). Cio' che la produzione ha e' **lo stesso
artefatto**: il commit `c61760f` dispiegato alle 19:13:04.994Z contiene
`44e8c65`, che e' il commit su cui la corsa «dopo» ha percorso il passo 7 e il
passo 8.

---

## Requisito per requisito

### MEM-01 — la membership card e' rimossa: superficie, rotta, capability · **CHIUSO**

**La superficie non esiste piu'.** `src/app/(members)/membership-card/page.tsx`,
la sua `loading.tsx` e `src/components/membership/MembershipCardView.tsx` sono
**cancellate** — `git diff --diff-filter=D --name-only 78f4a81..HEAD`, sette file
di prodotto cancellati in tutta la fase. Il gruppo `(members)` contiene **una
sola directory**, `account`: misurato con `ls` oggi.

**La rotta non esiste piu'.** La mappa delle rotte stampata da `npm run build`
(rilanciato oggi, exit 0) non porta `/membership-card`: l'unica occorrenza della
parola nell'intera mappa e' `/api/tickets/attendance`, che e' un'altra cosa. Da
**anonimo, contro la produzione**, `/membership-card` → **404** alle 19:13:22Z.

**Il costruttore del QR della card e' uscito.** `src/utils/qr.ts:32-45` e' oggi
una lapide che descrive la funzione rimossa **senza nominarla**, perche' `src/`
deve contenere **zero** occorrenze di quell'identificatore: un grep sul nome deve
rispondere *«niente lo usa»*, non trovare il necrologio.

**La capability e' uscita da entrambi i lati, nello stesso commit e nella stessa
transazione.**

- **TypeScript:** `src/lib/capabilities/keys.ts:316-371` — **15 chiavi**,
  contate oggi; `membership.active` e `membership.card.view` non ci sono. La riga
  di storia sta accanto, a `:308-310`: *«Diciassette fino al 2026-09-22, quindici
  da allora»*, con gli ordinali **non rinumerati**.
- **Catalogo:** `supabase/migrations/20260922120000_role_attendee_and_capability_keys.sql:632`
  e `:635` — `DELETE FROM private.role_capabilities` e poi
  `DELETE FROM private.capabilities`, in quest'ordine.
- **Riletto dalla PRODUZIONE alle 19:15:55Z:** `private.capabilities` **15**,
  `private.role_capabilities` **28** (`master` 15 + `organizer` 13),
  `membership.active` e `membership.card.view` **assenti entrambe**, **zero
  concessioni al ruolo `member`**.

**E il ruolo di chi compra non si chiama piu' `member`** (D-51-06, che MEM-01
trascina):
`supabase/migrations/20260922120000_role_attendee_and_capability_keys.sql:274` —
`CHECK (role IN ('master', 'organizer', 'staff', 'attendee'))`, lo specchio di
`src/types/database.ts:99` (`UserRole`) e di `src/lib/rbac/roles.ts:117`
(`ATTENDEE: "attendee"`). **Riletto dalla produzione:** `profiles.role` DEFAULT
`'attendee'::text`, profili **2 `attendee`, 1 `master`, 1 `organizer`, zero
`member`**.

**Gate:** `npm run verify:capabilities` **5/5 verde, 0 avvisi, exit 0 contro la
PRODUZIONE**, 19:22:58Z — 15 chiavi su quattro lati, 28 concessioni e 32 rifiuti
misurati **in entrambe le direzioni**. Era **3/5 rosso** alle 18:49:45Z, ed e'
il rosso che la migration esisteva per chiudere.

---

### MEM-02 — lo storico delle presenze e' rimosso · **CHIUSO**

**La superficie:** `src/app/(members)/attendance/page.tsx` **cancellata**; il
suo alias italiano `/presenze` tolto dalla funzione `redirects()` di
`next.config.ts` **nello stesso commit**, perche' un alias verso una pagina che
non esiste e' un 404 con un giro in piu'. Da **anonimo, contro la produzione**,
`/attendance` → **404** alle 19:13:22Z.

**Il blocco che ci portava:** `src/app/(members)/account/page.tsx:625-642` — dove
stava «My Stuff» c'e' il commento che registra cosa e' uscito e perche' il link e
la pagina non potevano uscire in due commit (`typedRoutes` non compila un
`<Link>` verso una pagina cancellata).

**La tabella:**
`supabase/migrations/20260922180000_drop_membership_code_and_rename_acts.sql:932`
— `DROP TABLE IF EXISTS public.attendances`, **senza `CASCADE`**: la cascata in
uscita era stata misurata vuota, e un `CASCADE` avrebbe portato via in silenzio
qualunque cosa fosse comparsa dopo la misura, mentre senza fallisce e la nomina.
**Riletta dalla produzione alle 19:20:57Z:** `to_regclass('public.attendances')`
→ **`null`**.

**Le righe cancellate sono ZERO, ed e' un fatto misurato da due fonti**, non una
rinuncia. `scripts/purge-attendances.mjs`, lanciato in `--dry-run` contro la
produzione con il documento concesso: `party_id` valorizzato **0**, `party_id`
nullo **0**, totale **0** (19:19:13.797Z), e il contatore di controllo da una
**fonte diversa** — PostgREST con la chiave di servizio invece del Management
API — **0** (19:19:15.265Z). `--apply` **non e' stato lanciato** perche' lo
strumento esce prima di qualunque `DELETE` a zero righe, in entrambi i modi:
*«una decisione senza soggetti non si esegue»*.

**Istantanea, prima e dopo:** tabelle in `public` **41 → 40**, righe **2397 →
2397**. **Non una sola riga di dati cancellata in produzione**, e nessuna
differenza da spiegare.

**Il registro degli atti e' sopravvissuto al rinomina** (D-51-08), e con lui la
guardia che conta: `account_acts` esiste con le sue **2 righe**, i **sette**
vincoli e i **tre** indici rinominati, **zero residui** col prefisso vecchio, e
il `REVOKE` intatto — a `service_role` restano `SELECT`, `REFERENCES`, `TRIGGER`,
`TRUNCATE`, `MAINTAIN` e **non** `INSERT`/`UPDATE`/`DELETE`. **La chiave di
servizio non puo' scrivere nel registro se non passando da `record_account_act`**:
e' il gate *chi decide e' tracciato* di `community-membership.md`, e ha
attraversato il rinomina.

---

### MEM-03 — `/api/membership/verify` rimosso, col suo precache e la sua coda · **CHIUSO, con una riserva dichiarata**

**Le due rotte:** `src/app/api/membership/verify/route.ts` e
`src/app/api/membership/list/route.ts` **cancellate**; la directory
`src/app/api/membership` **non esiste piu'** (`ls` → *No such file or
directory*). La seconda credenziale della porta non ha piu' un indirizzo.

**Il precache nel service worker:** `src/app/sw.ts:45-53` — `doorRuntimeCaching`
ha **due** regole, `/api/tickets/attendance` e `/api/tickets/checkin`, entrambe
`NetworkOnly`, **nello stesso ordine di prima**. Le due regole sulle rotte socio
sono uscite con le rotte, nello stesso ciclo di lavoro: una regola di cache che
sopravvive al proprio endpoint e' una riga che nessun gate segnala.

**La coda offline:**

- `src/lib/offline/checkin-store.ts:64` — `const DB_VERSION = 6`.
- `src/lib/offline/checkin-store.ts:128` — `QueuedSubjectType = "ticket" | "guest"`:
  due membri, quindi il drenaggio di `sync-manager.ts` e' **esaustivo su due
  rami** e un terzo non e' piu' scrivibile.
- `src/lib/offline/checkin-store.ts:703-742` — il passo v6 **cancella per
  chiave** solo le voci del tipo rimosso, in una passata, **senza rileggere**
  ticket e guest per riscriverli; poi toglie la chiave `meta` del passo v4 e lo
  store `members`. E chiude con **una riga, una categoria, un conteggio**:
  `console.warn("checkin-store:v6_dropped_membership_entries", { count })` a
  `:739-741` — il vincolo minimo che D-51-11 impone e che `meta-gates.md` chiede
  a ogni percorso silenzioso. **Nessun identificatore di persona nella riga**: la
  chiave di una voce scartata portava un codice socio, e un codice in un log e'
  una credenziale in uno screenshot.
- `src/lib/door/outcome.ts` conserva `'membership'` in `DoorSubjectType` come
  **valore storico da leggere** (D-51-13), e la non-scrivibilita' e' garantita da
  un **secondo** tipo — `QueueableSubjectType` a `checkin-store.ts:353` — non
  dalla prosa.

**Osservato alla porta, passo 9 della corsa «dopo», 18:09Z:** aprendo la porta
sul codice della fase, **nessuna pastiglia «Pending»**. La voce `membership`
lasciata in coda alle **14:32Z** dalla corsa «prima» **non c'e' piu'**:
l'aggiornamento a v6 l'ha scartata. E **nulla di `ticket` o `guest` e' andato
perso** — era l'unica voce in coda, e la coda nuova ha poi accolto e recapitato
**entrambe** le voci dei passi 3 e 5.

> **La riserva, e si scrive invece di essere arrotondata.** **La riga di console
> non e' stata osservata**: nessun Web Inspector era collegato al telefono. La
> pastiglia sparita prova che la voce **non c'e' piu'**; non prova che lo scarto
> sia stato **loggato** con categoria e conteggio. Il codice che la scrive e'
> citato qui sopra con la sua riga; l'**osservazione** su dispositivo manca, ed
> e' una delle due voci `manual_steps_open`.

**Lo scanner non conosce piu' un codice socio** (D-51-01): un `RSN-…` cade nel
rifiuto del codice sconosciuto, senza messaggio dedicato — e la frase di quel
rifiuto non dice piu' «member». Le **tre** occorrenze residue della parola in
`ScannerClient.tsx` (`:196`, `:1838`, `:2310`) sono **prosa che registra la
rimozione**, non codice: verificate una per una oggi.

**E la credenziale stessa non esiste piu':**
`supabase/migrations/20260922180000_drop_membership_code_and_rename_acts.sql:877`
— `ALTER TABLE public.profiles DROP COLUMN IF EXISTS membership_code`. Riletto
dalla produzione alle 19:20:57Z: **0 colonne** con quel nome in
`information_schema.columns`.

---

### MEM-04 — la rimozione e' verificata a rete spenta, prima e dopo · **CHIUSO**

**Due corse, percorse, non dichiarate.** Entrambe dal **proprietario**, sullo
**stesso telefono** (iPhone, Safari in scheda privata), sulla **stessa serata di
prova** del laboratorio, in **modalita' aereo vera** — l'icona dell'aeroplano
nella barra di stato e nessun indicatore di rete, fotografata alle 16:08 e 16:32
nella prima corsa e alle 20:11 e 20:24 nella seconda. **Non era il solo wi-fi
spento**, ed e' una prova propria, non ereditata da un badge che questa stessa
fase stava riscrivendo.

| | Corsa «prima» | **Corsa «dopo»** |
|---|---|---|
| Quando (UTC) | 2026-09-22 14:02–14:32Z | **2026-09-22 18:09–18:36Z** |
| Codice servito | `03e443e` | **`1159700`**, poi **`44e8c65`** dal passo 7 |
| Forma | ridotta (D-51-16): 1, 2, 5, 6 + precondizione del 9 percorsi; 3, 4, 7 e meta' dell'8 **citati da `P-50-8`** (2026-09-21 16:01–16:02Z, **stesso identico artefatto**) | **tutti e nove percorsi** |
| Rilettura dal catalogo | 14:35:11Z | **18:37:28Z** |

**Cosa e' cambiato fra le due, passo per passo — ed e' il senso della procedura:**

| # | «prima» | **«dopo»** |
|---|---|---|
| 3 | biglietto ammesso, ma **col nome dell'intestatario sullo schermo** | **VERDE opaco, «Admitted» / «RSVP · Offline», NESSUN NOME** — D-51-05 onorata, `src/components/scanner/ScanFlash.tsx:193` con `state.bg` fra `bg-green-500`, `bg-sem-done`, `bg-red-600`: **tinte piene, nessuna trasparenza** |
| 4 | seconda lettura non rifiutata, viola | **uguale, e senza nome**: «Already recorded — Recorded at 20:24 by this device · Offline». Il **fatto** — ora e dispositivo — resta leggibile |
| 5 | **schermo ROSSO**, *«Connection error — The guest was not checked in»*, **nessuna voce in coda**: il check-in per nome **non aveva ramo offline** | **VERDE, «Admitted — Guest list · Offline»**, coda a «Pending (2)» — il buco che il piano 51-15 e' esistito per chiudere, misurato aperto e poi misurato chiuso |
| 6 | titolo e pulsante «QR Scan» **uscivano subito** dalla vista | **restano fissi in cima** scorrendo la lista |
| 9 | non percorribile: il codice che scarta non esisteva ancora | **percorso** — nessuna «Pending», la voce `membership` scartata dal passo v6 |

**La rilettura dal catalogo, 18:37:28Z, in sola lettura sul laboratorio** — *e si
dichiara che e' una lettura, non un'osservazione*: la riga di guest list
`63ebd88f-…` risulta **`checked_in`**, `checked_in_at` **18:36:27.331+00**,
`checked_in_by` = l'account di staff del banco (nella corsa «prima» era `invited`
/ `NULL`); per il biglietto del passo 3, **una riga e una sola**, `recorded` /
`offline_sync`, `scanned_at` 18:24:44.964Z → `recorded_at` 18:25:50.235Z — **66
secondi**, che e' la finestra offline misurata invece che stimata.

> **Le 21 righe sulla serata non sono tutte della corsa, e attribuirgliele
> sarebbe l'esito inventato che `T-51-63` esiste per impedire.** Una e' della
> corsa `P-50-8` del 2026-09-21. **Diciannove `already_recorded` piu' un
> `recorded`/`online` sono di una riproduzione con FOTOCAMERA FINTA guidata da
> chi esegue il piano**, fra le 18:20:12Z e le 18:21:29Z, per accertare che lo
> scanner decodificasse il gettone: **ha scritto sul laboratorio**, e ha
> **consumato il biglietto «1 di 2»**. Il proprietario ha percorso i passi 3 e 4
> con il **«2 di 2»**. Una sola riga e' sua, ed e' quella.

#### Il difetto che il passo 7 ha trovato, e che e' la procedura che funziona

Al primo tentativo il biglietto si e' drenato e **l'ammissione guest no**:
pastiglia ambra *«Sign in again to record 1 entry»*, e **un nuovo accesso non
avrebbe cambiato nulla**, perche' non era l'identita' a mancare.
`POST /api/tickets/attendance` respingeva al braccio del ruolo **ogni** rapporto
in coda da un account rifiutato li' — e lo staff tiene la porta **solo per
assegnazione sulla serata**. Riprodotto con una `POST` diretta: **403
`{"error":"Forbidden"}`**. **Non era mai scattato perche' fino al piano 51-15
nessuna voce guest era mai finita in coda.**

**Il correttivo — `44e8c65`.** `judgeAtScanTime` e `ScanTimeJudgement` escono
**byte per byte** dalla rotta del check-in e vivono in
`src/lib/door/judge-at-scan-time.ts:39` e `:106`; la rotta delle presenze li
importa a `src/app/api/tickets/attendance/route.ts:14` e li usa a `:1315`. Una
definizione, due rotte, **la stessa risposta sulla stessa persona nella stessa
serata**. Chi non era assegnato al momento della scansione riceve **lo stesso
403 di prima**: il correttivo non allarga chi puo' far entrare, rende
registrabile **un'ammissione gia' avvenuta alla porta** da chi **era**
autorizzato quando l'ha fatta. E' l'asimmetria di `checkin-offline.md` —
*rifiutare un ospite valido e' peggio che ammetterne uno doppio* — applicata alla
riconciliazione. **Il passo e' stato ripercorso, non dedotto:** 18:36Z, pastiglia
premuta, «Retrying…», **4 / 4 (100%)**, «Everyone has arrived!».

---

## La domanda aperta per il proprietario — l'avviso del passo 2

**Osservato alle 18:11Z, radio spenta.** Il testo e' quello nuovo e parla di
**guest list**, come D-51-10 prescrive:

> *«The guest list on this device was NOT refreshed (updated 2m ago). A guest
> added to the list since then will not be found by name — do not refuse them on
> the strength of this screen; let them in and sort it out in the night's
> review.»*

**Il testo e' vero.** La condizione di accensione, invece, **non e' quella che il
passo 2 si aspettava**: l'avviso e' derivato dall'eta' della lista e si accende
**appena la radio si spegne** —
`src/app/(admin)/admin/scanner/ScannerClient.tsx:2678-2679`:

```
const listIsStale =
  listAgeMs !== null && (!channelLive || listAgeMs > SAFETY_RELOAD_MS);
```

**D-51-10 NON e' contraddetta**, e per questo non compare in
`decisions_contradicted`: la decisione chiede che l'avviso *«si accenda solo
quando e' vero»*, e a radio spenta **e' vero** — la lista non si puo' rinfrescare
e un invitato aggiunto da allora non si trova per nome. A essere smentita e'
**l'attesa del passo 2 della procedura**, che diceva *«non acceso se la lista e'
fresca»*.

**Perche' e' una decisione e non un ritocco.** Le due letture sono entrambe
difendibili: *«a radio spenta l'avviso e' sempre vero, quindi sempre acceso»*
oppure *«un avviso sempre acceso alla porta smette di essere letto, e allora
tanto vale non averlo»* — che e' il gate *zero fallimenti silenziosi* preso dal
verso opposto, l'avviso che non fallisce mai e percio' non informa mai. **La
scelta e' del proprietario** e **non e' chiusa qui**.

---

## Le sedici decisioni, spuntate una per una

| # | Decisione | Onorata da | Evidenza |
|---|---|---|---|
| **D-51-01** | nessun messaggio dedicato per un vecchio QR da socio | 51-02 | `ScannerClient.tsx` non riconosce piu' quella forma: cade in `unknown_code`, la cui frase non dice piu' «member» (51-07) |
| **D-51-02** | il codice socio si cancella: colonna, conio, tipo | 51-10, 51-12, 51-13 | `20260922180000_drop_membership_code_and_rename_acts.sql:877`; **0 colonne** in produzione, 19:20:57Z; `src/types/database.ts` senza il campo |
| **D-51-03** | staff e organizer non scansionano: sono in servizio | — | nessun QR di servizio e' stato introdotto; la porta legge biglietti e guest list, e basta |
| **D-51-04** | le presenze da scansioni socio si CANCELLANO | 51-12, 51-13 | `scripts/purge-attendances.mjs` in `--dry-run` con il documento concesso: **0** righe, da **due fonti**, 19:19:13Z e 19:19:15Z. **Senza soggetti** |
| **D-51-05** | lo schermo mostra solo esito e tipo, nessun nome; opaco; testata ferma | 51-07 | `src/components/scanner/ScanFlash.tsx:25-46` (titolo = esito) e `:193` con tinte piene; **osservato** ai passi 3, 4 e 6 della corsa «dopo» |
| **D-51-06** | `member` diventa `attendee` | 51-08, 51-09, 51-10, 51-13 | `20260922120000_role_attendee_and_capability_keys.sql:274`; `src/types/database.ts:99`; `src/lib/rbac/roles.ts:117`; **zero profili `member`** in produzione |
| **D-51-07** | le due chiavi escono dal catalogo e dalla costante | 51-08, 51-13 | `…_role_attendee_and_capability_keys.sql:632` e `:635`; `src/lib/capabilities/keys.ts:316-371` → **15 chiavi**; catalogo di produzione **15 / 28** |
| **D-51-08** | `membership_acts` → `account_acts` | 51-11, 51-12, 51-13 | `…_drop_membership_code_and_rename_acts.sql:806`; 7 vincoli e 3 indici rinominati, **0 residui**, riletti dalla produzione 19:20:57Z–19:21:51Z |
| **D-51-09** | la pagina mostra SOLO i biglietti, piu' password ed email | 51-06 | `src/app/(members)/account/page.tsx`; il blocco «My Stuff» tolto, `:625-642` |
| **D-51-09b** | vive a `/account`, `/dashboard` resta come 308 | 51-06 | mappa delle rotte del build: **`/account` presente**; `next.config.ts` porta il 308, **nello stesso commit** dello spostamento — senza, il build si ferma su un chiamante della pagina degli artisti con *«Argument of type "/dashboard" is not assignable»*, **misurato** dal piano 51-06. *(Il numero di riga che quel SUMMARY riporta non si ricopia qui: la riga si e' mossa da allora, e una citazione che non regge alla rilettura e' peggio di nessuna citazione.)* |
| **D-51-10** | il download resta, solo per la guest list; l'avviso dice «guest list» e si accende solo quando e' vero | 51-03, 51-07 | rotte socio cancellate; `ScannerClient.tsx:2678-2679` e `:3316-3322`. **Osservato** al passo 2 — con **la domanda aperta** qui sopra |
| **D-51-11** | le voci `membership` in coda si scartano in silenzio, con una riga di log | 51-02 | `src/lib/offline/checkin-store.ts:703-742`, log a `:739-741`. **Osservato** al passo 9 lo scarto; **la riga di console NO** |
| **D-51-12** | la prova MEM-04 la fa il proprietario, telefono vero, lab, prima e dopo | 51-01, questo piano | due corse in `51-ESITI.md`, con ora UTC, ora locale e la barra di stato fotografata |
| **D-51-13** | `'membership'` resta valore STORICO in `door_scan_events` e in `DoorSubjectType` | 51-02 | `src/lib/door/outcome.ts`; la non-scrivibilita' e' un **secondo tipo**, `checkin-store.ts:353`, non un commento |
| **D-51-14** | `public.attendances` si svuota e si toglie | 51-12, 51-13 | `…_drop_membership_code_and_rename_acts.sql:932`, **senza `CASCADE`**; `to_regclass` → `null` in produzione |
| **D-51-15** | `subject_label` porta le prime 8 cifre di `subject_id`; la funzione si ridefinisce nella stessa migration | 51-09, 51-11, 51-12 | `src/types/database.ts:965-972`; `record_account_act` viva e `SECURITY DEFINER` con `search_path=""`, riletta dalla produzione |
| **D-51-16** | la corsa «prima» in forma ridotta, citando `P-50-8` | 51-01 | la condizione e' stata **misurata**, non assunta: nessun dispiegamento del ramo `lab` fra `P-50-8` e la corsa, e **0 file diversi** sul perimetro della porta fra `origin/lab` e `origin/main` |

**Nessuna decisione e' stata contraddotta.** L'unica smentita della fase e'
**un'attesa di procedura** (il passo 2), ed e' dichiarata nella sua sezione
invece che in fondo.

---

## Anti-pattern cercati

Perimetro: i **60 file** di `src/`, `supabase/`, `scripts/` e `.claude/` toccati
dalla fase **che esistono ancora** (sette sono stati cancellati). Comando
eseguito oggi con **`/usr/bin/grep`** — mai `grep` nudo, per il difetto sui file
con byte NUL gia' registrato in memoria.

| Cercato | Trovato | Verdetto |
|---|---|---|
| `TODO`, `FIXME`, `XXX`, `HACK` | **2 righe, nessuna e' un marcatore** | `CLAUDE.md:226` e' **il testo del gate stesso**, che elenca cosa cercare; `src/app/(members)/account/page.tsx:635` e' **prosa al passato** che racconta cosa c'era nella pagina cancellata (*«un `TODO` e un array vuoto costante»*) |
| marcatori **aggiunti** dalla fase | **0** | nessuna delle due righe e' un lavoro rimandato |
| `stub`, `mock` | **1, ed e' il gate** | la stessa riga di `CLAUDE.md:226` |
| `Math.random` su un percorso di credenziale | **0** | l'unica occorrenza in `src/` e' la lapide di `src/utils/qr.ts:48`, che **descrive** il generatore rimosso il 2026-09-05. La voce storica di `.planning/codebase/CONCERNS.md` su questo file **non e' piu' vera** |
| superfici con dati finti (*stub* di UI) | **0** | nessun piano della fase ha aggiunto una superficie: la fase **toglie**. `/account` mostra i biglietti veri |

**Nessun anti-pattern introdotto da questa fase.**

---

## I gate, dichiarati con il loro colore vero

`npm run verify` rilanciato **oggi**, dopo l'ultimo commit di prodotto:

| Gate | Esito | Nota |
|---|---|---|
| `npm run build` | **exit 0** | e' il typecheck, **non** una prova di comportamento. Rilanciato dopo la correzione di `qr.ts` |
| `verify:persona` | **exit 0** | lanciato **dopo** la cancellazione delle rotte e delle superfici, mai prima |
| `verify:capabilities` | **exit 0** — e **5/5 contro la PRODUZIONE** alle 19:22:58Z | era **3/5 rosso** alle 18:49:45Z: il rosso che la migration esisteva per chiudere |
| `verify:routes`, `verify:conversion` | **exit 0** | il secondo si rompe per costruzione se una voce del manifesto punta a un file cancellato |
| `verify:scan-legibility` | **exit 0** | misura le tinte del flash invece di asserirle |
| `verify:mirror-guards`, `verify:no-header-identity`, `verify:no-credit-account`, `verify:media-strip`, `verify:tokens`, `verify:semantic-separation`, `verify:sunset-gradient`, `verify:dialogs`, `verify:tables`, `verify:breakpoints`, `verify:no-viewport-read`, `verify:comment-stripper`, `verify:calendar-surface`, `verify:section-surface`, `verify:section-export`, `verify:ics-reachable`, `verify:ics-grammar` | **exit 0** | 22 gate verdi in tutto |
| `verify:venue-surfaces` | **ROSSO**, `G2` | **PREESISTENTE** — `50-VERIFICATION.md`, stesso rosso. `sumup_checkout_id` letto da `payment/callback/actions.ts` senza aggiornare la lista positiva; **non porta un luogo**. Non riparato di proposito: allentare un'asserzione di `venue-secrecy.md` e' l'unica modifica del repo che non si annulla. **Lo chiude: fase 52** |
| `verify:touch-targets` | **ROSSO**, 3 elementi | **PREESISTENTE** — due `<button>` in `src/app/(public)/events/[slug]/menu/GuestTokenDisplay.tsx:689` e `:702`, un `<a>` in `src/emails/ticket-order.tsx:270`. **Lo chiude: fase 52** |
| **`npm run verify`** | **`VERIFY_FAIL — 2`** | **non e' zero, e non si dichiara verde.** I due rossi sono quelli qui sopra, **entrambi anteriori alla fase 51**, ed erano gia' i due rossi della fase 50. **Nessuna soglia e' stata allargata** |
| `verify:refusal` | **ROSSO contro la produzione, NON LANCIATO** | **conia sessioni sull'identita' di persone reali**. `51-AUTHORISATION.md` §1.4 e §5 ponevano la scelta in forma binaria, il perimetro concesso (`TUTTO`) **non lo nominava**, e lanciarlo sarebbe stato il *«gia' che ci siamo»* che `T-51-62` esiste per impedire. **Lo chiude: un atto nuovo con la sua data**, di perimetro *«coniare e revocare fino a due sessioni su identita' gia' esistenti, senza creare profili, senza stamparne indirizzo ne' token»* |
| `verify:redirects`, `verify:ics` | **non lanciati** | il primo pretende un dev server in esecuzione; il secondo legge il calendario di produzione da `docs/`, che e' `gitignore`d e sta solo sulla macchina del proprietario |

---

## Il debito che questa fase lascia

| Voce | Dove | Chi la chiude |
|---|---|---|
| Le parole «member/membership» nei documenti e nella **persona** | fra le altre, `.claude/rules/checkin-offline.md:52` (cita `BARE_MEMBERSHIP_PATTERN`, che in `src/` ha **zero occorrenze**) e `:54` (*«la porta ha due credenziali»*, e la seconda non esiste piu'; la riga citata, `attendance/route.ts:145`, oggi dice il contrario) | **fase 57** — e vale la pena dirlo: **non e' solo vocabolario**, sono due gate che descrivono un percorso rimosso, ed e' il caso che `meta-gates.md` chiama *una riga che descrive male il prodotto, peggio di una riga assente* |
| L'ordine e le voci della barra per un `attendee` | `src/components/layout/AppNav.tsx`, `src/lib/rbac/roles.ts` | **fase 52**, `NAV-01` / `NAV-02` |
| `ManagementSection` resta sulla pagina dell'account | `src/app/(members)/account/page.tsx` | **fase 52**, `NAV-03` — lasciata in piedi **di proposito** dal piano 51-06 |
| `verify:venue-surfaces` e `verify:touch-targets` rossi | vedi la tabella dei gate | **fase 52** |
| `verify:refusal` rosso contro la produzione | — | **un atto datato**, non una fase |
| `D-51-08-A` — `rls-baseline.mjs` etichetta `production` cio' che legge dal laboratorio | `scripts/rls-baseline.mjs` | **nessuna fase programmata** — condizione dal 2026-09-07, dichiarata in `deferred-items.md`. **Chi incolla quella riga in un VERIFICATION documenta una misura sul progetto sbagliato**, ed e' per questo che nessuna riga di questo documento la incolla |
| `D-51-08-B` — `verify:refusal` non puo' essere verde contro il laboratorio | `scripts/verify-refusal.mjs` | **nessuna: e' la forma giusta.** Renderlo verde significherebbe importare il calendario di produzione nel laboratorio, e quel materiale non si duplica per far passare un gate |
| `D-51-12-A` — `PROBE_PAYLOADS` copre 24 tabelle RLS su 40 | `scripts/rls-baseline.mjs` | **un piano suo** — le 16 mancanti sono **tutte anteriori alla fase 51** |
| `D-51-12-B` — le due prose che nominavano la credenziale della porta | `src/utils/qr.ts:52-58` | **CHIUSA in questo piano** (commit `53309cc`): la lapide parla al passato, con le due ore. `src/types/database.ts:965-972` **resta com'e' ed e' corretta**: descrive cosa portano le **righe storiche** del registro, che e' un fatto e non una promessa |
| Il titolo visibile «Membership acts» sulla pagina del registro | `src/app/(admin)/admin/(work)/members/…` | **fase 57** — e' copy sul nome di una superficie, non un effetto del rinomina degli oggetti |
| `door-and-login-viewport-crops-under-keyboard.md` | la porta e il login si **ritagliano** sotto la tastiera | **fase 52** — visto **percorrendo**, in entrambe le corse |
| `door-tabs-recent-scans-and-alerts.md` | «Recent scans» e gli avvisi vogliono linguette proprie | **fase 52** — **chiesto dal proprietario durante la corsa «dopo»** |
| **Nota per il runbook**, non per una fase | il QR del biglietto (gettone da 101 caratteri, PNG da 280 px mostrato a 200) **non si legge da uno schermo di portatile**. Alla porta sta sul telefono dell'ospite, quindi **non e' un difetto della porta** — ma chi ripercorrera' `P-51-1` da un portatile ci perde venti minuti | `checkin-offline.md`, gate *provato quel giorno, su quel dispositivo* |

---

## La pulizia dovuta alla chiusura di fase — **DOVUTA, non fatta**

Sul **laboratorio** resta la riga di guest list seminata prima della corsa
«prima»: **`63ebd88f-d2a7-4c65-81bf-afca5d52c350`**, «Prova SenzaEmail», oggi
`checked_in`. **Si cancella per quella chiave, mai per corrispondenza sul nome**
(`ai-engineering.md`) — l'id fu catturato **alla creazione** proprio per questo.
**Questo piano non l'ha cancellata**: la cancellazione e' della chiusura di fase,
e dichiararla fatta qui sarebbe la stessa affermazione non osservata che
`T-51-63` esiste per impedire.

Restano sul laboratorio anche, **dichiarati**: l'account di prova della fase 50
con una password di banco impostata dall'API di amministrazione; l'account di
prova `@lab.invalid` con ruolo `attendee` creato dal piano 51-12 come evidenza
che la creazione funziona; e le **19 righe `already_recorded`** piu' il biglietto
«1 di 2» consumato, che sono **della riproduzione con fotocamera finta**, non del
proprietario.

---

## Cio' che nessuna di queste prove puo' dire

- **Che la riga di console dello scarto v6 sia stata scritta.** Non e' stata
  osservata. Il codice che la scrive e' citato; l'osservazione manca.
- **Che la porta si comporti cosi' su un telefono diverso.** Le due corse sono
  state percorse su **uno** — lo stesso, di proposito, perche' MEM-04 chiede il
  confronto prima/dopo sullo stesso dispositivo. Un altro modello, un'altra
  versione di Safari e un altro service worker installato sono un'altra misura.
- **Che la porta si comporti cosi' in produzione.** La produzione serve **lo
  stesso artefatto** (`c61760f` contiene `44e8c65`), e su di esso **nessuno ha
  scansionato**: la produzione ha **zero serate future, zero biglietti, zero
  ordini, zero scansioni e zero assegnazioni**, misurati alle 19:09:25Z.
- **Che `verify:refusal` passerebbe.** Non e' stato lanciato, e un gate non
  lanciato non e' un gate verde.
- **Nulla, per costruzione, sulla correttezza della persona.**
  `verify:persona` verifica la **coerenza** fra indice, frontmatter e albero:
  *«un verde non dice che un gate e' giusto, dice che i file concordano fra
  loro»* — ed e' esattamente perche' un verde non lo dice che le due righe stantie
  di `checkin-offline.md` sono sopravvissute a sette controlli su sette.

## Il conto delle scritture in produzione

Sotto **una sola autorizzazione datata** (`51-AUTHORISATION.md`, concessa il
2026-09-22 con la risposta letterale `TUTTO`, dichiarata **ESAURITA** alle
19:24:05Z e il cui esaurimento e' stato **provato** rilanciando lo strumento e
mostrando il rifiuto con uscita 2): **un deploy** e **due migration**, applicate
da `POST /v1/projects/{ref}/database/migrations` — mai `/database/query` — in una
transazione ciascuna. Ogni lettura di controllo con `read_only: true`.

**Righe di dati cancellate: ZERO.** Istantanea prima e dopo: tabelle **41 → 40**
(esce `attendances`, vuota), righe **2397 → 2397**, concessioni **32 → 28**
(−4, su un **catalogo di permessi**, non su dati). **Non c'e' una sola riga non
spiegata.** Durata dell'atto: **12 minuti e 43 secondi**. Le due finestre di
incompatibilita' dichiarate in anticipo sono durate **2 minuti e 4 secondi** e
**7 minuti e 20 secondi**, su un progetto inerte: **sono costate zero a
chiunque**.

---

## Stato, per requisito

| Requisito | Stato | Cosa resta |
|---|---|---|
| **MEM-01** | **CHIUSO** | nulla |
| **MEM-02** | **CHIUSO** | nulla |
| **MEM-03** | **CHIUSO**, con una riserva | la **riga di console** del passo 9 non e' stata osservata |
| **MEM-04** | **CHIUSO** | nulla — due corse percorse, con il difetto del passo 7 trovato, corretto e **ripercorso** |

**Stato di fase: `human_needed`** — e non per un requisito, ma per **due
decisioni e un atto**: la condizione di accensione dell'avviso della guest list
(del proprietario), l'osservazione della riga di console (di chi tornera' alla
porta con un Web Inspector), e `verify:refusal` (di un atto nuovo con la sua
data).
