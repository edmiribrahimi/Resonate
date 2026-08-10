---
phase: 37-manual-venue-reveal
plan: 08
subsystem: venue-page-out-of-public
tags: [route-group, capability-routes, verify-routes, venue-secrecy, access-gating, allow-list]

requires:
  - phase: 37-manual-venue-reveal
    provides: "37-01 — la riga CAP.VENUE_REVEAL in capability-routes.ts, che questo piano NON ha toccato"
  - phase: 37-manual-venue-reveal
    provides: "37-03 — lo schema vivo, e la dichiarazione di quale delle due migration e' applicata"
provides:
  - "La scheda della sede sotto (admin)/admin/(work)/venues/[slug], con la propria guardia organizer.access"
  - "Nessun indirizzo pubblico serve piu' la scheda di una sede: /venues/<slug> non esiste"
  - "La riga /admin/venues/[slug] in capability-routes.ts, accanto alla sorella /admin/venues"
  - "PUBLIC_ALLOW che non dichiara piu' pubblico un file inesistente"
  - "revalidatePath della update di una sede che per la prima volta nomina un percorso reale"
affects: [37-06, 37-12, 37-13]

tech-stack:
  added: []
  patterns:
    - "Una rotta dinamica nuova non e' vista da next build: l'unico controllo che la vede e' il censimento da disco"
    - "Spostare un file fuori da (public) chiude un indirizzo, mai un percorso di dati"
    - "Una voce di allow-list che non nomina un file su disco e' un controllo diventato timbro"
    - "Verificare una modifica con una patch temporanea su un file di un altro piano, e revertirla prima del commit, invece di duplicarne il lavoro"

key-files:
  created:
    - src/app/(admin)/admin/(work)/venues/[slug]/page.tsx
  modified:
    - src/app/(admin)/admin/(work)/venues/page.tsx
    - src/lib/routes/capability-routes.ts
    - scripts/verify-routes.mjs
    - src/app/(admin)/admin/venues/actions.ts
  deleted:
    - src/app/(public)/venues/[slug]/page.tsx

key-decisions:
  - "La guardia di pagina chiede organizer.access, come la sorella, e non catalogue.manage: la raggiungibilita' e' una domanda diversa dalla scrittura"
  - "MobileNav tolto dalla pagina: (work)/layout.tsx lo monta gia' per tutto il gruppo, tenerlo ne avrebbe disegnati due"
  - "Il predicato role === master || organizer sull'edit resta invariato: oggi e' implicato dalla capability, e restringerlo sarebbe cambiare un verdetto che questo piano non possiede"
  - "Il filtro di trattenimento degli eventi RESTA dopo la revoca: il titolo su una sede non e' il titolo su una serata a quella sede"
  - "events/[slug]/page.tsx:770 NON e' stato toccato: e' di 37-06, che lo riscrive per intero. Verificato con patch temporanea e revert"

requirements-completed: []

duration: ~55min
completed: 2026-08-10
---

# Fase 37 Piano 08: la scheda della sede esce dal pubblico — Summary

**La scheda di una sede non ha più un indirizzo pubblico: il file è sotto `(work)`, ha la sua riga nella mappa e la sua guardia, e la allow-list non dichiara più pubblico un file che non esiste. Quello che questo piano *non* ha fatto — e che è il motivo per cui è scritto in grassetto — è chiudere la lettura anonima di `public.venues`: quella è ancora aperta in produzione.**

## Cosa è stato costruito

| Cosa | Dove |
|---|---|
| La scheda della sede, sotto la superficie di lavoro | `src/app/(admin)/admin/(work)/venues/[slug]/page.tsx` |
| La riga che la rende raggiungibile | `src/lib/routes/capability-routes.ts:248-283` (`CAP.ORGANIZER_ACCESS`) |
| La allow-list che non mente più | `scripts/verify-routes.mjs:140-150` |
| Il link della sorella, che non porta più a un 404 | `src/app/(admin)/admin/(work)/venues/page.tsx:82` |
| Il `revalidatePath` che nomina un percorso reale | `src/app/(admin)/admin/venues/actions.ts:219-243` |

`src/app/(public)/venues/[slug]/page.tsx` **non esiste più** — rimosso con `git rm`, e git registra lo spostamento come rinomina.

## Il punto che non va lasciato implicito

**Spostare `/venues` non ha chiuso l'indirizzo.** È il pitfall P3 della ricerca,
scritto perché è esattamente l'errore che questo lavoro invita a fare.

- Il route group sceglie **dove atterra una richiesta**. La RLS decide **quali
  righe tornano** (`CLAUDE.md` principio 2).
- In produzione, oggi, `venues_select_public` è ancora `using (true)`: la
  migration che la revoca — `supabase/migrations/20260810161000_venues_read_narrowed.sql`,
  scritta dal piano 37-02 — **non è applicata** (37-03-SUMMARY, opzione C del
  proprietario: una migration su due). `public.venue_for_parties` non esiste
  nello schema vivo.
- Quindi nome, indirizzo e link Maps di una sede restano leggibili **con la sola
  chiave anonima, senza sessione**, per chi interroga PostgREST direttamente. Il
  todo `secret-venue-address-readable-by-anon.md` resta aperto dopo questo piano.

La prova che conta per quel todo è la sonda anonima del piano 37-13 — `curl`
sulla pagina **e** query per chiave primaria — non il build e non questo
riepilogo.

## Verifica

Non esiste un test runner per il prodotto: nessuna riga qui sotto è
"verificata perché i test passano".

| Comando | Esito | Nota |
|---|---|---|
| `npm run verify:routes` | **verde** | 27 pattern (25 sotto `/admin`), 25 pagine censite, 61 literal `revalidatePath` letti, 0 offender, 4 voci in `PUBLIC_ALLOW` |
| `npm run verify:capabilities` | **5/5 verde, 0 warning** | in **sola lettura** contro produzione (Management API, `read_only`), 13 chiavi, 28 grant. La riga `venue.reveal` del piano 37-01 è invariata |
| `node scripts/verify-routes.mjs --print-patterns` | eseguito | usato per **misurare** l'assenza di ambiguità: nessun altro pattern a 3 segmenti con un dinamico in terza posizione |
| `npm run build` | **verde solo con una patch temporanea** — vedi sotto | `/admin/venues/[slug]` compare fra le rotte dinamiche; `/venues/[slug]` non compare più |

Per `verify:capabilities` è stato copiato `.env.local` nel worktree, come il
`.gitignore` del repo prevede esplicitamente alla riga 77, e **rimosso subito
dopo**. Lo script esegue solo query `read_only: true`: nessuna scrittura in
produzione, nessuna migration applicata.

### Verifica manuale, da fare — non eseguita qui

Nessun server è stato avviato e in produzione non esistono sessioni `organizer`
né `staff` (37-13 lo registra come voce propria). Restano da osservare:

1. Con sessione **master**: `/admin/venues` → cliccare una riga → si apre
   `/admin/venues/<slug>` e mostra la scheda (nome, indirizzo, eventi non
   trattenuti). **La scheda non deve essere vuota**: se lo fosse, i due insiemi
   `organizer.access` e `staff.manage` avrebbero smesso di coincidere.
2. Con sessione **master**: `/venues/<slug>` → **404**.
3. Senza sessione: `/admin/venues/<slug>` → respinto dal middleware.
4. Con sessione **master**: modificare una sede dal bottone di edit → la scheda
   si aggiorna (era il `revalidatePath` che prima non nominava nulla).

## Deviazioni dal piano

### 1. `[Regola 3 — blocco] Il link della sorella portava a un 404`

- **Trovata in:** Task 1
- **Problema:** `(work)/venues/page.tsx:80` linkava `/venues/${venue.slug}`.
  Dopo lo spostamento è l'unica superficie da cui queste schede si aprono, e
  puntava a un indirizzo che nessuna rotta serve. Con `typedRoutes: true` è
  anche un errore di tipo, quindi bloccava il build.
- **Fatto:** href a `/admin/venues/${venue.slug}`, con il commento accanto che
  dice perché.
- **File fuori da `files_modified`, non di 37-05 né di 37-06.**
- **Commit:** `ab0c0c4`

### 2. `[Regola 1 — bug] Il revalidatePath della update non ha mai nominato un percorso reale`

- **Trovata in:** Task 2
- **Problema:** `admin/venues/actions.ts:229` chiamava
  `revalidatePath(`/venues/${venueId}`)` — un **id** dove va uno **slug**. La
  rotta è sempre stata per slug, quindi quella riga non invalidava niente né
  prima né dopo lo spostamento: una no-op con la faccia di una invalidazione.
  Se ne accorge `verify:routes` solo ora, perché la voce `/venues/[slug]` in
  `PUBLIC_ALLOW` la copriva.
- **Fatto:** `revalidatePath(`/admin/venues/${slug}`)`, con lo slug letto dalla
  `update` via `.select("slug").single()`.
- **Effetto collaterale voluto, Regola 2:** `.update().eq()` senza riga
  corrispondente non restituisce errore, quindi una scrittura rifiutata dalla
  RLS o rivolta a una sede cancellata rispondeva `{ success: true }` senza
  cambiare nulla. Con `.single()` diventa `PGRST116` e un lancio. Qui non c'è
  error tracking: una scrittura che non fa niente in silenzio non raggiunge
  nessuno.
- **File fuori da `files_modified`, non di 37-05 né di 37-06.**
- **Commit:** `d50183e`

### 3. La mitigazione di pagina, riscritta senza dichiarare deployato ciò che non lo è

Il piano chiedeva di dire «la revoca c'è». **Non è vero in produzione**, ed è la
stessa distinzione che 37-03 ha già pagato per tenere. Il paragrafo riscritto
dice: la revoca **è scritta** in `20260810161000_venues_read_narrowed.sql`,
**non è ancora applicata**, e il filtro resta comunque perché risponde a una
domanda che la revoca non copre — chi legge questa pagina ha titolo sul
catalogo delle sedi, non su una serata a quella sede.

Le due frasi vietate dai criteri di accettazione (`scheduled for phase 37`,
`The real fix is`) non compaiono più.

## Blocco cross-piano — da leggere prima del merge

`npm run build` **non passa su questo branch da solo**, e per un solo punto:

```
./src/app/(public)/events/[slug]/page.tsx:770
Type error: Type '`/venues/${string}`' is not assignable to type 'UrlObject | RouteImpl<`/venues/${string}`>'.
```

Quel file è **di 37-06**, che nel suo Task 2 riscrive per intero il blocco
`:765-788` e ha fra i criteri di accettazione *«Il file non contiene più
`href={`/venues/`»*. La ricerca (§ B.5 punto 5) aveva assegnato la conseguenza
«al piano»; la pianificazione l'ha poi collocata in 37-06, che la esegue.

**Scelta fatta, e la ragione:** non duplicare quella modifica. Toccare le stesse
righe che 37-06 riscrive produce un conflitto di merge su un lavoro che è già
di qualcun altro. Per avere comunque la prova che *questo* piano compila, la
riga è stata neutralizzata con una patch temporanea (il `<Link>` reso `<p>`), il
build è passato — `✓ Compiled successfully`, `/admin/venues/[slug]` presente fra
le rotte dinamiche, `/venues/[slug]` assente — e la patch è stata **revertita
con `git checkout -- <file>` prima di ogni commit**. Il file di 37-06 in questo
branch è byte-identico all'originale.

**Conseguenza operativa: 37-08 non va deployato senza 37-06.** Un build rosso
blocca Vercel, quindi il guasto è rumoroso e non spedisce niente — ma va
sequenziato, non scoperto.

## Debito lasciato aperto, e a chi tocca

1. **`.claude/rules/venue-secrecy.md:40`**, gate *percorsi enumerati*, elenca
   ancora `venues/[slug]/page.tsx` fra i punti da cui l'indirizzo può uscire. Il
   file esiste, a un indirizzo diverso e dietro una capability. **Il modulo è di
   37-06**, che lo riscrive nello stesso commit del livello 2: la rienumerazione
   va fatta lì, non qui, e questa riga esiste perché non si perda.
2. **La lettura anonima di `public.venues` resta aperta** finché
   `20260810161000_venues_read_narrowed.sql` non è applicata. Non è debito di
   questo piano: è il perimetro di 37-02 e la sua applicazione è una decisione
   del proprietario.
3. **Nessuna prova con un `organizer` vero.** Che un organizer approvato apra la
   scheda e un `member` venga respinto non è osservabile oggi — in produzione
   non esistono sessioni `organizer` né `staff`. Registrato in 37-13.

## Superficie di rischio

Nessun percorso nuovo verso un indirizzo di sede: la pagina mostra le stesse
colonne di prima a un pubblico **più stretto**, e non legge né scrive
`venue_reveal_sent`, `venue_revealed_at` o `venue_secret_hint_reveal_hours`. La
guardia monotona è intatta e nessuna rivelazione può essere anticipata da qui.

Il filtro di trattenimento è invariato nel predicato e nei casi limite: tutti
decisi verso il trattenere.

## Self-Check: PASSED

- `src/app/(admin)/admin/(work)/venues/[slug]/page.tsx` — presente su disco
- `src/app/(public)/venues/[slug]/page.tsx` — assente su disco, come richiesto
- `src/app/(admin)/admin/(work)/venues/[slug]/` contiene **solo** `page.tsx`
- `capabilities.has(CAP.ORGANIZER_ACCESS)` e `redirect("/dashboard")` presenti nel file
- `grep -c "(public)/venues" scripts/verify-routes.mjs` → 0
- `/admin/venues/[slug]` compare una volta in `capability-routes.ts`, e `/admin/venues` è ancora lì
- `src/app/(public)/events/[slug]/page.tsx` — invariato rispetto a `HEAD~2`
- commit `ab0c0c4` e `d50183e` presenti in `git log`
