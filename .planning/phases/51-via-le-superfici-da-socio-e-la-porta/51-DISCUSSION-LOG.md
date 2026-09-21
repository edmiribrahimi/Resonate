# Phase 51: Via le superfici da socio, e la porta - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-21
**Phase:** 51-via-le-superfici-da-socio-e-la-porta
**Areas discussed:** Un vecchio QR da socio alla porta, Il ruolo di chi compra, L'account di chi ha comprato, Coda offline e prova a rete spenta, Il download della lista prima della serata, Indirizzo e nome della pagina Account, Gli account esistenti e il registro degli atti

---

## Un vecchio QR da socio alla porta

| Option | Description | Selected |
|--------|-------------|----------|
| Rifiuto con frase propria | «Codice della card, non più valido: serve un biglietto» | |
| Stesso rifiuto di un codice sconosciuto | «Codice non valido» per tutti | ✓ (di fatto) |

**User's choice:** «nessuno mostrerà la membership card, perché nessuno è iscritto (oltre a qualcuno dello staff)» — nessun messaggio dedicato.

| Option | Description | Selected |
|---|---|---|
| Si cancella, con migration provata sul lab | via colonna, conio e tipo | ✓ |
| Resta, inerte | nessuna migration ora | |

| Option | Description | Selected |
|---|---|---|
| Non scansionano: sono in servizio | chi è assegnato entra perché lavora | ✓ |
| Entrano in guest list | passano dallo scanner | |

| Option | Description | Selected |
|---|---|---|
| Restano | si toglie solo la pagina | |
| Si cancellano | via anche le righe | ✓ |

**Notes:** la cancellazione delle presenze è in produzione: vincolata ai gate di `ai-engineering.md` (conteggio, cascata, chiave, autorizzazione datata).

---

## Il ruolo di chi compra

| Option | Description | Selected |
|---|---|---|
| Sì, in questa fase | migration sul lab poi produzione | ✓ |
| Resta `member` fino alla 57 | cambia con i documenti | |
| Resta `member` per sempre | nessuna migration | |

| Option | Description | Selected |
|---|---|---|
| `attendee` | chi partecipa, non collide con `guest` | ✓ |
| `guest` | collide con la guest list | |
| `buyer` | sbagliato per gli invitati | |

---

## L'account di chi ha comprato

| Option | Description | Selected |
|---|---|---|
| Biglietti e drink | biglietti, token attivi, password, email | |
| Solo i biglietti | i drink dal menu QR | ✓ |

| Option | Description | Selected |
|---|---|---|
| Sì, in una sezione chiusa «Past» | raggiungibili senza ingombrare | ✓ |
| No, solo in arrivo | un biglietto usato sparisce | |

---

## Coda offline e prova a rete spenta

| Option | Description | Selected |
|---|---|---|
| Si scartano, con una riga visibile nel registro | lo scanner lo dice | |
| Si scartano in silenzio | più semplice | ✓ |

**Notes:** resta il vincolo minimo di `meta-gates.md`: una riga di log con categoria e conteggio, nessuna superficie.

| Option | Description | Selected |
|---|---|---|
| Tu, un telefono vero, sul lab, prima e dopo | come P-50-8 | ✓ |
| Due telefoni | uno aggiornato, uno con la coda vecchia | |

---

## Il download della lista prima della serata

| Option | Description | Selected |
|---|---|---|
| Resta, solo per la guest list | gli invitati senza email si trovano per nome | ✓ |
| Sparisce del tutto | guest list solo online | |

## Indirizzo e nome della pagina Account

| Option | Description | Selected |
|---|---|---|
| /account | /dashboard resta redirect permanente | ✓ |
| Resta /dashboard | nessun redirect | |

## Gli account esistenti e il registro degli atti

| Option | Description | Selected |
|---|---|---|
| Tiene il nome | tabella interna | |
| Si rinomina in `account_acts` | coerente con il modello nuovo | ✓ |

## Claude's Discretion

- Nome e testo del pulsante di download della guest list; categoria di log per le voci scartate.
- Strada della guest list verso il telefono per l'offline (rotta esistente o nuova).
- Ordine dei piani, con le migration sul lab prima della produzione e la prova a rete spenta a chiudere.

## Deferred Ideas

- Cancellazione self-service dell'account (fase a sé).
- Barra per un `attendee` (fase 52). Parole «member/membership» nei documenti (fase 57).
