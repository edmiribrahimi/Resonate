# Access model — decisions of 2026-08-06

Owner decisions taken in conversation, recorded here so later phases stop
re-deriving them. **Roles only, never people** — this repository is public.

Supersedes nothing already built. Phase 32 delivered the capability model these
decisions now extend.

---

## 1. Four roles

`master` · `organizer` · `staff` · `member`

Today the schema admits three (`supabase/schema.sql:59`,
`check (role in ('master','organizer','member'))`), and
`private.role_capabilities` holds 16 grant rows across those three. Adding
`staff` means changing that constraint and giving the new role its own grants.

## 2. `staff` grants ONE thing, and it is not a work permission

**Being staff means: free entry to a night, via the membership card QR,
permanently — including for someone who worked a single date.**

It grants **no** ability to upload photos, run the door, or manage an event.

**Derived consequence for the capability model:**
- `membership.card.view` → granted to `staff`, `requires_approved = true`
- `door.operate` → **NOT** granted to `staff` by role
- `staff.manage`, `catalogue.manage`, `organizer.access`, `admin.access`,
  `master.manage` → **not** granted to `staff`

## 3. Work permissions come from the per-night assignment, and expire with the night

A photographer uploads photos **to the night they worked**. Door staff run
check-in **at that door**. A performer edits **their own page**. Someone who is
staff but is not working tonight enters free and can do nothing else.

This is **Phase 35 — Per-Night Assignments**, already on the roadmap:
*"what a person can do on one night is granted for that night alone, separate
from role and separate from public credit."* The owner's description and that
line are the same design.

**Rejected alternatives, with the reason:**
- *One `staff` role carrying every work permission* — a performer could run the
  door and door staff could upload to any gallery, including nights they never
  worked. Powers leak across jobs.
- *One role per trade (`staff_photo`, `staff_door`, …)* — every new trade is a
  schema change and every new permission must be added by hand to each trade.
  That is the scattered-predicate disorder phase 32 removed.

An "organiser" in the owner's examples is **not** staff — that is the existing
`organizer` role.

## 4. Creating an account IS the act of approval

Only `master` and `organizer` create accounts, and only they approve pending
requests. Creating an account is therefore approval performed by someone
entitled to approve — **not** a lane around the gate.

**Condition, and it is not optional:** a created account must land in the **same
register** as an ordinary approval, with the same author and the same timestamp.
Two entry paths where only one leaves a trace makes the entry history unusable
within a season.

## 5. Attribution is required across the board

Every one of these records **who** did it and **when**: approval, rejection,
account creation, role promotion, per-night assignment, and a door override.

Stated by the owner as a requirement, and it is what makes decisions 4 and 6
safe.

## 6. An organizer may promote staff → organizer. An organizer may NOT create a master.

The power replicates on purpose: requiring the master for every promotion makes
one person the bottleneck of their own community. It is permitted and
**counted**, per decision 5.

The ceiling is deliberate: a self-replicating power must not reach the top.

## 7. The invitation carries a link, never a password

The created account is **valid immediately** — the person can enter a night with
their membership card without ever having logged in. The email carries a link to
**set their own password**; it never carries a password.

A password sent by email lives in that inbox forever. The pattern already exists
in this repository at `src/lib/guest-list/process-entry.ts:220`
(`createUser` + `generateLink`) and is to be reused, not reinvented.

## 8. Staff accounts do not expire; deactivation is manual

Accepted as stated. One consequence to keep visible rather than to solve now:
target venues hold 150–300 people, and each staff account is a **permanent free
entry**. After two seasons that is a standing block of seats given away months
in advance rather than that night.

**Therefore: a free staff entry must be recorded in the night's attendance like
any other.** Phase 31 already records attendance per party. Uncounted entries
make the night's numbers wrong exactly where they are relied on.

## 9. Association deferred — dated, not assumed

Until the association exists, **"socio" means "approved member"**, and every
account (master, organizer, staff, member) is a member of the community.

Recorded **2026-08-06** and to be re-opened, not inherited: the day the
association opens, that sentence stops being a product choice and becomes a
legal statement. See `.claude/rules/legal-compliance.md`.

## 10. No second standing master. Fix the recovery path instead.

The backup master is a spare key for losing the first one — not a second set
carried daily (the owner's day-to-day work account is an `organizer`).

A recovery mechanism already exists: `MASTER_EMAIL`
(`src/app/api/auth/callback/route.ts:27`), checked on every login.

**It has a real defect, and this is a work item:** it promotes and **never
demotes**. Every past master stays master forever, and nothing declares this.
It is an undeclared one-way switch — the class of error this project treats as
the most dangerous (`.claude/rules/meta-gates.md`, monotone guards).

Repairing it yields a clean recovery path **without** a permanently live second
administrator.

## 12. Manual verification is deferred to the end of the build, deliberately

**Owner decision, 2026-08-06:** phase 32's fourteen manual checks
(`32-HUMAN-UAT.md`, all `pending`) are **not** run now. The build continues
through phases 33, 43, 35 and 34, and everything is verified by hand at the end.

Recorded because it is a decision with a price, not an oversight. The concern was
raised and the owner decided against it, which closes it.

**The price, stated once so nobody re-derives it in surprise:** phases 33, 43, 35
and 34 all build on phase 32's capability model. If one of those fourteen checks
is red, whatever was built on top of it is built on a wrong foundation, and the
rework is proportional to how much was built. The two that carry the most:

- **the door** — a `pending` organizer must be able to load `/admin/scanner`;
- **CAP-04** — a permission change must take effect on the next request
  (procedure M-01, five timestamps).

`32-HUMAN-UAT.md` stays `status: partial` and keeps surfacing in
`/gsd:progress` and `/gsd:audit-uat` until it is closed.

## 11. "A staff role implies approved" becomes a database rule, not a convention

**Owner decision, 2026-08-06:** an account holding a staff role
(`master`, `organizer`, and `staff` when it lands) is **always** `approved`.
An organizer awaiting approval is not a state this product will ever have.

### Why this is a change, even though the behaviour already holds

Measured across every path that writes `role` or `status`:

| Path | Writes |
|---|---|
| promote to organizer (`updateMemberRole`) | role **and** `status = 'approved'` |
| deactivate (`deactivateMember`) | `status = 'rejected'` **and** `role = 'member'` |
| reject (`rejectMember`) | `status = 'rejected'` **and** `role = 'member'` |
| reactivate (`reactivateMember`) | `status = 'approved'` only |
| `MASTER_EMAIL` promotion | `role = 'master'`, `status = 'approved'` |
| the 2026-02-24 RBAC migration | role `organizer`, status defaulted `approved` |

So `organizer/pending` and `organizer/rejected` are **already unreachable
through the application** — the two rejection paths demote as well as reject.

**But nothing states the rule.** It holds because four separate functions each
remember to do the right thing. There is no constraint. The fifth function
breaks it, and five new paths are arriving: account creation by an organizer,
the `staff` role, per-night assignments, phase 33's rewrite of authorisation
across 44 files, and phase 34's single work surface.

A rule enforced in four places is a convention. This decision makes it true by
construction.

### THE COST, WHICH IS REAL AND MUST BE PAID DELIBERATELY

Phase 32's container seeds **eleven personas**, four of which are
`organizer/pending`, `organizer/rejected`, `master/pending`, `master/rejected`.

A `CHECK` constraint makes those four **unrepresentable**.

**Those same four personas are the ONLY reason phase 32 caught its worst
defect.** When plan 32-07 deliberately collapsed `catalogue.manage` into
`staff.manage` — the exact mistake that hands an unapproved organizer powers
they do not have — the policy catalogue passed it, production's write matrix
would have passed it in silence, and only the container's write matrix caught
it: **sixteen cells, every one of them belonging to those four personas.**

**Therefore the harness must keep the ability to seed those states** — drop the
constraint while seeding, restore it afterwards — or this decision buys a real
rule at the price of the only net that has already caught something. Whoever
implements the constraint owns that, and it is not optional.

### The trap to refuse when it comes

Once the constraint exists, it will look as though `door.operate`'s
`requires_approved = false` is redundant, and someone will propose removing it
as tidying.

**Refuse.** The constraint protects the database. The door's setting protects
the night from the day the constraint is relaxed for one special case. The two
guard different things, and the asymmetry is unchanged: refusing a valid staff
member at the door, in front of a queue, is worse than the alternative.

### Where this work lives

**Not in phase 33** — that phase's subject is where identity is resolved, not
what states exist. It belongs with the work that introduces the `staff` role and
account creation, which has **no phase on the roadmap yet** (see below).

---

## Roadmap consequence

**Phase 35 (per-night assignments) now precedes phase 34 (one work surface).**
Phase 34 collapses the admin and organizer trees into a single capability-driven
surface; building that before assignments exist would mean building it once for
three roles and again for four roles plus assignments.

Phase 33 (server data-access layer) is unaffected and still comes first — it is
where identity and capability are resolved in one server-only place, which both
34 and 35 need.

**Applied to `ROADMAP.md` on 2026-08-06, in an action of its own** — reordering
two phases inside a third phase's workflow is exactly the change that enters
sideways, so it was not done while phase 33 was open. Execution order is now
**33 → 43 → 35 → 34 → 36 → …**, expressed by position and by `Depends on`.
**No phase was renumbered**: 34 and 35 are cited by committed documents, one of
them a closed verification record, and a number is an identity rather than a
position.

### A gap: four decisions have no phase to live in

Decisions 1, 2, 4, 6, 7 and 11 above describe work that **is not on the roadmap
at all**:

- adding the fourth role `staff` (schema constraint + its rows in
  `private.role_capabilities` + a decision per capability)
- account creation by `master` and `organizer`, with the invitation link
- the attribution register (who created, promoted, approved, assigned, overrode
  — and when)
- the `role ⇒ approved` constraint of decision 11, with the harness change it
  forces

Phase 35 covers per-night assignments, phase 34 the single surface; **none of
them covers the above.** Left unplaced, this work will be absorbed piecemeal
into whichever phase is open when it becomes urgent — which is how a phase stops
being able to say what it changed.

**Delivered 2026-08-06: `Phase 43 — Role Model & Account Creation`**, placed in
`ROADMAP.md` immediately after phase 33 and before phase 34, carrying decisions
1, 2, 4, 6, 7, 8, 10 and 11 as `ROLE-01…04` and `ACCT-01…05` in
`REQUIREMENTS.md`.

## What this does NOT settle

- Whether a night's assignment can be delegated further, and by whom.
- What a staff member sees of the members list, takings and other people's data.
  Stated as "only their own assigned work"; the exact surfaces are phase 34's
  subject.
- Public credit for a performer, which the roadmap already keeps separate from
  permissions.
