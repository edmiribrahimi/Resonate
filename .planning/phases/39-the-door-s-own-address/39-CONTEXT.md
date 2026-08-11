# Phase 39: The Door's Own Address - Context

**Gathered:** 2026-08-11
**Status:** Ready for planning

<domain>
## Phase Boundary

The door gets an address of its own, moved in a step of its own, and the move is
proven on a real device with the network off.

**In scope:** the new address and the fate of the old one; the offline
reachability of the door after the move; the one inherited navigation item Phase
34 assigned here; and the written door pass that proves it.

**Out of scope:** the door's *behaviour*. Phase 38 settled that a week's worth of
work ago and its code is untouched by this phase. No change to the scan verdict
path, to the offline store, to the channel, or to the freshness display.

</domain>

<decisions>
## Implementation Decisions

### The address

- **D-39-01: the door's permanent address is `/door`.** Short enough to be typed
  at two in the morning, and — the real reason — **out of `/admin`**. In this
  project `admin` in an address is an address, not an authorisation
  (`capability-routes.ts` module docblock); the person working the door is not an
  administrator, and the address should stop implying they are.

- **D-39-02: `/admin/scanner` keeps serving the door, permanently, as a real page
  — never as a redirect.** A redirect needs a network the door is designed not to
  have. That sentence is not a preference: it is the literal justification
  STAFF-04 gives for existing as its own phase
  (`REQUIREMENTS.md:80`). Two addresses, one door, zero round trips. The old
  address is not deprecated on a timer and not removed in a later phase — it is
  part of the deliverable.

- **D-39-03: STAFF-04 and the roadmap goal do not contradict each other.**
  STAFF-04 says the door *keeps an address of its own and is not moved together
  with the rest*; the ROADMAP goal says it *moves to its permanent address in a
  step all its own*. Both hold at once. This was a document reading, not a
  choice, and it is recorded so the next reader does not re-litigate it.

### Installation and the home screen

- **D-39-04 (owner, 2026-08-11): one app, one manifest. `start_url` stays `"/"`.**
  Pointing it at `/door` would make *every* install — members included — open the
  door. The alternative considered and declined was a second manifest scoped to
  the door, giving staff a separate installable icon.

- **D-39-05: the accepted cost of D-39-04, written down rather than discovered.**
  `public/manifest.json` today carries `start_url: "/"` and **no `scope`**
  (measured 2026-08-11). So "a device that installed the door" does not exist as
  a thing distinct from "a device that installed the app", and **launching from
  the home screen lands on `/`, the members' home — not on the door.** This is
  true *before* this phase and is not caused by the move.

  **Therefore success criterion 2 is not a question about the old URL. It is:
  with the network off, can the person working the door get from the home screen
  to a working door?** That is carried by the service worker's precache and by
  client-side navigation, not by any redirect. Plans must treat it that way.

### The inherited item

- **D-39-06: the Phase 34 carry-forward is closed here.** `door.operate` carries
  `requires_approved = false` (D-06 of Phase 43) while the bottom nav's Check-in
  entry is filtered by `requireApproved: true` and by role — so an organizer in
  `pending` sees **no** Check-in tab that the server **would** admit. It is the
  safe direction of the two (a hidden entry the server would allow, never a drawn
  entry it refuses), which is why Phase 34 left it. The owner assigned it here
  alongside STAFF-04 (`34-04-SUMMARY.md:197`, `34-VERIFICATION.md:431`).

  Closing it means giving `getVisibleNavItems` the capability set, which means
  changing `MobileNav`'s props, which means editing the door's own page — the
  same file this phase opens anyway. Doing it in a later phase would mean opening
  that file twice, and it is the one file this project least wants opened by
  accident.

### The proof

- **D-39-07 (owner, 2026-08-11): one door pass, not two.** This phase's door pass
  absorbs the seven procedures Phase 38 deferred. Same dark room, same two
  phones, same night, at the end of milestone v1.5.

  **Consequence, accepted:** Phase 39 does not close before that night, exactly
  like Phase 38. **Gain:** one trip instead of two — and the two things get
  verified *together*, which is also more truthful, because it is the same door.

  Practically, the plans must write **one procedure** that closes criterion 3
  *and* Phase 38's P1, P2, P3, P4, P5 and P7 — and must say, per item, which
  requirement each observation closes. P6 stays separate: it writes to production
  and needs its own fresh authorisation (see `38-HUMAN-UAT.md`, test 2).

### Claude's Discretion

- The mechanism by which `/admin/scanner` and `/door` both serve the door — one
  route re-exporting the other, a shared component, or a rewrite — is the
  planner's, subject to D-39-02 (no redirect) and to the constraint that
  `capability-routes.ts` must gate **both** addresses with the same entry rather
  than growing a second predicate.
- Precache strategy for the two addresses, within `sw.ts`'s existing structure.
- Whether the door pass procedure lives in this phase's directory or extends
  `38-PROCEDURES.md`; either is fine as long as **one** document is the thing a
  person reads in the dark room.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope
- `.planning/ROADMAP.md` §"Phase 39: The Door's Own Address" — goal, depends-on
  (Phase 34 route collapse, Phase 38 door behaviour), three success criteria
- `.planning/REQUIREMENTS.md:80` — STAFF-04 verbatim, including the clause that
  explains *why* this is a separate phase

### The fence Phase 34 kept, and the item it handed here
- `.planning/phases/34-one-work-surface/34-CONTEXT.md:62` — "**The door does not
  move.** `/admin/scanner` keeps its address; STAFF-04 is Phase 39"
- `.planning/phases/34-one-work-surface/34-04-SUMMARY.md:197` and
  `34-VERIFICATION.md:431` — the `pending`-organizer / Check-in divergence, with
  the owner's assignment to this phase and the reason it is the safe direction
- `.planning/phases/34-one-work-surface/34-RESEARCH.md:190,258` — STAFF-04 named
  as the fence no Phase 34 plan may cross

### Code that constrains this phase
- `src/lib/routes/capability-routes.ts` — the single declaration read by the
  middleware, the page guard and the navigation. The door's entry
  (`CAP.DOOR_OPERATE`, `routes: ["/admin/scanner"]`, `assignmentOpenable: true`)
  and its docblock, which states the address does not move *in Phase 34* and why.
  **Both addresses must be gated by this one entry.**
- `src/app/sw.ts` — the door's runtime caching, chosen route by route. The four
  `NetworkOnly` API rules are address-independent. The `/events/**` `NetworkOnly`
  rule is a *deliberate* venue-secrecy conflict resolution and must not be
  loosened by this phase. Precache comes from `self.__SW_MANIFEST`.
- `public/manifest.json` — `start_url: "/"`, `display: standalone`, **no
  `scope`** (measured 2026-08-11)
- `src/app/(admin)/admin/scanner/page.tsx` and `ScannerClient.tsx` — the door.
  `ScannerClient.tsx` is ~3450 lines after Phase 38 and its behaviour is out of
  scope; this phase touches its *page* and its `MobileNav` props, not its logic.
- `src/lib/rbac/roles.ts` — `getVisibleNavItems` and the Check-in docblock, which
  already records D-39-06's grant, decision reference and owner

### The verification this phase inherits
- `.planning/phases/38-live-attendance-freshness/38-HUMAN-UAT.md` — the eight
  items, seven pending and one blocked. D-39-07 folds tests 1, 3, 4, 5, 6 and 7
  into this phase's door pass; test 2 (P6) stays separate.
- `.planning/STATE.md` §`## Blockers` — the owner's 2026-08-11 deferral, and the
  one item whose deadline is an act rather than a date

### Domain gates
- `.claude/rules/checkin-offline.md` — the reference scenario, the asymmetry that
  sets the defaults, "provato prima della porta", and the runbook gate
- `.claude/rules/nextjs-architecture.md` — the door sits outside `(work)`
  deliberately, "il gruppo non autorizza", the service-worker gate, and the
  dark-venue accessibility gate
- `.claude/rules/access-gating.md` — RLS is the boundary; hiding a nav item is
  not protecting a route (directly relevant to D-39-06)
- `.claude/rules/meta-gates.md` — cross-domain impact and the zero-silent-failure
  control in a repo with no error tracking

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`capability-routes.ts`'s door entry** — already carries `assignmentOpenable:
  true`, restored by plan 34-03 after being left behind. Adding `/door` to its
  `routes` array is the whole of the authorisation change; nothing new is needed.
- **`sw.ts`'s `doorRuntimeCaching`** — four `NetworkOnly` rules matched on API
  **pathnames**, so they survive the move untouched. The structure to extend, not
  replace.
- **`src/lib/door/require-operator.ts`** — gates the Route Handlers, not the
  address (D-34-13). Address-independent.

### Established Patterns
- **The middleware asserts the map on every request** — `src/lib/supabase/middleware.ts`
  carries an assertion that fired the first time the map was wrong in Phase 34.
  A missing `/door` row will be caught there, and `next build` refuses a surface
  under `(admin)` with no row in the map.
- **A reversed decision is written down, not deleted** — the project's own
  convention, applied throughout `STATE.md` and in `nextjs-architecture.md`'s
  route-group section. D-39-03 follows it.
- **The door's offline cache is IndexedDB, never Cache Storage** (`sw.ts`
  docblock, lines 15-23). Nothing in this phase may move door state into Cache
  Storage.

### Integration Points
- `capability-routes.ts` → middleware, page guard, navigation — three readers of
  one line, which is why the second address goes in that entry and not beside it.
- `getVisibleNavItems` → `MobileNav` props → the door's page (D-39-06). This is
  the only place this phase touches the door's own file.
- `self.__SW_MANIFEST` precache → whether `/door` and `/admin/scanner` are both
  reachable with the radio off. This is what success criterion 2 actually tests
  once D-39-05 is taken into account.

</code_context>

<specifics>
## Specific Ideas

- The owner wants **one app on the phone**, not a second installable door. The
  cost of that choice is written into D-39-05 rather than smoothed over.
- The owner wants **one trip to the dark room**, batched at the end of v1.5 with
  the work already deferred there. Plans must be written so that a single evening
  closes both phases' behavioural evidence.

</specifics>

<deferred>
## Deferred Ideas

- **A separate installable door app** — its own manifest, its own `start_url`,
  its own icon and name on the staff phone's home screen. Declined for now
  (D-39-04). If it is ever revisited, the name and the icon are **brand**, not
  engineering: `brand-visual-system.md` governs both.
- **Retiring `/admin/scanner`.** Not deferred so much as refused: D-39-02 makes
  the old address permanent. Recorded here so that a future tidy-up phase does
  not read it as leftovers.

</deferred>

---

*Phase: 39-the-door-s-own-address*
*Context gathered: 2026-08-11*
