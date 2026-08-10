---
gsd_state_version: 1.0
milestone: v1.5
milestone_name: Platform Layout, Access Model & Door Fixes
status: executing
stopped_at: Completed 36-06-PLAN.md
last_updated: "2026-08-10T14:36:12.082Z"
last_activity: 2026-08-10
progress:
  total_phases: 13
  completed_phases: 6
  total_plans: 106
  completed_plans: 97
  percent: 46
---

# State: Resonate

## Project Reference

See: .planning/PROJECT.md (updated 2026-08-05)

**Core Value:** Members can discover events, confirm attendance, and buy tickets within a trusted, curated community -- the gating mechanism (referral + approval) is what makes the community valuable.

**Stack:** Next.js 16 + Supabase + Tailwind CSS v4 + PWA (Vercel hosting)

**Current Focus:** Phase 36 — Formats & Series Numbering

## Current Position

Phase: 36 (Formats & Series Numbering) — PLANNED, not yet executed
Plan: 5 of 14
Status: Ready to execute

Note:
        14 piani in 9 onde. Plan-checker: **VERIFICATION PASSED, 0 blocker**, un
        warning documentale chiuso prima del commit. Sei requisiti su sei
        coperti; due con prova automatica (le sonde di vincolo), quattro con
        procedure manuali scritte.

        `36-CONTEXT.md` — diciotto decisioni. `36-VISUAL-SOURCE.md` — il sistema
        visivo distillato dal tracker di produzione, che risulta essere gia' un
        design system implementato. `36-UI-SPEC.md` — checker 6/6.
        `36-RESEARCH.md` — 1680 righe misurate. `36-PATTERNS.md` — 15 analoghi
        su 18 file, 3 lacune dichiarate. `36-VALIDATION.md` —
        `nyquist_compliant: false` **deliberato**.

        **Vincolo d'ordine, `[BLOCKING]`:** il baseline `pre-36` (piano 36-01) si
        cattura **prima che esista il file di migration** — un baseline preso
        dopo il cambiamento non e' un baseline. E la sonda di scrittura del
        baseline va allargata (piano 36-04) o smette di misurare in silenzio,
        producendo un verde che significa il contrario.

        **La migration si applica dall'endpoint migrations della Management API**
        (piano 36-05), non con la CLI, che qui non e' installata.

        **Trovato durante la ricerca, ri-misurato in produzione, NON di questa
        fase:** l'indirizzo di una serata con `venue_secret = true` e' leggibile
        con la sola chiave anonima — `venues_select_public` e' `using (true)` e
        `event_parties.venue_id` e' leggibile per gli eventi pubblicati. Todo
        `secret-venue-address-readable-by-anon.md`, **assegnato alla fase 37**
        dal proprietario. Prima di scegliere il rimedio va misurato se lo stesso
        percorso esista anche via `events` o `event_media`.

        **Fasi 31, 32, 33, 43, 35, 34: 92/92 piani eseguiti.** Il disco e questo
        file concordano dal 2026-08-10; fino a quel giorno questo blocco
        dichiarava ancora la fase 34 in esecuzione al piano 1 di 17.

        **Ramo:** `gsd/phase-32-capability-model-in-the-database` — 82 commit
        oltre `origin/main`, 553 oltre `main`. Niente e' stato spinto.

        **Debito di verifica aperto — 32 voci `human_needed`,** tutte della
        stessa specie: nessuno strumento di questo repository puo' autenticarsi
        come un ruolo. `43-VERIFICATION.md` 14 · `35-VERIFICATION.md` 9 ·
        `34-VERIFICATION.md` 9. Una sessione con cinque account — master,
        organizer/approved, organizer/pending seminato a mano, staff, member —
        ne chiude la maggior parte. La fase 36 costruisce superfici pubbliche
        sopra quel modello: il debito non e' suo, ma le sta sotto.
Last activity: 2026-08-10

**Phase 31: EXECUTED, NOT VERIFIED.** 13 of 13 plans, 61 commits on
`gsd/phase-31-live-defects-at-the-door-and-the-bar`. One of its four blocking
checkpoints is now closed (the migration is applied); three remain, plus the RLS
half of the fourth. `31-VALIDATION.md` keeps `nyquist_compliant: false`
deliberately.

Progress: [█████████░] 92%
          phase 32 — 11 plans, 0 executed

## Decisions

Fixed by the project owner before planning — not re-opened at plan time:

- Live freshness uses a **push channel**, not polling — mandatory full reload on every reconnection, infrequent safety reload underneath (Phase 38)
- Undoing a check-in requires a **supervising capability** — door-only assignment cannot undo (Phase 35)
- Venue reveal stays scheduled **plus** a manual path for master and organizer, confirmed and recorded (Phase 37)
- The interface stays **English only** — no translation work this milestone
- [Phase 36]: Il baseline `pre-36` e' catturato su entrambi i bersagli **prima** che
  esista un file di migration di fase 36 — la precondizione e' asserita da un comando
  incatenato alla cattura, non dichiarata a memoria. Figure di partenza: 72 policy,
  23 tabelle con RLS, **1/1** sonde di vincolo che rifiutano come dichiarato

- [Phase 36]: La serata del 7 feb 2026, primo tempo, e' l'atto di apertura della notte e non un'edizione: stesso format e stessa serie della notte, NESSUN numero (proprietario, 2026-08-10)
- [Phase 36]: number resta nullable su event_parties mentre format_id e series_id diventano NOT NULL — una serata senza numero e' un atto e non ha sigla propria; la guardia della migration conta solo i format_id nulli
- [Phase 36]: Le due notti in archivio sono RSNT-001 e RSNT-002, confermate contro la controprova RSNT-008 citata in production-calendar.md:86 — da qui in poi la numerazione e' monotona
- [Phase 36]: Cinque nomi di serie autorizzati per un file pubblico: re:sonate, re:sonate x Perlone, RamaDub x Booze, RamaDub x Muro, SunSet. MotionLab parte senza serie e l'assenza e' il punto
- [Phase 36]: Il nome pubblico della serie di Nizza e' 're:sonate x Perlone'; production-calendar.md scrive ancora 'Resonate x Perlone' e va allineato come aggiornamento del modulo persona, fuori da questa fase
- [Phase 36]: la migration di format e serie e' scritta e verificata in container, NON applicata. Le colonne stanno prima della RLS: la policy nomina ep.series_id, e Postgres rifiuta una policy che legge una colonna inesistente
- [Phase 36]: il join della policy delle serie e' qualificato — ep.series_id = party_series.id. La forma non qualificata sarebbe USING (true) travestita
- [Phase 36]: 36-06: EventParty.number e' number | null — la migration mette NOT NULL su due colonne di tre; una notte che e' l'atto di un'altra notte non ha progressivo
- [Phase 36]: 36-06: /admin/formats legato a catalogue.manage (non organizer.access): requires_approved sposta il rifiuto all'indirizzo invece che su ogni bottone
- [Phase 36]: 36-06: la tab Formats rimandata al piano che crea la pagina (36-09) — StaffTab.href e' Route, un indirizzo statico entra nell'unione generata solo dopo che una page.tsx lo serve
- [Phase 36]: 36-04: la sonda di scrittura risolve il formato della serie come referenza derivata privilegiata, non come sotto-select — catalogue.manage pretende approved, e quattro celle oggi ok:1 sarebbero diventate 23502
- [Phase 36]: 36-04: punto container catturato. 966 celle di scrittura e 322 di lettura preesistenti IDENTICHE, zero 23502; sonde di vincolo che rifiutano come dichiarato **3/3**, era 1/1. `party_series_select_published` non e' mai stato esercitato come concessione: il container non pubblica eventi

## Accumulated Context

### Key Files

- `src/lib/supabase/middleware.ts` -- session refresh + role/status resolution (header injection removed in Phase 33)
- `src/lib/offline/checkin-store.ts` -- IndexedDB offline store (clear-and-replace bug, Phase 31)
- `src/lib/offline/sync-manager.ts` -- offline sync queue (deletes conflict evidence, Phase 31)
- `src/app/api/tickets/checkin/route.ts` -- ticket QR check-in (conflict encoded as HTTP 200)
- `src/app/api/membership/verify/route.ts` -- membership QR verify + attendance
- `src/app/(admin)/admin/scanner/ScannerClient.tsx` -- scanner client (converted last, Phase 42)
- `src/app/api/cron/venue-reveal/**` -- scheduled reveal (manual path added Phase 37)
- `supabase/migrations/**` -- the actual security boundary; capability model lands here (Phase 32)
- `src/app/sw.ts` -- service worker (release wholeness, Phase 40; door precache, Phase 39)

### Notes

- Production data is nearly empty (2 events, 3 parties, 1 ticket, 4 profiles) — the safest moment for a deep change
- No test runner: verification is `npm run build` plus written manual procedures, including a dark-venue network-off door pass
- FIX-01 and FIX-02 were applied on 2026-08-05, ahead of the roadmap; they remain mapped to Phase 31 and are marked complete

## Blockers

(None)

## Session Continuity

**Last session:** 2026-08-10T14:36:07.000Z
**Stopped at:** Completed 36-06-PLAN.md
commits on `gsd/phase-31-live-defects-at-the-door-and-the-bar`. Branch not merged,
nothing pushed. `main` is 14 commits ahead of `origin/main`.

**Owner decision this session:** staff always get in — the door decides on role
alone, and `updateMemberRole` sets `status = 'approved'` when it grants the
organizer role. Demotion does not revoke approval.

**Found and fixed mid-phase:** the service worker was never built in production
(`@serwist/next` is a webpack plugin, Next 16 builds with Turbopack). `npm run
build` is now `next build --webpack`. v1.4's "IndexedDB + service worker" was only
ever the IndexedDB half.

**Found and recorded, not fixed:** none of the four Supabase clients is
parameterised with `Database`, so no column name in any query is checked by the
build. This narrows what a green build means everywhere, not only in phase 31.

**Working rule, set by the owner on 2026-08-06.** During construction, a
verification checkpoint is deferred unless its outcome changes *what we write*.
Applying the migration was necessary immediately — the refund probe's result
decided a clause of the migration itself, and phases 32+ write against that
schema. Checks that merely validate an already-made, easily reversible choice —
a colour read in the dark, a cache bucket on a phone, a door pass — are collected
and run at the end. **Deferred is not verified:** this file and
`31-VERIFICATION.md` must keep saying which of the two each one is.

*One exception to watch:* a check whose failure destroys **data** rather than code
stops being deferrable once that data exists. The IndexedDB v2→v3 upgrade must be
exercised **before the first real night**, not at some abstract end of
construction. Today no staff phone holds a v2 database with real check-ins,
because no event is published — which is precisely why the rule is safe now.

**Manual work owed, batched by the owner's choice** — see `31-VERIFICATION.md`:

1. ~~Apply the phase 31 migration~~ — **DONE 2026-08-06.** Applied through the
   Supabase Management API's migrations endpoint (`SUPABASE_ACCESS_TOKEN` is in
   `.env.local`; the CLI is still not installed), recorded as version
   `20260806111113`, eight structural observations verified. **Doing it revealed a
   third foreign key to `tickets` that no plan had seen — `pending_purchases`, the
   SumUp payment record — still `NO ACTION` and blocking the refund's delete. The
   migration was corrected before being applied.**
   **Still owed:** confirm a logged-in member reads **zero rows** from
   `door_scan_events`. The Management API bypasses RLS, so no query of mine can
   settle it — only a real member session can.

2. The `apis` cache check on a phone, production build
3. The dark-room amber-versus-yellow legibility check
4. The door pass — six scans, radio off, plus the IndexedDB v2→v3 upgrade on a
   device that already holds a v2 database

**Migrations can now be applied from here.** `POST /v1/projects/{ref}/database/migrations`
with the access token — the migrations endpoint, **not** `/database/query`, so the
project's migration history stays truthful. Note a pre-existing drift found while
doing it: `20260508000000_drink_token_active_state.sql` is applied in production
but absent from the history (its content was verified present). Repairing that is
the owner's call; `PUT` on the same endpoint upserts without applying.

**Next step:** `/gsd-execute-phase 32`. Note the command form: GSD is installed as
user skills here, so it is `/gsd-…` with a hyphen — the `gsd:` plugin namespace
does not exist on this machine, though GSD's own generated text uses it.

---
*State initialized: 2026-03-10 — v1.5 roadmap 2026-08-05*
