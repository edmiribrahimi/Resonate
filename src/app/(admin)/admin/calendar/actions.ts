"use server";

import { revalidatePath } from "next/cache";

import { CAP } from "@/lib/capabilities/keys";
import { getAccessContext } from "@/lib/capabilities/server";
import { getServiceClient } from "@/lib/supabase/service";
import { slugify } from "@/utils/slugify";
import type { ProductionPlan } from "@/types/database";

/**
 * The production calendar's TWO writes — the checklist tick, and the
 * announcement. There is no third, and the absence is the design.
 *
 * ── Why the gate is re-asked here, and it is not belt-and-braces ─────────────
 *
 * A server action is a **public endpoint with a convenient signature**. Both
 * exports below are invocable directly, with a forged body, by anybody who can
 * reach the deployment; being imported from a page that a capability opened
 * protects none of it (`nextjs-architecture.md`, gate *server action
 * autorizzata*). The gate is called FIRST in each export and the service client
 * is constructed AFTER it — an ordering slip turns an act into an
 * unauthenticated write path, and no build would see it.
 *
 * ── Why the SERVICE client, with the proof that no untrusted input reaches it ─
 *
 * The six production tables carry a `SELECT` policy and **no write arm at all**
 * (`20260815120100_production_calendar_access.sql` §3): with row level security
 * enabled and no other arm, every session — anonymous, authenticated, a
 * master's — is refused a write on them through PostgREST. The service client is
 * therefore not a preference, it is the only client that can set
 * `linked_party_id` on a plan row. The tick's writer is granted to
 * `service_role` and to nothing else (`20260815120200_*_revoke.sql`), so the
 * same is true there.
 *
 * `access-gating.md` requires a new service-client use to be justified in
 * writing and to prove that no untrusted input reaches it. Both arguments these
 * exports accept are shape-checked against the identifier pattern **before** any
 * query, and neither is concatenated into anything: they travel as parameters.
 *
 * ── The entitlement check CANNOT live in the database, and that is measured ──
 *
 * `private.has_capability` answers about `auth.uid()`, which is **null** under
 * the service client. A check inside the tick's writer could therefore only ever
 * refuse a legitimate tick, which is why that function takes the actor as an
 * argument and says, in its own comment, that the gate is this file's. The
 * corollary is the uncomfortable one and it is written here rather than left to
 * be discovered: **if the guard below is removed, nothing underneath refuses.**
 *
 * ── Every refusal is a RETURNED value, and three siblings disagree ───────────
 *
 * `admin/venues/actions.ts:174-180`, `admin/artists/actions.ts:189` and
 * `admin/events/[id]/tickets/actions.ts:288` throw an `Error` whose message
 * carries the cause. Next **redacts** the message of an error thrown out of a
 * Server Action in a production build (`src/lib/capabilities/server.ts:59-63`),
 * so that cause works under `next dev` and reaches the reader as a blank exactly
 * where it counts — and a refusal nobody can read is a silent failure
 * (`meta-gates.md`), in a product with no error tracking at all. Every failure
 * below is a value with its own name. The divergence is declared here rather
 * than left for a reviewer to find.
 *
 * ── What is logged, and the one field that is never touched ──────────────────
 *
 * `error.code` and `error.message`, and nothing else. Never the error object,
 * and never PostgREST's third field — the one it fills with the **entire
 * rejected row**. Plan 44-02 measured that in a throwaway container against
 * these very tables, and a row of `production_plan` carries the venue word. A
 * refusal that handed back a space under negotiation would be a self-inflicted
 * disclosure by the module written to control the reading of it. The field's
 * name is deliberately not spelled anywhere here, for the reason
 * `formats/actions.ts:58-63` gives about its own forbidden literal.
 *
 * ── There is no third export, and no path that accepts a document ────────────
 *
 * D-44-26: the import is a **local script only**, so the calendar never transits
 * a Vercel function and never reaches a log, a cache or a runtime error. No
 * export here accepts an upload of any kind, and the parser is not re-exported
 * from this module — for the same reason the gate below is not exported: every
 * export of a `"use server"` module is a public endpoint, and a parser is not
 * one. `44-RESEARCH.md` §Import Path recommends building an upload action;
 * `44-UI-SPEC.md` §11.3 supersedes it on the owner's decision, and the
 * disagreement is written down here rather than smoothed over.
 *
 * ── Nothing here says what a format sounds like ──────────────────────────────
 *
 * Not in a message, not in a placeholder, not in a comment
 * (`sound-manifesto.md`). And no venue word, no date and no line-up reaches a
 * `console.*`, a thrown message or a returned value.
 */

/* ────────────────────────────────────────────────────────────────────────────
 * The gate — asked once per export, and deliberately not exported
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * Shape copied from `admin/formats/actions.ts:89-106` and from
 * `events/[id]/reveal/actions.ts:106-123`, including the two separate throw
 * categories: an unresolvable identity is **not** a refusal on the merits — it
 * means the migration that put `user_id` in the payload is not applied — and
 * collapsing the two is the pattern `meta-gates.md` forbids.
 *
 * It returns the context it resolved, so no export re-asks. `cache()` does not
 * memoise inside a Server Action body (`capabilities/server.ts:104-116`,
 * measured in phase 33), so a second call is a second full round trip and no
 * compiler sees it: **more than one `await assert…(` in one export is the
 * defect.**
 *
 * @throws `forbidden.production_read_required` — the answer is no.
 * @throws `capabilities.identity_missing` — the payload carried no `user_id`.
 */
async function assertProductionRead(): Promise<{ userId: string }> {
  const { capabilities, userId } = await getAccessContext();

  if (!capabilities.has(CAP.PRODUCTION_READ)) {
    throw new Error("forbidden.production_read_required");
  }

  if (!userId) {
    console.error(
      "[capabilities.identity_missing] a caller holds production.read but " +
        "my_access_context() returned no user_id. This is NOT a refusal on " +
        "the merits — the migration adding user_id has not been applied."
    );
    throw new Error("capabilities.identity_missing");
  }

  return { userId };
}

/** The same shape as `formats/actions.ts:111-113`. */
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** PostgreSQL `unique_violation`. */
const UNIQUE_VIOLATION = "23505";

/** The one client this module uses, named so the helpers can be typed. */
type CalendarClient = ReturnType<typeof getServiceClient>;

/**
 * The stage a space has actually reached, as the plan row carries it.
 *
 * Taken as an indexed access on the row interface rather than imported from the
 * vocabulary module: this file must not import from the import pipeline at all,
 * and an indexed access moves with the interface without opening that door.
 */
type VenueStageValue = ProductionPlan["venue_stage"];

/* ────────────────────────────────────────────────────────────────────────────
 * The refusals — one value per distinguishable cause, and no shared bucket
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * Every way either act can be refused.
 *
 * There is no shared *something went wrong*. The recorded precedent in this
 * repository is the newsletter form collapsing a network fault, a missing key
 * and an address already subscribed into one indebuggable message
 * (`.planning/codebase/CONCERNS.md`), and this product has **no error
 * tracking** — so the returned value is the only place a refusal exists for a
 * human.
 */
export type CalendarRefusal =
  /**
   * An identifier that is not a uuid. Nothing was asked of the database.
   *
   * Not a formality: these arguments arrive on an untrusted POST, and PostgREST
   * answers a malformed uuid with `22P02` — a code that says nothing about
   * which argument was wrong.
   */
  | "invalid_id"
  /** `tickChecklistItem` was called with something that is not a boolean. */
  | "invalid_ticked"
  /**
   * The caller's profile carries no full name, so the tick has nobody to be
   * attributed to.
   *
   * Refused rather than filled with a placeholder: a tick attributed to
   * «Member» is not attributed, and *chi decide e' tracciato*
   * (`community-membership.md`). It is separate from the read below because *we
   * could not read the name* and *there is no name* are different defects.
   */
  | "actor_name_missing"
  /** The name lookup itself failed. Nothing was written. */
  | "actor_name_unreadable"
  /** The writer's `arguments_required`, carried through under its own name. */
  | "tick_arguments_required"
  /** The writer's `actor_required`. */
  | "tick_actor_required"
  /** The writer's `actor_unknown` — a stale id, not a missing one. */
  | "tick_actor_unknown"
  /** The writer's `item_not_found`. */
  | "item_not_found"
  /**
   * The writer answered something that is not its documented object.
   *
   * Practically unreachable, and kept for exactly that reason: the day it is
   * returned, the function's contract and this caller have parted company, and
   * this value says so instead of hiding it inside `write_failed`.
   */
  | "tick_malformed"
  /** No plan row carries that id. */
  | "plan_not_found"
  /**
   * The plan row is already linked to a night.
   *
   * Announcing twice is **not** idempotent: it would spend a second series
   * number, and a spent number is never released (`meta-gates.md`, the third
   * one-way switch). Its own code, so the surface can say *this night already
   * exists* rather than *something failed*.
   *
   * This is the **fast** refusal, taken on the read before anything is created.
   * It is not the guarantee — the guarantee is the predicate on the link's own
   * write, and its refusal is the code below.
   */
  | "already_announced"
  /**
   * ⚠ **Another call announced this plan row first, and the night THIS call
   * created is tied to nothing.**
   *
   * Two facts, and neither may be dropped for the other. Reporting only the
   * first would say *this was already announced* and leave an unlinked night in
   * the product for somebody to find months later; reporting only the second
   * would send the operator to press again, on a row that is already announced.
   *
   * **No number was spent by this call.** Only a night carrying no progressivo
   * can reach here: with a number, the second insert is refused upstream by
   * `event_parties_format_series_number_unique` and comes back as
   * `number_taken`, and `bump_series_watermark` raises the water level with
   * `GREATEST(highest_assigned, NEW.number)`, which a null leaves untouched.
   *
   * The night is **not** removed by this act. Its container is unpublished, so
   * nothing is publicly readable, and a silent deletion would hide the one
   * thing the operator needs to know — that two calls ran. The id travels back
   * so the night can be named, because the title alone cannot name it: a night
   * without a progressivo is titled with the bare format name, which is exactly
   * what the winning night is titled too.
   */
  | "already_announced_orphan_night"
  /** The import could not resolve the entry's format, so there is nothing to write. */
  | "format_not_resolved"
  /** The import could not resolve the entry's series. */
  | "series_not_resolved"
  /**
   * The plan row carries no start time.
   *
   * A night's time is `NOT NULL`, and inventing one would put an hour on a door
   * that nobody chose.
   */
  | "start_time_missing"
  /**
   * The space is not `acquired`, so the night may not be announced.
   *
   * Decision of 2026-08-15, recorded in `44-12-SUMMARY.md`: *una classifica non
   * e' una disponibilita'*, and **acquired means in writing**
   * (`venue-acquisition.md`). Announcing a night in a space still under
   * negotiation closes that negotiation badly, and closes it for us. The
   * failure carries the stage the space actually reached, so the surface can
   * name it — four words and a null name no space.
   */
  | "venue_stage_not_acquired"
  /**
   * That format, series and number are already carried by another night.
   *
   * `event_parties_format_series_number_unique` is the rule; this is the
   * sentence a person reads. The two do not substitute for each other.
   */
  | "number_taken"
  /**
   * A read that had to happen before the write could not be performed.
   *
   * **Nothing was written and no number was spent.** Distinct from
   * `write_failed` because the two say different things about the state of the
   * world.
   */
  | "precheck_failed"
  /** The write was attempted and refused. Nothing exists, and no number was spent. */
  | "write_failed"
  /**
   * ⚠ **The night EXISTS and the number IS spent** — only the plan row could not
   * be linked to it.
   *
   * This one must never wear `write_failed`'s sentence. §13.2's copy for a
   * failed announcement says *nothing was written and the series number was not
   * spent*, and here both halves are false: `bump_series_watermark` has already
   * fired. Telling somebody the opposite would send them to press the button
   * again, which spends a second number.
   */
  | "link_failed";

/** What a refused call answers. */
export interface CalendarFailure {
  readonly ok: false;
  readonly reason: CalendarRefusal;
  /**
   * Only on `venue_stage_not_acquired`: how far the space actually is.
   *
   * One of four declared words, or null for *not recorded*. It names no space
   * and carries no venue word — the whole point is to answer *which stage*
   * without answering *which place*.
   */
  readonly stage?: VenueStageValue;
  /**
   * Only on `already_announced_orphan_night`: the night this call created and
   * could not link.
   *
   * A uuid, and nothing else — no title, no date, no venue word. It is the only
   * handle that distinguishes this night from the one that won the race, which
   * carries the same title and the same date.
   */
  readonly orphanPartyId?: string;
}

/** What a recorded tick answers. */
export type ChecklistTickResult =
  | { readonly ok: true; readonly itemId: string; readonly ticked: boolean }
  | CalendarFailure;

/** What a completed announcement answers. */
export type AnnounceNightResult =
  | {
      readonly ok: true;
      readonly partyId: string;
      /**
       * How many checklist items were still open when the night was announced.
       *
       * `null` means **the count itself could not be read** — never *none*
       * (OBS-03). A zero drawn where a read failed is a plausible-looking
       * substitute for a fact nobody has.
       */
      readonly openItems: number | null;
    }
  | CalendarFailure;

/* ────────────────────────────────────────────────────────────────────────────
 * WRITE ONE — the tick
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * The actor's full name, resolved **server-side** from the id the gate produced.
 *
 * Never from the request body: otherwise whoever calls chooses the name the
 * trace will carry, and the trace is the entire point of recording an author.
 * The same discipline as `events/[id]/reveal/actions.ts:672-706`.
 *
 * The name is never logged and never returned. It is authorised in the database
 * and stops there; `.planning/` is tracked and public, and artefacts name roles.
 */
async function resolveActorName(
  client: CalendarClient,
  userId: string
): Promise<{ ok: true; name: string } | CalendarFailure> {
  const { data, error } = await client
    .from("profiles")
    .select("full_name")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error(
      `[calendar.actor_name_unreadable] code=${error.code ?? "unknown"} message=${error.message}`
    );
    return { ok: false, reason: "actor_name_unreadable" };
  }

  const row = data as unknown as { full_name: string | null } | null;
  const name = row?.full_name?.trim();

  if (!name) {
    console.error(
      "[calendar.actor_name_missing] a caller holds production.read and " +
        "their profile carries no full name. The tick was NOT recorded: an " +
        "unattributed tick is not a degraded tick."
    );
    return { ok: false, reason: "actor_name_missing" };
  }

  return { ok: true, name };
}

/** The writer's four reason codes, each mapped to one of ours. */
function translateTickReason(reason: unknown): CalendarRefusal {
  switch (reason) {
    case "arguments_required":
      return "tick_arguments_required";
    case "actor_required":
      return "tick_actor_required";
    case "actor_unknown":
      return "tick_actor_unknown";
    case "item_not_found":
      return "item_not_found";
    default:
      // A code the writer's documented contract does not list. Named rather
      // than folded into `write_failed`, so the day the contract grows this
      // says so instead of hiding it.
      return "tick_malformed";
  }
}

/**
 * Record a checklist tick, together with who made it.
 *
 * ── A tick warns, it never blocks, and it is REVERSIBLE ──────────────────────
 *
 * `ticked = false` is a supported call and re-records the author, so the trace
 * answers *who last decided this*, in both directions (D-44-16). **This is not
 * a monotone guard**, and the wrong precedent is one directory away: this
 * repository's nearest neighbours are all one-way switches — an address that has
 * been mailed, a payment that has reached completed, a series number that has
 * been spent — and none of their reasoning travels here. Nothing leaves the
 * building because somebody ticked a box. The three one-way switches
 * `meta-gates.md` names are untouched by this export.
 *
 * ── Why the actor travels as an argument ────────────────────────────────────
 *
 * Every path arrives through the service client, under which `auth.uid()` is
 * null: a trigger, or an internal `auth.uid()`, would record **nobody** on every
 * tick (measured, `32-06-SUMMARY.md` §F1). The writer therefore takes both the
 * id and the name, and both are resolved here from the id the gate produced.
 */
export async function tickChecklistItem(
  itemId: string,
  ticked: boolean
): Promise<ChecklistTickResult> {
  // Asked FIRST, and once. The client is constructed after it, never before.
  const { userId } = await assertProductionRead();

  if (typeof itemId !== "string" || !UUID_PATTERN.test(itemId)) {
    return { ok: false, reason: "invalid_id" };
  }
  if (typeof ticked !== "boolean") {
    return { ok: false, reason: "invalid_ticked" };
  }

  const client = getServiceClient();

  const actor = await resolveActorName(client, userId);
  if (!actor.ok) return actor;

  const { data, error } = await client.rpc("record_checklist_tick", {
    p_item_id: itemId,
    p_ticked: ticked,
    p_actor_id: userId,
    p_actor_name: actor.name,
  });

  if (error) {
    // `code` and `message`. Never the object, and never the field that carries
    // the rejected row.
    console.error(
      `[calendar.tick_failed] item=${itemId} code=${error.code ?? "unknown"} message=${error.message}`
    );
    return { ok: false, reason: "write_failed" };
  }

  const payload = data as { ok?: unknown; reason?: unknown } | null;

  if (payload === null || typeof payload !== "object") {
    console.error(
      `[calendar.tick_malformed] item=${itemId}: the writer answered something ` +
        "that is not its documented object."
    );
    return { ok: false, reason: "tick_malformed" };
  }

  if (payload.ok !== true) {
    const reason = translateTickReason(payload.reason);
    console.error(`[calendar.tick_refused] item=${itemId} reason=${reason}`);
    return { ok: false, reason };
  }

  /*
    THE NIGHT'S ADDRESS, BY ITS ROUTE PATTERN.

    An item knows its plan only in the database, and asking for it would be a
    second read on a path that has already succeeded. `revalidatePath` takes the
    dynamic route's own pattern with the `"page"` kind, which covers every night
    without naming one — and naming one here would put an identifier in a call
    for no gain.

    Both surfaces are `force-dynamic` today, so this changes nothing observable.
    It is written so the reason survives a refactor that lets either of them be
    cached.
  */
  revalidatePath("/admin/calendar/[id]", "page");
  revalidatePath("/admin/calendar");

  return { ok: true, itemId, ticked };
}

/* ────────────────────────────────────────────────────────────────────────────
 * WRITE TWO — the announcement
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * The night's stored name: the format, and the progressivo padded to three.
 *
 * ⚠ **The venue word is deliberately NOT in it**, and that is a departure from
 * the naming rule a reader will check this against. `brand-visual-system.md`
 * writes a satellite as `RamaDub x <venue>` — but that rule governs a night
 * whose space may be **named in public**, and this act cannot know that: the
 * space is acquired in writing, which is not the same as announced. A title is
 * a stored public string; carrying the calendar's internal venue word into one
 * would publish a place as a side effect of announcing a date. The operator
 * names the night on the event form, which is the surface that already carries
 * every venue gate.
 *
 * It does not reuse the surface's `formatProgressivo`: that formatter answers a
 * missing or unreadable number with a **sentence for a screen**, and a sentence
 * stored in a title column is a title that reads as an error message.
 */
function composeNightTitle(formatName: string, progressivo: number | null): string {
  if (progressivo === null || !Number.isInteger(progressivo) || progressivo < 0) {
    return formatName;
  }
  return `${formatName} ${String(progressivo).padStart(3, "0")}`;
}

/**
 * How many checklist items are still open.
 *
 * `null` means **the read failed** — never *none*. An announcement that reported
 * zero open items because the count could not be taken would be a plausible
 * sentence covering a fault, which is the shape OBS-03 refuses, and it would
 * fail in the direction that hides work.
 */
async function countOpenItems(
  client: CalendarClient,
  planId: string
): Promise<number | null> {
  const { count, error } = await client
    .from("production_checklist_item")
    .select("id", { count: "exact", head: true })
    .eq("plan_id", planId)
    .is("ticked_at", null);

  if (error) {
    console.error(
      `[calendar.open_items_unreadable] plan=${planId} code=${error.code ?? "unknown"} message=${error.message}`
    );
    return null;
  }

  return count ?? null;
}

/**
 * Announce a night: turn a plan row into a night in the product.
 *
 * ── This is the ONLY place in the phase that writes a night ──────────────────
 *
 * D-44-06 makes this the single bridge between the calendar and the product,
 * and that is what makes D-44-01 safe: with the file as the source of truth, a
 * re-import that reached the night directly could move a date that already has
 * tickets on sale. Writing the sentence here is what makes the guarantee
 * findable.
 *
 * ── It SPENDS a series number, permanently ──────────────────────────────────
 *
 * The insert below fires `event_parties_bump_series_watermark`, which raises the
 * series' water level with `GREATEST` and **never lowers it**. Deleting the
 * night afterwards leaves a permanent gap in the progressivo. That trigger is
 * not re-implemented here, not touched, and not read: there is no counter in
 * this file and no second water level. It is one of the project's three
 * one-way switches, and the person pressing the button is the person who needs
 * to know it — which is why the confirmation says so in words.
 *
 * ── The three venue-secrecy decisions this act implements ───────────────────
 *
 * Taken by the expert persona on 2026-08-15 under the owner's standing
 * instruction to proceed, recorded with their reason in `44-12-SUMMARY.md`, and
 * loosenable by the owner. All three narrow:
 *
 *   1. **A night whose space is not `acquired` cannot be announced.** Refused
 *      below, as a returned value with its own code, and the refusal names the
 *      stage. *Una classifica non e' una disponibilita'*, and acquired means in
 *      writing.
 *   2. **The night is created with its address kept secret**, and no automatic
 *      reveal is armed: the space is not carried across at all, and the
 *      purchase-time reveal is written `false` rather than left to a column
 *      default that is `true`. Revealing is a separate act and a one-way
 *      switch; an announcement must never be able to reveal as a side effect.
 *   3. **The confirmation does not name the venue** — see the dialog.
 *
 * ── And it creates the night's container, because the column demands one ────
 *
 * `event_parties.event_id` is `NOT NULL`. So *generating the event from the plan
 * row* (D-44-06, in as many words) is literally what has to happen: an
 * **unpublished** container is created first, and unpublished is the load-bearing
 * word — nothing on it is publicly readable until somebody publishes it, which
 * is a separate act on a separate surface with its own confirmation.
 *
 * ── It never blocks on open checklist items ─────────────────────────────────
 *
 * D-44-16: a tick warns and never blocks. The count is taken and returned so the
 * surface can say so, and the act proceeds either way.
 */
export async function announceNight(planId: string): Promise<AnnounceNightResult> {
  // Asked FIRST, and once. The client is constructed after it, never before.
  const { userId } = await assertProductionRead();

  if (typeof planId !== "string" || !UUID_PATTERN.test(planId)) {
    return { ok: false, reason: "invalid_id" };
  }

  const client = getServiceClient();

  /*
    ONE READ, AND THE ONE EMBED CHECKED AGAINST ITS FOREIGN KEY.

    `production_plan → formats` has exactly one relationship, `format_id`, and no
    junction table carries keys to both sides — so the embed is unambiguous. An
    ambiguous embed is `PGRST201` and fails SILENTLY through this client: `data`
    comes back null with nothing thrown.

    The venue word is NOT selected. Nothing in this act needs it, and a column
    that is never read cannot be logged, returned or interpolated by mistake.
  */
  const { data: planRow, error: planError } = await client
    .from("production_plan")
    .select(
      `id, date, start_time, end_time, number, venue_stage, linked_party_id,
       format_id, series_id,
       formats ( name )`
    )
    .eq("id", planId)
    .maybeSingle();

  if (planError) {
    console.error(
      `[calendar.announce_precheck_failed] plan=${planId} code=${planError.code ?? "unknown"} message=${planError.message}`
    );
    return { ok: false, reason: "precheck_failed" };
  }

  if (planRow === null) {
    return { ok: false, reason: "plan_not_found" };
  }

  const plan = planRow as unknown as {
    id: string;
    date: string;
    start_time: string | null;
    end_time: string | null;
    number: number | null;
    venue_stage: VenueStageValue;
    linked_party_id: string | null;
    format_id: string | null;
    series_id: string | null;
    formats: { name: string } | null;
  };

  // Announcing twice is not idempotent — it spends a second number.
  if (plan.linked_party_id !== null) {
    return { ok: false, reason: "already_announced" };
  }

  if (plan.format_id === null) {
    return { ok: false, reason: "format_not_resolved" };
  }
  if (plan.series_id === null) {
    return { ok: false, reason: "series_not_resolved" };
  }
  if (plan.start_time === null) {
    return { ok: false, reason: "start_time_missing" };
  }

  // Decision 1. The stage travels back so the refusal can name it; it names no
  // space, and the venue word is not in this row at all.
  if (plan.venue_stage !== "acquired") {
    return {
      ok: false,
      reason: "venue_stage_not_acquired",
      stage: plan.venue_stage,
    };
  }

  // Counted BEFORE anything is written, and it never gates: D-44-16.
  const openItems = await countOpenItems(client, plan.id);

  const title = composeNightTitle(
    plan.formats?.name ?? "Night",
    plan.number
  );

  /*
    The address of the container. Derived once, at creation, and never rewritten
    afterwards — `/events/<slug>` is a link somebody may send to somebody else.
    A collision takes a suffix rather than an overwrite, the shape
    `createFormat` uses for its own.
  */
  const base = slugify(title);
  let slug = base.length > 0 ? base : `night-${Date.now().toString(36)}`;

  const { data: slugTaken, error: slugError } = await client
    .from("events")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (slugError) {
    console.error(
      `[calendar.announce_precheck_failed] slug lookup for plan=${planId}: ` +
        `code=${slugError.code ?? "unknown"} message=${slugError.message}`
    );
    return { ok: false, reason: "precheck_failed" };
  }

  if (slugTaken) {
    slug = `${slug}-${Date.now().toString(36)}`;
  }

  /*
    THE CONTAINER, UNPUBLISHED.

    `is_published: false` is the load-bearing value and it is written explicitly
    rather than left to the column default: an announcement that published would
    make the act's own confirmation untrue the moment it succeeded. Publishing
    is a separate act, on a separate surface, with its own confirmation.

    `venue_secret: true` on the container as well, so that a later publication
    cannot open an address that nobody has decided to open.
  */
  const { data: createdEvent, error: eventError } = await client
    .from("events")
    .insert({
      slug,
      title,
      description: null,
      date: plan.date,
      venue_secret: true,
      lineup: [],
      cover_image: null,
      is_published: false,
      created_by: userId,
    })
    .select("id")
    .single();

  if (eventError || !createdEvent) {
    console.error(
      `[calendar.announce_write_failed] container for plan=${planId}: ` +
        `code=${eventError?.code ?? "unknown"} message=${eventError?.message ?? "no row returned"}`
    );
    return { ok: false, reason: "write_failed" };
  }

  /*
    THE NIGHT — and this insert is what raises the series' water level.

    What is deliberately NOT carried across from the plan row:

      · the venue, in either of its forms. The calendar's word is internal free
        text and may name a space nobody has announced; the resolved reference
        would arm the scheduled reveal, whose window falls back to a default
        when none is stored. Neither belongs in an act whose confirmation
        promises that no address moves;
      · a line-up. The plan row has no such column, and there is nothing to
        derive one from — a guessed line-up drawn on a screen is a line-up on a
        screen;
      · `access_type`, left to the column's own default. Whether a night is sold
        or opened is a commercial decision, and this act does not take it.

    `venue_reveal_on_purchase` IS written, and written `false`, because its
    column default is `true`: left alone, the first ticket sold on a night whose
    venue somebody later links would release the address without anybody
    deciding to. That is precisely the side effect decision 2 exists to refuse.
  */
  const { data: createdParty, error: partyError } = await client
    .from("event_parties")
    .insert({
      event_id: createdEvent.id,
      title,
      description: null,
      date: plan.date,
      time: plan.start_time,
      end_time: plan.end_time,
      venue_text: null,
      venue_id: null,
      lineup: [],
      venue_secret: true,
      venue_secret_hint: null,
      venue_reveal_hours: null,
      venue_reveal_on_purchase: false,
      format_id: plan.format_id,
      series_id: plan.series_id,
      number: plan.number,
      sort_order: 0,
    })
    .select("id")
    .single();

  if (partyError || !createdParty) {
    console.error(
      `[calendar.announce_write_failed] night for plan=${planId}: ` +
        `code=${partyError?.code ?? "unknown"} message=${partyError?.message ?? "no row returned"}`
    );

    /*
      The container exists and holds no night. Removed BY PRIMARY KEY, on the id
      this call just created and captured — never by a selector over a list
      (`ai-engineering.md`, gate *una rimozione si fa per chiave*). The precedent
      is `createEvent`'s own orphan-draft cleanup, and a failure to clean up is
      said out loud rather than swallowed.

      No number was spent: the trigger fires on the night's insert, and that
      insert is the one that failed.
    */
    const { error: cleanupError } = await client
      .from("events")
      .delete()
      .eq("id", createdEvent.id);

    if (cleanupError) {
      console.error(
        `[calendar.orphan_container] container=${createdEvent.id} could not be ` +
          `removed after its night was refused. code=${cleanupError.code ?? "unknown"} ` +
          `message=${cleanupError.message}`
      );
    }

    if (partyError?.code === UNIQUE_VIOLATION) {
      return { ok: false, reason: "number_taken" };
    }
    return { ok: false, reason: "write_failed" };
  }

  /*
    THE LINK (D-44-07). After this the plan row and the night stay tied, so a
    later divergence between the file and the product is SIGNALLED rather than
    discovered — and so the link itself is what refuses a second announcement
    rather than a number being spent to discover it.

    ⚠ A failure here is NOT `write_failed`. The night exists and the number is
    spent; only the tie is missing. Telling somebody otherwise would send them
    to press again.
  */
  /*
    ⚠ THE PAYLOAD IS THE LINK AND NOTHING ELSE, and the missing field is
    deliberate. This update used to carry a `updated_at` built here from the
    platform clock, which check U3 of `44-UI-SPEC.md` §15 forbids on this
    surface with an exemption list that reads `none` — written before any of
    this code existed, which is the only order in which an exemption list means
    anything. `scripts/verify-calendar-surface.mjs` found it on its first run.

    It was resolved by changing the code rather than by widening the gate. U3's
    rationale is about a CIVIL date, and an instant cannot move a weekday, so
    the temptation was to call this an exception and write one in. The reason
    not to is that the exception would have to be spelled as a file-and-line
    allow-list — no string check can tell an instant from a civil date — and an
    allow-list rots while the sentence beside it keeps claiming the rule holds.

    NOTHING IS LOST WITH IT. No product code reads `production_plan.updated_at`
    (the import script maintains its own on the rows it touches), and the
    instant this write happened is recorded where it belongs: on the night this
    action just created, whose `created_at` defaults to `now()` and which is
    reachable from here through `linked_party_id`.
  */
  /*
    ⚠ THE GUARD IS ON THIS WRITE, AND NOT ON THE READ THAT PRECEDED IT.

    `.is("linked_party_id", null)` travels as a PREDICATE OF THE UPDATE. The
    refusal at the top of this act — `already_announced` — is a fast path that
    saves the work in the ordinary case; it is not what makes the act safe,
    because nothing tied that read to this write. Two concurrent calls both saw
    a null link, both created a night, and the second update overwrote the first
    one's link — leaving a night that no calendar row points at and that no
    screen mentions.

    For a night that carries a progressivo the database already refused the
    second insert: `event_parties_format_series_number_unique` fires and this
    act returns `number_taken` above, before reaching here. The case this
    predicate closes is the OTHER one, and it is the legitimate one — a night
    that is the opening act of another carries NO number by design, and Postgres
    holds two NULLs DISTINCT, so that constraint does not fire and both inserts
    succeed. This predicate is the only thing that can tell the two calls apart.

    `.select("id")` is what makes the predicate readable. Without it, a refused
    update and a satisfied one give the same answer — no error, nothing returned
    — which is the silent zero this phase refuses everywhere else.
  */
  const { data: linkedRows, error: linkError } = await client
    .from("production_plan")
    .update({ linked_party_id: createdParty.id })
    .eq("id", plan.id)
    .is("linked_party_id", null)
    .select("id");

  if (linkError) {
    console.error(
      `[calendar.announce_link_failed] plan=${planId} night=${createdParty.id}: ` +
        `code=${linkError.code ?? "unknown"} message=${linkError.message}`
    );
    return { ok: false, reason: "link_failed" };
  }

  /*
    NO ROW WAS TOUCHED, WHICH IS AN ANSWER AND NOT AN ABSENCE.

    Somebody else linked this plan row between this call's read and this write.
    Two things are true at once and the returned value says both: the plan row
    IS announced, and the night this call created is tied to nothing.

    It is NOT reported as success, and it is NOT reported as `already_announced`
    — the first would hand back a night that the calendar does not point at, and
    the second would say nothing was created when something was. Its own code,
    for the reason every other refusal here has one.

    The night is left where it is. Its container is unpublished, so nothing is
    publicly readable; and removing it silently would erase the only trace that
    two calls ran, which is the one fact the operator needs. That is a different
    situation from the orphan CONTAINER above, which never held a night at all.
  */
  if (!linkedRows || linkedRows.length === 0) {
    console.error(
      `[calendar.announce_lost_link_race] plan=${planId} night=${createdParty.id}: ` +
        "the plan row was linked by another call between this call's read and " +
        "its write. The night this call created exists, is linked to nothing, " +
        "and carries no progressivo — so no series number was spent."
    );
    return {
      ok: false,
      reason: "already_announced_orphan_night",
      orphanPartyId: createdParty.id,
    };
  }

  revalidatePath("/admin/calendar");
  revalidatePath("/admin/calendar/[id]", "page");
  revalidatePath("/admin/events");

  return { ok: true, partyId: createdParty.id, openItems };
}
