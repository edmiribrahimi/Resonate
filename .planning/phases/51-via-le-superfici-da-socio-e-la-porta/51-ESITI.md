---
phase: 51-via-le-superfici-da-socio-e-la-porta
document: gli esiti delle procedure della fase — oggi `P-51-1`, percorrendo
procedure: .planning/phases/51-via-le-superfici-da-socio-e-la-porta/51-PROCEDURES.md
requirements: [MEM-03, MEM-04]
environment: laboratorio permanente (`.planning/v1.6-LAB-DESIGN.md`), MAI la produzione
lab_status: ACTIVE_HEALTHY
lab_status_read: "2026-09-22T13:28:11Z"
lab_serves_commit: 03e443e
lab_serves_since: "2026-09-21T15:10:11Z"
runs_walked: 0
runs_open: 2
status: aperto — PRE-LAB accertata, nessuna corsa percorsa
---

# Fase 51 — Gli esiti, percorrendo

> **Questo documento e' pubblicato.** `.planning/` e' tracciato su un repository
> pubblico. Qui si nominano **ruoli** — *il proprietario*, *l'account di staff
> del banco assegnato alla serata di prova* — **mai persone**. **Il riferimento
> del progetto di laboratorio non si scrive qui**: sta in `.env.lab.local`, che
> e' ignorato da git. Nessuna chiave, nessun indirizzo interno di anteprima.
>
> Ogni riga porta l'ora **UTC**, lo strumento, e cio' che si e' **osservato** —
> non cio' che ci si aspettava. Dove l'osservato differisce dall'atteso, la
> differenza si riporta **per prima**.

---

## `PRE-LAB` — accertata il 2026-09-22

**La precondizione di `P-51-1`, letta prima di aprire il telefono.** Tutte le
letture sotto sono **in sola lettura** e nessuna ha toccato la produzione.

| Cosa | Letto | Quando (UTC) | Come |
|---|---|---|---|
| Stato del progetto di **laboratorio** | **`ACTIVE_HEALTHY`** | **2026-09-22T13:28:11Z** | Management API, `GET /v1/projects/<ref del laboratorio>`; il ref viene da `.env.lab.local`, caricato sopra `.env.local` nella forma di `scripts/dev-lab.sh`, col rifiuto del ref di produzione eseguito prima della chiamata |
| Regione del laboratorio | `eu-west-1` | 2026-09-22T13:28:11Z | stessa lettura |
| `lab.resonatemotion.com` risponde | **HTTP 200** su `/events` | 2026-09-22T13:28Z | `curl`, host pubblico |

**Il laboratorio non era in pausa**, quindi non e' stato necessario alcun
restore. Era stato usato il giorno prima: l'inattivita' non aveva raggiunto la
settimana che lo mette a dormire. *(Se lo avesse fatto, il sintomo sarebbe stato
un **NXDOMAIN** sul suo host — progetto `INACTIVE`, non un guasto di rete.)*

### Il codice contro cui si misura

**`lab.resonatemotion.com` serve il commit `03e443e`, del 2026-09-21**, sul ramo
`lab`, da un dispiegamento in stato `READY` **creato il 2026-09-21 alle
15:10:11Z**. Letto dall'alias e dal dispiegamento che l'alias risolve, non dalla
punta del ramo in locale — la punta di `origin/lab` e' lo stesso commit
(`03e443e`, 2026-09-21T17:08:40+02:00), e i due concordano.

**Dal 2026-09-21 15:10:11Z non e' stato creato nessun altro dispiegamento del
ramo `lab`.** E' il fatto che rende decidibile la condizione di D-51-16.

### La condizione di D-51-16 e' **soddisfatta**, e piu' di quanto chiedesse

D-51-16 ammette che la corsa «prima» **citi `P-50-8`** per cio' che `P-50-8` ha
gia' misurato, **a condizione** che il laboratorio serva un commit **senza
modifiche alla porta** rispetto a quella corsa.

`P-50-8` e' stata percorsa il **2026-09-21 fra le 16:01:27Z e le 16:02:19Z**,
cioe' **51 minuti dopo** che quel dispiegamento era andato in linea, e nessun
dispiegamento del ramo `lab` e' seguito. Quindi il laboratorio non serve un
commit *equivalente* a quello che `P-50-8` ha misurato: **serve lo stesso
identico artefatto**. La condizione non regge per assenza di differenze alla
porta — regge per **assenza di differenze**, punto.

**Una seconda misura, perche' la citazione non e' l'unica domanda.** La fase
costruira' su `main`, non sul ramo `lab`, e `origin/main` e' **30 commit avanti**
a `origin/lab` (41 file fuori da `.planning/`). Se in quei 30 commit ci fosse
una modifica alla porta, la linea di partenza presa sul laboratorio
misurerebbe codice piu' vecchio di quello su cui la fase interverra'. Misurato
per percorso, non ricordato:

| Perimetro | File diversi fra `origin/lab` e `origin/main` |
|---|---|
| `src/lib/offline/**`, `src/app/api/tickets/checkin/**`, `src/app/api/tickets/attendance/**`, `src/app/api/membership/**`, `**/scanner/**`, `src/app/(admin)/door/**`, `src/app/sw.ts`, `src/utils/qr.ts` | **0** |
| `src/lib/tickets/holder-label.ts` (adiacente: etichetta del portatore) | 1 — **file nuovo**, e i suoi due soli importatori sono la mail e la pagina dell'ordine (`order-confirmation.ts`, `tickets/order/[token]/page.tsx`). **Nessun importatore nello scanner**: la porta non lo legge |

**Conclusione: il percorso della porta e' identico fra il codice che il
laboratorio serve e il codice su cui la fase interverra'.** La corsa «prima» e'
una linea di partenza valida.

> **Vincolo d'ordine, finche' il checkpoint di 51-01 non e' risolto:** nessun
> `git push` e **nessun dispiegamento del ramo `lab`**. Il primo dispiegamento
> nuovo sostituisce il codice che questa riga dichiara, e con esso la validita'
> di tutto cio' che sta scritto qui sopra.

---

## `P-51-1` — corsa «prima»

**Sul codice attuale, prima che la fase tocchi un file di prodotto.** Forma
**ridotta** secondo D-51-16. La procedura, con tutti e nove i passi, e' in
`51-PROCEDURES.md`.

**Percorsa da:** — *(il proprietario, su un telefono vero, contro il
laboratorio, con l'account di staff del banco che ha `door.operate` sulla serata
di prova)*
**Data e ora:** — *(UTC e ora locale, da scrivere percorrendo)*
**Prova della modalita' aereo:** — *(la schermata con l'icona dell'aeroplano
nella barra di stato e nessun indicatore di rete dati ne' di wi-fi)*

| # | Trattamento (D-51-16) | Cosa si e' **visto** |
|---|---|---|
| 1 | **percorsa** — lista scaricata, invitati di guest list senza email presenti **per nome** | |
| 2 | **baseline** — cosa dice l'avviso della lista oggi, e quando si accende | |
| 3 | **citata `P-50-8`** — passo 4, 2026-09-21 16:01Z | |
| 4 | **citata `P-50-8`** — passo 5, 2026-09-21 16:01Z | |
| 5 | **percorsa** — invitato di guest list senza email, ammesso **per nome** a radio spenta | |
| 6 | **percorsa, come baseline** — dove finisce in vista la testata mentre la lista scorre | |
| 7 | **citata `P-50-8`** — passo 6, 2026-09-21 16:02Z. **Non** sul dispositivo che porta la voce `membership` lasciata in coda | |
| 8 | **citata `P-50-8`** per la riga unica in `door_scan_events`; la meta' sulla **guest list** si rilegge davvero | |
| 9 | **non percorribile nel «prima»** — il codice che scarta non esiste ancora; la corsa «prima» ne produce solo la **precondizione** | |

**La precondizione che solo questa corsa puo' produrre** — un **codice socio**
scansionato a radio spenta e **lasciato in coda**, senza drenare, sul dispositivo
che percorrera' la corsa «dopo»:

| Lasciata? | Su quale dispositivo | Quando (UTC) |
|---|---|---|
| — | — | — |

> `Result: pending` — la corsa «prima» non e' ancora stata percorsa, e finche'
> non lo e' questa riga resta com'e'. Un `Result` non-`pending` **afferma** che
> qualcuno ha percorso: riempirlo con una lettura dal catalogo, o con cio' che ci
> si aspettava, e' una prova falsa (`T-51-01`).

---

## `P-51-1` — corsa «dopo»

**Sul codice della fase, tutti e nove i passi**, stessa serata, stesso
dispositivo, stesso biglietto o uno coniato allo stesso modo. Va percorsa dopo
che la fase e' dispiegata sul laboratorio, **mai in produzione**.

**Percorsa da:** —
**Data e ora:** —
**Prova della modalita' aereo:** —

| # | Cosa si e' **visto** |
|---|---|
| 1 | |
| 2 | |
| 3 | |
| 4 | |
| 5 | |
| 6 | |
| 7 | |
| 8 | |
| 9 | |

> `Result: pending`

---

## Dove va a finire

`MEM-04` si chiude in `51-VERIFICATION.md` (piano 51-14) **citando le due corse
di questo file con la loro data**, non ripetendole. `MEM-03` dipende dal passo 9,
e il passo 9 dipende dalla precondizione che la corsa «prima» deve lasciare: se
quella riga resta vuota, `MEM-03` non ha una prova su dispositivo e lo si
dichiara, invece di sostituirla con una deduzione.
