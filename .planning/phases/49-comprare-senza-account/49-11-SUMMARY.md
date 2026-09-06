---
phase: 49-comprare-senza-account
plan: 11
subsystem: verifica
tags: [runbook, procedure-manuali, evidenza, debiti]
requires: [49-01, 49-02, 49-03, 49-04, 49-05, 49-06, 49-07, 49-08, 49-09, 49-10]
provides: ["le 52 prove manuali della fase, raccolte e ordinate", "i nove debiti dichiarati", "le tre da percorrere prima del primo listing pubblico"]
affects: [49-VERIFICATION.md]
tech-stack:
  added: []
  patterns: ["procedura manuale scritta come unica evidenza in un repo senza test"]
key-files:
  created: [".planning/phases/49-comprare-senza-account/49-RUNBOOK.md"]
  modified: []
decisions: ["le prove si ordinano per cio' che difendono, non per numero di piano", "una prova il cui fallimento sarebbe la scrittura vietata non si esegue dove la scrittura e' vietata", "tre prove sono dichiarate mai conclusive invece di restare pendenti"]
requirements: [BUY-01, BUY-02, BUY-03, BUY-04, BUY-05]
metrics:
  procedures_gathered: 52
  procedures_runnable_today: 0
  procedures_never_conclusive: 3
  debts_named: 9
  completed: 2026-09-06
---

# Phase 49 Plan 11: Le prove manuali della fase — Summary

Le 52 procedure disperse nei dieci SUMMARY della fase sono raccolte in un
runbook unico, ordinate per **cio' che difendono** invece che per numero di
piano — le due irreversibili in cima — e **zero** sono eseguibili oggi, per una
sola causa che il runbook nomina e che nessun documento della fase aveva scritto.

**Il checkpoint bloccante (task 2) resta aperto.** Non e' stato eseguito, non e'
stato simulato, non e' stato marcato fatto.

---

## Il numero, che e' la prima cosa da dire

| | Quante |
|---|---|
| Procedure raccolte e scritte | **52** |
| Eseguite | **0** |
| Eseguibili oggi | **0** |
| Dichiarate **mai conclusive** in nessun ambiente | **3** (comprese nelle 52) |
| Prove differite che non sono procedure | **1** — Apple Pay sul merchant nuovo |
| Debiti nominati | **9** |

**Nessuna riga e' stata seminata per rendere eseguibile una procedura.**
L'autorizzazione a scrivere in produzione e' `ESAURITA` dal 2026-09-06 15:03:04
UTC, sei migration su sei applicate. Una procedura che non si puo' percorrere
oggi **si scrive e si dichiara non eseguita**: e' l'esito corretto, non un
fallimento.

---

## Perche' zero, e non «quasi tutte»

**La causa e' una sola, ed e' la scoperta di questo piano: non esiste un
database di sviluppo.**

`.env.local` ha un solo `NEXT_PUBLIC_SUPABASE_URL`, e punta allo stesso progetto
su cui sono state applicate le sei migration. Non esiste `supabase/config.toml`,
quindi non e' configurato nemmeno uno stack locale.

**Conseguenza:** *«si prova in ambiente di sviluppo»* — la frase che compare nel
piano 49-11, nel checkpoint del 49-09 e in `P-REV-MUT-1` — oggi significa
`next dev` **contro la produzione**. Non e' una strada intorno
all'autorizzazione esaurita: e' la stessa scrittura, fatta da un altro processo.

E' il debito piu' economico da chiudere della fase, ed e' quello che sblocca
**52 prove su 52**.

### Il ragionamento che sarebbe stato comodo fare, e che e' sbagliato

Tre procedure — `P-BUY-2` (quantita' oltre il tetto), `P-BUY-5` (serata in
bozza), `P-UI-3` (rifiuto leggibile) — **rifiutano prima di scrivere**, quindi
sembrerebbero percorribili contro la produzione a costo zero.

**Il loro criterio di successo e' «zero righe nuove».** Quindi **il loro
fallimento SAREBBE la scrittura in produzione che l'autorizzazione vieta.** Una
prova il cui modo di fallire e' l'atto proibito non si esegue dove l'atto e'
proibito. Sono classificate `PRE-DB` come tutte le altre, e la ragione e'
scritta nel runbook invece di essere lasciata da riscoprire.

---

## Cosa aspetta ciascuna, per gruppo

Le precondizioni sono nominate una volta nel runbook (§2) e citate per sigla.

| Gruppo | Sigle | Quante | Aspetta |
|---|---|---|---|
| Venue | `P-VENUE-1/2` | 2 | `PRE-DB` + una serata segreta **non rivelata** (in produzione non esiste: delle due segrete, una ha gia' spedito la mail, l'altra rivela all'acquisto) + un biglietto vero |
| Rivelazione | `P-REV-SEQ-1` (6 passi), `P-REV-MUT-1` | 2 | `PRE-DB`, `PRE-SECRET`, `PRE-PAY`, e per la mutazione la possibilita' di togliere la chiave della posta — **mai in produzione** |
| Denaro, webhook | `P-WH-1…5`, `P-ORD-VIS-1` | 6 | `PRE-DB`, un tier in vendita, un pagamento vero |
| Denaro, la funzione che conia | `P-RES-1…5` | 5 | `PRE-DB` |
| Porta | `P-DOOR-1…8` | 8 | **`PRE-STAFF`** — zero conti `staff` e zero assegnazioni: la porta non e' mai stata esercitata in produzione da nessuno — piu' due telefoni reali e biglietti pagati |
| Credenziale della porta | `P-CODE-1…5` | 5 | `PRE-DB` (creare un profilo). `P-CODE-5` regge sui quattro codici gia' emessi |
| Acquisto, l'azione | `P-BUY-1…6` | 6 | `PRE-DB`, `PRE-NIGHT`, `PRE-TIER`. `P-BUY-3` **mai conclusiva** |
| Acquisto, le superfici | `P-UI-1…7` | 7 | `PRE-DB`, `PRE-NIGHT`, `PRE-TIER`; `P-UI-7` anche `PRE-SECRET` |
| Ordine senza sessione | `P-ORD-1…5` | 5 | un ordine vero con la sua firma |
| Posta | `P-MAIL-1…6` | 6 | `PRE-DB` e un ordine da almeno tre biglietti |

**Manca anche il soggetto, non solo il permesso.** In produzione: 2 eventi
pubblicati, **entrambi con data passata**; 3 serate, tutte passate; 1 solo tier,
su una serata passata. Quindi **non esiste una serata futura in vendita** su cui
percorrere qualunque cosa, indipendentemente dall'autorizzazione.

---

## Le tre da percorrere PRIMA del primo listing pubblico

L'ancora della fase non e' una data: e' **il momento in cui una persona che non
ci conosce vede una serata e prova a comprare**. Da li' esiste denaro reale su
questo percorso. Queste tre non aspettano «la fine»:

**1ª — Procedura 1, il venue prima della rivelazione** (col passo `1.6` sul
riepilogo del fornitore, e Apple Pay nello stesso acquisto).
Una rivelazione e' monotona. Se l'indirizzo esce da una ricevuta, il cron che lo
custodisce e' gia' stato aggirato e non c'e' un secondo tentativo.

**2ª — Il denaro: `P-WH-1`, `P-WH-2`, `P-RES-1`.**
Prima che esista un incasso vero. Un ordine pagato i cui biglietti non sono nati
e' una persona che ha pagato e non ha niente, e lo scopre alla porta.

**3ª — Procedura 2, passo `2.4`**: biglietto comprato **dopo** lo scarico della
lista, radio spenta.
Con l'acquisto da ospite non e' l'eccezione, e' **il caso normale** — chi decide
di venire alle 23:40 compra dal telefono in fila. Il suo fallimento e' un ospite
valido respinto **davanti a una fila**, che `checkin-offline.md` dichiara
l'errore piu' costoso del dominio.

Le procedure 3 e 5 vanno percorse **prima della prima serata**, che e' un
momento diverso e successivo: chiedono due telefoni, due membri dello staff
assegnati e un ordine da sei biglietti gia' pagato.

---

## Le tre prove che non saranno MAI conclusive, dichiarate invece che tenute pendenti

1. **`P-BUY-3` — «il prezzo non arriva dal client».** L'azione **non accetta un
   prezzo**, quindi non esiste un modo di mandargliene uno. E' una proprieta'
   **per costruzione** — piu' forte di una prova comportamentale — e va chiamata
   col suo nome invece di essere contata fra le eseguite.
2. **La negativa universale sul venue.** Si percorre ogni superficie **che si
   conosce**; non si percorre una superficie che non si conosce. E
   `event_parties.title` e' testo libero: un posto scritto dentro un titolo
   viaggia dove **nessun predicato di questo repository puo' guardare**. La
   procedura 1, anche eseguita interamente, prova che **quelle** superfici sono
   pulite, mai che **tutte** lo siano.
3. **Il riepilogo del fornitore di pagamento.** Non e' una nostra superficie: la
   disegna lui, puo' cambiarla senza dircelo, nessun gate la vede. Il passo
   `1.6` da' una **fotografia di oggi**, mai una garanzia — e va rifatto a ogni
   cambio della descrizione dell'articolo che gli mandiamo.

---

## I nove debiti nominati

I cinque che il piano chiedeva:

1. **La porta ha ancora due credenziali** e il codice ammette **senza leggere
   ne' ruolo ne' stato** (`D-49-01`, `attendance/route.ts:145`). Questa fase e'
   quella che moltiplica la popolazione che tiene quella credenziale.
2. **Nessun rate limiting**: ogni endpoint di verifica e' un oracolo di forza
   bruta, davanti a una popolazione di codici piu' grande di prima.
3. **Nessun error tracking**: ogni percorso d'errore di questa fase ha un
   effetto osservabile **umano**, non un allarme.
4. **Il tetto e' per ordine, non per persona** — conseguenza accettata
   dell'acquisto senza account: non esiste una persona a cui attaccarlo.
5. **L'arm 5 di `venue_for_parties`** allarga in un angolo dichiarato e
   autorizzato nel commit; `P-VENUE-1/2` sono le due prove che lo misurano, e
   nessuna e' stata eseguita.

I quattro trovati scrivendo:

6. **`verify:touch-targets` e' rosso su TRE elementi, e uno e' di questa fase.**
   Vedi sotto: e' una correzione, non un'aggiunta.
7. **`email_deliveries` non ha `order_id`**: la riparazione vive nella
   superficie, non nello schema, quindi un secondo lettore rifarebbe lo stesso
   ragionamento da capo — o non lo farebbe.
8. **`search_path` non fissato** sui tre sovraccarichi di `reserve_ticket`: da
   chiudere al primo esercizio vero del webhook, cioe' insieme a `P-WH-1`.
9. **Nessun database di sviluppo**, che blocca gli altri otto.

---

## La correzione che questo piano deve fare, e che nessuno gli aveva chiesto

**Il briefing di questo piano diceva:** *«`npm run verify` esce 1 per una
ragione **preesistente** — il debito touch-target della fase 42, rosso prima che
questa fase cominciasse, lista confermata identica byte a byte da due piani
oggi.»*

**Rilanciato oggi: `npm run verify` esce 1, con tre elementi, e uno dei tre e'
nato in questa fase.**

| File:riga | Elemento | Entrato con |
|---|---|---|
| `src/app/(public)/events/[slug]/menu/GuestTokenDisplay.tsx:689` | `<button>` | fase 47 — preesistente |
| `src/app/(public)/events/[slug]/menu/GuestTokenDisplay.tsx:702` | `<button>` | fase 47 — preesistente |
| **`src/emails/ticket-order.tsx:231`** | `<a href={ticket.url}>` | **`ee115a8`, piano 49-05 — questa fase** |

**Due su tre sono preesistenti; il terzo no.** E' gia' registrato come
`D-49-08-DEF-09`, attribuito misurando (`git log -S`) e non dedotto dalla data.
La lista e' identica a quella dei piani 49-08, 49-09 e 49-10 — quindi **nessun
rosso nuovo** rispetto a stamattina — ma la frase «tutto preesistente» sarebbe
stata falsa per un terzo, e questo documento esiste per non contenere frasi
comode.

**Il criterio per il prossimo lettore resta quello del progetto: si guarda la
LISTA, mai il codice d'uscita.** Un guasto nuovo dentro un gate gia' rosso e'
invisibile a chi legge solo `1`.

---

## Cosa e' stato misurato oggi, e cosa no

**Misurato da questo piano, in sola lettura, con zero scritture** — nessun
`INSERT`, `UPDATE`, `DELETE`, nessuna sessione coniata:

`tickets` 0 · `ticket_orders` 0 · `drink_orders` 0 · `attendances` 0 ·
`email_deliveries` 0 · `rsvps` 0 · `profiles` 4 (1 master, 1 organizer, 2
member, **zero staff**) · `events` 2, entrambi pubblicati, **entrambi con data
passata** · `event_parties` 3, tutte passate, tutte a `max_tickets_per_order =
6` · `ticket_tiers` 1, su una serata passata · lo stato di rivelazione delle tre
serate.

Piu': `npm run verify` → exit 1, tre elementi, elencati sopra.

**Non misurato, e dichiarato tale:** nessun comportamento del prodotto. Questo
piano non ha eseguito una sola delle 52 procedure, e non esiste un test runner
che possa fingere il contrario. **Nessuna affermazione di questo referto e'
sostenuta da «i test passano».**

---

## Deviazioni dal piano

### 1. [Rule 2 — funzionalita' critica mancante] Le 52 prove disperse non avevano un posto

- **Trovato durante:** task 1.
- **Il buco:** il piano chiedeva **cinque** procedure. I dieci SUMMARY della
  fase ne portavano gia' **52**, scritte da chi aveva costruito ogni pezzo, e
  nessun documento le raccoglieva. Cinque procedure nuove accanto a 52 sparse
  avrebbero prodotto due verita' parallele, e la piu' facile da trovare sarebbe
  stata quella incompleta.
- **Il fix:** le cinque procedure del piano sono scritte **come il piano le
  numera** — 1 venue, 2 porta offline, 3 ordine multiplo, 4 indirizzo dopo la
  rivelazione, 5 mail sbagliata — e le 52 sono raccolte **dentro** di esse come
  passi, o accanto come registro, ognuna con la sua origine dichiarata.
- **Effetto:** nessuna prova della fase vive piu' in un solo posto che nessuno
  riaprira'.

### 2. [Rule 2] L'ordine di scrittura non e' l'ordine dei numeri, ed e' deliberato

- **Il fix:** le procedure sono scritte nell'ordine `1 → 4 → [il denaro] → 2 →
  3 → 5`, raggruppate per **cio' che difendono**: in cima le due irreversibili —
  il venue e il denaro — poi la porta, poi il resto. **I numeri restano quelli
  del piano**, cosi' i criteri d'accettazione che citano «la procedura 2» e «la
  procedura 3» continuano a puntare a cio' che nominano.
- **Perche':** chi percorrera' queste procedure non legge numeri di piano. Legge
  nell'ordine in cui le cose possono andare male in una serata vera, e le due
  che non si annullano vanno guardate prima di quelle che si possono ripetere.

### 3. [Rule 1 — premessa falsa nel briefing] Il rosso di `verify` non e' tutto preesistente

- **Trovato durante:** task 1, rilanciando `npm run verify`.
- **Il fix:** la sezione dei debiti riporta la tabella a tre righe con
  l'attribuzione di ciascuna, e questo referto la ripete invece di lasciarla nel
  solo runbook.
- **Perche' non e' un dettaglio:** una fase che dichiarasse «rosso
  preesistente» avrebbe lasciato un proprio elemento rosso dentro una frase che
  dice il contrario, ed e' esattamente il modo in cui un aggregato smette di
  essere letto.

### 4. [Rule 3 — blocco] «Ambiente di sviluppo» non esiste

- **Trovato durante:** task 1, cercando dove eseguire le procedure.
- **Il fix:** non e' stato costruito niente — sarebbe stato fuori perimetro. E'
  stato **nominato**, come §1 del runbook e come nono debito, con la
  conseguenza scritta per esteso: ogni frase della fase che dice «si prova in
  dev» oggi dice «si prova in produzione».

**Nessuna scrittura in produzione, di nessun tipo.** Nessuna riga seminata,
nessuna spunta, nessuna sessione coniata, nessuna migration. L'autorizzazione e'
`ESAURITA` e **una ricevuta non e' un permesso**.

---

## Il checkpoint resta aperto

Il **task 2** e' un `checkpoint:human-verify` **bloccante**. Non e' stato
eseguito, non e' stato simulato, non e' stato marcato fatto.

Percorrerlo oggi non e' possibile: **zero delle 52 procedure ha le proprie
precondizioni**, e la prima cosa che serve non e' un passo del checkpoint — e'
un database su cui si possa scrivere una riga senza scrivere in produzione.

Chi lo riprendera' trova in `49-RUNBOOK.md` la tabella degli esiti, gia'
compilata con **NON ESEGUITA** e la causa di ciascuna, da sostituire con cio'
che si e' **osservato**, con la data.

---

## Self-Check: PASSED

File — verificati sul disco:
- `.planning/phases/49-comprare-senza-account/49-RUNBOOK.md` — FOUND (691 righe)

Criteri d'accettazione del task 1 — misurati:
- cinque procedure numerate, ognuna con ruolo, stato della serata, passi e
  osservabile — FOUND
- procedura 2 con **entrambi** i casi (in cache e non in cache) e i due
  indirizzi della porta nominati, `/door` e `/admin/scanner`, con la regola che
  scaldarne uno non scalda l'altro — FOUND
- procedura 3 col caso dei due telefoni entrambi offline — FOUND
- sezione dei debiti con **nove** voci, comprese le cinque richieste — FOUND
- `grep -ciE "^(#|\|).*(via |piazza |corso |strada )"` → **0** — PASS
- `grep -c "BUY-0"` → **12** (richiesto: ≥ 5) — PASS

Commit — verificato in `git log`:
- `677db87` — `docs(49-11): le cinque procedure sono scritte prima di essere percorse, e 52 prove hanno un posto` — FOUND

`STATE.md` **non** toccato, deliberatamente.
