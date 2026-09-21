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
- **D-50-16 — Togliere l'accesso = cancellare l'account** (discrezione di
  Claude, esercitata): utente Auth e profilo via, i biglietti restano legati
  all'ordine. `deactivateMember`, `reactivateMember`, `approveMember`,
  `rejectMember` e le bulk spariscono; la pagina membri diventa una lista di
  account con ruolo, con «crea account» e «cancella account». Nessun nuovo
  interruttore su un altro asse (niente ban Auth con profilo vivo).
- **D-50-17 — La newsletter resta**: e' una mailing list, non un account.

### RSVP come ordine gratuito (REG-06)
- **D-50-18 — L'RSVP di una serata `free_rsvp` e' un ordine a totale zero.**
  Parole del proprietario: *«dev'essere uguale a comprare un ticket ma senza
  acquisto»*. L'ospite mette nome, cognome e mail — gli stessi campi del
  modulo d'acquisto della 49 — riceve la **stessa mail** con QR e link firmato,
  ottiene lo **stesso account leggero**, e passa dalla **stessa porta**.
- **D-50-19 — Nessun passaggio da SumUp.** L'ordine nasce `completed` e i
  biglietti si emettono subito con `reserve_ticket_order`, nello stesso
  ordine della 49 (identita' → conio → mail). Vale lo stesso tetto per ordine
  e la stessa capienza.
- **D-50-20 — Vale per tutti**, loggati compresi: un solo percorso, con la
  mail precompilata per chi ha sessione. Il pulsante `RsvpButton` e la tabella
  `rsvps` non ricevono piu' scritture nuove; cosa farne dello storico e'
  discrezione di Claude (vedi sotto).

### Produzione
- **D-50-21 — Migration in produzione oggi**, dopo la prova sul laboratorio:
  prima il laboratorio con la procedura scritta e percorsa, poi la produzione
  sotto la terza autorizzazione datata, con il conteggio delle righe cancellate
  scritto prima e verificato dopo.

### Claude's Discretion
- La forma tecnica dell'ordine gratuito: `ticket_orders.sumup_checkout_id` e'
  `UNIQUE NOT NULL` (migration `20260905120000`) — nullable con vincolo
  parziale, o un valore sintetico, lo decide il piano. Conta che l'idempotenza
  del pagamento non si indebolisca per gli ordini pagati.
- Lo storico della tabella `rsvps`: resta in sola lettura o si converte in
  biglietti gratuiti. Vincolo: il conteggio della capienza deve includere i
  biglietti a zero.
- Testi delle superfici che cambiano, in inglese, dentro il perimetro deciso.
- L'ordine dei piani e la divisione in onde: la migration del laboratorio
  viene prima di qualunque superficie, perche' e' la cosa che puo' fallire.

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
