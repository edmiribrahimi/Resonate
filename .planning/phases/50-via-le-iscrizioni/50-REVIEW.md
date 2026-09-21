---
phase: 50-via-le-iscrizioni
reviewed: 2026-09-21T17:03:39Z
depth: deep
files_reviewed: 79
files_reviewed_list:
  - next.config.ts
  - public/manifest.json
  - scripts/container/seed.mjs
  - scripts/conversion-manifest.mjs
  - scripts/rls-baseline-compare.mjs
  - scripts/rls-baseline.mjs
  - scripts/seed-lab-door.mjs
  - scripts/verify-capabilities.mjs
  - scripts/verify-dialogs.mjs
  - scripts/verify-touch-targets.mjs
  - src/app/(admin)/admin/(work)/artists/page.tsx
  - src/app/(admin)/admin/(work)/events/[id]/assignments/page.tsx
  - src/app/(admin)/admin/(work)/events/[id]/tickets/page.tsx
  - src/app/(admin)/admin/(work)/events/new/page.tsx
  - src/app/(admin)/admin/(work)/layout.tsx
  - src/app/(admin)/admin/(work)/members/growth/loading.tsx
  - src/app/(admin)/admin/(work)/members/growth/page.tsx
  - src/app/(admin)/admin/(work)/members/page.tsx
  - src/app/(admin)/admin/(work)/members/register/page.tsx
  - src/app/(admin)/admin/(work)/venues/page.tsx
  - src/app/(admin)/admin/events/actions.ts
  - src/app/(admin)/admin/members/MemberActionNotice.tsx
  - src/app/(admin)/admin/members/actions.ts
  - src/app/(admin)/admin/scanner/DoorSurface.tsx
  - src/app/(auth)/login/page.tsx
  - src/app/(auth)/register/page.tsx
  - src/app/(members)/attendance/page.tsx
  - src/app/(members)/dashboard/page.tsx
  - src/app/(members)/membership-card/loading.tsx
  - src/app/(members)/membership-card/page.tsx
  - src/app/(public)/artists/[slug]/page.tsx
  - src/app/(public)/events/[slug]/FreeOrderForm.tsx
  - src/app/(public)/events/[slug]/PendingIntentHandler.tsx
  - src/app/(public)/events/[slug]/RsvpButton.tsx
  - src/app/(public)/events/[slug]/SecretVenueDialog.tsx
  - src/app/(public)/events/[slug]/TierSelection.tsx
  - src/app/(public)/events/[slug]/free-order-actions.ts
  - src/app/(public)/events/[slug]/guest-purchase-actions.ts
  - src/app/(public)/events/[slug]/menu/GuestLoginBanner.tsx
  - src/app/(public)/events/[slug]/menu/page.tsx
  - src/app/(public)/events/[slug]/page.tsx
  - src/app/(public)/events/[slug]/rsvp-actions.ts
  - src/app/(public)/events/page.tsx
  - src/app/(public)/gallery/page.tsx
  - src/app/(public)/newsletter/page.tsx
  - src/app/(public)/payment/callback/actions.ts
  - src/app/(public)/tickets/[id]/page.tsx
  - src/app/(public)/tickets/page.tsx
  - src/app/api/cron/retry-failed-orders/route.ts
  - src/app/api/webhooks/sumup/route.ts
  - src/app/page.tsx
  - src/components/admin/MemberTable.tsx
  - src/components/analytics/GrowthSummaryCard.tsx
  - src/components/analytics/MemberGrowthChart.tsx
  - src/components/layout/AppNav.tsx
  - src/components/media/MyMediaSection.tsx
  - src/components/membership/CopyReferralLink.tsx
  - src/components/membership/MembershipCardView.tsx
  - src/emails/member-approved.tsx
  - src/emails/member-reactivated.tsx
  - src/emails/member-rejected.tsx
  - src/emails/registration-confirmation.tsx
  - src/emails/rsvp-confirmation.tsx
  - src/emails/templates/registration-confirmation.html
  - src/lib/analytics/cross-event-queries.ts
  - src/lib/analytics/member-queries.ts
  - src/lib/capabilities/server.ts
  - src/lib/email-delivery/categories.ts
  - src/lib/guest-list/process-entry.ts
  - src/lib/media/may-upload.ts
  - src/lib/membership/acts.ts
  - src/lib/rbac/roles.ts
  - src/lib/routes/capability-routes.ts
  - src/lib/routes/next-redirect.ts
  - src/lib/supabase/middleware.ts
  - src/lib/tickets/buyer-input.ts
  - src/lib/tickets/guest-identity.ts
  - src/lib/tickets/order-quote.ts
  - src/lib/tickets/replay-order-delivery.ts
  - src/types/database.ts
  - supabase/migrations/20260921120000_drop_status_and_referral.sql
  - supabase/migrations/20260921120100_free_order.sql
findings:
  critical: 1
  warning: 0
  info: 2
  total: 3
status: issues_found
---

# Fase 50 — via le iscrizioni: rapporto di revisione del codice

**Rivisto:** 2026-09-21T17:03:39Z
**Profondita':** deep (cross-file, catena di chiamata seguita fino allo schema)
**File rivisti:** 79
**Stato:** issues_found

## Sintesi

Rivisto l'intero diff della fase (64 file, 16 cancellati) contro `d090bca`, con
peso maggiore sul percorso del denaro, sull'accesso e sulla segretezza del
venue, come richiesto.

Sul percorso del denaro proprio (`guest-purchase-actions.ts`,
`free-order-actions.ts`, il webhook, `order-quote.ts`, `guest-identity.ts`,
`payment/callback/actions.ts`, `retry-failed-orders`,
`replay-order-delivery.ts`) non ho trovato regressioni: la verifica `getCheckout`
resta l'unica fonte di verita' sullo stato di un pagamento, l'idempotenza sui
quattro punti dichiarati e' intatta, `reserve_ticket_order` resta raggiungibile
**solo** dal client di servizio (nessun `GRANT` nuovo nella migration), e ogni
punto che passa `sumup_checkout_id` a SumUp o al cron di rigioco lo guarda per
`null` prima di chiamare il fornitore. I tre controlli indipendenti che
impediscono a `reserveFreeTickets` di emettere biglietti su una serata a
pagamento o su un livello diverso da zero (`party.access_type`, il filtro
`price = 0` sul livello, `quote.totalAmount !== 0`) sono tutti presenti e non
si deducono l'uno dall'altro.

Su `deleteAccount` (`admin/members/actions.ts`): il cancello e' server-side
(`staff.manage` via `verifyAdminOrOrganizer`), le tredici famiglie di rifiuto in
`BLOCKING_SETS` sono censite **prima** di scrivere, la riga di
`membership_acts` si scrive **prima** della cancellazione dell'utente Auth (mai
dopo), e `assertSubjectActionable` rifiuta sia l'auto-cancellazione sia la
cancellazione di un `master` senza mai interrogare il database per la seconda
regola. Nessuna frase generica: ogni causa ha la propria fila di log e la
propria frase in `MemberActionNotice`.

Su `SecretVenueDialog.tsx` e `events/[slug]/page.tsx`: la rimozione del ramo
legato all'approvazione non tocca il predicato di segretezza — che resta
interamente in `venue-disclosure.ts` — e nessuno dei siti toccati mostra mai un
indirizzo. Il percorso della prenotazione gratuita produce righe reali in
`tickets` attraverso la stessa `reserve_ticket_order` del percorso pagato,
quindi la rivelazione per titolare si comporta identica sui due percorsi;
`venue_reveal_on_purchase` non e' scritto ne' letto da nessun file di questa
fase, coerente con la dichiarazione della fase che lo storico di rivelazione
resta quello di sempre.

Le due migration sono state lette riga per riga: la policy anti-escalation
(`profiles_update_own`) mantiene il vincolo sul ruolo, le quattro policy di
storage trovate dal laboratorio restano sul solo ruolo (nessun allargamento
reale, dato il `CHECK profiles_role_implies_approved` gia' in vigore),
`has_capability` perde solo il congiunto sullo stato, e l'indice unico parziale
su `sumup_checkout_id` e' — per aritmetica, non per promessa — lo stesso vincolo
di prima sulle righe che un checkout ce l'hanno.

**Un difetto Critical emerge pero' dalla combinazione fra il nuovo livello a
prezzo zero introdotto da REG-06 e il codice, non toccato da questa fase, che
elenca e vende i livelli di una serata a pagamento**: descritto sotto.

## Problemi Critical

### CR-01: Il livello «RSVP» a prezzo zero resta in vendita quando una serata smette di essere gratuita

**File:** `src/app/(admin)/admin/events/actions.ts:713-722` (funzione
`ensureFreeRsvpTier`, aggiunta da questa fase), con esposizione in
`src/app/(public)/events/[slug]/page.tsx:620-627`,
`src/app/(public)/events/[slug]/TierSelection.tsx:469` e nell'assenza di un
controllo minimo fuori dal ramo sconto in
`src/app/(admin)/admin/events/actions.ts:1745-1757,1832-1838`.

**Problema:**

REG-06 fa nascere ogni serata `free_rsvp` con un livello `ticket_tiers` a
`price = 0` chiamato `RSVP` — dalla migration per le serate gia' esistenti
(`20260921120100_free_order.sql`, sezione 3) e da `ensureFreeRsvpTier` per ogni
scrittura successiva della serata (`admin/events/actions.ts:713-807`, chiamata
sia da `createEvent` che dall'aggiornamento di una serata esistente,
`:1345-1362`).

`ensureFreeRsvpTier` e' scritta per non toccare mai quel livello quando
`accessType !== "free_rsvp"`:

```
if (night.accessType !== "free_rsvp") return { ok: true };
```

Il commento che la precede giustifica questo con il vincolo `ON DELETE
RESTRICT` di `ticket_orders.tier_id` — cancellarlo potrebbe far fallire la
scrittura se il livello ha gia' emesso biglietti — ma **non nasconde il
livello, non lo disattiva e non gli cambia nome**. Il modulo di modifica di una
serata, `src/components/events/EventForm.tsx:1245-1256`, espone
`access_type` come un `<select>` liberamente modificabile su una serata gia'
esistente (`EventForm.tsx:243` la precarica dalla riga letta). Un organizer puo'
quindi salvare una serata che era `free_rsvp` come `paid` nello stesso modulo
che ha sempre usato per cambiare qualunque altro campo.

Dopo quel salvataggio, il livello `RSVP` a `price = 0` resta agganciato alla
serata. La pagina pubblica dell'evento legge **tutti** i livelli di una serata
`paid` senza filtrare per prezzo o per un flag «attivo»:

```ts
// src/app/(public)/events/[slug]/page.tsx:620-627
if (party.access_type === "paid") {
  const { data: rawTiers } = await supabase
    .from("ticket_tiers")
    .select("*")
    .eq("party_id", party.id)
    .order("price", { ascending: true });
  ...
}
```

Ordinato per prezzo crescente, il livello a zero euro appare **per primo**.
`TierSelection.tsx:469` (`{tiers.map((tier, i) => { ... })}`) disegna ogni
livello che riceve, senza escludere quelli a prezzo zero. Chi acquista con
sessione arriva a `purchaseTicket` (`admin/events/actions.ts`), che calcola
`finalPrice = tier.price` (riga 1752) e applica il controllo del minimo SumUp
**solo dentro il ramo del codice sconto** (`if (finalPrice < 1.00)`, riga
1811) — non esiste alcun controllo del minimo sul prezzo nudo del livello.
`createCheckout({ amount: finalPrice, ... })` (riga 1832) viene quindi
invocato con `amount: 0` per chiunque selezioni quel livello, senza che
nessuna riga di questo file lo impedisca.

L'esito preciso lato SumUp per un checkout a zero euro non e' verificabile da
qui, ma il difetto e' dimostrabile indipendentemente da quello: una serata che
l'organizer ha appena reso a pagamento **mostra pubblicamente un'opzione
gratuita chiamata "RSVP"**, selezionabile da chiunque abbia un account (anche
il piu' leggero, `member`, senza alcuna capability di lavoro), su una
superficie che nessun controllo di questa fase filtra. E' l'esatto contrario
dell'invariante che questa stessa fase dichiara altrove — «un ordine gratuito
non puo' emettere biglietti su una serata a pagamento» — realizzato pero'
tramite il livello anziche' tramite l'azione: il percorso `reserveFreeTickets`
e' guardato correttamente (`party.access_type !== "free_rsvp"` lo rifiuta), ma
il livello che quel percorso ha lasciato dietro di se' resta raggiungibile dal
percorso ORDINARIO di acquisto, che non ha mai avuto motivo di sospettare un
livello a prezzo zero.

Il caso peggiore e' quando la serata `free_rsvp` non dichiarava una capienza:
`ensureFreeRsvpTier` scrive `quantity: night.capacity`, e `capacity` nullo
diventa `quantity` nullo sul livello — cioe' **illimitato** (e' la stessa
equivalenza che la migration dichiara per le righe di riempimento). Un livello
del genere, lasciato dietro dopo il passaggio a `paid`, non ha nemmeno un tetto
di posti a fermare l'esposizione.

**Correzione suggerita:** quando `ensureFreeRsvpTier` osserva
`accessType !== "free_rsvp"` e trova gia' un livello `RSVP` a prezzo zero,
deve renderlo non acquistabile invece di ignorarlo — ad esempio impostando
`quantity = 0` (cosi' la logica di catena tier gia' esistente lo segna
`sold_out` sia in `order-quote.ts` che in `TierSelection.tsx`, senza toccare lo
schema) o un campo dedicato se lo stato del prodotto lo richiede altrove. In
parallelo, `purchaseTicket` dovrebbe applicare lo stesso controllo del minimo
SumUp che gia' esiste per il ramo sconto anche al prezzo nudo del livello — la
stessa guardia che `order-quote.ts:585` applica gia' sul percorso ospite/
gratuito — cosi' un livello a zero euro non possa mai raggiungere
`createCheckout` fuori dal percorso che lo prevede esplicitamente.

```ts
// admin/events/actions.ts, dentro ensureFreeRsvpTier, ramo "not free_rsvp"
if (night.accessType !== "free_rsvp") {
  if (tier && (tier.quantity ?? 1) !== 0) {
    const { error } = await client
      .from("ticket_tiers")
      .update({ quantity: 0, updated_at: new Date().toISOString() })
      .eq("id", tier.id);
    if (error) return { ok: false, error };
  }
  return { ok: true };
}
```

**Stato: fixed — `86aa5f0`** (2026-09-21). Tre guardie, non una: la chiusura
del livello alla scrittura della serata (`ensureFreeRsvpTier`, via `expires_at`
e **non** `quantity = 0` — il `CHECK (quantity > 0)` inline di
`20260225110000_phase6_ticketing.sql:14` e' ancora in vigore e avrebbe fatto
rifiutare quella scrittura dal database), il rifiuto nominato su entrambi i
percorsi d'acquisto (`tier_free_on_paid_night` con sessione,
`quote_tier_free_on_paid_night` da ospite, piu' il minimo del fornitore
applicato al prezzo nudo con `quote_below_minimum`), e il filtro dei livelli a
prezzo zero dove la pagina pubblica li legge. Il percorso gratuito resta
intatto: `goesToPaymentProvider: false` salta la sola riga del minimo.

## Info

### IN-01: L'atto «deleted» mostra una pseudo-transizione di ruolo nel registro

**File:** `src/app/(admin)/admin/(work)/members/register/page.tsx:154-176,
496-506`; `src/app/(admin)/admin/members/actions.ts:2103-2107` (`recordAct`
chiamato senza `role`).

**Problema:** `recordAct("deleteAccount", ...)` non passa `role`, quindi
`record_membership_act` scrive `role_after = COALESCE(NULL, v_subject.role)`,
cioe' lo stesso ruolo del soggetto (`20260921120000_drop_status_and_referral.sql:591-595,606-609`).
Il componente `Transition` nasconde una coppia solo quando **entrambi** i
valori sono nulli (`register/page.tsx:166`); con `role_before === role_after`
entrambi non nulli, ogni riga «Account deleted» disegna una freccia
`role: X → X`, che si legge come un cambio di ruolo avvenuto al momento della
cancellazione, mentre non e' successo nulla su quell'asse. Il file applica
correttamente il principio opposto a `status_before`/`status_after`, lasciati
espressamente `NULL` per lo stesso atto — qui l'assenza di movimento non ha lo
stesso trattamento visivo perche' la funzione di registro non distingue «non
mosso» da «mosso verso lo stesso valore».

**Correzione suggerita:** `Transition` puo' nascondere anche il caso
`before === after` quando l'etichetta e' `role`, oppure `deleteAccount` puo'
passare esplicitamente il ruolo corrente come `role` cosi' la semantica resta
quella di un valore riportato piuttosto che di un default silenzioso — la
seconda strada e' quella piu' coerente con la disciplina che il resto del file
applica (nessun default implicito su un campo che finisce in un registro
append-only).

### IN-02: Un componente disabilitato passa ancora una prop rimossa dall'interfaccia

**File:** `src/app/(public)/events/[slug]/menu/GuestDrinkMenu.tsx:360-369`
(blocco JSX interamente commentato), a fronte della rimozione di `onSignUp` da
`GuestWarningModal` in `src/app/(public)/events/[slug]/menu/GuestLoginBanner.tsx:132-160`.

**Problema:** il blocco che monta `GuestWarningModal` in `GuestDrinkMenu.tsx`
e' commentato dall'inizio (non da questa fase) e passa ancora `onSignUp=
{handleWarningSignUp}` — una prop che l'interfaccia di `GuestWarningModal` non
accetta piu'. Il codice compila oggi solo perche' il blocco e' inerte; chi lo
riattivera' senza leggere prima il commento che lo segnala (gia' presente nel
diff) otterra' un errore di tipo. E' debito dichiarato dallo stesso autore del
diff, non scoperto da questa revisione, ma resta un promemoria da verificare
alla riattivazione: `handleWarningSignUp` non esiste piu' come funzione reale
nel file (l'unica occorrenza e' dentro il commento), quindi il ripristino
richiede comunque di riscrivere quel ramo, non solo di togliere il commento.

---

_Rivisto: 2026-09-21T17:03:39Z_
_Revisore: Claude (gsd-code-reviewer)_
_Profondita': deep_
