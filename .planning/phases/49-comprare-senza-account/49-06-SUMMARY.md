---
phase: 49-comprare-senza-account
plan: 06
subsystem: nextjs-architecture / venue-secrecy / ticketing-payments
tags: [guest-surface, hmac, no-session, gate-widening, mutation-proof]
status: completo — ma l'esecutore si e' fermato e il piano e' stato chiuso dall'orchestratore
provides:
  - "la pagina che apre i biglietti di un ordine da una firma, senza sessione"
  - "il ritorno dal pagamento che riconosce un ordine d'ospite"
  - "«rimandami i biglietti», che non dice a chi chiede se un indirizzo esiste"
  - "il gate delle superfici venue conosce la terza superficie — provato per mutazione"
decisions:
  - "La lista chiusa FOCUS_ROUTES allargata di una riga per decisione, con la frase tirata dichiarata invece che arrotondata"
  - "Nessun luogo su questa superficie: D-49-04 batte la raccomandazione della ricerca, che diceva il contrario"
requirements: [BUY-03, BUY-04]
metrics:
  completed: 2026-09-06
---

# Fase 49 Piano 06 — Summary

## Come si e' chiuso, perche' conta

**L'esecutore di questo piano si e' fermato.** Il guardiano del flusso l'ha
terminato dopo dieci minuti senza progresso, mentre stava allargando i gate. Le
sue ultime parole registrate sono *«Check E corrects my reading: a
navigation-free surface must be `focus`. Reverting, and widening the closed list
by decision.»*

**Il lavoro c'era, il referto no.** Tre commit erano atterrati; le modifiche ai
tre script di gate erano nell'albero, non committate. L'orchestratore ha
verificato lo stato, ri-eseguito i gate, **rifatto la prova per mutazione invece
di credere alla riga che diceva che era stata fatta**, e chiuso il piano.

Scritto qui invece che taciuto: un piano chiuso da qualcuno diverso da chi l'ha
eseguito e' un fatto che chi rilegge deve vedere, perche' cambia quanto pesa
questo documento rispetto agli altri cinque.

## Cosa esiste adesso

| Commit | Cosa |
|---|---|
| `1a7fb61` | `src/app/(public)/tickets/order/[token]/page.tsx` — 451 righe |
| `647f522` | il ritorno dal pagamento riconosce l'ordine d'ospite e lo porta ai suoi codici |
| `b595666` | «rimandami i biglietti» — 262 righe in `guest-purchase-actions.ts` |
| `6222f3f` | il gate conosce la terza superficie, e la lista chiusa si allarga |

**La credenziale e' una firma HMAC nell'indirizzo, non una sessione**, e la
verifica avviene **prima** di qualunque lettura (`verifyTicketToken`, riga 4 e
124). Il rifiuto e' `notFound()` **senza distinguere** «firma invalida» da
«ordine assente»: distinguerli farebbe della pagina un oracolo sugli
identificativi, in un repository che non ha rate limiting.

**Perche' esiste, ed e' la ragione per cui non era rimandabile.** Il gemello
`src/app/(public)/tickets/[id]/page.tsx:114-117` chiama `auth.getUser()` e
rimbalza a `/login`. I link della mail d'ordine del piano 49-05 arrivavano fin
li' e finivano contro quel muro, e il codice allegato regge **solo per chi non
blocca le immagini**. Fra 49-05 e questo piano esisteva una finestra in cui una
persona che aveva pagato non aveva nessuna strada verso cio' che aveva comprato.

## Nessun luogo, misurato e non promesso

Cinque occorrenze di termini di luogo nel file, **tre in commento** — che
spiegano perche' non ce ne sono — e **due in copy per l'utente**, dove
«indirizzo» significa *l'URL stabile del tuo ordine* e non una sede.

Le cinque `select` della pagina, elencate: `id, status, quantity, event_id,
party_id, tier_id, user_id` · `id, holder_label` · `title, slug, date` · `name` ·
`title, date, time, end_time`. **Nessuna colonna di sede, e nessun predicato di
rivelazione importato** — perche' su questa superficie la risposta e' *mai*
(`D-49-04`), quindi non c'e' niente che un predicato debba decidere.

**`buyer_email` non e' selezionato.** Stessa disciplina applicata a un dato
personale su un link fatto per essere inoltrato.

> **La ricerca di fase raccomandava l'opposto.** `D-49-04` e' piu' recente e piu'
> stretta, e vince. Rovesciata qui invece che ignorata.

## Il gate: da due superfici a tre, provato in tutte e due le direzioni

`scripts/verify-venue-surfaces.mjs` ne conosceva **due**, cablate a `:93-95`.
Ora ne conosce tre, con il **Check G**: una spazzata negativa sul codice vivo,
un'**allow-list positiva** di ogni colonna selezionata, e l'asserzione che
nessuno dei due file raggiunga il predicato di rivelazione.

La forma positiva e' il punto: una lista di termini vietati arrossisce solo i
nomi che qualcuno ha pensato a vietare, e una colonna nuova passerebbe.

**Prova per mutazione rifatta dall'orchestratore il 2026-09-06:**

```
mutazione applicata  → asserita PRIMA di leggerne l'esito
gate con mutazione   → exit 1   (arrossisce)
ripristino           → verificato con git diff --quiet
gate dopo            → exit 0   (verde)
```

L'asserzione che la mutazione sia andata a segno non e' cerimoniale: una
sostituzione che non matcha produce un verde che significa il contrario, ed e'
gia' successo in questo repository (`ai-engineering.md`, gate *prova per
mutazione*).

## La lista chiusa allargata, con la frase tirata dichiarata

`FOCUS_ROUTES` in `verify-conversion.mjs` e' una lista **chiusa**, e il check D
dice nel proprio rosso che quale delle due cose sia sbagliata *«e' una domanda
per una persona»*.

**La strada e' stata percorsa in tutte e due le direzioni**, e vale la pena
registrarlo: dichiarata `focus`, il check D arrossisce perche' la rotta non e' in
lista; portata a `default`, il check E arrossisce perche' quella forma **riserva
lo spazio di una navigazione che questa pagina non monta**.

E non montarla non e' un'omissione: **e' il punto**. La superficie si apre da una
firma senza sessione, per qualcuno che non ha un account da navigare. Montare la
navigazione significherebbe risolvere una sessione proprio sulla pagina la cui
ragione e' che non serve.

I due rossi insieme dicono qual e' la proprieta' che quella coppia sorveglia
davvero: **una schermata a scopo unico che non monta navigazione**. La frase
letterale della lista — *«one card, one action»* — e' **tirata**: qui i riquadri
sono uno per biglietto, fino a sei. Scritto accanto invece che arrotondato.

## Gate

`verify:venue-surfaces` **0** · `verify:conversion` **0** · `npm run build` **0**.

**Nessuno di questi prova che la pagina funzioni.** Non esiste un test runner per
il prodotto: i gate leggono stringhe e grafi di import, non rendono un pixel e
non aprono un ordine.

## Cosa NON e' verificato, e come si verificherebbe

**Nessuna prova comportamentale.** Aprire la pagina richiede un ordine vero e una
firma vera, cioe' righe in produzione — fuori dall'autorizzazione, che e'
`ESAURITA` dalle 15:03 di oggi.

Le procedure da eseguire quando ci sara' un ordine reale:

1. **P-ORD-1** — aprire il link d'ordine **senza sessione**, in una finestra
   pulita: la pagina rende, mostra un riquadro per biglietto, e **nessuna sede**.
2. **P-ORD-2** — alterare un carattere della firma: `notFound()`, e la risposta
   e' **identica** a quella di un ordine inesistente.
3. **P-ORD-3** — inoltrare il link a un secondo dispositivo: si apre uguale. E'
   il caso progettato (`D-49-03`, il biglietto e' al portatore).
4. **P-ORD-4** — «rimandami i biglietti» con un indirizzo che non ha comprato
   niente: la risposta **non dice** se quell'indirizzo esiste.
5. **P-ORD-5** — un ordine da sei biglietti: sei riquadri, sei codici
   **distinti**, tutti scansionabili, e la seconda scansione dello stesso
   rifiutata.

## Uscita aperta che questa fase non chiude

`event_parties.title` e' **testo libero**. Questa pagina lo stampa, ed e' giusto
che lo faccia. Ma un posto scritto dentro un titolo viaggia su una strada su cui
**nessun predicato di questo repository puo' guardare** — il gate stesso lo
stampa a ogni corsa fra le sue uscite aperte. Non e' un difetto da riparare nel
codice: e' un fatto da sapere quando si da' un nome a una serata il cui posto
deve restare segreto.
