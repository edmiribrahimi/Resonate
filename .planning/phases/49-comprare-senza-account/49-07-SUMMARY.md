---
phase: 49-comprare-senza-account
plan: 07
subsystem: ticketing-payments / access-gating
tags: [webhook, guest-identity, idempotency, observability, money-path]
status: completo — l'esecutore e' stato interrotto dopo i tre commit, il referto e' dell'orchestratore
provides:
  - "l'identita' leggera, coniata dietro un incasso verificato e mai prima"
  - "il ramo ticket_orders del webhook: N biglietti da un pagamento, in una transazione"
  - "la faccia del fallimento sulla superficie di chi lavora la serata"
decisions:
  - "Quattro cause di fallimento dell'identita' invece delle tre previste: email_missing e' stata separata da create_failed"
  - "Il segno d'invio si legge PER ORDINE, non per biglietto — altrimenti cinque righe su sei dicono il falso"
requirements: [BUY-01, BUY-03]
metrics:
  completed: 2026-09-06
---

# Fase 49 Piano 07 — Summary

## Come si e' chiuso

**L'esecutore e' stato interrotto** dopo aver committato tutti e tre i task,
mentre stava per toccare `STATE.md`. I commit sono a terra — `4ef03a9`,
`d940125`, `a04b389` — l'albero e' pulito, `npm run build` esce **0**,
`verify:venue-surfaces` **0**, `verify:conversion` **0**.

**Questo referto e' dell'orchestratore, non di chi ha scritto il codice.** E' il
secondo della fase in questa condizione, dopo `49-06`, e vale la stessa nota:
chi rilegge deve saperlo, perche' cambia quanto pesa questo documento rispetto a
`49-01`…`49-05`.

**`STATE.md` non e' stato toccato**, deliberatamente: l'SDK riscrive quel file
piu' di quanto dichiari e ha gia' colpito due agenti oggi. Si aggiorna a fine
fase, in un colpo solo.

## L'invariante del denaro, verificata per prima

`getCheckout(body.id)` sta a `src/app/api/webhooks/sumup/route.ts:25`, intatta.
*Verifica sempre dall'API, mai dal corpo del webhook.* Nessun ramo nuovo la
aggira.

## Cosa esiste

| Commit | File | Righe |
|---|---|---|
| `4ef03a9` | `src/lib/tickets/guest-identity.ts` | 358 |
| `d940125` | `src/app/api/webhooks/sumup/route.ts` | +250 |
| `a04b389` | `src/app/(admin)/admin/(work)/events/[id]/tickets/page.tsx` | +265 |

## L'identita' nasce dietro un incasso, e le cause di fallimento sono quattro

Il modulo dichiara **perche' sta al webhook e non all'avvio del checkout**:
nessun conto nasce senza un pagamento verificato dietro, il che chiude il
difetto dell'account fantasma per ogni carrello abbandonato.

**Il piano ne prevedeva tre; ce ne sono quattro**, e la quarta e' stata separata
invece che fatta passare per un'altra:

| Causa | Cosa significa · dove si ripara |
|---|---|
| `email_missing` | l'ordine non porta un indirizzo utilizzabile. Si ripara **a monte**, dove l'ordine e' stato scritto |
| `lookup_failed` | la lettura di `profiles` non e' riuscita. E' infrastruttura, non un «no» |
| `create_failed` | il fornitore d'identita' ha rifiutato |
| `profile_not_written` | **il peggiore dei quattro**: il conto esiste in `auth.users`, la riga in `public.profiles` no |

> **Perche' la quarta non poteva essere `create_failed`.** Farla passare per un
> rifiuto del fornitore d'identita' manderebbe chi indaga a guardare il posto
> sbagliato: il dato manca a monte, non ha rifiutato nessuno. E'
> `meta-gates.md`, *nessun `catch` che collassa cause diverse in un unico
> messaggio generico*, applicato a un tipo invece che a un messaggio.

**`profile_not_written` non e' riparabile da qui** — il profilo lo scrive un
trigger — ed e' esattamente lo stato che l'ordine portato a `failed` con quella
causa deve far arrivare a un essere umano.

**Il confronto sull'indirizzo non e' un `ilike` nudo.** I metacaratteri si
neutralizzano prima (`escapeLikePattern`), altrimenti `m_rio@esempio.it`
corrisponderebbe a `mario@esempio.it` — cioe' l'ordine di una persona
consegnato all'identita' di un'altra.

## Dove vive l'idempotenza: quattro reti, e tre non sono nel codice del chiamante

Il webhook le dichiara accanto a se', perche' *«una guardia che vive solo nel
codice del chiamante e' una guardia che si dimentica»*:

1. **Nello schema** — `ticket_orders.sumup_checkout_id` e' `UNIQUE`, e
   `tickets.sumup_checkout_id` **non lo e' piu'**. Lo spostamento e' il punto
   della migration di stamattina: una seconda consegna collide **sull'ordine**,
   non su un biglietto.
2. **L'uscita su `status = 'completed'`**, prima di tutto il resto.
3. **Dentro `reserve_ticket_order`** — che blocca la riga `FOR UPDATE` e, se
   l'ordine e' gia' chiuso, **restituisce gli stessi id senza inserire**. E' la
   rete che regge due consegne **simultanee**, che l'uscita al punto 2 non
   vedrebbe, perche' nessuna delle due ha ancora chiuso l'ordine.
4. **Nell'identita' e nella posta** — si cerca prima di coniare e si rilegge se
   la creazione fallisce; la conferma guarda il registro delle consegne prima di
   spedire.

**E `failed` non e' un vicolo cieco:** un ordine portato li' da un intoppo
passeggero viene **ritentato** alla consegna successiva. Il ramo esce solo su
`completed`, e la RPC dichiara che `failed` non la blocca.

## Come si vede un fallimento, e chi lo vede

Questo progetto **non ha error tracking**: una riga di log non raggiunge nessuno
da sola. Se i biglietti non nascono, **la persona si presenterebbe alla porta
senza sapere di non avere niente** — e rifiutare qualcuno che ha pagato e'
l'errore che `checkin-offline.md` dichiara il piu' costoso, perche' avviene
davanti a una fila.

**L'effetto osservabile e' una sezione sulla pagina di chi lavora la serata**, e
la si vede **prima** che qualcuno si presenti. Due insiemi che **non si
fondono**, e la distinzione e' la sostanza:

- **`falliti`** — il fornitore ha confermato l'incasso e i biglietti non sono
  nati. **Denaro preso, niente biglietto.** Porta la causa scritta. E' la riga
  che deve gridare.
- **`sospesi`** — `pending` da piu' di **30 minuti**, finestra *dichiarata* e non
  scelta di volta in volta. Nessuno sa se siano stati pagati: un carrello
  abbandonato ha esattamente questo aspetto, e anche un pagamento il cui
  messaggio non e' mai arrivato. **Il database non puo' distinguerli.**
  Disegnarli con la stessa voce dei falliti sarebbe rumore su ogni carrello
  abbandonato, e **il rumore nasconde l'unica riga che conta.**

Gli ordini `expired` **non compaiono**: sono checkout scaduti senza pagamento,
cioe' il funzionamento normale, non un guasto.

**Anche il fallimento della lettura ha una voce propria.** Una sezione vuota per
un errore di lettura si leggerebbe *«va tutto bene»*, che e' la bugia peggiore
che questa sezione possa dire.

## Il segno d'invio si legge PER ORDINE, e senza questo cinque righe su sei mentivano

`email_deliveries` ha `ticket_id`, **non** `order_id` (debito
`D-49-05-DEF-06`). La conferma d'ordine e' **una** mail per N biglietti, e il
registro la attacca al primo.

Letto per biglietto, gli altri N−1 risulterebbero *«nessun invio registrato»* —
vero alla lettera e **falso per chi legge**, perche' si legge come *nessuno ha
guardato*. E' la direzione dell'errore sbagliata su una superficie che esiste per
far vedere i guasti.

> **La riparazione ne ha portata dietro una piu' grande, che il debito non aveva
> visto.** Il segno non andava solo attribuito all'ordine: andava letto **nella
> categoria giusta**. Un biglietto nato da un ordine non ha mai avuto una
> `ticket_confirmation` — la sua conferma e' `ticket_order_confirmation`. Senza
> quella correzione la superficie avrebbe scritto «nessun invio registrato» su
> **tutti e sei**, non su cinque: la prima riparazione da sola ne avrebbe
> corrette cinque e lasciato l'errore su tutte.

**Cosa NON e' chiuso:** `email_deliveries` continua a non avere `order_id`. La
riparazione vive nella **superficie**, non nello schema — quindi un secondo
lettore del registro che nascesse domani rifarebbe lo stesso ragionamento da
capo, **o non lo farebbe**.

## Cosa NON e' verificato, e come si verificherebbe

**Nessuna prova comportamentale esiste.** Provare questo file significa un
pagamento vero: righe in produzione, fuori dall'autorizzazione, che e'
`ESAURITA` dalle 15:03 di oggi. In produzione ci sono **0 ordini e 0 biglietti**.

Le procedure, da eseguire al primo esercizio vero:

1. **`P-WH-1`** — un acquisto da ospite completo: l'ordine passa a `completed`,
   nascono **N** biglietti con `issued_via = 'guest_checkout'`, l'identita'
   esiste in `auth.users` **e** in `public.profiles`, e la mail parte una volta.
2. **`P-WH-2`** — **rigiocare la stessa consegna**: nessun biglietto in piu',
   nessuna seconda mail, nessuna seconda identita'. E' la prova che la rete 2
   regge.
3. **`P-WH-3`** — due consegne **simultanee** dello stesso checkout: N biglietti
   in totale, non 2N. E' la sola prova della rete 3, e l'unica che la 2 non puo'
   dare.
4. **`P-WH-4`** — un ordine con un indirizzo malformato: l'ordine finisce
   `failed` con causa `email_missing`, e **compare fra i falliti** sulla pagina
   della serata.
5. **`P-ORD-VIS-1`** — con dati veri, la sezione disegna **un** segno per ordine
   e non sei, e il segno dice l'esito giusto per tutti i biglietti di
   quell'ordine.
6. **`P-WH-5`** — un ordine lasciato `pending` per piu' di trenta minuti compare
   fra i **sospesi** e **non** fra i falliti.

**Nessuna di queste e' stata eseguita, e nessuna e' stata arrotondata.**
