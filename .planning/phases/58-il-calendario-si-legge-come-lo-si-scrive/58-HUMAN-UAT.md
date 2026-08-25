---
status: partial
phase: 58-il-calendario-si-legge-come-lo-si-scrive
source: [58-VERIFICATION.md]
started: 2026-08-25T00:00:00Z
updated: 2026-08-25T00:00:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Esercitare `P-58-C` (passi 1-7) — il rientro dall'istantanea dopo uno specchio interrotto
expected: Un'osservazione scritta per ognuno dei sette passi, con i conteggi del passo 2 riconfermati al passo 6, o il ritrovamento scritto per esteso se l'istantanea manca. Al termine, `MIRROR_RESTORE_PATH_VERIFIED` puo' passare a `true` **solo** dopo che questa procedura ha rimesso DAVVERO una spunta.
why_human: `P-58-C` **scrive in produzione** (tramite lo strumento di restore) e richiede o un incidente reale — una corsa morta a meta' — o una seduta datata con l'autorizzazione del proprietario per esercitarla a comando (`R15` in `verify-mirror-guards.mjs`). Nessun agente automatico puo' autorizzare o simulare un atto su produzione.
result: [pending]

### 2. `R15` in `npm run verify:mirror-guards` — il rientro che rimette DAVVERO una spunta
expected: Uscita `0`, con l'attore e l'istante della spunta ripristinata **identici** a quelli pre-schianto, riletti con uno strumento **diverso** da quello che ha scritto.
why_human: Il gate stesso dichiara `R15` *«RIMANDATO a un esercizio datato, con la sua autorizzazione — scrive righe di produzione: e' un atto, e non ne esiste l'autorizzazione»*. Confermato eseguendo il gate: `– R15 … RIMANDATO`.
result: [pending]

### 3. `R16` in `npm run verify:mirror-guards` — l'importatore rifiuta per la guardia della corsa non presidiata
expected: Uscita `2`, categoria `unattended_state_at_risk`, **zero scritture**, con una sorgente registrata e credenziali reali davanti alla guardia.
why_human: Il gate dichiara `R16` *«RIMANDATO a una corsa con sorgente registrata e credenziali»* — la sorgente vive **solo** in una variabile d'ambiente di produzione (`ICS-09`) e non e' raggiungibile da un agente automatico senza le stesse credenziali del proprietario.
result: [pending]

### 4. La strada (2) della voce 11-bis — una seconda lettura presa DALLA superficie
expected: Una seconda lettura, dalla superficie stessa, che corrobori quelle gia' prese dal catalogo ai passi 14/19/24 di `P-58-A` e `P-58-B`. Serve a ogni futura esecuzione presidiata, non solo a questa.
why_human: La superficie risponde `307 → /login` a ogni richiesta anonima, e i due soli conti che la aprono sono **account di persone**. Coniare una sessione e' un atto che richiede l'autorizzazione datata del proprietario, nella forma che `npm run verify:refusal` gia' pretende per se stesso.
result: [pending]

## Summary

total: 4
passed: 0
issues: 0
pending: 4
skipped: 0
blocked: 0

## Gaps
