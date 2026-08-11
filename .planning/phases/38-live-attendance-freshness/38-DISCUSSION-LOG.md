# Phase 38: Live Attendance Freshness - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-11
**Phase:** 38-live-attendance-freshness
**Areas discussed:** What travels on the channel, The sleeping screen, The freshness indicator, The update perimeter

---

## Area selection

| Option | Description | Selected |
|--------|-------------|----------|
| Cosa viaggia nel canale | Il fatto o la riga; decide l'autorizzazione e se PII passa dal canale | ✓ |
| Lo schermo che si spegne | Cosa conta come riconnessione quando il telefono va in tasca | ✓ |
| La spia di freschezza | Cosa vede lo staff e dove sta il tasto di ricarica manuale | ✓ |
| Il perimetro dell'aggiornamento | Solo le presenze della serata, o anche roster e altre superfici | ✓ |

**User's choice:** all four.

---

## What travels on the channel

| Option | Description | Selected |
|--------|-------------|----------|
| Un colpetto | Arriva solo "la lista è cambiata"; il device riscarica dall'endpoint che già redige | — |
| La riga già pronta | La riga cambiata viaggia grezza e viene applicata sul posto | — |
| Il colpetto porta il conteggio | Come il colpetto, più il numero di presenti aggiornato | — |

**User's choice:** none — the owner replied *"non ci sto capendo niente. cosa farebbe expert persona?"*

**Notes:** The question was mis-pitched — it was a technical checkpoint dressed
in domain words, and it belonged to the expert, not to the owner. Per the owner's
standing working rule (technical checkpoints are decided by the expert), the flow
was corrected mid-discussion: the remaining technical choices were decided and
declared with their reasons, and only the door-facing choice was put back to the
owner.

**Decided by Claude, with reasons stated to the owner:** the tap-only option
(D-38-01). The attendance endpoint composes and redacts through the service
client; a raw-row subscription would ship guest-list names and emails to the
client and force the redaction to be written a second time.

---

## The freshness indicator

| Option | Description | Selected |
|--------|-------------|----------|
| Un pallino e l'ora, sempre | Pallino live/non-live sempre visibile più "aggiornata 12s fa" | — |
| Silenzio, poi un avviso | Niente quando va bene; fascia quando la lista è ferma | ✓ |
| Pallino sempre, fascia se rotto | I due insieme | — |

**User's choice:** *Silenzio, poi un avviso.*
**Notes:** rationale given by the owner — the door's screen is already the
busiest in the product.

## The manual reload control

| Option | Description | Selected |
|--------|-------------|----------|
| Dentro la fascia d'avviso | Il tasto compare solo quando la lista è ferma | ✓ |
| Sempre, accanto alla serata | Tasto fisso accanto al selettore | — |
| Tirando giù la lista | Pull-to-refresh, nessun bersaglio nuovo | — |

**User's choice:** *Dentro la fascia d'avviso.*

## Conflict raised, and its resolution

The two choices together restrict LIVE-05, which asks that staff **see** whether
the list is live and how fresh it is, and **force a reload at any moment**. With
silence plus a band-only button, neither holds in the healthy case — a clean
screen is indistinguishable from a screen that has not yet noticed. This was
raised before writing anything, named as the newsletter-form silent failure moved
to the door.

| Option | Description | Selected |
|--------|-------------|----------|
| Sul contatore | Band stays quiet-then-loud; the existing `12 / 40` counter row gains "updated 12s ago" and becomes the reload control | ✓ |
| Silenzio davvero, e cambio il requisito | Keep the owner's first answer and record LIVE-05 as deliberately narrowed | — |
| Il pallino torna, minuscolo | A dot only — covers "is it live" but neither "how fresh" nor "reload at any moment" | — |

**User's choice:** *Sul contatore.* Quiet screen preserved, requirement intact,
no new element added.

---

## Claude's Discretion

Decided by Claude and declared to the owner rather than asked (D-38-01 through
D-38-08, D-38-12):

- The channel carries the fact, not the row; the reload reuses the single
  existing fetch site
- The server refuses subscription for a person not assigned to the night; the
  device does not filter
- A refused channel means "not listening", never a second verdict on the role
- One channel per selected party, closed on change
- Reconnection = network back **or** app back in the foreground; safety reload
  every 5 minutes; the band appears at 5 minutes, the point at which the safety
  reload has itself failed
- A message never delays a scan verdict
- No shared abstraction extracted between the door's offline store and the bar

Left open for the researcher: the concrete Supabase Realtime mechanism that
satisfies "no personal data on the wire" plus "server-side per-night
authorisation". The property is locked; the API is not.

## Deferred Ideas

- Attendee-list view on a tablet for whoever watches the door from inside — a
  new surface, its own phase
- Member-roster freshness — the other cause of a false refusal offline, but a
  different list, outside LIVE-01

