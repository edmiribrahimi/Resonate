---
date: 2026-08-22
kind: manual-verification
decision: .planning/todos/pending/secret-venue-three-surfaces.md
surfaces:
  - src/app/(public)/events/[slug]/page.tsx
  - src/app/(public)/tickets/[id]/page.tsx
predicate: src/lib/venue-reveal/venue-disclosure.ts
mechanical-gate: npm run verify:venue-surfaces
---

# Il venue segreto su due superfici — procedura manuale

> **Perche' questo file esiste e non e' una formalita'.** Questo repository
> **non ha un test runner per il prodotto**: `package.json` non dichiara alcuno
> script `test` e non esiste alcun file `*.test.*` o `*.spec.*`. La verifica
> qui e' `npm run build` (che include il typecheck di Next) piu' una procedura
> scritta. **Scritta, non evocata**: e' l'unica prova che esistera'.
>
> `npm run verify:venue-surfaces` copre la forma del codice — un predicato con
> una casa sola, due superfici che lo interrogano, nessun render sguarnito. Non
> puo' vedere un pixel. **Le sei celle qui sotto sono l'unica misura del
> comportamento osservabile.**
>
> **Questo file e' pubblico** (`.planning/` e' tracciato). Nessun indirizzo,
> nessun nome di sede, nessuna data di serata compare sotto: dove serve un
> esempio si usa un segnaposto.

## Cosa si sta verificando

La regola del proprietario, 2026-08-22:

| Superficie | Prima della rivelazione | Dopo la rivelazione |
|---|---|---|
| **pagina pubblica dell'evento** | `Secret Venue` | **`Secret Venue`** |
| **mail ai possessori di biglietto** | — | l'indirizzo |
| **pagina del proprio biglietto** | nessun indirizzo | il venue, subito |

**La proprieta' che ne discende, e che e' il criterio di ogni esito qui sotto:**
la rivelazione non rende l'indirizzo pubblico — lo rende noto a chi ha comprato.

## Preparazione — e il vincolo che non si viola

**Nessuna scrittura in produzione.** Tutta la preparazione avviene su una
serata **di prova**, e le sue righe si creano catturando gli identificativi al
momento della creazione e si rimuovono **per chiave primaria** su quella lista.
Mai cliccando un controllo di cancellazione in una pagina, mai risalendo un
albero di elementi dal titolo: `ai-engineering.md`, *gate una rimozione si fa
per chiave*, e il precedente che quel gate registra e' costato 63 righe in sette
tabelle.

Serve una serata di prova con:

- `venue_secret = true`
- un `venue_text` **riconoscibile**: usare il segnaposto `PROVA-VIA-SEGNAPOSTO`,
  mai un indirizzo vero. E' la stringa che si cerca a occhio e con *view-source*.
- una `venues` collegata, con `name` e `address` altrettanto segnaposto
- `venue_secret_hint` valorizzato (serve alla cella 1)
- un biglietto pagato, intestato all'account di prova

Le due leve del tempo, e **si muove la serata, mai la finestra**
(`venue_reveal_hours` e l'ordine dei passi del cron non si toccano):

- **prima della rivelazione** — `date`/`time` della serata a **piu' di 25 ore**
  da adesso, e `venue_revealed_at` a `NULL`
- **dopo la rivelazione** — o si porta `date`/`time` **dentro** le 25 ore, o si
  valorizza `venue_revealed_at`. **Entrambe le strade vanno provate**: sono i
  due ingressi del predicato, e sono indipendenti per costruzione.

## Le sei celle

Ogni riga: **ruolo · azione · esito osservabile**. Un esito si considera visto
solo se e' stato **guardato**, non dedotto dalla riga sopra.

### Prima della rivelazione

| # | Ruolo | Azione | Esito osservabile |
|---|---|---|---|
| **1** | visitatore **senza sessione** | apre `/events/<slug-di-prova>` | il blocco del venue mostra il pulsante **`Secret Venue`**. Nessuna occorrenza di `PROVA-VIA-SEGNAPOSTO` **ne' nella pagina ne' nel sorgente** (`view-source`, poi `⌘F`). Aprendo il dialog: l'indizio **non compare** (serve una sessione), e il testo dice che il venue **non appare mai su questa pagina** |
| **2** | **titolare del biglietto**, autenticato | apre `/events/<slug-di-prova>` | **identico alla cella 1**, meno l'indizio, che ora si vede. **Questa e' la cella che il vecchio codice sbagliava**: il titolare vedeva l'indirizzo qui. Se compare il segnaposto, la riparazione non ha tenuto |
| **3** | **titolare del biglietto**, autenticato | apre `/tickets/<id-del-biglietto>` | **nessuna riga di venue**. Non una riga vuota, non un segnaposto grafico: la riga `📍` **non e' nel documento**. Verificare anche nel sorgente |

### Dopo la rivelazione

Portare la serata di prova oltre la soglia con **una** delle due leve, poi
**ricaricare** (non navigare con il router: forzare un ricaricamento, cosi' che
la pagina venga resa dal server).

| # | Ruolo | Azione | Esito osservabile |
|---|---|---|---|
| **4** | visitatore **senza sessione** | riapre `/events/<slug-di-prova>` | **ancora `Secret Venue`.** Nessun segnaposto, nella pagina o nel sorgente. **Questa e' la seconda cella che il vecchio codice sbagliava**: qui l'indirizzo compariva |
| **5** | **titolare del biglietto**, autenticato | riapre `/events/<slug-di-prova>` | **ancora `Secret Venue`.** Il titolare **non** vede l'indirizzo su questa pagina, **anche se lo vede sul proprio biglietto**. E' la cella che dimostra che il criterio e' la *superficie* e non il *lettore* |
| **6** | **titolare del biglietto**, autenticato | riapre `/tickets/<id-del-biglietto>` | la riga `📍 PROVA-VIA-SEGNAPOSTO` **compare**. Confrontare con la cella 3: stesso ruolo, stessa pagina, stesso biglietto, unica differenza il tempo |

Poi **ripetere le celle 4-6 con l'altra leva** — se la prima volta si e' spostata
la serata, la seconda si valorizza `venue_revealed_at`, e viceversa. I due
ingressi del predicato vanno visti scattare **separatamente**, o se ne e' provato
uno solo e si e' creduto di averne provati due.

## Le due celle che questa procedura NON copre, e non finge di coprire

- **La mail** (riga 2 della tabella del proprietario) e' **preesistente e non e'
  stata toccata**. Non e' in questa procedura perche' non e' in questo diff.
- **Chi compra dopo che la rivelazione e' gia' avvenuta** vede il venue sul
  proprio biglietto — cella 6 lo verifica — **e non riceve alcuna mail**: il
  secondo percorso di rivelazione e' fuori scopo di proposito, ed e' un posto
  nuovo da cui un indirizzo puo' uscire.

## Tre controlli aggiuntivi, che non sono celle ma vanno guardati

1. **Il titolare di un RSVP.** Un RSVP non ha una pagina del biglietto. Prima di
   questa modifica vedeva l'indirizzo sulla pagina pubblica; ora **gli arriva
   solo per mail**. Aprire `/events/<slug-di-prova>` con un account che ha un
   RSVP e confermare che vede `Secret Venue`: e' il comportamento voluto, ed e'
   **una strada sola** dove le altre ne hanno due.
2. **Lo staff.** Un `master` o l'organizzatore che apre la pagina pubblica vede
   `Secret Venue` come chiunque altro. **Non e' una regressione**: e' cio' che
   rende la pagina verificabile guardandola. Il venue resta sulle superfici di
   lavoro sotto `admin/`.
3. **Una serata NON segreta.** `venue_secret = false`: l'indirizzo compare
   normalmente su entrambe le superfici, come prima. Se questa cella e' rossa la
   riparazione e' **troppo stretta**, che e' un difetto quanto l'altro.

## Chiusura

Le righe di prova si rimuovono **per chiave primaria**, sulla lista catturata
alla creazione. Il conteggio di controllo si chiede a una fonte **diversa** da
quella su cui si e' agito: se si e' scritto dall'interfaccia, si conta dal
database (`read_only: true`).

Registrare, con la data: chi ha eseguito, quale leva del tempo per ogni giro, e
l'esito di ognuna delle sei celle piu' i tre controlli. **Una procedura eseguita
e non registrata non e' distinguibile da una non eseguita.**
