---
phase: 49-comprare-senza-account
document: esiti delle 52 prove del runbook
started: 2026-09-08
environment: laboratorio permanente (`.planning/v1.6-LAB-DESIGN.md`), MAI la produzione
status: in corso
---

# Fase 49 — Gli esiti, percorrendo

> Ogni riga porta la data, chi ha eseguito (ruolo o «agente»), e cio' che si e'
> **osservato**, non cio' che ci si aspettava. Un passo non eseguito e' scritto
> non eseguito, con la ragione. Nessun esito e' dedotto dal codice: tutti sono
> misurati contro il laboratorio, con lo strumento indicato.
>
> **Strumenti:** SQL via Management API sul ref del laboratorio (rifiuto sulla
> produzione in prima riga), PostgREST/GoTrue con sessioni reali, browser
> headless via CDP sul dominio `lab.resonatemotion.com` (build di produzione),
> API SumUp in sola lettura.

## Eseguite dall'agente — 2026-09-08

| Sigla | Esito | Osservato |
|---|---|---|
| `P-RES-1` | **PASSA** | ordine da 6 → 6 uuid, `holder_label` «1 di 6»…«6 di 6», `status = completed`; richiamata: gli **stessi** 6 uuid, conteggio ancora 6 |
| `P-RES-2` | **PASSA** | `total_amount 10.00`, `quantity 3` → importi `3.34 + 3.33 + 3.33 = 10.00` esatti |
| `P-RES-3` | **PASSA** | ordine da 7 su tetto 6 → `P0001` «chiede 7 biglietti, il tetto per ordine…», **0 righe** |
| `P-RES-4` | **PASSA** | tier con 2 posti, ordine da 6 → `P0001` «il tier ha 2 posti liberi, l'ordine ne chiede 6», **0 righe** (non 2) |
| `P-RES-5` | **PASSA** | `reserve_ticket` (8 argomenti, cast espliciti) con il master: prima chiamata riuscita, seconda `P0001` «already has a ticket». *Nota di metodo:* chiamata a 7 argomenti e' ambigua (`42725`) per il default dell'ottavo; con il membro seminato fallisce gia' la prima perche' ha un biglietto |
| `P-MAIL-1` | **PASSA** | `ticket_order_confirmation` inserita; `ticket_order_confirmatio` → `23514 check_violation` |
| `P-CODE-1` | **PASSA** | profilo nuovo via admin API → `membership_code` lungo **14**, `RSN-` + 10 dentro `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`; utente rimosso per id |
| `P-VENUE-2` | **PASSA** | `venue_for_parties(p_party_ids)` con sessione **membro approvato senza biglietto** sulla segreta → `[]`; membro pending → `[]`; sulla NON segreta entrambi ricevono la riga. Il **master** riceve la riga anche sulla segreta: e' il **ramo 2** (`staff.manage`), dichiarato nel commento della funzione, non un ramo che apre su qualcosa che non e' un biglietto |
| `P-UI-7` | **PASSA** | pagina della segreta senza sessione: nessun indirizzo, nessun nome di sede, «Secret Venue», titolo `Lab Secret Night` |
| `P-UI-2` | **PASSA** | selettore `1,2,3,4,5,6`, frase esatta *«Up to 6 per order — not per person.»* |
| `P-UI-3` / `P-BUY-6` | **PASSA** | build di produzione (dominio). Vuota: *«Enter the email where your tickets should go. Nothing was charged.»* Malformata: *«That email does not look like an email, so your tickets would have nowhere to go…»* — **due frasi diverse** |
| `P-UI-1` | **PASSA** | senza sessione, tier scelto, quantita' 2: si apre il pannello carta del fornitore («Complete Payment · Paga con Carta…»); nessun rimbalzo a `/register` |
| `P-BUY-1` | **PASSA** | una riga `pending`, `user_id` **null**, `Lab-Buy1@Lab.Invalid` → `lab-buy1@lab.invalid`, `quantity 2`, `total 2.00` = 2 × `1.00` di catalogo; SumUp (GET, sola lettura): `checkout_reference` = **id dell'ordine**, `description` «Lab Secret Night - Lab Secret x2» **senza indirizzo** (passo 1.2 della procedura 1), `return_url` sul webhook del laboratorio |
| `P-BUY-4` | **PASSA** | `auth.users` 4 → 4, `profiles` 4 → 4 dopo una chiamata riuscita non seguita da pagamento |
| `P-BUY-2` | **PASSA** | opzione 7 iniettata nel select controllato → *«…One order may hold up to 6 tickets for this night — that is a limit per order, not per person.»*, **0 righe nuove**, nessun widget |
| `P-BUY-5` | **PASSA** | serata messa in bozza **dopo** l'apertura della pagina → *«Tickets for this night are not on sale. Nothing was charged.»*, **0 righe**; ripubblicata |
| `P-WH-5` | **PASSA** | ordine `pending` retrodatato a −40 min: sulla pagina organizer compare sotto *Orders without tickets* con la frase *«Checkout never confirmed, 1 ticket. We do not know whether it was paid — an abandoned cart looks exactly like this…»*, distinta da un fallimento |
| `P-UI-5` | **PASSA** | scritto 4, salvato, riaperto: **4** (anche nel catalogo). Svuotato e salvato: ancora **4** |
| `P-UI-6` | **FALLISCE** | con il `min=1` del browser lo zero non parte nemmeno. Scavalcato il vincolo HTML, lo zero arriva al server: il catalogo lo **rifiuta** (resta 6), ma l'organizer vede *«An error occurred in the Server Components render. The specific message is omitted in production builds…»* — la frase «Tickets per order must be at least 1…» esiste in `admin/events/actions.ts:532` ma viaggia in un `throw`, che Next spoglia in produzione. **Il rifiuto e' giusto, la frase non arriva.** Non e' un messaggio grezzo di Postgres: e' un messaggio grezzo di Next |
| `P-ORD-2` | **PASSA** | token valido dell'ordine pending → 200 «Il pagamento e' ancora in corso»; **firma alterata → 404**; **ordine inesistente con firma valida → 404**; token senza punto → 404. I due 404 hanno lo stesso `digest` e lo stesso contenuto: i 43 byte di differenza sono il taglio dei chunk di streaming di Next, non un'informazione |
| `P-CODE-3` | **PASSA** | utente con `referral_code` = codice del membro approvato → `status approved`, `approved_via referral`, `referred_by` = il membro; codice lungo 14. Eseguito via admin API: il trigger e' lo stesso di `/register`, e Supabase non spedisce conferme a domini di laboratorio |
| `P-CODE-4` | **FALLISCE — e in produzione e' uguale** | voce `invited` in guest list su `Lab Night`, poi utente con quella mail: la creazione e' **rifiutata dal database**, `23503` su `guest_list_entries_profile_id_fkey`. Il trigger aggiorna la voce con `profile_id = new.id` (riga 151) **prima** di inserire il profilo (riga 199), e l'ordine e' identico dalla versione di marzo. Confrontati in sola lettura: produzione e laboratorio hanno la **stessa** chiave esterna verso `profiles`, non differibile, e lo **stesso** corpo del trigger (md5 identico, `UPDATE` a 1222, `INSERT` a 3191). **Conseguenza in produzione:** chi ha la mail in una guest list `pending`/`invited` non puo' creare un account — ne' da `/register` ne' per creazione in-app — perche' l'inserimento in `auth.users` viene annullato dal trigger. La via «invito da guest list» con `guest_list_event_id` nei metadati **non** passa da questo ramo. Correzione candidata, non applicata: spostare l'`UPDATE` dopo l'`INSERT` del profilo. E' accesso: decisione del proprietario, e la fase 50 toglie le iscrizioni |
| `P-ORD-4` | **NON ESEGUIBILE — l'azione non ha una superficie** | `resendOrderTickets` e' definita in `guest-purchase-actions.ts:451` e **nessun componente la chiama** (misurato con `/usr/bin/grep` su `src/`: un solo riferimento, la definizione). La risposta neutra esiste nel codice (*«If that address has tickets with us, we have just sent them again…»*) ma nessun ospite puo' raggiungerla. **BUY-04 «i biglietti si ritrovano senza login» oggi regge sul solo link nella mail.** |
