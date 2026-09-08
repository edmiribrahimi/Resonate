---
phase: 49-comprare-senza-account
document: specifica di una fase successiva — i biglietti nascono anche senza identita'
date: 2026-09-08
status: DA PIANIFICARE — decisione del proprietario del 2026-09-08 («facciamo la 1, la 2 e la 3»); la 1 e la 2 sono in corso, questa e' la 3
---

# I biglietti nascono anche senza identita'

## Il problema, come misurato

`49-ESITI.md`, `P-WH-4`: un ordine pagato i cui biglietti non nascono perche'
l'identita' dell'acquirente non si risolve (`identity_*` in `error_message`)
resta `failed` con **zero biglietti**, mentre SumUp ha incassato. Fino al
2026-09-08 una causa concreta esisteva (il trigger delle iscrizioni, riparato);
le altre — fornitore d'identita' che rifiuta, profilo che non compare, lettura
fallita — restano possibili e sono **guasti nostri**, non dell'ospite.

Oggi la funzione che conia (`reserve_ticket_order`, migration
`20260905120100`) **rifiuta un ordine senza portatore** («senza portatore —
risolvere l'identita' dell'acquirente prima di emettere»). La riparazione e'
manuale: correggere la causa, rimettere `pending`, rigiocare il webhook
(la 1 e la 2 la rendono un pulsante e un cron, ma restano riparazioni).

## La decisione

`D-49-03`: **il biglietto e' al portatore**. La porta controlla il biglietto,
non la persona (`Door review`: «the door checks the ticket and not the person
holding it»). Se e' cosi', un biglietto non ha bisogno di un'identita' per
esistere: ha bisogno di un ordine pagato e di un codice firmato. L'identita'
serve a **ritrovarlo** (mail, link stabile, «Completa il tuo account»), non a
**valere**.

Quindi: **un ordine pagato emette sempre i suoi biglietti.** Se l'identita' si
risolve, i biglietti sono anche suoi; se no, sono dell'ordine, e l'ospite li
raggiunge dal ritorno del pagamento e dal link firmato dell'ordine, che gia'
oggi si apre senza login.

## Cosa cambia, e dove

| Punto | Oggi | Dopo |
|---|---|---|
| `reserve_ticket_order` (migration nuova) | rifiuta se `ticket_orders.user_id` e' NULL | emette con `tickets.user_id` NULL; `holder_label` e `issued_via = guest_checkout` come ora |
| webhook `api/webhooks/sumup` (ramo `ticket_order`) | identita' → conio → mail; se l'identita' fallisce, `failed` | conio **prima**, poi identita' *best effort*: se si risolve, `user_id` aggiornato su ordine e biglietti; se no, ordine `completed` con `error_message = identity_*` e una **causa visibile** all'organizer («emessi, senza account») |
| mail di conferma | parte solo con identita' | parte comunque all'indirizzo dell'ordine, **senza** il blocco «Completa il tuo account» (e' il ramo `password_link_failed`, gia' scritto: `order-confirmation.ts:377`) |
| ritorno dal pagamento | `PAID_NOT_ISSUED` se `failed` e SumUp `PAID` | `PAID` → link firmato dell'ordine, come ora. `PAID_NOT_ISSUED` resta per il caso in cui **il conio** fallisce (capienza, tetto): quello non e' riparabile emettendo |
| pagina dell'ordine `/tickets/order/[token]` | legge `user_id` per «Ho gia' una password» | con `user_id` NULL nasconde quel pulsante e dice come ritrovare i biglietti (il link stesso) |
| porta (`attendance`, scanner, lista offline) | biglietti sempre con `user_id` | biglietti con `user_id` NULL: la lista li mostra per `holder_label`, il check-in scrive `tickets.checked_in_*` (gia' per biglietto), `attendances` (per persona) **non** riceve una riga — da decidere se e' accettabile o se serve una riga anonima |
| `venue_for_parties` e cron di rivelazione | arm 3/5 per `user_id` con biglietto | un biglietto senza `user_id` non ha una sessione: la rivelazione va **per ordine** (mail all'indirizzo dell'ordine), gia' cosi' per il cron (che manda a chi ha il biglietto); la funzione RPC non cambia |
| RLS su `tickets` | policy per `user_id` | nessuna lettura anonima nuova: la pagina dell'ordine usa il service client con la firma, come ora |

## Le decisioni da prendere PRIMA di pianificare

1. **`attendances` per un biglietto senza persona**: riga anonima, oppure nessuna riga e il conteggio si fa sui `tickets.checked_in_at`? Il conteggio in testa alla porta oggi legge cosa?
2. **Rivelazione del venue** a chi ha un biglietto senza identita': via mail dell'ordine (una per ordine, non per biglietto) — confermare che `email_deliveries` per `venue_reveal` accetti `user_id` NULL con `ticket_id`.
3. **Se l'identita' arriva dopo** (l'ospite completa l'account piu' tardi, o compra di nuovo con la stessa mail): i biglietti dell'ordine vanno **adottati** dal profilo? Se si', dove (trigger su `profiles`? al login?).
4. **Il rimborso** di un ordine senza identita' (`ticket_refunds` ha `user_id`?).

## Verifica

Nel laboratorio, con il webhook consegnato a mano: un ordine pagato con
identita' impossibile (mail su un dominio che GoTrue rifiuta) → sei biglietti
nati, mail partita senza il blocco account, link dell'ordine apribile, porta
che li ammette, review che li conta; poi «Completa il tuo account» con la
stessa mail → biglietti adottati (se deciso al punto 3).

## Cosa NON entra

Nessun cambiamento a cosa apre un biglietto (`venue-secrecy.md`, guardie
monotone): un biglietto senza identita' apre esattamente cio' che apre oggi un
biglietto con identita', e niente di piu'.
