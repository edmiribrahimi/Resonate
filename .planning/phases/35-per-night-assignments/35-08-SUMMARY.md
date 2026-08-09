---
phase: 35-per-night-assignments
plan: 08
subsystem: access-gating
tags: [server-actions, nextjs, supabase, postgrest, rbac, capabilities]

requires:
  - phase: 35-02
    provides: "public.party_assignments, i cinque vincoli nominati, e la conseguenza 3c sulle demozioni"
  - phase: 35-03
    provides: "le tre chiavi assegnabili coniate — door.supervise, media.upload, party.manage"
  - phase: 35-04
    provides: "public.record_party_assignment_act — il writer atomico, EXECUTE al solo service_role"
provides:
  - "La superficie /organizer/events/[id]/assignments: chi lavora la notte, assegnare, revocare"
  - "assignToParty / revokeAssignment — risultati discriminati, dieci esiti distinguibili, attribuzione dalla sessione"
  - "Il percorso d'uscita dalla demozione bloccata: il rifiuto nomina le serate, e revokeAssignmentsAndDemote le chiude in un'azione sola"
  - "D-C scritto nel codice: la delega resta chiusa per costruzione, e la domanda resta aperta"
affects: [35-09, 35-14, 35-18, 35-21, 34-staff-surfaces]

tech-stack:
  added: []
  patterns:
    - "Risultato discriminato deciso per posizione, mai una categoria dentro un messaggio (S3)"
    - "Classificazione centrale + arricchimento per percorso, quando l'arricchimento richiede una seconda lettura"
    - "Il nome del vincolo disambigua DENTRO la famiglia che il codice ha gia' deciso"

key-files:
  created:
    - "src/app/(organizer)/organizer/events/[id]/assignments/actions.ts"
    - "src/app/(organizer)/organizer/events/[id]/assignments/page.tsx"
    - "src/app/(organizer)/organizer/events/[id]/assignments/AssignmentsClient.tsx"
  modified:
    - "src/app/(admin)/admin/members/actions.ts"
    - "src/app/(admin)/admin/members/MemberActionNotice.tsx"

key-decisions:
  - "La guardia chiede staff.manage e mai l'assegnazione: la delega e' irraggiungibile, non rifiutata da un controllo removibile (D-C)"
  - "partyId e' input non fidato e la proprieta' dell'evento non lo copre: aggiunto party_not_in_event prima di ogni scrittura"
  - "Il rifiuto 23503 si classifica in un posto solo, e si arricchisce in tre: la categoria non puo' divergere, la frase ha bisogno di una seconda lettura"
  - "Il ramo 23503 legge il NOME del vincolo: il codice sceglie la famiglia, il nome sceglie quale chiave. Senza il nome si ripiega su write_failed"
  - "revokeAssignmentsAndDemote delega la scrittura del ruolo a updateMemberRole: paga due risoluzioni del contesto per non copiare quattro controlli"
  - "Interfaccia in inglese: il piano e la milestone lo impongono, e tutto il prodotto lo e' gia'"

patterns-established:
  - "Stato d'errore per l'intero caricamento, deciso per posizione su tutte le letture insieme: una risposta parziale si legge come completa"
  - "Un detail che porta un dato invece di un letterale chiuso e' ammesso solo dove nessuno ci ramifica sopra, e va dichiarato"

requirements-completed: [ASSIGN-01, ASSIGN-03, ASSIGN-04]

duration: 52min
completed: 2026-08-09
---

# Phase 35 Plan 08: La superficie delle assegnazioni Summary

**Assegnare e revocare una notte da `/organizer/events/[id]/assignments`, con dieci esiti che una persona legge invece di uno che non dice niente — e la demozione bloccata dalla foreign key composta smette di essere un vicolo cieco: nomina le serate che la bloccano e offre una sola azione che le revoca e poi cambia il ruolo, registrate come i due atti che sono.**

## Performance

- **Duration:** ~52 min
- **Started:** 2026-08-09T00:00:00Z (approssimato: orologio del worktree)
- **Completed:** 2026-08-09
- **Tasks:** 3
- **Files modified:** 5 (3 creati, 2 modificati)

## Accomplishments

- **La superficie esiste.** Per ogni serata dell'evento: chi lavora, con quale mestiere, e i due controlli. L'elenco degli assegnabili filtra `role in ('master','organizer','staff')` — offrire un `member` produrrebbe un rifiuto che l'interfaccia poteva evitare.
- **Una lettura fallita non sembra una notte senza staff.** Le tre letture della pagina hanno **un solo verdetto**, deciso per posizione: se una qualsiasi fallisce, la pagina rende un blocco che dice *«non e' un roster vuoto»* e nomina il codice. Una risposta parziale, qui, si legge esattamente come una completa.
- **Il debito della 3c e' pagato.** `20260809000000_party_assignments.sql` sezione 3c dichiarava che una demozione bloccata deve **nominare le assegnazioni che bloccano** e nominava questo piano; il 35-02 lo ha registrato come rimandato. Ora il `detail` del rifiuto porta l'elenco delle serate, ed e' reso sullo schermo dei membri.
- **L'uscita e' una sola azione.** `revokeAssignmentsAndDemote(memberId, nextRole)` revoca ogni assegnazione viva e poi delega la scrittura del ruolo al percorso esistente. Due atti distinti nel registro. Si ferma alla prima revoca fallita.
- **D-C non si e' chiusa per omissione.** Il docblock dell'action scrive che la guardia chiede `staff.manage` — per-account — e mai l'assegnazione, quindi chi e' *organizer per una notte* non puo' assegnare nessun altro. Aprire la delega richiedera' di cambiare quella riga, e cambiarla sara' visibile.

## Task Commits

1. **Task 1: `assignments/actions.ts` — le due azioni** — `ec2776a` (feat)
2. **Task 2: la pagina e il componente client** — `3d581e6` (feat)
3. **Task 3: il percorso d'uscita dalla demozione bloccata** — `09b7a54` (feat)

## Files Created/Modified

- `src/app/(organizer)/organizer/events/[id]/assignments/actions.ts` — `assignToParty` / `revokeAssignment`. Una risoluzione del contesto per action, autore dalla sessione, una chiamata a `record_party_assignment_act`, ramificazione sui codici `23514` / `23503` / `23505` / `P0002` con un ramo di default.
- `src/app/(organizer)/organizer/events/[id]/assignments/page.tsx` — server component: `ORGANIZER_ACCESS`, `ownsOrIsMaster`, tre letture con il service client, stato d'errore distinto dal vuoto, log `[assignments.lookup_failed]`.
- `src/app/(organizer)/organizer/events/[id]/assignments/AssignmentsClient.tsx` — il roster per serata, i due controlli, e un `Record` **totale** di frasi sull'unione dei rifiuti: un esito nuovo e' un errore di build, mai un messaggio generico.
- `src/app/(admin)/admin/members/actions.ts` — due esiti nuovi, il classificatore del `23503`, l'arricchimento con le serate su tutti e tre i percorsi che scrivono il ruolo, e `revokeAssignmentsAndDemote`.
- `src/app/(admin)/admin/members/MemberActionNotice.tsx` — le due frasi per i due esiti nuovi. **Fuori dal `files_modified` del piano**: vedi Deviazioni, punto 1.

## Decisions Made

**1. Il `23503` si classifica in un posto e si arricchisce in tre.**
Il piano chiedeva di ramificare in ognuno dei tre percorsi. La classificazione e' invece **centrale** (`classifyWriteFailure`, un ramo), perche' tre copie della stessa condizione sono tre posti dove il prossimo controllo verra' aggiunto solo a quello che qualcuno stava guardando — e questo file porta gia' scritta quella lezione (CR-01). Cio' che resta **per percorso** e' l'arricchimento, che richiede il `subjectId` e una seconda lettura e quindi non puo' stare in un classificatore sincrono. I tre percorsi portano ognuno il proprio paragrafo che nomina il codice e il vincolo: un lettore di `deactivateMember` deve sapere che quel percorso puo' essere rifiutato cosi'.

**2. Il ramo legge il NOME del vincolo, e non e' la regola che questo file vieta.**
La regola e' *«mai scegliere una categoria da una frase»*. Non e' violata: il **codice** decide la famiglia (`23503` = una foreign key ha rifiutato), il **nome** decide quale — e `23503` puo' arrivare da altre chiavi. Il nome e' un identificatore che questo repository ha scelto e dichiarato, non una prosa che un framework puo' riscrivere. Il verso dell'errore e' quello sicuro: senza il nome si ripiega su `write_failed`, che promette meno. Non afferma mai una causa che non ha potuto confermare — un rifiuto che nominasse la ragione sbagliata manderebbe qualcuno a revocare assegnazioni che non c'entrano.

**3. `revokeAssignmentsAndDemote` paga due risoluzioni del contesto, dichiarate.**
`guarded` risolve una volta, `updateMemberRole` risolve di nuovo, e `cache()` non memoizza dentro una Server Action. S4 chiede una risoluzione per action e qui ne paga due. L'alternativa — inlinare la scrittura del ruolo — significherebbe ri-derivare `promoted`/`demoted`, il rifiuto della riammissione, il caso `role_unchanged` e il soffitto del master: esattamente le quattro cose che il punto 3 del task vieta di copiare. Un round trip in piu' su un percorso amministrativo raro e' il costo minore, ed e' l'unico che non puo' divergere in silenzio.

**4. Zero assegnazioni vive non e' una scorciatoia.**
Se il soggetto non ne tiene nessuna, l'azione **delega comunque** a `updateMemberRole`. L'operatore ha chiesto un cambio di ruolo e la risposta onesta e' quella del percorso esistente, incluso qualunque altro rifiuto.

**5. L'interfaccia resta in inglese.**
Il prompt d'esecuzione chiedeva copy utente in italiano; il piano (criterio d'accettazione: *«Nessun testo dell'interfaccia e' in italiano»*) e la decisione di milestone chiedono inglese, e tutto il prodotto — `MemberActionNotice`, guest list, scanner — lo e' gia'. `meta-gates.md` dice che su requisiti contraddittori vince il piu' restrittivo e il conflitto va documentato: e' questo paragrafo. Prosa di pianificazione e messaggi di commit in italiano, copy di prodotto in inglese.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `MemberActionNotice.tsx` fuori da `files_modified`**
- **Found during:** Task 3
- **Issue:** `MemberNoticeKind = MemberActFailure | "transport_unavailable"` e `NOTICES` e' un `Record` **totale** su quel tipo. Aggiungere due esiti a `MemberActFailure` ha fatto fallire `npm run build` con *«missing the following properties: live_assignments_block_demotion, revocation_incomplete»*. Non e' un attrito: e' il tipo che fa il suo lavoro — un esito senza frase disegnerebbe **niente**, che e' il fallimento che si legge come successo.
- **Fix:** Due voci in `NOTICES`, una per esito, con la loro tonalita' e il loro passo successivo. Nessun'altra riga toccata.
- **Files modified:** `src/app/(admin)/admin/members/MemberActionNotice.tsx`
- **Verification:** `npm run build` verde. Nessun piano parallelo (35-06, 35-07) tocca quel file: nessun conflitto di merge possibile.
- **Committed in:** `09b7a54`

**2. [Rule 2 - Missing Critical] `party_not_in_event`: `partyId` non era scopato all'evento**
- **Found during:** Task 1
- **Issue:** `assertEventOwnership` prova che il chiamante puo' gestire `eventId`. Non prova **niente** su `partyId`, che arriva sullo stesso POST non fidato. Un organizer poteva passare il proprio evento e la serata di un altro, e il **service client** — che bypassa ogni policy — l'avrebbe scritta. E' la trappola che `access-gating.md`, gate *service role*, nomina per prima.
- **Fix:** `validateTarget` legge `event_parties.event_id` e rifiuta se non coincide, prima di ogni scrittura, in entrambe le action. Una serata inesistente e una di un altro evento ricevono **la stessa** risposta: distinguerle trasformerebbe l'action in un oracolo di enumerazione, e in questo repository non esiste rate limiting.
- **Files modified:** `src/app/(organizer)/organizer/events/[id]/assignments/actions.ts`
- **Verification:** `npm run build` verde; il ramo e' raggiunto prima della RPC in entrambe le action, letto riga per riga.
- **Committed in:** `ec2776a`

**3. [Rule 2 - Missing Critical] `no_live_assignment`: una revoca a vuoto non e' un successo**
- **Found during:** Task 1
- **Issue:** Il writer solleva `P0002` quando non trova niente da revocare, e la migration scrive perche': e' l'informazione che due persone guardano due stati diversi. Il piano elencava quattro rami; senza questo, quel caso cadeva nel default `write_failed` e diceva la cosa sbagliata.
- **Fix:** Quinto ramo, con la sua frase — *«qualcun altro puo' averla revocata un momento fa»*.
- **Files modified:** `src/app/(organizer)/organizer/events/[id]/assignments/actions.ts`
- **Committed in:** `ec2776a`

**4. [Rule 2 - Missing Critical] `revocation_incomplete` come causa propria**
- **Found during:** Task 3
- **Issue:** Il piano chiedeva di fermarsi alla prima revoca fallita e «restituire l'esito». Restituirlo come `write_failed` avrebbe fatto disegnare la frase *«nothing was written to the account and nothing was recorded»*, che li' e' **falsa**: alcune revoche sono avvenute e sono registrate. Un messaggio che mente sullo stato del mondo e' peggio di uno generico.
- **Fix:** Un esito distinto, con la sua frase e il conteggio di quante revoche sono passate.
- **Files modified:** `src/app/(admin)/admin/members/actions.ts`, `MemberActionNotice.tsx`
- **Committed in:** `09b7a54`

**5. [Rule 1 - Bug] Non e' solo la demozione a essere bloccata**
- **Found during:** Task 3
- **Issue:** Il piano (e il nome della funzione) parlano di demozione. La FK composta lega `(user_id, assignee_role)` alla riga viva di `profiles`, quindi **qualunque** movimento del ruolo rompe la coppia: **promuovere** uno `staff` assegnato a `organizer` fallisce con lo stesso `23503`. Trattarlo come un caso di sola demozione avrebbe lasciato la meta' dei rifiuti senza spiegazione.
- **Fix:** Il ramo in `updateMemberRole` copre ogni cambio di ruolo; la frase dell'interfaccia dice *«for a demotion and for a promotion alike»*. Il nome della funzione resta quello che piano e migration hanno concordato, cosi' i due documenti puntano ancora qui; `nextRole` dice cosa fa davvero.
- **Files modified:** `src/app/(admin)/admin/members/actions.ts`, `MemberActionNotice.tsx`
- **Committed in:** `09b7a54`

### Criteri d'accettazione con esito diverso dal letterale

Nessuno dei due e' stato aggirato modificando un controllo: sono dichiarati qui perche' il verificatore li incontrera'.

**a. `revokeAssignmentsAndDemote` contiene ZERO chiamate a `assertStaffManage(`, non una.**
Quel file non usa `assertStaffManage`: la sua guardia e' `verifyAdminOrOrganizer` (`getAccessContext()` + `CAP.STAFF_MANAGE`), la stessa dei nove atti che gia' ci vivono, invocata **una volta** da `guarded`. L'intento del criterio — S4, una sola risoluzione per action — e' soddisfatto. Importare `assertStaffManage` qui avrebbe introdotto una **seconda forma di gate** in un file che ne ha gia' una: esattamente la divergenza che il punto 3 dello stesso task vieta (*«riusa quello esistente, invece di scriverne uno nuovo»*). I due criteri erano in tensione e ha vinto il piu' restrittivo.

**b. `! grep -q "error.details"` su `admin/members/actions.ts` era gia' rosso prima di questo piano.**
Due occorrenze, entrambe in **commento**, entrambe presenti al commit base `34a9211` (verificato con `git show`): sono il paragrafo della fase 43 che spiega perche' quel campo non si legge mai. Le mie modifiche ne aggiungono **zero**. Riscrivere quella documentazione per far passare un grep sarebbe modificare il controllo per fargli approvare cio' che esiste, e cancellerebbe la spiegazione. Sui tre file nuovi il conteggio e' **0**, e li' il letterale e' descritto invece che scritto — la stessa disciplina che le migration di questa fase applicano ai fusi orari e alla clausola di cascata.

---

**Total deviations:** 5 auto-fixed (3 missing critical, 1 bug, 1 blocking) + 2 criteri dichiarati
**Impact on plan:** Nessuno scope creep. Tre delle cinque chiudono buchi di correttezza o di sicurezza sul percorso che il piano stesso definisce urgente; una e' un blocco di build causato dalla modifica stessa; una e' una scoperta sul comportamento reale del vincolo.

## Issues Encountered

- **Il `Record` totale ha fermato il build, come doveva.** Non e' stato un ostacolo ma la conferma che l'unico contratto che il compilatore tiene su questa superficie funziona: nove mesi dopo, un esito senza frase sara' ancora un errore di compilazione.
- **`party_assignments.user_id` non ha una FK semplice verso `profiles`** (solo quella composta), quindi l'embedding PostgREST non e' affidabile: la pagina fa due letture e le unisce in JS invece di rischiare una `select` con relazione implicita.
- **`granted_at` non viene reso.** E' un `timestamptz` e renderlo con i getter locali darebbe un orario diverso sul server e nel browser (`time-and-scheduling.md`, gate *reso dove, con che ora*). La data della serata invece e' un `date` puro e passa da `formatEventDate`, che e' zone-free su una stringa di sola data. Quando l'atto e' avvenuto sta nel registro, che e' il posto costruito per tenerlo.

## Known Stubs

Nessuno.

Due dipendenze in avanti, dichiarate e non scoperte a valle:

1. **Le migration di questa fase non sono applicate.** `20260809000000`–`003000` e `004600` sono righe 7+ della coda a mano in `35-HUMAN-UAT.md`. `npm run build` e' verde **senza** di esse, perche' i tipi vengono da `src/types/database.ts` e nessun client Supabase e' parametrizzato: **quel verde non e' una prova che queste superfici funzionino**. Il nome della RPC, i cinque nomi dei parametri, i nomi delle colonne e la mappatura SQLSTATE→`error.code` su cui questo codice ramifica sono stringhe che nessun compilatore controlla. La prova e' manuale e appartiene al 35-14.
2. **`revokeAssignmentsAndDemote` non ha ancora un pulsante.** E' esportata e raggiungibile, e la frase del rifiuto la nomina a parole; il controllo che la invoca su `MemberTable.tsx` non e' in questo piano e non e' stato aggiunto — quel file e' fuori dal perimetro e toccarlo per un'affordance non e' un blocco di build. **Finche' non esiste, l'uscita richiede una mano tecnica**, e va detto invece di lasciar credere il contrario. La strada senza codice resta comunque aperta e la frase la descrive: revocare dalla pagina delle assegnazioni, poi cambiare il ruolo.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: authorization | `src/app/(organizer)/organizer/events/[id]/assignments/actions.ts` | Due nuovi endpoint POST pubblici (Server Action) che scrivono con il **service client** e concedono poteri per-notte. Mitigati come da threat model del piano: `staff.manage` + proprieta' dell'evento + `party_not_in_event` + uguaglianza sull'insieme assegnabile + i vincoli di riga. Nessun rate limiting esiste in questo repository (`access-gating.md`), quindi entrambe sono interrogabili senza costo da una sessione autenticata che tiene `staff.manage`; cio' che restituiscono a un chiamante non autorizzato e' un rifiuto, e le due risposte «serata inesistente» e «serata di un altro evento» sono deliberatamente indistinguibili. |

## User Setup Required

Nessuna configurazione di servizio esterno. **Ma la coda delle migration va applicata prima che queste superfici funzionino** — righe 7+ di `35-HUMAN-UAT.md`, migration prima e codice dopo, mai il contrario.

## Next Phase Readiness

- La superficie e' pronta per la prova manuale del 35-14: assegnare e revocare da un account organizer, e verificare i **due atti** nel registro con autore e timestamp.
- `revokeAssignmentsAndDemote` e' pronta per il controllo che la invochera'.
- La domanda aperta su cui questo piano **non** ha deciso, e che resta apposta aperta: se e da chi un'assegnazione possa essere delegata oltre (`ACCESS-MODEL-DECISIONS.md`, *What this does NOT settle*). Il docblock dell'action e' cio' che le impedisce di chiudersi da sola.

## Self-Check: PASSED

- `src/app/(organizer)/organizer/events/[id]/assignments/actions.ts` — FOUND
- `src/app/(organizer)/organizer/events/[id]/assignments/page.tsx` — FOUND
- `src/app/(organizer)/organizer/events/[id]/assignments/AssignmentsClient.tsx` — FOUND
- `src/app/(admin)/admin/members/actions.ts` — FOUND (modificato)
- `src/app/(admin)/admin/members/MemberActionNotice.tsx` — FOUND (modificato)
- `.planning/phases/35-per-night-assignments/35-08-SUMMARY.md` — FOUND
- commit `ec2776a`, `3d581e6`, `09b7a54` — tutti presenti in `git log`
- `npm run build` verde; `npm run verify:no-header-identity` verde (A e B)
- `git diff --diff-filter=D 34a9211..HEAD` — nessuna cancellazione
- STATE.md, ROADMAP.md, `deferred-items.md` e `src/lib/capabilities/guards.ts` — **non toccati**

---
*Phase: 35-per-night-assignments*
*Completed: 2026-08-09*
