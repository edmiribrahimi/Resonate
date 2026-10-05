---
task: quick 2026-10-05 — codice a 0 € con benefit mostrato alla porta
branch: hotfix/codice-chupito
classification: Critical (porta, online e offline) + Structured (admin, compratore)
requirements: nessun ID di requisito — richiesta diretta del proprietario del 2026-10-05
completed: 2026-10-05
---

# Quick 2026-10-05 — codice sconto a 0 € che porta un benefit alla porta

**In una riga:** un codice sconto puo' valere 0 € e portare un benefit breve
(«1 chupito»); chi organizza lo crea dall'admin, il compratore legge «Code
applied: 1 chupito» a prezzo pieno, e lo scanner stampa «+ 1 chupito» sotto il
tipo di biglietto — online, offline, su *Already recorded*, sugli annullamenti e
come badge nella lista della serata. Il prezzo non cambia in nessun punto.

## Cosa e' cambiato

| Dove | Cosa |
|---|---|
| `supabase/migrations/20261005120000_discount_code_benefit.sql:21-36` | `discount_amount >= 0` (il vecchio vincolo si toglie SENZA `IF EXISTS`: se il nome fosse diverso la migration fallisce invece di lasciare il `> 0`); colonna `benefit text` 1..60 dopo trim; `CHECK (discount_amount > 0 OR benefit IS NOT NULL)`; `COMMENT ON COLUMN` (:38-43). RLS invariata. Nessun `BEGIN;`. |
| `src/types/database.ts:469-470` | `DiscountCode.benefit: string \| null` |
| `src/app/(admin)/admin/events/[id]/tickets/actions.ts:389-398` | `parseBenefit`: trim, max 60, «A 0 code needs a benefit shown at the door» |
| idem `:426-430`, `:526-530` | create/update rifiutano `< 0` (non piu' `<= 0`) e salvano `benefit` (`:468`, `:566`) |
| idem `:665`, `:673`, `:713` | `validateDiscountCode` restituisce il benefit |
| `src/components/tickets/AddDiscountCodeForm.tsx:62-71`, `DiscountCodeCard.tsx:93-98` | stessa regola ripetuta lato client: in produzione Next **omette il messaggio** di un'eccezione lanciata da una server action, quindi senza questo controllo il rifiuto arriverebbe generico |
| `AddDiscountCodeForm.tsx` (campo `benefit`, `min={0}`), `DiscountCodeCard.tsx:202-217`, `:315-319` | campo «Benefit shown at the door (e.g. 1 chupito)», max 60; la card mostra «+ benefit» e lo modifica |
| `src/app/(admin)/admin/(work)/events/[id]/tickets/page.tsx:251` | passa `benefit` alla card |
| `src/app/(public)/events/[slug]/TierSelection.tsx:668-675` | a 0 con benefit: «Code applied: <benefit>»; con importo > 0: «Discount applied: 10% + <benefit>» |
| idem `:607` | il prezzo barrato compare solo se il prezzo scende davvero: con un codice a 0 niente «10,00 €» barrato accanto a «10,00 €» |
| `src/app/api/tickets/checkin/route.ts:791`, `:1009-1037`, `:1085`, `:1144`, `:161-166` | `discount_code_id` nella lettura del biglietto; **lettura separata e non bloccante** di `discount_codes.benefit` (`checkin:benefit_unreadable`); `benefit` nella risposta dei due rami che ammettono |
| `src/app/api/tickets/attendance/route.ts:294-301`, `:888-915`, `:937-940` | `AttendeeItem.benefit` nel manifesto; lettura che non fa mai fallire il manifesto (`[attendance] benefit read failed`); `null` per guest list e rimborsati |
| `src/lib/offline/checkin-store.ts:188-197`, `:814-815`, `:975-982` | `AttendeeRecord.benefit` opzionale; il merge prende il valore del server quando il campo c'e', tiene quello del telefono quando un manifesto vecchio non lo porta |
| `src/components/scanner/ScanFlash.tsx:47-54`, `:220-226` | riga «+ <benefit>» sotto il sottotitolo, `text-xl font-bold`, stesso inchiostro `text-ground`; il titolo non cambia (D-51-05, niente nome) |
| `src/app/(admin)/admin/scanner/ScannerClient.tsx` | `showFlash(…, benefit)` `:1797-1812`; Admitted online `:2282-2308`; Already recorded online `:2342-2348`; Already recorded offline `:2413-2424`; Admitted offline `:2492-2504`; i due annullamenti `:2000`, `:2052`; badge nella lista `:4051-4055` |

Il percorso del denaro **non e' stato toccato**: `order-quote.ts:613-619`,
`purchaseTicket` (`admin/events/actions.ts:1933-1945`) e
`guest-purchase-actions.ts:365` non hanno alcun controllo di verita'
sull'importo (`if (!amount)`, `amount && …`): un codice a 0 passa la
validazione, lascia il prezzo identico e scrive `discount_code_id` come prima.
Il minimo di 1,00 € non e' coinvolto, perche' il prezzo non scende.

## Prova sul laboratorio (ore UTC)

Dev server `npm run dev:lab -- --webpack` nel worktree (Turbopack rifiuta il
`node_modules` simbolico), Chrome headless con profilo isolato e **camera
finta** che inquadra il QR firmato del biglietto seminato: la scansione e' una
lettura vera di `html5-qrcode`, non una chiamata all'API. Schermate in
`~/Documents/Resonate/hotfix-benefit/`, fuori dal repo.

| UTC | Passo | Ruolo | Osservato | Schermata |
|---|---|---|---|---|
| 19:18:15 | migration applicata con UNA `POST /database/migrations` | — | `200 []` | — |
| 19:18:23 | catalogo, `read_only` | — | colonna `benefit text NULL`; vincoli `discount_amount >= 0`, `benefit_length_check`, `zero_needs_benefit_check`; registro migration con il nome del file | — |
| 19:27:16 | preparazione | — | originali salvati; serata e evento spostati a oggi (lo scanner elenca solo da ieri in poi); biglietto seminato tolto dal check-in | — |
| 19:29:12 | codice a 0 senza benefit dal form | master | «A 0 code needs a benefit shown at the door» | `01-admin-refusal-0-without-benefit.png` |
| 19:29:16 | codice `CHUPITO-LAB`, 0, «1 chupito» dal form | master | card: «+ 1 chupito», «0%», «0 used» | `02-admin-code-created.png` |
| 19:29:28 | stesso caso scritto con la chiave di servizio (scavalca form e azione) | — | `23514` — il catalogo rifiuta | — |
| 19:29:28 | codice agganciato al biglietto seminato (scrittura solo-lab) | — | `discount_code_id` valorizzato, `checked_in = false` | — |
| 19:30:25 | scansione ONLINE | staff (`door.operate`) | **Admitted / Lab / + 1 chupito** | `03-online-admitted.png` |
| 19:30:26 | lista della serata | staff | badge «+ 1 chupito» | `04-night-list-badge.png` |
| 19:30:33 | seconda scansione online | staff | Already recorded / Recorded at 21:30 / + 1 chupito | `05-online-already-recorded.png` |
| 19:30:35 | annullamento online | staff | rifiutato: «needs a supervisor» (regola esistente, invariata) | `06-online-undo.png` |
| 19:32:54 | camera aperta online, rete tolta via CDP (`navigator.onLine = false`), scansione OFFLINE | staff | **Admitted / Lab · Offline / + 1 chupito** | `07-offline-admitted.png` |
| 19:32:55 | annullamento offline | staff | rifiutato: «needs a supervisor» (atteso) | `08-offline-undo-staff.png` |
| 19:33:04 | rete restituita | staff | la coda si svuota: il server ha il check-in | — |
| 19:33:30 | scansione online | master | Admitted / Lab / + 1 chupito | `09-master-online-admitted.png` |
| 19:33:32 | annullamento online | master | **Check-in undone / Lab / + 1 chupito**; server `checked_in = false` | `10-online-undo.png` |
| 19:33:46 | scansione offline | master | Admitted / Lab · Offline / + 1 chupito | `11-master-offline-admitted.png` |
| 19:33:48 | annullamento offline | master | **Undone on this device / Lab — held here, not yet reported / + 1 chupito**; al ritorno della rete il server resta `false` (l'annullato non si riporta) | `12-offline-undo.png` |
| 19:34:22 | pagina pubblica, ospite senza sessione, prezzo del livello portato a 10 € per la prova | — | **«Code applied: 1 chupito»**, prezzo «10,00 €» non barrato, nessun «0,00 €» nella pagina; fermato prima del pagamento | `13-buyer-code-applied.png` |
| 19:34:23 | prezzo del livello rimesso a 0 | — | `price = 0` riletto | — |
| 19:34:41 | **ripristino e riconteggio da PostgREST** | — | biglietto: `checked_in`, istante, operatore e `discount_code_id = null` identici agli originali; serata ed evento di nuovo al 2026-09-28; livello a 0; codici sulla serata: 0 | — |

**Ripristinato**, riletto il 2026-10-05 alle 19:34:41 UTC. **Resta** nel lab,
per costruzione: **5 righe di `door_scan_events`** sul biglietto seminato
(`recorded/online`, `already_recorded/online`, `recorded/offline_sync`,
`recorded/online`, `recorded(undo)/online`) — sono il registro della porta, che
si appende e non si cancella.

## Passi di produzione (per l'orchestratore, dopo il «vai»)

1. **Migration**: UNA `POST /v1/projects/{ref-produzione}/database/migrations`
   con `name = 20261005120000_discount_code_benefit` e il testo del file.
   Applicarla **prima** del deploy non rompe nulla: il codice corrente non legge
   `benefit`. Il deploy prima della migration non rompe la porta (la lettura del
   benefit e' separata e non bloccante) ma il form admin fallirebbe all'insert.
2. **Lettura del catalogo `read_only`**: colonna `benefit` presente;
   `pg_get_constraintdef` di `discount_codes_discount_amount_check` = `>= 0`;
   presenti `discount_codes_benefit_length_check` e
   `discount_codes_zero_needs_benefit_check`; registro migration con quel nome.
3. **Push** del ramo `hotfix/codice-chupito` su `main` (3 commit di codice + 1
   di documentazione), deploy Vercel, controllo che il deploy sia `READY`.
4. **Creare il codice** dall'admin della serata: importo 0, benefit «1 chupito».
5. **Lo staff riscarica il manifesto** sui telefoni (riapre la serata con la rete)
   prima di aprire la porta: un manifesto scaricato prima del deploy non porta il
   campo e la riga offline non compare finche' non si riscarica.

## Limiti dichiarati

- **Il benefit si legge dal codice, non dal biglietto.** Un codice con vendite
  si **disattiva**, non si cancella: cancellarlo mette a `NULL`
  `tickets.discount_code_id` (`ON DELETE SET NULL`) e il benefit sparisce dalla
  porta. Oggi la cancellazione e' gia' vietata con vendite
  (`deleteDiscountCode`, «Cannot delete a discount code that has been used»).
  Modificare il testo del benefit cambia cio' che la porta mostra per **tutti**
  i biglietti gia' venduti con quel codice.
- **Offline senza manifesto** (biglietto comprato dopo il download): ammesso e
  segnalato come sempre, **senza** la riga del benefit — il telefono non puo'
  saperlo.
- **Nessun «consumato».** La riga ricompare a ogni scansione, anche su *Already
  recorded*: segnare un chupito come gia' dato non e' in questo task. Se il
  doppio omaggio diventa un problema, e' una decisione di prodotto.
- **Sales dashboard**: il codice compare con «0,00 €» come importo dello sconto
  (vero, e solo admin); non mostra il benefit.
- **La prova d'acquisto si ferma prima del pagamento.** Che `discount_code_id`
  venga scritto su un ordine a 0 di sconto e' provato leggendo il codice
  (`order-quote.ts:619`, nessun ramo sull'importo), non con un incasso.
- **Render headless**, non un telefono: le schermate provano testo e gerarchia,
  non i touch target.

## Deviazioni dal piano

**1. [Rule 1 - Bug, sicurezza della porta] Nessun salto di versione IndexedDB.**
Il piano chiedeva di alzare `DB_VERSION`. Il pattern del file per un campo
opzionale e' **non** alzarla: `refundedBeforeNight` (52.2-11) e' entrato cosi',
e `DB_VERSION` e' ancora 6. IndexedDB salva un clone strutturato, quindi una
riga senza `benefit` si carica invariata (nessuna riga rifiutata). Un salto
invece aggiunge un `versionchange` e `openDB` non gestisce `blocked`: una
seconda scheda col bundle vecchio aperta sul telefono lascerebbe il database
**in attesa** — alla porta. Motivo scritto accanto al campo
(`checkin-store.ts:188-197`).

**2. [Rule 2 - Correttezza] Il benefit alla porta e' una lettura separata**, non
un embed nella lettura del biglietto: un embed che fallisce (deploy prima della
migration, cache di schema non ricaricata) farebbe fallire tutta la lettura e
rifiuterebbe ogni ospite. Stesso principio nel manifesto.

**3. [Rule 2 - Errori visibili] Controllo lato client nei due form**, perche' in
produzione il messaggio della server action non arriva al browser.

**4. [Rule 1 - Bug] Prezzo barrato uguale al prezzo pieno** con un codice a 0:
corretto con `< tier.price` (`TierSelection.tsx:607`).

## Verifica

`npm run build` exit 0 (dopo il task 2 e dopo il task 3);
`verify:scan-legibility`, `verify:touch-targets`, `verify:dialogs`,
`verify:no-viewport-read`, `verify:breakpoints`, `verify:routes`,
`verify:capabilities` exit 0. Nessun test runner per il prodotto: la prova e' la
tabella qui sopra.

## Commit

- `a040eb9c` feat(quick-benefit): codice sconto a 0 € con benefit — migration e tipi
- `3bd26c9c` feat(quick-benefit): codice a 0 € con benefit — admin e compratore
- `5cc99672` feat(quick-benefit): la porta mostra il benefit del codice, online e offline
