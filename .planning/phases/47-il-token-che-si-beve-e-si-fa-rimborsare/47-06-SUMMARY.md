---
phase: 47-il-token-che-si-beve-e-si-fa-rimborsare
plan: 06
subsystem: comms / bar-procedure
tags: [runbook, bar, task-section]
requires:
  - "47-05 — i cinque secondi, che il runbook cita"
provides:
  - "47-BAR-RUNBOOK.md — quattro sezioni, pronte per essere montate in TASK alla fase 53"
affects:
  - "53 (TASK) — lo monta"
decisions:
  - "Una quinta regola aggiunta rispetto al piano: non premere SERVE per gentilezza mentre il cliente e' in coda"
metrics:
  duration: "~15 minuti, 2026-08-20"
  completed: 2026-08-20
  tasks: 1 su 2 — il secondo e' dovuto
---

# Fase 47 Piano 06 — Summary

La procedura del banco esiste scritta. Quattro sezioni, nessun nome di persona.

## Le quattro sezioni

1. **Il gesto** — attiva, tocchi tu, leggi SERVED, poi versi.
2. **Perche' l'ordine conta** — e' la sezione che tiene in piedi le altre tre.
3. **Quando SERVED non compare** — non versare; la rete puo' mancare e lo schermo
   che torna indietro e' il sistema che si comporta bene, non un guasto.
4. **Cosa non fare** — non accettare uno schermo mostrato gia' fermo su SERVED.

## La sezione 2 e' scritta in due direzioni, di proposito

Un runbook che dicesse solo *«non versare prima, o qualcuno beve gratis»* si
legge come un sospetto verso chi lo riceve — ed e' il modo piu' rapido perche'
una procedura venga seguita male. La sezione dice **entrambe le cose**: che un
abuso ora si puo' vedere, **e** che chi sta al banco puo' finalmente dimostrare
di aver lavorato bene, invece di doverlo sostenere a parole.

E' la stessa ragione per cui in 47-04 il conteggio si mostra come numero e non
come giudizio.

## Una regola in piu' rispetto al piano

**Non premere SERVE per gentilezza mentre il cliente e' ancora in coda.** Non era
nel piano, ed e' emersa scrivendo la sezione 4: un token servito **non si puo'
piu' annullare** — misurato in laboratorio, il database rifiuta. Se quella
persona poi non ritira il drink ha pagato per niente, e servira' una richiesta di
rimborso da esaminare a mano.

E' l'errore **speculare** a quello che tutta la fase 47 combatte, e nasce da una
buona intenzione invece che da una cattiva: per questo va scritto, o nessuno lo
prevede.

## Cosa resta dovuto

**Task 2 — la lettura da parte di chi quel turno lo fa — non e' stata eseguita.**
La domanda da porre e' una sola: *cosa fai se tocchi e SERVED non compare?* Se la
risposta non e' «non verso», e' la **sezione 3** a essere scritta male, non la
persona a non aver capito.

Un runbook non verificato e' una supposizione su cosa sia chiaro.
