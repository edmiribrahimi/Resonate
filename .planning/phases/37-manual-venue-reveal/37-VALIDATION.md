---
phase: 37
slug: manual-venue-reveal
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-08-10
---

# Phase 37 — Validation Strategy

> Contratto di validazione della fase, per il campionamento del feedback durante
> l'esecuzione. Deriva da `37-RESEARCH.md` § *Validation Architecture*.
>
> **Questo repo non ha un test runner per il prodotto.** Il contratto qui sotto
> non finge il contrario: dichiara cosa e' meccanicamente verificabile, cosa e'
> osservabile a mano, e cosa **non e' provabile oggi**.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | **nessuno** — `package.json` non ha script `test`; nessun `*.test.*` / `*.spec.*` esiste nel repo |
| **Config file** | none — e **Wave 0 non ne installa uno**: introdurre un framework non e' nel perimetro della fase 37 |
| **Quick run command** | `npm run build` (`next build --webpack`) — **e' anche il gate dei tipi** |
| **Full suite command** | `npm run build && npm run verify:routes && npm run verify:capabilities && npm run verify:persona` |
| **Estimated runtime** | ~90–150 s (`verify:capabilities` richiede il database) |

**Conseguenza operativa:** nessuna modifica al prodotto in questa fase puo'
essere dichiarata verificata perche' «i test passano». La prova e' `npm run
build` piu' la procedura manuale scritta sotto, eseguita e riportata con
evidenza `file:riga` o output osservato.

---

## Sampling Rate

- **After every task commit:** `npm run build`
- **After every plan wave:** `npm run build && npm run verify:routes && npm run verify:capabilities`
- **After any task touching `.claude/**` or `CLAUDE.md`:** aggiungere `npm run verify:persona`
- **Before `/gsd:verify-work`:** tutti e quattro verdi **piu'** la procedura anonima (sotto) eseguita
- **Max feedback latency:** ~150 s

---

## Per-Task Verification Map

> Compilata da chi pianifica: una riga per task, con il comando meccanico se
> esiste e `human_needed` se non esiste. **Una riga senza colonna «Automated
> Command» ne' `human_needed` esplicito e' una riga non verificata.**

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 37-XX-XX | XX | X | VENUE-01 / VENUE-02 | T-37-XX / — | {comportamento sicuro atteso} | build / probe / manual | `npm run build` \| `curl` con chiave anonima \| `human_needed` | — | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

**Nessuna.** Non esiste infrastruttura di test da preparare e **non se ne
introduce una in questa fase**: sarebbe una decisione di progetto, non un
prerequisito di validazione.

Cio' che sostituisce Wave 0 e' **l'istantanea prima di qualunque scrittura in
produzione**: hash e conteggi per tabella su tutte le tabelle raggiungibili per
`ON DELETE CASCADE` dalle righe toccate (l'inventario e' in `37-RESEARCH.md`
§ *Runtime State Inventory*), presi con la service key **in sola lettura**.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Una serata senza azione manuale rivela il venue come oggi, all'istante previsto | VENUE-01 | Nessun runner; il verdetto e' un predicato di pagina reso a tre sessioni diverse | Aprire la pagina della serata con (a) nessuna sessione, (b) membro approvato senza biglietto ne' RSVP, (c) titolare di biglietto. Confrontare i tre verdetti con i rami misurati in `37-RESEARCH.md` § A.1 |
| L'indirizzo di una serata segreta non e' leggibile da un lettore anonimo | VENUE-01 | La fuga misurata non e' nel rendering: vive nel payload RSC. Nessun controllo automatico la vede | `curl` su `/events` e `/events/<slug>`, ricerca di **aghi dichiarati** (indirizzo, link Maps, nome sede, id sede) sull'**intero documento**. Piu' sonda `GET /rest/v1/...` per chiave primaria con la sola `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| Una serata **non** segreta continua a mostrare nome e indirizzo del locale senza login | VENUE-01 (D-37-24) | Senza questa misura il rimedio e' indistinguibile da una rottura silenziosa | Stessa corsa `curl`, stessa serata **non** segreta: nome e indirizzo devono comparire |
| La conferma nomina il posto, **il numero di persone** e l'irreversibilita' | VENUE-02 | E' un testo su una superficie di lavoro | Aprire il dialogo; rileggere il numero **dal database**, non dalla schermata che l'ha mostrato |
| La traccia registra chi e quando, e sopravvive al ri-nascondere del master | VENUE-02 | Nessun runner; la prova e' una riga append-only | Azione **dall'interfaccia** → lettura della traccia **dal database**. Poi ri-nascondere e rileggere: la riga resta |
| Il secondo tentativo non cambia nulla e lo dice | VENUE-02 | L'irreversibilita' non si prova senza compiere l'atto una volta | Bottone spento con data e nome; invocazione **diretta** della server action rifiutata; `venue_revealed_at` invariato |
| Una pagina non viene servita stale attraverso l'istante di rivelazione | VENUE-01 (D-37-09) | Il service worker cachea le pagine `NetworkFirst` a 24 h: nessun build lo rivela | Stessa pagina in finestra privata (service worker pulito) e in finestra gia' visitata, **prima e dopo** l'istante. Due letture, dichiarate come tali |
| Il pavimento di 25 ore rifiuta un valore piu' basso **e dice perche'** | VENUE-01 (D-37-06) | E' un messaggio d'errore su un form | Salvare una finestra a 6 ore: il rifiuto deve nominare la causa («sotto le 25 ore la mail puo' partire dopo la serata») |

### Non provabile oggi — dichiarato, non aggirato

| Comportamento | Perche' non e' provabile | Stato |
|---|---|---|
| Un organizer **approvato e non proprietario** riesce a rivelare | In produzione non esistono sessioni `organizer` ne' `staff` | `human_needed` |
| Un organizer **non approvato** viene **rifiutato** | Idem — e nessuno ha mai visto questo modello di permessi rifiutare qualcuno | `human_needed` |
| L'assenza di un canale di fuga dell'indirizzo | Nessun meccanismo puo' asserire l'assenza di un canale. La procedura prova che *N aghi dichiarati* non compaiono in *M documenti letti in un momento preciso* | dichiarato come limite |

---

## I quattro principi che governano ogni misura

Vengono dall'incidente della fase 36 e sono in `.claude/rules/ai-engineering.md`.
Valgono per ogni procedura di questo documento.

1. **La misura non si prende con lo strumento che ha causato l'effetto.** Una
   rimozione fatta dall'interfaccia si conferma nel database; una modifica fatta
   nel database si conferma nell'interfaccia.
2. **Le righe create per una prova si catturano per chiave primaria alla
   creazione e si rimuovono per chiave primaria.** Mai cliccando un controllo di
   cancellazione, mai risalendo un albero di elementi.
3. **L'istantanea copre le cascate** — tutte, lette dai vincoli, non ricordate.
4. **L'autorizzazione a scrivere in produzione si consuma una volta**, copre
   esattamente cio' che e' stato descritto, e chi la riceve dichiara quando l'ha
   esaurita. **Un solo ciclo, senza risemina.**

---

## Validation Sign-Off

- [ ] Ogni task ha un comando meccanico **oppure** un `human_needed` esplicito
- [ ] Continuita' di campionamento: nessun blocco di 3 task consecutivi senza `npm run build`
- [ ] Wave 0: nessuna (dichiarato sopra) — l'istantanea sulle cascate la sostituisce
- [ ] Nessun flag watch-mode
- [ ] Feedback latency < 150 s
- [ ] Procedura anonima eseguita e riportata, con la strada positiva di D-37-24 nella stessa corsa
- [ ] Le tre voci `human_needed` riportate come tali nel VERIFICATION.md, non silenziate
- [ ] `nyquist_compliant: true` impostato in frontmatter

**Approval:** pending
