---
phase: 51-via-le-superfici-da-socio-e-la-porta
plan: 14
subsystem: checkin-offline
tags: [verification, procedura-manuale, offline, door, guest-list, produzione, laboratorio, MEM-04]

# Dependency graph
requires:
  - phase: 51-via-le-superfici-da-socio-e-la-porta
    plan: 01
    provides: "`P-51-1` scritta con la colonna degli esiti vuota, la corsa «prima» datata, e le tre precondizioni che solo il «prima» poteva lasciare"
  - phase: 51-via-le-superfici-da-socio-e-la-porta
    plan: 13
    provides: "la produzione allineata al laboratorio e `51-AUTHORISATION.md` ESAURITA: senza, la verifica avrebbe potuto citare solo il laboratorio"
  - phase: 50-via-le-iscrizioni
    provides: "`50-VERIFICATION.md` — la forma che soddisfa il gate: evidenza per requisito, decisioni contraddette dichiarate in testa, gate col loro colore vero"
provides:
  - "`51-VERIFICATION.md`: i quattro requisiti chiusi, ognuno con `file:riga`, esito di gate, lettura dal catalogo con l'ora, o passo di `P-51-1` percorso"
  - "la distinzione scritta fra cio' che e' provato in PRODUZIONE e cio' che e' provato solo sul LABORATORIO, e perche' le prove della porta non possono stare in produzione"
  - "le sedici decisioni spuntate una per una, con il piano che le ha onorate"
  - "una attesa di PROCEDURA smentita, portata al proprietario come decisione invece di essere chiusa dall'esecutore"
  - "la chiusura di `D-51-12-B`: la lapide di `src/utils/qr.ts` parla al passato"
affects: [52, 57]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Ogni `file:riga` di un VERIFICATION si rilegge contro HEAD nel momento in cui lo si scrive: quella che non regge si toglie, non si ricopia dal SUMMARY che la conteneva"
    - "Una decisione di dominio onorata e un'attesa di procedura smentita sono due cose diverse, e confonderle produce o un falso `contradicted` o un difetto nascosto"
    - "Cio' che NON e' stato osservato si dichiara con la ragione (nessun Web Inspector collegato), invece di essere dedotto da un sintomo adiacente"

key-files:
  created:
    - ".planning/phases/51-via-le-superfici-da-socio-e-la-porta/51-VERIFICATION.md"
  modified:
    - "src/utils/qr.ts"

key-decisions:
  - "Stato di fase `human_needed` e non `passed`: i quattro requisiti sono chiusi, ma tre voci restano a un essere umano — la condizione di accensione dell'avviso guest list (proprietario), la riga di console del passo 9 (mai osservata), `verify:refusal` (un atto datato). `passed` avrebbe fatto sparire tre cose vere dentro una parola."
  - "D-51-10 NON e' dichiarata contraddetta: la decisione chiede che l'avviso si accenda «solo quando e' vero», e a radio spenta e' vero. A essere smentita e' l'attesa del passo 2 della procedura. La distinzione e' scritta, perche' un falso `contradicted` fa riaprire una decisione che regge."
  - "`D-51-12-B` chiusa qui invece di essere rinviata: `deferred-items.md` nomina «il 51-13, o la VERIFICATION della fase» come proprietario, e questo e' il secondo. Solo `src/utils/qr.ts`: `src/types/database.ts:965-972` e' corretta com'e', perche' descrive cosa portano le righe STORICHE del registro."
  - "Le due righe stantie di `.claude/rules/checkin-offline.md` (`:52`, `:54`) NON sono state riparate: la persona e' esplicitamente fuori dal confine di fase (fase 57, `51-CONTEXT.md`). Sono elencate come debito con il loro numero di riga e con la nota che non sono vocabolario ma due gate che descrivono un percorso rimosso."
  - "Le 19 righe `already_recorded` e il biglietto «1 di 2» consumato sono attribuiti alla riproduzione con fotocamera finta di chi esegue il piano, non al proprietario: attribuirle alla corsa sarebbe l'esito inventato che `T-51-63` esiste per impedire."
  - "La riga di guest list del laboratorio e' dichiarata DOVUTA e non fatta: la cancellazione e' della chiusura di fase, e scriverla fatta qui sarebbe la stessa affermazione non osservata che la procedura vieta."

patterns-established:
  - "Un VERIFICATION dichiara il PERIMETRO delle sue prove prima dei suoi esiti: quale ambiente ha visto cosa, e perche' una certa prova non puo' vivere nell'altro"
  - "Un gate rosso si elenca con il NOME di chi lo chiude — una fase, o un atto datato — perche' un rosso senza quel nome e' un rosso che nessuno rilancia"

requirements-completed: [MEM-01, MEM-02, MEM-03, MEM-04]

# Metrics
duration: ~45min
completed: 2026-09-22
---

# Fase 51 Piano 14: la corsa «dopo» e la verifica di fase — Riepilogo

La fase ha una verifica per requisito con l'evidenza accanto, riletta contro
HEAD invece che ricopiata dai SUMMARY, e con scritto dove finisce cio' che
ciascuna prova puo' dire.

## Cosa e' stato fatto, task per task

**Task 1 e 2 erano gia' chiusi** all'inizio di questa sessione — `fc60d88` (il
`PRE-LAB` della corsa «dopo») e `98ab62c` (la corsa percorsa e trascritta). Qui
si e' eseguito il **Task 3**.

### Task 3 — `51-VERIFICATION.md`

**506 righe, quattro requisiti, sedici decisioni, 33 citazioni `file:riga`.**
L'acceptance del piano ne chiedeva **quattro**: un `VERIFICATION.md` senza una
sola citazione non soddisfa il gate di questo progetto, e in un repository senza
test runner l'evidenza osservabile e' l'unica prova che esista.

**Ogni citazione e' stata riletta adesso**, non ereditata. Una non reggeva —
`artists/page.tsx:73`, dal SUMMARY del piano 51-06: la riga si e' mossa. E'
stata **tolta e sostituita dalla descrizione del fatto**, con la nota del
perche': *«una citazione che non regge alla rilettura e' peggio di nessuna
citazione»*.

**Il documento dichiara il perimetro delle sue prove prima degli esiti.** Due
migration applicate e rilette dal catalogo di **produzione** (22 controlli su
22), `/membership-card` e `/attendance` a **404 da anonimo**,
`verify:capabilities` **5/5 contro la produzione** — e, sull'altro lato, **le due
corse della porta, che vivono solo sul laboratorio** perche' scrivono righe e
questo progetto non le scrive in produzione. La produzione ha **lo stesso
artefatto**: `c61760f` contiene `44e8c65`, il commit su cui la corsa ha percorso
i passi 7 e 8.

## Deviazioni dal piano

### `[Rule 1 - Prosa che dice il falso]` `D-51-12-B` — la lapide di `src/utils/qr.ts`

- **Trovata durante:** la lettura preliminare del Task 3, rileggendo
  `deferred-items.md` contro HEAD.
- **Problema:** `src/utils/qr.ts:52-58` diceva *«Where the code is minted today,
  and for how much longer … That minting is itself on its way out (D-51-02: …
  go with plan 51-12)»*. **Dal 2026-09-22 non e' piu' vero**: la colonna e'
  uscita dal laboratorio alle 17:45:54Z e dalla produzione alle 19:20:24.987Z.
  Una prosa al futuro su una credenziale della porta e' documentazione datata
  nel punto peggiore.
- **Perche' qui e non in un'altra fase:** `deferred-items.md` nomina
  esplicitamente *«il 51-13, o la VERIFICATION della fase»* come proprietario di
  quelle righe, e il 51-13 non le ha toccate. Non e' una riparazione di
  straforo: e' la voce di debito che dichiara chi la chiude.
- **Correzione:** riscritta al passato, con le due ore, e **senza nominare
  l'identificatore della colonna** — la grep-igiene che la fase ha applicato
  ovunque, cosi' che un grep sul nome trovi lettori veri e non il necrologio.
  Solo commento, **nessun effetto a runtime**.
- **File:** `src/utils/qr.ts`
- **Commit:** `53309cc`
- **Verifica:** `npm run build` **exit 0** (che e' anche il typecheck: non
  esiste un test runner per il prodotto).
- **Non toccata:** `src/types/database.ts:965-972`, l'altra meta' di D-51-12-B.
  Riletta e giudicata **corretta com'e'**: nomina la colonna **al passato**, come
  origine dell'etichetta che le righe **storiche** del registro portano. E' un
  fatto su un registro append-only, non una promessa.

### `[Fuori perimetro - dichiarato]` due gate stantii della persona

`.claude/rules/checkin-offline.md:52` cita `BARE_MEMBERSHIP_PATTERN`, che in
`src/` ha oggi **zero occorrenze**; `:54` enuncia un *«Gate la porta ha due
credenziali»* la cui seconda credenziale non esiste piu', e la riga che cita
(`attendance/route.ts:145`) oggi dice il contrario.

**Non riparate**, e la ragione non e' comodita': `51-CONTEXT.md` mette *«i
documenti della persona»* esplicitamente **fuori** dal confine di fase, con la
fase 57 accanto. Sono elencate nel debito del `VERIFICATION` **con il loro
numero di riga** e con la nota che **non sono vocabolario**: sono due gate che
descrivono un percorso rimosso, ed e' il caso che `meta-gates.md` chiama *una
riga che descrive male il prodotto, peggio di una riga assente*.

## Cosa resta aperto, e a chi

| Voce | A chi |
|---|---|
| La condizione di accensione dell'avviso della guest list: vero sempre a radio spenta, o solo quando la lista e' davvero vecchia? | **il proprietario** — e' una decisione di prodotto |
| La riga di console dello scarto v6, **mai osservata** (nessun Web Inspector collegato) | chi tornera' alla porta con un dispositivo collegato |
| `verify:refusal` rosso contro la produzione | **un atto nuovo con la sua data** — conia sessioni su identita' di persone reali |
| La riga di guest list `63ebd88f-…` sul laboratorio, da cancellare **per chiave** | la chiusura di fase |

## Gate

| Gate | Esito |
|---|---|
| `npm run build` | **exit 0** — rilanciato dopo la correzione di `qr.ts` |
| `npm run verify` | **`VERIFY_FAIL — 2`**: `verify:venue-surfaces` e `verify:touch-targets`, **entrambi preesistenti**, entrambi gia' rossi nella fase 50. 22 gate verdi. **Nessuna soglia allargata** |
| acceptance automatica del Task 3 | `MEM-0` **11** (≥4), `D-51-` **30** (≥15), `file:riga` **33** (≥4), righe **506** (≥80) |

## Commit

| Commit | Cosa |
|---|---|
| `fc60d88` | il `PRE-LAB` della corsa «dopo» (Task 1) |
| `98ab62c` | la corsa «dopo», percorsa e trascritta (Task 2) |
| `53309cc` | la lapide di `qr.ts` al passato — `D-51-12-B` chiusa |
| `9fbc3bc` | `51-VERIFICATION.md` |

## Cosa questo piano NON ha fatto, e va detto

- **Non ha ripercorso `P-51-1`**: la corsa «dopo» e' del Task 2, ed e' del
  proprietario. Questo task l'ha **citata con la sua data**, come il piano
  prescrive, invece di ripeterla.
- **Non ha letto nulla in scrittura**, ne' in laboratorio ne' in produzione:
  ogni numero di catalogo in `51-VERIFICATION.md` viene dalle letture gia'
  registrate in `51-ESITI.md` e `51-CATALOG.md`, con la loro ora.
- **Non ha cancellato la riga di prova sul laboratorio**, che e' dichiarata
  dovuta.

## Self-Check: PASSED

Eseguito il 2026-09-22, dopo la scrittura di questo riepilogo.

| Cosa | Esito |
|---|---|
| `51-VERIFICATION.md` esiste | **FOUND** |
| `51-14-SUMMARY.md` esiste | **FOUND** |
| `src/utils/qr.ts` esiste | **FOUND** |
| `fc60d88`, `98ab62c`, `53309cc`, `9fbc3bc` in `git log --all` | **FOUND**, tutti e quattro |
