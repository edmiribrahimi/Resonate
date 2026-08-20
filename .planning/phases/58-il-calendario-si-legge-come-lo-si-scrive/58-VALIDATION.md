---
phase: 58
slug: il-calendario-e-uno-specchio
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-08-20
---

# Fase 58 — Strategia di validazione

> Contratto di validazione della fase, per il campionamento del feedback durante
> l'esecuzione. Derivato dalla sezione `## Validation Architecture` di
> `58-RESEARCH.md`, **piu' le sei decisioni del proprietario del 2026-08-20**
> (`58-CONTEXT.md`, D-58-01 → D-58-06), che aggiungono due requisiti e ne
> modificano tre.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | **Nessuno.** Il repo non ha script `test`, ne' `*.test.*`, ne' `*.spec.*` (CLAUDE.md, Guardrail 1). **Nessuna modifica al prodotto puo' essere dichiarata verificata perche' «i test passano».** |
| **Config file** | nessuno — e non se ne crea uno in questa fase |
| **Quick run command** | `npm run build` (include il typecheck di Next) |
| **Full suite command** | `npm run verify` (aggregato) |
| **Fuori dall'aggregato** | `npm run verify:ics` (richiede il materiale del calendario, `NEEDS_MATERIAL` per decisione scritta in `verify-all.mjs:51-58`) · `npm run verify:persona` (solo se si tocca `.claude/**`) |
| **Estimated runtime** | `npm run build` ~90–180 s · `npm run verify` ~30–60 s |

**Cio' che sostituisce i test in questo repo:** script `verify-*.mjs` che leggono
sorgenti, dichiarazioni o il file vero, con **tre** esiti (`0` passa, `1`
fallisce, `2` rifiuta — e **un rifiuto non e' un fallimento**), piu' **procedure
manuali scritte** sul modello di `44-PROCEDURES.md`.

---

## Sampling Rate

- **Dopo ogni commit di task:** `npm run build`.
  - Se il task tocca `src/lib/production/ics/` → anche `npm run verify:ics-reachable`.
  - Se il task tocca `src/app/(admin)/admin/calendar/` → anche `npm run verify:calendar-surface`.
  - Se il task tocca `supabase/migrations/` → **lettura del catalogo vivo**, non il build. Vedi § *Il gate dello schema*.
- **A chiusura di ogni onda:** `npm run verify` + il nuovo `npm run verify:ics-grammar`.
- **Gate di fase, prima di `/gsd:verify-work`:** `npm run verify` verde, **piu'**
  `npm run verify:ics` sul file vero sulla macchina del proprietario, **piu'** le
  tre procedure manuali `P-58-A`, `P-58-B`, `P-58-C` eseguite e **scritte**.
- **Max feedback latency:** ~180 s (il build e' il passo lento).

---

## Il gate dello schema — perche' un verde di build non dice niente

La CLI Supabase **non e' installata**: le migration si applicano tramite
l'endpoint migrations della **Management API** (precedente in repo:
`scripts/rls-baseline.mjs:82,268`).

**Conseguenza operativa:** `npm run build` passa anche con una migration mai
applicata, perche' i tipi TypeScript vengono da `src/types/database.ts`, un file
generato, **non dal database**. Ogni task che aggiunge una migration si verifica
**interrogando il catalogo vivo** — `information_schema.columns`,
`information_schema.table_constraints`, `pg_indexes`, `pg_policies` — e
scrivendo la misura. Non con un verde di build, e non riapplicando la migration.

---

## Per-Task Verification Map

I `Task ID` si assegnano in fase di piano; questa mappa dichiara **il
comportamento e il suo comando**, che e' cio' che il piano deve agganciare.

| Req | Comportamento da provare | Tipo | Comando / prova | Esiste? |
|---|---|---|---|---|
| **ICS-01** | Lo specchio cancella nell'ordine imposto dalle FK (checklist → pezzi → piani → impegni) e non lascia righe fuori scopo | catalogo | `SELECT count(*)` per tabella dalla Management API, **prima e dopo**, letto da una fonte diversa dallo strumento che ha cancellato | ❌ **onda 0** |
| **ICS-01** | Nessun `absent_since` viene mai scritto dopo la riscrittura | source | controllo aggiuntivo dentro `verify-ics-import.mjs` | ❌ onda 0 |
| **ICS-01** | **Idempotenza dello specchio** — due esecuzioni consecutive lasciano lo **stesso insieme di righe** | source + catalogo | **controllo E riscritto**: il predicato non e' piu' «il secondo piano e' vuoto» ma «lo stato risultante e' identico» | ⚠ **riscrittura** |
| **ICS-01b** *(D-58-01)* | Un `source_uid` gia' noto che arriva con un **progressivo diverso** fa **rifiutare** l'import (uscita `2`), **senza scrivere niente** | eseguibile | gate sintetico + prova su file di prova: attesa uscita `2` e zero scritture | ❌ **onda 0** — e' la sostituzione della guardia monotona |
| **ICS-01b** *(D-58-01)* | L'argomento di riautorizzazione esplicita **permette** la rinumerazione e la **registra** nel referto | eseguibile | stessa prova con l'argomento: uscita `0`, la riga compare nel referto | ❌ onda 0 |
| **ICS-02** | Senza chiave di calendario, `--apply` **rifiuta** con uscita `2` | eseguibile | lancio senza chiave → attesa uscita `2` | ❌ onda 0 — riga in `verify-refusal.mjs` |
| **ICS-02** | La colonna di scopo esiste su tutte le tabelle dello specchio, e' `NOT NULL` e **ha un indice** | **catalogo** | `information_schema.columns` + `pg_indexes` dalla Management API | ❌ onda 0 |
| **ICS-02** | Il vocabolario delle chiavi e' **chiuso** e concorda fra `CHECK` SQL e TypeScript — tre chiavi: `rsnt`, `rmdb`, `mtnlb` | source + SQL | estensione del controllo **G** di `verify-ics-import.mjs` | ⚠ estensione |
| **ICS-02** | Specchiare un calendario **non tocca** le righe di un altro | catalogo | conteggi per chiave prima e dopo: solo la chiave importata cambia | ❌ onda 0 |
| **ICS-03** | Una **spunta** sopravvive a un import | **manuale, obbligatoria** | — | ❌ **P-58-A** |
| **ICS-03** | Un **legame** con una serata pubblicata sopravvive a un import | **manuale, obbligatoria** | — | ❌ **P-58-B** |
| **ICS-03** | Il ripristino di una spunta **conserva chi l'aveva messa** e non la riattribuisce a chi ha lanciato l'import | catalogo | `ticked_by` invariato fra prima e dopo | ❌ onda 0, dentro P-58-A |
| **ICS-03b** *(D-58-02)* | Una riga di piano con un legame **non viene mai cancellata**, anche quando il file non la porta piu' | eseguibile + catalogo | file di prova senza quel `source_uid` → la riga e' ancora li', e il referto lo dice | ❌ **onda 0** |
| **ICS-04** | Le quattro forme di titolo che oggi falliscono producono un **pezzo** | **source, contro il modulo** | `verify-ics-grammar.mjs`: chiama `classifyEntry` con **titoli e alias sintetici**, senza aprire `docs/` | ❌ **onda 0 — il gate piu' prezioso della fase** |
| **ICS-05** | Un pezzo senza numero si aggancia alla serata giusta | source, contro il modulo | stesso gate sintetico, con notti e regole costruite a mano | ❌ onda 0 |
| **ICS-05** | **Zero candidate** e **piu' di una candidata** danno **due esiti diversi**, e nessuno dei due e' «la piu' vicina» | source | stesso gate sintetico | ❌ onda 0 |
| **ICS-05** | Nessun pezzo che annuncia una serata e' datato **dopo** di essa | file vero | controllo **C** di `verify-ics-import.mjs` | ✅ esiste — da rieseguire |
| **ICS-06** | La dichiarazione «si ricalcolano a ogni import» compare quando c'e' almeno una proposta | source | `U11` in `verify-calendar-surface.mjs` | ❌ onda 0 |
| **ICS-06** | Una proposta **non si legge** come una data decisa | **manuale, giudizio** | `44-PROCEDURES.md` **P2**, da rieseguire con la frase nuova | ✅ esiste come forma |
| **ICS-07** | Il referto di un `--apply` che scrive proposte **passa il proprio audit** | eseguibile | lancio con `--apply` → attesa `IMPORT_APPLIED_OK`, uscita `0` | ✅ il controllo esiste nello script; **richiede materiale** |
| **ICS-07** | **Nessun identificativo grezzo** compare nel transcript | source | controllo sulle `say(` che interpolano un `id` / `uid` | ❌ onda 0 |
| **ICS-08** | La decisione presa e' quella che il codice esegue: `Timetable` nudo → **pezzo della notte**; `Flyering` → **settimo tipo** | source + modulo | gate sintetico di `ICS-04`, esteso ai due titoli | ❌ onda 0 |
| **ICS-08** *(D-58-04)* | `flyering` esiste **contemporaneamente** in `PIECE_KINDS`, `PIECE_KIND_LABELS`, nel `CHECK` di `production_piece`, nel `CHECK` di `production_pipeline_rule` e in `database.ts` | source + SQL | controllo **G** di `verify-ics-import.mjs` (gia' scritto per questo scopo) | ✅ esiste — deve **fallire** prima e passare dopo |
| **ICS-09** *(D-58-05)* | Senza il link registrato, l'import **rifiuta** — non ricade su un file, non ricade su un default | eseguibile | lancio senza sorgente → uscita `2` | ❌ onda 0 |
| **ICS-09** *(D-58-05)* | Il link **non compare** nel repo, in `.planning/`, nel referto o nei log | source | controllo che nessun file tracciato contenga uno schema `webcal:`/`https://` verso il fornitore, e che il referto non stampi la sorgente per esteso | ❌ onda 0 |
| **ICS-10** *(D-58-05)* | Un feed **vuoto o drasticamente piu' piccolo** del precedente fa **rifiutare** lo specchio, senza cancellare niente | eseguibile | prova con feed a zero eventi e con feed dimezzato → uscita `2`, conteggi invariati | ❌ **onda 0 — e' la guardia che rende accettabile il cron** |
| **ICS-10** *(D-58-05)* | Un fallimento del cron ha un **effetto osservabile**, non solo una riga di log | superficie + catalogo | la superficie mostra l'esito e **l'ora** dell'ultimo specchio riuscito per ogni chiave; un fallimento e' distinguibile da «non e' ancora girato» | ❌ onda 0 |
| **ICS-10** *(D-58-05)* | Il percorso del cron e' **autenticato** e non raggiungibile senza il segreto | eseguibile | chiamata senza segreto → `401`; con segreto → `200` | ❌ onda 0 |
| **tutti** | I moduli esistono e il barrel si importa | eseguibile | `npm run verify:ics-reachable` | ✅ esiste — **il conteggio dei moduli va aggiornato nello stesso commit** in cui un file sparisce |
| **tutti** | I vocabolari TypeScript e i `CHECK` SQL concordano | source + SQL | controllo **G** di `verify-ics-import.mjs` | ✅ esiste |
| **tutti** | Il tipo compila | build | `npm run build` | ✅ |

---

## Wave 0 Requirements

- [ ] **`scripts/verify-ics-grammar.mjs`** + voce `verify:ics-grammar` in
      `package.json` — il gate sintetico: chiama `classifyEntry` e la seconda
      passata con **titoli e alias costruiti dentro il file**, senza aprire
      `docs/`. Copre `ICS-04`, `ICS-05`, `ICS-08`.
      ⚠ **Vincolo di riservatezza:** i titoli sintetici possono contenere solo
      parole **gia' pubbliche** — sigle di formato e locali gia' in rotazione.
      Nessuno spazio in trattativa, nessuna data non annunciata.
      **E' il gate piu' prezioso della fase**, perche' non chiede materiale e
      quindi entra in `npm run verify` — dove `verify:ics` non puo' stare.
- [ ] **Riscrittura del controllo E** di `verify-ics-import.mjs`: da «il secondo
      piano e' vuoto» a «lo stato risultante e' identico».
- [ ] **Rimisura dei numeri d'oro del controllo B** dopo `ICS-04`/`ICS-05`.
      **Rimisurati, mai aggiustati per far passare il gate.**
- [ ] **`U11`** in `verify-calendar-surface.mjs` per la dichiarazione di `ICS-06`.
- [ ] **Il gate del feed dimezzato** (`ICS-10`) — con i suoi due casi di prova,
      zero eventi e meta' eventi. Va scritto **prima** che il cron esista.
- [ ] **Estensione del controllo G** al vocabolario delle chiavi di calendario e
      al settimo tipo di pezzo.
- [ ] **`P-58-A`** (la spunta sopravvive) e **`P-58-B`** (il legame sopravvive),
      sul modello di `44-PROCEDURES.md`: precondizioni lette il giorno stesso,
      passi numerati, ruolo con cui si esegue, cosa si deve osservare.
- [ ] **`P-58-C` — la procedura di ripristino:** cosa si fa se lo specchio muore
      fra la cancellazione e la riscrittura. Va scritta **prima del primo
      `--apply`**, non dopo. Senza PITR e senza transazione, e' l'unico piano di
      rientro esistente. **Con il cron (`ICS-10`) smette di essere teorica**: un
      processo non presidiato puo' morire a meta' di notte.
- [ ] **Aggiornamento di `verify-ics-reachable.mjs`** se il numero dei moduli
      cambia, **nello stesso commit** della cancellazione.

---

## Manual-Only Verifications

| Comportamento | Req | Perche' manuale | Istruzioni |
|---|---|---|---|
| Una spunta sopravvive a un import | ICS-03 | Richiede un attore reale che spunta, e il confronto di `ticked_by` prima/dopo. Nessuno script puo' spuntare al posto di una persona senza falsare proprio il dato che si sta verificando | **P-58-A**, da scrivere |
| Un legame con una serata pubblicata sopravvive a un import | ICS-03 | Richiede una serata pubblicata e il suo legame. Tocca `event_parties`: e' **produzione** | **P-58-B**, da scrivere |
| Il ripristino dopo uno specchio interrotto | ICS-01 / ICS-10 | Non c'e' transazione, non c'e' PITR: e' una procedura di rientro umana | **P-58-C**, da scrivere **prima** del primo `--apply` |
| Una proposta non si legge come una data decisa | ICS-06 | E' un giudizio di lettura, non un predicato | `44-PROCEDURES.md` **P2**, rieseguita con la frase nuova |
| I numeri d'oro del controllo B sul file vero | ICS-04 / ICS-05 | Richiede il calendario di produzione, che **non sta nel repo** | `npm run verify:ics` sulla macchina del proprietario |

⚠ **P-58-A e P-58-B scrivono in produzione.** Valgono i gate di
`ai-engineering.md`: gli identificativi delle righe create si catturano **al
momento della creazione**, la rimozione avviene **per chiave primaria** su quella
lista, il conteggio di controllo si chiede a **una fonte diversa** da quella su
cui si e' agito, e l'istantanea preventiva copre **ogni tabella raggiungibile per
cascata** — qui `production_checklist_item`, che pende da `production_plan` con
`ON DELETE CASCADE`.

⚠ **`ticked_by_name` e' un nome di persona.** L'istantanea delle spunte e'
**materiale**: vive nella directory ignorata, mai nel repo, mai in un `PLAN`, un
`SUMMARY` o un `VERIFICATION`. Il referto non ne stampa il contenuto.

---

## Validation Sign-Off

- [ ] Ogni task ha una verifica automatica o una dipendenza dall'onda 0
- [ ] Continuita' del campionamento: mai tre task consecutivi senza verifica automatica
- [ ] L'onda 0 copre tutte le voci marcate ❌
- [ ] Nessun flag di watch-mode
- [ ] Feedback latency < 180 s
- [ ] Le tre procedure manuali sono **scritte** prima dell'onda che le richiede
- [ ] `nyquist_compliant: true` in frontmatter

**Approval:** pending
