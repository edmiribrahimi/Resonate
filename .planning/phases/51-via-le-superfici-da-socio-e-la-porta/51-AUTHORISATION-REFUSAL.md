---
phase: 51-via-le-superfici-da-socio-e-la-porta
document: autorizzazione a coniare sessioni in produzione — `verify:refusal`, la quinta del progetto
written: 2026-09-23
granted: yes
granted_date: 2026-09-23
granted_by: il proprietario
scope: coniare e revocare fino a due sessioni su identita' gia' esistenti in produzione, senza creare profili, senza stamparne indirizzo ne' token — una corsa sola di `npm run verify:refusal`
answer: "Si', autorizzo oggi"
status: ESAURITA
exhausted: "2026-09-23T10:41:00Z"
---

# Autorizzazione a coniare sessioni in produzione — 2026-09-23

`ai-engineering.md`, gate *l'autorizzazione a scrivere in produzione e' un atto,
non un permesso*: **si consuma una volta**, copre esattamente cio' che e' stato
descritto quando e' stata chiesta, e chi la riceve dichiara **quando l'ha usata e
quando l'ha esaurita**.

`51-AUTHORISATION.md` (2026-09-22, **ESAURITA**) lasciava questo atto fuori
perimetro in forma esplicita: *«per lanciarlo serve un atto nuovo, con la sua
data, il cui perimetro sara' “coniare e revocare fino a due sessioni su
identita' gia' esistenti, senza creare profili, senza stamparne indirizzo ne'
token”»*. Questo documento e' quell'atto.

## 1. Il perimetro, e non un byte oltre

| # | Passo | Che cosa tocca, alla lettera |
|---|---|---|
| **(a)** | `npm run verify:refusal` contro la produzione, **una corsa** | `generateLink` (magic link, **non spedito**) + `verifyOtp` per **due** identita' gia' esistenti — il `MASTER_EMAIL` e **un** profilo con ruolo `attendee`, risolto a run time e mai stampato; poi `signOut(…, "global")` su entrambe, con la revoca riletta |
| **(b)** | la rilettura | l'uscita dello strumento — `0` la coppia regge · `1` FALLITO · `2` RIFIUTATO, nulla misurato — riportata **con il suo significato**, non arrotondata a verde |

**Cosa lo strumento NON fa, per costruzione** (`scripts/verify-refusal.mjs`, il
self-check legge la propria sorgente prima di partire): nessun `insert`,
`update`, `upsert`, `delete` o `rpc`; nessuna riga letta — ogni chiamata e' un
`HEAD` con conteggio; nessun token, indirizzo o riga stampati.

**Fuori perimetro, esplicitamente:** creare profili, cambiare ruoli, qualunque
scrittura su una tabella, una seconda corsa, qualunque altra scrittura in
produzione. Per quelle serve un atto nuovo.

## 2. La domanda, alla lettera — e la risposta

Posta il 2026-09-23 fra le quattro decisioni di chiusura della fase 51:

> «`verify:refusal` e' rosso contro la produzione perche' non e' mai stato
> lanciato: conia e revoca fino a due sessioni su identita' gia' esistenti,
> senza creare profili e senza stampare indirizzo ne' token. Autorizzi
> quell'atto, oggi 2026-09-23, per una sola corsa?»

Risposta del proprietario, letterale: **«Si', autorizzo oggi»**.

## 3. Cosa un verde NON significa

Dal docblock dello strumento, riportato perche' e' cio' che si rileggera':
prova un rifiuto **sul percorso di lettura**, **sulle tabelle elencate**, **con i
ruoli elencati**, **nel momento in cui e' girato**. Non prova nulla sulle
scritture. E dove una tabella e' vuota la risposta autorizzata e quella non
autorizzata sono byte-identiche: la riga **RIFIUTA** (exit 2) invece di passare,
e **un 2 su una tabella vuota e' l'esito onesto, non un difetto**.

## 4. Registro d'uso

| # | Passo | Eseguito (UTC) | Letto | Esito |
|---|---|---|---|---|
| (a) | `npm run verify:refusal` contro la produzione, una corsa | **2026-09-23, ~10:40Z** | due sessioni coniate — `master` e **un** `attendee` risolto a run time — poi **`signOut(…, "global")` su entrambe, riletto: «token still resolves to a user: false» per tutte e due** | **ESEGUITO** |
| (b) | la rilettura | stessa corsa | **11 righe dichiarate: 8 con la coppia che regge** (le sei del calendario, `production_space`, `production_space_attribute` — l'autorizzato legge 14…1840 righe, `attendee` e `anon` leggono **0**), **3 RIFIUTATE** — `production_section`, `production_visual_asset`, `production_open_question` hanno **zero righe**, quindi il controllo positivo e' muto e la misura non e' avvenuta | **8 / 11, exit 2 per costruzione** |

**Sull'uscita, detta come sta.** Lo strumento alza il codice e non lo abbassa mai:
`1` solo se un soggetto non autorizzato legge una riga — **nessuna riga lo ha
fatto** — e `2` se almeno una riga e' RIFIUTATA. Tre lo sono. Quindi l'uscita e'
**2**, ed e' **dedotta dal conteggio stampato, non letta**: chi ha lanciato il
comando ne ha conservato la coda e non la testa, e la riga del verdetto stava in
testa. Non si rilancia per leggerla — una seconda corsa e' una seconda sessione
coniata su una persona reale, e questo documento ne autorizza una.

**Cosa chiude e cosa no.** Chiude il gate rosso di `51-VERIFICATION.md`: il
rosso era *«non lanciato»*, e adesso e' lanciato, con un 2 che e' l'esito onesto
su tre tabelle vuote (§3). **Non chiude** il criterio 1 della fase 45, per la
ragione che lo strumento stampa da se': nessun soggetto in produzione tiene una
sola sezione. Zero righe scritte, zero profili creati, zero indirizzi o token
stampati.

## 5. Chiusura

# ⚠ ESAURITA — 2026-09-23, ~10:41Z

**Un passo su uno eseguito.** Due sessioni coniate e revocate, revoca riletta.

> **Da qui in poi questo documento non autorizza piu' niente.** Una nuova
> corsa di `verify:refusal` e' un atto nuovo, con la sua data.
