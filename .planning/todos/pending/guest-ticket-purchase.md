---
created: 2026-08-22
source: seduta di esecuzione fase 58 — sei decisioni del proprietario, prese con l'analisi d'impatto davanti
severity: high
area: ticketing-payments, access-gating, checkin-offline, venue-secrecy
resolves_phase:
---

# L'acquisto del biglietto da ospite

## Le sei decisioni del proprietario, 2026-08-22

1. **Un ospite puo' comprare un biglietto, su TUTTE le serate.** Non solo sui
   satelliti in locali pubblici: ovunque.
2. **L'acquisto crea un account leggero al volo** — nessun modulo, nessuna
   password chiesta al momento di comprare.
3. **Il venue segreto NON viene rivelato all'acquisto.** La rivelazione resta
   dove sta oggi: al countdown, per mail, dal cron.
4. **Il link d'accesso porta a una schermata di scelta password**, che
   **completa l'account** — cosi' l'ospite puo' rientrare da qualunque
   dispositivo.
5. **Il testo di quella schermata dice «Completa il tuo account»**, mai «diventa
   membro». Vedi il gate dei due assi, sotto.
6. **Chi paga entra, e l'ingresso dalla cassa va attribuito e contato.**

## Il gate che questa feature deve rispettare: due assi, non uno

`CLAUDE.md` principio 8: **`member` non e' `approved`** — sono ruolo e stato,
due assi diversi, e confonderli produce bug di accesso.

- **Il PAGAMENTO decide l'ammissione.** Non e' una proposta: succede gia'.
  `src/app/api/webhooks/sumup/route.ts:88` porta il profilo a
  `status: "approved"` sul pagamento riuscito e manda la mail di benvenuto.
- **La PASSWORD completa l'accesso.** Da' all'account un modo per rientrare.
  **Non ammette nessuno**, perche' l'ammissione e' gia' avvenuta al pagamento.

Una schermata che dicesse «diventa membro» attribuirebbe alla password un
effetto che ha il pagamento, ed e' il principio 8 violato nel punto in cui il
prodotto parla all'utente — da li' passa nel codice.

## Cosa dice lo schema, e perche' l'account leggero e' la scelta che costa meno

Letto il 2026-08-22 in `supabase/migrations/20260225110000_phase6_ticketing.sql`:

```sql
tickets.user_id  uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE
UNIQUE (event_id, user_id)
POLICY ... USING (auth.uid() = user_id)
```

Con un'identita' vera creata al volo, **tutte e tre reggono senza modifiche**:
nessuna chiave esterna da allentare, nessun vincolo da smontare, e soprattutto
**nessuna policy nuova che scavalchi la RLS**. E' *ospite* per chi compra, non
per il database — che e' il posto dove non conviene mai esserlo.

## Le due condizioni che restano in piedi

### 1. La riparazione della posta e' un PREREQUISITO, non un lavoro parallelo

Con l'ospite, la mail porta **tre** cose: il biglietto, il link d'accesso e la
**rivelazione del venue**. Verificato alla fonte il 2026-08-22 (documentazione
Resend): la lista di soppressione **accetta la chiamata e non consegna**, e fra
le cause dichiarate c'e' **un errore di battitura nell'indirizzo**.
`src/lib/email.ts:38` lancia solo su `error`, quindi una mail soppressa torna
«riuscita».

**Per un ospite con l'indirizzo soppresso significa: niente biglietto, niente
login, niente indirizzo del venue.** Nessuna via di rientro. Per un membro e' un
fastidio; per un ospite e' restare fuori — e lo scopre alla porta, dove
`checkin-offline.md` dice che l'errore costa di piu'.

### 2. L'attribuzione si attacca al BIGLIETTO, non allo stato del profilo

L'ingresso dalla cassa va contato — ma **non** su `approved_via`, cioe' su
`status`: quel valore e' in via di smantellamento (vedi sotto). L'attribuzione
va sul **biglietto** e sulla **presenza**, cosi' sopravvive alla milestone
invece di essere cancellata con lei.

Precedente esistente da cui copiare la forma: il percorso della guest list
scrive gia' `approved_via: "guest_list"` (`src/lib/guest-list/process-entry.ts:176`).
Il percorso del pagamento **non attribuisce niente**: cambia solo lo stato.

## ⚠ Questa decisione REVISIONA una regola del 2026-08-14

La decisione di milestone del 14 agosto — *«solo organizer e staff potranno fare
login»* — **non vale piu' cosi'**. L'account leggero con la password fa
rientrare il cliente nel login: non come iscritto, ma come **conseguenza
dell'acquisto**.

E' una terza strada fra *«tutti si registrano»* e *«nessuno entra»*, e risolve
il buco che la regola del 14 avrebbe lasciato aperto: **senza login, un biglietto
perso non si recupera**.

Il resto di quella decisione resta in piedi: nessuna registrazione spontanea,
via membership card, event history e referral, e `PROJECT.md` da riscrivere.

## Cosa NON riaprire

**Il nodo giuridico degli spazi privati e' chiuso per decisione del
proprietario** (2026-08-15, informata: gli era stato posto). Non va rimesso sul
tavolo come condizione di questa feature.

## Verifiche prescritte prima di considerarla finita

- **Nessuna superficie del percorso ospite mostra il venue prima della
  rivelazione** — conferma d'acquisto, schermata del biglietto, ricevuta. Il
  meccanismo esistente protegge le superfici che conosce; un flusso nuovo e' un
  flusso nuovo, e un indirizzo in una ricevuta annulla un cron.
- **La porta funziona con un biglietto di un ospite**, anche offline, e il nome
  che lo scanner mostra e' risolvibile.
- `src/utils/qr.ts:49` genera ancora il codice con `Math.random()` (verificato
  2026-08-22; la firma invece e' HMAC con `crypto`, e regge). Piu' biglietti
  esistono fuori dall'identita' di un membro, piu' quella debolezza pesa: va
  guardata **in questa fase**, non ereditata.
