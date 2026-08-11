---
phase: 39-the-door-s-own-address
plan: 04
subsystem: infra
tags: [persona, claude-md, verify-persona, checkin-offline, meta-gates, service-worker, networkfirst]

# Dependency graph
requires:
  - phase: 39-the-door-s-own-address
    provides: "il piano 39-02 ha creato src/app/(admin)/door/page.tsx — la glob e' scritta contro un file che esiste, quindi il controllo A resta verde"
provides:
  - "checkin-offline si carica sul secondo indirizzo della porta, src/app/(admin)/door/**"
  - "la riga di routing in meta-gates.md per il nuovo indirizzo, verificata dal controllo G"
  - "il gate l'indirizzo che si scalda e' quello che si usera' — quale dei due indirizzi va scaldato prima di una serata"
  - "persona 1.11.0 con budget di contesto rimisurato e scenario di carico e scatto per entrambi i moduli modificati"
affects: [door-runbook, checkin-offline, service-worker-cache, persona-context-budget]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "una glob nuova si dichiara in tre posti nello stesso commit: frontmatter del modulo, indice di CLAUDE.md, tabella di routing di meta-gates"
    - "il budget di contesto si rimisura e si scrive come numero, mai come stima"

key-files:
  created: []
  modified:
    - .claude/rules/checkin-offline.md
    - CLAUDE.md
    - .claude/rules/meta-gates.md
    - .claude/CHANGELOG.md

key-decisions:
  - "La glob e' `src/app/(admin)/door/**` e non `src/app/**/door/**`: identica carattere per carattere nei tre file, e piu' lunga di `src/app/(admin)/**`, cosi' il controllo G le assegna la pagina della porta senza far fallire la riga generica"
  - "La glob va in coda ai paths: di checkin-offline — e' un secondo indirizzo, non il cuore del dominio (il cuore resta src/lib/offline/**)"
  - "Il gate nuovo dice QUALE indirizzo scaldare, non per quanto tempo una voce resti valida: la durata della cache della porta resta una decisione di prodotto aperta (OQ3), non decisa qui"
  - "Nessuna prosa tagliata per compensare i 144 token spesi: il gate context budget dice di tagliare la descrizione e non la regola, e i 144 token sono regola"

patterns-established:
  - "Un indirizzo nuovo per una superficie esistente e' anche un evento di routing della persona: il modulo di dominio va riagganciato nello stesso ciclo, o il gate sembra presidiato e non lo e'"
  - "Le chiavi della cache runtime sono URL: due indirizzi per la stessa superficie sono due voci indipendenti, e il runbook deve nominare quale si scalda"

requirements-completed: [STAFF-04]

# Metrics
duration: 22min
completed: 2026-08-11
---

# Phase 39 Plan 04: La porta ha due indirizzi, e ora i suoi gate si caricano su entrambi Summary

**`checkin-offline` agganciato a `src/app/(admin)/door/**` in frontmatter, indice e tabella di routing nello stesso commit, piu' il gate che dice quale dei due indirizzi va scaldato online prima di una serata — persona 1.11.0, `verify:persona` 7/7 con margine di budget sceso da 805 a 661 token.**

## Performance

- **Duration:** ~22 min
- **Tasks:** 2/2
- **Files modified:** 4 (nessuno sotto `src/`)

## Accomplishments

- **Il buco di copertura e' chiuso.** `src/app/(admin)/door/page.tsx` matcha `src/app/(admin)/**`, quindi caricava `access-gating` e `nextjs-architecture` e **non** `checkin-offline`: il gate *offline-first*, l'asimmetria del falso rifiuto, il gate *coda durevole* e *provato prima della porta* erano fuori dal raggio della pagina che porta il nome della porta. Ora si caricano.
- **Le tre dichiarazioni concordano**, e i tre controlli che le confrontano sono verdi: A (nessuna glob morta), B (frontmatter ↔ indice, confronto per insieme) e G (il primario dichiarato si carica davvero sui file che la riga possiede).
- **Il gate `l'indirizzo che si scalda e' quello che si usera'`** trasforma in aritmetica quello che finora era buon senso: precache **zero documenti**, ogni documento offline da una cache runtime `NetworkFirst` a **24 ore / 32 voci**, **chiavi = URL** — quindi scaldare `/admin/scanner` non scalda `/door`. Concorda con il passo §0.5 del door pass, che pretende **entrambi** gli indirizzi aperti online e cronometrati separatamente.
- **Il budget e' stato rimisurato, non stimato**, e il numero e' scritto nel changelog insieme alla ripartizione di dove sono finiti i token.

## Task Commits

1. **Task 1: le tre modifiche coordinate + il gate del riscaldamento** — `c9ca794` (docs)
2. **Task 2: persona 1.11.0, changelog con budget rimisurato e scenario di carico e scatto** — `28f7acd` (docs)

## Files Created/Modified

- `.claude/rules/checkin-offline.md` — `paths:` += `"src/app/(admin)/door/**"` (in coda); un Quality Gate nuovo (*l'indirizzo che si scalda e' quello che si usera'*, con la situazione concreta che lo fa scattare); un Imperative Behavior nuovo. Nient'altro: il budget e' finito e gli altri gate erano gia' li'.
- `CLAUDE.md` — la stessa glob, nella stessa posizione, nella riga d'indice `Check-in & Offline`.
- `.claude/rules/meta-gates.md` — una riga nella tabella *Priorita' di dominio per path*, subito dopo la riga dello scanner: `| `src/app/(admin)/door/**` | checkin-offline | access-gating, nextjs-architecture |`; piu' due frasi che dicono perche' la riga esiste (la porta ha due indirizzi; la sola riga `(admin)` non caricherebbe i gate dell'offline).
- `.claude/CHANGELOG.md` — `## [1.11.0] - 2026-08-11`: il difetto e il precedente della v1.4, le tre modifiche coordinate coi controlli che le legano, il gate nuovo con la sua situazione, lo scenario di carico e scatto per `checkin-offline` **e** per `meta-gates`, e il budget rimisurato con la tabella v1.10.0 → v1.11.0.

## Verifica — cosa e' stato misurato davvero

`npm run verify:persona` eseguito **tre volte**: prima delle modifiche, dopo il task 1, dopo il task 2. Sempre **`7/7 verdi.`**, exit 0.

| Controllo | Prima | Dopo |
|---|---|---|
| **A** · nessun path dichiarato e' morto | ✓ `57 glob su 1095 file` | ✓ `58 glob su 1095 file` |
| **B** · indice ↔ frontmatter | ✓ | ✓ |
| **C** · ogni modulo ha la sua riga | ✓ `16 moduli, 16 righe` | ✓ invariato |
| **D** · set senza `paths:` | ✓ i sei manuali | ✓ **gli stessi sei** (`brand-visual-system, community-membership, legal-compliance, production-calendar, sound-manifesto, venue-acquisition`) |
| **E** · context budget | ✓ | ✓ |
| **F** · materiale di produzione fuori dal repo | ✓ | ✓ invariato |
| **G** · la tabella descrive il routing reale | ✓ `25 righe verificate` | ✓ `26 righe verificate` |

**Il blocco `misure:` dopo le modifiche, verbatim:**

```
caso peggiore: src/app/(public)/events/EventTabs.tsx
5 file caricati (CLAUDE.md, meta-gates, nextjs-architecture, ticketing-payments, venue-secrecy)
40822 byte ~ 11339 token · tetto 12000
```

Prima delle modifiche: stesso file, `40302 byte ~ 11195 token`. **Margine: da 805 a 661 token, 144 spesi.**

**Il caso peggiore non ha cambiato file**, e la ripartizione dice perche': i 520 byte in piu' sono **tutti** le due frasi di `meta-gates.md`, che si carica su ogni file del repo. Il gate nuovo di `checkin-offline.md` non compare li', perche' quel modulo su `EventTabs.tsx` non si carica: lo si paga sul candidato della porta. Misurato a parte con `wc -c` sui cinque moduli che ora si caricano su `src/app/(admin)/door/page.tsx` (`CLAUDE.md` + `meta-gates` + `access-gating` + `nextjs-architecture` + `checkin-offline`): **39.942 byte ≈ 11.095 token** al rapporto dichiarato dallo script (3,6 byte/token) — **244 token sotto il caso peggiore**. La porta e' il **secondo** file piu' caro della persona.

**Assertion 7** (nessun file sotto `src/` toccato da un piano di persona): `git diff --name-only f1159d3..HEAD | grep -c '^src/'` → `0`.
**Assertion 8** (nessun modulo entrato o uscito dal set manuale): controllo D, stessi sei moduli.
**Lockfile:** `git diff --stat f1159d3..HEAD -- package.json package-lock.json` non stampa nulla. `npm ci` in questo worktree e' stata sola preparazione dell'ambiente.

**Cosa questo non prova.** `verify:persona` misura la **coerenza** della persona, non la sua correttezza. Un 7/7 dice che frontmatter, indice e tabella di routing concordano fra loro e che nessuna glob e' morta; **non dice che il gate nuovo sia giusto**, e non dice che la porta funzioni offline al suo indirizzo nuovo. Quella lettura la chiude solo il §0.5 del door pass, su un telefono, con DevTools aperto — e resta `pending`.

## Decisions Made

- **`src/app/(admin)/door/**` e non `src/app/**/door/**`.** Le due glob matcherebbero lo stesso file oggi, ma la prima e' quella che rende il confronto con la riga di `meta-gates.md` carattere per carattere, e ha 23 caratteri contro i 18 di `src/app/(admin)/**`: il calcolo `owned` del controllo G assegna un file alla riga con la glob **piu' lunga**, quindi la pagina della porta passa alla riga nuova e la riga generica continua a passare.
- **In coda ai `paths:`, non in testa.** `src/lib/offline/**` resta il primo perche' e' il cuore del dominio; `/door` e' un secondo indirizzo di una superficie che gia' esisteva.
- **Il gate dice quale indirizzo, non per quanto tempo.** Se la porta meriti una regola di cache piu' lunga di 24 ore e' OQ3, una decisione di prodotto rimandata alla seduta dopo la lettura al buio. Scriverla qui avrebbe deciso di soppiatto una cosa che il piano vieta esplicitamente di decidere.
- **Nessuna prosa tagliata altrove per far quadrare il numero.** Il gate *context budget* dice di tagliare la descrizione e non la regola: i 144 token spesi **sono** regola — un gate e una riga di routing.

## Deviations from Plan

None — il piano e' stato eseguito come scritto. Nessuna regola di deviazione applicata.

## Issues Encountered

- **Conteggio file diverso da quello di pianificazione.** Il controllo A riporta `1095 file` in questo worktree, mentre il piano citava `57 glob su 1673 file`. Il **numero di glob** — l'unica cifra su cui il criterio di accettazione poggia — coincide (57 → 58); il denominatore e' l'insieme di file che lo script scandisce in questo albero, e non entra in nessuna asserzione. Nessun controllo ne dipende.
- **Nessun blocco.** `npm ci` in questo worktree e' andata a buon fine e non ha mosso il lockfile.

## Deferred / debito dichiarato

- **`ai-engineering.md`, gate *il set senza paths non cresce in silenzio*, dice «Cinque moduli sono senza frontmatter» e ne elenca cinque; i moduli manuali sono **sei**** — `community-membership.md` e' entrato nel set dopo, ed e' correttamente dichiarato in `CLAUDE.md` e nella costante `MANUAL_MODULES` dello script (controllo D verde, sei nomi). E' una deriva **descrittiva** dentro un file che questo piano non ha in `files_modified`, e correggerla qui avrebbe allargato lo scope e speso budget su un modulo caldo. **Va corretta nel prossimo intervento su `ai-engineering.md`**: un gate che conta male il proprio insieme e' la prima riga che qualcuno leggera' come autorevole.

## Next Phase Readiness

- **Pronto:** chi apre `src/app/(admin)/door/page.tsx` da qui in avanti ha in contesto i gate dell'offline, l'asimmetria del falso rifiuto e il gate del riscaldamento.
- **Da fare a mano:** il §0.5 del door pass — **entrambi** gli indirizzi aperti online sul telefono dello staff, cronometrati, con il bucket di cache letto per ciascuno, poi la ricarica offline. E' l'unica cosa che chiude il criterio 2 di STAFF-04, e nessuna riga di questo repo puo' tenere un telefono.
- **Margine di budget: 661 token.** La prossima aggiunta di prosa a uno dei cinque moduli caldi (`CLAUDE.md`, `meta-gates`, `access-gating`, `nextjs-architecture`, `checkin-offline`) va pesata prima di scriverla, non dopo.
- **La fase non chiude qui:** resta la seduta di fine v1.5 (D-39-07).

## Self-Check: PASSED

- I quattro file modificati esistono su disco; il SUMMARY esiste.
- I due commit di task esistono nella history: `c9ca794`, `28f7acd`.
- `git status --short` pulito prima di scrivere questo file; nessuna cancellazione nei due commit.

---
*Phase: 39-the-door-s-own-address*
*Completed: 2026-08-11*
