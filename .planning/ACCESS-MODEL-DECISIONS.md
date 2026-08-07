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

---

## Roadmap consequence

**Phase 35 (per-night assignments) now precedes phase 34 (one work surface).**
Phase 34 collapses the admin and organizer trees into a single capability-driven
surface; building that before assignments exist would mean building it once for
three roles and again for four roles plus assignments.

Phase 33 (server data-access layer) is unaffected and still comes first — it is
where identity and capability are resolved in one server-only place, which both
34 and 35 need.

## What this does NOT settle

- Whether a night's assignment can be delegated further, and by whom.
- What a staff member sees of the members list, takings and other people's data.
  Stated as "only their own assigned work"; the exact surfaces are phase 34's
  subject.
- Public credit for a performer, which the roadmap already keeps separate from
  permissions.
