---
phase: 47-il-token-che-si-beve-e-si-fa-rimborsare
milestone: v1.6
verified: 2026-08-20
status: human_needed
requirements_total: 9
requirements_closed: 7
requirements_human_needed: 3
requirements_contradicted: 0
---

# Fase 47 — Verifica

> **Cosa significa `human_needed` qui.** Sette requisiti sono chiusi: cinque da
> lettura del codice con citazione, **uno da una prova eseguita**, **due dalla
> testimonianza del proprietario** su una serata reale.
>
> **Tre restano aperti, e nessuna serata passata puo' chiuderli**: quel codice e'
> stato scritto il 2026-08-20. L'8 maggio non esisteva un percorso di richiesta di
> rimborso, non esisteva la biforcazione automatico/manuale, e non esisteva
> `activation_count`. **Una testimonianza copre cio' che c'era, non cio' che c'e'
> adesso** — ed e' la distinzione che questo file esiste per non lasciar
> scivolare.
>
> Non esiste un test runner per il prodotto. `npm run build` e' il typecheck, non
> una prova di comportamento.

## Requisito per requisito

### DRK-01 — nessun cron emette piu' rimborsi · **CHIUSO**

- `src/app/api/cron/refund-expired-tokens/route.ts` — `refundTransaction` compare
  **0 volte**; l'import da `@/lib/sumup` non c'e' piu'.
- L'esito `cron_refund_refunds_failed` e' rimosso dall'unione, dal `Record` degli
  stati HTTP e da quello delle frasi: un esito irraggiungibile lasciato in un
  `Record` totale svuota di significato la totalita' stessa.
- La voce in `vercel.json` **resta**: la pulizia e' lavoro vero.

### DRK-02 — richiesta entro una finestra, 72 di default e modificabile · **human_needed**

- `supabase/migrations/20260820110000_drink_refund_requests.sql` — la tabella e
  `event_parties.refund_request_window_hours`, `NOT NULL DEFAULT 72` con
  `CHECK (> 0)`. **Applicata in produzione**, confermata dal catalogo: default
  letto `72`, 2 policy, RLS attiva, **0 policy di INSERT o DELETE**.
- `src/app/(public)/events/[slug]/menu/actions.ts` — `requestDrinkRefundGuest`,
  sei cause piu' il guasto, tutte come **valore restituito** (Next oscura il
  messaggio di un errore lanciato fuori da una server action in produzione).
- **Manca l'osservazione:** i sei passi del piano 47-03 Task 4. In particolare il
  sesto — verificare che **nessuno stato di pagamento sia cambiato** — che e'
  l'unica prova che questo percorso crei una richiesta e non un rimborso.

### DRK-03 — l'emissione resta dietro `staff.manage` · **CHIUSO**

- `src/app/(admin)/admin/events/actions.ts` — `approveDrinkRefund` e
  `rejectDrinkRefund` chiedono `CAP.STAFF_MANAGE` **prima di qualunque lettura**.
- Il confine vero e' la policy: `drink_refund_request_select_staff` e
  `_update_staff` chiamano `private.has_capability('staff.manage')`.
- Misurato in produzione: `staff.manage` e' tenuta da **master e organizer**.

### DRK-04 — la traccia sopravvive, le attivazioni si contano · **CHIUSO, E CON UNA PROVA ESEGUITA**

**E' il requisito meglio verificato della fase, e l'unico verificabile una volta
sola.**

- `supabase/migrations/20260820100000_drink_token_activation_history.sql` —
  `activated_at = NULL` compare **0 volte fuori dai commenti**;
  `activate_drink_token` incrementa nella stessa istruzione che cambia lo stato.
- **Eseguito** contro un laboratorio: cinque cicli attiva → annulla lasciano
  `activated_at` **valorizzato** e `activation_count = 5`. Prima della modifica le
  stesse righe davano `NULL`. Referto: `.planning/v1.6-PHASE-47-PROBE.md`; sonda:
  `scripts/probe-drink-token-cycle.mjs`.
- **Fedelta' dell'ambiente:** 8 cataloghi identici su 10, e le 2 divergenze erano
  **esattamente i due oggetti della migration**, enumerati per nome. Piu'
  informativo di un 10/10: dice che aggiunge quello che dichiara e nient'altro.
- **Controprove intatte:** primo `redeem` `true`, secondo `false`, annullamento
  dopo il serve **rifiutato dal database**.
- **In produzione:** applicata su `drink_tokens` con **0 righe**, con le tre
  definizioni di funzione catturate prima; conferma **riletta dal catalogo**.

> ⚠ **Questa misura non e' ripetibile.** Dopo la modifica il comportamento vecchio
> non e' piu' osservabile. Farla dopo non sarebbe stato tardi: sarebbe stato
> impossibile.

### DRK-05 — mai attivato, automatico su richiesta · **human_needed**

- `src/app/(public)/events/[slug]/menu/actions.ts` — `token.activation_count !== 0`
  manda in attesa; solo lo zero stretto emette. **`activated_at` non compare nella
  decisione**: 0 occorrenze.
- `null` non passa: verificato **eseguendo** il filtro `activation_count = 0` su
  una riga con conteggio `NULL` → **0**.
- Il codice di transazione si rilegge **sempre** dal checkout.
- **Manca l'osservazione:** un rimborso davvero partito.

### DRK-05b — attivato, richiesta sempre possibile e decisione manuale · **human_needed**

- `RefundRequestList.tsx` — le richieste in attesa con il conteggio accanto,
  **come numero**: nessun tono, nessuna etichetta di sospetto, nessun
  ordinamento. `null` si disegna «attivazioni: nessun dato», non `0`.
- **Nessun ramo respinge automaticamente**: un rifiuto automatico e' un rimborso
  automatico col segno cambiato.
- **Manca l'osservazione:** il passo 3 del piano 47-04 Task 4 — un account senza
  `staff.manage` a cui la **base dati** rifiuta la lettura, non solo la pagina.
  E' l'unico passo che misura un confine invece di un percorso.

### DRK-06 — SERVED resta cinque secondi · **CHIUSO**

- `GuestTokenDisplay.tsx` e `RedeemConfirmationModal.tsx`: `}, 5000);` in
  entrambe. **Il piano ne prevedeva una: erano due.**
- Il terzo `3000` del file e' l'intervallo di interrogazione dei token, non la
  conferma.
- Che cinque secondi bastino a leggere e' una **conseguenza della sequenza
  dichiarata** (lettura al tocco), non una misura sul campo.

### DRK-07 — SERVED non compare senza il server · **CHIUSO dalla testimonianza del proprietario**

- Verificato **per posizione nel sorgente**, non a occhio: in entrambe le modali
  `setPhase("served")` sta dopo l'`await`.
- Due commenti dichiarano l'invariante dove sta il codice che la regge.
- **Chiuso il 2026-08-20 dal proprietario:** *«queste cose funzionavano gia' al
  party dell'8 maggio, comprovate funzionanti»*.

**Perche' quella testimonianza chiude QUESTO requisito e non altri.** L'invariante
e' codice **preesistente**: questa fase ne ha cambiato il timeout, non l'ordine
delle istruzioni. Una sera vera, con baristi veri e la rete di un locale, e'
esattamente l'osservazione che nessun laboratorio sa produrre — e vale piu' di una
prova a tavolino, non meno.

**La serata esiste in calendario:** l'ultimo evento in produzione e' datato
**2026-05-08**. Ma **di quella sera non resta un dato**: 0 ordini bar, 0 token, 0
biglietti. Le 63 righe furono distrutte il 2026-08-10 dall'incidente registrato in
`ai-engineering.md`. La testimonianza e' quindi l'**unica** evidenza rimasta, e va
registrata come tale invece di essere trattata come se fosse ricostruibile.

### DRK-08 — il runbook del banco · **CHIUSO dalla testimonianza del proprietario**

- `47-BAR-RUNBOOK.md`, quattro sezioni, nessun nome di persona.
- **Chiuso il 2026-08-20:** la procedura era gia' in uso all'8 maggio. Il runbook
  **scrive cio' che si faceva gia'**, non introduce un comportamento nuovo —
  quindi non c'e' una pratica da validare, c'e' una pratica da conservare.
- **Resta vero il motivo per cui esisteva il passo:** una procedura che vive nella
  testa di chi c'era non sopravvive al primo turno fatto da qualcun altro. E'
  esattamente il caso che questo file rimuove.

## La testimonianza, e il suo perimetro

Registrata perche' una milestone futura non la estenda a cio' che non copre.

| requisito | l'8 maggio esisteva? | esito |
|---|---|---|
| **DRK-07** — SERVED solo dopo il server | **si'**, codice preesistente | **chiuso** |
| **DRK-08** — la procedura del banco | **si'**, in uso | **chiuso** |
| **DRK-02** — richiesta di rimborso | **no** — scritta il 2026-08-20 | resta aperto |
| **DRK-05** — rimborso automatico | **no** — la regola non esisteva | resta aperto |
| **DRK-05b** — revisione manuale col conteggio | **no** — `activation_count` non esisteva | resta aperto |

## Anti-pattern trovati

Nessun `TODO`, `FIXME`, stub o finto percorso introdotto da questa fase.

**Un pezzo di codice morto RIMOSSO**, non aggiunto: `toSafeError` nel cron
restava definito e mai chiamato dopo la rimozione del ramo di rimborso. Su un
percorso del denaro un aiutante morto **sembra una protezione attiva**, e chi
legge conta una difesa in piu' di quelle che ci sono.

## Debito dichiarato

| | |
|---|---|
| **Il percorso del cron ha un nome sbagliato** | `refund-expired-tokens` non rimborsa piu'. Rinominarlo tocca `vercel.json` e la cartella insieme, e un disallineamento produce un **404 su un cron che nessuno guarda**. Si salda quando ci sara' un'altra ragione per toccare `vercel.json`. |
| **Guardia di pagina e policy coincidono per caso** | `organizer.access` e `staff.manage` sono tenute dagli stessi ruoli **oggi**. Se divergessero, la lista direbbe «nessuna richiesta» a chi la base dati ha rifiutato. Scritto nel file. |
| **Quattro chiamanti di `refundTransaction`** | erano 3. I due nuovi hanno entrambi una richiesta a monte; quello rimosso partiva **senza che nessuno chiedesse niente**. |

## Cosa NON e' stato fatto, e la fase non lo nasconde

**Il difetto non e' impedito: e' reso visibile.** A impedirlo e' la procedura del
banco. Chiunque legga questa fase cercando una serratura non la trovera', e non
perche' sia stata dimenticata.
