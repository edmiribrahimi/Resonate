# Phase 52: La barra di navigazione e i ritocchi - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-23
**Phase:** 52-la-barra-di-navigazione-e-i-ritocchi
**Areas discussed:** La barra da telefono, Il pannello Management, Il cancello sulla gallery, I chip dei format e le linguette della porta, TASK spento e badge, L'annullamento dentro Recent, Il viewport iOS, Nomi doppi nel pannello, La barra con la tastiera aperta, Linguette vuote, Check-in senza assegnazione, L'avviso della guest list, Il pannello aperto

---

## La barra da telefono

**Cosa apre Home?**

| Option | Selected |
|--------|----------|
| La prossima serata |  |
| Il brand |  |
| Home = /events | ✓ |

**User's choice:** Home non c'e' piu': esce da NAV-01

**TASK prima della fase 53**

| Option | Selected |
|--------|----------|
| Assente finche' la 53 non la costruisce |  |
| Disegnata ma disabilitata | ✓ |

**User's choice:** Disegnata ma disabilitata

**Disegno della barra**

| Option | Selected |
|--------|----------|
| Icona + etichetta su tutte (sei voci) |  |
| Icone sole |  |
| Quattro in barra, Management raccoglie il resto | ✓ |

**User's choice:** Quattro in barra: Events · Check-in · TASK · Management; Gallery e Account nel pannello

---

## Il pannello Management

**Da telefono come si apre**

| Option | Selected |
|--------|----------|
| Foglio dal basso | ✓ |
| Pagina piena /admin |  |

**User's choice:** Foglio che sale dal basso sopra la barra; voci alfabetiche una per riga; si chiude toccando fuori o la stessa voce

**Su tablet/desktop**

| Option | Selected |
|--------|----------|
| Si espande nella colonna | ✓ |
| Stesso foglio del telefono |  |

**User's choice:** Si espande nella colonna e sostituisce la sezione Work

**Account per chi non ha Management**

| Option | Selected |
|--------|----------|
| Account in barra quando manca Management | ✓ |
| Account sempre in barra | ✓ |

**User's choice:** Account in barra quando non c'e' Management: attendee e anonimo vedono Events · Account

**NAV-04 cosa resta appeso**

| Option | Selected |
|--------|----------|
| Striscia degli strumenti | ✓ |
| Barra col nome dello strumento |  |

**User's choice:** La striscia scorrevole degli strumenti, sticky sotto l'intestazione

---

## Il cancello sulla gallery

**Attendee loggato su /gallery**

| Option | Selected |
|--------|----------|
| Rifiuto standard del middleware | ✓ |
| 404 |  |

**User's choice:** Lo stesso rifiuto standard del middleware che riceve su /admin

**Anonimo su /gallery**

| Option | Selected |
|--------|----------|
| Login con ritorno | ✓ |
| 404 |  |

**User's choice:** Al login con ritorno: /login?next=/gallery

**Concessioni di gallery.view**

| Option | Selected |
|--------|----------|
| Per ruolo ai tre | ✓ |
| Staff solo per assegnazione | ✓ |

**User's choice:** Per ruolo a master, organizer e staff: 16 chiavi, 31 concessioni

**Quando la gallery riaprira'**

| Option | Selected |
|--------|----------|
| Nota adesso | ✓ |
| Lo decido allora |  |

**User's choice:** Si toglie la riga dalla mappa e la voce torna in barra per tutti; nota scritta per chi riaprira'

---

## I chip dei format e le linguette della porta

**Format ritirato con serate visibili**

| Option | Selected |
|--------|----------|
| Si' se visibile |  |
| No, ritirato non si mostra |  |

**User's choice:** Il chip compare se ha una serata visibile

**Nessuna serata visibile**

| Option | Selected |
|--------|----------|
| Riga assente | ✓ |
| Solo All |  |

**User's choice:** Riga dei chip assente

**Nome delle linguette della porta**

| Option | Selected |
|--------|----------|
| Entrambe con conteggio | ✓ |
| Solo Alerts |  |

**User's choice:** Entrambe con il conteggio: Recent (n), Alerts (n); Alerts senza numero a zero

**Avviso nuovo su un'altra linguetta**

| Option | Selected |
|--------|----------|
| Si evidenzia | ✓ |
| Si apre da sola | ✓ |

**User's choice:** La linguetta si evidenzia e il conteggio sale; non si apre da sola; le pastiglie di stato restano in testata

---

## TASK spento e badge

**TASK spento al tocco**

| Option | Selected |
|--------|----------|
| Niente | ✓ |
| Tooltip in arrivo |  |
| Pagina segnaposto |  |

**User's choice:** Niente: non e' un link, aria-disabled, nessun messaggio

**Il posto del badge TASK-04**

| Option | Selected |
|--------|----------|
| Solo lo spazio | ✓ |
| Niente |  |

**User's choice:** Solo lo spazio nel disegno della voce; nessun contatore nella 52

---

## L'annullamento dentro Recent

**Undo con Recent in linguetta**

| Option | Selected |
|--------|----------|
| Sulla riga dentro Recent | ✓ |
| Anche Undo last in testata |  |

**User's choice:** Resta sulla riga dentro Recent; nessuna scorciatoia in testata; supervisione invariata

---

## Il viewport iOS

**Dove si applica**

| Option | Selected |
|--------|----------|
| Tutta l'app | ✓ |
| Solo porta e login |  |

**User's choice:** A tutta l'app: meta viewport in layout.tsx, dvh; prova manuale su iPhone su login, porta e un form pubblico

---

## Nomi doppi nel pannello

**Events pubblico vs strumento /admin/events**

| Option | Selected |
|--------|----------|
| Nights |  |
| Manage events | ✓ |
| Stesso nome |  |

**User's choice:** Lo strumento si chiama «Manage events», nel pannello e nella striscia

---

## La barra con la tastiera aperta

**Barra fissa sopra la tastiera**

| Option | Selected |
|--------|----------|
| Si nasconde | ✓ |
| Resta sempre |  |

**User's choice:** Si nasconde mentre un campo ha il fuoco (login, ricerca alla porta) e torna al blur

---

## Linguette vuote

**Recent e Alerts senza contenuto**

| Option | Selected |
|--------|----------|
| Sempre presenti | ✓ |
| Solo con contenuto |  |

**User's choice:** Sempre presenti senza numero; Recent vuota «No scans yet», Alerts vuota «Nothing to report»

---

## Check-in senza assegnazione

**Staff non assegnato stasera**

| Option | Selected |
|--------|----------|
| Assente | ✓ |
| Spenta come TASK |  |

**User's choice:** Check-in resta assente come oggi: la barra si filtra su sessione, ruolo, capability; TASK spento e' una pagina che non esiste, non un permesso che manca

---

## L'avviso della guest list

**Dove sta l'avviso do-not-refuse**

| Option | Selected |
|--------|----------|
| In testata | ✓ |
| Nella linguetta Alerts | ✓ |

**User's choice:** In testata sopra la lista, sempre visibile; nella linguetta Alerts vanno banda di eta', esiti del drenaggio, avvisi di cache

---

## Il pannello aperto

**Colonna desktop, stato iniziale**

| Option | Selected |
|--------|----------|
| Aperto dentro uno strumento | ✓ |
| Sempre aperto |  |
| Sempre chiuso |  |

**User's choice:** Aperto dentro uno strumento (/admin/*) con la voce corrente evidenziata, chiuso altrove; un tocco apre e chiude

**Intestazione del foglio da telefono**

| Option | Selected |
|--------|----------|
| Solo la lista | ✓ |
| Intestazione con chi sei e Sign out |  |

**User's choice:** Solo la lista alfabetica; Account e' una voce e porta gia' email, password, Sign out

---

## Claude's Discretion

- Ordine dei chip e stato vuoto della lista; icone e colore dello spento; forma dell'evidenza su Alerts; come il pannello sa di essere dentro uno strumento; ordine dei piani.

## Deferred Ideas

- Riga NAV-01 della roadmap da riscrivere con `/gsd-phase edit 52`.
- Riapertura della gallery al pubblico (fuori fase).
- Il badge di TASK-04 (fase 53).

## Folded Todos

- door-tabs-recent-scans-and-alerts.md
- door-and-login-viewport-crops-under-keyboard.md
