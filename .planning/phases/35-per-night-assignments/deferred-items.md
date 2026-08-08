# Fase 35 — voci fuori perimetro, aperte

> Cose accertate durante l'esecuzione di un piano che **non appartengono a quel
> piano** e che quindi non sono state corrette dove sono state trovate. Ognuna
> porta chi l'ha trovata, come, e cosa deve succedere.
>
> Ruoli, mai persone. Questo repository e' pubblico.

---

## 1. [BLOCCANTE per 35-04] `ends_at` va letto da `event_parties.date`, non da `events.date`

**Trovata da:** piano 35-02, task 2, provando la migration contro un container
`postgres:17.6` costruito con lo shim, lo schema base e tutte e 45 le migration.

**Il fatto, misurato.** `public.event_parties` ha una **propria** colonna `date`
dal 26 febbraio 2026 — `20260226300000_multi_sub_events.sql:20-27` la aggiunge e
la riempie dal genitore — **proprio perche' una sub-serata puo' stare su un
giorno solare diverso dall'evento che la contiene**. Su una serata con la
sub-serata il giorno dopo, le due letture divergono di **ventiquattro ore
esatte**:

| Espressione | Risultato |
|---|---|
| `party_end_instant(ep.date, coalesce(ep.end_time,'06:00'))` | `2026-10-12 04:00:00+00` |
| `party_end_instant(e.date,  coalesce(ep.end_time,'06:00'))` | `2026-10-11 04:00:00+00` |

**Perche' e' bloccante e non un dettaglio.** La direzione dell'errore e' quella
**insicura**: `ends_at` un giorno in anticipo e' un'assegnazione che **scade
prima della serata**, cioe' un membro dello staff rifiutato alla porta davanti a
una fila. E' l'asimmetria che `CLAUDE.md`, principio operativo 3, chiama la
peggiore delle due.

**Cosa dice il prodotto oggi, senza eccezioni.** Ogni call site TypeScript passa
la data della **serata**, mai quella dell'evento:
`src/app/(organizer)/organizer/events/[id]/review/page.tsx:164`,
`src/app/api/tickets/checkin/route.ts:438`,
`src/app/api/cron/venue-reveal/route.ts:40`,
`src/app/api/cron/event-reminders/route.ts:40`, e ogni chiamata a
`menuCloseInstant`. `public.party_end_instant` e' la meta' SQL della **stessa**
regola: nutrita con un'altra colonna, le due meta' rispondono a domande diverse
sembrando identiche — che e' esattamente il fallimento silenzioso per cui
`src/utils/datetime.ts` esiste.

**Dov'e' gia' corretto:** `supabase/migrations/20260809000000_party_assignments.sql`,
sezione 3d, con la ragione scritta accanto.

**Dov'e' ancora sbagliato:** `.planning/phases/35-per-night-assignments/35-04-PLAN.md:207`,
che istruisce il writer atomico a leggere
`public.party_end_instant(e.date, …)` con un join a `public.events`.

**Cosa deve succedere.** Chi esegue il piano 35-04 usa

```sql
public.party_end_instant(ep.date, coalesce(ep.end_time, '06:00'::time))
```

leggendo `public.event_parties ep where ep.id = p_party_id`, **senza join a
`public.events`**, e registra la correzione come deviazione nel proprio SUMMARY.

**Perche' non e' stato corretto qui.** `35-04-PLAN.md` appartiene a un'altra
onda. `ai-engineering.md`, gate *multi-agent*: due agenti che toccherebbero lo
stesso file si **sequenziano**, non si parallelizzano. La correzione e' quindi
scritta nei tre posti che chi esegue 35-04 attraversa comunque — la migration
che deve leggere, questo file, e il `35-02-SUMMARY.md`.

---

## 2. [segnalazione, fuori fase] Un path morto nell'indice della persona

**Trovata da:** `35-PATTERNS.md` (correzioni a RESEARCH.md), riconfermata qui.

Il glob `src/components/scanner/**` compare nell'indice di `CLAUDE.md` e nella
tabella di `meta-gates.md`, ma **quella directory non esiste**: il componente
vive in `src/app/(admin)/admin/scanner/ScannerClient.tsx`.

E' materia di `ai-engineering.md`, controllo **A** (path morti), **fuori scopo
per la fase 35**. Un gate agganciato a un path inesistente e' indistinguibile da
un gate assente, con l'aggravante che sembra presidiato.

**Nessuna azione presa in questa fase.** Va aperta come voce propria.
