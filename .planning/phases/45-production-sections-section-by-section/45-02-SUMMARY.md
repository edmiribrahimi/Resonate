---
phase: 45-production-sections-section-by-section
plan: 02
subsystem: verification-instruments
status: complete
tags: [rls, capability-model, refusal-evidence, read-only, auth-session, verify-gates]
requires:
  - "@supabase/supabase-js ^2.97.0 (gia' dipendenza)"
  - "scripts/lib/comments.mjs — lo stripper unico, provato per mutazione"
  - "supabase/migrations/20260815120100_production_calendar_access.sql — le sei policy SELECT"
provides:
  - "scripts/verify-refusal.mjs — il primo strumento del repo che si autentica come un ruolo"
  - "scripts/verify-all.mjs § NEEDS_AUTHORISATION — una quarta lista, dichiarata e mai lanciata"
  - "package.json § verify:refusal"
affects:
  - "npm run verify — 20 voci dichiarate, 20 rendicontate, 17 eseguite"
tech-stack:
  added: []
  patterns:
    - "coppia di misure per tabella invece di un valore singolo"
    - "self-check della propria sorgente prima di agire (forma di verify-conversion.mjs)"
    - "revoca globale + rilettura del token (forma di docs/36-13-v3/revoke.mjs)"
    - "quarta lista dichiarata e mai spawnata (contratto di verify-all.mjs)"
key-files:
  created:
    - scripts/verify-refusal.mjs
    - .planning/phases/45-production-sections-section-by-section/deferred-items.md
  modified:
    - scripts/verify-all.mjs
    - package.json
decisions:
  - "L'assertion e' una coppia per tabella: un controllo positivo silenzioso RIFIUTA (exit 2), non passa mai"
  - "SECTION_TARGETS parte con le sei tabelle del calendario e cresce di RIGHE, non di script"
  - "NEEDS_AUTHORISATION e' una quarta lista, non una quarta voce: un permesso non e' una precondizione"
  - "Il client del piano anonimo non scambia mai un token — verifyOtp assegna la sessione al client che lo chiama"
  - "Autorizzazione a coniare due sessioni: chiesta, concessa e SPESA il 2026-08-17 — ora esaurita"
metrics:
  tasks_completed: 3
  tasks_total: 3
  completed: 2026-08-17
  authorised_runs_spent: 1
  run_exit_code: 2
---

# Fase 45 Piano 02: lo strumento che entra come un ruolo vero — Summary

Il primo strumento di questo repository che si autentica come un ruolo reale, con
l'asserzione costruita come una **coppia** perche' su una tabella vuota la
risposta di chi ha la chiave e quella di chi non ce l'ha sono identiche.

**La coppia ha tenuto sull'unica tabella che oggi porta righe**, e le altre cinque
hanno rifiutato invece di riportare un verde su un confronto che non poteva
discriminare. Exit `2`, che e' l'esito corretto.

---

## Cosa e' stato costruito

### Task 1 — `scripts/verify-refusal.mjs` (commit `4db99e9`)

Uno script Node sotto `scripts/`, invocabile per nome e **mai** da `npm run
verify`.

**Il meccanismo, senza che una password esista da nessuna parte.**
`admin.auth.admin.generateLink({type:'magiclink'})` con il service client produce
un hashed token; `verifyOtp({token_hash, type:'email'})` con un client anonimo lo
scambia per una sessione vera. E' il meccanismo gia' provato e gia' autorizzato
una volta in fase 36 (`docs/36-13-v3/mint-session.mjs`, gitignored, letto come
implementazione di riferimento e **non copiato** in un file tracciato), ridotto a
cio' che serve a una lettura PostgREST: la codifica del cookie del browser non e'
riprodotta, perche' questo strumento non guida alcun browser.

**L'asserzione e' una coppia, e la ragione e' misurata.** `anon` e
`authenticated` tengono `arwdDxtm` a livello di tabella su ogni `production_*`,
quindi una lettura non autorizzata **non e'** un `42501`: supera il controllo dei
privilegi, incontra la policy, non corrisponde a nulla, e torna **HTTP 200 con un
array vuoto**. Su una tabella con zero righe la risposta del master e quella del
member sono identiche byte per byte. Quindi:

- `master.count > 0 && member.count === 0` → la coppia tiene;
- `master.count === 0` → la riga **RIFIUTA** ed esce 2, con la frase *la misura
  non e' avvenuta*. Mai un pass;
- una tabella che ancora non esiste → **RIFIUTO** per quella riga, non un pass e
  non un fallimento.

Il piano anonimo e' misurato come terza colonna, con la chiave anon e nessuna
sessione.

**Il verdetto e' la prima riga del report.** Il blocco delle misure e' bufferizzato
e stampato *dopo* il verdetto, cosi' che una scrollback letta dall'alto non possa
sembrare verde quando non e' stato misurato nulla.

**Read-only, e lo dimostra su se stesso.** Prima di qualunque cosa lo script legge
la propria sorgente attraverso `scripts/lib/comments.mjs` e rifiuta se trova un
verbo di scrittura in una riga viva. I cinque verbi sono tenuti come parole nude e
la forma della chiamata e' **costruita a run time**, cosi' la sequenza letterale
non compare mai nella sorgente viva — un check che corrispondesse alla propria
lista di pattern rifiuterebbe su se stesso, e l'unica via d'uscita sarebbe
allargarlo.

**La revoca si rilegge.** `signOut(access_token, 'global')` per ogni sessione
coniata, poi `getUser(access_token)` con il client anonimo e la stampa di *token
still resolves to a user: true|false*. Se una sessione sopravvive al run, il run
FALLISCE: e' una sessione viva che nessuno ha aperto, sull'identita' di una
persona reale.

**Non stampa nulla che identifichi qualcuno.** L'indirizzo del member e' risolto a
run time da `public.profiles` con il service client e non e' mai stampato; se
esistono piu' member prende il primo per `created_at` e stampa soltanto *one
member profile resolved*. Parole di ruolo, nomi di tabella, conteggi ed esiti: e'
tutto.

**Sugli errori viaggiano `error.code` e `error.message`, mai l'oggetto intero e
mai `error.details`** (D-45-18). PostgREST mette la riga che ha fallito dentro
`details`, e quello che questo run potrebbe far uscire da li' e' esattamente il
materiale che le policy esistono per trattenere.

### Task 2 — la registrazione (commit `f8f7e3d`)

`NEEDS_AUTHORISATION`, quarta lista accanto a `OFFLINE`, `NEEDS_SERVER` e
`NEEDS_MATERIAL`, con una voce sola: `verify:refusal`. **Nulla la lancia.**

E' una quarta lista e non una quarta voce in una esistente per la ragione che il
file scrive gia' a proposito della terza: *la ragione stampata accanto al nome e'
tutto il valore del nominarlo*, e ne' *serve un dev server* ne' *serve materiale in
`docs/`* e' una frase vera su questo gate. Quello che e' vero e' che **conia una
sessione sull'identita' di una persona reale** — e un server si avvia, un file si
mette, mentre un'autorizzazione non e' una precondizione che uno script possa
soddisfare da solo.

La stringa di ragione dichiara cosa costa il run: firma come un ruolo vero, e'
read-only, revoca globalmente e verifica la revoca, e va invocato per nome dopo
che il proprietario ha autorizzato quella seduta.

---

## Verifica eseguita

| Controllo | Esito |
|---|---|
| `node scripts/verify-refusal.mjs --help` | **exit 0**, stampa i target dichiarati, le quattro discipline e i tre soggetti. Nessun contatto con l'auth API — il ramo `--help` gira **prima** della lettura dell'ambiente |
| `head -5 … \| grep -c "READ-ONLY"` | **1** |
| `grep -vE '^\s*(\*\|//)' … \| grep -cE '\.(insert\|update\|upsert\|delete)\('` | **0** |
| `grep -c "SECTION_TARGETS"` | **3** |
| `grep -c "positive control"` | **6** |
| `grep -c "signOut"` | **2**, con `getUser` alla riga successiva (`:524` → `:525`) |
| percorso `exitCode = 2` | presente, raggiunto quando il controllo positivo torna zero righe |
| `grep -c "NEEDS_AUTHORISATION" scripts/verify-all.mjs` | **10** |
| `grep -c "verify:refusal" package.json` | **1** |
| `npm run build` | **exit 0**, due volte (dopo Task 1 e dopo Task 2) |
| `npm run verify` | nomina `verify:refusal` con la sua ragione, **non lo esegue**, e il conteggio riconcilia **20 dichiarate / 20 rendicontate**. **Esce 2, non 0** — vedi la deviazione qui sotto |
| il run autorizzato | **exit 2**, come atteso. Coppia tenuta su `production_pipeline_rule` (`16 / 0 / 0`), cinque righe RIFIUTATE, entrambe le revoche verificate `false`. Transcript verbatim piu' sotto |

**Cosa un verde NON significa.** Un exit 0 da `--help` non misura nulla su una
policy: dichiara un contratto. E il `2` del run non e' un fallimento — e' la misura
che si rifiuta di mentire su cinque tabelle vuote, mentre sulla sesta dice qualcosa
che nessuno strumento di questo repository aveva mai potuto dire.

---

## Deviazioni dal piano

### `npm run verify` esce 2 e non 0 — condizione pre-esistente, non riparata

Il criterio di accettazione del Task 2 chiede `npm run verify` exits 0. Il comando
esce **2**, e nessuno dei tre rifiuti dipende da questo piano:

1. `verify:conversion` e `verify:touch-targets` rifiutano perche' la lista
   `CONVERTED` nomina quattro superfici che non sono su disco —
   `/admin/analytics`, `/admin/analytics/compare`, `/admin/analytics/members`,
   `/admin/finance` — rimosse dal prodotto quando Finance e Analytics sono
   passate a SumUp, senza che la lista si muovesse nello stesso commit.
2. `verify:capabilities` rifiuta perche' un worktree non ha `.env.local`, che e'
   gitignored e vive nel checkout principale.

Nessuna delle due e' causata dal diff di questo piano, e **nessuna e' stata
riparata**: la prima appartiene a chi ha rimosso quelle superfici, la seconda e'
una condizione d'ambiente e non un difetto dell'albero. Entrambe sono registrate
in
`.planning/phases/45-production-sections-section-by-section/deferred-items.md`.

La meta' sostanziale del criterio e' invece soddisfatta e verificata: il
transcript **nomina** `verify:refusal` con la sua ragione, **non lo esegue**, e non
contiene alcuna riga che riporti un esito della sonda di rifiuto.

### Un difetto trovato e corretto durante la costruzione (Rule 1)

**Il client del piano anonimo si sarebbe autenticato senza dirlo.**
`verifyOtp` assegna la sessione **al client che lo chiama**, anche con
`persistSession: false`, e supabase-js allega la sessione in memoria a ogni
richiesta successiva. La prima stesura scambiava i token sul client anonimo: la
colonna *anon* della tabella sarebbe stata una seconda copia della colonna
*member* con un altro nome, e su una tabella popolata avrebbe letto righe come se
fosse quell'utente. Corretto prima del commit: ogni scambio avviene su un client
usa-e-getta, e il client del piano anonimo esegue soltanto letture. La ragione e'
scritta accanto alla dichiarazione, perche' e' esattamente il tipo di
semplificazione che qualcuno rimuoverebbe.

---

## Task 3 — l'autorizzazione, e il run che l'ha spesa

### L'atto

Il Task 3 e' `checkpoint:human-action`, `gate="blocking"`, e chiede **il permesso
di coniare una sessione sull'identita' di una persona reale**. Questo progetto
concede permessi del genere **per atto, datati, e si esauriscono quando sono
spesi** (`ai-engineering.md`, *gate l'autorizzazione a scrivere in produzione e'
un atto*; il precedente registrato e' P6 della fase 38, dove l'executor si e'
fermato prima ancora dello snapshot).

| | |
|---|---|
| **Chiesta** | 2026-08-17, con i quattro punti misurati posti al proprietario prima della risposta |
| **Risposta del proprietario** | «Autorizzato, un run adesso» |
| **Data dell'atto** | 2026-08-17 |
| **Ambito concesso** | `scripts/verify-refusal.mjs`, questa seduta, **un solo run**. Due sessioni coniate via magic-link — indirizzo master e un indirizzo member. **Sola lettura**: conteggi con `head: true`, nessun verbo di scrittura. Global signout finale su entrambe come prova di revoca, con il proprietario avvisato che i due indirizzi vengono disconnessi ovunque e dovranno rientrare |
| **Non autorizzato** | riseminare, ripetere il run, fabbricare un soggetto di prova (D-45-23 lo vieta), qualunque scrittura |
| **Stato** | **SPESA. Un run eseguito, esito registrato qui. L'autorizzazione e' esaurita e non copre un secondo run.** |

**Nessuna riga e' stata toccata.** Ogni chiamata del run e' un conteggio
`head: true`, che non restituisce righe e non ne scrive. L'obbligo della rimozione
per chiave primaria non si applica perche' non e' stata creata alcuna riga: non
c'e' nessun ID da catturare e nessun contatore di controllo da chiedere a una
seconda fonte. Se lo strumento avesse scritto, non sarebbe partito — il self-check
sulla propria sorgente gira prima di tutto il resto.

### Come e' stato invocato, e perche' non e' stato `npm run verify:refusal` nudo

```
node --env-file=/Users/etiesse/Resonate/.env.local scripts/verify-refusal.mjs
```

Un worktree non ha `.env.local`: il file e' gitignored e vive nel checkout
principale. Lo strumento legge le credenziali da `${ROOT}/.env.local` **quando c'e'**
e altrimenti dall'ambiente — la stessa scelta, e la stessa ragione, di
`rls-baseline.mjs:190-204`: *rifiutare in un worktree sarebbe rifiutare per la
ragione sbagliata*. `--env-file` popola l'ambiente prima che lo script parta, e lo
script prende il ramo che gia' documentava. **E' lo stesso comando che
`package.json` registra, con l'ambiente fornito da un'altra porta** — non una
variante dello strumento.

### Il transcript, verbatim

```
verify-refusal — what the production policies do to a signed-in subject
               holding none of their keys.

  0 = the pair held  ·  1 = FAILED  ·  2 = REFUSED, and nothing was measured.
  A refusal is not a failure, and a 2 on an empty table is the honest outcome.

  ── the declared targets ───────────────────────────────────────────────

    section: calendar
      the fourth section (D-45-04). Six tables, one SELECT policy each, every qual asking the same key today
      · production_plan
      · production_piece
      · production_commitment
      · production_checklist_item
      · production_import_run
      · production_pipeline_rule

  ── the four disciplines ───────────────────────────────────────────────

    1. read-only by construction, checked against this file's own source before anything else runs
    2. the assertion is a PAIR per table; a silent positive control REFUSES (exit 2) and never passes
    3. every minted session is revoked globally, and the revocation is re-read rather than assumed
    4. no token, no email and no row is printed — roles, table names, counts and outcomes only

  ── the subjects ───────────────────────────────────────────────────────

    master      the positive control — holds the key
    member      the refusal — a real auth.uid(), a real profile, no grant
    anonymous   the floor — the anon key and no session at all

  ── minting ────────────────────────────────────────────────────────────

    master      session minted
    member      one member profile resolved
    member      session minted
    anonymous   no session — the anon key alone


  ══ VERDICT: REFUSED — 5 of 6 rows measured NOTHING. ══
     This is not a pass and it is not a defect to repair: on a table holding zero
     rows the entitled answer and the unentitled answer are identical, so the pair
     cannot discriminate and the honest report is that the measurement did not
     happen. Re-running it will not change that. Importing the calendar will.

  ── the pair, per table ────────────────────────────────────────────────

    table                         master  member   anon  outcome
    production_plan                    0       0      0  REFUSED — the positive control is silent, so the measurement did not happen
      section: calendar
    production_piece                   0       0      0  REFUSED — the positive control is silent, so the measurement did not happen
      section: calendar
    production_commitment              0       0      0  REFUSED — the positive control is silent, so the measurement did not happen
      section: calendar
    production_checklist_item          0       0      0  REFUSED — the positive control is silent, so the measurement did not happen
      section: calendar
    production_import_run              0       0      0  REFUSED — the positive control is silent, so the measurement did not happen
      section: calendar
    production_pipeline_rule          16       0      0  pair held — entitled reads, unentitled reads nothing
      section: calendar

  ── the count ──────────────────────────────────────────────────────────

    rows declared                    6
    rows where the pair held         1
    rows REFUSED — not measured      5

  ── revocation, re-read rather than assumed ────────────────────────────

    master     signed out globally · token still resolves to a user: false
    member     signed out globally · token still resolves to a user: false

  ── what this instrument CANNOT close ──────────────────────────────────

    Success criterion 1 — *a viewer holding one section is refused the others*.
    Under D-45-03 all three new section keys go to master AND organizer, and the
    calendar key goes to the same two roles. **No subject exists in production for
    whom that refusal happens**, and D-45-23 forbids fabricating one. This run
    therefore says nothing about criterion 1, and a reader must not let its exit
    code stand in for one.

    What CAN be proven, and it is a different sentence, is that **the policies ask
    different keys** — read from `pg_policies`, through the Management API, which is
    a catalogue read and not a session. Today that sentence is not yet true either:
    all six calendar policies ask ONE key, because the split of D-45-04 has not been
    applied. It becomes measurable after that migration, and this instrument is
    built before the split precisely so the split has a baseline to be compared
    against.
```

**Exit code: `2`, riportato com'e' caduto.** Era l'atteso, ed e' l'esito corretto.
Lo strumento non e' stato toccato per farlo tornare un altro numero, e il run non
e' stato ripetuto.

### Cosa dice questo transcript, riga per riga

- **`production_pipeline_rule` — la coppia ha tenuto.** Master `16`, member `0`,
  anonimo `0`. E' **la prima prova di rifiuto che questo progetto abbia mai
  avuto**: un soggetto firmato, con un `auth.uid()` vero e una riga di profilo
  vera, che chiede la stessa identica query di chi ha la chiave e riceve zero
  righe. Non un `42501` — un `200` con niente dentro, che e' precisamente la forma
  per cui la coppia esiste.
- **Le altre cinque — RIFIUTATE, non misurate.** Il controllo positivo e' muto
  perche' quelle tabelle portano zero righe: l'import del calendario non e' mai
  stato eseguito contro produzione. Su una tabella vuota la risposta di chi ha la
  chiave e quella di chi non ce l'ha sono identiche, quindi la coppia non puo'
  discriminare e l'unica cosa onesta e' dire che la misura non e' avvenuta. **Non
  e' un difetto da riparare, e ri-eseguirlo non lo cambia.**
- **Entrambe le revoche sono verificate, non assunte.** `token still resolves to a
  user: false` su tutte e due le sessioni. Nessun token e' sopravvissuto al run.
- **Nessun indirizzo, nessun token, nessuna riga compaiono nel transcript.** Il
  member e' *one member profile resolved*, e i valori sono conteggi. Questo
  documento e' tracciato e questo repository e' **pubblico**: era una condizione
  del progetto dello strumento, non una cortesia di chi lo ha eseguito.
- **Il conteggio `16` conferma dall'interno una misura fatta dall'esterno.** La
  ricerca aveva letto `production_pipeline_rule = 16` righe attraverso la
  Management API, con una connessione che **bypassa la RLS**. Questo run lo
  rilegge attraverso una sessione che la RLS la attraversa. Le due strade danno lo
  stesso numero, ed e' la prima volta che succede in questo repository.

---

## Cosa questo strumento NON puo' chiudere

**Il criterio di successo 1** — *un lettore che tiene una sezione e' rifiutato
sulle altre*. Sotto D-45-03 tutte e tre le nuove chiavi di sezione vanno a master
**e** organizer, e la chiave del calendario va agli stessi due ruoli: **non esiste
in produzione un soggetto per cui quel rifiuto accada**, e D-45-23 vieta di
fabbricarne uno. Il criterio si chiude con evidenza strutturale piu' una procedura
manuale scritta, mai con un exit code di questo strumento.

Quello che **si puo'** provare, ed e' una frase diversa che va scritta come tale,
e' che **le policy chiedono chiavi diverse** — letto da `pg_policies` attraverso la
Management API, che e' una lettura di catalogo e non una sessione. **Oggi nemmeno
quella frase e' ancora vera:** tutte e sei le policy del calendario chiedono
**una** chiave, perche' lo split di D-45-04 non e' stato applicato. Diventa
misurabile dopo quella migration — ed e' esattamente il motivo per cui questo
strumento e' costruito **prima** dello split: perche' lo split abbia una baseline
contro cui essere confrontato.

Fuori scope e **da non rivendicare**: se questo strumento ritiri qualcuno degli
88 `human_needed` aperti nelle fasi precedenti.

### Una frase del piano che ho trovato NON ancora vera

Il piano, nell'azione del Task 1, prescrive il paragrafo di chiusura in questi
termini — riportati qui **testualmente e non ammorbiditi**:

> *"What it can prove is that **the policies ask different keys** — read from
> `pg_policies` — which is a different sentence and must be written as such."*

**Oggi quella frase non e' vera, e il piano la da' per gia' disponibile.** Le sei
policy del calendario chiedono **una sola** chiave — `production.read` — perche' lo
split di D-45-04 non e' stato applicato. Non ci sono chiavi diverse da leggere in
`pg_policies`: c'e' una chiave, sei volte. Lo strumento quindi non prova nemmeno
la meta' macchina del criterio 1, e prima di questa nota il piano lasciava credere
che la provasse.

La frase diventa vera dopo la migration additiva di D-45-04, e questo strumento e'
costruito **prima** dello split esattamente perche' lo split abbia una baseline
contro cui essere confrontato — cosa che oggi ha: la coppia su
`production_pipeline_rule`, `16 / 0 / 0`, misurata il 2026-08-17. **Chi applichera'
lo split deve riottenere quella coppia, con la nuova chiave, sugli stessi due
ruoli. Se cambia, e' cambiata la portata dell'accesso e non il nome di una
chiave.**

La correzione e' scritta anche dentro lo strumento, nel paragrafo che stampa a
ogni run, cosi' che non viva solo in un documento di pianificazione.

---

## Bandiere di sicurezza

Nessuna superficie di rete, di autenticazione, di accesso a file o di schema e'
stata introdotta oltre quelle gia' nel `<threat_model>` del piano. Nulla in questo
piano rende piu' facile far scattare `venue_reveal_sent`: lo strumento non scrive,
non tocca `venues`, non tocca `parties`, e le sue letture sono conteggi con
`head: true` che non restituiscono righe.

---

## Cosa resta aperto per chi viene dopo

1. **Cinque righe su sei non sono ancora misurabili.** Lo diventano quando
   l'import del calendario gira contro produzione. Fino ad allora `verify:refusal`
   uscira' `2`, ed e' corretto che lo faccia.
2. **La baseline da confrontare dopo lo split di D-45-04** e' la coppia
   `production_pipeline_rule = 16 / 0 / 0`, del 2026-08-17. Chi applica lo split
   rilancia lo strumento **con una nuova autorizzazione** — questa e' esaurita — e
   la coppia deve tornare identica.
3. **`SECTION_TARGETS` cresce di righe, non di script.** Le tabelle delle tre
   sezioni autorizzate di questa fase entrano come una entry ciascuna, **quando
   esistono**. Una tabella nominata prima che esista rifiuta la propria riga: non
   e' un pass e non e' un fallimento.
4. **Il paragrafo di chiusura dello strumento va riscritto dopo lo split**, quando
   la frase sulle chiavi diverse diventera' vera. Finche' non lo e', resta com'e'.

---

## Self-Check: PASSED

- `scripts/verify-refusal.mjs` — presente
- `scripts/verify-all.mjs` — modificato, `NEEDS_AUTHORISATION` presente 10 volte
- `package.json` — `verify:refusal` presente 1 volta
- `.planning/phases/45-production-sections-section-by-section/deferred-items.md` — presente
- commit `4db99e9` — presente
- commit `f8f7e3d` — presente
- commit `fb0c2ac` — presente (summary parziale, al checkpoint)
- autorizzazione — chiesta, concessa e **spesa** il 2026-08-17; un solo run eseguito
- entrambe le sessioni coniate — **revocate globalmente e riletta la revoca**:
  `token still resolves to a user: false` per master e per member
- righe scritte in produzione — **zero**. Ogni chiamata del run e' un conteggio
