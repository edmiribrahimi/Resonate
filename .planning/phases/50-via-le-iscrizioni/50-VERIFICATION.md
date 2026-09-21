---
phase: 50-via-le-iscrizioni
milestone: v1.6
verified: 2026-09-21
status: passed
requirements_total: 6
requirements_closed: 6
requirements_partial: 0
requirements_contradicted: 0
decisions_contradicted: 1
gates_red: 2
manual_steps_open: 1
environment: laboratorio permanente (`.planning/v1.6-LAB-DESIGN.md`) + produzione, sotto la terza autorizzazione datata
evidence: 50-ESITI.md (otto procedure percorse), 50-AUTHORISATION.md (terza autorizzazione, ESAURITA), 50-RUNBOOK.md, 50-02/05/09/11-SUMMARY.md
---

# Fase 50 — Verifica

> **Cosa significa `passed` qui, e cosa NON significa.**
>
> Sei requisiti su sei sono chiusi da **prove eseguite**: otto procedure
> percorse, le tre query di catalogo lette su **entrambi** i database, il signup
> spento e poi **esercitato dall'esterno con la chiave anonima**, e la porta
> percorsa dal proprietario su un telefono in modalita' aereo vera.
>
> `passed` **non** significa che la fase non lascia niente aperto. Lascia tre
> cose, e stanno tutte scritte qui sotto invece che in fondo: **una decisione
> contraddetta** (`D-50-18b` — lo schermo della porta mostra il nome
> dell'acquirente, ed e' del proprietario la decisione di toglierlo nella
> fase 51), **due gate rossi preesistenti** e **un passo manuale cosmetico**.
>
> **Non esiste un test runner per il prodotto.** `package.json` non ha script
> `test` e non esiste alcun file `*.test.*` o `*.spec.*` — riverificato il
> 2026-09-21. `npm run build` e' il typecheck, non una prova di comportamento.
> Nessuna riga di questo documento dice che qualcosa e' verificato perche' una
> suite e' verde: ogni riga dice **dove sta** la cosa e **cosa si e' osservato**
> percorrendola.

## Il goal, in una riga, e se e' stato osservato

*Nessuno si iscrive piu' da solo. Entra chi compra, chi prenota un posto
gratuito, chi e' invitato da guest list — e chi lavora, con un account creato
dentro l'app. Lo stato non esiste piu' come asse.*

**Osservato per intero il 2026-09-21**, in questa sequenza: `/register` a 404 su
quattro soggetti (`P-50-1`), la colonna caduta in laboratorio (`P-50-2`) e poi in
produzione (50-11), il signup spento e **rifiutato dall'esterno con la chiave
anonima su entrambi i progetti** (`P-50-5`, 50-11 passo (d)), i quattro percorsi
di servizio che creano ancora account a signup spento (`P-50-6`, cinque
creazioni), una prenotazione gratuita che diventa due biglietti con una mail e un
account leggero (`P-50-7`), e **uno di quei biglietti passato alla porta con la
radio spenta** (`P-50-8`, dal proprietario, su un telefono vero).

---

## Requisito per requisito

### REG-01 — l'iscrizione non ha piu' superfici · **CHIUSO**

- **La rotta non esiste piu':** `src/app/(auth)/register/page.tsx` **cancellata**
  (`git diff --diff-filter=D`, 16 file in tutta la fase). `src/app/page.tsx:1`
  e' ridotto a un `redirect("/events")`, e il suo docblock (`:9-31`) registra
  che il pulsante `Join` portava li'.
- **Il rimando in cache e' stato tolto:** `/usr/bin/grep -c 'registrati'
  next.config.ts` → **0**. `public/manifest.json:5` →
  `"start_url": "/events"`.
- **Nessun percorso applicativo crea piu' un account da solo:**
  `/usr/bin/grep -rn 'auth\.signUp' src` → **0 occorrenze**, misurato oggi.
- **Le occorrenze residue di `/register` in `src/` sono due classi, e nessuna e'
  la rotta pubblica:** `src/lib/routes/capability-routes.ts:375` e
  `src/app/(admin)/admin/(work)/members/page.tsx:198` sono
  **`/admin/members/register`**, la pagina con cui un master crea un account
  dentro l'app — che questa fase **conserva di proposito**; le altre sono prosa
  in docblock (`src/components/ui/PageShell.tsx:24`,
  `src/app/(auth)/set-password/SetPasswordForm.tsx:145`).
- **Osservato — `P-50-1`, quattro soggetti invece di tre** (`50-ESITI.md:195`):
  anonimo, `member` leggero, organizer e master, tutti e quattro **404** su
  `/register`; `/` → **307 verso `/events` anche per chi e' loggato**, misurato
  sia con `curl` (`location: /events`) sia dal browser; `/login` con **zero
  elementi `<a>`** e testo finale *«Sign In · Access your member area · Sign In ·
  Bought a ticket? Use the link in your email»*; il dialogo della sede segreta da
  anonimo con **due soli pulsanti** e **nessun indirizzo**.
- **Il passo 1.3 non e' stato percorso come scritto, e la sostituzione e'
  dichiarata** (`50-ESITI.md:226-250`). Serviva un profilo di browser che avesse
  gia' seguito `/registrati` quando era un **308 permanente**: quella finestra si
  e' chiusa alle 15:10:11Z, prima che il piano cominciasse. E' stato misurato un
  surrogato sulla **stessa origine**, con il log del server: in fase 2 il browser
  **non ha chiesto `/registrati`**, ha applicato il rimando in cache ed e' finito
  su `/register` → **404**. Le due strade convergono e la cache non riapre
  niente. **Cosa il surrogato non prova:** che il browser di un'altra persona si
  comporti allo stesso modo. Il passo resta da percorrere su un profilo reale se
  se ne trovera' uno.
- **Il passo 1.11 e' meta' misurato:** `GET /manifest.json` →
  `start_url = /events`; l'**installazione della PWA** non e' stata esercitata,
  perche' pretende un dispositivo — e il salto che il passo vuole escludere e'
  quello che `/` farebbe, gia' chiuso in 1.4.
- **Gate:** `npm run verify:routes` e `npm run verify:conversion` **exit 0** in
  produzione (50-11, sezione Gate). Il secondo si rompe per costruzione se
  `/register` resta nel manifesto (`scripts/conversion-manifest.mjs`).

### REG-02 — nessun oggetto e nessun sorgente nomina piu' `profiles.status` · **CHIUSO**

- **La migration:**
  `supabase/migrations/20260921120000_drop_status_and_referral.sql:1010` —
  `ALTER TABLE public.profiles DROP COLUMN IF EXISTS status`, nella stessa
  transazione della ridefinizione di `handle_new_user` (`:39`) e del drop di
  `private.role_capabilities.requires_approved` (`:996`).
- **Le tre query di catalogo, sul LABORATORIO** (50-09-SUMMARY.md:249-281,
  eseguite in sola lettura da uno script che **rifiuta il riferimento di
  produzione come prima riga eseguita**, `target_is_prod_ref=NO`):

  ```
  (1)  la colonna profiles.status                                    → [{"n":0}]
  (1b) le tre colonne dell'asse e del referral                       → [{"n":0}]
  (2)  funzioni il cui CODICE (commenti spogliati) nomina status     → [{"fn":[]}]
  (2b) controprova p.status / profiles.status nel codice spogliato   → [{"fn":[]}]
  (3)  policy che nominano get_user_status o requires_approved       → [{"p":[]}]
  (3b) policy che nominano profiles E status (ogni schema)           → [{"p":[]}]
  (4)  la funzione get_user_status esiste ancora?                    → [{"n":0}]
  (5)  role_capabilities.requires_approved esiste ancora?            → [{"n":0}]
  ```

- **Le stesse query, sulla PRODUZIONE** (50-11-SUMMARY.md:200-212, dopo la
  migration `20260921162827`):

  ```
  q1 · colonna public.profiles.status                → 0
  q2 · funzioni che nominano profiles E status       → 3
  q3 · policy con get_user_status|requires_approved  → 0
  q3bis · policy con profiles E status               → 0  (nessuna)
  ```

  **Il `3` di q2 sono tre falsi positivi, dichiarati invece che arrotondati:**
  `public.venue_for_parties(uuid[])`, `public.my_access_context()` e
  `public.my_access_context(uuid)`, dove il riscontro cade **dentro un commento
  SQL** (*«La chiave 'status' STAVA QUI. Fase 50»*). Riferimenti veri a
  `profiles.status`: **0, 0, 0**. Stesso esito gia' misurato in laboratorio dal
  piano 50-02.
- **Due correzioni alle query, e vanno dette o il verde e' inventato:** la forma
  di §1.5(a) **non gira** su questo database — `oid::regprocedure` solleva
  `42809` sulle funzioni di aggregazione — ed e' stata eseguita con
  `prokind = 'f'` e `pg_get_function_identity_arguments`. Sulle policy, la forma
  originale cercava due nomi di funzione ed era **gia' cieca prima della
  migration**: le quattro policy di `storage.objects` interrogavano
  `public.profiles` direttamente. La forma `profiles` **e** `status` ne trovava
  **cinque prima** e **zero adesso**.
- **La rilettura d'oggetto, dalla produzione** (50-11-SUMMARY.md:177-190):
  `profiles.status`/`.referred_by`/`.approved_via` **0 su 3 presenti**;
  `public.get_user_status()` **assente da `pg_proc`**; `CHECK` su `profiles`
  **solo `profiles_role_check`**; `event_media_insert_member`,
  `rsvps_insert_approved`, `event_media_quarantine_insert_approved` **via tutte
  e tre**; le sei policy nuove **presenti**.
- **Le quattro mail dello stato sono cancellate:** `src/emails/member-approved.tsx`,
  `member-rejected.tsx`, `member-reactivated.tsx`, `registration-confirmation.tsx`
  (piu' `src/emails/templates/registration-confirmation.html` e
  `rsvp-confirmation.tsx`) — assenti dal disco, verificato oggi.
  `src/lib/email-delivery/categories.ts:119-124` tiene le tre **categorie** nel
  `CHECK` e dichiara accanto a ciascuna *«Nessun mittente dal 2026-09-21»*: le
  righe storiche non si cancellano, ed e' la terza strada che §7.4 della ricerca
  esclude per nome.
- **Il webhook non nomina piu' lo stato:**
  `src/app/api/webhooks/sumup/route.ts:480` conserva **una** riga di prosa che
  ricorda l'`approved_via` smontato, dentro un commento. Nessun ramo.
- **Gate:** `npm run verify:capabilities` **rosso prima della migration → 5/5
  verde dopo** (50-11): e' il rosso che la migration esisteva per chiudere.
  `npm run verify:no-header-identity` **exit 0**.

### REG-03 — referral e `approved_via` non esistono piu' · **CHIUSO**

- **Dal catalogo di produzione:** `referred_by` e `approved_via` fra le *«0 su 3
  presenti»* di 50-11-SUMMARY.md:177. Drop in
  `20260921120000_drop_status_and_referral.sql:1011-1012`.
- **Dai file, misurato oggi:** `/usr/bin/grep -rn 'referred_by' src` → **0
  occorrenze**. `approved_via` → **2**, entrambe **dentro commenti**
  (`src/app/api/webhooks/sumup/route.ts:480`,
  `src/lib/guest-list/process-entry.ts:176`), nessun ramo e nessuna `select`.
- **Le superfici sono cancellate:** `src/components/membership/CopyReferralLink.tsx`,
  `src/app/(admin)/admin/(work)/members/growth/page.tsx` (e il suo
  `loading.tsx`), `src/components/analytics/MemberGrowthChart.tsx`,
  `src/components/analytics/GrowthSummaryCard.tsx`,
  `src/lib/analytics/member-queries.ts` — tutti nei 16 file cancellati dalla
  fase.
- **`membership_code` RESTA, e non era referral.** E' la credenziale della porta:
  il trigger la conia da `extensions.gen_random_bytes` (2^50, dal 2026-09-05) e
  la porta la accetta (`src/app/api/tickets/attendance/route.ts:145`). La toglie
  la **fase 51**. Nominarla qui serve perche' chi grepasse «referral» e trovasse
  un codice concluderebbe che ne e' sopravvissuto uno.
- **Osservato:** `P-50-6` passi 6.2 e 6.5 — codici `RSN-` lunghi **14**, coniati
  a signup spento.

### REG-04 — entra solo chi il prodotto ammette · **CHIUSO**

- **Il confine, chiuso dove il prodotto non poteva chiuderlo.** La pagina
  cancellata dimostra che il **prodotto** non offre piu' quel percorso; non
  dimostra niente sull'API, e **la chiave anonima viaggia nel bundle del
  browser: e' pubblica per costruzione.**
- **Osservato in PRODUZIONE — `P-50-5` applicato, 50-11-SUMMARY.md:286-300:**

  ```
  16:32:43Z  GET   config/auth                            → disable_signup: false
  16:32:58Z  PATCH config/auth {"disable_signup": true}   → HTTP 200
  16:32:59Z  GET   config/auth  (seconda, INDIPENDENTE)   → disable_signup: TRUE
  16:33:21Z  POST  /auth/v1/signup   (chiave ANONIMA)     → HTTP 422
             {"code":422,"error_code":"signup_disabled",
              "msg":"Signups not allowed for this instance"}
  ```

  **La risposta del `PATCH` diceva `true` e non conta: e' un'eco.** Vale la
  seconda `GET`, indipendente, come l'autorizzazione pretendeva.
- **Osservato in LABORATORIO — `P-50-5`** (`50-ESITI.md:326-370`): stesso `422`
  alle 15:16:55Z, e **su due domini**. Con il signup spento **anche un indirizzo
  che GoTrue considera malformato riceve `signup_disabled`**: il cancello sta
  **prima** della validazione dell'indirizzo, che sta prima dell'invio della
  mail — quindi il `429 over_email_send_rate_limit` del passo 5.1 era arrivato
  **oltre** il cancello, che a quel momento era dunque aperto. E' la misura di
  controllo che rende il passo conclusivo benche' nessun account sia nato.
- **`A1` e' CONFERMATA sul campo** (`50-ESITI.md:391-410`). Era l'assunzione da
  cui dipendeva tutta la fase: *«`DisableSignup` non compare in `admin.go`»*,
  letta dal **sorgente** di GoTrue, non dalla versione dispiegata. Se fosse stata
  falsa, spegnere il signup avrebbe spento **l'acquisto da ospite**.
  **Cinque creazioni di account, su quattro percorsi diversi, tutte con il signup
  spento, tutte riuscite, nessuna oltre i sei secondi:**

  | Percorso | Esito | Evidenza |
  |---|---|---|
  | `auth.admin.createUser` nudo, chiave di servizio | HTTP 200 in 0,382 s | `P-50-6` passo 0 |
  | `createAccount` dalla pagina membri, master | account + profilo `organizer`, ~6,2 s mail compresa | `src/app/(admin)/admin/members/actions.ts:2396` |
  | acquisto/prenotazione da ospite | identita' leggera, `role = member`, 2,73 s all'invio | `src/lib/tickets/guest-identity.ts:248` |
  | voce di guest list | `auth.users` 6 → 7, `guest_list_entries.status = 'ticket_issued'` | `src/lib/guest-list/process-entry.ts:236` |

- **Una misura in piu':** la versione di GoTrue dispiegata in **produzione** e'
  **v2.197.0** (50-11), letta invece che dedotta. Quella del **laboratorio**
  resta ignota — dichiarato, non taciuto.

### REG-05 — la lista del debito e' VUOTA · **CHIUSO A ZERO**

**D-50-04 pretende che non sopravviva alcun cancello su `status`, e che il
VERIFICATION lo dichiari con il grep che lo prova.** La prova autorevole e' il
catalogo, e sta sopra in REG-02: **zero colonne, zero funzioni, zero policy,
zero concessioni**, su laboratorio **e** su produzione.

**Il grep sui file, con il suo perimetro scritto ACCANTO al comando** — e non
altrove, che e' il punto (`T-50-62`):

```bash
/usr/bin/grep -rnE "get_user_status|requires_approved|UserStatus|STATUSES|isPendingOrRejected" \
  src/ supabase/migrations/ scripts/ \
  | /usr/bin/grep -v "^supabase/migrations/"   # le migration storiche restano: sono storia
```

**Il perimetro, per esteso, e le tre ragioni per cui non e' un allentamento:**

1. **Le migration storiche non si riscrivono.** Sono il verbale di cio' che e'
   successo. Un `DROP COLUMN` non rende falsa la migration che quella colonna
   l'aveva creata.
2. **Il comando cerca cinque simboli, non la parola `status`.** `status` resta
   il nome di una colonna su **otto tabelle** che sopravvivono — ordini,
   biglietti, voci di guest list, consegne di posta — e cercare la parola
   restituirebbe centinaia di righe che non c'entrano.
3. **`membership_acts.status_before` / `status_after` restano, e sono prova.**
   Il registro ricorda quali stati furono assegnati quando esistevano.

**La misura, e la riga che NON e' zero** (50-09-SUMMARY.md:313-357):

| Forma | Risultato |
|---|---|
| **dichiarazioni, identificatori, rami** in `src/` — grep a commenti spogliati, 311 file percorsi | **4** |
| **prosa** in `src/` — commenti | **50 occorrenze in 24 file** |

Le **quattro** occorrenze «nel codice» sono tutte dentro **stringhe di
descrizione** del catalogo delle capability
(`src/lib/capabilities/keys.ts:421-428`), cioe' prosa-come-dato. **Zero
dichiarazioni, zero letture, zero rami.** Lo spoglio dei commenti prima di
contare e' il precedente che questo repository ha gia' scritto in
`scripts/verify-capabilities.mjs`: *una chiave nominata solo in un commento non
e' un chiamante*.

**Il falso positivo che va nominato in anticipo, o il primo che greppera'
concludera' il contrario.**
`supabase/migrations/20260810161000_venue_access_hardening.sql:534` contiene
`AND p.status = 'approved'` dentro `venue_for_parties`. **Quella definizione e'
superata:** la fase 49 ha riscritto la stessa funzione con la stessa firma in
`supabase/migrations/20260905131000_venue_reader_needs_a_ticket.sql:116`, e il
suo `COMMENT` (`:279`) lo dichiara — *«ARM 5 WAS REWRITTEN IN PHASE 49 … It used
to grant on profiles.status alone»*. **Il lettore del venue non legge piu' lo
stato**, e chi greppasse le migration concluderebbe il contrario.

**Cio' che resta non decide nulla per nessuno.** Non e' un cancello: e' il
verbale di come i cancelli furono scelti. Il censimento per intero, diviso in due
classi con proprietari diversi, sta in `deferred-items.md:410-500`.

### REG-06 — una prenotazione gratuita e' un ordine a totale zero · **CHIUSO**

- **Lo schema:** `supabase/migrations/20260921120100_free_order.sql` —
  `ticket_orders.sumup_checkout_id` diventa **nullable** con indice unico
  **parziale** dello stesso nome, e `buyer_name` compare. Riletto dalla
  produzione: `is_nullable = YES`, **0** vincoli `UNIQUE`,
  `CREATE UNIQUE INDEX … WHERE (sumup_checkout_id IS NOT NULL)`
  (50-11-SUMMARY.md:239-250). **L'unicita' non si e' indebolita e il nome non e'
  cambiato:** un checkout doppio riceve ancora `23505` e il messaggio nomina
  ancora lo stesso vincolo.
- **Osservato — `P-50-7`** (`50-ESITI.md:411-448`), letto **dal catalogo** e non
  dallo schermo:

  | Cosa | Letto |
  |---|---|
  | l'ordine | `status: completed`, `total_amount: 0.0`, `quantity: 2`, **`sumup_checkout_id: null`**, `buyer_name` valorizzato |
  | i due biglietti | `holder_label` `1 di 2` e `2 di 2` — **nessun nome**; `issued_via: free_rsvp`; `sumup_checkout_id: null`; `amount_paid: 0.0` |
  | il profilo nato dall'ordine | `full_name` uguale al nome digitato, `role: member` |
  | la posta | **una sola** riga in `email_deliveries`, `ticket_order_confirmation`, `provider_message_id` presente, `outcome unverified` |

- **La seconda esecuzione non conia niente** — il passo residuo che il runbook
  lasciava aperto, chiuso alle 15:39:10Z: `reserve_ticket_order` richiamata con
  **lo stesso id d'ordine** → HTTP 200 e **gli stessi due id**. Riletto subito
  dopo: biglietti sull'ordine **2, non 4**; righe di `email_deliveries` **2 in
  tutto il database, non 3**.
- **La porta, con la radio spenta — `P-50-8`** (`50-ESITI.md:450-545`), percorsa
  **dal proprietario fra le 16:01:27Z e le 16:02:19Z**, su un telefono vero. La
  modalita' aereo e' dichiarata **dalle schermate** (icona dell'aeroplano,
  nessun indicatore di rete) e **dal prodotto stesso**, che mostrava il banner
  *«The member list on this device was NOT refreshed. With the radio off…»* —
  che compare solo quando il dispositivo non raggiunge la rete. Non era il solo
  wi-fi spento, che e' la scorciatoia che avrebbe reso la prova inutile.
  - **Passo 4:** biglietto gratuito scansionato a radio spenta → **accettato**,
    schermo verde, sottotitolo **«RSVP · Offline»**. **Lo stesso esito visivo di
    un biglietto pagato**: lo scanner, la coda e il service worker **non
    conoscono la differenza** fra un biglietto a zero e uno pagato, e questa e'
    la prova che non la conoscono.
  - **Passo 5:** seconda scansione dello stesso codice → schermo viola,
    **«Recorded at 18:01 by this device»**. Non rifiutato e non contato due
    volte, e il telefono **nomina se stesso** invece di dare una risposta
    generica.
  - **Passo 6:** rete riaccesa → **1 / 3 (33%)**, pastiglia «Pending» sparita.
  - **Dal catalogo, dopo la sincronizzazione:** `issued_via = 'free_rsvp'`,
    `amount_paid = 0.00`, `sumup_checkout_id = null`, `checked_in_at` e
    `checked_in_by` valorizzati; in `door_scan_events` **UNA riga, e una sola**
    — `outcome recorded`, `source offline_sync`, `is_undo false`,
    `scanned_at 16:01:27.331Z` contro `recorded_at 16:02:19.341Z`. **I 52 secondi
    fra i due sono la finestra offline misurata**, ed e' esattamente l'intervallo
    che `supabase/migrations/20260805120000_door_scan_events.sql:101-103` dichiara
    di voler conservare.
  - **La seconda lettura non ha prodotto nessuna riga**, nemmeno una
    `already_recorded`: il telefono non l'ha messa in coda affatto.
  - **`attendances` non ha righe sulla serata gratuita, ed e' corretto:** il
    percorso del biglietto scrive `tickets.checked_in_at` e una riga in
    `door_scan_events` (`src/app/api/tickets/checkin/route.ts:1175-1220`), **mai**
    una presenza — `attendances` e' il registro del percorso **tessera**
    (`src/app/api/membership/verify/route.ts:528-562`). Un lettore che cercasse
    li' la prova dell'ingresso la troverebbe assente e ne dedurrebbe un difetto.
- **Il verso grave dell'errore non si e' verificato.** `checkin-offline.md` dice
  che *rifiutare un ospite valido e' peggio che ammetterne uno doppio, perche' il
  primo errore avviene davanti a una fila*. Al passo 4 il biglietto gratuito e'
  entrato.

---

## La decisione contraddetta, e chi la chiude

### `D-50-18b` — lo schermo della porta mostra il nome dell'acquirente

`D-50-18b` dice che il nome raccolto dal modulo va **all'account** e **mai** allo
schermo dello staff; `D-49-03` dice che il biglietto e' **al portatore**. Le
schermate dei passi 4 e 5 di `P-50-8` mostrano il `full_name` sotto il segno di
spunta.

**Da dove arriva, e perche' non e' un difetto introdotto qui.** `holder_label` e'
stato verificato **privo di nome** in `P-50-7`, e lo e' ancora: il nome non
arriva dal biglietto. Lo scanner ha **sempre** etichettato i biglietti dei membri
con il nome del profilo — la lista scaricata lo porta
(`src/app/api/tickets/attendance/route.ts:814-864`), la coda offline lo conserva
(`src/lib/offline/checkin-store.ts:786-789`), lo schermo lo rende
(`src/app/(admin)/admin/scanner/ScannerClient.tsx:2186`), e il percorso online fa
lo stesso dal server (`src/app/api/tickets/checkin/route.ts:1077-1095`).
**La fase 50 non ha aggiunto quel comportamento: ha reso il nome presente per
ogni acquirente**, perche' ora il modulo gratuito lo raccoglie.

**Decisione del proprietario, 2026-09-21** (`deferred-items.md:689-695`): lo
scanner mostrera' **solo l'esito e il tipo di biglietto, nessun nome**. *Un nome
sullo schermo fa respingere un ospite valido che non e' chi ha prenotato.* **Si
fa nella fase 51**, che possiede porta, scanner e coda offline, e si riverifica
con la radio spenta. **Non si e' toccato qui**, e la ragione e' di dominio: la
porta si modifica sapendo cosa si rompe, non di rimbalzo a una verifica.

---

## Le tre cose che non vanno lette male

1. **Il caricamento media dei membri ERA GIA' MORTO.** Il suo arm interrogava una
   tabella che in questo schema non esiste — misurato il **2026-08-08**, e la
   misura sopravvive nel commento di `src/lib/media/may-upload.ts:265-281` al
   posto in cui l'arm stava. *Rifiutava sempre, per chiunque.* **D-50-03
   formalizza, non restringe**: il `403 forbidden.media_upload_required` del
   passo 4.3 di `P-50-4` non e' una porta chiusa dalla fase 50, **e' una porta
   murata da sei settimane che adesso lo dice.** *(E il titolo e' **per serata**:
   lo stesso account, nello stesso minuto, e' stato ammesso sulla serata X con
   un'assegnazione `media.upload` e rifiutato sulla serata Y — passi 4.5 e 4.6.)*
2. **`membership.card.view` e' allargata PER UNA FASE.** Perdendo
   `requires_approved` la chiave diventa *«qualunque account»* (`D-50-23`), ed e'
   **debito dichiarato con il nome della fase che lo chiude: la 51**, che toglie
   la superficie. Anticipare la rimozione toccherebbe la porta, e la porta non e'
   mai in pacchetto. Nella stessa famiglia: **la chiave `membership.active` resta
   inerte nel catalogo** — le quattro concessioni sono state cancellate, la riga
   in `private.capabilities` resta (50-11-SUMMARY.md:193-199) — perche' se ne va
   **insieme** a `CAP.MEMBERSHIP_ACTIVE` in `src/lib/capabilities/keys.ts`, nella
   stessa migration e nello stesso commit (D-50-28). E' **debito della fase 51**.
3. **La prenotazione che diventa biglietto sposta quelle persone SOTTO
   `venue_reveal_on_purchase`, e questo e' un RESTRINGIMENTO.** Prima un RSVP
   leggeva l'indirizzo per un'altra strada; ora chi prenota ha un biglietto, e il
   lettore del venue chiede **un biglietto per quella serata** invece dello stato
   (`20260905131000_venue_reader_needs_a_ticket.sql:101`, arm 5 riscritto dalla
   fase 49). **La guardia monotona consente di stringere, mai di allargare**
   (`meta-gates.md`), e questo va nel verso consentito — **ma va dichiarato**,
   perche' una guardia a senso unico si controlla ogni volta che il percorso che
   la attraversa cambia.

---

## Anti-pattern cercati

Perimetro: i **64 file di `src/`, `supabase/` e `scripts/` toccati dalla fase**
che esistono ancora (16 ne sono stati cancellati). Comando eseguito oggi,
`/usr/bin/grep` — mai `grep` nudo, per il difetto sui file con byte NUL gia'
registrato in memoria.

| Cercato | Trovato | Verdetto |
|---|---|---|
| `TODO`, `FIXME`, `XXX`, `HACK` | **3 righe, tutte PREESISTENTI** | `src/app/(members)/attendance/page.tsx:44` e `:67` — `git log -S` le data al **2026-02-24**, commit `24b511e`, fase 01-02. `scripts/conversion-manifest.mjs:1023` e' prosa dentro una voce di manifesto della fase 41.2 |
| righe `TODO` **aggiunte** dalla fase | **0** | `git diff <fase> -- attendance/page.tsx \| grep -c '^+.*TODO'` → **0** |
| `stub`, `mock` | **1, preesistente** | la stessa voce di `conversion-manifest.mjs:1023`, che **dichiara** uno stub ereditato invece di nasconderlo |
| `Math.random` sul percorso di una credenziale | **0** | rimosso il 2026-09-05; il codice nasce da `extensions.gen_random_bytes` |

**Nessun anti-pattern introdotto da questa fase.** Le tre occorrenze residue sono
anteriori e appartengono ad altri piani.

---

## Il debito che questa fase lascia — §8.5, voce per voce

| Voce | Perche' nasce | Chi la chiude |
|---|---|---|
| `membership.card.view` diventa *«qualunque account»* (+ la chiave `membership.active` inerte nel catalogo) | D-50-23, D-50-28 | **fase 51** (`MEM-01`) |
| `/gallery` perde `requireApproved` dalla barra | §7.2 | **fase 52** (`NAV-02`) |
| la voce `Home` della barra, con `/` ridotta a rimando | §7.2, D-50-12 | **fase 52** (`NAV-01`) |
| `MemberTable.tsx` cambia sotto i piedi di `NAV-05` | §7.5 | **fase 52** |
| `scripts/container/seed.mjs` non puo' piu' seminare quattro delle sue nove persone | §1.4 | **chiusa in questa fase** (D-50-28) |
| **`rsvps` resta in sola lettura con i suoi lettori** | D-50-22, §6.5 | **NESSUNO programmato — dichiarato come tale.** Nessuna scrittura nuova; i lettori (fra cui la rivelazione del venue e il cron dei promemoria) continuano a leggerlo, e la capienza somma biglietti e rsvp storici finche' lo storico esiste. **Non si converte in biglietti: conierebbe QR validi per persone che non li hanno ricevuti.** |
| **le tre categorie di posta restano nel `CHECK` senza mittenti** | §7.4 | **NESSUNO: e' storia, e va detto che lo e'.** `src/lib/email-delivery/categories.ts:119-124` lo dichiara riga per riga. Il cron di riconciliazione continua a leggere le consegne storiche |

**Piu' le voci emerse percorrendo**, tutte in `deferred-items.md`: il `--reset`
del banco della porta che si ferma su un `23505` (`:503`), il titolo che `P-50-4`
pretendeva e che il banco non semina (`:550`), tre rifiuti in inglese con il
conteggio in italiano (`:564`), il dialogo di creazione account che nomina una
coda che non esiste piu' (`:577`), `Your Drinks` che resta su *«Loading your
drinks…»* se un token non si risolve (`:592`), il catalogo dei format del
laboratorio non fedele alla produzione (`:609`), e le **cinquanta occorrenze di
prosa** su `requires_approved` censite in due classi (`:410`).

### Il ritocco della pagina d'ordine e della mail — fuori fase, deciso dal proprietario

Osservato sulle schermate del laboratorio il 2026-09-21
(`deferred-items.md:696-731`), destinazione **fase 52 o task immediato**, prima
del listing dell'edizione seguente. **La voce piu' urgente e' la prima**, perche'
alla porta il cliente mostra la mail:

- **il QR non si vede nel corpo della mail su Gmail web** — riquadro vuoto, il
  codice arriva solo come allegato (la fase 49 l'aveva registrato per l'app
  Gmail). Causa probabile: immagine spedita come allegato e non `inline` con
  `content_id`;
- la mail dice *«il pagamento e' andato a buon fine»* **anche per una
  prenotazione gratuita**: serve il ramo del testo per l'ordine a zero;
- il saluto usa la parte locale dell'indirizzo invece di `full_name`, che
  `D-50-18b` consente;
- accenti scritti con l'apostrofo, e pagina e mail **in italiano mentre l'app e'
  in inglese**;
- `RE:SONATE` maiuscolo sulla pagina dell'ordine — la grafia e' **`re:sonate`
  minuscolo**, con la e normale;
- **deciso dal proprietario:** il pie' di pagina delle mail dice **«re:sonate
  motion music hub»** al posto di «Resonate Music Events Community», in
  `src/emails/components/email-layout.tsx`, nello stesso ritocco;
- colore rosso corallo da verificare contro il token dell'accento;
- minori: il nome della serata ripetuto, la mail con la sola ora d'inizio.

**Anche la porta ha tre voci per la fase 51**, oltre al nome: l'avviso *«member
list NOT refreshed»* che resta acceso anche col badge «Online» **e parla di
*member list*, vocabolario che questa fase ha smontato**; l'intestazione col
pulsante «QR Scan» che scorre sotto la barra di stato; e il velo dell'esito
semitrasparente, che va reso opaco.

---

## I gate, dichiarati con il loro colore vero

| Gate | Esito | Nota |
|---|---|---|
| `npm run build` | **verde** su ogni commit della fase | e' il typecheck, **non** una prova di comportamento |
| `npm run verify:routes` | **exit 0** | |
| `npm run verify:conversion` | **exit 0** | si rompe per costruzione se `/register` resta nel manifesto |
| `npm run verify:no-header-identity` | **exit 0** | |
| `npm run verify:capabilities` | **rosso prima della migration → 5/5 verde dopo** | e' il rosso che la migration esisteva per chiudere |
| `npm run verify:persona` | **7/7 verdi** | lanciato **dopo** la cancellazione delle superfici e **dopo** la scrittura in produzione, mai prima (piano 50-12) |
| controllo **F** di `verify:persona` | **verde** | `docs/` e `.firecrawl/` ignorati **e** non tracciati — il repository e' pubblico e un commit e' una pubblicazione irreversibile |
| `npm run verify:venue-surfaces` | **ROSSO**, `G2` | **preesistente** — `deferred-items.md:150`. `src/app/(public)/payment/callback/actions.ts` legge `sumup_checkout_id`, aggiunto dal commit `45be363` (fase 49) **senza** aggiornare la lista positiva. `sumup_checkout_id` non porta un luogo: **oggi non c'e' un indirizzo esposto**. Non riparato **di proposito**: quel gate sta su `venue-secrecy.md`, dove allentare un'asserzione e' l'unica modifica del repo che non si annulla |
| `npm run verify:touch-targets` | **ROSSO**, 3 elementi | **preesistente** — `STATE.md` voce differita 12. Due bottoni in `src/app/(public)/events/[slug]/menu/GuestTokenDisplay.tsx:689` e `:702`, un `<a>` in `src/emails/ticket-order.tsx:231` |
| **`npm run verify`** | **`VERIFY_FAIL — 2`** | rilanciato oggi, 2026-09-21: **non e' zero, e non si dichiara verde.** I due rossi sono quelli qui sopra, **entrambi anteriori alla fase**, entrambi con la loro voce differita, e **nessuna soglia e' stata allargata per farli passare** — sarebbe il *tampering* che quei gate nominano da se' |

**Il passo manuale che resta aperto: `B.2`** — il reset del modello di conferma
d'iscrizione dal cruscotto Supabase. E' del **proprietario**, quando vuole, ed e'
**cosmetico**: la misura ha smontato la premessa del piano
(50-11-SUMMARY.md:324-386). Il flag `MAILER_TEMPLATES_CONFIRMATION_CONTENT` dice
*«campo valorizzato»*, non *«modello personalizzato»*, e il contenuto **e' il
default di Supabase parola per parola** su tutti e tredici i template. Il
tentativo via API con `""` non azzera l'override: **installa un modello VUOTO e
lascia il flag `true`**, cioe' una conferma senza link — annullato in **29
secondi** con il contenuto catturato prima di toccarlo, e riletto.

---

## Cio' che nessuna di queste prove puo' dire

- **Che una mail sia arrivata.** `outcome` e' `unverified` su tutte le consegne
  citate, ed e' esattamente cio' che quella parola significa: il fornitore ha
  accettato la consegna, non l'ha confermata.
- **Che il browser di un'altra persona si comporti come il surrogato di 1.3.**
- **Come si comporti l'app installata**, che non e' stata esercitata (1.11).
- **Che la versione di GoTrue del laboratorio sia quella della produzione.** La
  produzione e' `v2.197.0`, letta; il laboratorio no. Il laboratorio **abbassa**
  il rischio di `A1`, non lo azzera — e cinque creazioni riuscite **in
  laboratorio** piu' il `422` **in produzione** sono cio' che si ha.
- **Nulla, per costruzione, sulla correttezza della persona.**
  `verify:persona` verifica la **coerenza** fra indice, frontmatter e albero:
  *«un verde non dice che un gate e' giusto, dice che i file concordano fra
  loro»*.

## Il conto delle scritture in produzione

Sotto la **terza autorizzazione datata** (`50-AUTHORISATION.md`, dichiarata
**ESAURITA**): due migration applicate da
`POST /v1/projects/…/database/migrations`, `/database/query` usato **solo** con
`read_only: true` da uno script che **scarta qualunque query che non cominci per
`select`**. **Righe di dati cancellate: ZERO** — i profili in `pending` o
`rejected` in produzione erano **zero**, misurato **prima** di chiedere il
permesso invece che scoperto a meta' runbook, quindi la parte irreversibile che
l'autorizzazione copriva **non ha avuto luogo**. L'unica `DELETE` e' quella della
migration su `private.role_capabilities`, cioe' su un **catalogo di permessi**.
Istantanea prima e dopo: tabelle **41 → 41**, righe **2394 → 2395** (`+1`, la
riga di `ticket_tiers`, **dichiarata prima** di applicare), concessioni **36 →
32** (`−4`, misurate prima di toccarle). **Non c'e' una sola riga non spiegata.**

---

## Verifica indipendente (gsd-verifier, 2026-09-21)

**Metodo.** Verifica goal-backward, senza fidarsi delle affermazioni del
SUMMARY: ogni claim sotto e' stata ripercorsa sul codice sorgente attuale con
`grep`/`ls`/`cat`, e quattro gate sono stati **rieseguiti dal vivo** in questa
sessione (non riletti dai log della fase). **Non letto**: database di
laboratorio e di produzione — vietato dalle istruzioni del compito. Le tre
query di catalogo citate sopra sono state controllate **per presenza della
citazione** nei SUMMARY (50-09, 50-11), non per verita' del loro contenuto,
come richiesto.

**Cosa e' stato ripercorso, ed esito:**

1. **`src/app/(auth)/register/`** — directory assente (`ls` → *No such file or
   directory*). Conferma REG-01.
2. **`src/app/page.tsx`** — letto per intero: e' un `Home()` che chiama
   `redirect("/events")` e nient'altro, con il docblock che spiega la
   sostituzione della landing. Conferma.
3. **`/usr/bin/grep -rn "auth\.signUp" src`** → **0 occorrenze**, misurato ora.
   Conferma.
4. **`/usr/bin/grep -rn "/register" src`** → tutte le 12 occorrenze residue sono
   o `/admin/members/register` (percorso interno, conservato di proposito) o
   prosa in docblock/commento. Nessuna rotta pubblica. Conferma.
5. **Migrazioni:** `ls supabase/migrations/20260921*` → i due file dichiarati
   esistono (`20260921120000_drop_status_and_referral.sql`,
   `20260921120100_free_order.sql`). Letta la prima: contiene
   `ALTER TABLE public.profiles DROP COLUMN IF EXISTS status` (:1010),
   `DROP COLUMN IF EXISTS referred_by` (:1011), `DROP COLUMN IF EXISTS
   approved_via` (:1012), `DROP FUNCTION IF EXISTS public.get_user_status()`
   (:939), `ALTER TABLE private.role_capabilities DROP COLUMN IF EXISTS
   requires_approved` (:996), e la ridefinizione di `handle_new_user()` (:804)
   nella stessa transazione. Conferma REG-02, REG-03.
6. **Mail cancellate** — verificata l'assenza su disco, oggi, di tutti e sei i
   file dichiarati (`member-approved.tsx`, `member-rejected.tsx`,
   `member-reactivated.tsx`, `registration-confirmation.tsx` + `.html`,
   `rsvp-confirmation.tsx`). Conferma.
7. **`referred_by` / `approved_via` nei sorgenti** — `grep -rn` conferma **0**
   occorrenze di `referred_by` e **2** di `approved_via`, entrambe dentro
   commenti (`sumup/route.ts:480`, `guest-list/process-entry.ts:176`), nessun
   ramo vivo. Conferma REG-03.
8. **Superfici del referral** — `src/components/membership/CopyReferralLink.tsx`
   e `src/app/(admin)/admin/(work)/members/growth/` assenti dal disco. Conferma.
9. **`supabase/migrations/20260921120100_free_order.sql`** — letta: la colonna
   `sumup_checkout_id` perde `NOT NULL` (:114), il vincolo `UNIQUE` cade
   (:117) e viene sostituito da un indice unico **parziale** con **lo stesso
   nome** `ticket_orders_sumup_checkout_id_key`, condizionato a
   `WHERE sumup_checkout_id IS NOT NULL` (:119-120); `buyer_name` viene
   aggiunta (:165). Conferma REG-06 lato schema.
10. **`reserve_ticket_order`** — la RPC esiste in
    `supabase/migrations/20260905120100_reserve_ticket_order.sql:26` ed e'
    chiamata dal percorso gratuito in
    `src/app/(public)/events/[slug]/free-order-actions.ts:468`. Conferma che il
    percorso RSVP passa dalla stessa funzione del percorso a pagamento, non da
    un ramo parallelo.
11. **Gate rieseguiti dal vivo in questa sessione** (non dai log del piano):
    - `node scripts/verify-capabilities.mjs` → **5/5 verde**, misurato contro
      **produzione** via Management API in sola lettura (`measured against:
      production`), 17 chiavi, 32 concessioni lette. Conferma REG-02/REG-05.
    - `node scripts/verify-routes.mjs` → **PASS — tutti e tre i controlli
      verdi**, exit 0. Conferma.
    - `node scripts/verify-persona.mjs` → **7/7 verdi**, incluso il controllo
      **F** (materiale di produzione fuori dal repo pubblico). Conferma.
    - `node scripts/verify-conversion.mjs` → **CONVERSION_OK**, 35 superfici
      dichiarate, 204 file scansionati. Conferma.
12. **Anti-pattern** — `grep -rnE "TODO|FIXME|XXX|HACK"` sui file chiave della
    fase (`page.tsx`, `free-order-actions.ts`, `FreeOrderForm.tsx`, le due
    migration del 2026-09-21) → **0 occorrenze**. Coerente con la tabella
    "Anti-pattern cercati" sopra.

**Cosa NON e' stato riverificato in proprio** (per constraint del compito o
costo/beneficio, e per cui questo verificatore si affida alla citazione, non
alla riesecuzione): le otto procedure di `50-ESITI.md` che richiedono accesso
al laboratorio o alla porta fisica (`P-50-1` … `P-50-8`), le letture dirette
del catalogo di produzione riportate nei SUMMARY 50-09/50-11 (controllate solo
per presenza della citazione, come richiesto), lo stato `B.2` del template di
conferma su Supabase Auth, e l'installazione PWA (gia' dichiarata non
esercitata dall'esecutore stesso).

**Verdetto.** Nessuna discrepanza trovata fra le affermazioni di
`50-VERIFICATION.md` e lo stato attuale del codice, delle migration e dei
quattro gate automatici rieseguiti dal vivo. I due gate rossi
(`verify:venue-surfaces`, `verify:touch-targets`) sono confermati preesistenti
e non toccati da questa fase — non sono stati allargati per farli passare. La
decisione contraddetta `D-50-18b` e il passo manuale `B.2` restano aperti,
correttamente dichiarati e non nascosti. **Il verdetto originale `passed` e'
confermato.**
