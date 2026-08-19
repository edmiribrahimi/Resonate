---
phase: 47-il-token-che-si-beve-e-si-fa-rimborsare
plan: 05
subsystem: ticketing-payments / drink-tokens
tags: [served-screen, invariant, bar-procedure]
requires: []
provides:
  - "cinque secondi su ENTRAMBE le modali di redenzione, non una"
  - "l'invariante di DRK-07 scritta accanto al codice che la regge, in due file"
affects:
  - "47-06 — il runbook cita i cinque secondi"
decisions:
  - "Le superfici con congedo a tempo sono DUE, non una: anche la modale autenticata lo aveva"
  - "Il secondo 3000 in GuestTokenDisplay resta: e' il polling dei token, non la conferma"
metrics:
  duration: "~15 minuti, 2026-08-20"
  completed: 2026-08-20
  tasks: 2 su 3 — il terzo e' dovuto
---

# Fase 47 Piano 05 — Summary

Cinque secondi invece di tre, e l'invariante che rende quella schermata una
garanzia invece di un'animazione, scritta in **due** file.

## Il piano diceva una superficie, ne ha trovate due

`RedeemConfirmationModal.tsx` — la modale per chi ha un account — porta **lo
stesso congedo a 3000 ms** di `GuestTokenDisplay.tsx`. Cambiarne solo una avrebbe
lasciato la procedura del banco vera per meta' delle serate, e la meta' sbagliata
sarebbe stata invisibile: le due modali si somigliano.

`DashboardDrinkTokens.tsx` **non ha** congedo a tempo. Verificato, non assunto —
il piano chiedeva di dirlo anche quando l'esito e' «non c'era niente».

**L'invariante regge in entrambe:** `setPhase("served")` sta **dopo** l'`await`,
misurato per posizione nel sorgente, non a occhio.

| file | 5000 | 3000 residui | `setPhase` dopo `await` |
|---|---|---|---|
| `GuestTokenDisplay.tsx` | 1 | 1 — *il polling, non la conferma* | **si** |
| `RedeemConfirmationModal.tsx` | 1 | 0 | **si** |

Il `3000` residuo e' l'intervallo di interrogazione dei token (`:972`): stessa
cifra, altro mestiere. Lasciarlo e' corretto; cambiarlo avrebbe rallentato un
polling per un motivo che non lo riguarda.

## I due commenti, e perche' il secondo conta piu' del primo

Il primo spiega **perche' cinque**: la lettura avviene al tocco, quindi la
schermata deve sopravvivere alla lettura e non alla versata. Registra anche che
il congedo manuale e' stato **valutato e scartato**, cosi' nessuno lo ripropone
credendo che sia stato dimenticato.

Il secondo e' `DRK-07`, e vale per tutta la fase: se quella schermata comparisse
prima della conferma del server, un momento di rete assente produrrebbe un drink
versato e un token mai riscattato — **il difetto della fase 47 riaperto da
un'ottimizzazione dell'interfaccia**. Il commento lo dice in quei termini, perche'
chi un giorno vorra' «rendere piu' reattiva» la modale deve leggere cosa sta
togliendo.

`npm run build` verde.

## Cosa resta dovuto

**Task 3 — la prova manuale — NON e' stata eseguita, e non e' rimandata per
comodita'.** Serve un acquisto vero: comprare un token richiede un checkout
SumUp, cioe' denaro reale. I cinque passi restano scritti nel piano e vanno
eseguiti su un dispositivo prima che questa fase si chiuda.

**Il passo che conta e' il quarto** — premere SERVE con la rete spenta e
osservare che SERVED **non** compare — perche' e' l'unica cosa che trasforma
`DRK-07` da proprieta' letta nel sorgente a proprieta' osservata.

Finche' non e' fatto, questa parte e' **verificata per lettura del codice, non
per osservazione**, e va detto con queste parole.
