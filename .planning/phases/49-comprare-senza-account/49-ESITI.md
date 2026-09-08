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

## Dopo l'acquisto 1 del proprietario — 2026-09-08, 09:45 UTC, 1,00 € su `Lab Secret Night`

| Sigla | Esito | Osservato |
|---|---|---|
| `P-WH-1` | **PASSA** | ordine `completed`, `sumup_transaction_code` valorizzato; **1** biglietto `issued_via = guest_checkout`, `holder_label` «1 di 1», `amount_paid 1.00`, stesso `user_id` dell'ordine; identita' in `auth.users` (confermata) **e** in `profiles` (`member`/`approved`, codice lungo 14); identita' 4 → **5** su entrambe le tabelle; SumUp `PAID`, transazione `SUCCESSFUL` |
| `P-MAIL-4` | **PASSA** | **una** riga in `email_deliveries`, `ticket_order_confirmation`, `outcome unverified`, `provider_message_id` presente, `check_attempts 0` |
| `P-ORD-1` | **PASSA** | link firmato aperto **senza sessione**: «Il tuo biglietto», **un** riquadro QR, «Biglietto 1 di 1», blocco «Completa il tuo account»; **nessuna sede, nessun indirizzo**, nemmeno la parola «venue» |
| `P-ORD-3` | **PASSA** | stesso link da due user agent diversi: 200 e stesso contenuto |
| 1.2 | **PASSA** | descrizione dell'articolo su SumUp: «Lab Secret Night - Lab Secret», senza indirizzo |
| `P-WH-2` | **PASSA** | webhook rigiocato a mano con lo stesso `id` di checkout → `{"received":true}`; biglietti 1 → 1, righe di posta 1 → 1, identita' 5 → 5, ordine `completed` |
| `P-WH-3` | **PASSA sul ramo idempotente; la corsa NON esercitata** | due consegne simultanee sullo stesso checkout, entrambe 200, conteggi invariati. **Ma l'ordine era gia' `completed`**: la corsa che la prova vuole misurare — due consegne mentre l'ordine e' ancora `pending`, N e non 2N — non si puo' esercitare quando SumUp consegna da solo per primo. Si esercita solo consegnando a mano contro `localhost` (`dev:lab`), strada non scelta |
| `P-MAIL-5` | **PASSA** | conseguenza di `P-WH-2`: la seconda chiamata dell'invio non produce una seconda riga di registro ne' una seconda mail |
| `P-VENUE-1` (prima) | **PASSA** | sessione dell'acquirente (password impostata in laboratorio), serata `venue_secret`, `venue_reveal_on_purchase = false`, non rivelata → `[]` |

### Osservato dal proprietario — screenshot delle 11:44–11:46 (iPhone, Safari in navigazione privata, app Gmail)

| Passo | Esito | Osservato |
|---|---|---|
| 1.3 / 5.1 | **PASSA** | al ritorno dal pagamento, **prima** della mail: «Il tuo biglietto», il link stabile dell'ordine, QR «Biglietto 1 di 1», «Completa il tuo account», «Ho gia' una password», «Vai alla serata». **Nessun indirizzo** |
| 1.5 / `P-MAIL-2` / `P-MAIL-3` | **PASSA, con una nota** | oggetto «Il tuo biglietto per Lab Secret Night»; «Ciao edmir.ibrahimi, il pagamento e' andato a buon fine»; «Lab Secret Night - Lab Secret · Monday, 21 September 2026 · 22:00»; «Biglietto 1 di 1»; link «Apri il biglietto 1 di 1»; blocco e pulsante «Completa il tuo account». **Nessun indirizzo.** *Nota:* nell'app Gmail il riquadro inline mostra il testo alternativo «Codice del biglietto 1 di 1» e il QR compare **come allegato in fondo alla mail**, non nel corpo: il codice arriva, ma chi non scorre fino agli allegati vede un riquadro vuoto |
| 6ª voce — Apple Pay | **NON COMPARE — non conclusiva sul dominio del laboratorio** | pannello SumUp su iPhone Safari: VISA · Mastercard · AmEx, «Paga con Carta di credito/debito», nessun pulsante Apple Pay. **Ma `lab.resonatemotion.com` non e' registrato per Apple Pay presso SumUp** (lo e' il dominio di produzione): la prova va rifatta sul dominio di produzione al primo tier in vendita, come il runbook gia' dice |
| 1.6 — ricevuta SumUp | **in attesa** | da trascrivere alla lettera dal proprietario |
| 1.6 — statement della carta | **PASSA (lato banca)** | nell'app della carta: «Resonate −1 €», stato pending fino al 17 settembre se non reclamato dal merchant. Solo il nome del merchant: nessun indirizzo, nessun nome di serata. La ricevuta SumUp come mail resta da vedere |

### La rivelazione manuale — passo 4.2, 2026-09-08 09:52 UTC, come master

| Passo | Esito | Osservato |
|---|---|---|
| 4.2, primo tentativo | **RIFIUTATO, leggibilmente** | il dialogo dice «send the address of Lab Venue to **1 person**. This does not come back», poi al clic: *«Nothing was sent. This act is written down with the full name of whoever performs it, and this account's profile carries no full name. An act attributed to nobody is not an act. Put a full name on the profile, then try again.»* Il master seminato non aveva nome. E' la guardia della fase 37 che fa il suo mestiere, e il conteggio «1 person» e' giusto |
| 4.2, secondo tentativo | **PASSA** | nome messo al master (solo laboratorio). A schermo: *«The night is revealed and its page has stopped hiding the address. 1 of 1. The address has left for everybody who was entitled to it at this moment.»* `venue_revealed_at` impostato; **una** consegna `venue_reveal` all'acquirente, `unverified`, 09:52:25. *Nota:* `venue_reveal_email_sent` resta `false` sulla serata: la rivelazione manuale scrive `venue_revealed_at` e l'atto, non quel flag |
| 4.2 — la mail | **PASSA** | il proprietario riceve «Venue Revealed: Lab Secret Night» alle 11:52: «Lab Secret Night · Monday, 21 September 2026 · 22:00», **«Lab Venue — Nowhere 0, Lab»**, «View Event». *Nota di copy:* saluta con «Hey Member» perche' il profilo nato dall'acquisto non ha un nome |
| `P-VENUE-1` (dopo) | **PASSA** | stessa sessione dell'acquirente, dopo la rivelazione → **una** riga: `name`, `address`, `google_maps_url` (null: il locale seminato non ne ha) |
| `P-VENUE-2` (dopo) | **PASSA** | membro approvato senza biglietto, dopo la rivelazione → ancora `[]`: il ramo 5 ristretto dalla fase 49 tiene |
| atto registrato | **PASSA** | `venue_reveal_acts`: `act = revealed`, `actor_name = Lab Master`, `recipients_intended = 1`, `party_label = Lab Secret Night — 2026-09-21` |
| 1.6 — ricevuta SumUp | **PASSA** | trascritta dal proprietario (PDF e pannello vendite, 2026-09-08 11:44 CEST, ricevuta `MCVM9P4A-87`): articolo **«1 x Lab Secret Night - Lab Secret»**, subtotale 1,00 €, IVA esente, Mastercard, transazione `TAAA6AKB6XQ` — la stessa scritta in `ticket_orders.sumup_transaction_code`. **Nessun indirizzo della serata, nessun nome di sede.** *Fatto da sapere, non un difetto del codice:* la ricevuta porta la ragione sociale del merchant e **il suo indirizzo legale**, presi dal profilo SumUp — li vede ogni acquirente. Fotografia di oggi: va rifatta a ogni cambio della descrizione dell'articolo o del profilo merchant |

### Acquisto 2 del proprietario — 2026-09-08 10:00 UTC, secondo indirizzo Gmail, serata GIA' rivelata

| Passo | Esito | Osservato |
|---|---|---|
| 4.3 | **PASSA** | ordine `completed`, 1 biglietto, `error_message` null; al secondo acquirente **una** `ticket_order_confirmation` **e una** `venue_reveal`. E' il caso che la fase esiste per chiudere |
| 4.6 | **PASSA** | prenotazione di `member@` e biglietto di evento di `door@`, creati **dopo** la rivelazione: **zero** mail `venue_reveal` a entrambi, `rsvps.venue_reveal_sent = false`. La spedizione del 4.3 e' mirata, non a raggiera |
| 4.5 | **PASSA** | dopo il 4.3 la guardia e' identica a dopo il 4.2: `venue_revealed_at 09:52:24`, un solo atto, `venue_reveal_email_sent false` |
| 4.3 — le mail | **PASSA** | screenshot del proprietario alle 12:00–12:01: «Il tuo biglietto per Lab Secret Night» («Ciao ibrahimi.ets…», Biglietto 1 di 1, «Completa il tuo account») **e** «Venue Revealed: Lab Secret Night» («Lab Venue — Nowhere 0, Lab»); ritorno dal pagamento con QR e link stabile |
| 4.4 | **PASSA** | cron `venue-reveal` rilanciato a mano con il segreto dell'anteprima → `{"sent":0,"failed":0,"parties":0}`; consegne `venue_reveal` per destinatario **1 e 1**, identiche a prima; `rsvps.venue_reveal_sent` ancora `false`. *Nota:* `parties 0` — il cron non riprende una serata rivelata a mano fuori dalla sua finestra: chi non e' stato raggiunto resta raggiungibile dal pulsante, come il dialogo dichiara |
| `P-REV-SEQ-1` | **PASSA, sei passi su sei** | 4.1 (acquisto 1), 4.2 (rivelazione manuale, dopo il rifiuto per nome mancante), 4.3, 4.4, 4.5, 4.6 |
| `P-MAIL-6` | **NON ESEGUIBILE senza iniezione di guasto nel codice** | sondato: `generate_link` di GoTrue con `redirect_to` fuori dalla lista risponde **200** e sostituisce il redirect con il `site_url` — non fallisce. Le altre cause (`generate_failed` per utente assente, `no_hashed_token`) non si inducono senza toccare identita' o codice. Resta un ramo scritto e non percorso |

### Acquisto 3 del proprietario — 2026-09-08 10:08 UTC, sei biglietti su `Lab Night`, 6,00 €, con la mail svuotata sull'ordine prima del pagamento

| Sigla | Esito | Osservato |
|---|---|---|
| `P-WH-4` | **PASSA lato organizer** | ordine `failed`, `error_message` «identity_email_missing: indirizzo assente o vuoto sull'ordine», **0 biglietti**; SumUp `PAID` 6,00 (`TAAA6AKPFYP`). Pagina organizer di Lab Night, *Orders without tickets (1)*: **«6,00 € — Paid, and all 6 tickets were never issued. They have nothing at the door — reach out before the night.»** con la causa sotto. Chi organizza lo **vede**, con la frase giusta |
| `P-WH-4` — la superficie dell'acquirente | **FALLISCE, e pesa** | screenshot del proprietario alle 12:08: al ritorno dal pagamento lo schermo dice **«Payment failed — Something went wrong with your payment. Please try again»** con un pulsante **«Try again»**. Il pagamento e' **riuscito**: sono i biglietti a non essere nati. Un ospite in quello stato **paga una seconda volta**. La causa e' distinta lato organizer e collassata lato ospite — lo stesso pattern del newsletter, sulla superficie dove costa di piu'. Da riparare prima del primo listing: «abbiamo ricevuto il pagamento, i biglietti non sono stati emessi, non pagare di nuovo, ti scriviamo» |
| `P-WH-3` — la corsa vera | **PASSA** | mail ripristinata e ordine rimesso `pending` (riparazione a mano, in laboratorio); **due consegne simultanee** del webhook sullo stesso checkout mentre l'ordine era `pending`: entrambe 200 in 3,9 s; biglietti 0 → **6**, non 12; una sola riga di posta; ordine `completed`; identita' invariate (l'acquirente esisteva gia'). Etichette «1 di 6»…«6 di 6» |
| `P-WH-1` (N=6) | **PASSA** | stesso ordine: sei biglietti da un solo ordine, la mail parte una volta |
| nota di esercizio | — | la riparazione di un ordine `failed` per mail assente **non ha una superficie**: e' stata fatta con due `update` sul catalogo. In produzione chi organizza vede l'ordine fallito ma non ha un pulsante per correggere la mail e rigiocare |
| `P-ORD-VIS-1` | **PASSA nella sostanza** | pagina organizer di Lab Night, *Sold tickets (7)*: le sei righe dell'ordine portano **tutte** «Order email sent — outcome not settled yet», l'esito dell'ordine; nessuna dice «no send recorded» (che compare solo sul biglietto seminato senza ordine). Il segno e' **dell'ordine**, mostrato su ogni riga. *Cosmetico:* le righe non sono in ordine numerico (3, 1, 2, 6, 4, 5) |
| `P-UI-4` / `P-ORD-5` | **PASSA** | link firmato dell'ordine da sei, senza sessione: «I tuoi 6 biglietti», **sei** riquadri, **sei QR distinti** (md5 diversi), etichette «Biglietto 1 di 6»…«6 di 6» **in ordine numerico**; nessuna sede |

## La porta — 2026-09-08, dalle 12:24 CEST, proprietario con telefono (staff `door@`) e Mac (master)

| Sigla | Esito | Osservato |
|---|---|---|
| `P-DOOR-1` (2.1) | **PASSA** | `/door` → Lab Night, lista scaricata **Online**: «1 di 6»…«6 di 6» con badge «Lab», piu' «Lab · fff6» per il biglietto senza etichetta; 0 / 7; **nessuna riga vuota, nessuna «Unknown»** |
| `P-DOOR-2` (2.2) | **PASSA** | le sei righe dello stesso ordine sono distinte a occhio, in ordine numerico |
| nota | — | il riquadro «The member list on this device was NOT refreshed. With the radio off, a member who joined recently may not be recognised…» compare **anche con la rete accesa**, al primo caricamento: dice il vero sul rischio, ma con «Online» accanto sembra un'incoerenza |
| posta — ordine da sei | **PASSA, con un fatto da sapere** | «I tuoi 6 biglietti per Lab Night» inviata alle 10:09:46 UTC, Resend `last_event = delivered`; il proprietario **non la vedeva**: Gmail l'aveva messa in **Promozioni**. Le due mail precedenti (biglietto singolo, rivelazione) erano in Inbox. Un ospite che non guarda Promozioni «non ha ricevuto i biglietti»: la conferma a schermo e il link stabile dell'ordine (5.1) sono la prima copia per questa ragione |
| 2.3 | **PASSA** | modalita' aereo, «1 di 6» dalla lista scaricata: verde immediato (riferito dal proprietario) |
| `P-DOOR-8` (2.4) | **PASSA** | biglietto creato **dopo** lo scarico della lista (10:25:18 UTC), scansionato in modalita' aereo: **ammesso**, mai rifiutato; la voce sul dispositivo porta l'etichetta del biglietto («dopo lo scarico»), non «Unknown»; il contatore locale passa a 0 / 8 e «Pending (2)» mostra la coda. Seconda lettura dello stesso QR pochi secondi dopo: «Recorded at 12:33 by this device» |
| `P-DOOR-3` (2.5) | **PASSA** | biglietto seminato con `holder_label` NULL, in modalita' aereo: **verde**, si legge **«Lab · fff6 — Lab · Offline»**, cioe' tier e quattro cifre, non vuoto; «Pending (3)» |
| 2.6 | **PASSA** | rete riaccesa: «Pending» sparisce, il contatore passa a **3 / 8**, «Checked In (3)»; le tre scansioni fatte in aereo sono arrivate |
| `P-CODE-2` (2.7) | **FALLISCE — per l'operatore, non per il codice** | il codice membership coniato dopo il 2026-09-06 (14 caratteri) scansionato dallo staff `door@`, assegnato alla serata con `door.operate`: **rosso**, «This account is not allowed to check people in», voce «Unknown» fra le scansioni recenti. Causa letta nel codice e nel catalogo: `api/membership/verify` chiede `door.operate` **per ruolo** (`requireDoorOperator`, «role alone»), e `private.role_capabilities` lo da' per ruolo solo a `master` e `organizer`; lo `staff` lo riceve solo per serata (`party_assignments`), che la via dei biglietti onora e quella della membership **no**. **Conseguenza in produzione:** chi fa la porta come staff registra i biglietti ma non puo' ammettere un socio dal codice membership. Da ripetere con il master (ruolo) per separare «codice riconosciuto» da «operatore rifiutato» |
| `P-CODE-2` — con il master | **PASSA** | stesso QR, scansionato dal master (ruolo): `door_scan_events` 10:45:56 UTC, `subject_type = membership`, `outcome = recorded`, `source = online`. **Il codice e' riconosciuto**; il rifiuto della riga sopra e' del permesso dello staff, non del codice |
| 3.2 | **PASSA** | rete accesa, dalla finestra del master: «2», «3», «4 di 6» → `recorded`, `source online`, 10:48:42–10:48:59 UTC (con «1 di 6» in aereo al 2.3: quattro dei sei letti) |
| `P-DOOR-4` (3.3) | **PASSA sul server** | «2 di 6» riletto 40 s dopo: `door_scan_events` → `outcome = already_recorded`, stesso dispositivo, operatore master. Lo screenshot del riquadro rosso con ora e operatore e' del proprietario |
| `P-DOOR-4` (3.3) — a schermo | **PASSA con un difetto di etichetta** | riquadro **viola** (non rosso) con l'orologio: «**Unknown** — Recorded at 12:48 by Lab Master», contatore 6 / 8. Ora e operatore ci sono; **il biglietto e' chiamato «Unknown» invece di «2 di 6»**, sebbene sia nella lista scaricata e sia appena stato letto verde con la sua etichetta. Chi e' alla porta vede «gia' registrato» senza sapere *quale* biglietto |
| `P-DOOR-5` (3.4) | **PASSA** | modalita' aereo su due finestre (due `device_id` diversi): «5 di 6» **verde su entrambe**; al rientro della rete `door_scan_events` porta `recorded` (master, `offline_sync`) e, 17 s dopo, `already_recorded` (staff, `offline_sync`) |
| 3.5 — la review | **PASSA** | `/admin/events/<id>/review`: *«2 tickets were presented twice … **1 of them was read on two different devices** — the case where two people may have entered on one ticket. 1 was read on a phone that had no signal, and **that read was not refused at the door**…»*; riga «At 12:51, the same ticket was read on two devices, 18 seconds apart», causa `two_devices`, `offline_sync`. La rilettura online del 2 di 6 e' classificata a parte: `second_ticket_same_holder`, «No action beyond making the entry count add up». Conteggio: «1 — same code read twice · 1 — read on two devices · 10 scans in all». *Nota di copy:* lo staff senza nome compare come «an unnamed operator» |
| `P-DOOR-6` (3.6) | **PASSA** | «6 di 6» letto tre volte in 17 s dallo stesso dispositivo (staff): `recorded`, poi due `already_recorded`. Review: *«2 reads were the same code within seconds and are not listed. A rising number here means the scanner's feedback was not visible at the door … It says nothing about any guest»*; il conteggio in testa resta «1 — same code read twice · 1 — read on two devices»; «13 scans in all, of which 9 were an ordinary admission or a reversal» |
| `P-DOOR-7` (3.7) | **NON RIPRODUCIBILE in laboratorio** | chiede un telefono che porti gia' uno store alla versione 5 con voci in coda; il telefono del laboratorio non ha mai avuto uno store precedente |
| `P-CODE-5` (2.8) | **NON RIPRODUCIBILE in laboratorio** | i quattro codici «preesistenti» sono di produzione; quelli del laboratorio sono tutti coniati dal trigger nuovo |
| `P-REV-MUT-1` | **NON ESEGUITA** | chiede di rendere illeggibile la chiave del fornitore di posta sull'anteprima (variabile Vercel + ridistribuzione) e un acquisto in piu'; non scelta in questa sessione. Resta scritta |
| `P-BUY-3` | **MAI CONCLUSIVA, per costruzione** | come dichiara il runbook: l'azione non accetta un prezzo; l'importo dell'ordine coincide col catalogo (`P-BUY-1`: 2 × 1.00) |

## Il conto, alla fine — 2026-09-08

| | Quante | Quali |
|---|---|---|
| **Percorse** | **46 / 52** | tutto il resto |
| Passano | 40 | — |
| Passano con un difetto osservato | 2 | `P-DOOR-4` (etichetta «Unknown» sul gia' registrato), `P-WH-4` (lato organizer passa; **lato ospite «Payment failed» su un pagamento riuscito**) |
| **Falliscono** | 3 | `P-UI-6` (frase del tetto a zero non arriva), **`P-CODE-4` (chi e' in guest list non puo' creare un account — anche in produzione)**, `P-CODE-2` con lo staff (lo staff assegnato non puo' ammettere dal codice membership; con il master passa) |
| Non eseguibili / non riproducibili / mai conclusive | 6 | `P-REV-MUT-1`, `P-DOOR-7`, `P-CODE-5`, `P-BUY-3`, `P-ORD-4` (azione senza superficie), `P-MAIL-6` |

**Le tre «prima del primo listing pubblico» sono tutte percorse:** procedura 1 sul venue (nessun indirizzo su nessuna superficie, ricevuta SumUp compresa), il denaro (`P-WH-1`, `P-WH-2`, `P-RES-1`, piu' la corsa vera di `P-WH-3`), il passo 2.4 (biglietto comprato dopo lo scarico, radio spenta: ammesso).

**Da riparare prima del primo listing, in ordine di costo per chi paga o entra:**
1. **La schermata «Payment failed — Try again» su un ordine pagato senza biglietti** (`P-WH-4`, lato ospite): invita a pagare due volte.
2. **Chi e' in guest list `pending`/`invited` non puo' creare un account** (`P-CODE-4`): l'`UPDATE` della voce precede l'`INSERT` del profilo nel trigger. Vale anche per la creazione in-app da admin.
3. **Lo staff assegnato alla serata non puo' ammettere un socio dal codice membership** (`P-CODE-2`): `api/membership/verify` chiede `door.operate` per ruolo.
4. «Rimandami i biglietti» non ha una superficie (`P-ORD-4`).
5. Il «gia' registrato» chiama il biglietto «Unknown» (`P-DOOR-4`); il tetto a zero mostra l'errore generico di Next (`P-UI-6`).

**Fatti da sapere, non difetti del codice:** la mail da sei biglietti e' finita in Promozioni su Gmail; nell'app Gmail il QR arriva come allegato e non inline; la ricevuta SumUp porta ragione sociale e indirizzo legale del merchant; Apple Pay non e' verificabile sul dominio del laboratorio; il riquadro «member list NOT refreshed» compare anche online; «Hey Member» e «an unnamed operator» quando il profilo non ha un nome.

**Il laboratorio resta com'e'**, con i suoi dati: tre ordini veri (8,00 €), otto biglietti, tredici scansioni. Sono materiale per la verifica, non da cancellare: `49-VERIFICATION.md` li cita.

## Le riparazioni — 2026-09-08, commit `45be363`

| Difetto | Correzione | Verifica |
|---|---|---|
| «Payment failed — Try again» su un ordine pagato senza biglietti (`P-WH-4`, lato ospite) | `payment/callback/actions.ts`: su un ordine `failed` il ritorno **riverifica il checkout su SumUp**; se `PAID` → stato `PAID_NOT_ISSUED` e schermata «We received your payment — your tickets were not issued. **Do not pay again**», senza «Try again»; se il fornitore non risponde → `UNCONFIRMED`, «check your bank app before paying again» | build verde; prova sul laboratorio sotto |
| chi e' in guest list non puo' creare un account (`P-CODE-4`) | migration `20260908120000_guest_list_update_after_profile`: l'`UPDATE` della voce dopo l'`INSERT` del profilo | laboratorio: `P-CODE-4` ripetuto, **passa**; **produzione: applicata alle 11:14:36 UTC** sotto autorizzazione (`49-AUTHORISATION.md`), riletta dal catalogo |
| lo staff assegnato non puo' ammettere dal codice membership (`P-CODE-2`) | `api/membership/verify`: il corpo si legge prima e la guardia riceve la serata, come la via dei biglietti; decisione del proprietario: ruolo **oppure** assegnazione alla serata | prova sul laboratorio sotto, con la sessione dello staff |

**Verifica delle riparazioni sul laboratorio (deploy `45be363`, 2026-09-08 11:2x UTC):**

| Riparazione | Osservato |
|---|---|
| schermata «non ripagare» | ordine da sei messo `failed` per un istante (checkout SumUp `PAID`): `/payment/callback?ctx=ticket_order&order=…` → **«We received your payment — your tickets were not issued»**, «Do not pay again» presente, **«Try again» assente**; ordine ripristinato `completed` |
| staff e codice membership | sessione di `door@` (staff, assegnato alla serata), `POST /api/membership/verify` con un codice mai letto → **200**, `valid: true`, `outcome: recorded`; `door_scan_events` attribuisce l'evento a `door@`. `P-CODE-2` **passa anche con lo staff** |
| trigger delle iscrizioni | `P-CODE-4` ripetuto dopo la migration: **passa**; produzione allineata (migration applicata e riletta dal catalogo) |

**Bilancio finale: 46 prove percorse, 3 fallimenti trovati e riparati lo stesso giorno, produzione aggiornata (codice e trigger).** Restano aperti, dichiarati: `P-UI-6` (frase del tetto a zero), l'azione «rimandami i biglietti» senza superficie, l'etichetta «Unknown» sul gia' registrato, e le sei prove non eseguibili in laboratorio.

## La riparazione di un ordine pagato senza biglietti ha uno strumento — commit `c5db820` + `7d55194`, 2026-09-08

| Cosa | Dove | Verifica sul laboratorio |
|---|---|---|
| «Retry issuing» sulla scheda dell'ordine fallito | `admin/events/[id]/tickets/actions.ts` → `replayPaidOrderDelivery` (`src/lib/tickets/replay-order-delivery.ts`): rilegge su SumUp che il checkout sia `PAID`, rifiuta se l'ordine ha gia' biglietti, rimette `pending` e **rigioca la consegna al webhook** — nessuna seconda strada del denaro | ordine da sei messo `failed` con i suoi biglietti → **rifiutato**, biglietti 6 → 6; ordine abbandonato (checkout `PENDING`) messo `failed` → **rifiutato**. Il ramo felice (failed senza biglietti, checkout PAID) e' la stessa sequenza eseguita a mano per `P-WH-3`/`P-WH-4`; non riprodotto dal pulsante perche' ogni checkout pagato del laboratorio ha gia' i suoi biglietti — si prova al prossimo acquisto con la mail svuotata |
| cron `retry-failed-orders`, 07:15 UTC | `api/cron/retry-failed-orders`: ordini `failed` fermi da 10 minuti, salta `identity_email_missing`, conta per elemento | sul laboratorio: `considered 2, checkoutNotPaid 1, other 1 (has_tickets), completed 0`; nessuna scrittura |
| la 3 — biglietti anche senza identita' | `49-BEARER-WITHOUT-IDENTITY.md`: specifica di fase, quattro decisioni da prendere prima di pianificare | da pianificare in una sessione nuova |

### Il ramo felice del pulsante, dal telefono del proprietario — 2026-09-08, acquisto 4 (1,00 €)

| Passo | Osservato |
|---|---|
| ordine da 1 con la mail svuotata prima del pagamento; SumUp `PAID` | ordine `failed`, «identity_email_missing» |
| schermata al ritorno (screenshot del proprietario, 13:45) | **«We received your payment — your tickets were not issued. Do not pay again…»**, solo «Go to events». La riparazione di `P-WH-4` lato ospite e' verificata con un pagamento vero |
| correzione della mail (a mano, come farebbe chi organizza) + **«Retry issuing» premuto dal proprietario** nella finestra del master | 11:48:07 UTC: ordine **`completed`**, `error_message` null, **1 biglietto** «1 di 1» `guest_checkout`, **1** riga di posta con id del fornitore. Nessun secondo pagamento, nessun biglietto in piu' |

**Totale speso dal proprietario per le prove: 9,00 € su quattro ordini, tutti con i loro biglietti.**
| la mail dopo il pulsante | **PASSA** | riferito dal proprietario: «Il tuo biglietto per Lab Night» arrivata dopo «Retry issuing», una sola volta — coincide con l'unica riga di `email_deliveries` dell'ordine |

## L'avviso a `info@` — commit `d090bca`, 2026-09-08, acquisto 5 (1,00 €)

| Passo | Osservato |
|---|---|
| ordine da 1 con mail svuotata, pagato | `failed` «identity_email_missing»; **Resend: «Pagato senza biglietti — Lab Night — 1,00 €» verso `info@resonatemotion.com`, 12:00:40 UTC** |
| mail ripristinata, **Retry issuing** dal proprietario | ordine `completed`, 1 biglietto, 1 mail al compratore; **avvisi a info@ nei 10 minuti: 1** — il secondo fallimento non e' avvenuto e la traccia `retrying:` avrebbe comunque taciuto |
| nota | l'ordine completato conserva in `error_message` la causa del fallimento precedente: il webhook non la ripulisce alla chiusura. Cosmetico oggi (la sezione «address never sent» filtra sulle cause `reveal_*`), da pulire quando si riapre il webhook |

**Totale speso dal proprietario per le prove: 10,00 € su cinque ordini, tutti con i loro biglietti.**
