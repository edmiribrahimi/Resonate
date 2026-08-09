/**
 * The twelve capability keys, named once.
 *
 * This module is the source. It imports nothing — not even
 * `@/types/database`, which imports *from here* — for the same reason
 * `@/lib/door/outcome` imports nothing: a file that is the source of a literal
 * cannot depend on a file that consumes it without making the direction of
 * truth ambiguous.
 *
 * ── The difference from `outcome.ts`, and it matters ─────────────────────────
 *
 * `outcome.ts` says its literals are mirrored by SQL `CHECK` constraints on
 * `public.door_scan_events`. That is a real cross-check: half of it is
 * automatic, because the database physically refuses a row whose `outcome` is
 * not one of the three.
 *
 * **A capability key has no such mirror.** A key here is:
 *   - a string inside a policy body — `(select private.has_capability('…'))`;
 *   - a row in `private.capabilities`.
 *
 * `npm run build` proves the existence of **neither**. No Supabase client in
 * this repository is parameterised with a `Database` type
 * (`src/lib/supabase/client.ts:4`, `server.ts:7`, `middleware.ts:15`,
 * `service.ts:4`), so `supabase.rpc("my_access_context")` is untyped and a
 * misspelled capability key is a runtime `false`, not a compile error. A
 * runtime `false` on a capability check is a refusal — which, at the door, is
 * the failure that happens in front of a queue.
 *
 * The check that closes the gap is `scripts/verify-capabilities.mjs`, added by
 * plan `32-10`: it reads `private.capabilities` and asserts that the set below
 * and the catalogue are the same twelve strings. Until it runs, the guarantee
 * here is a convention, not a mechanism.
 *
 * **Editing this file means editing the migration in the same commit** — the
 * same rule `outcome.ts` states for its `CHECK` constraints, for the same
 * reason, with one less safety net.
 *
 * ── Named by the question, not by the predicate ──────────────────────────────
 *
 * Three of these nine resolve to the same predicate today — `STAFF_MANAGE`,
 * `ORGANIZER_ACCESS` and `DOOR_OPERATE` are all "role ∈ {master, organizer},
 * status ignored". They are deliberately three keys and not one, because they
 * are three different questions. A later phase that grants one night's door
 * must be able to grant `door.operate` without also granting sixteen tables,
 * and a key named after its predicate makes that impossible.
 *
 * `REGISTER_READ`, added by plan 43-07, is the ninth and is the rule applied
 * rather than restated. Its predicate — role ∈ {master, organizer} AND status =
 * approved — is `CATALOGUE_MANAGE`'s, exactly. It is a separate key because
 * *may this subject read who was rejected* is not *may this subject create an
 * artist or a venue*, and merging them would make the two impossible to
 * separate later. The alternative that was refused is worse than a duplicate
 * predicate: gating the register on `STAFF_MANAGE` would have admitted an
 * organizer whose own access was never approved, and the "tidy" repair —
 * flipping that key's `requires_approved` — is the same `false` that keeps
 * `DOOR_OPERATE` open in front of a queue.
 *
 * ── The tenth, eleventh and twelfth, added by plan 35-03 ─────────────────────
 *
 * `DOOR_SUPERVISE`, `MEDIA_UPLOAD` and `PARTY_MANAGE` are the three keys a
 * per-night assignment may carry besides `DOOR_OPERATE`
 * (`20260809000000_party_assignments.sql:340-342` names all four). They are the
 * naming rule above applied a third time, and each of them exists because the
 * obvious reuse was WRONG in a specific direction:
 *
 *   - `DOOR_SUPERVISE` on `DOOR_OPERATE` would make every operator a
 *     supervisor, which is exactly what ASSIGN-05 refuses; on `STAFF_MANAGE` it
 *     would hand one night's supervision the whole back office for ever.
 *   - `MEDIA_UPLOAD` on `MEMBERSHIP_ACTIVE` would confuse the per-night work
 *     upload with the member-level contribution every approved account already
 *     has — the distinction `20260808000500_staff_role.sql:125-136` was written
 *     to keep.
 *   - `PARTY_MANAGE` on `ORGANIZER_ACCESS` would open the organizer AREA, which
 *     is a property of the account with no night in it, instead of one night's
 *     surfaces.
 *
 * **Their consumers arrive after this file.** `PARTY_MANAGE` is read by the
 * door register's policy (plan 35-09) and by the per-night review page (35-17);
 * `MEDIA_UPLOAD` by the upload guard (35-16) and the media surface (35-21);
 * `DOOR_SUPERVISE` by the door guard and the undo path (35-07, 35-11, 35-13).
 * Until those land, side 4 of `scripts/verify-capabilities.mjs` reports them as
 * keys nobody asks for — a WARNING, deliberately, and the one Phase 34's CAP-02
 * will later turn into a build failure. It is arriving early on purpose; it is
 * not silenced.
 */

/**
 * The twelve keys. Spelled exactly as the rows of `private.capabilities`
 * (`supabase/migrations/20260807000000_capability_model.sql` section 7,
 * `20260808002000_membership_register.sql` section 1 for the ninth, and
 * `20260809001000_assignment_resolver.sql` section 1 for the last three).
 */
export const CAP = {
  /** P1 — the 34 policies gating on `is_admin_or_organizer()`. Status ignored. */
  STAFF_MANAGE: "staff.manage",
  /** P2 and P4 — `is_master()` and the two inline master `EXISTS` bodies. */
  MASTER_MANAGE: "master.manage",
  /** P3 — the four `artists`/`venues` organizer policies. Status REQUIRED. */
  CATALOGUE_MANAGE: "catalogue.manage",
  /** P5 — `get_user_status() = 'approved'` alone; role irrelevant. */
  MEMBERSHIP_ACTIVE: "membership.active",
  /** Middleware `/admin/*` except the scanner: master, status ignored. */
  ADMIN_ACCESS: "admin.access",
  /** Middleware `/organizer/*`: role only, status ignored. */
  ORGANIZER_ACCESS: "organizer.access",
  /** Middleware `/admin/scanner` and the four door routes: ROLE ALONE. */
  DOOR_OPERATE: "door.operate",
  /** Middleware `/membership-card` and `/attendance`: status alone, any role. */
  MEMBERSHIP_CARD_VIEW: "membership.card.view",
  /** Read the register of acts on a member's role and status. Role AND approved. */
  REGISTER_READ: "register.read",
  /** Reverse a check-in already recorded at the door. ASSIGN-05, and NOT `DOOR_OPERATE`. */
  DOOR_SUPERVISE: "door.supervise",
  /** Upload media to a night. The per-night work upload, not `MEMBERSHIP_ACTIVE`. */
  MEDIA_UPLOAD: "media.upload",
  /** Manage one night's operational surfaces. Not `ORGANIZER_ACCESS`, which is the area. */
  PARTY_MANAGE: "party.manage",
} as const;

export type CapabilityKey = (typeof CAP)[keyof typeof CAP];

/**
 * One sentence per key, for the humans who read a permission decision.
 *
 * Typed as a **total** `Record` over the union on purpose, exactly as
 * `DOOR_OUTCOME_KINDS` is in `@/lib/door/outcome`: adding a thirteenth key to
 * `CAP` without a description here is a `npm run build` error, and removing a
 * key leaves an unreachable entry that is also an error. It is the one part of
 * this file's contract the compiler can hold — and it held it when the ninth key
 * landed, and again when the tenth, eleventh and twelfth did, which in a
 * repository with no test runner is worth saying rather than assuming.
 *
 * It cannot hold the other part — that these strings match the twelve rows in
 * `private.capabilities`. That is `scripts/verify-capabilities.mjs`'s job.
 */
export const CAP_DESCRIPTIONS: Record<CapabilityKey, string> = {
  "staff.manage":
    "Manage the staff surfaces: events, parties, tickets, tiers, drinks, guest lists, media moderation. Role only — a pending organizer holds this.",
  "master.manage":
    "Operations reserved to the master role: deleting an event, deleting an artist or a venue, changing another member's role or status.",
  "catalogue.manage":
    "Create and edit artists and venues. Requires an approved status as well as the role — this is the other, stricter definition of organizer.",
  "membership.active":
    "Act as an approved member: upload event media, rsvp. Status only; every role holds it once approved.",
  "admin.access": "Reach the admin area other than the scanner.",
  "organizer.access": "Reach the organizer area.",
  "door.operate":
    "Work the door: scan, admit, undo. Role alone, deliberately — a pending organizer must not be refused in front of a queue.",
  "membership.card.view":
    "See the membership card and the attendance history. Status alone, any role.",
  "register.read":
    "Read the register of acts on a member's role and status — who was created, approved, rejected, promoted, demoted, deactivated or reactivated, by whom and when. Role AND an approved status, because the register contains rejections.",
  "door.supervise":
    "Reverse a check-in already recorded at the door. A different question from door.operate: an operator admits, a supervisor undoes. Role alone on both grants, deliberately — the undo is what corrects a wrong refusal, and it happens in front of a queue.",
  "media.upload":
    "Upload media to a night. The per-night work upload — the photographer uploading to the night they worked — not the member-level contribution, which is membership.active.",
  "party.manage":
    "Manage one night's operational surfaces: that night's review, its door register, its guest list. Scoped to a single date, which is why it is not organizer.access.",
};
