# Fase 50 — voci differite, trovate durante l'esecuzione

Cose scoperte mentre si eseguiva un piano, **fuori dal perimetro del task che le
ha trovate**. Non sono state corrette li': sono scritte qui perche' qualcuno
decida dove vanno.

---

## ~~D-50-01 lascia scoperto `scripts/rls-baseline.mjs`~~ — ASSORBITA

> **CHIUSA dal piano 50-02, 2026-09-21**, nello stesso commit della migration che
> la rendeva vera — che e' esattamente cio' che D-50-28 chiede. `PERSONA_STATUSES`
> e' stata rimossa, `PERSONA_LABELS` porta i quattro ruoli piu' `anon` e
> `authenticated/no-profile`, `PERSONA_SQL` non seleziona piu' la colonna e
> `resolvePersonas` etichetta per ruolo. Le personas passano da quattordici a sei,
> e cio' che si perde con la seconda asse — la coppia `organizer/pending`, l'unica
> che distingueva P1 da P3 — e' dichiarato nel docblock invece di sparire in
> silenzio: non e' una riga che la matrice smette di coprire, e' una riga che
> nessun database puo' piu' contenere.

**Trovata:** piano 50-01, task 2 (2026-09-21).
**Fuori perimetro perche':** il task dichiara `scripts/container/seed.mjs` e nient'altro.

`scripts/container/seed.mjs` non nomina piu' `profiles.status`, ma il modulo da
cui importa continua a farlo, e in tre punti che la migration dell'onda 1 rende
falsi:

| File:riga | Cosa contiene | Cosa succede dopo la migration |
|---|---|---|
| `scripts/rls-baseline.mjs:674` | `export const PERSONA_STATUSES = ['approved','pending','rejected']` | resta esportato e non lo importa piu' nessuno |
| `scripts/rls-baseline.mjs:680` | le etichette delle persone, `ruolo/stato` | etichette su un asse che non esiste |
| `scripts/rls-baseline.mjs:742-746` | `resolvePersonas`: `select role, status … where status in ('approved','pending','rejected') group by role, status` | **`42703`**: la colonna non esiste, e il banco di prova del container si ferma qui |

La terza riga e' quella che conta: e' una `select` su una colonna cancellata, e
fallisce. `50-02` aggiorna `scripts/rls-baseline-compare.mjs` (il testo del
predicato inciso nella linea di base) ma **non** `rls-baseline.mjs`.

**Chi la chiude:** da decidere — il piano che porta la migration (onda 1) e' il
posto naturale, perche' D-50-28 vuole il gate aggiornato **nello stesso commit**
della cosa che cambia.

**Perche' non e' stata chiusa qui:** `rls-baseline.mjs` e' la matrice delle
sonde, non un banco di semina; toccarla dentro un task che dichiara un altro
file avrebbe significato modificare un gate senza che nessun criterio di
accettazione lo guardasse.

---

## La CHIAVE `membership.active` resta nel catalogo, e va tolta con la costante TypeScript

**Trovata:** piano 50-02, task 1 (2026-09-21).
**Fuori perimetro perche':** chiuderla qui avrebbe richiesto di toccare `src/`, che
il piano 50-02 esclude per intero (`git diff --stat` senza modifiche sotto `src/`).

Il piano 50-02 dichiara che `membership.active` *«si CANCELLA dal catalogo, non si
allarga»*. Cancellata e' stata **meta'**: le **quattro concessioni** in
`private.role_capabilities` (nessun ruolo la tiene piu'), non la **chiave** in
`private.capabilities`.

La ragione e' meccanica e verificata leggendo il gate:
`scripts/verify-capabilities.mjs` confronta `private.capabilities` con l'oggetto
`CAP` di `src/lib/capabilities/keys.ts` **in entrambe le direzioni** — controllo 0
(`EXPECTED_KEY_COUNT`, asserito su TS **e** su DB con una costante sola),
controllo 1 (TS↔DB) e controllo 3 (SRC↔DB). Togliere la riga di catalogo mentre
`CAP.MEMBERSHIP_ACTIVE` vive ancora in TypeScript renderebbe quel gate **rosso**
fino al piano che tocca il codice — ed e' precisamente cio' che D-50-28 vieta.

| Dove | Cosa | Chi la toglie |
|---|---|---|
| `private.capabilities` | la riga `membership.active` | il piano che smonta le superfici |
| `src/lib/capabilities/keys.ts:300,395` | `CAP.MEMBERSHIP_ACTIVE` e la sua descrizione | idem |
| `src/lib/routes/capability-routes.ts:471` | la voce `scope: "table"` (il `Record` e' totale: senza di lei `npm run build` fallisce) | idem |
| `src/lib/media/may-upload.ts:291` | `if (!ctx.capabilities.has(CAP.MEMBERSHIP_ACTIVE)) return false` | idem |
| `scripts/verify-capabilities.mjs` | le quattro righe `'membership.active': 'REFUSED'` e `EXPECTED_KEY_COUNT` 17 → 16 | idem, **stesso commit** |

**Nessun comportamento cambia quando arrivera'.** L'arm 2 di `mayUploadToParty`
e' gia' morto dal 2026-08-08 (interroga una tabella `attendance` che non esiste,
`may-upload.ts:265-281`), e con le concessioni cancellate `has_capability`
risponde comunque `false` a chiunque.

---

## Due gate rossi PRE-ESISTENTI, non toccati dal 50-02

**Trovati:** piano 50-02, corsa di `npm run verify` (2026-09-21).
**Fuori perimetro perche':** vivono in `src/`, e il piano 50-02 non tocca `src/`
(`git diff --name-only` non porta un solo file sotto `src/`). Nessuno dei due e'
stato reso rosso da questa onda.

| Gate | Cosa dice |
|---|---|
| `verify:touch-targets` | tre elementi senza altezza minima dichiarata: `GuestTokenDisplay.tsx:689` e `:702` (due `<button>`), `src/emails/ticket-order.tsx:231` (un `<a>`) |
| `verify:venue-surfaces` | G2 — `src/app/(public)/payment/callback/actions.ts` seleziona `{id, status, sumup_checkout_id, ticket_id}`; l'insieme autorizzato e' `{id, status, ticket_id}` |

Il secondo e' su un percorso di rivelazione, quindi **non e' debito estetico**:
l'elenco positivo esiste perche' una colonna che non si legge non si puo'
stampare. Va guardato da chi possiede quella superficie, e il modo di chiuderlo
e' correggere la `select`, mai allargare l'asserzione.

---

## `src/lib/routes/next-redirect.ts:72-73` nomina righe che non esistono piu'

**Trovata:** piano 50-06, task 3 (2026-09-21).
**Fuori perimetro perche':** quel file non e' nei `files_modified` di 50-06, e il
file stesso dichiara che **aggiungere una voce a quella allow-list e' una
decisione d'accesso**: non e' un file su cui passare per sistemare un commento
mentre altri piani della stessa onda lavorano vicino.

Il docblock dell'allow-list dei `?next=` spiega due voci nominando per riga i
file che le producono, e 50-06 ha cancellato due di quei riferimenti:

| Voce dell'allow-list | Prosa che la spiega | Cosa e' cambiato |
|---|---|---|
| `/events/<slug>` | *«prodotta da `RsvpButton.tsx:35` e `TierSelection.tsx:224`, inoltrata da `register/page.tsx:45`»* | `register/page.tsx` **e' stato cancellato** |
| `/events/<slug>/menu` | *«prodotta da `GuestLoginBanner.tsx:42` e `:138`»* | delle due **ne resta una**, il link d'accesso; l'altra era il link d'iscrizione |

**Le due voci dell'allow-list restano giuste** — entrambi gli indirizzi sono
ancora prodotti da qualcuno, e nessun pattern va aggiunto ne' tolto. E' la
**prosa che li attribuisce** a essere invecchiata.

**Chi la chiude:** un piano che apra quel file per una ragione propria. Candidato
naturale **50-05**, che riscrive `RsvpButton` — uno dei due produttori nominati.

---

## `GuestDrinkMenu.tsx:366` passa una prop che non esiste piu'

**Trovata:** piano 50-06, task 3 (2026-09-21).
**Fuori perimetro perche':** `GuestDrinkMenu.tsx` non e' nei `files_modified` di
50-06.

`GuestWarningModal` ha perso la prop `onSignUp` insieme al ramo *iscriviti*. Il
**solo** sito di render e' **commentato** da prima di questa fase
(`src/app/(public)/events/[slug]/menu/GuestDrinkMenu.tsx:360-369`, *«Pre-checkout
warning modal temporarily disabled»*) e dentro il commento passa ancora
`onSignUp={handleWarningSignUp}`.

**Nessun effetto oggi:** il codice e' commentato, il typecheck non lo vede, il
build resta verde. **Ma chi riabilitera' il pannello non compila** finche' non
toglie quella riga — e riabilitarlo e' una decisione di prodotto, non di questo
piano.

Il fatto e' scritto anche **dentro** `GuestLoginBanner.tsx`, nel docblock di
`GuestWarningModal`, cosi' che chi riabilita lo trovi leggendo invece che dal
typecheck.

---

## Conferma: `verify:venue-surfaces` G2 e' ANCORA rosso

**Riconfermato:** piano 50-06, task 3 (2026-09-21), su `d4033eb` prima di
qualunque modifica del piano.

E' la seconda riga della voce «Due gate rossi PRE-ESISTENTI» qui sopra, e non si
e' chiusa da sola. Misurato ora: `src/app/(public)/payment/callback/actions.ts`
e' stato toccato l'ultima volta dal commit `45be363` (fase 49), che ha aggiunto
la lettura di `sumup_checkout_id` **senza** aggiungerla alla lista positiva del
controllo G2.

`sumup_checkout_id` non porta un luogo, quindi **oggi non c'e' un indirizzo
esposto**. Il danno e' un altro, e cresce: la lista e' positiva **di proposito**
— il suo valore sta nel fatto che una colonna che nessuno ha pensato di vietare
diventa rossa lo stesso — e un rosso lasciato acceso la trasforma in rumore.
Quando arrivera' il rosso vero, sara' letto come «il solito».

**Non riparato da 50-06 di proposito:** quel gate sta su `venue-secrecy.md`, dove
allentare un'asserzione per far passare un rosso e' l'unica modifica del repo che
non si annulla.
