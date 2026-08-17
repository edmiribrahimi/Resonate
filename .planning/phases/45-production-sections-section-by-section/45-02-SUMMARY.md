---
phase: 45-production-sections-section-by-section
plan: 02
subsystem: verification-instruments
status: paused-at-checkpoint
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
metrics:
  tasks_completed: 2
  tasks_total: 3
  completed: 2026-08-17
---

# Fase 45 Piano 02: lo strumento che entra come un ruolo vero — Summary

Il primo strumento di questo repository che si autentica come un ruolo reale, con
l'asserzione costruita come una **coppia** perche' su una tabella vuota la
risposta di chi ha la chiave e quella di chi non ce l'ha sono identiche.

**Stato: fermo al checkpoint del Task 3.** Nessuna sessione e' stata coniata,
nessuna chiamata all'auth API e' partita, e l'autorizzazione del proprietario non
e' stata chiesta ne' spesa.

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

**Cosa un verde NON significa.** Un exit 0 da `--help` non misura nulla su una
policy: dichiara un contratto. E l'unica prova che le sei policy *rifiutino* e'
il run del Task 3, che non e' avvenuto.

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

## Il checkpoint — Task 3, non iniziato

Il Task 3 e' `checkpoint:human-action`, `gate="blocking"`, e chiede **il permesso
di coniare una sessione sull'identita' di una persona reale**. Questo progetto
concede permessi del genere **per atto, datati, e si esauriscono quando sono
spesi** (`ai-engineering.md`, *gate l'autorizzazione a scrivere in produzione e'
un atto*; il precedente registrato e' P6 della fase 38, dove l'executor si e'
fermato prima ancora dello snapshot).

**Autorizzazione: NON CHIESTA, NON CONCESSA, NON SPESA.** Nessuna chiamata
all'auth API e' partita da questo piano. Il ramo `--help` e' l'unico che ha girato
e non contatta nulla.

Quando l'autorizzazione arrivera', va registrata qui con la sua data e il suo
ambito esatto — **questo strumento, questa seduta** — e solo dopo si esegue
`npm run verify:refusal` **una volta**. Il transcript va riportato verbatim. Non
si ri-esegue per «ottenere un verde»: un 2 da una tabella vuota e' la misura che
si rifiuta di mentire.

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

---

## Bandiere di sicurezza

Nessuna superficie di rete, di autenticazione, di accesso a file o di schema e'
stata introdotta oltre quelle gia' nel `<threat_model>` del piano. Nulla in questo
piano rende piu' facile far scattare `venue_reveal_sent`: lo strumento non scrive,
non tocca `venues`, non tocca `parties`, e le sue letture sono conteggi con
`head: true` che non restituiscono righe.

---

## Self-Check: PASSED

- `scripts/verify-refusal.mjs` — presente
- `scripts/verify-all.mjs` — modificato, `NEEDS_AUTHORISATION` presente 10 volte
- `package.json` — `verify:refusal` presente 1 volta
- `.planning/phases/45-production-sections-section-by-section/deferred-items.md` — presente
- commit `4db99e9` — presente
- commit `f8f7e3d` — presente
