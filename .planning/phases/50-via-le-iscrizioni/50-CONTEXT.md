# Phase 50: Via le iscrizioni - Context

**Gathered:** 2026-09-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Nessuno si iscrive piu' da solo. Entrano gli account creati dentro l'app (i
quattro ruoli) e chi compra o e' invitato rientra con l'**account leggero**
della fase 49. Lo stato `pending` — e con lui l'intera colonna `status`, le sue
mail, le sue superfici, il referral e la pagina di iscrizione — sparisce dal
prodotto e dal database. La home attuale non esiste piu'. **E l'RSVP di una
serata gratuita diventa un ordine a totale zero**, con gli stessi pezzi
dell'acquisto: modulo, mail con QR, link firmato, porta.

Requisiti: `REG-01`…`REG-05` dal ROADMAP, piu' `REG-06` (RSVP come ordine
gratuito) aggiunto in questa discussione per decisione del proprietario.

Il listing pubblico della prima serata in vendita e' atteso per **lunedi' 28
settembre 2026**: la fase si chiude prima, e la migration va in produzione
**oggi**, dopo il laboratorio.

</domain>

<decisions>
## Implementation Decisions

### Lo stato nel database
- **D-50-01 — La colonna `status` va via del tutto.** Colonna
  `profiles.status`, funzione `public.get_user_status()`, colonna
  `role_capabilities.requires_approved` (e il ramo che la legge in
  `has_capability`), ogni policy che confronta lo stato (35 riferimenti in 10
  migration, contati il 2026-09-21), il vincolo `CHECK`, il default. In una
  migration nuova, **provata prima sul laboratorio** con procedura scritta.
  Lato codice: `STATUSES` e `UserStatus` in `src/lib/rbac/roles.ts`, l'header
  `x-user-status`, ogni `select("role, status")`, `isPendingOrRejected` sul
  dashboard.
- **D-50-02 — Gli account oggi in `pending` o `rejected` si cancellano**:
  utente Auth e profilo. Prima si **contano** (per stato) e si controllano le
  righe collegate (guest list, biglietti, rsvp, media): il conteggio finisce
  nel piano e nell'autorizzazione. E' irreversibile e scrive in produzione:
  vale la **terza autorizzazione datata**, le due della fase 49 sono esaurite.
- **D-50-03 — I media li caricano solo organizer e staff.** Le policy su
  `event_media` che chiedevano `status = 'approved'` si riscrivono **per
  ruolo/capability**, non per «utente loggato». Il caricamento dei membri
  sparisce in questa fase: `MediaUpload` e `MyMediaSection` escono dal
  dashboard, la quarantena e la revisione dell'organizer restano com'erano.
- **D-50-04 — REG-05 si chiude a zero.** Con la colonna via non sopravvive
  alcun cancello su `status`: la lista del debito per 51/57 e' **vuota**, e
  il VERIFICATION lo dichiara con il grep che lo prova.

### Chi entra ancora
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

### Referral e trigger
- **D-50-08 — Via `profiles.referred_by`, la logica di referral in
  `handle_new_user`, `CopyReferralLink` e ogni «Invite a friend».** Il trigger
  resta solo per creare il profilo con il ruolo che arriva dai metadati.
  `membership_code` **resta**: e' la credenziale della porta e la toglie la 51.
- **D-50-09 — Via `profiles.approved_via`.** La fase 49 aveva gia' deciso di
  non contare l'ingresso dalla cassa su quella colonna.
- **D-50-10 — Via la pagina `members/growth`** e le query di analytics che
  leggono stato o referral (`member-queries.ts`, `MemberGrowthChart`,
  `GrowthSummaryCard`).

### Cosa vede chi cerca di iscriversi
- **D-50-11 — `/register` sparisce: 404.** Con lei **tutto cio' che vi
  rimanda**: il `Join` in home, il chip Register in `SecretVenueDialog.tsx:237`,
  il redirect in `RsvpButton.tsx:67`, ogni link nelle mail. Nessun redirect.
- **D-50-12 — La home attuale non esiste piu'.** `src/app/page.tsx` va via e
  `/` rimanda a `/events` **per tutti**, anche per chi e' loggato (oggi va al
  dashboard). Impatto sulla 52: la voce Home di NAV-01 perde senso — segnato
  in deferred, si decide li'.
- **D-50-13 — `/login` resta**, raggiungibile dalla voce Account della barra
  quando non si e' loggati. Il testo «Don't have an account?» diventa
  «Bought a ticket? Use the link in your email». Interfaccia in inglese.
- **D-50-14 — Via le quattro mail**: `registration-confirmation`,
  `member-approved`, `member-rejected`, `member-reactivated`. Restano
  `account-invitation` (account creati in-app) e le mail dell'ordine.
- **D-50-15 — Il dashboard dell'account leggero** mostra biglietti e token
  drink, nessun avviso di stato. Membership card e presenze restano alla 51.
- **D-50-16 — Togliere l'accesso = cancellare l'account, e l'azione puo'
  rifiutare** (rivisto il 2026-09-21 dopo la ricerca, decisione del
  proprietario). `tickets.user_id` e' `ON DELETE CASCADE` (migration
  `20260225110000:27`) e sette vincoli `NO ACTION`/`RESTRICT` bloccano chi ha
  lavorato (guest list, assegnazioni, scansioni, artisti, venue, rimborsi,
  check-in — `50-RESEARCH.md` §4.1). Quindi: **si cancella solo un account
  senza biglietti e senza tracce di lavoro**; altrimenti l'azione **rifiuta e
  dice la causa** («ha 3 biglietti», «ha assegnazioni»), mai un errore
  generico. Nessun cambio alla cascata ne' allo schema del denaro. La
  cancellazione lascia una riga nel registro (`membership_acts.act = 'deleted'`,
  `CHECK` allargato nella stessa migration). `deactivateMember`,
  `reactivateMember`, `approveMember`, `rejectMember` e le bulk spariscono; la
  pagina membri diventa una lista di account con ruolo, con «crea account» e
  «cancella account». Nessun nuovo interruttore su un altro asse (niente ban
  Auth con profilo vivo). **Per i `pending`/`rejected` di D-50-02 vale la
  stessa regola:** si misurano prima (le sei query di §4.3); chi ha biglietti o
  tracce **non si cancella** e viene riportato al proprietario, non forzato.
- **D-50-17 — La newsletter resta**: e' una mailing list, non un account.

### RSVP come ordine gratuito (REG-06)
- **D-50-18 — L'RSVP di una serata `free_rsvp` e' un ordine a totale zero.**
  Parole del proprietario: *«dev'essere uguale a comprare un ticket ma senza
  acquisto»*. L'ospite riceve la **stessa mail** con QR e link firmato, ottiene
  lo **stesso account leggero**, e passa dalla **stessa porta**.
- **D-50-18b — `Full name` e mail su ENTRAMBI i moduli** (deciso il
  2026-09-21, dopo che la ricerca ha misurato che il modulo della 49 raccoglie
  solo la mail — `50-RESEARCH.md` §0/C6, §6.6). Il modulo a pagamento e quello
  gratuito chiedono gli stessi due campi: `Full name` (un campo solo) e mail.
  Il nome va **nell'account** (`createUser({ user_metadata: { full_name } })`,
  come gia' fa il percorso guest list, `process-entry.ts:238-242`, e da li' in
  `profiles.full_name`) e **mai sul biglietto**: `holder_label` resta un
  progressivo, il biglietto resta al portatore (`D-49-03`), lo schermo dello
  staff non mostra un nome. Se l'account esiste gia' e ha un nome, il nome
  nuovo non lo sovrascrive. La mail dell'ordine puo' salutare per nome.
- **D-50-19 — Nessun passaggio da SumUp.** L'ordine nasce **`pending`** e la
  RPC `reserve_ticket_order` lo chiude a `completed` emettendo i biglietti
  (nascere `completed` cadrebbe nel ramo idempotente e non emetterebbe nulla —
  `50-RESEARCH.md` §6.4). Stessa sequenza della 49: identita' → conio → mail,
  ma sincrona, dentro l'azione. `sumup_checkout_id` diventa **nullable** con
  indice unico parziale (non un valore sintetico: il cron di riconciliazione
  interrogherebbe SumUp ogni giorno per ogni biglietto gratuito — §6.3).
  L'ordine gratuito ha un **tier a prezzo 0** sulla serata, rappresentabile
  senza toccare lo schema (§6.2). La RPC resta concessa al solo `service_role`.
  Vale lo stesso tetto per ordine (default 6, **dichiarato**, per serata) e la
  stessa capienza.
- **D-50-20 — Vale per tutti**, loggati compresi: un solo percorso, con la
  mail precompilata per chi ha sessione. Il pulsante `RsvpButton` e la tabella
  `rsvps` non ricevono piu' scritture nuove; cosa farne dello storico e'
  discrezione di Claude (vedi sotto).

### Produzione
- **D-50-21 — Migration in produzione oggi**, dopo la prova sul laboratorio:
  prima il laboratorio con la procedura scritta e percorsa, poi la produzione
  sotto la terza autorizzazione datata, con il conteggio delle righe cancellate
  scritto prima e verificato dopo.

### Decisioni prese dopo la ricerca (2026-09-21, discrezione esercitata)
- **D-50-22 — Lo storico di `rsvps` resta in sola lettura.** Nessuna scrittura
  nuova; i quattro lettori (§6.5, fra cui la rivelazione del venue e il cron
  dei promemoria) continuano a leggerlo; la capienza somma biglietti e rsvp
  storici finche' lo storico esiste. Non si converte in biglietti: conierebbe
  QR validi per persone che non li hanno ricevuti. Le righe si contano in
  `P-50-2`: se sono zero, il debito e' vuoto.
- **D-50-23 — `membership.card.view` perde `requires_approved` e diventa
  «qualunque account»** per questa fase: e' debito dichiarato con il nome della
  fase che lo chiude (51). Anticipare la rimozione toccherebbe la porta, e la
  porta non e' mai in pacchetto.
- **D-50-24 — Il verso del deploy e' codice PRIMA, migration DOPO** (§8.3):
  la migration prima aprirebbe una finestra `42703` sul webhook dei pagamenti.
  L'inversione va scritta dentro la migration, come `20260809006000`.
  `handle_new_user` si ridefinisce **nella stessa transazione** del
  `DROP COLUMN`. Il codice dispiegato deve reggere per la durata della finestra
  la colonna ancora presente (non la legge, non la scrive).
- **D-50-25 — I moduli della persona che questa fase rende falsi si
  correggono in questa fase, nell'ultima onda, dopo la cancellazione** (§8.4):
  `access-gating.md` (gate dei due assi che ordina un controllo su una colonna
  che non esiste piu'), `community-membership.md` per la parte meccanica,
  `meta-gates.md` se nomina `pending`. Un gate che ordina un controllo
  impossibile e' un gate falso su ogni caricamento, e la 57 riscrive i
  **documenti** che difendono la community, non un gate meccanico. Versione e
  changelog nello stesso commit; `verify:persona` **dopo** la cancellazione.
- **D-50-26 — Tetto per una serata gratuita: 6, come a pagamento**, per
  serata, modificabile dall'organizer come oggi. Dichiarato, non chiesto.
- **D-50-27 — Le premesse smentite dalla ricerca (§0) valgono corrette**:
  gli oggetti di database che leggono `status` sono **undici**, non
  trentacinque (§1.2); `x-user-status` non esiste (e' una `delete` di igiene
  pinnata da `verify:no-header-identity`, che va aggiornato o lasciato
  coerente); il caricamento media dei membri e' **gia' morto** per il difetto
  di `may-upload.ts:265-281` (tabella `attendance` inesistente) e D-50-03 si
  esegue **rimuovendo** quel percorso e riscrivendo per ruolo ciò che resta,
  non riscrivendo policy che non chiedono `status`; il trigger non legge alcun
  ruolo dai metadati e va riscritto come dice §1; i rimandi a `/register` sono
  **sei** piu' `next.config.ts:66` (`/registrati`, redirect permanente, quindi
  in cache: va tolto e la 404 va provata anche da un browser che l'aveva
  seguito) e `public/manifest.json:5` (`start_url: "/"`).
- **D-50-28 — I gate meccanici del repo si aggiornano nello stesso commit
  della cosa che cambiano**: `scripts/verify-capabilities.mjs` (`ROLE_GRANTS`,
  `EXPECTED_PAIR_COUNT`), `scripts/conversion-manifest.mjs` (riga `/register`),
  `scripts/container/seed.mjs` e `scripts/seed-lab-door.mjs` (persone con
  stato non piu' rappresentabile), `scripts/verify-routes.mjs`. Un gate rosso
  lasciato indietro e' un gate che nessuno rilancia.

### Claude's Discretion
- Testi delle superfici che cambiano, in inglese, dentro il perimetro deciso.
- L'ordine dei piani e la divisione in onde, con questi vincoli: la migration
  si prova sul laboratorio prima di qualunque superficie; il codice si spinge
  prima della migration di produzione (D-50-24); i moduli della persona
  chiudono (D-50-25).
- La forma esatta dell'indice unico parziale su `sumup_checkout_id` e del
  tier a prezzo 0 (creato dall'organizer sulla serata, o automatico alla prima
  RSVP: lo decide il piano, purche' non sia una seconda strada per emettere
  biglietti fuori dalla RPC).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Il perno e le fasi vicine
- `.planning/ROADMAP.md` — Phase 50 (requisiti REG-01…06), *Decisions Fixed
  Before Planning* (perno, nodo legale chiuso, inglese), *Ordering
  Constraints* (49 prima di 50; il perno prima dell'impianto), *Il gate della
  verifica*.
- `.planning/phases/49-comprare-senza-account/49-CONTEXT.md` — l'account
  leggero, «Completa il tuo account», il gate dei due assi (`member` non e'
  `approved`), il divieto di contare su `status`.
- `.planning/phases/49-comprare-senza-account/49-ESITI.md` — le prove
  percorse, `P-CODE-4` (trigger guest list), la corsa del webhook.
- `.planning/phases/49-comprare-senza-account/49-AUTHORISATION.md` — la forma
  di un'autorizzazione datata a scrivere in produzione (le prime due,
  esaurite).
- `.planning/todos/pending/guest-ticket-purchase.md` — le sei decisioni
  dell'acquisto da ospite.
- `.planning/todos/pending/profiles-email-not-unique.md` — la mail sui profili
  non e' unica: da tenere presente quando si tocca il trigger.

### I gate di dominio
- `.claude/rules/access-gating.md` — middleware e' UX, RLS e' sicurezza; il
  gate dei due assi.
- `.claude/rules/community-membership.md` — la politica che questa fase
  smonta: nessuna corsia grigia, chi decide e' tracciato.
- `.claude/rules/meta-gates.md` — guardie monotone, zero fallimenti
  silenziosi, verifica in un repo senza test.

### Il laboratorio
- `.planning/v1.6-LAB-DESIGN.md` — il secondo database, `npm run dev:lab`,
  il rifiuto del ref di produzione come prima riga di ogni script.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `reserve_ticket_order(uuid, text)` (migration `20260905120100`): conio
  transazionale e ripetibile dei biglietti di un ordine — e' il cuore
  dell'ordine gratuito.
- `src/lib/tickets/guest-identity.ts` — crea o ritrova l'account leggero con
  `auth.admin.createUser`; `src/lib/auth/password-set-link.ts` — il link
  «Completa il tuo account».
- `src/lib/tickets/order-confirmation.ts` — la mail dell'ordine con QR e link
  firmato, dentro il registro `email_deliveries`.
- `src/app/(public)/events/[slug]/guest-purchase-actions.ts` — il modulo e
  la validazione dell'acquisto (normalizzazione mail, tetto, capienza):
  l'ordine gratuito e' la stessa azione senza il checkout.
- `src/app/(admin)/admin/members/actions.ts:2321` — `createAccount`, il
  percorso in-app della fase 43 che resta l'unico modo di creare staff.

### Established Patterns
- Ogni scrittura in produzione fuori dal deploy passa da un'autorizzazione
  datata e da una procedura percorsa prima sul laboratorio.
- Le policy si scrivono per capability (`has_capability`), non per ruolo
  cablato: togliere `requires_approved` semplifica il predicato, non lo
  sostituisce.
- `npm run build` + `verify:routes` + `verify:persona` (dopo la
  cancellazione delle superfici, mai prima).

### Integration Points
- `supabase/schema.sql:60-61` (`status`, `referred_by`) e
  `handle_new_user` (`schema.sql:89+`, ridefinito in
  `20260225000000_phase3_referral.sql` e `20260908120000`): il trigger va
  riscritto senza referral e senza stato.
- `20260807000000_capability_model.sql:399-405` — le dieci righe con
  `requires_approved = true`.
- `20260225120000_phase7_media.sql`, `20260809004600_event_media_quarantine_bucket.sql`
  — le policy media da riscrivere per ruolo.
- `src/lib/supabase/middleware.ts` (`x-user-status`), `src/lib/rbac/roles.ts`
  (`STATUSES`, `UserStatus`, nav per stato), `src/lib/routes/capability-routes.ts`.
- `src/app/page.tsx` (via), `src/app/(auth)/register/page.tsx` (via),
  `src/app/(auth)/login/page.tsx` (testo), `src/components/layout/AppNav.tsx`
  (Account → login da anonimo).
- `src/app/(public)/events/[slug]/RsvpButton.tsx`, `SecretVenueDialog.tsx`,
  `page.tsx` — l'RSVP diventa il modulo dell'ordine gratuito.
- `src/components/admin/MemberTable.tsx` (107 righe che nominano stato o
  approvazione), `src/app/(admin)/admin/(work)/members/**` (growth, register).
- `src/emails/` — quattro file da cancellare, e `src/lib/email.ts` che li
  registra.

</code_context>

<specifics>
## Specific Ideas

- «dev'essere uguale a comprare un ticket ma senza acquisto» — l'RSVP.
- «la home page attuale non deve piu' esistere, la nuova home page dovra'
  essere la pagina degli eventi».
- Login: «Bought a ticket? Use the link in your email».

</specifics>

<deferred>
## Deferred Ideas

- **Un ruolo dedicato a chi compra** (`customer`): capacita' nuova, non in
  questa fase. Il ruolo `member` resta fino alla 51.
- **NAV-01 (fase 52)**: con `/` che rimanda a `/events`, la voce Home della
  barra perde senso. Da decidere nella 52.
- **Uno strumento per correggere la mail di un ordine fallito e rigiocarlo**
  (nota di esercizio della 49): fuori perimetro.

### Reviewed Todos (not folded)
- `profiles-email-not-unique.md` — non risolto qui; il piano che riscrive il
  trigger deve pero' rileggerlo e non introdurre un `LIMIT 1`.
- `external-occupancy-calendar-key.md`, `secret-venue-three-surfaces.md`,
  `form-untick-venue-secret-leaves-no-trace.md`, `google-pay-deferred-by-decision.md`
  — corrispondenza solo per parola chiave, fuori dominio.

</deferred>

---

*Phase: 50-via-le-iscrizioni*
*Context gathered: 2026-09-21*
