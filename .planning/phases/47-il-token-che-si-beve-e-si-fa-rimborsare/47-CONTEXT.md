---
phase: 47-il-token-che-si-beve-e-si-fa-rimborsare
milestone: v1.6
created: 2026-08-19
requirements: [DRK-01, DRK-02, DRK-03, DRK-04, DRK-05, DRK-05b, DRK-06, DRK-07, DRK-08]
---

# Fase 47 — contesto

## Il difetto, e perche' non e' un sospetto

**Riprodotto in laboratorio il 2026-08-19**, non dedotto. Referto completo in
[`v1.6-PHASE-47-PROBE.md`](../../v1.6-PHASE-47-PROBE.md); sonda in
`scripts/probe-drink-token-cycle.mjs`.

Il cliente controlla **due** transizioni — attiva e annulla — il barista una
sola: serve. `deactivate_drink_token` riporta il token da `active` a `purchased`
**azzerando `activated_at`**, che e' l'unica traccia di un'attivazione. Cinque
cicli lasciano il token in `purchased` senza memoria, ed e' esattamente il
predicato con cui il rimborso seleziona.

**La procedura del banco previene il ciclo** — il barista non consegna mai il
drink prima di vedere SERVED — **ma non lo rende visibile**, e i due casi
lasciano dati identici. Questa fase non aggiunge una serratura: aggiunge la
capacita' di sapere, in entrambe le direzioni, anche per difendere un barista
accusato ingiustamente.

## Il fatto che rende `DRK-04` sicuro, misurato prima di pianificare

**`activated_at` non lo legge nessuno.** Zero occorrenze in `src/` fuori dai tipi
generati, zero nelle policy, zero nei trigger, zero nelle analytics. Le uniche
scritture sono le due funzioni della migration `20260508000000`.

Cambiarne il significato — da *«attivo da»* a *«attivato l'ultima volta il»* —
**non rompe alcun lettore, perche' lettori non ce n'erano.** Ed e' anche la
ragione per cui il difetto e' rimasto invisibile: l'unica traccia era una colonna
che nessuno guardava.

## Cosa NON e' rotto, e va lasciato intatto

Misurato in laboratorio insieme al difetto. Una riparazione che rompesse una di
queste sarebbe un peggioramento:

| | |
|---|---|
| il primo `redeem_drink_token` applica | **true** |
| il secondo non fa nulla | **false** — non serve un secondo drink |
| annullare un token gia' servito | **rifiutato dal database** |
| la schermata SERVED senza conferma del server | **impossibile** — `setPhase` sta dopo l'`await` |

## Lo stato di partenza, misurato

- **I drink non hanno alcun percorso di richiesta rimborso.** `ticket_refunds`
  esiste per i biglietti (`20260227200000`); per i token c'e' solo `refunded_at`
  sulla riga. La richiesta va **costruita**, non riusata.
- **`requestRefund` dei biglietti richiede un account** (`auth.getUser()`), e i
  drink si comprano gia' da ospite. La richiesta di un token deve reggere
  **l'ospite**, con il token firmato come credenziale — come fa gia'
  `redeemDrinkTokenGuest`.
- **L'emissione e' gia' dietro `STAFF_MANAGE`** (`refund-actions.ts:162, 409,
  495`): admin e organizer. `DRK-03` la **riafferma**, non la costruisce.
- **`/admin/finance` non esiste piu'.** La revisione di una richiesta va dove
  stanno gia' i drink di una serata: `admin/events/[id]/drinks`.
- **Un solo cron muove denaro**: `refund-expired-tokens` (`:238`).
  `reconcile-refunds` allinea soltanto lo stato e **resta**.

## La domanda aperta che questa fase chiude

La pulizia cancella i token `redeemed` e `refunded` **24 ore** dopo la chiusura
del menu (`refund-expired-tokens/route.ts:280-318`); la finestra di richiesta e'
**72**. Vanno guardate insieme: una finestra che sopravvive a cio' che deve
leggere e' una finestra che a volte non trova nulla, e il modo in cui fallisce e'
silenzioso.

## Vincoli di dominio che valgono per ogni piano

- **Zero fallimenti silenziosi.** Non esiste alcun tracciamento degli errori:
  nessun fallimento raggiunge un essere umano da solo. Ogni percorso nuovo qui
  deve avere un **effetto osservabile**, non solo una riga di log.
- **Nessun test runner.** La verifica e' `npm run build` piu' una procedura
  manuale scritta passo per passo. Un verde non e' una prova.
- **`.planning/` e' pubblico.** Questi documenti nominano **ruoli**, mai persone.

## Ordine dei piani

| piano | onda | cosa | requisiti |
|---|---|---|---|
| 47-01 | 1 | la migration: la traccia sopravvive, le attivazioni si contano | DRK-04 |
| 47-05 | 1 | la schermata SERVED: 5 secondi e l'invariante | DRK-06, DRK-07 |
| 47-06 | 1 | il runbook del bar | DRK-08 |
| 47-02 | 2 | il cron smette di rimborsare, e la pulizia non anticipa la finestra | DRK-01 |
| 47-03 | 2 | la richiesta di rimborso di un token, anche da ospite | DRK-02 |
| 47-04 | 3 | la decisione: automatico se mai attivato, manuale se attivato | DRK-05, DRK-05b, DRK-03 |

**47-01 apre l'onda 1 da solo fra i tre che scrivono schema**, e 47-04 chiude
perche' senza il conteggio la sua regola non ha il dato su cui decidere.

> ⚠ **`DRK-04` distrugge la possibilita' di rimisurare il difetto.** Dopo 47-01
> il comportamento vecchio non e' piu' osservabile. Per questo la prova e' stata
> presa **prima** — e per questo 47-01 la riesegue, dove le stesse righe devono
> dire il contrario.
