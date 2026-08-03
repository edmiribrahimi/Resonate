# Meta-Gates — pattern trasversali

> Questi pattern valgono per OGNI intervento, qualunque sia il dominio
> primario. I gate specifici stanno nei rispettivi moduli in `.claude/rules/`.

## Pattern di analisi d'impatto

Prima di QUALSIASI modifica a codice o configurazione:

1. **Identifica il dominio primario** — quale modulo di `.claude/rules/` copre
   questo file?
2. **Controllo cross-dominio** — quali ALTRI domini sono impattati?
   - Modifica ai ruoli o al middleware → verifica l'impatto su RLS, navigazione,
     e su cosa vede un utente `pending`
   - Modifica a una migration → verifica l'impatto sulle policy esistenti, sui
     tipi in `src/types/database.ts`, e sulle query gia' scritte
   - Modifica al flusso di pagamento → verifica idempotenza, rimborsi, cron di
     riconciliazione, e cosa succede se il webhook arriva due volte
   - Modifica al check-in → verifica il comportamento **offline**, la coda di
     sincronizzazione, e l'annullamento
   - Modifica a un componente pubblico di evento → verifica che non anticipi la
     rivelazione del venue
   - Modifica a una sigla di format o a una data → verifica la pipeline
     editoriale a valle (listing, timetable, podcast, after movie) e i materiali
     gia' prodotti
   - Modifica a `CLAUDE.md` o a un modulo di `.claude/rules/` → verifica
     coerenza indice ↔ frontmatter, assenza di path morti, e rimisura il
     context budget se hai allargato un glob (`ai-engineering.md`)
3. **Classifica** — Critical / Structured / Tactical / Consultative
4. **Se Critical** → presenta l'analisi d'impatto PRIMA di agire e attendi
   validazione

## Priorita' di dominio per path

Quando piu' moduli coprono lo stesso file, vince il **piu' specifico**.

1. **Specificita' del path:** `src/lib/offline/**` (checkin-offline) vince su
   `src/app/**` (nextjs-architecture).
2. **File API sotto `src/app/api/`:** il dominio funzionale vince
   sull'architettura. `src/app/api/webhooks/sumup/route.ts` e'
   ticketing-payments, non nextjs-architecture.
3. **Conflitto:** se due gate producono requisiti contraddittori, vince il piu'
   restrittivo. Documenta il conflitto nel commit.

| Path | Modulo primario | Supplementari |
|------|-----------------|---------------|
| `src/middleware.ts`, `src/lib/supabase/middleware.ts` | access-gating | supabase-data, nextjs-architecture |
| `src/lib/rbac/**` | access-gating | nextjs-architecture |
| `src/app/api/auth/**` | access-gating | comms-analytics |
| `src/app/api/webhooks/**` | ticketing-payments | supabase-data |
| `src/app/api/cron/venue-reveal/**` | venue-secrecy | ticketing-payments, comms-analytics |
| `src/app/api/cron/**` (gli altri) | ticketing-payments | comms-analytics |
| `src/lib/offline/**` | checkin-offline | supabase-data |
| `src/app/api/tickets/checkin/**` | checkin-offline | ticketing-payments |
| `src/utils/qr.ts` | checkin-offline | access-gating |
| `supabase/migrations/**` | supabase-data | access-gating (per le policy) |
| `src/emails/venue-reveal.tsx` | venue-secrecy | comms-analytics |
| `src/emails/**` (gli altri) | comms-analytics | — |
| `src/app/(admin)/**`, `src/app/(organizer)/**` | access-gating | nextjs-architecture |
| `src/components/**` | nextjs-architecture | access-gating (se mostra dati per ruolo) |
| `CLAUDE.md`, `.claude/**` | ai-engineering | — (governa se stesso) |

## Verifica delle guardie monotone

re:sonate ha tre interruttori **a senso unico**. Per ognuno, una modifica puo'
solo renderli piu' difficili da far scattare, mai piu' facili — salvo
autorizzazione esplicita documentata nel commit:

- **`venue_reveal_sent`** — una volta partita la mail, il venue e' pubblico.
  Non esiste un annullamento.
- **Lo stato di un pagamento verso `completed`** — la riconciliazione puo'
  correggere in avanti, non far finta che un incasso non sia avvenuto.
- **La numerazione di serie di un format** — un progressivo assegnato e' gia'
  su una locandina. Si aggiunge in coda, non si rinumera.

## Controllo zero fallimenti silenziosi

Per ogni nuovo percorso d'errore o blocco `catch`:

- L'errore e' loggato con una categoria che lo distingue dagli altri?
- L'errore e' **visibile** (all'utente o all'operatore), non solo ingoiato?
- Nessun `catch` che collassa cause diverse in un unico messaggio generico.

> Il progetto ha gia' un precedente registrato in `.planning/codebase/CONCERNS.md`:
> il form newsletter cattura ogni errore con *"Qualcosa e' andato storto"*,
> rendendo indistinguibili un problema di rete, una chiave mancante e un
> indirizzo gia' iscritto. Non replicare quel pattern.

## Il gate della verifica, in un repo senza test

Non esiste un test runner per il prodotto. Questo cambia cosa significa
"verificato":

- **Non dire mai** che una modifica al prodotto e' verificata perche' "i test
  passano". Non ci sono test.
- La verifica minima e' `npm run build` (che include il typecheck).
- **Se hai toccato la persona** (`CLAUDE.md`, `.claude/**`), aggiungi
  `npm run verify:persona`. E' l'unico controllo automatico del repo, e copre
  la coerenza della persona — non la correttezza dei suoi gate.
- Per tutto cio' che tocca accesso, denaro, porta o venue, serve **una
  procedura manuale scritta**: quali passi, con quale ruolo, e cosa si deve
  osservare. Scritta, non evocata — perche' e' l'unica prova che esistera'.
