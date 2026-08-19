---
severity: moderate
found: 2026-08-11
found_during: fase 39, audit di sicurezza (T-39-06) e misura successiva dell'orchestratore
resolves_phase: null
---

# Dieci throw a module-load possono mettere a 500 tutta la superficie del middleware

Un'assertion sbagliata sulla mappa delle capability non fallisce a `npm run
build`: fallisce quando il runtime **istanzia il bundle del middleware**, cioe'
alla **prima richiesta dopo il deploy**. E il middleware copre ogni rotta che
matcha, quindi il 500 arriva anche dove non c'entra niente:
`/api/webhooks/sumup`, i quattro cron, `/api/tickets/checkin`.

**Una configurazione sbagliata della porta mette giu' la strada dei soldi.**
Quell'accoppiamento e' reale, non l'ha scelto nessuno, ed esiste attraverso il
bundle condiviso — non attraverso una riga che qualcuno abbia scritto.

## La misura, 2026-08-11

| | valore |
|---|---|
| `throw new Error` a module scope in `src/lib/supabase/middleware.ts` | **2** (identico prima e dopo la fase 39) |
| throw a module-load raggiungibili dal bundle del middleware | **10**, in 5 file |
| file sotto `src/app/api/` toccati dalla fase 39 | **0** |

La classe l'ha introdotta la **fase 34** (`f59776b`, 2026-08-09),
deliberatamente e documentandola come misurata. La fase 39 non ne ha aggiunta
nemmeno una: ha allargato un'assertion esistente da un indirizzo a due.

## Perche' non si toglie e basta

Questo prodotto **non ha error tracking**. Senza il throw, una mappa sbagliata
diventa una **porta silenziosamente sbagliata**: una persona rifiutata
all'ingresso, alle due di notte, davanti a una fila, senza niente in nessun log
che qualcuno legga. `checkin-offline.md` fissa l'asimmetria — rifiutare un
ospite valido e' l'errore caro. Un fallimento rumoroso in un giorno senza
serata e' un raggio d'azione peggiore e un **modo di fallire migliore** di una
risposta sbagliata data in silenzio la sera di una festa.

Accettato come rischio in `39-SECURITY.md` il 2026-08-11, con il raggio
d'azione scritto. Questo todo e' la riduzione, non la rimozione.

## La riduzione, su terreno gia' verificato col compilatore

Due delle tre preoccupazioni dell'assertion sono **gia' dimostrabili a compile
time**, e questo e' stato provato con `tsc`, non assunto:

1. **«questi indirizzi sono legati a `door.operate`»** e' vero **per
   costruzione** da quando `DOOR_ADDRESSES` deriva dalla mappa —
   `src/lib/supabase/middleware.ts:195`.
2. **`assignmentOpenable`** porta il tipo letterale `true` sotto
   `as const satisfies`, quindi lo tiene un'asserzione di tipo.

Resta a runtime **solo lo shadowing del resolver**: un'altra entry il cui
pattern matcha lo stesso indirizzo. Quella e' una proprieta' della mappa intera,
non della porta — e `capability-routes.ts` ha gia' un throw di ambiguita' ai
piedi del file.

Spostare le parti dimostrabili al livello dei tipi **riduce la classe su tutti e
dieci i throw**, non su uno. E' il lavoro che vale la pena fare; sostituire il
throw della porta con un altro throw non lo e'.

## Cosa NON fare

- **Non trasformare i throw in log.** Un log senza error tracking non e'
  osservabile, e `meta-gates.md` chiede un effetto osservabile per ogni
  fallimento che conta. Sarebbe scambiare un fallimento rumoroso con nessun
  fallimento.
- **Non aggiungere nuovi throw a module-load** a moduli raggiungibili dal
  middleware: l'accettazione del 2026-08-11 copre la classe **esistente** e non
  si eredita.

## Condizione che resta in piedi finche' questo todo e' aperto

`39-DOOR-PASS.md` §0.6 non e' opzionale: **si spedisce in un giorno senza
serata, e la prima richiesta la si fa di persona**, registrando l'ora del deploy
e l'ora della prima richiesta. E' una riduzione dell'esposizione, non una
mitigazione — non stringe il raggio di una rotta, cambia solo chi lo scopre.

## Riferimenti

- `.planning/phases/39-the-door-s-own-address/39-SECURITY.md` — log dei rischi accettati, voce T-39-06
- `.planning/phases/39-the-door-s-own-address/39-DOOR-PASS.md` §0.6
- `.claude/rules/meta-gates.md` — controllo zero fallimenti silenziosi
- `.claude/rules/checkin-offline.md` — l'asimmetria che fissa i default


---

## CHIUSO il 2026-08-19 — spostato al compilatore, non tolto

Il todo chiedeva *«spostare le parti dimostrabili al livello dei tipi»*, non di
sostituire un throw con un altro. Fatto: il secondo throw a module-load del
middleware — quello su `assignmentOpenable` — e' ora un'asserzione di tipo
(`src/lib/supabase/middleware.ts`), perche' `Binding` dichiara
`assignmentOpenable?: true` e l'unico modo di romperlo e' togliere la proprieta',
che e' un errore di compilazione.

**Provato per mutazione**: togliendo `assignmentOpenable: true` alla entry della
porta, `tsc` fallisce con `TS2339` a `middleware.ts:247`. Il fallimento e'
passato dalla **prima richiesta dopo il deploy** a `next build`.

Il throw sullo **shadowing** resta a runtime, ed e' corretto che resti: e' una
proprieta' della mappa intera, non dimostrabile al livello dei tipi. La classe
resta accettata come rischio in `39-SECURITY.md`, con un throw in meno.
