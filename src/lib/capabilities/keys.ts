/**
 * The seventeen capability keys, named once.
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
 * and the catalogue are the same seventeen strings. Until it runs, the guarantee
 * here is a convention, not a mechanism.
 *
 * ⚠ AND IT IS RED FROM THIS COMMIT, ON PURPOSE. Phase 45 splits one key into
 * four across two commits that cannot be one — a code commit and an applied
 * migration — so between them the two sides disagree BY CONSTRUCTION. From here
 * until plan 45-08 applies `20260817120000_production_section_keys.sql`, this
 * file declares seventeen keys while the database holds fourteen; between that
 * application and the retirement in plan 45-09 the database holds eighteen. Both
 * reds are the gate working. **Neither is repaired by editing a constant in
 * `verify-capabilities.mjs`** — that is the exact failure its own comment names.
 *
 * **Editing this file means editing the migration in the same commit** — the
 * same rule `outcome.ts` states for its `CHECK` constraints, for the same
 * reason, with one less safety net.
 *
 * ── Named by the question, not by the predicate ──────────────────────────────
 *
 * Three of these seventeen resolve to the same predicate today — `STAFF_MANAGE`,
 * `ORGANIZER_ACCESS` and `DOOR_OPERATE` are all "role ∈ {master, organizer},
 * status ignored". They are deliberately three keys and not one, because they
 * are three different questions. A later phase that grants one night's door
 * must be able to grant `door.operate` without also granting sixteen tables,
 * and a key named after its predicate makes that impossible.
 *
 * **The four production section keys resolve to that same predicate, and they
 * are the rule's sharpest case rather than an exception to it.** They are four
 * keys precisely so that ONE of them can be taken away without the others —
 * which a single `production.read` could not be, because there is nothing to
 * remove from a key that answers four questions at once. That sentence is the
 * whole of D-45-04's justification, and it is written here, where the rule it
 * applies is stated, rather than only beside the keys it produced.
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
 *
 * ── The thirteenth, added by plan 37-01 ──────────────────────────────────────
 *
 * `VENUE_REVEAL` is the naming rule applied a fourth time, and the key whose
 * predicate is `CATALOGUE_MANAGE`'s exactly — role ∈ {master, organizer} AND
 * status = approved. It is separate for the reason `REGISTER_READ` is separate,
 * and the direction of the mistake is what makes it worth a key of its own:
 *
 *   - On `STAFF_MANAGE` it would inherit `requires_approved = false`, so an
 *     organizer whose own access was never approved could publish a night's
 *     address. That flag is `false` for the DOOR's reason — a pending organizer
 *     must not be refused in front of a queue — and nobody is standing in a
 *     queue while an address goes out. The reason does not travel.
 *   - On `CATALOGUE_MANAGE` the shape would be right and the question wrong:
 *     *may this subject create an artist or a venue* is not *may this subject
 *     make an address public*, and merging them means the day somebody wants a
 *     catalogue editor who may not publish, there is no key to take away.
 *   - On `PARTY_MANAGE` it would arrive from a per-night assignment and expire
 *     with the night (D-37-15). The reveal happens BEFORE the night and does not
 *     expire, because it cannot be undone.
 *
 * It gates an ACT, not an address: the button lives on `/admin/events/[id]/edit`,
 * which `ORGANIZER_ACCESS` already opens, so its entry in
 * `src/lib/routes/capability-routes.ts` is on the `scope: "table"` branch.
 *
 * ── The fourteenth was `production.read`, and phase 45 SPLIT it into four ────
 *
 * `PRODUCTION_READ` was minted by plan 44-04 and answered *may this subject read
 * the production calendar*. Phase 45 gives the production surface three more
 * sections — the sound manifesto, the visual system, the location list — and
 * PROD-02 asks for entitlement **per section**. One key cannot refuse ONE
 * section, so the key is replaced by four (D-45-04), and the reason is the rule
 * stated at the top of this file rather than a preference: a key that answers
 * four questions has nothing that can be taken away.
 *
 * `production.read` is therefore **gone from this file**, and its row and its two
 * grants are retired from the catalogue by
 * `supabase/migrations/20260817120500_production_read_retire.sql` — which is
 * applied by plan 45-09, AFTER the deploy that carries this commit. The order is
 * not a nicety: retiring the key before the deploy leaves the old bundle asking
 * for a key that no longer exists, which answers false with no error and no log
 * line, and the calendar is down for the length of a deploy.
 *
 * ── The fourteenth: `PRODUCTION_CALENDAR_MANAGE` ─────────────────────────────
 *
 * It answers *may this subject read and write the production calendar section* —
 * the six `production_*` tables whose rows are unannounced dates, spaces under
 * negotiation and the shape of an internal plan. `manage` and not `read` because
 * D-45-06 says whoever reads a section writes it, and `read` would under-claim
 * what the key opens.
 *
 * Four existing keys were weighed for it and each is wrong in a DIFFERENT
 * DIRECTION — plus a fifth, which is the reuse this phase exists to undo:
 *
 *   - On `production.read` itself, kept for all four sections. It cannot refuse
 *     ONE section, which is the whole of PROD-02, and keeping it would make the
 *     four sections a naming exercise.
 *   - On `ORGANIZER_ACCESS` (`organizer.access`) the question is *may they reach
 *     the organizer area* — a routing question about the account. Reusing it
 *     makes the calendar reachable by every organizer PERMANENTLY and leaves
 *     nothing to take away the day one collaborator should hold one section and
 *     no other. Un-widening later is the direction `meta-gates.md` permits only
 *     with an explicit, documented authorisation, so the reuse would not be a
 *     shortcut — it would be a decision nobody took, taken irreversibly.
 *   - On `CATALOGUE_MANAGE` (`catalogue.manage`) the shape would be right and the
 *     question wrong: *may they create an artist or a venue* is not *may they
 *     read what is planned*, and merging them ties calendar reach to a catalogue
 *     grant.
 *   - On `ADMIN_ACCESS` (`admin.access`) it would be master-only. D-45-03 wants
 *     the organizer as well, so this one is wrong in the OPPOSITE direction from
 *     the other three: too narrow rather than too wide.
 *   - On `STAFF_MANAGE` (`staff.manage`) it would inherit
 *     `requires_approved = false` for the DOOR's reason — a pending organizer
 *     must not be refused in front of a queue — and **nobody is standing in a
 *     queue in front of a calendar**. This key ALSO carries `false`, and the
 *     coincidence is the trap: it arrives from D-44-27 and from nothing else, so
 *     the day the door's reason is revisited this key must not move with it.
 *
 * `requires_approved = false`, and D-45-04 constraint 3 forbids this split from
 * changing it in either direction: master and organizer held the calendar before
 * and hold it after. That flag is a BET, written out in full — and byte-identical
 * to the migration's — in `CAP_DESCRIPTIONS` below: it holds only while no signup
 * path can create a pending organizer, and the day one is reopened this flag is
 * reconsidered in the same commit that reopens it.
 *
 * `staff` and `member` hold no grant, and the refusals are asserted rather than
 * assumed: `scripts/verify-capabilities.mjs` side 5 declares all four pairs. A
 * member of staff rostered to a night's door enters to let people in — not to
 * read unannounced dates and open negotiations, which do not expire with the
 * night the way an assignment does.
 *
 * ── The fifteenth: `PRODUCTION_MANIFESTO_MANAGE` ─────────────────────────────
 *
 * It answers *may this subject read and write the sound manifesto section* —
 * which formats have a written manifesto, which carry declared coordinates
 * without one, which are not decided at all, and the register of the questions
 * still open. The same four reuses were weighed, and the directions are the
 * section's own:
 *
 *   - On `production.read`, it would be granted by the same key as the location
 *     list, whose rows carry a street address. The manifesto is a document
 *     written to LEAVE THE PERIMETER — it goes to whoever stands in the console —
 *     and the scouting list is the one thing that must not travel with it.
 *   - On `ORGANIZER_ACCESS`, every organizer would hold it permanently and no
 *     grant could be removed for a selector who should read the manifesto and
 *     nothing else. That collaborator is the concrete case D-45-04 records.
 *   - On `CATALOGUE_MANAGE`, right shape, wrong question: *may they create an
 *     artist or a venue* is not *may they say what a format sounds like*. It
 *     would also inherit `requires_approved = true`, which is not this key's
 *     value and would arrive here by accident rather than by decision.
 *   - On `ADMIN_ACCESS` it is master-only — wrong in the OPPOSITE direction,
 *     since D-45-03 grants the organizer too.
 *   - On `STAFF_MANAGE` it inherits `false` for the door's reason. Nobody is
 *     standing in a queue in front of a manifesto, and this key's `false` arrives
 *     from D-45-20 and from nothing else.
 *
 * `requires_approved = false` (D-45-20, the owner), and the BET it rests on is in
 * its description below, in the migration's own words.
 *
 * ── The sixteenth: `PRODUCTION_VISUAL_MANAGE` ────────────────────────────────
 *
 * It answers *may this subject read and write the visual system section* — the
 * capitolato, beside the produced pieces and the photo archive a listing is
 * pulled from. The directions:
 *
 *   - On `production.read`, a section whose content becomes a PUBLICATION would
 *     share a key with a section whose content must never be published. Those are
 *     opposite obligations on the same grant.
 *   - On `ORGANIZER_ACCESS`, permanent for every organizer, with nothing to
 *     remove for an external designer who should hold the capitolato and no
 *     calendar. That is the same collaborator, arriving from the other side.
 *   - On `CATALOGUE_MANAGE`, wrong question and the wrong `requires_approved`,
 *     exactly as above.
 *   - On `ADMIN_ACCESS`, master-only: too narrow.
 *   - On `STAFF_MANAGE`, the door's `false` arriving for the door's reason, which
 *     does not travel here.
 *
 * `requires_approved = false` (D-45-20, the owner); the BET is in its description.
 *
 * ── The seventeenth: `PRODUCTION_LOCATION_MANAGE` ────────────────────────────
 *
 * It answers *may this subject read and write the location section* — scouted
 * spaces with their stage, the attributes a per-format score is computed from,
 * and the four answers that close a to-verify column. **Every row is a space
 * nobody has phoned, and one of its columns is a street address** (D-45-24),
 * which makes this the narrowest-audience section of the four IN INTENT even
 * though D-45-03 gives all four the same two roles. The directions:
 *
 *   - On `production.read`, this section could never be refused on its own — and
 *     it is the one whose refusal costs the most if it is ever loosened, because
 *     a space under negotiation named outside the people negotiating is a
 *     negotiation made public, and a publication does not un-publish.
 *   - On `ORGANIZER_ACCESS`, permanent and un-removable, on the section that most
 *     needs to be removable.
 *   - On `CATALOGUE_MANAGE` the confusion would be worse than shape-versus-
 *     question: `venues` holds acquired spaces and this section holds spaces that
 *     are not acquired, so one grant would erase the distinction
 *     `venue-acquisition.md` exists to keep.
 *   - On `ADMIN_ACCESS`, master-only: too narrow for D-45-03.
 *   - On `STAFF_MANAGE`, the door's `false` for the door's reason. Nobody is
 *     standing in a queue in front of a scouting list.
 *
 * `requires_approved = false` (D-45-20, the owner); the BET is in its description.
 *
 * ── Which branch each of the four sits on, and the trap on three of them ─────
 *
 * `PRODUCTION_CALENDAR_MANAGE` keeps the calendar's two addresses on the
 * `routes:` branch with `alsoGatesTables: true` — the entry plan 44-09 already
 * moved there, unchanged in substance.
 *
 * The other three land on the `scope: "table"` branch, because **their pages are
 * not on disk yet**: 45-11 creates the location surface, 45-12 the manifesto and
 * the visual one, and each of those plans moves its own entry. Until then the
 * declaration is honest rather than aspirational — and the trap is written into
 * each entry in `src/lib/routes/capability-routes.ts`: a page bound to a
 * table-only key is unreachable **for everyone**, with no build error and nothing
 * in a log, because `resolveRoute` returns `null` and the middleware fails closed.
 */

/**
 * The seventeen keys. Spelled exactly as the rows of `private.capabilities`
 * (`supabase/migrations/20260807000000_capability_model.sql` section 7,
 * `20260808002000_membership_register.sql` section 1 for the ninth,
 * `20260809001000_assignment_resolver.sql` section 1 for the tenth to twelfth,
 * `20260810160000_manual_venue_reveal.sql` section 1 for the thirteenth, and
 * `20260817120000_production_section_keys.sql` section 1 for the fourteenth to
 * seventeenth — which SUPERSEDES
 * `20260815120100_production_calendar_access.sql` section 1, whose single key is
 * retired by `20260817120500_production_read_retire.sql`).
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
  /**
   * The six master-only surfaces — analytics and its two sub-pages, newsletter,
   * finance, members/growth. Six named addresses, not a prefix: the binding
   * lives in `src/lib/routes/capability-routes.ts`. Status ignored.
   */
  ADMIN_ACCESS: "admin.access",
  /**
   * The least capability any collapsed staff surface needs, including the
   * `/admin` root itself. Role only, status ignored; the addresses it opens are
   * named in `src/lib/routes/capability-routes.ts`.
   */
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
  /** Reveal a night's secret venue by hand. Role AND approved. */
  VENUE_REVEAL: "venue.reveal",
  /**
   * Read and write the production CALENDAR section. Role alone, status IGNORED —
   * D-44-27, and not `staff.manage`'s door reason. Not `organizer.access`: that
   * is the area. One of four, so that one can be taken away without the others.
   */
  PRODUCTION_CALENDAR_MANAGE: "production.calendar.manage",
  /**
   * Read and write the sound MANIFESTO section. Role alone, status IGNORED —
   * D-45-20. Its page arrives in plan 45-12; until then its route entry is
   * table-only, which opens no address for anybody.
   */
  PRODUCTION_MANIFESTO_MANAGE: "production.manifesto.manage",
  /**
   * Read and write the VISUAL system section — the capitolato. Role alone,
   * status IGNORED — D-45-20. Its page arrives in plan 45-12.
   */
  PRODUCTION_VISUAL_MANAGE: "production.visual.manage",
  /**
   * Read and write the LOCATION section: spaces nobody has phoned, one of whose
   * columns is a street address. Role alone, status IGNORED — D-45-20. The
   * narrowest-audience section of the four in intent, though not in grants. Its
   * page arrives in plan 45-11.
   */
  PRODUCTION_LOCATION_MANAGE: "production.location.manage",
} as const;

export type CapabilityKey = (typeof CAP)[keyof typeof CAP];

/**
 * One sentence per key, for the humans who read a permission decision.
 *
 * Typed as a **total** `Record` over the union on purpose, exactly as
 * `DOOR_OUTCOME_KINDS` is in `@/lib/door/outcome`: adding an eighteenth key to
 * `CAP` without a description here is a `npm run build` error, and removing a
 * key leaves an unreachable entry that is also an error. It is the one part of
 * this file's contract the compiler can hold — and it held it when the ninth key
 * landed, again when the tenth, eleventh and twelfth did, again for the
 * thirteenth, again for the fourteenth, and again in BOTH directions at once
 * when phase 45 split that fourteenth into four: the removed `production.read`
 * left an unreachable entry here and the four new members left four holes, and
 * the compiler named all five. In a repository with no test runner that is worth
 * saying rather than assuming.
 *
 * **Do not weaken this type to land a split in two steps.** A `Partial` here, or
 * an index signature, would turn the one mechanical guarantee this file has into
 * a convention — and a convention is exactly what the other two thirds of the
 * contract already are.
 *
 * **The compiler holds a SECOND part, and it is worth naming here because plan
 * 44-04 met it.** `CAPABILITY_ROUTES` in `src/lib/routes/capability-routes.ts`
 * is `as const satisfies Record<CapabilityKey, Binding>`, so a key added here
 * with no entry there is also a build error. The two records are the compiler's
 * whole half of this file's contract, and a new key pays both in one commit.
 *
 * It cannot hold the other part — that these strings match the seventeen rows in
 * `private.capabilities`. That is `scripts/verify-capabilities.mjs`'s job, and
 * that check needs a live database: it is RED between the commit that adds a key
 * here and the deploy that applies the migration adding the row. For this split
 * that is TWO red intervals rather than one, and both are declared in that
 * script beside the constants they move.
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
  "venue.reveal":
    "Reveal a night's secret venue by hand, before the automatic window, and send the address to everyone entitled to it. Requires an APPROVED staff role on both grants (D-37-14) because the act is irreversible — staff.manage ignores status ON PURPOSE, so a pending organizer is not refused in front of a queue, and that reason does not exist here.",
  // ── The four below are BYTE-IDENTICAL to the description column of the four
  // rows in `20260817120000_production_section_keys.sql` section 1, and that is
  // a rule rather than a courtesy: a capability key has no SQL mirror the
  // compiler can hold, so `npm run build` proves neither the row nor the string.
  // The only thing that compares them is `scripts/verify-capabilities.mjs`, and
  // it needs a live database. Edit one of these and the migration is edited in
  // the same commit — or the sentence a permission decision is explained with
  // starts depending on which of the two a reader happened to open.
  "production.calendar.manage":
    "Read and write the production calendar section: the six production tables, whose rows are unannounced dates, spaces under negotiation and the shape of an internal plan. It is the calendar own section key, minted by the split of production.read into four section keys (D-45-04), and the grants are unchanged — master and organizer held the calendar before the split and hold it after. requires_approved is FALSE on both grants (D-44-27, the owner), which D-45-04 constraint 3 forbids changing here: organizer accounts are created inside the app by an admin or an organizer and nobody signs up any more, so pending is about to stop varying and gating on a value that no longer varies is debt rather than safety. That is a BET on the signup path staying closed: reopen a path that can create a pending organizer and this flag is reconsidered in the same commit. It is NOT staff.manage ignoring status for the door reason — nobody is standing in a queue in front of a calendar.",
  "production.manifesto.manage":
    "Read and write the sound manifesto section: which formats have a written manifesto, which carry declared coordinates without one, and which are not decided at all, together with the register of the questions still open. One key covers both directions (D-45-06), which is why the verb is manage and not read. Granted to master and organizer (D-45-03). requires_approved is FALSE (D-45-20, the owner) because organizer accounts are created inside the app by an admin or an organizer and nobody signs up any more, so pending is about to stop varying and gating on a value that no longer varies is debt rather than safety. That is a BET on the signup path staying closed: reopen a path that can create a pending organizer and this flag is reconsidered in the same commit. It is NOT staff.manage ignoring status for the door reason — nobody is standing in a queue in front of a manifesto.",
  "production.visual.manage":
    "Read and write the visual system section: the capitolato — palette, typography, the grid-safe zone, the publication order, what is fixed and what is variable — beside the produced pieces and the photo archive a listing is pulled from. One key covers both directions (D-45-06), which is why the verb is manage and not read. Granted to master and organizer (D-45-03). requires_approved is FALSE (D-45-20, the owner) because organizer accounts are created inside the app by an admin or an organizer and nobody signs up any more, so pending is about to stop varying and gating on a value that no longer varies is debt rather than safety. That is a BET on the signup path staying closed: reopen a path that can create a pending organizer and this flag is reconsidered in the same commit. It is NOT staff.manage ignoring status for the door reason — nobody is standing in a queue in front of a capitolato.",
  "production.location.manage":
    "Read and write the location section: scouted spaces with their stage, the attributes a per-format score is computed from, and the four answers that close a to-verify column. Every row is a space nobody has phoned, and one of its columns is a street address (D-45-24) — which makes this the narrowest-audience section of the four in intent, even though D-45-03 gives all four the same two roles. One key covers both directions (D-45-06), which is why the verb is manage and not read. requires_approved is FALSE (D-45-20, the owner) because organizer accounts are created inside the app by an admin or an organizer and nobody signs up any more, so pending is about to stop varying and gating on a value that no longer varies is debt rather than safety. That is a BET on the signup path staying closed: reopen a path that can create a pending organizer and this flag is reconsidered in the same commit. It is NOT staff.manage ignoring status for the door reason — nobody is standing in a queue in front of a scouting list.",
};
