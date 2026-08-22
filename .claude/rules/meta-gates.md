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
| `src/app/api/auth/**`, `src/app/(auth)/**` | access-gating | comms-analytics |
| `src/app/(admin)/**` | access-gating | nextjs-architecture, ticketing-payments |
| `src/app/api/webhooks/**` | ticketing-payments | supabase-data |
| `src/lib/venue-reveal/**` | venue-secrecy | comms-analytics, ticketing-payments |
| `src/app/api/cron/venue-reveal/**` | venue-secrecy | ticketing-payments, comms-analytics |
| `src/app/api/cron/**` (gli altri) | ticketing-payments | comms-analytics, time-and-scheduling |
| `src/utils/formatTime.ts`, `vercel.json` | time-and-scheduling | ticketing-payments |
| `src/components/media/**`, `src/app/**/media/**`, `src/app/(public)/gallery/**` | media-and-storage | venue-secrecy, access-gating |
| `src/app/**/tickets/**`, `src/app/**/drinks/**`, `src/app/**/sales/**`, `src/app/**/payment/**`, `src/app/**/guest-list/**` | ticketing-payments | access-gating, nextjs-architecture, venue-secrecy (dal 2026-08-22: la pagina del biglietto porta il venue) |
| `src/app/(public)/events/**` | venue-secrecy | ticketing-payments, nextjs-architecture |
| `src/lib/offline/**` | checkin-offline | supabase-data |
| `src/app/api/tickets/checkin/**` | checkin-offline | ticketing-payments |
| `src/app/api/membership/**` | checkin-offline | access-gating |
| `src/app/**/scanner/**`, `src/components/scanner/**` | checkin-offline | access-gating, nextjs-architecture |
| `src/app/(admin)/door/**` | checkin-offline | access-gating, nextjs-architecture |
| `src/utils/qr.ts` | checkin-offline | access-gating |
| `supabase/migrations/**` | supabase-data | access-gating (per le policy) |
| `src/emails/venue-reveal.tsx` | venue-secrecy | comms-analytics |
| `src/emails/**` (gli altri) | comms-analytics | — |
| `src/app/api/newsletter/**` | comms-analytics | nextjs-architecture |
| `src/app/**/venues/**`, `src/components/venues/**`, `src/components/events/**` | venue-secrecy | nextjs-architecture, access-gating |
| `src/components/**` (gli altri) | nextjs-architecture | access-gating (se mostra dati per ruolo) |
| `src/app/(public)/**`, `src/app/(members)/**`, `src/app/*.tsx`, `src/app/*.ts` (gli altri) | nextjs-architecture | — |
| `CLAUDE.md`, `.claude/**` | ai-engineering | — (governa se stesso) |

**Questa tabella e' verificata**, dal controllo **G** di `npm run verify:persona`:
per ogni riga, il modulo primario dichiarato deve **caricarsi davvero** sui file
che la riga copre. Fino alla v1.4 non lo era, e aveva gia' derivato: la riga
`src/app/(admin)/**` dichiarava `access-gating` primario mentre il frontmatter
di quel modulo non lo agganciava. Una tabella che descrive un routing che non
esiste e' peggio di nessuna tabella: fa credere che qualcuno stia controllando.

**La porta ha due indirizzi**: uno sotto `admin/scanner/`, dove vive la sua
implementazione, e uno a `/door`, che e' una pagina sottile (fase 39, STAFF-04).
La riga per il secondo esiste perche' la sola riga `src/app/(admin)/**`
caricherebbe li' `access-gating` e `nextjs-architecture` e **non** il modulo che
porta i gate dell'offline — e un gate che non si carica e' indistinguibile da un
gate assente.

I sei moduli **senza `paths:`** — `production-calendar`,
`brand-visual-system`, `sound-manifesto`, `venue-acquisition`,
`legal-compliance`, `community-membership` — non compaiono qui per definizione:
non hanno un path, si consultano a mano.

## Verifica delle guardie monotone

re:sonate ha tre interruttori **a senso unico**. Per ognuno, una modifica puo'
solo renderli piu' difficili da far scattare, mai piu' facili — salvo
autorizzazione esplicita documentata nel commit:

- **`venue_reveal_sent`** — una volta partita la mail, il venue e' **noto a chi
  ha comprato**. Non esiste un annullamento. Dal 2026-08-22 *pubblico* e' la
  parola sbagliata, e la correzione e' la regola: la rivelazione non mette
  l'indirizzo su una superficie aperta a chiunque, in nessun momento.
- **Lo stato di un pagamento verso `completed`** — la riconciliazione puo'
  correggere in avanti, non far finta che un incasso non sia avvenuto.
- **La numerazione di serie di un format** — un progressivo assegnato e' gia'
  su una locandina. Si aggiunge in coda, non si rinumera.

## Controllo zero fallimenti silenziosi

Per ogni nuovo percorso d'errore o blocco `catch`:

- L'errore e' loggato con una categoria che lo distingue dagli altri?
- L'errore e' **visibile** (all'utente o all'operatore), non solo ingoiato?
- Nessun `catch` che collassa cause diverse in un unico messaggio generico.

**E c'e' un vincolo in piu', verificato il 2026-08-05: non esiste alcun error
tracking.** `package.json` non ha dipendenze di monitoraggio, quindi **nessun
errore di produzione raggiunge un essere umano da solo**. I quattro cron girano
di notte, il webhook dei pagamenti gira quando gira, e se falliscono non lo sa
nessuno finche' qualcuno non nota l'effetto.

Finche' resta cosi', "loggare l'errore" **non e' sufficiente**: il log e' un
posto dove nessuno guarda. Un fallimento che conta deve avere un **effetto
osservabile** — visibile all'utente, allo staff sul posto, o come conseguenza
misurabile nei dati. E quando si aggiunge un percorso critico senza
osservabilita', **va detto**, invece di lasciar credere che qualcuno se ne
accorgera'.

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
