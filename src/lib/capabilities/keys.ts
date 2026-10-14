/**
 * The eleven capability keys, named once (recounted on 2026-10-14; the
 * count below this paragraph is the one each era wrote, and is history).
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
 * and the catalogue are the same fifteen strings. Until it runs, the guarantee
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
 * ⚠ 2026-09-22 — FASE 51 (D-51-07), E QUESTA VOLTA IL ROSSO E' SOLO CONTRO LA
 * PRODUZIONE. `membership.active` e `membership.card.view` escono da qui e dal
 * catalogo **nello stesso commit**, con
 * `20260922120000_role_attendee_and_capability_keys.sql`. Il laboratorio ha la
 * migration applicata (piano 51-08), quindi li' i due insiemi concordano gia' e
 * `verify:capabilities` e' verde; **contro la produzione resta rosso fino al
 * piano 51-13**, che e' l'atto che applica la migration li'. Un gate rosso senza
 * il nome di chi lo chiude e' un gate che nessuno rilancia: il nome e' 51-13.
 *
 * `membership.active` era gia' senza concessioni dal 2026-09-21 — la fase 50
 * (D-50-28) ne cancello' le quattro e **lascio' la chiave** proprio per non
 * rendere rosso questo confronto prima del piano che tocca il codice. Questo e'
 * quel piano, e il debito si chiude qui.
 *
 * **Editing this file means editing the migration in the same commit** — the
 * same rule `outcome.ts` states for its `CHECK` constraints, for the same
 * reason, with one less safety net.
 *
 * ── Named by the question, not by the predicate ──────────────────────────────
 *
 * Three of these fifteen resolve to the same predicate today — `STAFF_MANAGE`,
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
 *   - `MEDIA_UPLOAD` on the old `membership.active` would have confused the
 *     per-night work upload with the member-level contribution every approved
 *     account then had — the distinction
 *     `20260808000500_staff_role.sql:125-136` was written to keep. That key is
 *     gone (fase 51, D-51-07) and the reason for the separate name is not: it
 *     is what made `MEDIA_UPLOAD` survive the removal of the other.
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
 * ── The fourteenth, sixteenth and seventeenth left on 2026-10-14 ─────────────
 *
 * Three of the four section keys answered *may this subject read and write* the
 * production calendar, the visual system and the location list. They left the
 * code with their sections (phase 53, CUT-01, D-53-02, D-53-04): the pages, the
 * actions and the cron that read them are gone, and a key no live path asks
 * for is a dormant grant somebody reconnects tomorrow without rereading why it
 * existed — the reason the gallery's two keys left on 2026-10-02.
 *
 * Their reasoning stood here, one key per section, and it is not restated: the
 * rule it applied — four keys so that ONE can be taken away without the others
 * — is stated at the top of this file and is what made this removal a matter
 * of deleting three entries rather than redesigning one. The catalogue keeps
 * the three rows until the migration of plan 53-07, applied AFTER the deploy
 * that carries this commit, for the order `production.read`'s retirement
 * followed below: the code that stops asking leaves first.
 *
 * The ordinals are not renumbered. The manifesto's key stays the fifteenth.
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
 * ── Which branch the remaining one sits on ───────────────────────────────────
 *
 * `PRODUCTION_MANIFESTO_MANAGE` is on the `routes:` branch with
 * `alsoGatesTables: true`: its page is on disk, and the entry in
 * `src/lib/routes/capability-routes.ts` names it.
 */

/**
 * The eleven keys. Spelled exactly as the rows of `private.capabilities`
 * (`supabase/migrations/20260807000000_capability_model.sql` section 7,
 * `20260808002000_membership_register.sql` section 1 for the ninth,
 * `20260809001000_assignment_resolver.sql` section 1 for the tenth to twelfth,
 * `20260810160000_manual_venue_reveal.sql` section 1 for the thirteenth, and
 * `20260817120000_production_section_keys.sql` section 1 for the fourteenth to
 * seventeenth — which SUPERSEDES
 * `20260815120100_production_calendar_access.sql` section 1, whose single key is
 * retired by `20260817120500_production_read_retire.sql`).
 *
 * **Diciassette fino al 2026-09-22, quindici da allora** (fase 51, D-51-07):
 * `membership.active` e `membership.card.view` sono uscite con
 * `20260922120000_role_attendee_and_capability_keys.sql`. Gli ordinali qui sopra
 * sono l'ordine in cui le chiavi furono **aggiunte**, non la loro posizione in
 * questo oggetto, e **non si rinumerano**: due uscite non cambiano chi aggiunse
 * la nona. Rinumerarli renderebbe irrintracciabile ogni riferimento gia'
 * scritto altrove.
 *
 * **Sedici dal 2026-09-23** (fase 52, D-52-12): `gallery.view` entra con
 * `20260923180000_gallery_view_and_media_paths.sql` — un'AGGIUNTA, con le sue
 * tre concessioni nello stesso file.
 *
 * **Quattordici dal 2026-10-02** (fase 52.1, piano 18, DBT-13 — una
 * RIMOZIONE): `gallery.view` e `media.upload` escono con la gallery
 * (D-52.1-17), qui e in `20261001120200_gallery_removal.sql` (M-D) nello stesso
 * piano. `media.upload` non resta come asse non usato perche' **nessun percorso
 * vivo la legge**: l'archivio del visual chiedeva la chiave della sua sezione
 * (con una guardia propria, uscita con l'archivio il 2026-10-14), la cover
 * `staff.manage` piu' `assertMayManageEvent` (`/api/media/finalize-cover`,
 * piano 52.1-13). Una chiave senza lettori e' una concessione dormiente che
 * domani qualcuno ricollega a un percorso senza rileggere perche' esisteva. I
 * paragrafi sopra che la nominano sono storia, e restano: gli ordinali non si
 * rinumerano.
 *
 * **Undici dal 2026-10-14** (fase 53, CUT-01, D-53-02, D-53-04 — una
 * RIMOZIONE): tre delle quattro chiavi di sezione escono con il calendario, il
 * visual e Location; resta quella del manifesto. Il catalogo le tiene fino alla
 * migration del piano 53-07, applicata dopo il deploy: fino a li'
 * `verify:capabilities` e' ROSSO contro ogni database, per costruzione, e lo
 * chiude quel piano — non una costante corretta a mano nello script.
 */
export const CAP = {
  /** P1 — the 34 policies gating on `is_admin_or_organizer()`. Status ignored. */
  STAFF_MANAGE: "staff.manage",
  /** P2 and P4 — `is_master()` and the two inline master `EXISTS` bodies. */
  MASTER_MANAGE: "master.manage",
  /** P3 — the four `artists`/`venues` organizer policies. Status REQUIRED. */
  CATALOGUE_MANAGE: "catalogue.manage",
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
  /** Read the register of acts on a member's role and status. Role AND approved. */
  REGISTER_READ: "register.read",
  /** Reverse a check-in already recorded at the door. ASSIGN-05, and NOT `DOOR_OPERATE`. */
  DOOR_SUPERVISE: "door.supervise",
  /** Manage one night's operational surfaces. Not `ORGANIZER_ACCESS`, which is the area. */
  PARTY_MANAGE: "party.manage",
  /** Reveal a night's secret venue by hand. Role AND approved. */
  VENUE_REVEAL: "venue.reveal",
  /**
   * Read and write the sound MANIFESTO section. Role alone, status IGNORED —
   * D-45-20. Its page arrives in plan 45-12; until then its route entry is
   * table-only, which opens no address for anybody.
   */
  PRODUCTION_MANIFESTO_MANAGE: "production.manifesto.manage",
} as const;

export type CapabilityKey = (typeof CAP)[keyof typeof CAP];

/**
 * One sentence per key, for the humans who read a permission decision.
 *
 * Typed as a **total** `Record` over the union on purpose, exactly as
 * `DOOR_OUTCOME_KINDS` is in `@/lib/door/outcome`: adding a sixteenth key to
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
 * It cannot hold the other part — that these strings match the fourteen rows in
 * `private.capabilities` (fifteen until phase 52 added `gallery.view`, D-52-12;
 * sixteen until M-D, `20261001120200_gallery_removal.sql`, takes `gallery.view`
 * and `media.upload` out — DBT-13). That is `scripts/verify-capabilities.mjs`'s job, and
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
  "admin.access": "Reach the admin area other than the scanner.",
  "organizer.access": "Reach the organizer area.",
  "door.operate":
    "Work the door: scan, admit, undo. Role alone, deliberately — a pending organizer must not be refused in front of a queue.",
  "register.read":
    "Read the register of acts on a member's role and status — who was created, approved, rejected, promoted, demoted, deactivated or reactivated, by whom and when. Role AND an approved status, because the register contains rejections.",
  "door.supervise":
    "Reverse a check-in already recorded at the door. A different question from door.operate: an operator admits, a supervisor undoes. Role alone on both grants, deliberately — the undo is what corrects a wrong refusal, and it happens in front of a queue.",
  "party.manage":
    "Manage one night's operational surfaces: that night's review, its door register, its guest list. Scoped to a single date, which is why it is not organizer.access.",
  "venue.reveal":
    "Reveal a night's secret venue by hand, before the automatic window, and send the address to everyone entitled to it. Requires an APPROVED staff role on both grants (D-37-14) because the act is irreversible — staff.manage ignores status ON PURPOSE, so a pending organizer is not refused in front of a queue, and that reason does not exist here.",
  // ── The one below is BYTE-IDENTICAL to the description column of its row in
  // `20260817120000_production_section_keys.sql` section 1 (four rows until
  // 2026-10-14, when three left with their sections — D-53-02), and that is
  // a rule rather than a courtesy: a capability key has no SQL mirror the
  // compiler can hold, so `npm run build` proves neither the row nor the string.
  // The only thing that compares them is `scripts/verify-capabilities.mjs`, and
  // it needs a live database. Edit one of these and the migration is edited in
  // the same commit — or the sentence a permission decision is explained with
  // starts depending on which of the two a reader happened to open.
  "production.manifesto.manage":
    "Read and write the sound manifesto section: which formats have a written manifesto, which carry declared coordinates without one, and which are not decided at all, together with the register of the questions still open. One key covers both directions (D-45-06), which is why the verb is manage and not read. Granted to master and organizer (D-45-03). requires_approved is FALSE (D-45-20, the owner) because organizer accounts are created inside the app by an admin or an organizer and nobody signs up any more, so pending is about to stop varying and gating on a value that no longer varies is debt rather than safety. That is a BET on the signup path staying closed: reopen a path that can create a pending organizer and this flag is reconsidered in the same commit. It is NOT staff.manage ignoring status for the door reason — nobody is standing in a queue in front of a manifesto.",
};
