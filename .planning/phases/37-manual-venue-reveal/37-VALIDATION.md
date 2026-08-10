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

> Una riga per task reale, derivata dai 13 PLAN.md. **Una riga senza comando
> meccanico ne' `human_needed` esplicito sarebbe una riga non verificata:** qui
> non ce ne sono. La colonna «Comando» riporta il gate del task, non l'intero
> blocco `<verify>` — la fonte resta il PLAN.md.

| Task ID | Plan | Wave | Req | Cosa prova | Tipo | Comando | Status |
|---|---|---|---|---|---|---|---|
| 37-01-01 | 01 | 1 | VENUE-02 | La migration e' una sola transazione | source | `grep -c "BEGIN;" supabase/migrations/20260810160000_manual_venue_reveal.sql` | ⬜ |
| 37-01-02 | 01 | 1 | VENUE-02 | Lo scrittore revoca prima di concedere; il rifiuto non porta la riga | source | `grep -n "REVOKE ALL ON FUNCTION public.record_venue_reveal_act" …` | ⬜ |
| 37-01-03 | 01 | 1 | VENUE-02 | I due lettori TypeScript concordano con la riga nel database | build | `npm run build` | ⬜ |
| 37-02-01 | 02 | 1 | VENUE-01 | `using (true)` non sopravvive alla migration | source | `grep -c "USING (true)\|using (true)" …_venues_read_narrowed.sql` | ⬜ |
| 37-02-02 | 02 | 1 | VENUE-01 | La concessione e' per serata, non per sede | source | `grep -n "GRANT EXECUTE ON FUNCTION public.venue_for_parties" …` | ⬜ |
| 37-12-01 | 12 | 1 | VENUE-01 | Una sola allow-list, estratta non riscritta | build | `npm run build` | ⬜ |
| 37-12-02 | 12 | 1 | VENUE-01 | Il login smette di fidarsi di `?next=` | build | `npm run build` | ⬜ |
| 37-04-01 | 04 | 1 | VENUE-01 | La costante 25h vive in un posto solo | build | `npm run build` | ⬜ |
| 37-04-02 | 04 | 1 | VENUE-01 | Il pavimento rifiuta **e dice perche'** | build | `npm run build` | ⬜ |
| 37-04-03 | 04 | 1 | VENUE-01 | Le serate sotto 25h sono **elencate**, mai riscritte | **checkpoint** | `human_needed` — decisione del proprietario, una serata per volta | ⬜ |
| 37-03-01 | 03 | 2 | VENUE-01/02 | Autorizzazione a scrivere in produzione + istantanea sulle 17 tabelle | **checkpoint** | `human_needed` — `gate="blocking"`, include «rimanda la push» | ⬜ |
| 37-03-02 | 03 | 2 | VENUE-01/02 | Le due migration applicate, in ordine | probe | `npm run verify:capabilities` | ⬜ |
| 37-03-03 | 03 | 2 | VENUE-01/02 | I tipi allineati allo schema vivo | build+probe | `npm run build && npm run verify:capabilities && npm run verify:routes` | ⬜ |
| 37-05-01 | 05 | 3 | VENUE-01 | La lista risolve i nomi per titolo, non per embed | build+source | `npm run build && grep -c "google_maps_url" "src/app/(public)/events/page.tsx"` | ⬜ |
| 37-05-02 | 05 | 3 | VENUE-01 | I due campi escono dal payload RSC verso il client | build | `npm run build` | ⬜ |
| 37-06-01 | 06 | 3 | VENUE-01/02 | Il ramo livello 2 si **aggiunge**; il gate di casa riscritto nello stesso commit | build+persona | `npm run build && npm run verify:persona` | ⬜ |
| 37-06-02 | 06 | 3 | VENUE-01/02 | L'indirizzo arriva dalla funzione di titolo, non dall'embed | build+source | `npm run build && grep -c "venues(" "src/app/(public)/events/[slug]/page.tsx"` | ⬜ |
| 37-06-03 | 06 | 3 | VENUE-01/02 | Il dialogo mostra la finestra **effettiva**; dinamicita' dichiarata | build + osservazione | `npm run build` + `human_needed` | ⬜ |
| 37-07-01 | 07 | 4 | VENUE-01 | Il dialogo dell'indizio dice la finestra vera e i tre livelli | build | `npm run build` | ⬜ |
| 37-07-02 | 07 | 4 | VENUE-01 | La pagina serata esce dalle tre cache `NetworkFirst` | build | `npm run build` | ⬜ |
| 37-08-01 | 08 | 4 | VENUE-01 | `/venues` non esiste piu' sotto `(public)` | source+build | `test ! -f "src/app/(public)/venues/[slug]/page.tsx" && npm run build` | ⬜ |
| 37-08-02 | 08 | 4 | VENUE-01 | Mappa e allow-list dicono la verita' sul disco | probe | `npm run build && npm run verify:routes && npm run verify:capabilities` + `human_needed` | ⬜ |
| 37-09-01 | 09 | 4 | VENUE-01/02 | Un solo cuore di rivelazione; la marcatura dice la verita' | build+source | `npm run build && head -1 src/lib/venue-reveal/reveal-party-venue.ts` | ⬜ |
| 37-09-02 | 09 | 4 | VENUE-01/02 | Il cron completa i mancanti e smette di alzare la guardia sulle bozze | build+source | `npm run build && git diff --name-only \| grep -c vercel.json` | ⬜ |
| 37-09-03 | 09 | 4 | VENUE-01/02 | Il gate copre il codice che governa (`src/lib/venue-reveal/**`) | persona | `npm run verify:persona` + `human_needed` (context budget rimisurato) | ⬜ |
| 37-10-01 | 10 | 5 | VENUE-02 | Capability **dentro** l'azione; `partyId` validato come uuid | build | `npm run build` | ⬜ |
| 37-10-02 | 10 | 5 | VENUE-02 | Tre atti, un solo scrittore; **nessun** `error.details` | build+source | `npm run build && grep -c "error.details" ".../reveal/actions.ts"` (atteso `0`) | ⬜ |
| 37-10-03 | 10 | 5 | VENUE-02 | La porta laterale del form e' chiusa **e il resto e' dichiarato** | build | `npm run build` + `human_needed` | ⬜ |
| 37-11-01 | 11 | 6 | VENUE-02 | La conferma nomina posto, **numero**, irreversibilita'; nessuna digitazione | build | `npm run build` | ⬜ |
| 37-11-02 | 11 | 6 | VENUE-02 | Tre stati, una posizione, la traccia accanto | build | `npm run build` | ⬜ |
| 37-11-03 | 11 | 6 | VENUE-02 | La prova sull'atto **vero** — riga creata e rimossa per chiave primaria | **produzione** | `human_needed` — un solo ciclo, senza risemina | ⬜ |
| 37-13-01 | 13 | 7 | VENUE-01/02 | Istantanea + sonde per chiave primaria con la sola chiave anonima | probe | `curl … /rest/v1/venues?select=id&limit=1 -H "apikey: $ANON"` | ⬜ |
| 37-13-02 | 13 | 7 | VENUE-01/02 | Il **sorgente**, non il rendering: aghi dichiarati sull'intero documento | probe | `curl -s … "$NEXT_PUBLIC_APP_URL/events"` | ⬜ |
| 37-13-03 | 13 | 7 | VENUE-01/02 | La cache attraverso l'istante, in due direzioni; il debito che resta | **osservazione** | `human_needed` — finestra privata + finestra gia' visitata | ⬜ |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

**Continuita' di campionamento:** nessun blocco di tre task consecutivi senza un
gate meccanico. I cinque `human_needed` puri (37-04-03, 37-03-01, 37-11-03,
37-13-03, piu' le tre voci di ruolo dichiarate sotto) sono **checkpoint
dichiarati**, non buchi: tre di essi sono esattamente i punti in cui la fase
tocca la produzione o chiede una decisione al proprietario.

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
