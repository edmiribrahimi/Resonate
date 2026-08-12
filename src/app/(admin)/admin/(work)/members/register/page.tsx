import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getAccessContext } from "@/lib/capabilities/server";
import { CAP } from "@/lib/capabilities/keys";
import { PageShell } from "@/components/ui/PageShell";
import { PageTitle } from "@/components/ui/Typography";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Chip";
import type { MembershipActRow } from "@/types/database";

/**
 * The membership register, read.
 *
 * ── What this is, and — as carefully — what it is not ────────────────────────
 *
 * It is a register of **acts**: who changed somebody's role or status, when,
 * and from what to what. Plan 43-07 said so deliberately when it built the
 * table, and it is repeated here because a surface is where a name sticks.
 *
 * It is **not** the association's membership book. That book, if the entry to
 * private venues ever runs through the circolo model, has its own purposes, its
 * own retention and its own legal weight, and deciding by a page title that
 * this is it would settle by wording something the owner has explicitly left
 * open (`.claude/rules/legal-compliance.md`;
 * `.planning/ACCESS-MODEL-DECISIONS.md` §9, recorded 2026-08-06 and to be
 * re-opened rather than inherited). So nothing here is titled "soci",
 * "membership book" or "libro soci", and nothing here should be.
 *
 * ── Why it exists at all ────────────────────────────────────────────────────
 *
 * `community-membership.md`, gate *chi decide è tracciato*: approvals and
 * rejections are privileged operations, recorded with who did them and when —
 * and **the simplest path to let somebody in is the one that must be made
 * visible**. D-11 records the acts; this page is the reading, without which the
 * recording is a table nobody opens.
 *
 * The template is `admin/(work)/events/[id]/review/page.tsx`, the repository's
 * only other capability-gated read of an append-only register, followed line
 * for line rather than re-derived. (It stood in the organizer tree until plan
 * 34-06 moved it; the path is corrected here rather than carried, because a
 * citation that no longer resolves is the thing this phase exists to remove.)
 *
 * ── Converted by plan 41-08, and the conversion touched presentation ONLY ────
 *
 * The shell, the title's face, the card, the act mark and the colours are new.
 * **The read is not.** Same columns, same table, same ordering, same cap, same
 * non-fatal name lookup, same two functions deciding who an act was aimed at
 * and who performed it. No column was added because a card had room, no field
 * was surfaced, and no email address arrived — the register does not store one
 * and this page still does not fetch one.
 *
 * `community-membership.md`, gate *chi decide è tracciato*, is the one a visual
 * change could quietly break: **who** performed an act and **when** must both
 * survive on the rendered row. Both do, and the system author still renders as
 * the reconciliation that produced it rather than as a blank cell — D-22's
 * whole reason for a kind beside the actor.
 *
 * Two colour decisions are recorded because neither is obvious:
 *
 *  - **The row that admits somebody no longer tints with `--accent`.** §5.1
 *    reserves the accent for four things and names *a state signal* among the
 *    ones it is never for. The emphasis moved from the row to the mark, which
 *    is where §8.5 puts it, and the set that decides it is still the one below
 *    — used for emphasis, never to filter.
 *  - **The automatic author is not amber.** The only amber in this system is
 *    the warning semantic, which `globals.css:161-163` records as being
 *    SunSet's identification colour as well — so an amber mark cannot say
 *    *caution* rather than *this is a SunSet night* by hue, and a
 *    reconciliation is neither. It takes a recessed ink instead, and the
 *    distinction it carries is the one it always carried: the words.
 */

/**
 * Per-person operational data, and it must never be served from a cache.
 *
 * `nextjs-architecture.md`, gate *cache esplicita*. The reason this line is not
 * redundant is worth repeating rather than assuming: the dynamic opt-out would
 * happen anyway, implicitly, because `getAccessContext()` reads `cookies()` —
 * but that is one import away and therefore one refactor easy to lose. A
 * register served stale would show a role that has since changed and would be
 * read as the current answer.
 */
export const dynamic = "force-dynamic";

/**
 * The columns of `public.membership_acts`, named once.
 *
 * There is no join here: `subject_id` and `actor_id` are resolved to display
 * names by a separate, non-fatal read below, so that a failure to label a row
 * cannot cost the row.
 */
const MEMBERSHIP_ACT_COLUMNS =
  "id, act, subject_id, subject_label, actor_id, actor_kind, role_before, role_after, status_before, status_after, at, party_id, note";

/**
 * How many acts one page shows.
 *
 * Stated rather than left implicit: the table's two indexes are
 * `(subject_id, at DESC)` and `(actor_id, at DESC)`, so an unqualified
 * most-recent-first read has no index to walk and is a scan plus a sort. At the
 * size of this community that is nothing; at ten times the size it would want
 * either an index on `at` or a filter. The cap is here so that the day it
 * matters, the page slows rather than stops.
 */
const PAGE_SIZE = 200;

/** The seven acts, in words a person reads rather than in the stored value. */
const ACT_LABELS: Record<string, string> = {
  created: "Account created",
  approved: "Approved",
  rejected: "Rejected",
  promoted: "Promoted",
  demoted: "Demoted",
  deactivated: "Deactivated",
  reactivated: "Reactivated",
};

/**
 * Which acts read as an opening of the gate.
 *
 * Used for emphasis only — never to filter. `community-membership.md`, gate
 * *nessuna corsia grigia*: every way into this community that skips the
 * ordinary approval path is an exception to be counted and attributed, so the
 * two acts that admit somebody are the ones the eye should land on first.
 */
const ADMITTING_ACTS = new Set(["created", "approved", "reactivated"]);

function formatWhen(iso: string): string {
  const d = new Date(iso);
  const M = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getDate()} ${M[d.getMonth()]} ${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** `a -> b`, or a single value, or nothing at all when the axis did not move. */
function Transition({
  label,
  before,
  after,
}: {
  label: string;
  before: string | null;
  after: string | null;
}) {
  // NULL on both means *this act did not touch that axis* — never *the value
  // was null*. Drawing an empty arrow would turn a deliberate silence into a
  // claim that something moved to nowhere.
  if (!before && !after) return null;

  return (
    <span className="inline-flex items-center gap-1 text-xs">
      <span className="text-muted">{label}</span>
      {before ? <span className="text-muted line-through">{before}</span> : null}
      {before && after ? <span className="text-muted">&rarr;</span> : null}
      {after ? <span className="font-semibold text-ink">{after}</span> : null}
    </span>
  );
}

export default async function MembershipRegisterPage() {
  // Resolved once by `(work)/layout.tsx`, which also mounts both navs and now
  // holds the `UserRole` / `UserStatus` casts that used to sit here.
  // `getAccessContext` is `cache()`-scoped per request, so asking again for
  // this page's own guard costs no second round trip.
  const ctx = await getAccessContext();

  // ── Two layers, and the surface needs both ──────────────────────────────────
  //
  // This is the **interface** layer, and it decides where somebody may GO. What
  // decides what they may **READ** is `membership_acts_select_register_read`,
  // the policy plan 43-07 wrote. The redirect on its own would leave the whole
  // register — rejections included — readable through PostgREST by anyone
  // holding the anonymous key, which is `CLAUDE.md` operating principle 2 in
  // its plainest form: the middleware is UX, the RLS is security.
  //
  // ── The paragraph that stood here described a defect, and the defect is gone
  //
  // It recorded that `register.read` was granted to master AND organizer
  // (43-07) while everything under `/admin` was judged by `admin.access` — the
  // master alone — so an organizer holding the capability was bounced before
  // this file ran. Corrected rather than carried, because a stale comment
  // survives a rewrite and is then re-read as current.
  //
  // What closed it: **D-34-02 dissolved the prefix rule**, and
  // `capability-routes.ts` binds this route to `register.read` — one entry,
  // read by the middleware and by the guard below, which is why they cannot
  // disagree (D-34-09). **No permission was edited.** The grant
  // `('organizer','register.read',true)` is where it always was, in
  // `20260808002000_membership_register.sql:130`, and its
  // `requires_approved = true` is D-19's non-negotiable requirement: a pending
  // organizer is refused here, by the capability set, exactly as intended.
  if (!ctx.capabilities.has(CAP.REGISTER_READ)) {
    redirect("/dashboard");
  }

  // The normal server client, and **not** the RLS-bypassing one from
  // `@/lib/supabase/service`. Reading the register through it would move the
  // boundary into this page and leave the policy decorative — true only for as
  // long as nobody reaches the table another way. Its absence here is asserted
  // by a grep, which is why the name is not written out even in this comment.
  const supabase = await createClient();

  let rows: MembershipActRow[] = [];
  let readError: string | null = null;

  const { data, error } = await supabase
    .from("membership_acts")
    .select(MEMBERSHIP_ACT_COLUMNS)
    .order("at", { ascending: false })
    .limit(PAGE_SIZE);

  if (error) {
    // Zero silent failures, and this is the surface where a silent one is
    // worst: an EMPTY register and an UNREADABLE register mean opposite things
    // — one says nobody's role has changed, the other says you cannot see
    // whether it has. Rendering the same empty list for both would be the
    // failure that reads as reassurance. This project has no error tracking, so
    // the log line below reaches nobody on its own and the message is carried
    // to the screen as well.
    //
    // `error.code` and `error.message` only. Never `error.details`: measured in
    // plan 43-01, on a constraint violation against `public.profiles` it prints
    // the whole failing row, membership code included.
    console.error("members.register:read", {
      code: error.code,
      message: error.message,
    });
    readError =
      "The register could not be read. This is a failure, not a quiet season — the list below is empty because nothing was loaded, not because nothing happened.";
  } else {
    rows = (data ?? []) as unknown as MembershipActRow[];
  }

  // Display names for the subjects and the actors.
  //
  // Non-fatal on purpose, exactly as `review/page.tsx` treats its operator
  // labels: the register is readable with membership codes alone, and losing a
  // season of history because a name lookup failed would be the worse failure.
  //
  // A `null` id is not a lookup that failed — it is an account that has been
  // deleted, and the row survives it deliberately (`ON DELETE SET NULL`, with
  // `subject_label` denormalised so that a row outlives its subject).
  const peopleIds = [
    ...new Set(
      rows
        .flatMap((r) => [r.subject_id, r.actor_id])
        .filter((id): id is string => Boolean(id))
    ),
  ];

  const names: Record<string, string> = {};
  if (peopleIds.length > 0) {
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", peopleIds);

    if (profilesError) {
      console.error("members.register:name_lookup", {
        code: profilesError.code,
        message: profilesError.message,
      });
    }
    for (const p of profiles ?? []) {
      names[p.id] = p.full_name ?? "";
    }
  }

  /**
   * Who an act was aimed at.
   *
   * The **membership code** is always shown, and the name only when it can
   * still be resolved. That ordering is the register's own rule and not this
   * page's taste: the code is the durable label, chosen by the migration
   * precisely because it identifies a row without publishing a person, on the
   * precedent that a LABEL may reach an artefact and an IDENTIFIER may not.
   *
   * **No email address is rendered anywhere on this page.** The register does
   * not store one, and this page does not fetch one — an audit surface is the
   * kind of thing that ends up in a screenshot.
   */
  function subjectOf(row: MembershipActRow) {
    const name = row.subject_id ? names[row.subject_id] : "";
    return {
      code: row.subject_label,
      name: name || null,
      deleted: row.subject_id === null,
    };
  }

  /**
   * Who performed it — and D-22 is the whole reason this is a function.
   *
   * `actor_kind = 'system'` renders as **the reconciliation that produced it**,
   * never as a blank author. A blank cell would be indistinguishable from an
   * unattributed act, which is the one thing D-11 forbids and the exact reason
   * the table carries a kind beside the actor instead of merely making the
   * actor nullable.
   */
  function actorOf(row: MembershipActRow) {
    if (row.actor_kind === "system") {
      return {
        label: "Automatic reconciliation",
        note: "No person performed this act — it was written by the system reconciling the configured master account.",
        isSystem: true,
      };
    }
    const name = row.actor_id ? names[row.actor_id] : "";
    return {
      label: name || "An account that no longer exists",
      note: null,
      isSystem: false,
    };
  }

  return (
    <PageShell width="default">
      <header className="pb-6">
        <Link
          href="/admin/members"
          className="inline-flex min-h-11 items-center text-sm text-muted transition-colors hover:text-ink"
        >
          &larr; Back to members
        </Link>
        {/*
          The title says ACTS, on purpose. See the note at the top of this file:
          calling it a membership book would decide by wording a question the
          owner has left open.
        */}
        <PageTitle className="mt-2">Membership acts</PageTitle>
        <p className="mt-1 text-sm text-muted">
          Every change to an account&apos;s role or status, most recent first,
          with who made it and when. Accounts are named by membership code —
          the name beside it is shown only while the account still exists.
        </p>
      </header>

      <div className="flex flex-col gap-4">
        {/*
          NOT a Card, and that is a decision rather than an omission. §8.4 fixes
          the card's edge as a line token on purpose — a card's content already
          says where the card is, so its edge is a hint. A failed read is not a
          hint, and its boundary carries the critical semantic. Writing the
          geometry out here keeps §8.4's contract intact instead of overriding
          the one property it decided.
        */}
        {readError ? (
          <div
            role="alert"
            className="rounded-2xl border border-sem-crit/40 bg-sem-crit/10 p-6"
          >
            <p className="text-sm font-semibold text-sem-crit">
              The register could not be read
            </p>
            <p className="mt-1 text-xs text-muted">{readError}</p>
          </div>
        ) : null}

        {/*
          ── There is no own-row read here, and no route for one ───────────────

          A member cannot open this register filtered to themselves, and the
          absence is a DECISION rather than a feature not yet built — written
          down so that it is legible as one.

          The register holds rejections. `community-membership.md`, gate *un
          rifiuto è una comunicazione, non uno stato*: the wording of a
          rejection is chosen once, with care, and used unchanged — it is
          something said to a person, not a row they read about themselves. A
          self-service view would deliver that judgement as a database value,
          stripped of the sentence somebody wrote to carry it.

          The policy agrees, and it is the policy and not this page that
          enforces it: `membership_acts_select_register_read` asks only for
          `register.read`, so there is no own-row clause to widen and no
          endpoint to reach. Adding one would be a disclosure decision, taken
          deliberately, not a convenience.
        */}

        {/*
          §8.11's empty state is a CLASS CONTRACT, not a component (D-41-11),
          and §11's copy rule is one sentence naming what is absent in this
          surface's own noun and one saying why the emptiness is normal. Both
          sentences below already did that before the conversion; only their
          roles changed. The second one is load-bearing and is not decoration:
          an empty register and an unreadable one mean opposite things, and the
          region above is what says which this is.
        */}
        {!readError && rows.length === 0 ? (
          <Card className="px-6 py-12 text-center">
            <h2 className="text-base font-semibold text-ink">
              No acts recorded yet
            </h2>
            <p className="mt-2 text-sm text-muted">
              Nobody&apos;s role or status has changed. A read that failed says
              so in its own region above, so an empty list here means the
              register is empty and not that it could not be loaded.
            </p>
          </Card>
        ) : null}

        {rows.map((row) => {
          const subject = subjectOf(row);
          const actor = actorOf(row);
          const admitting = ADMITTING_ACTS.has(row.act);

          return (
            <Card key={row.id}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                {/*
                  The act is a MARK, not a control: it is a Badge and never a
                  Chip, because nothing here can be operated. The emphasised
                  tone is the one the set above already decided — the acts that
                  admit somebody are the ones the eye should land on — and it
                  grades nothing about the person or the decision.
                */}
                <Badge tone={admitting ? "emphasis" : "neutral"}>
                  {ACT_LABELS[row.act] ?? row.act}
                </Badge>
                <p className="text-xs text-muted">{formatWhen(row.at)}</p>
              </div>

              <p className="mt-2 text-sm">
                <span className="text-muted">Account </span>
                <span className="font-mono text-xs">{subject.code}</span>
                {subject.name ? (
                  <span className="text-muted"> · {subject.name}</span>
                ) : null}
                {subject.deleted ? (
                  <span className="text-muted">
                    {" "}
                    · account since deleted, the act stands
                  </span>
                ) : null}
              </p>

              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                <Transition
                  label="role"
                  before={row.role_before}
                  after={row.role_after}
                />
                <Transition
                  label="status"
                  before={row.status_before}
                  after={row.status_after}
                />
              </div>

              <p className="mt-2 text-xs">
                <span className="text-muted">By </span>
                <span
                  className={
                    actor.isSystem
                      ? "font-semibold text-ink-2"
                      : "font-semibold text-ink"
                  }
                >
                  {actor.label}
                </span>
              </p>
              {actor.note ? (
                <p className="mt-1 text-xs text-muted">{actor.note}</p>
              ) : null}

              {row.note ? (
                <p className="mt-2 text-xs text-muted">{row.note}</p>
              ) : null}
            </Card>
          );
        })}

        {rows.length === PAGE_SIZE ? (
          <p className="text-xs text-muted">
            Showing the {PAGE_SIZE} most recent acts. Older acts exist and are
            not shown here.
          </p>
        ) : null}
      </div>
    </PageShell>
  );
}
