# Feature Research

**Domain:** Private, invitation-only music events platform — series filtering, event-operations staffing, public credits, door-list freshness
**Researched:** 2026-08-05
**Milestone:** v1.5 Platform Layout, Access Model & Door Fixes
**Confidence:** MEDIUM-HIGH (vendor documentation is official and current; UX conventions verified against multiple independent sources; nothing here rests on training data alone)

> Previous milestone's feature research preserved at `.planning/research/v1.3-FEATURES.md`.

**Scope note.** Ticketing, drink tokens, offline check-in, guest list, referral gating, media moderation and analytics already exist and are **not** re-researched. Every finding below is expressed as a delta against what is already built.

---

## The four questions, answered up front

1. **Filter bar.** A single-select quick-filter row is the correct pattern for four formats, and only because there are four. The industry ceiling for tabs/segmented/chips is five or six options; past that the pattern must give way to something richer. Table stakes are: a stated default, URL-encoded state, a designed empty state, and persistence across navigation. The most commonly cited failure is not the control — it is filters that silently reset, and applied state that is invisible.

2. **Staff permissions.** Mature products converge on the same three-way split, under different names: a **user role** (account-wide capability), an **event role / staff assignment** (permission or responsibility scoped to one event, granted without changing account-wide rights), and a **public profile** (speaker, artist, credit) that carries **no permissions at all**. For a team under ten, table stakes is exactly this three-way split with a **fixed** set of named roles. The over-engineering line is crossed at a custom-role builder with per-capability toggles.

3. **Credits.** Products do not merge the worker and the performer. They keep two independent records against one person and let both be true at once. The permission comes from the role or assignment; the credit comes from the credit record. Being credited never grants access, and holding access never produces a credit.

4. **Door.** Two expectations, and they are separate. Freshness: a poll of the ticket and check-in data on the order of **seconds** (one mature product publishes 7 s), plus an always-available **manual pull-to-refresh**, because staff need a way to force the question. Trust: the app tells staff what state it is in — online/offline badge, count of entries pending sync, live sold / checked-in / remaining, and on a repeat scan the **original scan time and the staff member who recorded it**. Conflicts discovered at sync are **surfaced for a person to decide**, never silently resolved.

---

## Feature Landscape

### Table Stakes (Users Expect These)

#### A. Format filter on the events listing

| Feature | Why Expected | Complexity | Notes |
|---|---|---|---|
| Single-select chip row: **All** + one chip per format | Quick filters are the standard pattern when users slice the same handful of ways; four formats + All = 5, inside the 5–6 ceiling | LOW | Filter on **format**, not on series code. Series codes exist to number editions, not to browse |
| **All** is the stated default | "The default filter should be deliberate and, ideally, visible — so the starting view is never a mystery" | LOW | Landing on a pre-filtered view is a bug report waiting to happen |
| Filter state encoded in the URL (`?format=…`) | Shareable, bookmarkable state "turns an ephemeral interaction into a durable, linkable artifact" | LOW | Next.js: read with `useSearchParams()` in a Client Component **inside a `<Suspense>` boundary** — otherwise the tree up to the nearest boundary is forced to client render (HIGH — official docs) |
| Filter survives navigation and reload | Filters resetting when a user opens a record and comes back is among the most-cited frustrations in data views | LOW | Free once state lives in the URL. This is the argument for URL over `useState` |
| Selected chip is unmistakably selected | "A filtered view that looks identical to an unfiltered one — minus some rows — breeds confusion and mistrust" | LOW | Colour alone is not enough; needs a second signal (fill, weight, mark) |
| Designed empty state naming the active filter, with a one-tap way out | "'No results' is a moment, not an error… never leave a blank panel that looks broken" | LOW | Must say *which* format matched nothing and offer "Show all" — not the current generic "No upcoming events" |
| One-tap clear back to All | "Users get into over-filtered dead ends constantly; the escape hatch must be obvious" | LOW | Tapping the active chip again, or the All chip |
| Scroll position preserved when the filter changes | Otherwise every tap throws the user to the top of the page | LOW | `<Link scroll={false}>` (HIGH — official Next.js docs). Prefer `replace` over `push` so Back leaves the listing rather than replaying every chip tap |
| Sticky row stays reachable while the list scrolls | The whole point of sticky is that the escape hatch never scrolls away | LOW-MED | Must sit below the mobile nav's `z-50` and clear the safe-area inset. Project convention: modals are `z-[60]`, nav is `z-50` |
| Horizontally scrollable chip row is keyboard-scrollable | axe rule `scrollable-region-focusable` / WCAG 2.1.1 — an `overflow:auto` container that can scroll must be focusable (`tabindex="0"`) or reachable another way | LOW | Cheap to satisfy, invisible when missing, and a real barrier |
| Touch targets sized for a thumb | Standard mobile guidance; the row is the primary control on the page | LOW | ~44 px min height; chips should not be squeezed to fit more on screen |

#### B. Staff permissions for event operations

| Feature | Why Expected | Complexity | Notes |
|---|---|---|---|
| **Account-wide named role** — a fixed, small set | Every product surveyed has one. It answers "what is this person to the organisation?" | MEDIUM | Extends the existing `master` / `organizer` / `member` axis. Critical-class work: role changes propagate to RLS, middleware and navigation |
| **Per-event assignment**, granted without touching account-wide rights | Cvent states it exactly: "an event role defines permission *for a single event*… the ability to do more or less on an event-by-event basis without changing their account-wide rights" | MEDIUM | The core of the v1.5 access model. An assignment is a row, not a role change |
| Assignment as a **named responsibility**, not a raw permission grant | Venue software models it as a slot with a name — House Manager, Manager on Duty, Security Supervisor — that a person fills for one event | MEDIUM | Names are the product. "Door", "Bar", "Photo" reads at 2 a.m.; a permission matrix does not |
| Assignment scoped to the **right level of the hierarchy** | Mature venue software distinguishes **event** staff assignments from **function** staff assignments, kept as two separate lists | MEDIUM | Maps directly to the existing event / party split. Someone can work one party of a multi-party night without working the others |
| The simplest working shape: **one operational role + a per-event access list** | One product's whole door model is a Door Staff role "whose only meaningful capability is checking people in", plus a per-account tick-list: All events, or only these | LOW-MED | Proof that a team under ten does not need more. It is the floor, not the ceiling |
| Destructive door actions restricted above door staff | In that same product, **undo is always restricted to managers**; ordinary door staff never see it, and undo can be disabled entirely | LOW | Direct impact on the **existing v1.4 undo**: today undo ships with the scanner. Under an access model it becomes a supervisor capability, or an explicitly-declared exception |
| Revocation is one action | "If you ever need to revoke access, remove the role" | LOW | Removing an assignment must remove access to that night's tools immediately, not at next login |
| Permission changes reach the device without a reinstall | One product publishes a **3-minute** sync for user data and permissions and says so: "if you update the events a user can see, it'll take 3 minutes to update in the app" | LOW-MED | Under a service worker, a stale permission set is a real failure mode. The number matters less than publishing one |

#### C. Public credits, separate from permissions

| Feature | Why Expected | Complexity | Notes |
|---|---|---|---|
| A credit can exist **with no account at all** | Two independent confirmations: one platform offers a "**No Login User**" type — "someone doing something outside the system, generally only added for accounting or tracking purposes"; another says outright it "is not compulsory to invite a speaker to log in in order to display" them, with **Save** and **Save and Invite** as two distinct buttons | LOW-MED | Decisive. In a referral-gated community, minting an account to print a name on a page would put a non-member inside the gate. The credit must not require one |
| A credit grants **zero** permissions by default | "Speakers do not have permission to modify event details by default" — access arrives only if they are *also* assigned an operational role | LOW | The invariant. Enforce in RLS, not only in the UI |
| Credits are typed (dj, photographer, …) | Every product types its public profiles; the type drives where the credit renders | LOW | Today the schema carries `lineup text[]` — an untyped string array. Typing it is the actual v1.5 change |
| Credit ordering controlled by the organiser | A line-up is an editorial object; alphabetical order is wrong | LOW | Line-up order is already an editorial decision upstream in the production pipeline |
| Same person can hold a credit **and** a role **and** an assignment simultaneously | How the surveyed products answer it. One platform separates a **user account** (buys tickets, is granted admin rights) from an **artist page** (public identity); a user account may manage artist pages, and the artist page confers no event permissions | LOW-MED | One account, three independent attachments. Never derive one from another in either direction |
| Deleting a credit does not touch access; revoking access does not delete the credit | Follows from the separation. Worth stating because the naive implementation couples them | LOW | A credit is historical once a night has happened; access is not |

#### D. Door: freshness and trust

| Feature | Why Expected | Complexity | Notes |
|---|---|---|---|
| Attendee and check-in data refreshes on the order of **seconds** while the scanner is open | One vendor publishes the numbers: ticket and check-in data every **7 seconds**, event list every 2 minutes, permissions every 3 minutes | MEDIUM | Answers the question directly: a guest who buys minutes before arriving is expected to be scannable. Sub-10-second is the bar |
| **Manual pull-to-refresh** always available | The same vendor documents pull-to-refresh on dashboard and door-list. Staff need a way to force the question rather than trust a timer | LOW | The cheapest trust feature on this list |
| Online / Offline badge with a **pending-sync count** | "The status badge flips to *Offline* and scanning continues… the badge shows how many entries are *pending* sync" | LOW | v1.4 already queues in IndexedDB; the count is presentation over data that exists |
| Rules enforced **on the device** while offline | "Offline scanning isn't a free-for-all. The device carries the same rules engine, so a single-entry ticket scanned twice shows **Already used** the second time even with no signal" | MEDIUM | Aligns with the v1.5 target "duplicate scans reported instead of silently accepted" |
| Repeat scan shows **when** it was first scanned and **who** recorded it | One scanner "flags 'Already Scanned' with the original scan time **and the staff member who checked it in**"; another "shows a warning with the time and date it was first scanned" | LOW-MED | The data already exists: `checked_in_at` and `checked_in_by` are on the ticket and both are written at check-in. What is missing is surfacing them at the door |
| Queued scans replay **in the order they happened**, stamped at door time not sync time | "Each queued scan is replayed on the server in the order it happened and stamped at the real door time, not the sync time" | MEDIUM | Determines whether the attendance record is truthful. Also the correct input to the analytics that already exist |
| Idempotent replay — resyncing cannot double-record | "Each action carries a unique key, so if it gets sent twice… the server still only applies it once" | LOW-MED | The same discipline the payment webhook already applies. The pattern is in the house |
| Cross-device conflicts **surfaced, not silently resolved** | "Rather than silently pick a winner, these appear as conflicts in the sync panel so a person decides." A second vendor: "you may see an 'already checked in' outcome on the second sync" | MEDIUM | Two doors, both offline, same ticket. Silent resolution is a silent failure — the project's own standing prohibition |
| A sync panel: what is queued, what failed, retry | "Open it to see what's queued, what failed, and any conflicts. You can Retry a failed item, dismiss it, or hit Sync now" | MEDIUM | The operator-visible half of "zero silent failures" |
| Live **sold / checked-in / remaining** at the top of the scan screen | Standard across scanners; one auto-refreshes it every 10 s by default | LOW-MED | The number a supervisor watches. Also the fastest way for staff to notice the device has gone stale |
| Documented "sync before doors" step | Every offline-capable product says it, and names the failure: "offline data can be stale if attendee data changes afterward" | LOW | Belongs in the written manual door procedure, which is the only verification this repo has |

---

### Differentiators (Competitive Advantage)

| Feature | Value Proposition | Complexity | Notes |
|---|---|---|---|
| **Format-filtered deep link as the landing target for published material** | The production pipeline already publishes per-format material on a fixed schedule. A link or QR landing on that format's filtered listing turns every published piece into a working entry point — and costs nothing beyond the URL state already required | LOW | Pure upside of doing URL state properly. Depends on the format filter being URL-encoded |
| **Per-format counts on the chips** | Counts are what make a filter "feel intelligent rather than a wall of checkboxes" | LOW-MED | **Must count only what a visitor may see.** The listing already carries `is_draft`; a count that includes drafts announces an unannounced night. Compute counts from the same visibility-filtered query as the list, or not at all |
| **Assignment as the thing that opens the door tool** | Instead of "does this person have the check-in permission?", the question becomes "is this person on tonight?" — which is the question the team actually asks | MEDIUM | Assignment-driven navigation: the door surface appears for the night you are assigned to, and disappears afterwards. Removes a whole class of "which event am I scanning?" error |
| **Credit and assignment shown side by side on one night's staffing view** | One screen answering both "who is playing" and "who is working", when the same person may be in both columns | LOW-MED | Reads as obvious to a small team, and is exactly what the three-way split makes possible |
| **A staleness statement, not just a spinner** | "Updated 4 s ago" beside the count, going amber when the last successful refresh ages past a threshold | LOW | Trust is the deliverable at the door. Most products show a badge; few show the age. The asymmetry justifies it: staff must know whether to trust the list *before* they refuse someone |
| **Refused-entry reasons recorded, not just admissions** | The door's default is admit-and-record; the exceptions are the interesting data and today they leave no trace | MEDIUM | Feeds the analytics dashboards that already exist. Defer if it competes with core door fixes |

---

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---|---|---|---|
| **Custom role builder with per-capability toggles** | One mature platform offers it, so it looks like the mature answer | It is the enterprise answer, for portals with agencies and clients. For under ten people it produces roles nobody can describe, a permission matrix nobody audits, and RLS policies that must model an open-ended set. The audit cost lands on the one person who understands it | A **fixed** set of named roles plus a fixed set of named assignment types. Add a name when the team actually needs it — as a reviewed migration |
| **Multi-select format filter** | "Why not let them pick two?" | Four formats. Multi-select doubles the state space, makes the URL ambiguous, breaks the "one chip is selected" reading, and answers a question nobody asks. The escape hatch from a two-format need already exists: All | Single-select. All + one |
| **Faceted panel with format, date range, venue, price** | Looks complete | Facets are for exploration-heavy, data-dense catalogues, and cost real horizontal space and visual weight. A listing of a handful of upcoming nights does not need a query language. **Venue is also a secrecy surface** — a venue facet leaks the shape of what is unannounced | Format only. Time is already split Upcoming / Past |
| **Saved views / "my filters"** | The mature end of the filter literature | It is a hallmark of *daily* power use. Nobody uses a private events listing daily enough to codify a query. Adds an account-bound object with no consumer | The URL is the saved view |
| **Filter state in `localStorage` only** | "So it remembers them" | Unshareable, invisible to the server, out of sync with the URL, and it surprises a returning visitor with a pre-filtered page they did not choose | URL state. It persists, shares and bookmarks for free |
| **Infinite scroll under a sticky filter** | Feels modern | The combination is hostile: the result count becomes unknowable, the empty state never renders, and the footer is unreachable. Sticky filters exist to keep the escape hatch in reach — infinite scroll removes the sense that there is anything to escape from | Show the count. Paginate or show all — the volume requires neither |
| **Giving performers accounts so they can be credited** | "They're on the page, they should have a login" | Two independent products document the opposite: credit without invitation is a supported, deliberate flow. **In a referral-gated community an account is membership** — auto-provisioning accounts to render names opens a gate the product did not decide to open, and accumulates dormant accounts inside it | Credit is a record. Inviting is a separate, deliberate action, and it goes through the same gating as anyone else |
| **Deriving door access from a credit** ("they're on the line-up, let them scan") | Removes a step on the night | Inverts the invariant every surveyed product enforces: a public profile carries no permissions. It also fails the reverse case — a photographer with no line-up credit needs door access, and a performer needs none | Assignment. It takes one tap and it is auditable |
| **Deriving a credit from an assignment** ("assigned to play, so print the name") | Removes a step in production | The graphic pipeline has its own gates: spelling verified at source, the venue's own wording, native tags rather than printed handles. An operational record is not a proofread editorial one, and a wrong name is irrecoverable once published | Two records. The credit is written and checked as editorial work |
| **Shift clock-in / clock-out, hours, rostering** | "Per-night assignment" sounds like scheduling | This is workforce management — an entire second product. Under ten people, the roster is a message thread. The assignment needs to answer one question: is this person working this night? | An assignment row with a type. Nothing time-based |
| **Time-expiring assignments** ("access ends at 06:00") | Feels tidy and secure | A clock that revokes access at the door is a clock that revokes it during the last twenty minutes of a queue. That failure lands in front of people, and the door's declared default is admit-and-record | Assignments end when the night's records are closed, or when removed by hand |
| **Silently resolving cross-device check-in conflicts** | Cleaner-looking sync | The explicit anti-pattern in the offline literature — "conflicts are surfaced, never hidden" — and a direct violation of this project's standing prohibition on silent failure. It also destroys the only evidence that two doors disagreed | Surface it. The door admits and records; the disagreement is reconciled by a person afterwards |
| **Optimistic confirmation at the bar, matching the door** | Consistency between the two surfaces | The two surfaces have **opposite defaults** by design, and this is already a stated v1.5 requirement: at the door, when in doubt admit and record; at the bar, when in doubt record nothing. A drink marked served without server confirmation is an unrecoverable loss of money and of the guest's token | Door: optimistic, queued, reconciled. Bar: server-confirmed, never optimistic. Do not share the mechanism |
| **A live websocket subscription per attendee row / staff presence indicators** | "Real-time" is in the requirement | The requirement is *freshness*, not presence. A subscription per row multiplies connections on a phone with bad signal, fights the service worker, and degrades exactly when the network does — the moment it is needed. **No Realtime subscription exists anywhere in the codebase today**; this would be net-new infrastructure introduced on the most failure-sensitive surface | Poll on an interval while the scanner is open, plus manual pull-to-refresh. Both are documented industry practice with published numbers. Revisit subscriptions only if polling proves insufficient |
| **Renumbering a series when the format model lands** | The new data model makes the old numbering look inconsistent | A progressive already assigned is already on a printed piece. Series numbering is one of the project's monotone guards: append, never renumber | Model the series code so existing numbers stay valid. Any gap is history, not a defect |
| **A format chip for a retired code** | Completeness in the picker | Retired siglas are not to be named, not even as historical context. A filter chip is the most public possible place to name one | The chip set is the current formats. Past editions of a retired code remain reachable by their event page |

---

## Feature Dependencies

```
Format data model (four formats; series code carries per-series numbering)
    └──required by──> Format filter chips
                          └──requires──> URL state (?format=)
                                             └──enables──> Deep link from published material
                          └──requires──> Draft-aware visibility filter
                                             └──guards───> Per-format counts (must not leak drafts)

Named roles (extends master / organizer / member)
    └──required by──> Per-night assignments
                          └──required by──> Assignment-driven door surface
                          └──gates────────> Undo at the door  [today: available to any scanner]
                          └──requires─────> Permission freshness on device (service worker)

Credits (typed; replaces lineup text[])
    ──independent of──> Roles and assignments   [MUST stay independent, both directions]
    └──may reference──> A member account, optionally and nullably

Attendee-list freshness (poll + pull-to-refresh)
    └──requires──> Party selection            [exists, v1.4]
    └──requires──> Attendee endpoint          [exists]
    └──enhances──> Live sold / checked-in / remaining counts

Duplicate-scan reporting
    └──requires──> checked_in_at, checked_in_by   [exist, both written at check-in]
    └──requires──> Offline rules evaluated on device
                       └──requires──> IndexedDB snapshot   [exists, v1.4]

Conflict surfacing
    └──requires──> Idempotent replay with a per-scan key
    └──requires──> Ordered replay stamped at door time
    └──requires──> Sync panel (operator-visible)

One work surface (replacing duplicated admin/organizer trees)
    └──blocks────> Everything role- and assignment-shaped
                   (building the access model twice into two diverging trees is the defect being fixed)
```

### Dependency Notes

- **Format filter requires the format data model.** Chips must be generated from data, never hardcoded — a hardcoded chip set will eventually name a retired code, which the brand gates prohibit. It also means the label shown is the format's current label.
- **Per-format counts require draft-aware visibility.** `is_draft` already flows into the listing. A count computed over all rows rather than visible rows publishes the existence of an unannounced night. Compute counts from the same query that produces the list.
- **Assignments require roles, not the reverse.** An assignment says "this person, this night, this responsibility"; it presupposes an account that can hold one. One surveyed product states the precondition plainly: to be assigned to an event, a person must have an active user account.
- **Assignments change the meaning of the existing undo.** v1.4 shipped undo inside the scanner. A comparable product restricts undo to managers as a matter of course. Either scope it to a supervisory assignment or declare, in the commit, that door staff keep it — but do not leave it undecided, because it silently widens what an assignment grants.
- **Credits must stay independent in both directions.** The one-way failure is well known (credit grants access). The other direction matters too: a photographer assigned to work is not automatically credited, and a credit deleted after the night must not revoke anything.
- **Freshness depends on the party selector, not the event.** The scanner already scopes to a single party. The poll must scope the same way, or a busy night refreshes far more rows than the door is looking at.
- **Duplicate-scan reporting is mostly presentation.** `checked_in_at` and `checked_in_by` are already written on check-in, and the check-in route already reads both on an already-checked-in ticket. The missing piece is the door-facing message carrying the first-scan time and the recording staff member.
- **Conflict surfacing depends on idempotent, ordered replay.** Without a per-scan key the server cannot tell a retry from a second door, and every retry looks like a conflict. The idempotency discipline already applied to payments transfers directly.
- **The unified work surface gates the access model.** 13 routes exist twice and the copies have already diverged. Implementing roles and assignments before the merge means implementing them twice into trees that disagree.

---

## MVP Definition

### Launch With (v1.5)

- [ ] **Format data model, series code preserved** — everything format-shaped depends on it; renumbering is prohibited, so the model must accept the numbers that exist
- [ ] **Single-select format chips: All by default, URL-encoded, sticky, scroll-preserving** — the whole table-stakes set is one small feature; shipping half of it produces the failure mode the literature names most often
- [ ] **Designed empty state per format** — the current generic message reads as "nothing here", not "nothing in this filter"
- [ ] **Named roles on one unified work surface** — after the duplicated trees are merged, never before
- [ ] **Per-night assignments with a small fixed set of types** — the v1.5 access model, and the thing that makes the door surface addressable
- [ ] **Credits typed and separated from permissions, creatable with no account** — replaces `lineup text[]`; the no-account path is what keeps the referral gate closed
- [ ] **Duplicate scan reported with first-scan time and recording staff member** — named in the milestone; the data already exists
- [ ] **Attendee cache refresh: interval poll while the scanner is open + manual pull-to-refresh** — named in the milestone; answers the guest who buys minutes before arriving
- [ ] **Online/offline badge with pending-sync count** — the minimum that lets staff trust the list in their hand
- [ ] **Bar never marks a drink served without server confirmation** — named in the milestone; opposite default from the door, and must not share the door's mechanism

### Add After Validation (v1.x)

- [ ] **Per-format counts on the chips** — trigger: the draft-aware visibility query is settled and proven not to leak
- [ ] **Sync panel with retry and explicit conflict resolution** — trigger: first observed cross-device conflict, or the first night run on two doors
- [ ] **Live sold / checked-in / remaining on the scan screen** — trigger: a night where a supervisor asks the count out loud more than once
- [ ] **Staleness age beside the counts ("updated 4 s ago")** — trigger: any door incident traced to a stale list
- [ ] **Assignment-driven navigation** (tonight's surface appears for tonight's staff) — trigger: assignments in real use for a full rotation
- [ ] **Deep links from published material to the filtered listing** — trigger: URL state shipped and stable; then it is an editorial change, not a code one

### Future Consideration (v2+)

- [ ] **Refused-entry reasons** — real analytical value, but it adds a decision at the door, which is the worst place to add one. Defer until the door defects are closed and the door is boring
- [ ] **Credits linked to member profiles with a per-person page** — the mature version of the credit (one platform's artist page: click through from the event, the event listed back on the profile, followers notified). Defer: it is a discovery feature, and discovery is deliberately manual here
- [ ] **Custom roles** — only if the team outgrows the fixed set, and only as a reviewed migration. Listed to be explicitly deferred rather than silently deferred

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---|---|---|---|
| Format data model + series code | HIGH | MEDIUM | P1 |
| Format chips (default, URL, sticky, empty state, scroll) | HIGH | LOW-MED | P1 |
| Named roles on unified work surface | HIGH | MEDIUM | P1 |
| Per-night assignments | HIGH | MEDIUM | P1 |
| Credits typed, separated, account-optional | HIGH | LOW-MED | P1 |
| Duplicate scan reported with time + who | HIGH | LOW-MED | P1 |
| Attendee refresh: poll + pull-to-refresh | HIGH | MEDIUM | P1 |
| Offline badge + pending count | HIGH | LOW | P1 |
| Bar: no serve without server confirmation | HIGH | MEDIUM | P1 |
| Undo scoped above door staff | MEDIUM | LOW | P1 (decision), P2 (if it widens scope) |
| Per-format counts | MEDIUM | LOW-MED | P2 |
| Sync panel with conflict resolution | MEDIUM | MEDIUM | P2 |
| Live sold / checked-in / remaining | MEDIUM | LOW-MED | P2 |
| Staleness age indicator | MEDIUM | LOW | P2 |
| Assignment-driven navigation | MEDIUM | MEDIUM | P2 |
| Deep links from published material | MEDIUM | LOW | P2 |
| Refused-entry reasons | LOW-MED | MEDIUM | P3 |
| Credit → profile pages | LOW | MEDIUM | P3 |
| Custom role builder | LOW | HIGH | P3 (explicitly deferred) |

---

## Competitor Feature Analysis

| Question | Pattern A | Pattern B | Our Approach |
|---|---|---|---|
| **Role vs per-event permission** | Account-wide **user role**, plus an **event role** that "defines permission for a single event… without changing account-wide rights" | Portal-level and event-level roles, plus custom roles at both levels | Fixed named roles + per-night assignments. **No** custom roles — the size of the team is the argument |
| **Assignment shape** | A named **responsibility slot** (House Manager, Security Supervisor) filled per event, and separately per function within the event | A single operational role plus a per-account tick-list of which events it covers | Named assignment types, scoped to event **or** party — the existing multi-party model already needs both levels |
| **Public credit** | A **profile with no permissions**: "speakers do not have permission to modify event details by default" | A separate public identity object entirely — the account buys and administers, the artist page is the public face | Typed credit records, independent of the account, optional link to a member |
| **Credit without an account** | A "**No Login User**" type, added for tracking only | **Save** vs **Save and Invite** — inviting is deliberate and optional | Save only. Inviting a performer into a referral-gated community is a separate, gated decision |
| **Same person, both roles** | Speaker keeps no permissions unless *also* assigned an organiser/staff role | One user account may manage an artist page; the artist page grants nothing | One account, three independent attachments. Never derive one from another |
| **Freshness at the door** | Published intervals: tickets/check-ins **7 s**, events 2 min, permissions 3 min, plus pull-to-refresh | Live sold/checked-in/remaining with a **10 s** default auto-refresh | Poll while the scanner is open, publish the interval, always offer manual refresh |
| **Offline** | Pre-doors snapshot, offline badge with pending count, rules enforced on device, ordered replay stamped at door time | Device decides locally, everything queued with an idempotency key, conflicts to a sync panel for a person | Both — the two descriptions agree, and v1.4 already has the snapshot and the queue |
| **Duplicate scan** | "Already Scanned" with original scan time **and the staff member** | Warning with the time and date of the first scan | Time + who, and admit-and-record remains the door's default: reporting a duplicate is not the same as refusing entry |
| **Conflicts** | Surfaced in a sync panel, "rather than silently pick a winner" | Server reconciles at sync; the second device sees "already checked in" | Surface. Never resolve silently |
| **Quick filters** | Tabs/segmented/chips for the two or three cuts covering most sessions; give way past 5–6 options | Applied state visible, one-click clear, designed empty state, URL-encoded, persistent | All of it. Four formats is comfortably inside the ceiling — and is the reason this pattern is correct rather than merely convenient |

---

## Cross-Domain Flags for Requirements

Raised here because they are not visible from any single feature.

1. **Counts and empty states are a venue-secrecy surface.** A per-format count computed over unfiltered rows announces an unannounced night. So does an empty state that distinguishes "nothing scheduled" from "nothing you may see". Both must read from the visitor's visibility, not the organiser's.
2. **Chip labels are brand material.** The chip set names the formats in public. It must carry current siglas only, must never name a retired one, and must be data-driven so it cannot drift from what the production pipeline publishes.
3. **Series numbering is a monotone guard.** The format model must accept the numbers already assigned. A migration that renumbers to make the new model tidy would invalidate printed material.
4. **The access model is Critical-class throughout.** Roles and assignments decide who sees member data and who can act at the door. The security boundary is RLS, not the middleware — an assignment enforced only in navigation is not enforced.
5. **A credit must not become a gate.** Auto-provisioning accounts for credited people would let non-members inside a community whose value is the gate. The "credit without account" path is not a convenience; it is what keeps the invariant.
6. **The door and the bar must not share a mechanism.** They have opposite defaults by design. A shared "record action offline" helper used by both will, at some point, mark a drink served without server confirmation.
7. **No test runner exists.** Every item here is verified by `npm run build` plus a written manual procedure. The door items additionally need a dark-venue, network-off pass, written step by step — including at least one two-device offline scan of the same ticket, which is the only way the conflict path is ever exercised.

---

## Open Questions

- **Assignment vocabulary.** How many named types, and their exact names. The research says "few and named"; it cannot say which names read correctly at 2 a.m. to this team. Needs a decision, not more research.
- **Assignment level.** Event-level, party-level, or both. Mature venue software keeps two separate lists; this project already has the two-level structure. Whether the team needs both on day one is a product call.
- **Undo scope.** Comparable products restrict it to managers. v1.4 gave it to any scanner. This needs a declared decision either way — it is currently an implicit widening of what an assignment grants.
- **Poll interval, and whether to publish it.** 7–10 s is the observed range. Battery cost and Supabase read cost over a long night were not researched.
- **Whether the Upcoming / Past axis also moves into the URL.** It is local component state today. Two axes in the URL is more correct and more work; one axis in the URL and one in state produces a half-shareable link, which is arguably worse than either.
- **Credit-to-member linking cardinality.** Whether one credit may reference one member, or a credit may exist independently and be reconciled later. Both shapes are used in the wild.

---

## Sources

Vendor names are given because the claims are attributable, not as endorsements.

**Staff roles and per-event assignment**
- Cvent — *Using Event Roles* (official support documentation): event role vs user role; "No Login User" — **HIGH**
- Momentus Elite — *Staff Assignments for Events and Functions* (official support centre): named responsibility slots; event-level vs function-level lists; account required to be assigned; assignments drive task routing, list display and filtering — **HIGH**
- Zoho Backstage — *Event members* FAQ (official knowledge base): event member vs attendee; speakers hold no permissions by default; permissions arrive only via an additional role; custom roles at portal and event level — **HIGH**
- Venuera — *Live counts & the Door Staff role*, *Door-staff account* (vendor documentation): a single-capability Door Staff role; per-account All-events / selected-events access list; undo restricted to managers and disableable — **MEDIUM-HIGH**

**Public credits vs accounts**
- Resident Advisor Pro — *User accounts and promoter pages*, *Tagging Artists In Your Lineup* (official support): user account vs promoter page vs artist page; one event admin; tagging produces click-through, back-listing and follower notification — **HIGH**
- Evessio — *Inviting Speakers And Adding Speaker Profiles* (vendor documentation): "not compulsory to invite a speaker to log in in order to display"; Save vs Save and Invite — **MEDIUM-HIGH**

**Door freshness, offline and trust**
- Ticket Tailor — *When does my Check-in app sync?* (official help centre): 7 s ticket/check-in sync, 2 min events, 3 min user data and permissions, pull-to-refresh, screen-scoped sync — **HIGH**
- Venuera — *Offline mode* (vendor documentation): pre-doors snapshot, offline badge with pending count, rules engine on device, ordered replay stamped at door time, cross-device conflict detection, safe resync — **MEDIUM-HIGH**
- Turtini — *How offline mode works at events* (vendor documentation): device-local decisions, idempotency keys, conflicts surfaced rather than silently resolved, sync panel with retry — **MEDIUM**
- ThunderTix — barcode scanner feature documentation: repeat scan shows original scan time and the staff member who checked in — **MEDIUM**
- QR Code Ticket — *Offline check-in* (vendor documentation): sync every device before doors; offline data goes stale when attendee data changes — **MEDIUM**
- AizuPass — *Offline check-in and sync* (vendor documentation): independent per-device sync; server resolves at sync; the second device sees "already checked in" — **MEDIUM**

**Filter UX and accessibility**
- SaaSUI.Design — *SaaS Filtering & Sorting UX: Examples & Patterns* (June 2026): quick-filter ceiling of 5–6; visible applied state; one-click clear; designed empty state; persistence; URL state; result counts; stated defaults; the eight named mistakes — **MEDIUM-HIGH** (single authored source, but every claim is a widely corroborated convention and it is current)
- Next.js — official documentation via Context7 (`/vercel/next.js`): `<Link scroll={false}>`, `replace`, `useSearchParams()` and its Suspense/prerender behaviour — **HIGH**
- axe / WCAG 2.1.1 — `scrollable-region-focusable`: an `overflow:auto` region that can scroll must be keyboard focusable — **MEDIUM-HIGH**

**Codebase verification** (checked directly against current source, not against `.planning/codebase/`, which is stale)
- `src/types/database.ts` — `checked_in`, `checked_in_at`, `checked_in_by` present on tickets and guest-list entries; `lineup: string[]`
- `supabase/schema.sql` — `lineup text[] default '{}'`
- `src/app/api/tickets/checkin/route.ts` — writes `checked_in_by` on check-in; reads it on an already-checked-in ticket
- `src/lib/rbac/roles.ts` — `master` / `organizer` / `member`; `pending` / `approved` / `rejected` as an independent axis
- `src/lib/offline/` — `checkin-store.ts`, `sync-manager.ts` (v1.4 queue in place)
- `src/app/(public)/events/EventTabs.tsx` — Upcoming / Past held in component state, not in the URL; `is_draft` present on the card shape
- No Supabase Realtime channel or `postgres_changes` subscription anywhere in `src/` — a subscription-based approach would be net-new infrastructure

---
*Feature research for: private invitation-only music events platform, milestone v1.5*
*Researched: 2026-08-05*
