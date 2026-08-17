---
phase: 45-production-sections-section-by-section
plan: 04
subsystem: access-control
tags: [rls, policies, storage, supabase, migrations, production-sections]

# Dependency graph
requires:
  - plan: 45-01
    provides: "le cinque tabelle nuove, create con RLS attiva e zero policy — lo stato che questo piano corregge"
  - plan: 45-03
    provides: "le quattro chiavi di sezione, coniate carattere per carattere, e la convenzione di rinomina delle sei policy del calendario"
provides:
  - "dieci archi SELECT sulle cinque tabelle nuove (file, non applicati)"
  - "il bucket privato visual-archive, scrivibile solo dal server (file, non applicato)"
  - "la decisione sulla destinazione dell'archivio foto, scritta dove il proprietario la legge prima di autorizzare"
  - "le due assenze — policy di scrittura, arco verso la strada pubblica a un indirizzo — dichiarate come decisioni"
affects: [45-06, 45-08, 45-13, 45-14, 45-15, 45-16]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Un arco per sezione su una tabella che ne ospita due: policy permissive disgiunte sulla colonna `section`, che Postgres mette in OR — l'OR e' la semantica voluta, non il rischio"
    - "L'arco su colonna nullable si scrive con IS NULL, mai per confronto: `section = 'x'` su NULL e' NULL, e una policy che ci si appoggia nasconde righe senza errore"
    - "Il bucket privato senza policy di scrittura: l'assenza della policy e' cio' che rende vero il percorso server-only, non l'abitudine del codice"
    - "Un criterio di accettazione che scatta su prosa corretta si aggira riscrivendo la prosa e dichiarandolo, non allentando il criterio"

key-files:
  created:
    - supabase/migrations/20260817120300_production_sections_access.sql
    - supabase/migrations/20260817120400_visual_archive_bucket.sql
  modified: []

key-decisions:
  - "Cinque archi sul registro delle domande invece di tre: la colonna `section` non ha CHECK e il registro copre quattro sezioni, quindi tre archi avrebbero reso illeggibile a chiunque una domanda su location o calendario — senza errore, su una tabella la cui unica funzione e' avvertire"
  - "La chiave del calendario compare in questo file, e la ragione e' che il registro non e' una tabella del calendario: e' una tabella nuova che dichiara di coprire quattro sezioni"
  - "Il residuo e' nominato invece di essere coperto da un arco jolly: un `section` fuori dai quattro valori e' leggibile da nessuno, ed e' fail-closed dichiarato con la sua riparazione"
  - "L'archivio delle foto va in un terzo bucket privato: non il pubblico (una foto d'archivio non e' pubblicata), non la quarantena (vita breve per disegno)"
  - "Opzione A di 45-RESEARCH §C4 presa deliberatamente: nessuna policy di scrittura, e l'assenza argomentata"

requirements-completed: []
requirements-contributed: [PROD-02]

# Metrics
duration: ~50min
completed: 2026-08-17
---

# Phase 45 Plan 04: Gli archi d'accesso e il bucket dell'archivio — Summary

**Dieci archi di lettura che aprono le cinque tabelle nuove a una chiave di sezione ciascuna, e un terzo bucket privato in cui l'archivio delle foto atterra senza che nessun client possa scriverci — due file, nessuno dei due applicato.**

## Performance

- **Duration:** ~50 min
- **Tasks:** 2 su 2
- **Files:** 2 creati, 0 modificati

## Cosa e' stato costruito

### Task 1 — `20260817120300_production_sections_access.sql` (commit `625f85f`)

Una transazione, dieci `DROP POLICY IF EXISTS` + dieci `CREATE POLICY`, tutti `FOR SELECT`, tutti `TO authenticated`, tutti col wrapper `(SELECT …)`.

| Tabella | Archi | Chiave/i |
|---|---|---|
| `public.production_space` | 1 — `production_space_select_location` | location |
| `public.production_space_attribute` | 1 — `production_space_attribute_select_location` | location |
| `public.production_section` | 2 — `_select_manifesto`, `_select_visual` | manifesto, visual |
| `public.production_open_question` | 5 — manifesto, visual, location, calendar, brandwide | tutte e quattro |
| `public.production_visual_asset` | 1 — `production_visual_asset_select_visual` | visual |

**`TO authenticated` scelto una volta per tutte e cinque**, con la ragione scritta: per `anon` il predicato puo' solo rispondere `false`, quindi la clausola e' gratis e restringe l'insieme di ruoli su cui il lettore successivo deve ragionare. `venues_select_staff` l'aveva gia' scelta per lo stesso motivo. Scelta una volta perche' una clausola presente su quattro archi e assente sul quinto si legge come una decisione **sul quinto**, e non lo sarebbe.

**Il paragrafo dell'uniformita' e' arrivato sulla tabella per cui era stato scritto.** `production_space_attribute` porta una chiave, un valore da vocabolario chiuso e una parola di provenienza: nessun indirizzo, nessun nome, nessuna data. Prende lo stesso arco degli altri quattro lo stesso, perche' *questa tabella e' innocua da sola* e' il modo in cui un percorso di lettura si apre per gradi — una tabella innocua alla volta, per mano di persone ognuna delle quali aveva ragione sul proprio passo.

**Le due assenze, scritte come decisioni.** Nessuna policy di scrittura (opzione A, presa deliberatamente, con l'opzione B nominata e il motivo per cui non e' stata presa), e la frase piu' affilata portata avanti: **il service client non e' un confine, e' l'assenza di un confine**. E nessun arco, vista o funzione verso `venues`, `event_parties` o `events` — dichiarato qui, **dimostrato dal piano 45-06**, e il file dice esplicitamente che un commento non e' una prova.

### Task 2 — `20260817120400_visual_archive_bucket.sql` (commit `4a78bd1`)

Una transazione: il bucket `visual-archive` con `public = false`, un solo arco di lettura, nessun altro.

**La decisione sulla destinazione sta nell'intestazione, in un blocco riquadrato, perche' e' li' che la legge chi applica.** La domanda era aperta per costruzione (`45-RESEARCH` §F4: *«the destination is a question the plan must answer, not assume»*), e le due alternative sono rifiutate con la **direzione** del loro errore:

- **Non il bucket pubblico** — perche' una foto d'archivio **non e' pubblicata**. L'archivio esiste proprio perche' il listing esce due giorni prima della serata e lo scatto di quella sera non puo' esistere: un file raggiungibile per URL nel momento in cui viene archiviato e' una pubblicazione che nessuno ha deciso, e in questo dominio viene letta come un annuncio.
- **Non la quarantena** — perche' la quarantena ha **vita breve per disegno**, e lo dice la sua stessa intestazione. Due cicli di vita in un bucket sono un ciclo di vita che nessuno puo' cambiare in sicurezza: il giorno in cui qualcuno stringe lo sweep della quarantena cancella l'archivio, e avra' ragione sullo sweep.
- **Il costo del terzo bucket e' detto, non sorvolato:** una cosa in piu' da mettere in sicurezza. Accettato perche' le due alternative falliscono nelle due direzioni che contano qui — una pubblica cio' che non era pubblicato, l'altra cancella cio' che andava tenuto — e nessuna delle due e' recuperabile con un commit successivo.

**Nessuna policy di scrittura per `authenticated`**, e l'assenza e' cio' che rende vero il percorso server-only: senza, la proprieta' poggerebbe sull'abitudine del codice di passare da `/api/media/finalize`, e un'abitudine non e' un confine. **La rimozione resta possibile** — dal service role, da una Server Action guardata dalla chiave visual — che e' cio' che `legal-compliance.md` (*gate immagini delle persone*) e `media-and-storage.md` (*gate moderazione = rimozione*) chiedono davvero.

**Nessuna policy anonima, e la riparazione dannosa e' nominata perche' sia riconosciuta**: *«i thumbnail non caricano — aggiungi una lettura pubblica sul bucket»*. Quella riparazione riporta il bucket a essere il bucket pubblico contro cui il file ha appena argomentato, solo con un nome piu' lungo. La strada giusta e' una **signed URL con scadenza** coniata lato server, ed e' scritta li' perche' la riparazione abbia dove andare.

**Tetto e lista MIME letti, non inventati.** `104857600` e' il valore che `event-media` e la quarantena gia' portano: una destinazione con un tetto **piu' piccolo** dell'area di transito rifiuterebbe un file che il transito ha accettato, e il rifiuto arriverebbe **dopo** lo strip, cioe' dopo che il caricamento e' gia' riuscito dal punto di vista di chi l'ha fatto. La lista dei tre tipi e' `STRIPPABLE_MIME_TYPES` verbatim: e' **piu' stretta** della lista di upload del prodotto di proposito, perche' i video non sono spogliabili e **nulla che non si possa spogliare puo' restare nell'archivio**.

## Verifica eseguita — e cosa NON dimostra

### Task 1

| Criterio | Comando | Atteso | Misurato |
|---|---|---|---|
| una transazione sola | `grep -c "^BEGIN;"` / `"^COMMIT;"` | 1 / 1 | **1 / 1** |
| gli archi | `grep -c "CREATE POLICY"` | 8 *(o il conteggio giustificato)* | **10** — vedi deviazione 1 |
| ogni arco wrappato | `grep -c "(SELECT private.has_capability("` | = archi | **13** — vedi deviazione 1 |
| ogni arco e' una lettura | `grep -c "FOR SELECT"` | = archi | **10** |
| nessun comando di scrittura | `grep -cE "FOR (INSERT\|UPDATE\|DELETE\|ALL)"` | 0 | **0** |
| chiavi distinte | `grep -oE "production\.[a-z]+\.manage" \| sort -u \| wc -l` | 3 | **4** — vedi deviazione 1 |
| l'arco sul null esiste | `grep -ci "IS NULL"` | ≥1 | **5** |
| la frase affilata | `grep -ci "is not a boundary"` | 1 | **1** |
| la strada pubblica e' nominata | `grep -c "venue_for_parties"` | ≥1 | **2** |
| idempotenza | `grep -c "DROP POLICY IF EXISTS"` | = archi | **10** |
| la postura delle tabelle | `grep -c "ENABLE ROW LEVEL SECURITY"` | 5 | **5** |
| nessun materiale | `grep -cE "[Vv]ia \|[Cc]orso \|[Pp]iazza "` | 0 | **0** |

### Task 2

| Criterio | Comando | Atteso | Misurato |
|---|---|---|---|
| una transazione sola | `grep -c "^BEGIN;"` / `"^COMMIT;"` | 1 / 1 | **1 / 1** |
| il bucket e' privato | colonna `public` a `false` (riga 173) | — | **`false,`** |
| il bucket e' nominato | `grep -ci "'visual-archive'"` | ≥2 | **3** |
| nessun percorso di scrittura client | `grep -cE "FOR INSERT\|FOR UPDATE\|FOR ALL"` | 0 | **0** |
| un solo arco di lettura | `grep -c "FOR SELECT"` | 1 | **1** |
| che chiede la chiave visual, wrappata | `grep -c "(SELECT private.has_capability('production.visual.manage'))"` | 1 | **1** |
| nessuna concessione anonima | `grep -c "TO anon"` | 0 | **0** |
| nessuna funzione, quindi nessun permesso | `grep -c "REVOKE\|GRANT"` | 0 (o REVOKE prima) | **0** |
| nessun materiale, nessun artista | `grep -cE "[Vv]ia \|[Cc]orso \|[Pp]iazza "` | 0 | **0** |

### Il typecheck

`npm run build` — **`✓ Compiled successfully in 2.4s`**.

### Cosa un verde NON significa, e va detto invece di lasciarlo intendere

**Nessuno dei due file e' stato applicato.** `npm run build` e' verde e **non dice nulla su di essi**: nessun build di questo repository legge un file `.sql`, e non esiste alcun test runner per il prodotto — quindi nessuna riga di questo SUMMARY va letta come «i test passano».

Nessun `grep` su un `.sql` dimostra che quell'SQL sia valido, e **nessuno dei due file dimostra che le policy rifiutino qualcuno**. Le policy esistono come testo. Che **rifiutino** si stabilisce con la rilettura di `pg_policies` e `storage.buckets` nel piano 45-08, e con `npm run verify:refusal` dopo, e con niente prima.

**E fino a che 45-08 non applica il primo dei due file, le cinque tabelle continuano a rifiutare tutti, master compreso.** E' l'ordine voluto: una superficie costruita sopra sembrera' rotta, non rifiutata.

## Decisions Made

1. **Cinque archi sul registro invece di tre, e la chiave del calendario entra in questo file.** Vedi deviazione 1: e' la decisione che porta il conteggio da 8 a 10.
2. **Il residuo non e' coperto da un arco jolly.** Un valore di `section` fuori dai quattro — una domanda archiviata contro una delle sezioni che D-45-01 rimanda — e' leggibile da **nessuno**, e si inserisce senza errore perche' non c'e' CHECK a rifiutarlo. E' fail-closed, che e' la direzione giusta, ed e' **scritto nel file** con la sua riparazione: o si archivia con `section` nullo, o si conia la chiave di quella sezione e si aggiunge il suo arco nella migration che la costruisce. Un arco jolly che ammettesse qualunque valore non riconosciuto a chiunque abbia una chiave di sezione e' stato considerato e rifiutato: legge troppo per costruzione, e — peggio — e' la forma che viene copiata sulla tabella successiva.
3. **`AS PERMISSIVE` scritto per esteso su ogni arco**, come fa `venues_select_staff`. E' il default di Postgres, quindi non cambia nulla: rende leggibile dal file che gli archi si **sommano**, che e' l'unica cosa che il lettore deve avere in testa per capire perche' due archi disgiunti sulla colonna sono corretti e un terzo arco non vincolato non lo sarebbe.
4. **Un `DROP POLICY IF EXISTS` per arco, non due.** `20260817120000` ne aveva dodici per sei bracci perche' **rinominava** sei policy esistenti; qui i dieci nomi non sono mai esistiti su nessun oggetto, perche' le cinque tabelle portano zero policy. Uno a testa e' quindi la lista **completa**, non quella corta — e il file lo dice, perche' l'asimmetria fra i due file non venga letta come un'incoerenza.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 — Missing critical] Cinque archi su `production_open_question` invece di tre, e una quarta chiave nel file**

- **Found during:** Task 1
- **Issue:** Il piano progetta tre archi sul registro — manifesto, visual, brand-wide sul null. Misurato contro la tabella **come e' stata effettivamente costruita**, tre archi lasciano un buco della stessa forma della trappola del null, e con lo stesso silenzio. `production_open_question.section` **non ha CHECK di vocabolario**, e l'assenza e' una decisione con la ragione scritta (`20260817120200_production_sections.sql:226-234`): *«il registro copre tutte e QUATTRO le sezioni, location e calendario comprese»*, e un CHECK che rispecchiasse `SECTION_KINDS` rifiuterebbe una domanda legittima su uno spazio o su una data. Conseguenza: una domanda etichettata `location` o `calendar` e' una **riga perfettamente legittima** che il disegno a tre archi ammette a **nessuno**. Si inserisce senza protestare e poi non si legge — su un registro la cui unica funzione e' **avvertire** (D-45-15: avverte, non blocca mai). E questo prodotto non ha error tracking, quindi una riga semplicemente invisibile e' una riga di cui nessuno viene a sapere: `meta-gates.md`, *controllo zero fallimenti silenziosi*.
- **Fix:** un arco per ognuna delle quattro sezioni che il registro dichiara di coprire, ognuno che chiede la chiave di quella sezione, piu' l'arco brand-wide sul null. Cinque archi sul registro; dieci `CREATE POLICY` in tutto.
- **Perche' non allarga nulla in pratica:** tutte e quattro le chiavi vanno a `master` e `organizer` e a nessun altro (`20260817120000_production_section_keys.sql:165-174`). Nessuna persona in produzione legge una riga in piu' di quante ne avrebbe lette; cambia **quali** righe un futuro collaboratore di una sola sezione potrebbe leggere, ed e' esattamente la distinzione per cui le quattro chiavi esistono.
- **Perche' la chiave del calendario entra qui, benche' il piano la assegni a `20260817120000`:** quell'assegnazione riguarda le **sei tabelle del calendario**, i cui archi appartengono al file che le ha rinominate. Questo non e' una tabella del calendario: e' un registro creato dal piano 45-01 che dichiara di coprire quattro sezioni, e la chiave che una domanda di calendario deve chiedere e' quella del calendario.
- **Tre criteri di accettazione si spostano, e il piano lo prevede** (*«o il conteggio che il disegno dell'esecutore produce, dichiarato e giustificato nel SUMMARY»*): `CREATE POLICY` 8 → **10**; chiamate wrappate 8 → **13** (l'arco brand-wide ne porta quattro in un corpo solo, una per chiave); chiavi distinte 3 → **4**. Gli altri criteri sono soddisfatti alla lettera. Nota: il criterio delle chiavi era gia' internamente contraddittorio nel piano — dice *«Four distinct keys appear»* e poi asserisce 3.
- **Files modified:** `supabase/migrations/20260817120300_production_sections_access.sql`
- **Committed in:** `625f85f`

**2. [Rule 1 — Bug in un criterio di accettazione] Due criteri scattavano su prosa corretta**

- **Found during:** Task 1 e Task 2
- **Issue:** Due criteri diventavano rossi su file corretti, per collisione con la prosa che li spiega. (a) `grep -cE "FOR (INSERT|UPDATE|DELETE|ALL)"` tornava **1** su una frase che diceva *«chosen ONCE FOR ALL FIVE TABLES»*. (b) `grep -c "REVOKE\|GRANT"` tornava **1** su un'intestazione che diceva *«NOTHING HERE GRANTS AN ANONYMOUS CALLER ANYTHING»*.
- **Fix:** entrambe le frasi riscritte, **e la ragione della riscrittura scritta accanto dentro il file** — perche' il prossimo che passa non la "semplifichi" tornando alla forma breve. E' lo stesso precedente della deviazione 2 del piano 45-01: *un criterio che scatta su lavoro giusto e' un criterio che verra' ignorato la terza volta*.
- **Verification:** entrambi ora **0**.
- **Committed in:** `625f85f` (a), `4a78bd1` (b)

---

**Total deviations:** 2 auto-fixed (1 missing critical, 1 bug in criteri di accettazione).
**Impact on plan:** Nessuno scope creep. Nessun file fuori dai due che il piano dichiara, nessuna tabella toccata, nessuna chiave coniata.

## Il conflitto di gate, e come e' stato risolto

`supabase-data.md`, *gate RLS contestuale*, dice di leggere le policy esistenti prima di aggiungerne una, perche' le permissive si sommano in OR. Su `production_section` e su `production_open_question` **si aggiungono piu' archi alla stessa tabella deliberatamente**, ed e' il caso in cui quell'OR e' la semantica voluta e non il rischio: gli archi sono **disgiunti sulla colonna `section`**, quindi la loro unione ammette ogni riga al detentore della chiave di quella riga e a nessun altro. La condizione che rende sicura la somma e' la disgiunzione, ed e' scritta nel file: **nessun arco e' non vincolato**, e il giorno in cui qualcuno ne aggiunge uno senza il vincolo sulla colonna, la tabella si apre per intero a una chiave sola.

Su `production_section` l'insieme degli archi e' **dimostrabilmente esaustivo** — il CHECK restringe la colonna a due valori, quindi due archi coprono ogni riga che possa esistere, e un terzo valore verrebbe rifiutato **con un errore**, che e' visibile. Sul registro no, e la differenza fra le due tabelle e' esattamente il motivo per cui sono trattate diversamente.

## Domande che questo lavoro solleva e non chiude

> Sollevate qui perche' `CLAUDE.md` disciplina 5 lo impone: le competenze generano domande, non solo risposte.

1. **La superficie che scrive una domanda nel registro dovrebbe offrire un elenco chiuso.** Quattro sezioni piu' «nessuna sezione». Cosi' lo stato illeggibile diventa **irraggiungibile dal prodotto**, invece che soltanto documentato. Riguarda i piani che costruiscono la superficie del registro.
2. **L'archivio contiene fotografie di persone riconoscibili.** `legal-compliance.md`, *gate immagini delle persone*, chiede base giuridica dichiarata, informativa visibile e una via di revoca praticabile. Il bucket privato serve **l'ultima** delle tre (la rimozione dal server e' possibile in qualunque momento) e non risponde alle prime due. E' una domanda per il registro, non un difetto di questi file — ed e' scritta anche dentro la migration.
3. **La chiave di un oggetto viaggia in una signed URL, in un log e in un messaggio d'errore, e sopravvive alla riga.** Non deve portare nome d'artista, parola di venue ne' data non comunicata. Il file lo dice **come prosa e dichiarando che la prosa non e' enforcement**: chi lo rende vero e' il percorso di upload dei piani 45-13 e 45-15.
4. **Se `allowed_mime_types` valga anche per una scrittura del service role non e' stato verificato alla fonte, e il file non lo pretende.** L'enforcement che conta resta lo stripper, che restituisce byte di uno dei tre tipi o restituisce un rifiuto. La rilettura di `storage.buckets` nel 45-08 conferma che il valore **esista**; non conferma contro chi sia applicato.

## Known Stubs

Nessuno. I due file sono completi e autoconsistenti. Cio' che manca — la guardia dentro le Server Action, la superficie, la conferma applicata — appartiene per costruzione ai piani 45-08, 45-13 e 45-15, ed e' nominato nei file dove serve.

## Threat Flags

Nessuna superficie di sicurezza nuova oltre a quelle gia' nel `<threat_model>` del piano. Le mitigazioni assegnate a questo piano, e come sono state applicate:

| Threat | Disposizione | Come e' stata applicata qui |
|---|---|---|
| T-45-04 | mitigate | Dieci archi, uno per tabella salvo le due che ne richiedono piu' d'uno, ognuno che chiede la chiave della propria sezione, ognuno wrappato. La lettura da `pg_policies` e' il piano 45-08. |
| T-45-10 | mitigate | Il paragrafo dell'uniformita' su `production_space_attribute`, e lo stesso arco dei vicini: *innocua da sola* e' rifiutato per iscritto. |
| T-45-01 | mitigate | Nessuna policy, vista o funzione di questo file nomina `venues`, `event_parties` o `events`; nessuna vista e nessuna funzione sono create. L'assenza e' **dichiarata**, e il file dice che un commento non e' una prova: la dimostrazione e' la closure walk del piano 45-06. |
| T-45-11 | mitigate | Bucket privato, nessuna policy di scrittura per un client, nessuna policy anonima, lettura dietro la chiave visual, byte spogliati sul percorso esistente prima di arrivare. |
| T-45-06 | mitigate | Nessuna funzione dichiarata da nessuno dei due file — quindi nulla da revocare e nulla da concedere, e la regola dei due statement in ordine e' scritta comunque per chi ne aggiungera' una. |
| T-45-13 | mitigate | L'arco brand-wide e' scritto **esplicitamente** con `IS NULL`, e il file spiega perche': `section = 'manifesto'` su colonna nulla e' `NULL` — non `false`, non `true` — e una policy che ci si appoggiasse nasconderebbe le voci piu' generali del registro senza errore da nessuna parte. |
| T-45-SC | accept | Nessun pacchetto installato. |

## Issues Encountered

- **Il worktree non ha `node_modules`.** `npm run build` e' il gate del typecheck di questo repo e non poteva girare. Risolto con un symlink a `node_modules` del repo principale; `node_modules` e' in `.gitignore`, e `git status --short` era pulito prima di ogni commit (verificato). **Nessun pacchetto e' stato installato**: questa fase non ne installa (`45-RESEARCH.md`, §Package Legitimacy Audit).
- **Nessun test runner per il prodotto.** La verifica e' `npm run build` piu' i grep sopra, e nessuno dei due tocca il database.

## Self-Check: PASSED

- `supabase/migrations/20260817120300_production_sections_access.sql` — FOUND
- `supabase/migrations/20260817120400_visual_archive_bucket.sql` — FOUND
- commit `625f85f` — FOUND in `git log`
- commit `4a78bd1` — FOUND in `git log`
- Nessuna cancellazione di file tracciati in nessuno dei due commit (`git diff --diff-filter=D HEAD~1 HEAD` vuoto su entrambi)
- Nessuna modifica a `STATE.md`, `ROADMAP.md` o a qualunque altro artefatto condiviso dell'orchestratore

## Next Phase Readiness

- **Il piano 45-06** deve *dimostrare* la chiusura verso `venue_for_parties`: qui e' scritta come dichiarazione, e il file stesso dice di non pretendere di averla provata.
- **Il piano 45-08** e' l'unico posto in cui questi due file diventano fatti. Alla rilettura serve controllare tre cose che i grep non toccano: che il `qual` di ognuno dei dieci archi cominci ancora con un select (InitPlan sopravvissuto); che `storage.buckets` porti davvero `public = false`, il tetto e i tre tipi (una riga preesistente li avrebbe tenuti suoi, per via del `DO NOTHING`); e che nessuna delle undici policy sia comparsa con un comando diverso dalla lettura.
- **I piani 45-13 e 45-15** ereditano due obblighi nominati nei file: la guardia dentro la Server Action e' cio' che decide chi scrive, e la chiave dell'oggetto non deve portare materiale.
- **Il piano che costruisce la superficie del registro** eredita la domanda 1 qui sopra: un elenco chiuso di sezioni rende irraggiungibile lo stato che oggi e' solo documentato.

---
*Phase: 45-production-sections-section-by-section*
*Completed: 2026-08-17*
