# Phase 49: Comprare senza account — Context

**Gathered:** 2026-09-05
**Status:** Ready for planning
**Source:** decisioni del proprietario del 2026-08-22, raccolte in
`.planning/todos/pending/guest-ticket-purchase.md`, piu' i requisiti `BUY-01…05`
della ROADMAP. Nessuna sessione di domande: le decisioni difficili erano gia'
prese e datate.

> **Questo file e' pubblicato.** `.planning/` e' tracciato su un repository
> pubblico. Nessuna data non annunciata, nessuna sede, nessuna line-up compare
> qui — e la scadenza reale di questa fase e' espressa come **ancora**, non come
> giorno. Vedi `ai-engineering.md`, gate *la pianificazione e' pubblica*.

<domain>
## Phase Boundary

**Dentro:** l'acquisto di un biglietto da parte di chi non ha un account, un
ordine che contiene piu' biglietti con un tetto per serata, il ritrovamento dei
biglietti senza login, e la generazione del codice del biglietto.

**Fuori:** lo smantellamento delle iscrizioni e delle superfici da socio (fasi
50 e 51). Questa fase **apre una strada nuova**; non chiude quella vecchia. Le
due cose insieme sarebbero una superficie mezza convertita, che e' la regola che
la fase 41 ha scritto su se stessa.

**L'ancora temporale, senza data.** Questa fase deve essere finita e provata
**prima del primo listing pubblico della milestone** — il momento in cui una
persona che non ci conosce vede una serata e prova a comprare. Da quel momento
esiste denaro reale su questo percorso, e ogni difetto costa a una persona che
ha pagato. E' l'unica fase della milestone che sta fra oggi e un biglietto
vendibile.

</domain>

<decisions>
## Implementation Decisions

### Le sei decisioni del proprietario — 2026-08-22, prese con l'analisi d'impatto davanti

1. **Un ospite puo' comprare un biglietto su TUTTE le serate**, non solo sui
   satelliti in locali pubblici.
2. **L'acquisto crea un account leggero al volo** — nessun modulo, nessuna
   password chiesta al momento di comprare.
3. **Il venue segreto NON viene rivelato all'acquisto.** La rivelazione resta
   dove sta oggi: al countdown, per mail, dal cron.
4. **Il link d'accesso porta a una schermata di scelta password** che *completa*
   l'account, cosi' si rientra da qualunque dispositivo.
5. **Il testo di quella schermata dice «Completa il tuo account»**, mai «diventa
   membro».
6. **Chi paga entra, e l'ingresso dalla cassa va attribuito e contato.**

### Il gate dei due assi — `member` non e' `approved`

`CLAUDE.md` principio 8: ruolo e stato sono **due assi diversi**.

- **Il PAGAMENTO decide l'ammissione.** Non e' una proposta, succede gia':
  `src/app/api/webhooks/sumup/route.ts:88` porta il profilo a
  `status: "approved"` sul pagamento riuscito e manda la mail di benvenuto.
- **La PASSWORD completa l'accesso.** Da' all'account un modo per rientrare, e
  **non ammette nessuno** — l'ammissione e' gia' avvenuta al pagamento.

Una schermata che dicesse «diventa membro» attribuirebbe alla password un
effetto che ha il pagamento. E' il principio 8 violato nel punto in cui il
prodotto parla all'utente, da dove passa poi nel codice.

### L'identita' e' vera nel database, ospite solo per chi compra

Letto in `supabase/migrations/20260225110000_phase6_ticketing.sql`:

```
tickets.user_id  uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE
UNIQUE (event_id, user_id)
POLICY ... USING (auth.uid() = user_id)
```

Con un'identita' reale creata al volo, **tutte e tre reggono senza modifiche**:
nessuna chiave esterna da allentare, nessun vincolo da smontare, e **nessuna
policy nuova che scavalchi la RLS**.

> ⚠ **`UNIQUE (event_id, user_id)` e `BUY-01` sono in tensione, e va risolta nel
> piano.** Un ordine con piu' biglietti sullo stesso evento, per la stessa
> identita', urta quel vincolo. Le due strade — una riga per biglietto con il
> vincolo allentato, oppure una quantita' sulla riga — hanno conseguenze diverse
> alla porta, dove ogni biglietto ha bisogno del proprio codice scansionabile.
> **La scelta va dichiarata nel piano, non scoperta durante l'esecuzione**, e
> qualunque allentamento di quel vincolo e' materia di `supabase-data.md` e
> `access-gating.md`.

### Il codice del biglietto — `BUY-05`

`src/utils/qr.ts:49` genera il codice con `Math.random()`. La **firma** e' HMAC
e regge; **il codice no**.

Finche' esiste un account, il codice non e' l'unica cosa che lega una persona al
suo acquisto. Con l'acquisto da ospite **lo diventa**: e' l'unica prova che
qualcuno ha pagato. La fase che rende quel codice l'unica credenziale e' la fase
che deve ripararlo — quindi qui, non ereditato.

### Il tetto e' 6 per default, modificabile per serata — `BUY-02`

Le sedi in target stanno fra 150 e 300 persone, e **dopo il perno il biglietto
e' l'unica cosa che regola chi entra**: non c'e' piu' un'approvazione a monte.
Senza account, un tetto alto e' una persona che ne compra cinquanta e li
rivende — cioe' la serata che sceglie il suo pubblico da sola. Sei e' un gruppo
di amici con un solo pagante.

### L'attribuzione si attacca al BIGLIETTO, non allo stato del profilo

L'ingresso dalla cassa va contato, ma **non** su `approved_via`, cioe' su
`status`: quel valore e' in via di smantellamento nelle fasi 50/51.
L'attribuzione va sul **biglietto** e sulla **presenza**, cosi' sopravvive alla
milestone invece di essere cancellata con lei.

Precedente da cui copiare la forma: la guest list scrive gia'
`approved_via: "guest_list"` in `src/lib/guest-list/process-entry.ts:176`. Il
percorso del pagamento oggi **non attribuisce niente**: cambia solo lo stato.

### Il ritrovamento senza login ha gia' un precedente in questo codice — `BUY-04`

I token drink da ospite si ritrovano gia' senza account. Il meccanismo esiste,
e' esercitato, e va **riusato**, non reinventato: credenziale del biglietto piu'
mail. Vedi `claimGuestOrders` e il percorso dei token ospite.

### Questa fase REVISIONA una decisione di milestone del 2026-08-14

La decisione *«solo organizer e staff potranno fare login»* **non vale piu'
cosi'**. L'account leggero con la password fa rientrare il cliente nel login —
non come iscritto, ma come **conseguenza dell'acquisto**. E' una terza strada
fra «tutti si registrano» e «nessuno entra», e chiude il buco che la regola
avrebbe lasciato: **senza login, un biglietto perso non si recupera**.

Il resto di quella decisione resta in piedi: nessuna registrazione spontanea,
via membership card, event history e referral, `PROJECT.md` da riscrivere.

### Claude's Discretion

- La forma dei piani e delle onde.
- Come si genera il codice del biglietto, purche' da `crypto` e non da
  `Math.random()`, e purche' lo spazio dei codici sia dichiarato nel piano.
- Dove vive il tetto per serata nello schema, purche' abbia un default.
- La forma della schermata di completamento account, dentro il vincolo del testo
  deciso al punto 5.

</decisions>

<canonical_refs>
## Canonical References

**Da leggere prima di pianificare o implementare.**

### Le decisioni e il perimetro
- `.planning/todos/pending/guest-ticket-purchase.md` — le sei decisioni, il gate
  dei due assi, la lettura dello schema, le verifiche prescritte
- `.planning/ROADMAP.md` § Phase 49 — `BUY-01…BUY-05` e le due ragioni scritte

### I gate di dominio che questa fase attraversa
- `.claude/rules/ticketing-payments.md` — dominio primario
- `.claude/rules/access-gating.md` — l'identita' creata al volo e la RLS
- `.claude/rules/venue-secrecy.md` — un flusso nuovo e' un flusso nuovo
- `.claude/rules/checkin-offline.md` — il biglietto di un ospite alla porta
- `.claude/rules/comms-analytics.md` — la mail che porta tre cose
- `.claude/rules/meta-gates.md` — impatto cross-dominio, zero fallimenti silenziosi

### Il codice che la fase tocca o da cui copia la forma
- `src/app/(public)/events/[slug]/actions.ts` — l'acquisto parte da
  `auth.getUser()` (riga 97): e' il punto che questa fase apre
- `src/app/(public)/events/[slug]/page.tsx` — legge `userTicket` **al
  singolare** (riga 640): un ordine con piu' biglietti non e' mai esistito
- `src/app/api/webhooks/sumup/route.ts` — verifica sempre via GET checkout,
  idempotente; porta a `approved` (riga 88)
- `src/utils/qr.ts` — riga 49, `Math.random()`
- `src/lib/email.ts` — riga 38, lancia solo su `error`
- `src/lib/guest-list/process-entry.ts` — riga 176, la forma dell'attribuzione
- `supabase/migrations/20260225110000_phase6_ticketing.sql` — i tre vincoli
- Il percorso dei token drink da ospite — il precedente di `BUY-04`

</canonical_refs>

<specifics>
## Specific Ideas

### La riparazione della posta e' un PREREQUISITO, non un lavoro parallelo

Con l'ospite, **una sola mail porta tre cose**: il biglietto, il link d'accesso
e — piu' tardi — la rivelazione del venue.

Verificato alla fonte il 2026-08-22 sulla documentazione Resend: la lista di
soppressione **accetta la chiamata e non consegna**, e fra le cause dichiarate
c'e' un errore di battitura nell'indirizzo. `src/lib/email.ts:38` lancia solo su
`error`, quindi **una mail soppressa torna «riuscita»**.

Per un membro e' un fastidio. **Per un ospite significa niente biglietto,
niente login, niente indirizzo: nessuna via di rientro**, e lo scopre alla
porta, dove `checkin-offline.md` dice che rifiutare un ospite valido e' l'errore
che costa di piu'.

**Il piano deve trattarla come precondizione di un'onda, non come voce
parallela.**

### Cio' che nessun controllo automatico puo' dire

Non esiste un test runner per il prodotto. La verifica minima e' `npm run build`
piu' **procedure manuali scritte** — quali passi, con quale ruolo, cosa si deve
osservare. Per questa fase servono almeno:

- **Il venue non compare in nessuna superficie del percorso ospite prima della
  rivelazione**: conferma d'acquisto, schermata del biglietto, ricevuta, mail.
  Il meccanismo esistente protegge le superfici che conosce; **un flusso nuovo
  e' un flusso nuovo**, e un indirizzo in una ricevuta annulla un cron.
- **Un biglietto d'ospite passa alla porta, anche offline**, e il nome che lo
  scanner mostra e' risolvibile.
- **Un ordine da piu' biglietti** produce codici distinti, tutti scansionabili,
  e la seconda scansione dello stesso codice e' rifiutata.

### Il contesto operativo, misurato il 2026-09-05

- Produzione: **zero biglietti, zero ordini bar, zero acquisti pendenti**, zero
  serate future pubblicate. Il momento piu' sicuro per un cambiamento profondo
  su questo percorso, e non durera'.
- **Zero conti `staff` e zero assegnazioni per serata**: la porta non e' mai
  stata esercitata in produzione da nessuno.
- Non esiste error tracking: un fallimento su questo percorso **non raggiunge
  nessun essere umano da solo**. Ogni percorso d'errore nuovo deve avere un
  effetto osservabile, non solo una riga di log.

</specifics>

<deferred>
## Deferred Ideas

- **Via le iscrizioni** e **via le superfici da socio** — fasi 50 e 51. Questa
  fase apre la strada nuova e non chiude la vecchia.
- **Google Pay** — differito per decisione del proprietario, 2026-09-05. Vedi
  `.planning/todos/pending/google-pay-deferred-by-decision.md`. Conseguenza
  accettata: chi compra da Android digita il numero della carta.
- **Apple Pay sul merchant nuovo** — non verificato. Il file di associazione del
  dominio e' servito ma fu generato per il merchant precedente. **Si prova su un
  iPhone in Safari appena esistono dei tier in vendita**, ed e' un passo di
  questa fase se i tier nascono qui.
- **Il nodo giuridico degli spazi privati** — chiuso per decisione informata del
  proprietario, 2026-08-15. **Non si riapre** come condizione di questa feature.

</deferred>

---

*Phase: 49-comprare-senza-account*
*Context gathered: 2026-09-05, dalle decisioni datate del proprietario*
