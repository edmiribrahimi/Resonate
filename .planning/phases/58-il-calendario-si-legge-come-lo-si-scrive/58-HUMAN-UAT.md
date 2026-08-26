---
status: complete
phase: 58-il-calendario-si-legge-come-lo-si-scrive
source: [58-VERIFICATION.md]
started: 2026-08-25T00:00:00Z
updated: 2026-08-26T01:30:00Z
---

## Current Test

[tutti e quattro chiusi — due ritrovamenti registrati nei Gaps]

## Tests

### 1. Esercitare `P-58-C` (passi 1-7) — il rientro dall'istantanea dopo uno specchio interrotto
expected: Un'osservazione scritta per ognuno dei sette passi, con i conteggi del passo 2 riconfermati al passo 6, o il ritrovamento scritto per esteso se l'istantanea manca. Al termine, `MIRROR_RESTORE_PATH_VERIFIED` puo' passare a `true` **solo** dopo che questa procedura ha rimesso DAVVERO una riga.
why_human: **Non e' l'autorizzazione a bloccare — quel fatto era riportato male, e la correzione e' del 2026-08-25.** Il frontmatter di `58-PROCEDURES.md` dice *«`P-58-C` legge soltanto»*, e la procedura stessa: *«non scrive in produzione con le proprie mani … Non ha bisogno di un'autorizzazione propria»*. Cio' che blocca e' la **precondizione**: *«lo specchio e' morto fra la cancellazione e la riscrittura»*. Misurato in produzione il 2026-08-25: **nessuna corsa e' morta a meta'** — tutte e sei le righe di `production_import_run` portano un `finished_at`. Un runbook di rientro non si esercita a comando su un incidente che non c'e'; o si aspetta, o si costruisce un posto dove provocarlo che non sia la produzione.
result: **PASSATO il 2026-08-26, in LABORATORIO.** Tutti e sette i passi eseguiti con
un'osservazione ciascuno, scritti in `58-PROCEDURES.md`. La precondizione e' stata
**provocata** — interruzione iniettata nell'importatore dopo la cancellazione, mutazione
asserita sul disco con lo `sha` e ripristinata dai byte salvati. Passo 2: tutto a zero.
Passo 6: piani 9 · pezzi 47 · impegni 48 · voci 71 · **spuntate 1 · annullate 1**.
Differenza: **zero**. ⚠ `MIRROR_RESTORE_PATH_VERIFIED` resta `false`: la fedelta' misurata
del laboratorio e' quella dello schema, non quella dei dati.

### 2. `R15` in `npm run verify:mirror-guards` — il rientro che rimette DAVVERO una spunta
expected: Uscita `0`, con l'attore e l'istante della spunta ripristinata **identici** a quelli pre-schianto, riletti con uno strumento **diverso** da quello che ha scritto.
why_human: Il gate stesso dichiara `R15` *«RIMANDATO a un esercizio datato, con la sua autorizzazione — scrive righe di produzione: e' un atto, e non ne esiste l'autorizzazione»*. Confermato eseguendo il gate: `– R15 … RIMANDATO`.
result: **PASSATO il 2026-08-26, in LABORATORIO.** Uscita `0`, `RESTORE_APPLIED_OK`:
**2 decisioni rimesse su 2, di cui 1 ANNULLAMENTO**, con attore e istante originali.
Confronto campo per campo contro l'istantanea, riletto dal catalogo: attore **IDENTICO**,
nome **IDENTICO**, direzione dell'istante **IDENTICA**. L'istante e' l'**originale**, non
l'ora del rientro — la prova che il percorso non passa da `record_checklist_tick`.
⚠ Non esercitato contro il catalogo di produzione.

### 3. `R16` in `npm run verify:mirror-guards` — l'importatore rifiuta per la guardia della corsa non presidiata
expected: Uscita `2`, categoria `unattended_state_at_risk`, **zero scritture**, con una sorgente registrata e credenziali reali davanti alla guardia.
why_human: Il gate dichiara `R16` *«RIMANDATO a una corsa con sorgente registrata e credenziali»* — la sorgente vive **solo** in una variabile d'ambiente di produzione (`ICS-09`) e non e' raggiungibile da un agente automatico senza le stesse credenziali del proprietario.
result: **PASSATO il 2026-08-26, in LABORATORIO.** Con sorgente registrata e credenziali
vere davanti alla guardia: **uscita `2`, categoria `unattended_state_at_risk`**, e **zero
scritture riconfermate dal catalogo** — piani, pezzi, voci e corse tutti invariati.
Lo stato a rischio erano 1 spunta e 1 annullamento seminati per l'occasione.

### 4. La strada (2) della voce 11-bis — una seconda lettura presa DALLA superficie
expected: Una seconda lettura, dalla superficie stessa, che corrobori quelle gia' prese dal catalogo ai passi 14/19/24 di `P-58-A` e `P-58-B`. Serve a ogni futura esecuzione presidiata, non solo a questa.
why_human: La superficie risponde `307 → /login` a ogni richiesta anonima, e i due soli conti che la aprono sono **account di persone**. Coniare una sessione e' un atto che richiede l'autorizzazione datata del proprietario, nella forma che `npm run verify:refusal` gia' pretende per se stesso.
result: **ESEGUITO il 2026-08-26, con un RITROVAMENTO.** Sessione coniata sul ruolo
`master`, `GET /admin/calendar` → **HTTP 200**, documento di 174.505 byte: la superficie
si apre al ruolo titolare, e da anonimo lo stesso indirizzo da' `307 → /login?redirect=…`.
**Ma nessuno dei tre stati per chiave compare**, e `rmdb` e `mtnlb` non compaiono affatto.
La causa e' misurata e non e' un difetto della superficie: **la produzione gira 149 commit
indietro** — `ImportRunSummary` con i tre stati vive in `main` locale e non e' mai stata
spinta su `origin`, quindi Vercel non l'ha deployata. **`ICS-10` guardia (b) e' costruita
e NON e' osservabile in produzione finche' non si deploya.**

⚠ **Registro dell'autorizzazione, come `ai-engineering.md` pretende.** Concessa dal
proprietario il 2026-08-26 nella forma descritta — sola lettura, revoca globale, rilettura
della revoca, nessun token ne' indirizzo stampato. **Usata due volte.** Il primo conio e'
finito contro `http://localhost:3000`, perche' e' quello che `NEXT_PUBLIC_APP_URL` vale in
`.env.local`: ha ottenuto `404` da un dev server e **non ha letto nulla della produzione**.
Il secondo, con l'indirizzo verificato, e' l'atto autorizzato. **Entrambe le sessioni sono
state revocate globalmente e la revoca RILETTA** (`HTTP 403` in tutti e due i casi, mai
assunta). L'autorizzazione e' ora **esaurita**.

⚠ **Secondo ritrovamento, fuori perimetro e da verificare:** il redirect di produzione usa
`?redirect=`, mentre la memoria di progetto dice che la pagina di login legge `?next=`.
Se la memoria e' giusta, il ritorno dopo l'accesso non funziona. Non verificato qui.

## Summary

total: 4
passed: 4
issues: 1
pending: 0
skipped: 0
blocked: 0

## Gaps

### 1. `ICS-10` guardia (b) non e' osservabile in produzione
status: open
La superficie deployata non porta i tre stati per chiave: la produzione gira **149 commit
indietro** e il codice non e' mai stato spinto su `origin/main`. Non e' un difetto del
codice — e' una distanza fra ciò che e' scritto e ciò che gira. Si chiude con un deploy,
che e' una decisione del proprietario e non un passo di questa verifica.

### 2. Il parametro del redirect di login — CHIUSO il 2026-08-26 (`adb05e7`)
status: resolved
Era vero, ed era il **blocker D7**, gia' registrato in prosa nel middleware e nella pagina
di accesso. Il middleware scriveva `?redirect=`, la pagina legge `?next=`: la destinazione
si perdeva su ogni indirizzo protetto.

⚠ **Rinominare il parametro da solo non riparava niente.** L'allow-list di `resolveNext`
non conteneva `/membership-card`, `/attendance`, `/admin/**` ne' `/door`, quindi chi veniva
rimbalzato da `/admin/calendar` sarebbe finito su `/dashboard` **lo stesso**, per una
ragione diversa. Chiuso con entrambe le meta', piu' `PROTECTED_PREFIXES` esportato da un
punto solo e il controllo 3 di `verify:routes` che lega le due liste — provato con tre
mutazioni, e la terza ha corretto il gate stesso.
