/**
 * The register's vocabulary, named once.
 *
 * This module is the source. It imports nothing — not even `@/types/database`,
 * which imports *from here* — for the same reason `@/lib/door/outcome` and
 * `@/lib/capabilities/keys` import nothing: a file that is the source of a
 * literal cannot depend on a file that consumes it without making the direction
 * of truth ambiguous.
 *
 * ── The two sides are edited in ONE commit ───────────────────────────────────
 *
 * Both unions below are mirrored by SQL `CHECK` constraints on
 * `public.membership_acts`
 * (`supabase/migrations/20260808002000_membership_register.sql`, section 2).
 * They were written once here and copied there. **Editing either side means
 * editing both, in the same commit.**
 *
 * Why that rule is stated rather than assumed: a divergence between the table
 * and the code does not fail loudly. Adding `'suspended'` here and not there
 * produces a value TypeScript accepts everywhere and the database refuses with a
 * `23514` — at the moment somebody performs the act, not at build time. Adding
 * it there and not here produces the opposite: a row the register holds and no
 * reader in this repository can name, which survives until somebody opens the
 * history looking for an act that, as far as the code is concerned, never
 * landed.
 *
 * The mirror is real but ASYMMETRIC, exactly as `outcome.ts:16-21` describes its
 * own: `npm run build` catches the TypeScript half, the `CHECK` catches the SQL
 * half, and nothing at all compares the two. No Supabase client in this
 * repository is parameterised with `Database`
 * (`src/lib/supabase/client.ts:4`, `server.ts:7`, `middleware.ts:15`,
 * `service.ts:4`), so the `.rpc("record_membership_act", …)` call that writes
 * these values is untyped end to end.
 */

/**
 * What was done to an account's role or status.
 *
 * Seven values, mirrored by the `act` CHECK on `public.membership_acts`.
 *
 * `rejected` and `deactivated` are two values and not one although they are the
 * SAME write today — `{status: 'rejected', role: 'member'}` — because they are
 * performed for two different reasons: one refuses an application, the other
 * withdraws an access that had been granted. A register that cannot tell them
 * apart cannot be read a season later, which is the only thing it is for.
 *
 * Phase 35's per-night assignment adds its own values (`'assigned'`,
 * `'unassigned'`) to this union and to the CHECK, in one commit, when it lands.
 * A door override does NOT: it stays in `door_scan_events` (D-18), and the
 * migration says why.
 */
export type MembershipAct =
  | "created"
  | "approved"
  | "rejected"
  | "promoted"
  | "demoted"
  | "deactivated"
  | "reactivated";

/**
 * Who performed the act — D-22.
 *
 * `'system'` exists because D-16's reconciliation-driven demotion has no human
 * author, and the alternative to naming that fact is a nullable actor, which is
 * the unattributed act D-11 forbids. The table refuses both dishonest
 * combinations: a `'user'` act with no actor, and a `'system'` act that carries
 * one.
 */
export type MembershipActorKind = "user" | "system";
