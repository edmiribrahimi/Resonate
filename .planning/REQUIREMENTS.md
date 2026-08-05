# Requirements: Resonate — v1.5 Platform Layout, Access Model & Door Fixes

**Defined:** 2026-08-05
**Core Value:** Members can discover events, confirm attendance, and buy tickets within a trusted, curated community — the gating mechanism (referral + approval) is what makes the community valuable.

> **Note on wording.** These requirements name **roles**, never individuals.
> `.planning/` is tracked in a public repository.

## Guiding constraints for this milestone

Three rules override any requirement below that appears to contradict them:

1. **The door decides locally.** No scan outcome ever waits on the network, a
   socket, or a poll. The verdict comes from the on-device cache, always.
2. **The door admits and flags; the bar records nothing without confirmation.**
   Opposite defaults, deliberately: at the door a wrongly-refused guest is a
   queue, at the bar an unconfirmed drink is money that vanishes.
3. **The database is the security boundary.** Capability checks improve the
   interface and the server's answer; RLS is what actually holds when someone
   calls the API directly.

## v1.5 Requirements

### Live Defects (present in production today)

- [x] **FIX-01**: An inbound `x-user-*` request header can never reach a Server Component or server action — the middleware clears them before deciding whether to set them *(applied 2026-08-05)*
- [x] **FIX-02**: Pressing "serve" on an already-served drink token fails with a distinct message instead of reporting success *(applied 2026-08-05, both callers)*
- [ ] **FIX-03**: A genuine duplicate check-in survives synchronisation and is reported, instead of being deleted from the queue because the conflict response returns HTTP 200
- [ ] **FIX-04**: A genuine offline duplicate shows "already checked in" with the first scan's time and the person who recorded it — never "connection error"
- [ ] **FIX-05**: Refreshing the attendee cache merges instead of replacing: an unsynced local check-in is never reverted by a server refresh
- [ ] **FIX-06**: The attendee cache is never momentarily empty during a refresh — a scan during the refresh window cannot refuse a valid guest
- [ ] **FIX-07**: Two check-ins for the same person at two different parties on one device are queued as two entries, not one overwriting the other
- [ ] **FIX-08**: A membership sync that fails permanently is recorded as failed rather than retried forever, so the pending count means something
- [ ] **FIX-09**: A ticket refunded after the cache was downloaded is admitted and flagged for review, both online and offline
- [ ] **FIX-10**: A queued offline scan carries the signed token it was read from, so synchronising a check-in still proves possession of the ticket instead of accepting a bare identifier

### Capability Model

- [ ] **CAP-01**: Every capability is defined once in the database and evaluated by the same function whether the caller is a page, a server action, or a row-level policy
- [ ] **CAP-02**: A capability that exists in the database but is not assigned to a route fails the production build
- [ ] **CAP-03**: Existing role behaviour is reproduced exactly by the new model — a master, an organizer and a member can do neither more nor less than before this milestone
- [ ] **CAP-04**: A per-night grant takes effect immediately, without waiting for a session or token to refresh
- [ ] **CAP-05**: No surface derives permission from a request header; identity comes from the session
- [ ] **CAP-06**: Every existing row-level policy is reviewed for the performance pattern that re-evaluates the current user per row

### Unified Work Surface

- [ ] **STAFF-01**: Each work surface exists once, not once per role, and shows what the viewer is entitled to see
- [ ] **STAFF-02**: Existing `/admin/*` and `/organizer/*` addresses keep working through permanent redirects
- [ ] **STAFF-03**: Navigation is generated from capabilities — a hidden entry always has a matching server-side check
- [ ] **STAFF-04**: The door keeps its own address and is not moved in the same step as the rest, because a redirect needs a network the door may not have

### Per-Night Assignments

- [ ] **ASSIGN-01**: A staff member can be assigned to a single night as door, photo or organizer, without changing what they can do on any other night
- [ ] **ASSIGN-02**: An assignment ends by itself: access to a night's tools does not outlive the night
- [ ] **ASSIGN-03**: Revoking an assignment is one action, recorded rather than deleted, and never strands a scan already queued offline
- [ ] **ASSIGN-04**: Nobody can grant an assignment to themselves
- [ ] **ASSIGN-05**: Undoing a check-in requires a supervising capability — a person assigned to the door for the night cannot undo, unless they are also an organizer
- [ ] **ASSIGN-06**: A dj or photographer credit grants no access to any tool, and a credit can exist for someone who has no account at all
- [ ] **ASSIGN-07**: Crediting a person never creates an account for them — in a referral-gated community an account is membership
- [ ] **ASSIGN-08**: The door assignment is resolved and cached when the scanner opens, not checked at each scan

### Formats & Series

- [ ] **FMT-01**: Each night carries its format, so one event can hold two nights of different formats
- [ ] **FMT-02**: A series code and its number compose the sigla; the number is stored, never recomputed from a count
- [ ] **FMT-03**: The database refuses two nights with the same format, series and number
- [ ] **FMT-04**: A visitor can see all events or filter to one format, and the choice survives navigation and can be shared as a link
- [ ] **FMT-05**: Format labels and colours come from data, so a retired sigla cannot appear and a colour can change without a deploy
- [ ] **FMT-06**: No count, label or code on a public surface reveals an unannounced night or a secret venue

### Live Attendance Freshness

- [ ] **LIVE-01**: While the device has network, the attendee list updates at the moment the data changes, without staff action
- [ ] **LIVE-02**: The scan decision is taken from the local cache and never waits on, or is disabled by, the live connection
- [ ] **LIVE-03**: Every reconnection triggers a full reload, because the channel does not recover what happened while it was down
- [ ] **LIVE-04**: An infrequent safety reload runs underneath the live channel, so a channel that dies silently cannot leave a stale list
- [ ] **LIVE-05**: Staff can see whether the list is live and how fresh it is, and can force a refresh by hand
- [ ] **LIVE-06**: Only a person assigned to that night can listen to that night's updates
- [ ] **LIVE-07**: The door and the bar do not share an offline mechanism

### Venue Reveal

- [ ] **VENUE-01**: The scheduled reveal remains the normal path
- [ ] **VENUE-02**: A master or an organizer can trigger the reveal by hand, behind an explicit confirmation, recording who did it and when

### Design System

- [ ] **DS-01**: Colour, surface and line come from tokens; no page defines its own brand colour
- [ ] **DS-02**: Format colours appear only where a format is identified, and semantic colours are separate from brand colours
- [ ] **DS-03**: The sunset gradient appears on SunSet surfaces and nowhere else
- [ ] **DS-04**: Scanner feedback colours stay saturated and unmistakable, and colour is never the only channel
- [ ] **DS-05**: Display, data and interface each have one typeface, and data figures align in columns
- [ ] **DS-06**: The brand is written with a normal "e" everywhere outside the logo — including page titles, social previews and the installed app name
- [ ] **DS-07**: A recurring pattern is a shared component, and a page adopts it when that page is converted — never by global replacement
- [ ] **DS-08**: A dialog behaves as a sheet on a phone and a window on larger screens, from one implementation
- [ ] **DS-09**: A dense table becomes cards on a phone rather than scrolling sideways
- [ ] **DS-10**: After a release, no device is left serving a mixture of old and new styles

### Responsive Layout

- [ ] **RESP-01**: Every surface is usable on phone, tablet and desktop, with the layout chosen for the device the surface is actually worked on
- [ ] **RESP-02**: Content stops widening on large screens instead of stretching
- [ ] **RESP-03**: Touch targets stay large wherever the input is a finger, including large touch screens
- [ ] **RESP-04**: Work surfaces show filters and navigation without hiding them behind a menu from tablet size up
- [ ] **RESP-05**: The scanner centres rather than stretches, and its behaviour is unchanged by the visual work

## Future Requirements

Deferred, tracked, not in this roadmap.

| ID | Requirement | Why deferred |
|---|---|---|
| **PROD-01** | The production calendar lives in the product rather than outside it | Needs the capability model and the format model first; it is an import, not a migration |
| **PROD-02** | Production sections are visible per section to the staff entitled to them | Depends on the capability model shipping first |
| **MEDIA-01** | Uploaded media is private by default and reachable only through an authorised, expiring link | Own milestone: touches every existing public URL |
| **MEDIA-02** | Image metadata is stripped on upload, so a photo taken at a secret venue cannot carry its coordinates | Own milestone, but the highest-value item in it |
| **MEDIA-03** | Rejecting media makes it unreachable while keeping it in the internal archive | Own milestone |
| **QR-01** | Access-granting codes are generated with a cryptographic source | Independent of this milestone; still true, still open |
| **RATE-01** | Endpoints that answer "valid / not valid" are rate limited | Independent; no rate limiting exists anywhere today |
| **OBS-01** | A production failure reaches a human without someone noticing the effect first | No error tracking exists; deliberately out of this milestone |

## Out of Scope

| Feature | Reason |
|---|---|
| Translating the interface | The interface stays English — decided this milestone, and consistent with the visual materials |
| Rethinking navigation structure | Navigation changes **form** by device, not structure; restructuring is a different project |
| A custom role builder | Under ten people; named roles plus per-night assignments cover every case raised |
| Realtime presence indicators | Freshness is the requirement, not knowing who else is watching |
| Auto-creating accounts for credited artists | An account is membership in a gated community — that gate is not opened to print a name |
| Redesigning scanner interaction | Colour, contrast and type only; behaviour is a safety surface |
| Importing the production calendar | Deferred with PROD-01 |

## Traceability

Every v1.5 requirement maps to exactly one phase. Phase numbering continues from
v1.4 (last phase: 30) — this milestone runs 31 → 42.

| Requirement | Phase | Status |
|-------------|-------|--------|
| FIX-01 | Phase 31 | Complete (applied 2026-08-05) |
| FIX-02 | Phase 31 | Complete (applied 2026-08-05) |
| FIX-03 | Phase 31 | Pending |
| FIX-04 | Phase 31 | Pending |
| FIX-05 | Phase 31 | Pending |
| FIX-06 | Phase 31 | Pending |
| FIX-07 | Phase 31 | Pending |
| FIX-08 | Phase 31 | Pending |
| FIX-09 | Phase 31 | Pending |
| FIX-10 | Phase 31 | Pending |
| CAP-01 | Phase 32 | Pending |
| CAP-03 | Phase 32 | Pending |
| CAP-04 | Phase 32 | Pending |
| CAP-06 | Phase 32 | Pending |
| CAP-05 | Phase 33 | Pending |
| CAP-02 | Phase 34 | Pending |
| STAFF-01 | Phase 34 | Pending |
| STAFF-02 | Phase 34 | Pending |
| STAFF-03 | Phase 34 | Pending |
| ASSIGN-01 | Phase 35 | Pending |
| ASSIGN-02 | Phase 35 | Pending |
| ASSIGN-03 | Phase 35 | Pending |
| ASSIGN-04 | Phase 35 | Pending |
| ASSIGN-05 | Phase 35 | Pending |
| ASSIGN-06 | Phase 35 | Pending |
| ASSIGN-07 | Phase 35 | Pending |
| ASSIGN-08 | Phase 35 | Pending |
| FMT-01 | Phase 36 | Pending |
| FMT-02 | Phase 36 | Pending |
| FMT-03 | Phase 36 | Pending |
| FMT-04 | Phase 36 | Pending |
| FMT-05 | Phase 36 | Pending |
| FMT-06 | Phase 36 | Pending |
| VENUE-01 | Phase 37 | Pending |
| VENUE-02 | Phase 37 | Pending |
| LIVE-01 | Phase 38 | Pending |
| LIVE-02 | Phase 38 | Pending |
| LIVE-03 | Phase 38 | Pending |
| LIVE-04 | Phase 38 | Pending |
| LIVE-05 | Phase 38 | Pending |
| LIVE-06 | Phase 38 | Pending |
| LIVE-07 | Phase 38 | Pending |
| STAFF-04 | Phase 39 | Pending |
| DS-01 | Phase 40 | Pending |
| DS-02 | Phase 40 | Pending |
| DS-03 | Phase 40 | Pending |
| DS-05 | Phase 40 | Pending |
| DS-06 | Phase 40 | Pending |
| DS-10 | Phase 40 | Pending |
| DS-07 | Phase 41 | Pending |
| DS-08 | Phase 41 | Pending |
| DS-09 | Phase 41 | Pending |
| RESP-01 | Phase 41 | Pending |
| RESP-02 | Phase 41 | Pending |
| RESP-03 | Phase 41 | Pending |
| RESP-04 | Phase 41 | Pending |
| DS-04 | Phase 42 | Pending |
| RESP-05 | Phase 42 | Pending |

**Coverage:** 57 / 57 mapped. No orphans, no requirement assigned twice.
