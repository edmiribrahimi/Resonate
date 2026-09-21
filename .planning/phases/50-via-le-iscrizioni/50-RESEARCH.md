# Phase 50: Via le iscrizioni — Research

**Researched:** 2026-09-21
**Domain:** access-gating (primario) · supabase-data · community-membership · ticketing-payments · media-and-storage · comms-analytics · checkin-offline
**Confidence:** HIGH su tutto cio' che e' letto in questo albero (ogni affermazione porta `file:riga`) · HIGH sul comportamento di GoTrue, letto dal sorgente · **NESSUNA misura presa su un database**: i conteggi di riga sono dichiarati mancanti, non stimati

> **Questo file e' pubblicato.** `.planning/` e' tracciato su un repository
> pubblico. Nessuna sede, nessuna data non annunciata, nessuna line-up, nessun
> nome di persona: solo ruoli.

---

## Summary

Questa fase e' **una sottrazione con un'addizione dentro**. La sottrazione —
`status`, il referral, `/register`, la home, quattro mail, sei azioni
amministrative — e' ampia ma quasi tutta meccanica: il lavoro pesante l'ha gia'
fatto la fase 32, che ha collassato **45 predicati di policy** in una sola
funzione (`20260807010000_policies_to_capabilities.sql`). Oggi **nessuna policy
scrive `status` per esteso** tranne due; tutte le altre lo chiedono attraverso
una colonna di flag, `private.role_capabilities.requires_approved`. Togliere la
colonna `profiles.status` significa quindi toccare **undici oggetti di database
nominabili**, non trentacinque — §1 li elenca uno per uno con la migration che li
ha definiti per ultima.

L'addizione e' `REG-06`, ed e' la parte che puo' fallire. L'ordine gratuito
riusa `reserve_ticket_order` (`20260905120100`), che e' esattamente la forma
giusta — transazionale, idempotente, con tetto e capienza applicati dentro il
blocco — ma **tre vincoli di schema si mettono di traverso**, e nessuno dei tre
e' nominato in `50-CONTEXT.md`: `ticket_orders.sumup_checkout_id UNIQUE NOT
NULL` (noto), `ticket_orders.tier_id NOT NULL REFERENCES ticket_tiers` (**non
noto**, e una serata `free_rsvp` non ha tier), e `tickets.tier_id NOT NULL`
(**non noto**). In piu' `D-50-19` dice *«l'ordine nasce `completed`»*: preso
alla lettera produrrebbe **zero biglietti**, perche' il ramo 2 di
`reserve_ticket_order` esce senza inserire proprio su `status = 'completed'`
(`20260905120100:77-84`).

**Raccomandazione primaria:** una migration sola, sul laboratorio, che fa tre
cose in quest'ordine — (1) libera i tre oggetti che *bloccano* il `DROP COLUMN`
(due policy e una `CHECK`), (2) ridefinisce le quattro funzioni che leggono
`status` senza dipendenza dichiarata, (3) `DROP COLUMN` e `DROP FUNCTION`. Poi,
**in una migration separata**, la forma dell'ordine gratuito. Separate perche' la
prima e' reversibile solo con un ripristino e la seconda e' additiva: metterle
insieme significa che un errore sulla seconda fa tornare indietro anche la prima.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Lo stato nel database**

- **D-50-01 — La colonna `status` va via del tutto.** Colonna `profiles.status`,
  funzione `public.get_user_status()`, colonna
  `role_capabilities.requires_approved` (e il ramo che la legge in
  `has_capability`), ogni policy che confronta lo stato (35 riferimenti in 10
  migration, contati il 2026-09-21), il vincolo `CHECK`, il default. In una
  migration nuova, **provata prima sul laboratorio** con procedura scritta. Lato
  codice: `STATUSES` e `UserStatus` in `src/lib/rbac/roles.ts`, l'header
  `x-user-status`, ogni `select("role, status")`, `isPendingOrRejected` sul
  dashboard.
- **D-50-02 — Gli account oggi in `pending` o `rejected` si cancellano**: utente
  Auth e profilo. Prima si **contano** (per stato) e si controllano le righe
  collegate (guest list, biglietti, rsvp, media): il conteggio finisce nel piano
  e nell'autorizzazione. E' irreversibile e scrive in produzione: vale la **terza
  autorizzazione datata**, le due della fase 49 sono esaurite.
- **D-50-03 — I media li caricano solo organizer e staff.** Le policy su
  `event_media` che chiedevano `status = 'approved'` si riscrivono **per
  ruolo/capability**, non per «utente loggato». Il caricamento dei membri
  sparisce in questa fase: `MediaUpload` e `MyMediaSection` escono dal dashboard,
  la quarantena e la revisione dell'organizer restano com'erano.
- **D-50-04 — REG-05 si chiude a zero.** Con la colonna via non sopravvive alcun
  cancello su `status`: la lista del debito per 51/57 e' **vuota**, e il
  VERIFICATION lo dichiara con il grep che lo prova.

**Chi entra ancora**

- **D-50-05 — REG-04 si riscrive**: entrano `master`, `admin`, `organizer`,
  `staff` **piu' l'account leggero** di chi compra o e' invitato da guest list,
  con ruolo `member` fino alla fase 51. **Nessun ruolo nuovo.**
- **D-50-06 — Il signup pubblico si spegne anche in Supabase Auth**, su
  produzione e laboratorio: passo manuale, datato, nel runbook della fase.
  Verificato il 2026-09-21 che ogni percorso che crea account usa la chiave di
  servizio: `src/lib/tickets/guest-identity.ts:248`,
  `src/lib/guest-list/process-entry.ts:236`,
  `src/app/(admin)/admin/members/actions.ts:2396` — tutti `auth.admin.createUser`.
  Nessun `auth.signUp` sopravvive fuori da `/register`.
- **D-50-07 — Gli invitati da guest list tengono l'account leggero**, stesso
  percorso dell'acquisto (trigger riparato l'8 settembre, migration
  `20260908120000`).

**Referral e trigger**

- **D-50-08 — Via `profiles.referred_by`, la logica di referral in
  `handle_new_user`, `CopyReferralLink` e ogni «Invite a friend».** Il trigger
  resta solo per creare il profilo con il ruolo che arriva dai metadati.
  `membership_code` **resta**: e' la credenziale della porta e la toglie la 51.
- **D-50-09 — Via `profiles.approved_via`.** La fase 49 aveva gia' deciso di non
  contare l'ingresso dalla cassa su quella colonna.
- **D-50-10 — Via la pagina `members/growth`** e le query di analytics che
  leggono stato o referral (`member-queries.ts`, `MemberGrowthChart`,
  `GrowthSummaryCard`).

**Cosa vede chi cerca di iscriversi**

- **D-50-11 — `/register` sparisce: 404.** Con lei **tutto cio' che vi rimanda**:
  il `Join` in home, il chip Register in `SecretVenueDialog.tsx:237`, il redirect
  in `RsvpButton.tsx:67`, ogni link nelle mail. Nessun redirect.
- **D-50-12 — La home attuale non esiste piu'.** `src/app/page.tsx` va via e `/`
  rimanda a `/events` **per tutti**, anche per chi e' loggato (oggi va al
  dashboard). Impatto sulla 52: la voce Home di NAV-01 perde senso — segnato in
  deferred, si decide li'.
- **D-50-13 — `/login` resta**, raggiungibile dalla voce Account della barra
  quando non si e' loggati. Il testo «Don't have an account?» diventa «Bought a
  ticket? Use the link in your email». Interfaccia in inglese.
- **D-50-14 — Via le quattro mail**: `registration-confirmation`,
  `member-approved`, `member-rejected`, `member-reactivated`. Restano
  `account-invitation` (account creati in-app) e le mail dell'ordine.
- **D-50-15 — Il dashboard dell'account leggero** mostra biglietti e token drink,
  nessun avviso di stato. Membership card e presenze restano alla 51.
- **D-50-16 — Togliere l'accesso = cancellare l'account** (discrezione di Claude,
  esercitata): utente Auth e profilo via, i biglietti restano legati all'ordine.
  `deactivateMember`, `reactivateMember`, `approveMember`, `rejectMember` e le
  bulk spariscono; la pagina membri diventa una lista di account con ruolo, con
  «crea account» e «cancella account». Nessun nuovo interruttore su un altro asse
  (niente ban Auth con profilo vivo).
- **D-50-17 — La newsletter resta**: e' una mailing list, non un account.

**RSVP come ordine gratuito (REG-06)**

- **D-50-18 — L'RSVP di una serata `free_rsvp` e' un ordine a totale zero.**
  Parole del proprietario: *«dev'essere uguale a comprare un ticket ma senza
  acquisto»*. L'ospite mette nome, cognome e mail — gli stessi campi del modulo
  d'acquisto della 49 — riceve la **stessa mail** con QR e link firmato, ottiene
  lo **stesso account leggero**, e passa dalla **stessa porta**.
- **D-50-19 — Nessun passaggio da SumUp.** L'ordine nasce `completed` e i
  biglietti si emettono subito con `reserve_ticket_order`, nello stesso ordine
  della 49 (identita' → conio → mail). Vale lo stesso tetto per ordine e la stessa
  capienza.
- **D-50-20 — Vale per tutti**, loggati compresi: un solo percorso, con la mail
  precompilata per chi ha sessione. Il pulsante `RsvpButton` e la tabella `rsvps`
  non ricevono piu' scritture nuove; cosa farne dello storico e' discrezione di
  Claude.

**Produzione**

- **D-50-21 — Migration in produzione oggi**, dopo la prova sul laboratorio:
  prima il laboratorio con la procedura scritta e percorsa, poi la produzione
  sotto la terza autorizzazione datata, con il conteggio delle righe cancellate
  scritto prima e verificato dopo.

### Claude's Discretion

- La forma tecnica dell'ordine gratuito: `ticket_orders.sumup_checkout_id` e'
  `UNIQUE NOT NULL` (migration `20260905120000`) — nullable con vincolo parziale,
  o un valore sintetico, lo decide il piano. Conta che l'idempotenza del
  pagamento non si indebolisca per gli ordini pagati.
- Lo storico della tabella `rsvps`: resta in sola lettura o si converte in
  biglietti gratuiti. Vincolo: il conteggio della capienza deve includere i
  biglietti a zero.
- Testi delle superfici che cambiano, in inglese, dentro il perimetro deciso.
- L'ordine dei piani e la divisione in onde: la migration del laboratorio viene
  prima di qualunque superficie, perche' e' la cosa che puo' fallire.

### Deferred Ideas (OUT OF SCOPE)

- **Un ruolo dedicato a chi compra** (`customer`): capacita' nuova, non in questa
  fase. Il ruolo `member` resta fino alla 51.
- **NAV-01 (fase 52)**: con `/` che rimanda a `/events`, la voce Home della barra
  perde senso. Da decidere nella 52.
- **Uno strumento per correggere la mail di un ordine fallito e rigiocarlo** (nota
  di esercizio della 49): fuori perimetro.
- `profiles-email-not-unique.md` — non risolto qui; il piano che riscrive il
  trigger deve pero' rileggerlo e non introdurre un `LIMIT 1`.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Requisito (ROADMAP + CONTEXT) | Cosa la ricerca ha trovato che lo abilita — e cosa lo ostacola |
|---|---|---|
| **REG-01** | `/register` e ogni percorso di auto-iscrizione sono rimossi. | Un solo `auth.signUp` in tutto `src/`: `(auth)/register/page.tsx:85`. I rimandi sono **sei**, non quattro: `page.tsx:149`, `SecretVenueDialog.tsx:237`, `RsvpButton.tsx:67`, `login/page.tsx:220`, **`GuestLoginBanner.tsx:108` e `:175`** — i due del menu drink che `50-CONTEXT.md` non nomina. In piu' un redirect permanente `/registrati → /register` in `next.config.ts:66` e una riga nel manifesto della conversione (`scripts/conversion-manifest.mjs:574`), che fa fallire `verify:conversion` se la pagina sparisce senza toccarlo. Vedi §7. |
| **REG-02** | Lo stato `pending` e' smontato: valore, mail, superfici. | **Undici** oggetti di database, non trentacinque — §1. Quattro mail (`src/emails/member-*.tsx`, `registration-confirmation.tsx`), due delle quali hanno un mittente vivo e due no. **La categoria nel registro delle consegne non si puo' togliere senza misurare le righe storiche** — §7.4. |
| **REG-03** | Il referral (*invite a friend*) e' rimosso. | `profiles.referred_by` (`20260225000000:15`), `approved_via` (`20260310000000:17-18`), il ramo referral del trigger (`20260908120000:78-88`), `CopyReferralLink` con **due** mount (`membership-card/page.tsx:122`, `dashboard/page.tsx:735`), la colonna nella tabella membri (`(work)/members/page.tsx:106-107`, `MemberTable.tsx:764-815`), e `fetchMemberGrowth` che legge `created_at, referred_by` (`member-queries.ts:63`). §2. |
| **REG-04** | Entrano i quattro ruoli piu' l'account leggero; signup pubblico spento in Supabase Auth. | Verificato alla fonte: `disable_signup` e' un campo di `PATCH /v1/projects/{ref}/config/auth`, ed e' letto **solo** da `signup.go:115` e `external.go:343` di `supabase/auth`. `adminUserCreate` (`admin.go:400`) e `adminGenerateLink` (`mail.go:52`) **non lo consultano**. §5. |
| **REG-05** | Nessun cancello nuovo su `status`; i superstiti elencati come debito — e per D-50-04 la lista dev'essere vuota. | Il grep che lo prova esiste ed e' scrivibile: §1.5 lo propone letterale, con il perimetro esatto (va escluso `event_media.status`, `drink_orders.status`, `ticket_orders.status`, `guest_list_entries.status`, `ticket_refunds.status`, `drink_tokens.status`, `drink_refund_request.status` — **sette omonimi su altre tabelle**, ed e' la ragione per cui un grep nudo su `status` non prova niente). |
| **REG-06** | L'RSVP di una serata gratuita e' un ordine a totale zero, con gli stessi pezzi dell'acquisto. | `reserve_ticket_order` e' la funzione giusta e va riusata **senza modificarne la firma**. Tre vincoli di schema si oppongono e uno di essi non e' nominato da nessun documento a monte; `D-50-19` come scritto produce zero biglietti. §6. |
</phase_requirements>

---

## Project Constraints (from CLAUDE.md)

Direttive attive che vincolano il piano. Il pianificatore le tratta come le
decisioni bloccate.

| Direttiva | Fonte | Conseguenza operativa su questa fase |
|---|---|---|
| **Non esiste test runner per il prodotto.** La verifica e' `npm run build` + procedure manuali **scritte**. | Guardrail 1 | Nessun piano dichiara «verificato» per via di test. Ogni piano che tocca accesso, denaro o porta porta la sua procedura, percorsa **sul laboratorio**. |
| **`npm run verify:persona`** obbligatorio se si tocca `CLAUDE.md` o `.claude/**`, e **dopo** una cancellazione, mai prima. | Guardrail 1 + meta-gates | `access-gating.md:22-36` contiene il *gate due assi*, che questa fase rende falso. Se il piano lo corregge — e §8.4 argomenta che dovrebbe — `verify:persona` va rilanciato **dopo**. |
| **Le migration sono la fonte di verita' dello schema, non `schema.sql`.** | Guardrail 3 | Ogni affermazione di schema qui e' letta dalle migration. `schema.sql` e' citato **solo** dove e' esso stesso l'ultima definizione (`rsvps`, `tickets.user_id`), ed e' dichiarato ogni volta. |
| **`.planning/codebase/` e' invecchiato** (Analysis Date 2026-02-24). Verificare ogni voce. | Guardrail 4 | Applicato: §0 riporta **otto** affermazioni di documenti a monte che il codice corrente smentisce. |
| **Il repository e' PUBBLICO.** | Guardrail 5 | Nessuna sede, data, line-up, nome di persona qui dentro. Rispettato. |
| **macOS/BSD:** `grep -E`, `sed -i ''`. E `grep` nudo e' `ugrep`, cieco sui file con byte NUL — usare `/usr/bin/grep`. | Guardrail 6 + memoria | Vale per i grep di verifica dentro i piani. Tutti i grep di questo documento sono stati eseguiti con `/usr/bin/grep`. |
| **Misura due volte, taglia una** su accesso, denaro, porta, segreto. | Operational Discipline 3 | Questa fase e' **Critical** su accesso e denaro, e sfiora la porta (REG-06 emette biglietti che passano dallo scanner). |
| **Gate VERIFICATION.md** con evidenza `file:riga` per requisito. | § Gate VERIFICATION.md | La fase si chiude con `50-VERIFICATION.md`. Per REG-05 l'evidenza e' il grep vuoto, **con il suo perimetro scritto**. |
| **Una scrittura in produzione fuori dal deploy passa da un'autorizzazione datata**, che si consuma una volta. | ai-engineering + `49-AUTHORISATION.md` | Le due autorizzazioni della fase 49 sono **esaurite** (2026-09-06 e 2026-09-08). Serve la **terza**, e il perimetro va scritto prima di chiederla. §8.2. |

---

## §0 — Dove il codice corrente contraddice i documenti a monte

**Il codice vince.** Otto voci; **cinque cambiano il piano**.

| # | Cosa dice `50-CONTEXT.md` / il ROADMAP | Cosa dice il codice, letto il 2026-09-21 | Impatto |
|---|---|---|---|
| **C1** | «l'header `x-user-status`» va tolto (D-50-01, *Integration Points*) | **Non esiste piu'.** L'iniezione e' stata cancellata dalla fase 33; cio' che resta in `src/lib/supabase/middleware.ts:693` e' una `requestHeaders.delete("x-user-status")` — **igiene dell'input in entrata**, non un trasporto. Il commento a `:675-692` lo dice: *«un header che nessuno legge e che qualcosa ancora FABBRICA e' una trappola; un header che nessuno legge, che niente fabbrica e che cancelliamo all'ingresso e' una guardia»*. Esiste anche un gate che lo pinna: `npm run verify:no-header-identity`. | **MEDIO.** Il piano non deve toccarlo. Toglierlo sarebbe **togliere una guardia**, non togliere un cancello — e farebbe fallire il gate. |
| **C2** | «ogni `select("role, status")`» (D-50-01) | Ne esistono **due**, non «ogni»: `src/app/(admin)/admin/members/actions.ts:1261` e `src/app/(admin)/admin/(work)/members/page.tsx:106`. Un terzo legge `status` da solo: `src/app/(admin)/admin/events/actions.ts:1334`, dentro `purchaseTicket`, dove rifiuta un `rejected` (`:1343-1347`). | **BASSO**, ma il terzo va nominato o resta. |
| **C3** | «`MediaUpload` e `MyMediaSection` escono dal dashboard» (D-50-03) | `MyMediaSection` e' sul dashboard (`(members)/dashboard/page.tsx:13,728`). **`MediaUpload` non c'e'**: vive sulla pagina della serata, dentro `MediaGallerySection.tsx:8,64`, ed e' disegnato solo se `canUpload`. | **MEDIO.** Il piano cerca `MediaUpload` nel file sbagliato. |
| **C4** | «Le policy su `event_media` che chiedevano `status = 'approved'`» (D-50-03) | Su `public.event_media` **nessuna policy nomina `status`**: `event_media_insert_member` chiede `auth.uid() = uploaded_by AND has_capability('membership.active')` (`20260807010000:189-193`). La lettura di `status` per esteso sopravvive in **una** policy di storage, `event_media_quarantine_insert_approved` (`20260809004600:136-143`), e in **una** policy su `public.profiles`, `profiles_update_own` (`20260807020000:208-218`). | **ALTO.** La riscrittura e' diversa da come il contesto la descrive — §3. |
| **C5** | «Il caricamento dei membri sparisce in questa fase» (D-50-03) | **E' gia' sparito, per un difetto.** L'arm «presenza registrata» di `mayUploadToParty` interroga una tabella `attendance` che **non esiste** (la tabella e' `attendances`), quindi *«questo arm rifiuta sempre, per chiunque»* — misurato il 2026-08-08 e scritto in `src/lib/media/may-upload.ts:265-281`. Oggi al caricamento arriva **solo** chi ha `staff.manage` o un'assegnazione `media.upload`. | **MEDIO.** D-50-03 non allarga e non restringe il comportamento reale: **formalizza**. Va detto nel VERIFICATION, o il gate sembrera' aver cambiato qualcosa che non ha cambiato. |
| **C6** | «l'ospite mette nome, cognome e mail — gli stessi campi del modulo d'acquisto della 49» (D-50-18) | **Il modulo d'acquisto della 49 raccoglie solo la mail.** `purchaseTicketsGuest` ha per firma `{ partyId, tierId, quantity, email, discountCodeId }` (`guest-purchase-actions.ts:191-196`), e la superficie disegna due controlli: quantita' e indirizzo (`TierSelection.tsx:595,620-622`). Nome e cognome **non esistono** su quel percorso, per costruzione: `resolveGuestIdentity` chiama `createUser` **senza `full_name`** (`guest-identity.ts:246-250`). | **ALTO.** «Gli stessi campi» e «nome, cognome e mail» sono due istruzioni incompatibili. §6.6 espone le due strade e non ne sceglie una: e' una domanda al proprietario. |
| **C7** | «L'ordine nasce `completed`» (D-50-19) | `reserve_ticket_order` esce **senza inserire** se l'ordine e' gia' `completed` (`20260905120100:77-84`): e' il ramo dell'idempotenza. Un ordine creato `completed` riceverebbe **zero biglietti** e nessun errore. | **ALTO.** L'ordine gratuito nasce `pending` e la RPC lo porta a `completed` (`:257-261`), esattamente come quello pagato. E' la lettera di D-50-19 a essere sbagliata, non la sua intenzione. |
| **C8** | «Il trigger resta solo per creare il profilo **con il ruolo che arriva dai metadati**» (D-50-08) | Il trigger corrente **non legge mai un ruolo dai metadati**: inserisce `'member'` cablato (`20260908120000:108-118`). Il ruolo lo scrive dopo `createAccount`, con `recordAct` (`members/actions.ts:2486-2493`). | **MEDIO.** Se il piano prende la frase alla lettera, aggiunge al trigger un percorso di scrittura del ruolo **che oggi non esiste** — cioe' un modo nuovo di ottenere un ruolo passando dai metadati di `createUser`. Da **non fare**: e' un allargamento su `access-gating.md`, gate *escalation privilegi*. |

---

## §1 — L'inventario di `status`, oggetto per oggetto

### 1.1 Il fatto che riduce il lavoro di due terzi

La fase 32 ha sostituito **45 frammenti di predicato in 45 policy** con una
chiamata sola a `private.has_capability` (`20260807010000`, docblock `:16-22`).
Da allora **una policy non nomina piu' `status`**: nomina una *capability*, e il
flag `requires_approved` sulla riga di concessione decide se lo stato viene
guardato (`20260807000000:213-216`).

Ne segue che il `DROP COLUMN` non tocca 35 policy: tocca **il risolutore** e le
**due** policy rimaste che scrivono `status` per esteso.

### 1.2 Gli undici oggetti, con l'ultima migration che li ha definiti

| # | Oggetto | Ultima definizione | Cosa fa con `status` | Blocca il `DROP COLUMN`? |
|---|---|---|---|---|
| 1 | colonna `public.profiles.status` | `20260224_rbac_migration.sql:16-17` | `text NOT NULL DEFAULT 'approved' CHECK (status IN ('pending','approved','rejected'))` | — |
| 2 | `CHECK profiles_role_implies_approved` | `20260808001000:115-117` | `role NOT IN ('master','organizer','staff') OR status = 'approved'` | **Si'**, ma Postgres lo droppa da solo: un vincolo di tabella che coinvolge la colonna cade con essa |
| 3 | policy `profiles_update_own` | `20260807020000:208-218` | `WITH CHECK (… AND status = (SELECT profiles_1.status …))` — la guardia anti-escalation | **Si'.** Una policy e' una dipendenza registrata: va droppata e **ricreata senza il termine** nella stessa migration |
| 4 | policy `event_media_quarantine_insert_approved` su `storage.objects` | `20260809004600:136-143` | `bucket_id = '…' AND (SELECT public.get_user_status()) = 'approved'` | **Indirettamente**: dipende da `get_user_status()`, non dalla colonna |
| 5 | funzione `public.get_user_status()` | `20260224:110-116` | `SELECT status FROM profiles WHERE id = auth.uid()` — `plpgsql`, quindi **nessuna dipendenza dichiarata** | **No** — e per questo e' pericolosa: il `DROP COLUMN` riesce e la funzione si rompe in silenzio |
| 6 | funzione `private.has_capability(text, uuid)` | `20260809001000:320-350` (arm 1 a `:337`) | `and (not rc.requires_approved or p.status = 'approved')` | **No** (`language sql` con corpo a stringa) |
| 7 | funzione `public.my_access_context()` | `20260809005000` (due selezioni, `:209` e `:296`) | restituisce `'status'` nel payload JSON | **No** |
| 8 | funzione `public.reconcile_master()` | `20260808004000:213,227` | legge `p.status`, e distingue *promosso* da *approvato* | **No** |
| 9 | funzione `public.handle_new_user()` | `20260908120000:60-118` | decide `new_status`, lo inserisce, e cerca il referrer con `status = 'approved'` (`:80`) | **No** |
| 10 | colonna `private.role_capabilities.requires_approved` | `20260807000000:123` | `boolean not null default false` — il flag che il risolutore legge | — |
| 11 | le **concessioni** con `requires_approved = true` | sparse | `catalogue.manage` ×2 (`20260807000000:396-397`), `membership.active` ×4 (`:403-405` + `20260808000500:136`), `membership.card.view` ×4 (`:419-422` + `20260808000500:123`), `register.read` ×2 (`20260808002000:124,130`), `media.upload` ×2 (`20260809001000:200-201`), `party.manage` ×2 (`:204-205`), `venue.reveal` ×2 (`20260810160000:142,148`) — **18 righe su 68** | — |

> **Un `p.status` che sembra vivo e non lo e'.** `20260810161000:534` contiene
> `AND p.status = 'approved'` dentro `venue_for_parties`. **Quella definizione e'
> superata**: la fase 49 ha riscritto la stessa funzione con la stessa firma
> (`20260905131000:116`), e l'arm 5 ora guarda *un biglietto per quella serata*.
> Chi grepperebbe le migration per `p.status` la troverebbe e concluderebbe che
> il lettore del venue legge ancora lo stato. **Non lo legge.** Questa e'
> esattamente la ragione per cui §1.5 propone un grep di verifica che guarda **il
> catalogo**, non i file.

### 1.3 Cosa succede alle policy che chiedono una capability `requires_approved`

Togliere la colonna significa togliere il flag, e togliere il flag **allarga**
sei capability. Nessuno di questi allargamenti e' teorico; vanno dichiarati uno
per uno.

| Capability | Oggi ammette | Dopo, senza il flag | Chi la usa |
|---|---|---|---|
| `catalogue.manage` | master/organizer **approvati** | master/organizer — **nessun allargamento reale**: il `CHECK profiles_role_implies_approved` rende ogni master/organizer `approved` per regola di database (`20260808001000:115-117`) | 4 policy (`artists_insert/update`, `venues_insert/update`) |
| `register.read`, `media.upload`, `party.manage`, `venue.reveal` | idem | idem — **nessun allargamento reale**, stessa ragione | rotte + `may-upload.ts` + policy delle assegnazioni |
| `membership.card.view` | qualunque ruolo **approvato** | **qualunque account**, compreso l'account leggero di chi ha comprato | rotta `/membership-card` e `/attendance` (`capability-routes.ts`) |
| `membership.active` | qualunque ruolo **approvato** | **qualunque account** | `event_media_insert_member` e `rsvps_insert_approved` |

**Le prime cinque righe non sono un allargamento**: e' esattamente il
ragionamento che il proprietario ha gia' fatto due volte, il 2026-08-15 e il
2026-09-?? — *«nessuno si iscrive piu', quindi `pending` sta per smettere di
variare, e un cancello su un valore che non varia e' debito, non sicurezza»*
(`20260815120100:90-96`, `20260817120000:127`). Quelle due migration hanno gia'
scommesso su questa fase. **Questa fase e' l'incasso della scommessa.**

**Le ultime due lo sono**, e vanno trattate:

- **`membership.active`** dopo la fase diventa *«ha un profilo»*. Due lettori:
  `rsvps_insert_approved` — che `REG-06` rende comunque morto, perche' nessuno
  scrivera' piu' in `rsvps` (D-50-20) — e `event_media_insert_member`, che e'
  esattamente la policy che **D-50-03 ordina di riscrivere per ruolo**. Cioe':
  se §3 si fa, `membership.active` resta senza lettori e **si puo' cancellare
  dal catalogo**, il che chiude REG-05 in modo piu' forte di un grep.
- **`membership.card.view`** e' la chiave della membership card e delle presenze,
  **che la fase 51 rimuove per intero** (`MEM-01`, `MEM-02`). Qui c'e' una scelta
  da dichiarare: lasciarla allargata per una fase (chi ha comprato vede una
  membership card che non gli serve) oppure anticiparne la rimozione. §8.5.

### 1.4 Il lato codice, file per file

| File:riga | Cosa contiene | Disposizione |
|---|---|---|
| `src/types/database.ts:101` | `export type UserStatus = "pending" \| "approved" \| "rejected"` | via |
| `src/types/database.ts:109` | `Profile.status` | via |
| `src/types/database.ts:110-111` | `referred_by`, `approved_via` | via (REG-03) |
| `src/types/database.ts:1261` | `RoleCapability.requires_approved` | via |
| `src/types/database.ts:1305` | `AccessContext.status` | via |
| `src/lib/rbac/roles.ts:89` | `export type { UserRole, UserStatus }` | perde `UserStatus` |
| `src/lib/rbac/roles.ts:104-108` | `STATUSES` | via — **nessun consumatore trovato fuori da questo file** |
| `src/lib/rbac/roles.ts:126` | `NavItem.requireApproved` | **decisione**, vedi §7.2 |
| `src/lib/rbac/roles.ts:315-317,321` | `getVisibleNavItems(role, status, …)`, `isApproved` | la firma perde un parametro → **14 siti di mount**, 13 dei quali passano `status={status as UserStatus \| null}` |
| `src/lib/capabilities/server.ts:259,293,512` | `status` in `AccessContextResult`, `ANONYMOUS_CONTEXT`, mappatura del payload | via |
| `src/app/(admin)/admin/members/actions.ts:1042-1123` | `planStatusAct` e l'asse dello stato | via con le azioni |
| `…/actions.ts:1385,1414,1459` | `updateMemberRole` scrive `status` insieme al ruolo | **resta la funzione, cade la colonna scritta** |
| `…/actions.ts:1656-1851` | `deactivateMember`, `reactivateMember`, `approveMember`, `rejectMember` | via (D-50-16) |
| `…/actions.ts:2076-2101` | `bulkApproveMember`, `bulkRejectMember` | via |
| `…/actions.ts:2451-2453` | `createAccount` scrive `approved_via: 'admin_manual'` | via — **ma quella `.update(…).select("id")` e' anche il rilevamento di «il trigger non ha scritto il profilo»** (`:2439-2447`, `failure: "profile_missing"`). Togliere la scrittura senza sostituire la lettura **cancella una diagnosi**: `meta-gates.md`, zero fallimenti silenziosi. Sostituirla con una `select("id")` pura |
| `…/actions.ts:2492` | `recordAct(… status: "approved")` | il **registro** e' storia, non stato — §1.6 |
| `src/app/(members)/dashboard/page.tsx:335` | `isPendingOrRejected` | via, con tutto il ramo `:489-577` |
| `src/app/(admin)/admin/events/actions.ts:1334-1347` | `purchaseTicket` rifiuta un `rejected` | via con la colonna |
| `src/app/api/webhooks/sumup/route.ts:190-203` | ramo legacy: approva e manda `member_approved` | via |
| `src/app/api/webhooks/sumup/route.ts:532-545` | ramo ordine: `update({status:'approved'}).eq('status','pending')` | via — e con essa cade l'unico consumatore del commento *«il pagamento decide l'ammissione»* |
| `src/app/(public)/events/[slug]/rsvp-actions.ts:26-33` | l'RSVP verifica `status === 'approved'` | via con REG-06 |
| `src/components/admin/MemberTable.tsx` | **94 righe** nominano stato o approvazione: `StatusTab` (`:118`), `StatusBadge` (`:207`), `BULK_TAB_STATUS` (`:871`), le quattro schede (`:1157`), la colonna (`:1075`) | riscrittura sostanziale |
| `src/app/(members)/membership-card/page.tsx:79,120` | `select("membership_code, status")` e il gate del referral | via (REG-03) |
| `scripts/verify-capabilities.mjs:277-…`, `645` | `ROLE_GRANTS` con i flag, `EXPECTED_PAIR_COUNT = 68` | **gate da aggiornare nello stesso commit**, o `npm run verify` diventa rosso |
| `scripts/rls-baseline-compare.mjs:215-216` | il testo del predicato `get_user_status() = 'approved'` | idem |
| `scripts/container/seed.mjs` | droppa e ripristina `profiles_role_implies_approved`, semina quattro persone `pending`/`rejected` | **il banco di prova non compila piu' il suo mondo**: quattro persone diventano irrappresentabili |
| `scripts/seed-lab-door.mjs:176-180` | semina `memberPending` con `status: "pending"` | da aggiornare **prima** di riseminare il laboratorio |
| `scripts/conversion-manifest.mjs:574` | riga `/register` → `src/app/(auth)/register/page.tsx` | da togliere, o `verify:conversion` fallisce |

### 1.5 Il grep che chiude REG-05 — e perche' un grep nudo non lo chiude

**`status` e' il nome di una colonna su otto tabelle di questo schema**, sette
delle quali restano: `event_media` (`20260225120000:9`), `pending_purchases`
(`20260225110000:45`), `ticket_refunds` (`20260227200000:9`), `drink_orders` e
`drink_tokens` (`20260306000000:30,50`), `guest_list_entries`
(`20260310000000:52`), `ticket_orders` (`20260905120000:71`),
`drink_refund_request` (`20260820110000:71`). Un grep su `status` restituisce
centinaia di righe legittime e **non prova niente**.

La forma che prova qualcosa e' duplice.

**(a) Dal catalogo, sul laboratorio e sulla produzione** — l'unica misura che non
si fida dei file:

```sql
-- colonna: dev'essere 0
select count(*) from information_schema.columns
 where table_schema = 'public' and table_name = 'profiles' and column_name = 'status';

-- funzioni che ancora la nominano: dev'essere 0
select p.oid::regprocedure
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where n.nspname in ('public','private')
   and pg_get_functiondef(p.oid) ~ '\mprofiles?\M[^;]*\mstatus\M';

-- policy che ancora la nominano: dev'essere 0
select schemaname, tablename, policyname
  from pg_policies
 where coalesce(qual,'') || coalesce(with_check,'') ~ 'get_user_status|requires_approved';
```

**(b) Dai file, con il perimetro dichiarato** — per il VERIFICATION:

```bash
/usr/bin/grep -rnE "get_user_status|requires_approved|UserStatus|STATUSES|isPendingOrRejected" \
  src/ supabase/migrations/ scripts/ \
  | /usr/bin/grep -v "^supabase/migrations/" # le migration storiche restano, sono storia
```

> **Le migration passate non si riscrivono.** `20260224_rbac_migration.sql`
> continuera' a contenere `ADD COLUMN status`, ed e' giusto: e' il verbale di
> cio' che e' successo. Un VERIFICATION che pretendesse zero occorrenze **in
> tutto l'albero** chiederebbe di falsificare la storia. Il perimetro del grep
> va **scritto accanto al grep**, o il gate diventa impossibile da superare
> onestamente e qualcuno lo allarghera' fino a renderlo vuoto.

### 1.6 Cosa NON va via: il registro

`public.membership_acts` porta `status_before` e `status_after` come **`text`
nudi, senza vincolo e senza chiave esterna** — e la migration spiega perche':
*«una etichetta di stato memorizzata e' PROVA DI CIO' CHE ERA VERO ALLORA, non un
puntatore a cio' che e' vero adesso… il giorno in cui un ruolo viene ritirato, il
vincolo renderebbe la storia di quel ruolo irrappresentabile, che e' l'unica cosa
che un registro non puo' diventare»* (`20260808002000:224-243`).

**Il registro sopravvive intatto alla fase.** Il `CHECK` su `act` porta ancora i
sette valori (`:174-183`), e le righe storiche `approved`/`rejected` restano
leggibili. Il registro e' anche `append-only`
(`20260808005000_membership_acts_append_only.sql`) e
`subject_id … ON DELETE SET NULL` (`:188`) — quindi **cancellare un account non
cancella la sua storia**, ed e' esattamente cio' che serve a D-50-02 e D-50-16.

**Domanda aperta per il piano (§Open Questions Q2):** `D-50-16` introduce un atto
che il `CHECK` non conosce — *cancellato*. O si aggiunge un ottavo valore, o la
cancellazione non lascia traccia nel registro. Lasciare una cancellazione senza
traccia contraddice `community-membership.md`, gate *chi decide e' tracciato*.

---

## §2 — Referral: l'inventario

| Dove | Riga | Cosa |
|---|---|---|
| Schema | `20260225000000:15` | `referred_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL` |
| Schema | `20260310000000:17-18` | `approved_via text CHECK (approved_via IN ('referral','guest_list','admin_manual'))` |
| Trigger | `20260908120000:78-88` | il ramo che cerca `membership_code = ref_code AND status = 'approved'` e scrive `referrer_id` / `'referral'` |
| Trigger | `20260908120000:108-118` | l'`INSERT` che valorizza entrambe le colonne |
| Componente | `src/components/membership/CopyReferralLink.tsx:66-69` | costruisce `/register?ref=<membership_code>` |
| Mount 1 | `src/app/(members)/membership-card/page.tsx:120-124` | disegnato se `profile?.status === "approved"` |
| Mount 2 | `src/app/(members)/dashboard/page.tsx:734-736` | disegnato se esiste `membership_code` — **senza gate di stato** |
| Loading | `src/app/(members)/membership-card/loading.tsx:59` | lo scheletro del controllo |
| Superficie membri | `(work)/members/page.tsx:106-107,149` | il `select` con il self-join `referrer:profiles!referred_by(full_name)` |
| Tabella | `MemberTable.tsx:91,764-790,811-815,1423` | colonna, conteggio, dettaglio espandibile («Direct signup») |
| Analytics | `src/lib/analytics/member-queries.ts:5-17,63` | `GrowthDataPoint.referral/organic`, `fetchMemberGrowth` legge `created_at, referred_by` |
| Pagina | `(work)/members/growth/page.tsx` (intera, 126 righe) | + `MemberGrowthChart`, `GrowthSummaryCard` |
| Mappa rotte | `capability-routes.ts:301` | la riga `/admin/members/growth` sotto `ADMIN_ACCESS` |
| Mail | `src/emails/member-approved.tsx:51`, `member-reactivated.tsx:18` | *«…with your personal referral link»* |
| `createAccount` | `members/actions.ts:2451-2453` | scrive `approved_via: 'admin_manual'` |

**`membership_code` RESTA** e non va confuso con il referral. E' la credenziale
della porta: `src/app/api/membership/verify/route.ts:132`,
`src/app/api/membership/list/route.ts:88`, e la coda offline dello scanner. Lo
toglie la fase 51 (`MEM-01`/`MEM-03`) *con la rete spenta*. Il conio sta nel
trigger (`20260908120000:100-130`) ed e' stato indurito a fine fase 49
(`gen_random_bytes`, 2^50) — **non si tocca qui**.

**Il trigger, dopo.** Diventa: conia il codice, inserisce
`(id, email, full_name, membership_code, role='member')`, poi marca la voce di
guest list se c'era. Spariscono `new_status`, `new_approved_via`, `referrer_id`,
`ref_code` e il ramo del referral. **Il `SELECT … INTO guest_list_match … LIMIT
1` resta**: e' su `guest_list_entries`, non su `profiles`, e il todo
`profiles-email-not-unique.md` non lo riguarda. Ma la sua conclusione riguarda il
piano: **non introdurre nessun `LIMIT 1` nuovo su `profiles` cercato per
indirizzo**, perche' la colonna non e' unica (`schema.sql:56`) e
`resolveGuestIdentity` gia' gestisce *zero, uno, molti* apposta
(`guest-identity.ts:322-335`, con il commento che rifiuta `maybeSingle`).

---

## §3 — I media, e cosa vuol dire davvero riscriverli per ruolo

### 3.1 Lo stato di fatto, misurato

| Oggetto | Definizione | Predicato oggi |
|---|---|---|
| policy `event_media_insert_member` | `20260807010000:189-193` | `auth.uid() = uploaded_by AND has_capability('membership.active')` |
| policy `event_media_select_approved` | `20260225120000:26-27` | `status = 'approved'` — **`event_media.status`, un'altra tabella**: e' la moderazione, non l'accesso. **Non si tocca** |
| policy di storage `event_media_quarantine_insert_approved` | `20260809004600:136-143` | `bucket_id = 'event-media-quarantine' AND get_user_status() = 'approved'` |
| policy di storage «Members can upload event media» | **droppata** da `20260809006000` | il browser non scrive piu' nel bucket pubblico |
| predicato applicativo `mayUploadToParty` | `src/lib/media/may-upload.ts:224,261,286` | `staff.manage` **oppure** `media.upload` (per serata) **oppure** `membership.active` + presenza — e il terzo arm e' **morto**, §0/C5 |
| chi scrive la riga | `registerMedia` (`events/[slug]/actions.ts:181-193`) | client legato al cookie → **passa dalla RLS** |
| chi decide la superficie | `events/[slug]/page.tsx:1019-1026` | `hasCapability(CAP.MEDIA_UPLOAD, { partyId })` — gia' per serata |

### 3.2 La riscrittura che D-50-03 chiede

`membership.active` e' l'unica cosa che tiene in piedi il predicato della policy,
e senza il flag diventa *«ha un profilo»* — cioe' **chiunque abbia comprato un
biglietto puo' inserire una riga in `event_media`**. Quello **sarebbe** un
allargamento, su un percorso che `media-and-storage.md` (gate *chi carica ha
titolo*) e `venue-secrecy.md` presidiano insieme: una foto scattata dentro una
sede segreta porta le coordinate nei suoi byte.

La forma corretta, e i materiali per scriverla esistono gia':

```sql
-- public.event_media — l'INSERT si riscrive per capability, non per stato
DROP POLICY IF EXISTS event_media_insert_member ON public.event_media;
CREATE POLICY event_media_insert_staff ON public.event_media
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (
    (select auth.uid()) = uploaded_by
    AND (
      (select private.has_capability('staff.manage'))
      OR (select private.has_capability('media.upload', event_media.party_id))
    )
  );
```

Due cose da verificare nel piano, non da assumere:

1. **`has_capability` accetta gia' la serata** come secondo argomento
   (`20260809001000:320-350`), e `event_media.party_id` esiste ed e' nullabile
   (`20260809004500:110,129-133`). Su una riga con `party_id` nullo l'arm 2
   dell'assegnazione non scatta (`p_party_id is not null` e' la **prima**
   condizione, `:345`), quindi l'esito e' `staff.manage` da solo: **fail closed**,
   ed e' la direzione giusta.
2. **Il commento della fase 32 dice che `has_capability` va chiamata con UN
   argomento** perche' la lista bianca del comparatore non accetta la forma a due
   (`20260807010000`, nota di chiusura). Quel comparatore appartiene alla fase
   32; il piano deve **rileggerlo prima di scrivere la policy**, o scoprire
   l'incompatibilita' a gate rosso.

Per la policy di storage, il `get_user_status()` va sostituito dallo stesso
predicato **senza serata** — la quarantena non conosce il `party_id`, il percorso
e' `{eventId}/{userId}/{ts}.{ext}` (`MediaUpload.tsx:401`):

```sql
DROP POLICY IF EXISTS event_media_quarantine_insert_approved ON storage.objects;
CREATE POLICY event_media_quarantine_insert_staff ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'event-media-quarantine'
    AND (select private.has_capability('staff.manage'))
  );
```

> **Attenzione a un restringimento reale, e va dichiarato**: cosi' scritta, la
> policy di storage **rifiuta chi ha solo un'assegnazione `media.upload`** — il
> fotografo della serata, che e' proprio la persona per cui l'arm esiste
> (`20260808000500:127-135`). Il bucket non conosce la serata, quindi o il
> predicato di storage resta piu' largo di quello di tabella (e la tabella fa da
> gate vero, che e' la forma gia' in uso), oppure il percorso del file guadagna
> la serata. **Decisione del piano, non di questo documento.**

### 3.3 La conseguenza che chiude REG-05 meglio di un grep

Se `event_media_insert_member` perde `membership.active` e `rsvps_insert_approved`
muore con REG-06, **la capability `membership.active` resta senza lettori**. Il
piano puo' allora cancellarla dal catalogo (`private.capabilities` e
`private.role_capabilities`), il che rende la prova di REG-05 **strutturale**
invece che testuale: non c'e' piu' una chiave da cui far discendere un cancello
sullo stato. Da fare con `scripts/verify-capabilities.mjs` aggiornato **nello
stesso commit** (`ROLE_GRANTS`, `EXPECTED_PAIR_COUNT = 68`).

---

## §4 — Cancellare un account: le cascate, lette dai vincoli

> **`ai-engineering.md` pretende che una cascata si legga dai vincoli, mai a
> memoria.** Quanto segue e' letto **dal testo delle migration**, che e' la
> seconda fonte migliore. **La lettura autorevole e' `pg_constraint` sul
> laboratorio**, e il piano deve farla prima di cancellare qualsiasi cosa: e' il
> gate scritto dopo l'incidente delle 63 righe.

### 4.1 Cosa succede a `DELETE FROM auth.users WHERE id = …`

| Tabella | Colonna | Comportamento | Migration |
|---|---|---|---|
| `public.profiles` | `id` | **CASCADE** | `schema.sql:55` *(ultima definizione)* |
| `public.tickets` | `user_id` | **CASCADE** | `20260225110000:27` |
| `public.ticket_purchases` / `pending_purchases` | `user_id` | **CASCADE** | `20260225110000:43` |
| `public.rsvps` | `user_id` | **CASCADE** | `schema.sql:201` |
| `public.attendances` | `user_id` | **CASCADE** | `schema.sql:234` |
| `public.event_media` | `uploaded_by` | **CASCADE** | `20260225120000:8` |
| `public.party_assignments` | `(user_id, assignee_role)` → `profiles(id, role)` | **CASCADE** | `20260809000000:408-411` |
| `public.events` | `created_by` | SET NULL | `20260225100000:8` |
| `public.ticket_orders` | `user_id` | SET NULL | `20260905120000:63` |
| `public.drink_orders`, `drink_tokens` | `user_id` | SET NULL | `20260306000000:27,45` |
| `public.email_deliveries` | `user_id` | SET NULL | `20260822130000:93` |
| `public.membership_acts` | `subject_id`, `actor_id` | SET NULL | `20260808002000:188,207` |
| `public.party_assignments` | `revoked_by` | SET NULL | `20260809000000:328` |
| `public.party_credits` | `created_by` | SET NULL | `20260809003000:95` |
| `public.door_scan_events` | `subject_user_id` | SET NULL | `20260805120000:81` |
| tabelle di produzione (`production_*`) | `created_by` / `updated_by` / `ticked_by` | SET NULL | `20260815120000:714`, `20260817120100:374`, `20260817120200:149,327` |
| `public.formats`, `public.series` | `created_by` | SET NULL | `20260810120000:165,228` |
| `public.drink_refund_request` | `decided_by` | SET NULL | `20260820110000:80` |
| `public.venue_reveal_acts` | `actor_id` | SET NULL | `20260810160000:228` |
| **`public.ticket_refunds`** | `requested_by` **NOT NULL**, `processed_by` | **nessuna clausola → NO ACTION: BLOCCA** | `20260227200000:4-5` |
| **`public.party_assignments`** | `assigned_by` **NOT NULL** | **RESTRICT: BLOCCA** | `20260809000000:310` |
| **`public.door_scan_events`** | `operator_id` **NOT NULL** | **NO ACTION: BLOCCA** | `20260805120000:108` |
| **`public.guest_list_entries`** | `added_by` **NOT NULL**, `profile_id` | **NO ACTION: BLOCCA** | `20260310000000:51,54` |
| **`public.tickets`** | `checked_in_by` | **NO ACTION: BLOCCA** | `20260228200000:4`, `20260805120000:280` |
| **`public.artists`**, **`public.venues`** | `created_by` | **NO ACTION: BLOCCA** | `20260226100000:12`, `20260226200000:12` |

### 4.2 Le due cose che il piano deve sapere prima di scrivere una riga

**(a) `tickets.user_id` e' `ON DELETE CASCADE`, e D-50-16 dice il contrario.**
La decisione recita *«i biglietti restano legati all'ordine»*. **Non restano**:
cancellare l'utente Auth cancella le sue righe in `tickets`. L'ordine sopravvive
(`ticket_orders.user_id` e' SET NULL) ma **vuoto**. Le strade sono tre, e il
piano ne sceglie una dichiarandola:

1. **accettarlo** per i soli `pending`/`rejected` di D-50-02, **dopo aver
   misurato che ne hanno zero** — l'opzione piu' onesta e quella che non tocca lo
   schema del denaro;
2. **cambiare la cascata** a `SET NULL` — ma `tickets.user_id` e' `NOT NULL`, e
   renderlo nullabile tocca `reserve_ticket_order` (`20260905120100:100-106`, che
   rifiuta un ordine senza portatore) e ogni lettura per persona. **Grosso, su un
   percorso di denaro, dentro una fase che ha gia' un'altra migration
   irreversibile**;
3. **rifiutare la cancellazione** quando esistono biglietti — cioe' fare
   dell'azione «cancella account» un'operazione che puo' dire di no, con la sua
   causa. **Piu' piccola di (2) e piu' onesta di (1)**, e coerente con
   `meta-gates.md`: un rifiuto nominato e' un effetto osservabile.

**(b) Sette vincoli bloccano la cancellazione, e sei sono normali per uno
staff.** `added_by` sulla guest list, `assigned_by` su un'assegnazione,
`operator_id` su una scansione della porta, `created_by` su artisti e venue,
`requested_by` su un rimborso: **un organizer che ha lavorato non e'
cancellabile**, e `23503` e' cio' che l'operatore vedra'. Va gestito in
superficie **con la causa**, non con «Qualcosa e' andato storto» — il precedente
del form newsletter e' registrato in `CONCERNS.md` ed e' esattamente questa forma
d'errore.

Per i profili `pending`/`rejected` di D-50-02 quasi certamente **nessuno** di
questi vincoli e' popolato; ma *«quasi certamente»* non e' una misura, ed e' la
ragione per cui D-50-02 chiede di contare **prima**.

### 4.3 Le misure che mancano, e che solo il piano puo' prendere

Questo documento **non ha eseguito nessuna query**, ne' sulla produzione ne' sul
laboratorio. Le sei misure che l'autorizzazione datata deve portare con se':

```sql
select status, count(*) from public.profiles group by status;                       -- 1
select p.status, count(*) from public.profiles p join public.tickets t
   on t.user_id = p.id where p.status <> 'approved' group by p.status;              -- 2
select p.status, count(*) from public.profiles p join public.rsvps r
   on r.user_id = p.id where p.status <> 'approved' group by p.status;              -- 3
select p.status, count(*) from public.profiles p join public.event_media m
   on m.uploaded_by = p.id where p.status <> 'approved' group by p.status;          -- 4
select p.status, count(*) from public.profiles p join public.guest_list_entries g
   on g.profile_id = p.id where p.status <> 'approved' group by p.status;           -- 5
select count(*) from public.profiles where referred_by is not null;                 -- 6
```

Piu' una settima, per REG-02: `select category, count(*) from
public.email_deliveries group by category` — §7.4 spiega perche'.

---

## §5 — Spegnere il signup in Supabase Auth

### 5.1 Il campo, verificato alla fonte

`PATCH /v1/projects/{ref}/config/auth` accetta un corpo con il campo booleano
**`disable_signup`** — presente nell'esempio completo della *Update auth service
config* della Management API. Sul cruscotto la stessa cosa si chiama
**«Allow new users to sign up»**, documentata in *General configuration*:
*«Users will be able to sign up. If this config is disabled, only existing users
can sign in.»*

### 5.2 La prova che `createUser` e `generateLink` sopravvivono

Letta dal sorgente di `supabase/auth` (ramo `master`, 2026-09-21), non dalla
memoria. `DisableSignup` compare in **due soli punti**:

| File | Riga | Endpoint |
|---|---|---|
| `internal/api/signup.go` | `115` | `POST /signup` → `422 signup_disabled` |
| `internal/api/external.go` | `343` | il ritorno OAuth |

**Non compare** in `internal/api/admin.go` (che contiene `adminUserCreate`, `:400`)
ne' in `internal/api/mail.go` (che contiene `adminGenerateLink`, `:52`), ne' in
`invite.go`, `magic_link.go`, `otp.go`, `token.go`, `recover.go`, `verify.go`.

Conseguenza diretta sui tre percorsi che creano account in questo prodotto —
tutti e tre passano dalla chiave di servizio:

| Percorso | Chiamata | Sopravvive? |
|---|---|---|
| acquisto da ospite | `guest-identity.ts:246-250` `auth.admin.createUser` | **si'** |
| invito da guest list | `process-entry.ts:234-243` `auth.admin.createUser` | **si'** |
| account creato in-app | `members/actions.ts:2394-2399` `auth.admin.createUser` | **si'** |
| il link «Completa il tuo account» | `password-set-link.ts:86-88` `generateLink({type:"recovery"})` | **si'** — ed e' `recovery` su un utente che gia' esiste, non un percorso di iscrizione |

**`[ASSUMED]` sulla versione.** Il sorgente letto e' `master` di oggi; la
versione di GoTrue dispiegata sul progetto **non e' nota da questo repository**.
La prova definitiva e' l'esercizio sul laboratorio, §Validation P-50-5.

### 5.3 Il percorso che si spegne davvero

Un solo `auth.signUp` in `src/`: `(auth)/register/page.tsx:85`. Con la pagina
cancellata (REG-01) il percorso non e' piu' raggiungibile **dal prodotto**; con
`disable_signup = true` non e' piu' raggiungibile **nemmeno con la chiave
anonima e curl**, che e' il punto di D-50-06 — `access-gating.md`: *il middleware
e' UX, il confine vero sta altrove*.

**Un percorso di ritorno da verificare:** `src/app/api/auth/callback/route.ts:278`
fa `exchangeCodeForSession(code)` — cioe' **consuma** un codice, non lo crea, e
non passa da `/signup`. La riconciliazione `MASTER_EMAIL` (`:171-260`) legge
`profiles` per indirizzo e **rifiuta su `ambiguous`** (`:249`) invece di tirare a
indovinare: e' il ramo che il todo `profiles-email-not-unique.md` ha prodotto, e
**non va toccato**. Ma `reconcile_master` scrive `status` (`20260808004000:227`) e
distingue *promosso* da *approvato*: dopo la fase quella distinzione ha un ramo
solo, e la funzione va riscritta nella stessa migration.

---

## §6 — REG-06: l'ordine a totale zero

### 6.1 Cosa esiste gia' ed e' riusabile senza modifiche

| Pezzo | Dove | Perche' e' quello giusto |
|---|---|---|
| `reserve_ticket_order(uuid, text)` | `20260905120100` | transazionale, `FOR UPDATE` sull'ordine (`:56-58`), idempotente (`:77-84`), tetto per serata (`:122-136`), capienza del tier confrontata con `quantity` (`:145-163`), N righe da **una** `INSERT` (`:226-249`), `holder_label` numerico |
| `resolveGuestIdentity` | `guest-identity.ts:205` | ritrova o conia l'account leggero, gestisce la corsa (`:253-266`) e attende la riga del profilo invece di dormire (`:272-297`) |
| `sendOrderConfirmation` | `order-confirmation.ts:164` | la mail con QR e link firmato, registrata in `email_deliveries` sotto `ticket_order_confirmation` |
| `buildPasswordSetLink` | `password-set-link.ts:86` | il link «Completa il tuo account» |
| `buildOrderQuote` | dentro `guest-purchase-actions.ts:229-240` | prezzo, tetto, capienza, sconto, minimo — **tutto dal database** |
| la sequenza | `webhooks/sumup/route.ts:441-560` | identita' → allaccia il portatore → RPC → mail. **Il percorso gratuito la ripete in sincrono**, senza i passi 1 (verifica dell'incasso) e 5 (ammissione, che muore con `status`) |

### 6.2 I tre vincoli che si oppongono

| Vincolo | Riga | Problema | Opzioni |
|---|---|---|---|
| `ticket_orders.sumup_checkout_id text UNIQUE NOT NULL` | `20260905120000:70` | un ordine gratuito non ha checkout | (a) **nullable + indice unico parziale** `WHERE sumup_checkout_id IS NOT NULL`; (b) valore sintetico |
| **`ticket_orders.tier_id uuid NOT NULL REFERENCES ticket_tiers ON DELETE RESTRICT`** | `20260905120000:62` | **una serata `free_rsvp` non ha tier** | (a) tier sintetico a prezzo 0; (b) `tier_id` nullabile + tre rami di `reserve_ticket_order` da adattare |
| **`tickets.tier_id uuid NOT NULL`** | `20260225110000:26` | stesso problema, un livello sotto | idem |

**Il terzo vincolo non e' nominato da nessun documento a monte**, ed e' quello
che decide: rendere nullabile `tickets.tier_id` significa toccare la tabella del
denaro e ogni lettura che ne dipende. Il tier sintetico non tocca niente.

**Perche' il tier sintetico e' praticabile, misurato e non supposto:**
`ticket_tiers.price numeric CHECK (price >= 0)` — **zero e' ammesso**
(`20260225110000:13`); `quantity` e' **nullabile dal 2026-02-27** e `NULL`
significa *illimitato* (`20260227100000:2-4`); `party_id` e' nullabile con un
`CHECK` che pretende almeno uno fra `party_id` ed `event_id`
(`20260226300000:44-48`). Un tier `price = 0`, `quantity = <capienza della
serata>` o `NULL`, legato alla serata, e' **rappresentabile oggi senza toccare lo
schema**. E dentro `reserve_ticket_order` fa esattamente il lavoro giusto: il
ramo della capienza (`20260905120100:157-163`) diventa la capienza della serata
gratuita, applicata **dentro la transazione** — che e' l'unico posto dove regge
sotto concorrenza.

**Il costo, dichiarato:** un tier va **creato**, e va deciso da chi — se nasce
con la serata (`admin/events/actions.ts`, quando `access_type = 'free_rsvp'`)
oppure alla prima prenotazione. Se nasce alla prima prenotazione, nasce dentro un
percorso concorrente e serve una guardia di unicita'. **Se nasce con la serata,
non serve niente** — ed e' la strada che questo documento raccomanda.

### 6.3 `sumup_checkout_id`: nullable, non sintetico — e la ragione e' misurata

`src/app/api/cron/reconcile-refunds/route.ts:98-113` legge **tutti** i biglietti
e, per ognuno che abbia un `sumup_checkout_id` senza codice di transazione,
**chiama `getCheckout(...)` sull'API di SumUp**:

```
if (!ticket.sumup_checkout_id && !ticket.sumup_transaction_code) continue;   // :105
…
if (!txCode && ticket.sumup_checkout_id) { const checkout = await getCheckout(…) }  // :110-111
```

Un valore **sintetico** su un biglietto gratuito supererebbe quel `continue` e
manderebbe una richiesta verso un fornitore per un checkout che non esiste —
**ogni giorno, per ogni biglietto gratuito mai emesso**. Un valore **nullo** cade
sul `continue` alla prima riga. `reserve_ticket_order` copia il campo
dall'ordine al biglietto (`20260905120100:233`), quindi la scelta si propaga.

**Nullable con indice unico parziale**, quindi. E l'idempotenza del pagamento non
si indebolisce: un indice unico parziale `WHERE sumup_checkout_id IS NOT NULL` e'
**esattamente lo stesso vincolo** sulle righe che hanno un checkout. La forma e'
gia' in uso in questo schema due volte (`20260905120000:230-238`, i due indici
ristretti a `order_id IS NULL`).

### 6.4 La sequenza sincrona, e la riga che D-50-19 sbaglia

```
1. validare (mail; quantita'; access_type = 'free_rsvp'; tetto; capienza)   ← buildOrderQuote
2. INSERT ticket_orders (… total_amount = 0, sumup_checkout_id = NULL,
                          status = 'pending')                               ← NON 'completed'
3. resolveGuestIdentity(email)  → user_id                                   ← conia o ritrova
4. UPDATE ticket_orders SET user_id = …                                     ← il portatore
5. rpc reserve_ticket_order(order_id, p_issued_via => 'free_rsvp')          ← porta a 'completed'
6. sendOrderConfirmation(order_id)                                          ← dentro un try
```

**Il passo 2 e' il punto.** Con `status = 'completed'` il passo 5 cade nel ramo 2
(`20260905120100:77-84`), restituisce l'insieme **vuoto** dei biglietti di
quell'ordine e non inserisce nulla — **senza errore**. E' precisamente lo stato
che `meta-gates.md` chiama fallimento silenzioso.

`p_issued_via` e' un `text` libero con default `'guest_checkout'`
(`20260905120100:28`) e finisce su `tickets.issued_via`, la cui migration
dichiara che **`NULL` significa «scritto prima che la colonna esistesse», mai
«acquisto ordinario»** (`20260905120000:172-176`). Un valore nuovo — `free_rsvp`
— e' il modo corretto di distinguere un biglietto a zero: **nessun `CHECK` da
allargare**, la colonna e' testo nudo.

### 6.5 Chi legge `rsvps`, e cosa si rompe se smette di riempirsi

| Lettore | Riga | Cosa succede |
|---|---|---|
| conteggio della capienza | `events/[slug]/page.tsx:729-745` | **deve passare a contare i biglietti** del tier gratuito — vincolo esplicito della discrezione |
| «ho gia' prenotato» | `events/[slug]/page.tsx:697-704` | diventa «ho gia' un biglietto», come sul percorso pagato (`userTickets`) |
| promemoria del giorno prima | `cron/event-reminders/route.ts:108-113,184,332` | **legge `rsvps` e `tickets` separatamente e deduplica per mail**; con l'RSVP che diventa biglietto, il ramo `rsvps` si svuota. **Non va cancellato finche' esiste storico**, o chi ha prenotato prima della fase non riceve il promemoria |
| rivelazione del venue | `lib/venue-reveal/reveal-party-venue.ts:330-357,441,493,620` | `rsvps` e' una delle **tre** sorgenti di destinatari, dichiarata con `venue_reveal_sent: false` a `:357`. **Non va toccata**: e' una guardia monotona, e chi ha gia' un RSVP deve continuare a ricevere l'indirizzo |
| lettore del venue in RLS | `venue_for_parties`, arm 4 (`20260905131000:188-194`) | **resta.** Un biglietto gratuito apre l'indirizzo dall'arm 3 (`:176-186`) *solo se* `venue_reveal_on_purchase` e' vero. **Attenzione:** l'arm 4 dice esplicitamente che un RSVP **non** e' sotto quel flag, *«perche' spegnerlo toglierebbe l'indirizzo a chi ha detto che viene MENTRE IL CRON CONTINUA A SPEDIRGLIELO»* (`:190-193`). Convertire l'RSVP in biglietto **sposta quelle persone sotto il flag**, e su una serata con `venue_reveal_on_purchase = false` **chiude una porta che oggi e' aperta**. E' un restringimento, quindi consentito dalla guardia monotona — ma va **dichiarato**, non scoperto |

**Lo storico.** La discrezione e' aperta. La strada meno rischiosa e' **lasciarlo
in sola lettura**: la tabella non si tocca, il cron dei promemoria continua a
servirla, la rivelazione continua a leggerla, e la capienza somma *biglietti del
tier gratuito + righe di `rsvps` sulla stessa serata* finche' lo storico esiste.
Convertirlo in biglietti significa coniare biglietti retroattivi con QR validi
alla porta per persone che non li hanno mai ricevuti per mail — cioe' **cambiare
cosa apre una porta**, in una fase che non contiene niente altro sulla porta.
`checkin-offline.md` e l'*Ordering Constraint* «la porta non e' mai in pacchetto»
dicono entrambi di no.

### 6.6 Nome e cognome: la domanda da porre

`D-50-18` chiede *«nome, cognome e mail — gli stessi campi del modulo d'acquisto
della 49»*. Il modulo della 49 raccoglie **solo la mail** (§0/C6). Le due letture:

- **«come l'acquisto»** → un campo solo, la mail. Coerente con
  `purchaseTicketsGuest`, con `resolveGuestIdentity` che non scrive `full_name`, e
  con `D-49-03` — **il biglietto e' al portatore**, e `holder_label` porta un
  progressivo *«e NON UN NOME e non deve diventarlo… un nome sullo schermo dello
  staff fa rifiutare un ospite valido oppure diventa teatro»*
  (`20260905120000:166-169`).
- **«nome, cognome e mail»** → due campi in piu', passati a
  `createUser({user_metadata:{full_name}})` come fa il percorso guest list
  (`process-entry.ts:238-242`, dove `first_name`/`last_name` esistono sulla voce).
  Costa: un campo in piu' su un modulo pubblico, e due forme diverse dello stesso
  percorso a seconda che si paghi o no.

**Le due letture non sono conciliabili**, e la seconda sfiora un gate che questo
progetto ha scritto apposta. **Domanda al proprietario, prima del piano.**

### 6.7 Cosa NON cambia, e va detto

- **Il tetto per ordine** resta `event_parties.max_tickets_per_order`
  (`20260905120000:250-259`), applicato dentro la RPC. Su una serata gratuita
  «sei posti gratis con un clic» e' una decisione di prodotto diversa da «sei
  biglietti con un pagamento»: **il default resta 6 salvo decisione contraria**,
  e vale la pena chiederlo.
- **`reserve_ticket_order` e' concessa al solo `service_role`**
  (`20260905120100:308-311`). Il percorso gratuito **deve** passare dal client di
  servizio, e la giustificazione va nel commit (`access-gating.md`, gate *service
  role*). Concederla ad `anon` o `authenticated` sarebbe la primitiva di
  escalation che `20260905150000` e' esistita per togliere.
- **La porta non cambia.** Il biglietto gratuito e' una riga di `tickets` con la
  sua firma: lo scanner, la coda offline e il service worker non sanno la
  differenza. Va **verificato** con la radio spenta (§Validation P-50-8), non
  dedotto.

---

## §7 — Le superfici

### 7.1 I rimandi a `/register`: sei, non quattro

| File:riga | Cosa | Disposizione |
|---|---|---|
| `src/app/page.tsx:149` | il pulsante `Join` | via con la pagina (D-50-12) |
| `src/app/(public)/events/[slug]/SecretVenueDialog.tsx:237` | chip `Sign up` accanto a `Sign in` | via il chip, resta `Sign in` |
| `src/app/(public)/events/[slug]/RsvpButton.tsx:61-68` | salva l'intento in `localStorage` e va a `/register?next=…` | via l'intero ramo con REG-06 |
| `src/app/(auth)/login/page.tsx:187-222` | «Don't have an account? Sign Up» | diventa D-50-13 |
| **`…/menu/GuestLoginBanner.tsx:108`** | link nel banner del menu drink | **non nominato in CONTEXT.md** |
| **`…/menu/GuestLoginBanner.tsx:175`** | secondo link, stesso file | **non nominato in CONTEXT.md** |
| `src/components/membership/CopyReferralLink.tsx:66-69` | `/register?ref=…` | via con il componente (REG-03) |
| `next.config.ts:66` | `{ source: "/registrati", destination: "/register", permanent: true }` | **via.** Un redirect *permanente* e' memorizzato dal browser: chi l'ha seguito una volta continuera' a essere mandato su `/register` dalla propria cache anche dopo la rimozione. Va detto nel VERIFICATION invece di essere scoperto |
| `scripts/conversion-manifest.mjs:574` | `"/register", "src/app/(auth)/register/page.tsx", "focus"` | **via**, o `npm run verify:conversion` fallisce |
| `scripts/verify-routes.mjs:140-152` | `PUBLIC_ALLOW` | **non contiene `/register`** — verificato. Nessuna modifica necessaria |

`src/emails/templates/registration-confirmation.html` e
`src/emails/registration-confirmation.tsx` **non hanno chiamanti in `src/`**:
sono il modello che si incolla nel cruscotto Supabase (`:82-85`). Vanno via
insieme, e il modello nel cruscotto **non serve piu'** una volta che il signup e'
spento.

### 7.2 La barra, e due decisioni che la fase non puo' evitare

`NAV_ITEMS` (`roles.ts:140-248`) porta cinque voci. Due cambiano:

- **`/` Home**, `hideWhenAuth: true` (`:147`). Con la home cancellata, la voce
  punta a un redirect. Il docblock di `getVisibleNavItems` (`:253-258`) dichiara
  l'esito attuale: *«Non autenticato: Home, Events, Gallery (3 schede)»*.
  **D-50-12 la svuota** e il deferred rimanda la decisione alla 52 — ma **la fase
  50 non puo' lasciarla cosi'**: una voce che porta a un redirect e' una voce che
  porta altrove che da se'. Minimo: toglierla qui, e la 52 decide se torna.
- **`/gallery`**, `requireApproved: true` (`:170`). **E' un cancello su
  `status`**, e D-50-04 pretende che non ne sopravviva nessuno. Con il campo via,
  la gallery diventa visibile a chiunque nella barra. **Non e' un allargamento
  d'accesso** — la pagina non ha alcuna guardia propria: filtra
  `event_media.status = 'approved'` e basta (`gallery/page.tsx:51`), e chi
  conosce l'indirizzo ci arriva gia' oggi. E' `NAV-02` (fase 52) a costruire il
  cancello vero. Il piano sceglie fra: togliere il campo `requireApproved` (e la
  voce resta visibile a tutti per una fase) o **anticipare `NAV-02`** legandola a
  `gallery.view`. La prima e' dentro perimetro; la seconda e' 52.
- **`/dashboard` Account**, `requireAuth: true` (`:245`). **Oggi un anonimo non
  vede nessuna voce Account.** D-50-13 dice *«raggiungibile dalla voce Account
  della barra quando non si e' loggati»*: e' una **voce nuova**, non un ritocco.
  Con Home via e Gallery da decidere, un anonimo vedrebbe altrimenti **solo
  Events**.

`getVisibleNavItems` perde il parametro `status` → **14 mount di `<AppNav>`**,
13 dei quali passano `status={status as UserStatus | null}`. `StaffNav`
(`src/components/staff/StaffNav.tsx`) va verificato allo stesso modo.

### 7.3 La home e il PWA

- `src/app/page.tsx` va via; `/` diventa un redirect a `/events` **per tutti**
  (oggi chi e' loggato finisce sul dashboard, `page.tsx:~90`).
- **`public/manifest.json:5` dichiara `"start_url": "/"`**. Con `/` che rimanda,
  ogni apertura dell'app installata paga un salto. Va portato a `/events`.
  `public/manifest.json` **e' tracciato** (`git ls-files`); `public/sw.js` **no**,
  e' generato.
- **Il service worker non precachea rotte.** `precacheEntries: self.__SW_MANIFEST`
  (`src/app/sw.ts:117`), che porta gli artefatti di build; l'unica `"/"` presente
  in `public/sw.js` e' dentro il codice della libreria. In piu' `sw.ts:129-158`
  installa un ascoltatore di `activate` che **cancella ogni documento in cache a
  ogni rilascio**. Rischio di cache calda su `/register`: **nessuno misurato.**

### 7.4 Le mail, e la trappola del registro

| Template | Mittente vivo | Disposizione |
|---|---|---|
| `member-approved.tsx` | `members/actions.ts:77` + `webhooks/sumup/route.ts:201` | via |
| `member-rejected.tsx` | `members/actions.ts:170` | via |
| `member-reactivated.tsx` | `members/actions.ts:122` | via |
| `registration-confirmation.tsx` (+ il suo `.html`) | **nessuno** | via |
| `rsvp-confirmation.tsx` | `rsvp-actions.ts:100-109` | via con REG-06 — la sostituisce `ticket-order.tsx` |
| `account-invitation.tsx`, `ticket-order.tsx`, `ticket-confirmation.tsx`, `guest-invitation.tsx`, `venue-reveal.tsx`, `event-reminder.tsx`, `refund-*.tsx` | vivi | restano |

**La trappola.** `EMAIL_CATEGORIES` (`src/lib/email-delivery/categories.ts:56-107`)
e' **specchiato da un `CHECK`** su `public.email_deliveries.category`
(`20260905140000:72-75`, ultima definizione). Il docblock lo dice: *«aggiungerne
uno costa due modifiche in un commit»* (`:43-45`). **Toglierne uno costa di
piu'**: se esistono righe storiche con `member_approved`, l'`ALTER … ADD
CONSTRAINT` fallisce con `23514` e la migration va in rollback.

Le tre strade, in ordine di preferenza:

1. **Lasciare i valori nel `CHECK` e togliere solo i mittenti.** Una categoria
   che nessuno scrive piu' non e' debito: e' il vocabolario di un registro
   storico, esattamente come `membership_acts` conserva `approved` fra i suoi
   sette atti (§1.6).
2. Misurarle (`select category, count(*) from email_deliveries group by 1`) e
   toglierle **solo** se zero.
3. Cancellare le righe storiche: **no.** E' la scrittura in produzione piu' facile
   da fare e da rimpiangere.

`rsvp_confirmation` merita una nota: dopo REG-06 non si scrive piu', ma **le
righe storiche restano** e il cron di riconciliazione delle consegne le legge.

### 7.5 La pagina membri, dopo

`MemberTable.tsx` perde: `StatusTab` e le quattro schede (`:118`, `:1157-1170`),
`StatusBadge` (`:207`), `BULK_TAB_STATUS` (`:871`), le sei azioni, la colonna
stato (`:1075`), il blocco referral (`:764-790`, `:811-815`). Resta: ruolo, data,
codice di membership, «crea account», e **«cancella account»** con i rifiuti di
§4.2 resi leggibili.

Due dettagli da non perdere:

- `MemberTable.tsx:1109` — la cifra `staff` e' un link con filtro; `NAV-05`
  (fase 52) la vuole come le altre tre. **Non e' questa fase**, ma se le schede di
  stato spariscono qui, la 52 trovera' una superficie diversa da quella che il suo
  requisito descrive. Da segnalare nel SUMMARY.
- `MemberTable.tsx:843-847` e `:668` — i commenti sul **posto gratuito
  permanente** che un account staff vale. E' il ragionamento di
  `community-membership.md` (gate *la capienza e' finita*), e sopravvive alla
  fase: va conservato, non cancellato con il resto.

---

## §8 — Ordine, rischio, e la finestra di deploy

### 8.1 Cosa puo' fallire, in ordine

1. **La migration di `status`.** Irreversibile senza ripristino, e **questo
   repository non ha PITR** (decisione registrata, `49-AUTHORISATION.md`). Va per
   prima, sul laboratorio, con la procedura scritta.
2. **La cancellazione degli account** (D-50-02). Irreversibile e bloccabile da
   sette vincoli.
3. **La migration dell'ordine gratuito.** Additiva, quindi la meno pericolosa —
   ma tocca `ticket_orders`, che e' la tabella del denaro.
4. Le superfici. Recuperabili con un commit.

### 8.2 L'autorizzazione, e cosa deve dichiarare

Le due della fase 49 sono **esaurite** (`49-AUTHORISATION.md`, stati
`ESAURITA`), e *«da qui in poi questo documento non autorizza piu' niente»*. La
terza va chiesta con il perimetro scritto **prima**: quali migration per nome,
quante righe si cancellano e da quali tabelle, e le cinque condizioni gia'
dichiarate nella prima (istantanea derivata da `pg_constraint` e non ricordata;
rilettura dal catalogo e mai dalla risposta del `POST`; endpoint
`POST /v1/projects/{ref}/database/migrations` e mai `/database/query`; ci si
ferma alla prima che fallisce; nessuna cascata nuova).

**Due proprieta' misurate dello strumento**, da riportare o qualcuno le
riscoprira': l'endpoint conia la versione **con l'istante dell'applicazione**,
non con il nome del file — accaduto sei volte su sei; e `CREATE OR REPLACE` su
una firma identica **conserva l'ACL**.

### 8.3 La finestra di deploy: quale verso, e perche' questa volta e' invertito

La regola del repository e' **migration prima, codice dopo**. C'e' **una sola
eccezione registrata**, `20260809006000`, che la inverte e spiega il criterio:
*«fra un peggioramento temporaneo e uno stato invariato si sceglie lo stato
invariato»*.

Qui il criterio dice **codice prima**, e va dichiarato:

| Ordine | Finestra | Cosa si rompe |
|---|---|---|
| migration prima | fra la migration e il deploy Vercel, il codice in produzione fa ancora `select("role, status")` e `update({status:'approved'})` | **`42703 column does not exist`** su: il webhook dei pagamenti (`route.ts:190,534`), la pagina membri, `purchaseTicket`, l'RSVP. **Il percorso del denaro si rompe** |
| **codice prima** | fra il deploy e la migration, il codice non legge piu' `status` e la colonna resta popolata | **Niente si rompe.** Un `NOT NULL DEFAULT 'approved'` continua a soddisfarsi da solo sugli `INSERT`; `has_capability` continua a leggerlo e risponde come oggi |

**Codice prima, migration dopo.** E' l'inverso della regola, quindi va scritto
**dentro la migration**, nella forma che `20260809006000` ha inaugurato — o chi la
applicasse per prima romperebbe un incasso.

**Con un'eccezione dentro l'eccezione:** `handle_new_user` inserisce
esplicitamente `status` e `referred_by` e `approved_via` (`20260908120000:108`).
Se la migration droppa le colonne **e** ridefinisce il trigger nella stessa
transazione, non c'e' finestra. Se il trigger si tocca separatamente, esiste un
istante in cui l'`INSERT` nomina colonne che non ci sono — **e in quell'istante
nessuno puo' creare un account, compreso chi ha appena pagato.** Una migration
sola, una transazione sola.

### 8.4 I moduli della persona che questa fase rende falsi

`access-gating.md:22-36` porta *«Le due assi, che non vanno confuse»* e il **gate
due assi**: *«`role === 'member'` senza `status === 'approved'` e' un buco»*. Il
giorno in cui la colonna sparisce, quel gate **chiede di controllare un valore che
non esiste** — e si carica su ogni risposta che tocchi `src/lib/rbac/**`,
`src/middleware.ts`, `src/app/(admin)/**`.

L'*Ordering Constraint* del ROADMAP dice *«i documenti in fondo»*, e la fase 57
possiede `DOC`. Ma `meta-gates.md` dice che **una riga che descrive male il
prodotto e' peggio di una riga assente**, *«perche' sta in un modulo che si
carica su ogni risposta: chi la legge ci costruisce sopra»* — con un precedente
datato 2026-08-25.

**I due gate si contraddicono, e la contraddizione va risolta dal piano, non
assorbita.** La lettura di questo documento: la 57 riscrive i **documenti**
(`PROJECT.md`, `STATE.md`, i moduli che *descrivono* la community), mentre un
**gate operativo che ordina un controllo impossibile** e' un difetto vivo, e i
difetti vivi vanno per primi. Se il piano lo corregge, `npm run verify:persona`
va rilanciato **dopo** la cancellazione.

### 8.5 Il debito che questa fase crea, e va dichiarato invece che scoperto

| Voce | Perche' nasce | Chi la chiude |
|---|---|---|
| `membership.card.view` perde il flag e diventa *«qualunque account»* | §1.3 | **51** (`MEM-01`), che toglie la superficie |
| `/gallery` perde `requireApproved` dalla barra | §7.2 | **52** (`NAV-02`) |
| la voce `Home` della barra | §7.2, D-50-12 | **52** (`NAV-01`) |
| `rsvps` resta in sola lettura con quattro lettori | §6.5 | nessuno programmato — **va dichiarato** |
| le categorie di mail restano nel `CHECK` senza mittenti | §7.4 | nessuno: e' storia, e va detto che lo e' |
| `scripts/container/seed.mjs` non puo' piu' seminare quattro delle sue nove persone | §1.4 | **questa fase**, o il banco di prova resta rotto |
| `MemberTable.tsx:1109` cambia sotto i piedi di `NAV-05` | §7.5 | **52** |

---

## Validation Architecture

> Il contratto di verifica di questa fase. **La prima riga e' un fatto
> d'ambiente che domina tutto il resto.**

### Il fatto che viene prima di ogni tabella

**Non esiste un test runner per il prodotto.** `package.json:5-45` non ha script
`test`, e non esiste alcun file `*.test.*` o `*.spec.*` — riverificato il
2026-09-21. **Nessun task di questa fase puo' chiudersi perche' «i test
passano».**

### Quadro degli strumenti

| Proprieta' | Valore |
|---|---|
| Framework di test | **nessuno** |
| Typecheck | `npm run build` — non esiste script `typecheck`: `next build` **e'** il gate dei tipi (`package.json:8`) |
| Gate strutturali | `npm run verify` (`scripts/verify-all.mjs`) |
| Gate delle rotte | `npm run verify:routes` — censisce `page.tsx` dal disco |
| Gate delle capability | `npm run verify:capabilities` — **si rompe se `ROLE_GRANTS` non e' aggiornato**, `EXPECTED_PAIR_COUNT = 68` (`:645`) |
| Gate della conversione | `npm run verify:conversion` — **si rompe se `/register` resta nel manifesto** (`conversion-manifest.mjs:574`) |
| Gate della persona | `npm run verify:persona` — **dopo** la cancellazione, mai prima |
| Gate dell'identita' negli header | `npm run verify:no-header-identity` — **pinna `x-user-status`**: §0/C1 |
| Ambiente di prova | **laboratorio permanente**, `npm run dev:lab`, `lab.resonatemotion.com`. Ogni script rifiuta il ref di produzione come prima riga eseguita |

**Un verde non dice «e' corretto»: dice «e' coerente».**

### Mappa requisito → verifica

| Req | Comportamento | Tipo | Comando / procedura |
|---|---|---|---|
| REG-01 | `/register` risponde 404 da anonimo e da loggato; nessun link vi rimanda | manuale + statico | `P-50-1`; grep sui sei rimandi + `verify:routes` + `verify:conversion` |
| REG-02 | nessun oggetto di database nomina `profiles.status` | **catalogo** | le tre query di §1.5(a) su laboratorio e produzione |
| REG-02 | nessun sorgente nomina i suoi simboli | statico | il grep di §1.5(b), **con il perimetro scritto accanto** |
| REG-03 | `referred_by` e `approved_via` non esistono; nessuna superficie mostra un referral | catalogo + statico | `information_schema.columns` + grep su `CopyReferralLink`, `referred_by` |
| REG-04 | un anonimo non puo' creare un account **nemmeno con la chiave anonima** | **manuale** | `P-50-5` |
| REG-04 | i tre percorsi di servizio creano ancora account | **manuale** | `P-50-6`, `P-50-2`, `P-50-7` |
| REG-05 | la lista del debito e' vuota | catalogo | §1.5(a), e il risultato **si incolla nel VERIFICATION** |
| REG-06 | una prenotazione gratuita produce N biglietti, una mail, un account e passa la porta | **manuale** | `P-50-7`, `P-50-8` |
| REG-06 | una seconda chiamata non conia biglietti nuovi | **manuale** | `P-50-7` passo 4 |
| D-50-02 | gli account cancellati non esistono piu' e il registro li ricorda | catalogo | conteggi prima/dopo di §4.3 + `select * from membership_acts where subject_id is null` |
| D-50-03 | un `member` non carica, un organizer si' | **manuale** | `P-50-4` |
| D-50-12 | `/` rimanda a `/events` per tutti | **manuale** | `P-50-1` |

### Frequenza di campionamento

- **Dopo ogni task:** `npm run build` + i grep dichiarati negli
  `acceptance_criteria` del task.
- **Dopo ogni onda:** `npm run build` + `npm run verify`. Sull'onda che tocca le
  capability, **anche** `npm run verify:capabilities`; su quella che cancella
  superfici, **anche** `npm run verify:routes` e `verify:conversion`; se si tocca
  `.claude/**`, `npm run verify:persona` **dopo** la cancellazione.
- **Prima della chiusura:** tutti verdi **piu' le otto procedure percorse sul
  laboratorio** e riportate in `50-VERIFICATION.md` con evidenza `file:riga`.

### Le otto procedure manuali — laboratorio, mai produzione

| # | Procedura | Ruolo | Cosa si deve osservare |
|---|---|---|---|
| **P-50-1** | superfici | anonimo, poi `member`, poi organizer | `/register` → **404** su tutti e tre. `/` → `/events` su tutti e tre, **compreso chi e' loggato**. `/login` raggiungibile dalla voce Account. Nessun link «Sign up» su `/login`, `SecretVenueDialog`, il banner del menu drink |
| **P-50-2** | la migration, sul laboratorio | — | conteggi di §4.3 **prima**; applicazione; rilettura **dal catalogo** (`information_schema.columns`, `pg_policies`, `pg_proc`, `pg_constraint`); le tre query di §1.5(a) a zero |
| **P-50-3** | cancellazione di un account seminato `pending` | master | l'utente Auth e il profilo spariscono; **la riga di `membership_acts` resta con `subject_id` nullo**; un account con una scansione della porta **rifiuta con la sua causa**, non con un messaggio generico |
| **P-50-4** | media | `member` leggero, poi organizer, poi staff con assegnazione | il membro **non** vede il controllo di caricamento e, se forza l'azione, riceve `MEDIA_UPLOAD_FORBIDDEN`. L'organizer carica. Lo staff assegnato carica **sulla sua serata** e non su un'altra |
| **P-50-5** | signup spento | anonimo, con `curl` e la chiave anonima | `POST /auth/v1/signup` → **422 `signup_disabled`**. **Questa e' la prova che il prodotto non puo' dare da solo**: la pagina cancellata non dimostra nulla sull'API |
| **P-50-6** | creazione in-app | master | `createAccount` crea, manda l'invito e restituisce il codice di membership **con il signup spento** |
| **P-50-7** | l'ordine gratuito, dal principio | anonimo su una serata `free_rsvp` seminata | un ordine a totale zero, N biglietti, **una** mail con QR e link firmato, un account leggero creato; **rigiocare la stessa azione non conia biglietti nuovi**; il tetto per ordine rifiuta; la capienza rifiuta; `sumup_checkout_id` **nullo** sull'ordine e sui biglietti |
| **P-50-8** | la porta, **con la radio spenta** | staff, su un telefono in modalita' aereo | un biglietto gratuito passa lo scanner come uno pagato; la coda offline lo accetta e lo sincronizza. *(`checkin-offline.md`: rifiutare un ospite valido e' peggio che ammetterne uno doppio.)* |

### Lacune dell'onda 0

- [ ] `scripts/seed-lab-door.mjs` — le persone `pending`/`rejected` (`:176-180`)
      vanno tolte **prima** di riseminare, o la semina fallisce sul `CHECK`
      mancante e nessuno capira' perche'.
- [ ] `scripts/seed-lab-door.mjs` — serve una serata `free_rsvp` **con il suo
      tier a zero**, che oggi la semina non produce: senza, `P-50-7` non e'
      eseguibile.
- [ ] `scripts/container/seed.mjs` — quattro delle nove persone diventano
      irrappresentabili (§1.4); il banco di prova va aggiornato nella stessa onda
      della migration.
- [ ] `scripts/verify-capabilities.mjs` — `ROLE_GRANTS` e `EXPECTED_PAIR_COUNT`
      vanno aggiornati **nel commit della migration**, o `npm run verify` e'
      rosso dall'onda 1 in poi.
- [ ] `scripts/conversion-manifest.mjs:574` — la riga `/register`.
- [ ] Nessun conteggio di riga e' mai stato preso. **`P-50-2` e' anche la prima
      misura**, e i suoi numeri vanno nell'autorizzazione prima di toccare la
      produzione.

---

## Security Domain

| Categoria ASVS | Si applica | Controllo |
|---|---|---|
| V2 Authentication | **si'** | `disable_signup` sul servizio Auth (§5); nessun `auth.signUp` residuo; i tre percorsi di creazione passano dal `service_role` |
| V3 Session Management | no | nessuna modifica alla sessione |
| V4 Access Control | **si'** | la RLS resta il confine; `profiles_update_own` va **ricreata conservando la guardia sul ruolo** (§1.2 riga 3); `reserve_ticket_order` resta concessa al solo `service_role` |
| V5 Input Validation | **si'** | il modulo dell'ordine gratuito e' pubblico: normalizzazione della mail come `guest-purchase-actions.ts:205,214`, `EMAIL_MAX_LENGTH`, `EMAIL_SHAPE` |
| V6 Cryptography | no | `membership_code` resta com'e' (`gen_random_bytes`) |

| Minaccia | STRIDE | Mitigazione |
|---|---|---|
| Emissione di biglietti gratuiti in massa da un endpoint pubblico | Denial of Service / Abuse | il tetto per ordine **dentro** la transazione (`20260905120100:132-136`) e la capienza del tier (`:157-163`). **Questo progetto non ha alcun limitatore di frequenza** (misurato il 2026-08-05, `20260807000000:236-238`): con REG-06 esiste per la prima volta un percorso pubblico che **conia un account e una riga di `tickets` senza che nessuno paghi**. Va dichiarato, e il tetto e' l'unica difesa |
| `profiles_update_own` ricreata perdendo il termine sul ruolo | Elevation of Privilege | il termine `role = (SELECT …)` **resta**; solo quello su `status` cade. Da verificare rileggendo `pg_policies.with_check` dopo la migration |
| `reserve_ticket_order` concessa per comodita' ad `authenticated` | Elevation of Privilege | `20260905150000` esiste per aver tolto esattamente questo su `reserve_ticket`. **Non riaprirlo** |
| Un allargamento silenzioso del caricamento media | Tampering / Information Disclosure | §3: la policy si riscrive per capability, e il restringimento sulla quarantena si **dichiara** |
| Una cancellazione di account senza traccia | Repudiation | `membership_acts` e' append-only con `subject_id ON DELETE SET NULL`; serve l'ottavo atto (§1.6, Q2) |

---

## Assumptions Log

| # | Affermazione | Sezione | Rischio se sbagliata |
|---|---|---|---|
| A1 | La versione di GoTrue dispiegata si comporta come `master` letto oggi: `disable_signup` non tocca `admin.createUser` ne' `generateLink` | §5.2 | Se il progetto gira una versione piu' vecchia che lo controlla anche li', **spegnere il signup spegne l'acquisto da ospite**. `P-50-5` + `P-50-7` sul laboratorio lo provano **prima** della produzione |
| A2 | `DROP COLUMN` su `profiles.status` droppa da solo la `CHECK` multi-colonna `profiles_role_implies_approved` | §1.2 | Se non lo fa, la migration fallisce con un errore di dipendenza — **visibile, non silenzioso**. La migration droppi il vincolo per nome, esplicitamente: costa una riga e toglie l'assunzione |
| A3 | Le policy sono dipendenze registrate e bloccano il `DROP COLUMN`; le funzioni `plpgsql` e `sql` con corpo a stringa **no** | §1.2 | Se le policy **non** bloccassero, il `DROP` riuscirebbe lasciando `profiles_update_own` rotta in silenzio. Il piano droppa e ricrea esplicitamente in entrambi i casi |
| A4 | I profili `pending`/`rejected` in produzione non hanno righe collegate che bloccano | §4 | **Non misurato.** D-50-02 chiede il conteggio prima, ed e' anche la risposta a questa |
| A5 | Un tier a prezzo 0 non produce effetti indesiderati sulle superfici che elencano i tier | §6.2 | Un tier gratuito visibile sulla pagina di una serata a pagamento sarebbe un errore di prodotto. `events/[slug]/page.tsx` dirama gia' su `access_type`, ma **va riletto** |
| A6 | `event_media.party_id` e' nullabile | §3.2 | Se fosse `NOT NULL`, il ramo `p_party_id` della policy proposta e' sempre valutabile e l'assunzione e' innocua |
| A7 | `has_capability` accettata con **due** argomenti dentro una policy non fa fallire il comparatore della fase 32 | §3.2 | Gate rosso a fine onda. Da rileggere prima di scrivere la policy |
| A8 | Nessuna cache di service worker in produzione serve `/register` o la vecchia home | §7.3 | Basso: `sw.ts:129-158` cancella i documenti in cache a ogni rilascio |

---

## Open Questions (RESOLVED — tutte risolte in 50-CONTEXT.md: Q1→D-50-18b, Q2→D-50-16 atto `deleted`, Q3→D-50-22, Q4→D-50-26, Q5→D-50-23, Q6→D-50-25)

1. **Nome e cognome sul modulo dell'ordine gratuito.**
   Cosa sappiamo: il modulo d'acquisto raccoglie **solo** la mail (§0/C6), e
   `D-49-03` dice che il biglietto e' **al portatore** e che un nome sullo schermo
   dello staff *«fa rifiutare un ospite valido oppure diventa teatro»*.
   Cosa non e' chiaro: se *«nome, cognome e mail»* sia una richiesta o una
   descrizione errata del modulo esistente.
   Raccomandazione: **chiedere al proprietario prima del piano.** Una serata
   gratuita con nome e cognome e una a pagamento senza sarebbero due percorsi che
   si somigliano e non coincidono — e la fase esiste per farli coincidere.

2. **L'ottavo atto del registro.**
   Cosa sappiamo: il `CHECK` su `membership_acts.act` porta sette valori
   (`20260808002000:174-183`); `community-membership.md` pretende che chi decide
   sia tracciato.
   Cosa non e' chiaro: se una cancellazione debba lasciare una riga.
   Raccomandazione: **si'**, valore `deleted`, nella stessa migration — allargare
   un `CHECK` e' additivo e non puo' fallire sui dati. Il `subject_label` (codice
   di membership, **mai un indirizzo**) sopravvive al soggetto per costruzione.

3. **Lo storico di `rsvps`.**
   Cosa sappiamo: quattro lettori, di cui due sono il cron dei promemoria e la
   rivelazione del venue (§6.5); convertirlo in biglietti conia QR validi alla
   porta per persone che non li hanno ricevuti.
   Raccomandazione: **sola lettura**, e la capienza somma le due sorgenti finche'
   lo storico esiste. Ma **e' misurabile**: se in produzione `rsvps` ha zero
   righe, la domanda non esiste. Da contare in `P-50-2`.

4. **Il tetto su una serata gratuita.**
   Cosa sappiamo: il tetto e' `max_tickets_per_order`, default 6, per serata.
   Cosa non e' chiaro: se sei posti gratuiti con un clic siano la stessa cosa di
   sei biglietti con un pagamento.
   Raccomandazione: lasciare 6 e **dichiararlo**, oppure chiedere. La colonna e'
   per serata, quindi la risposta non richiede una migration.

5. **`membership.card.view` per una fase.**
   Cosa sappiamo: perde il flag e diventa *«qualunque account»* (§1.3); la 51 la
   rimuove per intero.
   Cosa non e' chiaro: se una membership card visibile a chi ha comprato un
   biglietto sia accettabile per una fase.
   Raccomandazione: **si'**, dichiarandolo come debito con il nome della fase che
   lo chiude. Anticiparla qui significherebbe toccare la porta, e *«la porta non
   e' mai in pacchetto»*.

6. **Se correggere `access-gating.md` qui o nella 57.**
   §8.4 espone i due gate che si contraddicono. **Domanda per il proprietario**,
   non per il pianificatore: e' una decisione sull'ordine della milestone.

---

## Environment Availability

| Dipendenza | Serve a | Disponibile | Verifica |
|---|---|---|---|
| laboratorio Supabase permanente | tutte le otto procedure | **si'** | `v1.6-LAB-DESIGN.md`; `npm run dev:lab`; ogni script rifiuta il ref di produzione come prima riga eseguita |
| `lab.resonatemotion.com` | `P-50-7` (mail vera), `P-50-8` (telefono) | **si'** | `v1.6-LAB-DESIGN.md`, dominio legato al ramo `lab` |
| Resend di produzione | la mail dell'ordine gratuito | **si'**, per decisione | una mail vera a un indirizzo del proprietario |
| SumUp | **nessuna** — REG-06 non lo attraversa | — | ed e' una proprieta' della fase, non un'assenza |
| Management API Supabase | la migration e il `PATCH /config/auth` | **si'** | sotto autorizzazione datata |
| un telefono con la radio spegnibile | `P-50-8` | **si'** | precedente: fase 49, iPhone in modalita' aereo |

---

## Sources

### Primarie (HIGH)

- Le 86 migration sotto `supabase/migrations/` — lette direttamente; ogni
  affermazione di schema porta `file:riga`. `supabase/schema.sql` citato **solo**
  dove e' l'ultima definizione (`rsvps`, `tickets.user_id`), e dichiarato ogni
  volta (Guardrail 3).
- L'albero `src/` e `scripts/`, letto con `/usr/bin/grep` (Guardrail 6 + memoria
  sul grep cieco).
- `supabase/auth`, ramo `master`, `internal/api/{signup,external,admin,mail,otp,invite,token,verify,recover,magic_link}.go` —
  letti via `raw.githubusercontent.com` il 2026-09-21. **`DisableSignup` compare
  in due soli punti.**
- *Update auth service config*, Management API Supabase — il campo
  `disable_signup` nel corpo di `PATCH /v1/projects/{ref}/config/auth`.
- *General configuration*, documentazione Supabase Auth — «Allow new users to
  sign up».
- `.planning/phases/49-comprare-senza-account/49-AUTHORISATION.md`,
  `49-ESITI.md`, `49-VALIDATION.md`; `.planning/v1.6-LAB-DESIGN.md`;
  `.planning/todos/pending/profiles-email-not-unique.md`.
- `CLAUDE.md`, `.claude/rules/{meta-gates,access-gating,community-membership}.md`.

### Secondarie (MEDIUM)

- Nessuna. Ogni affermazione tecnica di questo documento e' letta da un file di
  questo albero o dal sorgente di GoTrue.

### Terziarie (LOW)

- Nessuna.

### Cio' che NON e' stato misurato, e va detto

**Nessuna query e' stata eseguita**, ne' sulla produzione ne' sul laboratorio.
Tutti i conteggi di riga di §4.3 sono **assenti**, non stimati. Il piano li
prende in `P-50-2` e li porta nell'autorizzazione.

---

## Metadata

**Ripartizione della confidenza:**

- Inventario di `status` — **HIGH**: letto dalle migration, con l'ultima
  definizione identificata per ciascun oggetto, e un falso positivo (`p.status`
  superato in `venue_for_parties`) nominato esplicitamente.
- Referral e superfici — **HIGH**: grep esaustivi, due rimandi a `/register` in
  piu' rispetto al contesto.
- Cascate di cancellazione — **HIGH sul testo delle migration**, MEDIUM come
  descrizione del database vivo: l'autorevole e' `pg_constraint`, e il piano deve
  leggerlo.
- Signup di Supabase — **HIGH sul sorgente**, MEDIUM sulla versione dispiegata
  (A1).
- REG-06 — **HIGH sui vincoli**, e i tre ostacoli sono citati per riga. La scelta
  fra tier sintetico e colonna nullabile e' **argomentata, non decisa**.
- Conteggi di riga — **ASSENTI**, dichiarati tali.

**Data della ricerca:** 2026-09-21
**Valida fino a:** 2026-10-21 per le letture di schema e codice (questo albero si
muove in fretta: quattro affermazioni della fase 49 erano gia' false un mese
dopo). **7 giorni** per A1, che dipende da una versione di servizio che non
controlliamo.
