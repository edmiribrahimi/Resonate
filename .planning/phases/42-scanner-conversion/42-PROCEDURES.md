---
phase: 42-scanner-conversion
written: 2026-08-18
status: ten procedures, ten `Result: pending`. Nothing below has been run, and `pending` is the literal state of every one of them — not `skipped`, not `n/a`. **Row 3m is the exception, and not because it was run: its execution gate was overridden by the owner on 2026-08-18 and the row is no longer runnable at all — the unconverted scanner it had to measure no longer exists. See the derogation block at row 3m.**
carries: the ten manual rows of `42-VALIDATION.md` § Manual-Only Verifications — 1h, 1i, 2d, 3m, 3n, 3o, 3p, 3q, 3r, 3s — each with the researcher's own reason for why no command closes it
closes: success criterion 1 (rows 1h, 1i), criterion 2 (row 2d), criterion 3 (rows 3m–3s)
writes_nothing: none of the ten creates a row, spends a number or grants a key. There is no authorisation to ask for here and no snapshot to take. What they do change is the state of a real night's door, so they are run by whoever is already working it — never by a second person standing behind the queue
---

# Phase 42 — The Procedures

> **(a) Every `Result` below reads `pending`, and a pending Result is an UNRUN
> procedure** — never a verified-by-inspection in disguise. A table of ticks
> nobody earned is worse than an empty table, because it closes a phase. Nothing
> in plan 42-02 is permitted to fill one in.
>
> **(b) Roles, never names — and no night, no place, no line of artists.**
> `.planning/` is tracked and this repository is **PUBLIC**, so a push is a
> publication and a publication is irreversible. Every procedure below is
> anchored to an **event** — *the first real door*, *the door after that* — and
> never to a date. **Whoever executes reads the calendar in `docs/`, which git
> ignores**, and that instruction is written here instead of the date precisely
> because writing the date here would publish it.
>
> **(c) Why these ten and nothing more.** Everything else in this phase has a
> command: `npm run build` is the typecheck, `verify:conversion` reads class
> strings and an import graph, `verify:routes` walks the map against the disk,
> and the capture script turns thirteen blocks of constants into a diff. These
> ten are what **no command in this repository can settle**, and the reasons are
> three. Some ask how a screen READS, and a string assertion has no opinion about
> that. Some ask what a DEVICE did — a haptic motor, a torch, an IndexedDB store,
> a cache keyed by URL. And one asks for an observation **nobody has ever made**.
>
> **(d) Read `42-BASELINE.md` alongside this file, not instead of it.** That
> record proves the constants and the roads did not move. It does not prove the
> behaviour did not. The two documents are the two halves of criterion 3, and
> neither one closes it alone.

---

## The two that are the spine of this phase

**Row 3m — the door pass on the UNCONVERTED scanner — runs first, and it runs
before any conversion ships.** It is D-42-04 point 3, and it is not a preference:
`39-VERIFICATION.md` is still `human_needed` for one reason, which is that **there
is no *before***. The corrections of phases 31 and 39 have never run at a real
door. Criterion 3 says *every scanner behaviour is unchanged from before the
conversion*, and until 3m carries an observation, the word *before* names nothing.

> **Every blocked plan in this phase may not start while row 3m reads
> `pending`.** That is an execution gate, not a scheduling preference. A
> conversion shipped ahead of it does not produce a phase that is slightly harder
> to verify: it produces a criterion that can never be closed, because the
> baseline it needed had to be taken on code that no longer exists.

**Row 3n — the same pass on the CONVERTED scanner — runs at the door after that**,
line by line against the first. **Every difference is a defect of the conversion
until it is argued otherwise**, and the argument is written next to the
difference, not held in somebody's head.

---

## How to read a step

- Steps are numbered and are executed **in the order written**.
- Every step names **the role that performs it** — a member of staff assigned to
  the door, or whoever is running the pass. Never a person.
- **Observations are written verbatim.** *"It worked"* is not an observation.
  *"The screen went green and the phone gave one long pulse; I said 'in' before I
  read the word"* is.
- Rows 1h and 1i turn on one distinction and it is the whole of their content:
  record what was recognised **BEFORE reading any words on the screen**, and
  record it separately from what was read afterwards. A procedure that collapses
  the two measures a person's reading speed, not a screen's legibility.
- Where a step says **if it did not, that is the finding**, write what happened
  instead, verbatim. Do not retry until it passes.
- A device is described by **model and operating system**, because two of these
  rows are about what a device does and not about what the code says.

---

## 1h — Accept and refuse are told apart at arm's length, in the dark

**Row:** `42-VALIDATION.md` 1h · **Criterion 1** — *accept and refuse stay
saturated and unmistakable at arm's length in a dark room, and each carries a
second channel beyond colour.*

**Why no command closes it.** **Nothing in this repository renders a pixel.**
`verify:scan-legibility` measures the distance between two **hues**;
a hue separable on a chart and a screen legible at two metres out of the corner
of an eye are different claims. And the worst case measured is *sufficient*, not
*comfortable*: D-42-01 declares it, and says that for a deuteranope the channel
that actually carries refusal is the **glyph**. Only an eye confirms that.

**As:** a member of staff assigned to the door, at the entrance.

1. Set the device screen to **minimum brightness**. Record the setting and the
   device model and operating system.
2. Stand in the room as it will actually be — lights as they are on the night, no
   extra lamp brought in for the procedure.
3. Hold the device **at arm's length, in one hand**, as it is held with a queue
   in front of it.
4. Provoke the three outcomes in sequence: an admission, a second read of the
   same code, and a code that is not valid.
5. For each one, record **what you recognised before reading any word on the
   screen** — verbatim, in the words that came first.
6. Only then read the screen, and record the words separately.
7. Repeat once with the device held by somebody who does not know which outcome
   is coming. If the two disagree, that is the finding.

Result: pending

---

## 1i — The third state reads as *already recorded*, never as a refusal

**Row:** `42-VALIDATION.md` 1i · **Criterion 1**, and `ScanFlash.tsx:14-20`.

**Why no command closes it.** The distinction between *«this person goes in, and
somebody should look afterwards»* and *«this person does not go in»* is a
judgement about how a screen reads, and no assertion holds it. It is also the
domain's own asymmetry: **a false refusal happens in front of a queue**, and
refusing a valid guest costs more than admitting a double.

**As:** a member of staff assigned to the door, at the entrance.

1. Scan one code that is valid. Record the outcome.
2. Scan **the same code again**, within the double-read window recorded in
   `42-BASELINE.md` block 10.
3. Record **what you did first**, verbatim: did you admit the person, or did you
   hesitate? Record it **before** reading the words on the screen.
4. Record what the screen said afterwards, separately.
5. Record whether the second read felt like the same kind of event as an invalid
   code. **If it did, that is the finding** — and it is a finding about the
   screen, not about the person reading it.
6. Repeat with a second member of staff who has not read this document.

Result: pending

---

## 2d — The viewfinder is centred and workable at three widths

**Row:** `42-VALIDATION.md` 2d · **Criterion 2** — *the viewfinder centres at
every width instead of stretching, on phone, tablet and desktop.*

**Why no command closes it.** A source assertion proves that **a class is
present**. That the decode box is reachable with a thumb on a tablet held
sideways is a property of a hand, not of a string. `verify-conversion.mjs` says
it of its own green: *«it reads a class string and an import graph, renders
nothing and measures no pixel»*.

**As:** whoever runs the pass, on three real devices.

1. Open the door on a **phone**. Record the model, the operating system and the
   orientation.
2. Record three things: whether the viewfinder is centred, whether the decode box
   is reachable one-handed, and whether any critical information has left the
   screen.
3. Repeat on a **tablet**, in both orientations.
4. Repeat on a **desktop browser**, at a window narrower than half the screen and
   again at full width.
5. Record the answers as a table: three devices × the three questions. **A blank
   cell is not a pass.**
6. Record anything that had to be scrolled to. At a door, scrolling to find the
   viewfinder is the same as not having it.

Result: pending

---

## 3m — The door pass on the UNCONVERTED scanner

**Row:** `42-VALIDATION.md` 3m · **Criterion 3** · D-42-04 §3. **This is the first
baseline this project will ever have for the door's behaviour.**

**Why no command closes it.** **There is no *before*.** `39-VERIFICATION.md` is
`human_needed` for exactly this reason: the corrections of phases 31 and 39 have
never run at a real door. No command can produce an observation nobody has made
yet, and without it the word *unchanged* in criterion 3 has no term of comparison.

**When:** at **the first real door** — the next entrance actually worked, read
from the calendar in `docs/`, which git ignores. **Before any conversion ships.**

**As:** the roles named in `39-DOOR-PASS.md`, on the devices that pass names.

1. Run **`39-DOOR-PASS.md` §0.6** — the deploy rule — and then **§8**, the dark
   room, **in full and as written there**. They are not restated here: a
   procedure copied is a procedure that drifts from the one it copied, and the
   comparison in row 3n is line by line against that document's own numbering.
2. Fill **every** `Result:` in the sections you run with the wall-clock time and
   a verbatim observation. A blank Result is not a pass and is not a skip — it is
   a row that cannot be compared later.
3. Record the deployed build under test, and record that the scanner is
   **unconverted** at the moment of the pass.
4. Record the device models and operating systems. Row 3n must be run on the same
   models, and a comparison across two different phones measures the phones.
5. When the sitting ends, write here **where the filled pass lives** and its
   commit, so row 3n has something to open.

> ## DEROGA DEL PROPRIETARIO — 2026-08-18
>
> **Il cancello d'esecuzione di questa riga e' stato scavalcato deliberatamente, e
> le onde 3-8 della fase 42 sono state eseguite con questa riga a `pending`.**
> Non e' una dimenticanza, non e' un errore di procedura e non e' un `Result` da
> riempire dopo: e' una decisione presa dal proprietario il 2026-08-18, dopo che
> il costo era stato enunciato e messo per iscritto nell'opzione scelta.
>
> **Cosa si perde, alla lettera.** Questa riga doveva essere il primo *prima* che
> questo progetto avrebbe mai avuto per il comportamento della porta. Non essendo
> stata eseguita finche' lo scanner era non convertito, **non e' piu' eseguibile**:
> il codice su cui andava misurata non esiste piu'. Di conseguenza:
>
> - **Il criterio 3 — *ogni comportamento dello scanner e' invariato rispetto a
>   prima della conversione* — non e' piu' chiudibile.** Non e' aperto: e' privo
>   di un termine di paragone, in modo permanente.
> - **La riga 3n perde il proprio oggetto.** Chiedeva un confronto riga per riga
>   fra due osservazioni umane; la prima non esiste e non puo' piu' esistere.
>   Eseguire 3n da sola produce una descrizione, non un confronto.
>
> **Cosa NON cambia, e va detto perche' non venga letto come un via libera.** Il
> vincolo del roadmap esisteva anche per una seconda ragione, che resta intatta:
> alla prima porta reale, correzioni di comportamento mai usate (fasi 31 e 39) e
> una superficie ridipinta girano **insieme**, e questo repository non ha error
> tracking. Se qualcosa cede davanti a una fila, nessuno potra' dire quale delle
> due l'ha causato. Questo rischio e' stato accettato, non rimosso.
>
> **Alternativa che era disponibile e non e' stata presa:** una seduta di
> laboratorio su ambiente usa-e-getta, con 3m e 3n appaiati nelle stesse
> condizioni, che avrebbe chiuso il criterio 3 nei suoi termini senza toccare la
> produzione. E' registrata qui perche' la decisione sia leggibile per intero da
> chi la rilegge, non perche' venga riaperta.
>
> **Le altre nove righe di questo documento restano `pending` e restano
> eseguibili.** Nessuna di esse e' chiusa da questa deroga, e nessuna va marcata
> `skipped` o `n/a` per coerenza con questa: `pending` resta lo stato letterale.

Result: pending — e non e' piu' riempibile. Vedi la deroga qui sopra: la riga
non e' stata eseguita finche' lo scanner era non convertito, e da quel momento
non ha piu' un oggetto da misurare.

---

## 3n — The same door pass, re-run on the CONVERTED scanner

**Row:** `42-VALIDATION.md` 3n · **Criterion 3** · D-42-04 §5.

**Why no command closes it.** Criterion 3 states it in its own literal terms —
*verified by running the door pass again on a device*. It is a comparison between
two human observations, and the first one does not exist until row 3m is run.

**When:** at **the door after** the one where row 3m was run.

**As:** the same roles, on the **same device models**, with the same addresses.

1. Run **`39-DOOR-PASS.md` §0.6 and §8** again, the same path, unchanged. Do not
   restate them and do not improve them between the two sittings: a procedure
   edited in between makes the two passes incomparable.
2. Put the two filled passes side by side and compare **line by line**, by that
   document's own section numbers.
3. Record every difference, verbatim, with the section it appeared in.
4. **Every difference is a defect of the conversion until it is argued
   otherwise**, and the argument is written next to the difference — naming what
   else changed between the two nights, and why that explains it. An argument
   made after the fact and not written down is not an argument.
5. Record the differences that are **absences** too: a step that produced an
   observation the first time and nothing the second is a difference.
6. Where the second pass is better than the first, record that as a difference as
   well. An improvement nobody planned is still a behaviour that moved.

Result: pending

---

## 3o — The haptic is felt, and the three outcomes are told apart by touch alone

**Row:** `42-VALIDATION.md` 3o · **Criterion 3** · `haptics.ts:32-34`.

**Why no command closes it.** **iOS degrades `navigator.vibrate` to nothing.** A
grep proves the call is there; it never proves a device moved. And this is the
channel that works when the screen is not being looked at — which at a door is
most of the time.

**As:** a member of staff assigned to the door.

1. Record the device model and the **operating system**, and record it first: on
   one of the two families the honest expected answer is *nothing at all*.
2. Hold the device in a pocket, or in a hand that is not looking at it.
3. Provoke the three outcomes, in an order the holder does not know.
4. Record, for each, **what was felt** — verbatim, before any screen is read.
5. Record whether the three are distinguishable **by touch alone**. The three
   patterns are in `42-BASELINE.md` block 2; do not read them before running this.
6. If nothing is felt at all, record it plainly and record the operating system
   next to it. **That is a result, not a failed procedure** — it is the reason
   colour and glyph must carry the same distinction.

Result: pending

---

## 3p — The offline queue survives closing the app and restarting the device

**Row:** `42-VALIDATION.md` 3p · **Criterion 3** · `checkin-offline.md`, gate
*durable queue*.

**Why no command closes it.** It is IndexedDB on a real device. *«Una coda in
memoria non è una coda: è una speranza.»* No gate here opens a browser.

**As:** a member of staff assigned to the door.

1. Turn the **radio off** — airplane mode, not merely Wi-Fi off. Confirm it and
   record it.
2. Perform several scans. Record **how many**, and record the queue count the
   screen shows.
3. Close the app fully — not backgrounded, closed.
4. **Restart the device.**
5. Reopen the app from the installed icon.
6. Record the queue count now, verbatim. **If it differs from step 2, that is the
   finding**, and it is a defect of the queue and not of the count.
7. Turn the radio on and record how many entries drained, and how long it took.
8. Record whether any entry ended in the failed list, and the sentence it carried.

Result: pending

---

## 3q — The torch lights, and auto-return happens at the three dwells

**Row:** `42-VALIDATION.md` 3q · **Criterion 3**.

**Why no command closes it.** `getCapabilities().torch` depends on the device in
the hand. The dwell is a `setTimeout`, which is a runtime fact — and that
dismissing the flash **re-enables decoding** is more of one still. A scanner that
shows the right colour and then stops decoding is a scanner that has failed while
looking correct.

**As:** a member of staff assigned to the door, in the room as it will be.

1. Record the device model and operating system.
2. Turn the torch **on**. Record whether it lit. Turn it **off**. Record whether
   it went out.
3. If the control is absent or does nothing, record that plainly — on some
   devices the capability is not there, and that is a fact about the device.
4. Provoke each of the three outcomes and **time** how long the full-screen flash
   stays, with a stopwatch, to the nearest tenth of a second.
5. Compare against the three dwells in `42-BASELINE.md` block 1. Record the
   measured value, not the expected one.
6. **After each flash, scan again without touching anything.** Record whether the
   next scan was possible. If a tap was needed, that is the finding, and it is
   the one that matters most at a door.

Result: pending

---

## 3r — The door renders with the radio off, at the address that device is sent to

**Row:** `42-VALIDATION.md` 3r · **Criterion 3** · `checkin-offline.md`, gate
*the address that gets warmed*.

**Why no command closes it.** The runtime cache's keys **are URLs**, so the
door's two addresses are two independent entries and warming one does **not** warm
the other. It is a property of one device at one moment, and no script reproduces
it.

**As:** a member of staff assigned to the door, on the device that will work it.

1. Record which of the door's two addresses that device is actually sent to — the
   one in the navigation it will tap, not the one you would type.
2. With the radio **on**, open that address on that device. Record that you did,
   and the wall-clock time.
3. Turn the radio **off**. Confirm it is the radio and not just Wi-Fi.
4. Launch the app **from the installed icon**, not a browser tab and not a typed
   address.
5. Record **what appeared**, verbatim, and **which document it came from**.
6. Repeat steps 2 to 5 for **the other address, cold** — never opened online on
   that device. Record what appeared. `39-DOOR-PASS.md` §8.8 is the same step and
   the reason it exists.
7. If the two addresses behave differently, record both, and record which one the
   navigation actually points at. That is the one that decides the night.

Result: pending

---

## 3s — Undo works offline, and it is attributed

**Row:** `42-VALIDATION.md` 3s · **Criterion 3** · `checkin-offline.md`, gate
*limited undo*.

**Why no command closes it.** It is an offline path, per device, and its
attribution — **who and when** — is the reason the gate exists at all. No command
here watches a privileged operation while it happens.

**As:** a member of staff assigned to the door who holds the permission to undo,
and then one who does not.

1. Turn the radio **off**. Confirm it and record it.
2. Perform one scan that is admitted. Record what the screen said.
3. Undo it. Record what the screen said, verbatim.
4. Record whether the entry appears in the undo list held **on the device**, and
   whether it carries **who** did it and **when**.
5. Record whether the count on screen moved, and by how much.
6. Repeat as a role that does **not** hold the permission. Record the sentence
   that came back. **A silent refusal is the finding** — it must be refused out
   loud, and the offline sentence must say the same thing the online one does.
7. Turn the radio on. Record what the server ended up holding, and whether it
   matches what the device showed while offline.

Result: pending

---

## Closing block

**Ten procedures, ten `Result: pending`, and none of them is filled by any plan
in this phase.** A Result is filled by somebody who looked, at a door, and wrote
down what they saw.

**The order is not free.** Row 3m runs at the first real door and gates every
blocked plan of this phase. Rows 1h, 1i, 2d, 3o, 3p, 3q, 3r and 3s can be run at
either door — but a run before the conversion and a run after are two different
observations, and the record must say which it was. Row 3n runs only at the door
after 3m, and only once something has been converted to compare.

**What is still true when all ten are filled.** Criterion 3 will be closed by two
documents that disagree with each other about nothing: `42-BASELINE.md`, which
says the constants and the roads did not move, and the two door passes, which say
the behaviour did not. Neither closes it alone, and this document exists because
the second half has no command behind it — only a person, at an entrance, in the
dark, with a queue in front of them.
