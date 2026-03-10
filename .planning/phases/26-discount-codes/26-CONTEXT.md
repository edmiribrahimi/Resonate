# Phase 26: Discount Codes - Context

**Gathered:** 2026-03-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Discount codes for ticket purchases: organizers create codes per party (applying to all tiers or specific tiers), buyers enter codes during checkout for discounted pricing. Includes CRUD for organizers, input field in purchase flow, case-insensitive validation, usage limits, and SumUp integration with discounted amount.

</domain>

<decisions>
## Implementation Decisions

### Code Structure
- Entità separata: tabella `discount_codes` (NOT fields on ticket_tiers)
- Un codice può applicarsi a tutti i tier del party OPPURE a tier specifici
- Un solo codice per acquisto (no stacking)
- Validazione case-insensitive (LOWER())
- Codice rifiutato se prezzo risultante = €0 (SumUp minimum €1.00)

### Code Properties
- Organizer configura per codice: code string, discount type (percentage/fixed), discount amount, optional max uses, active toggle
- Scope: per-party con associazione opzionale a tier specifici
- Comunicazione codici: passaparola (no UI per il buyer per scoprirli)

### Buyer Experience
- Campo "Hai un codice sconto?" collapsible sotto TierSelection
- Dopo inserimento codice valido: tutti i tier applicabili mostrano prezzo barrato + prezzo scontato
- Prezzo scontato visibile su OGNI tier nella lista (non solo dopo Buy)
- Un solo codice alla volta — nessun stacking

### Organizer CRUD
- Gestione codici nella stessa pagina dei tier (/organizer/events/[id]/tickets/)
- Sezione dedicata sotto i tier per creare/editare/eliminare codici sconto

### Sales Tracking
- Ticket record salva `discount_code_id` per tracciabilità
- Sales dashboard mostra uso codici sconto

### Claude's Discretion
- Layout esatto della sezione CRUD codici (cards, lista, form inline)
- Design del feedback quando codice è valido/invalido/esaurito
- Come mostrare i codici sconto nel sales dashboard (colonna extra o sezione dedicata)
- Schema relazione discount_codes ↔ ticket_tiers (junction table o nullable tier_id)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `AddTierForm.tsx` — Pattern per form di creazione tier (può essere replicato per codici)
- `TierCard.tsx` — Pattern per card con edit/delete (può essere replicato per codici)
- `TierSelection.tsx` — Componente buyer-side dove aggiungere input codice sconto
- `SumUpCheckoutModal.tsx` — Modal pagamento (riceve prezzo, non serve modificare il modal)

### Established Patterns
- Server actions in `actions.ts` per CRUD (createTier, updateTier, deleteTier)
- `purchaseTicket()` server action crea SumUp checkout con amount — intercept point per applicare sconto
- `reserve_ticket()` RPC atomica per creare ticket — serve aggiungere `discount_code_id` param
- Chain-based tier availability in `computeTierStatuses()`

### Integration Points
- `purchaseTicket()` in `/organizer/events/actions.ts` — validare codice e calcolare prezzo scontato
- `reserve_ticket()` RPC — aggiungere discount_code_id al record ticket
- SumUp `createCheckout()` — passare importo scontato
- Webhook handler — nessuna modifica (usa amount dal checkout)
- Sales page — mostrare uso codici
- Database: nuova tabella `discount_codes`, nuova colonna `tickets.discount_code_id`

</code_context>

<specifics>
## Specific Ideas

- Prezzo barrato con prezzo scontato verde accanto (come e-commerce classico)
- "Hai un codice sconto?" come sezione collapsible (non invadente per chi non ha codici)
- Feedback immediato alla validazione: verde per valido, rosso per invalido/esaurito

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 26-discount-codes*
*Context gathered: 2026-03-10*
