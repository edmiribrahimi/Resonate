"use server";

import { revalidatePath } from "next/cache";
import { CAP } from "@/lib/capabilities/keys";
import { getAccessContext } from "@/lib/capabilities/server";
import { getServiceClient } from "@/lib/supabase/service";
import { slugify } from "@/utils/slugify";

/**
 * The catalogue writes — `public.formats` and `public.party_series`.
 *
 * ── Which client, and why it is NOT the one `admin/venues/actions.ts` picks ───
 *
 * Every write below goes through `getServiceClient()`. Its sibling catalogue
 * module picks the **cookie** client on purpose and says so at
 * `admin/venues/actions.ts:123-130`, because `public.venues` carries a P3 RLS
 * write policy that refuses an unapproved caller a second, independent time.
 * These two tables carry **no write policy at all**, deliberately
 * (`20260810120000_formats_and_series.sql` §4c): with RLS enabled and no
 * INSERT/UPDATE/DELETE arm, the cookie client is refused for *everybody*, so the
 * service client is not a preference here — it is the only client that can write
 * these rows.
 *
 * ── The consequence, immediately, because it is the whole point ───────────────
 *
 * There is therefore **no second refusal underneath this file**.
 * `assertCatalogueManage()` is the entire boundary, and a server action is a
 * public endpoint with a convenient signature. It is called **first in every
 * export**, with no exceptions and no "internal" helper that skips it — the
 * non-exported readers below are reached only from inside an export that has
 * already asked.
 *
 * ── The migration says the same thing from the other side ─────────────────────
 *
 * §4c of `20260810120000_formats_and_series.sql` names this file's guard as the
 * thing that decides who may write a catalogue row, and adds that saying so
 * there is not the same as enforcing it there. The two files agree in writing
 * rather than by coincidence, so neither can be read alone and mistaken for
 * coverage (`CLAUDE.md`, operating principle 2).
 *
 * ── Refusals are RETURNED, and this diverges from three siblings on purpose ───
 *
 * `admin/venues/actions.ts:174-180`, `admin/artists/actions.ts:189` and
 * `admin/events/[id]/tickets/actions.ts:288` all throw an `Error` whose message
 * carries the cause. Next **redacts** the message of an error thrown out of a
 * Server Action in a production build (`src/lib/capabilities/server.ts:59-63`),
 * so that cause works in `next dev` and reaches the user as a blank where it
 * counts — a refusal nobody can read is a silent failure (`meta-gates.md`), and
 * this product has no error tracking to catch it. Every export here returns
 * `CatalogueResult` instead. The divergence is declared here rather than left
 * for a reviewer to find.
 *
 * ── What is logged, and what is never logged ──────────────────────────────────
 *
 * `error.code` and `error.message`, and nothing else. Never the error object,
 * and never its third field — the one PostgREST fills with the entire rejected
 * row on a `CHECK` violation
 * (`.planning/todos/pending/postgrest-details-leaks-the-row.md`). This
 * catalogue's rows include a series name that may carry a venue, so that field
 * is an exit. **Its name is deliberately not written anywhere in this file**,
 * for the reason `[id]/assignments/actions.ts:58-62` gives about its own
 * forbidden literal: a grep whose only match is the sentence forbidding the
 * thing is a grep that gets ignored the third time it goes red.
 *
 * Every branch below is on `error.code`, never on `error.message` — which is why
 * a `23505` is resolved into a named cause by a **read**, not by looking for a
 * constraint name inside a string.
 *
 * Nothing in this file says what any format sounds like — not in a message, not
 * in a placeholder, not in a comment (`sound-manifesto.md`).
 */

/**
 * The gate. It asks `catalogue.manage`, which is `requires_approved = true`
 * (`20260807000000_capability_model.sql:399-400`), so a **pending** organizer is
 * refused here as well as at the address (`capability-routes.ts`).
 *
 * Copied in shape from `admin/venues/actions.ts:64-85`, including both throw
 * categories and the `console.error` on the second one only: an unresolvable
 * identity is **not** a refusal on the merits, and collapsing the two into one
 * category would be exactly the pattern `meta-gates.md` forbids.
 *
 * It is deliberately **NOT exported**: every export of a `"use server"` module
 * is a public endpoint, and a gate is not one (`admin/venues/actions.ts:44-50`).
 *
 * @throws `forbidden.catalogue_manage_required` — the answer is no.
 * @throws `capabilities.identity_missing` — the payload carried no `user_id`.
 */
async function assertCatalogueManage(): Promise<{ userId: string }> {
  const { capabilities, userId } = await getAccessContext();

  if (!capabilities.has(CAP.CATALOGUE_MANAGE)) {
    throw new Error("forbidden.catalogue_manage_required");
  }

  if (!userId) {
    console.error(
      "[capabilities.identity_missing] a caller holds catalogue.manage but " +
        "my_access_context() returned no user_id. This is NOT a refusal on " +
        "the merits — the migration adding user_id has not been applied."
    );
    throw new Error("capabilities.identity_missing");
  }

  return { userId };
}

/** PostgreSQL `unique_violation`. */
const UNIQUE_VIOLATION = "23505";

/** The same shape as `[id]/assignments/actions.ts:85-86`. */
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The application half of `formats_color_hex_check`.
 *
 * The database holds the same rule as a named `CHECK`
 * (`20260810120000_formats_and_series.sql:173`). The two halves do not
 * substitute for each other: the constraint keeps the row from existing, this
 * one hands a person a sentence instead of a constraint name.
 */
const HEX_PATTERN = /^#[0-9A-Fa-f]{6}$/;

/**
 * The shape of an internal code — and here there is only ONE half.
 *
 * The migration constrains a code's *uniqueness* and never its shape, so unlike
 * the colour above nothing underneath re-checks this. Said plainly rather than
 * implied: delete this rule and a code of punctuation is storable.
 */
const CODE_PATTERN = /^[A-Z0-9]{2,12}$/;

/** Postgres `integer`. Beyond it the write is `22003`, not a refusal anybody planned. */
const INT4_MAX = 2147483647;

/**
 * The longest name this surface accepts, and the database accepts any length.
 * An application-only limit, so that a row cannot arrive on a card as a
 * paragraph. It refuses nothing the product needs: the longest name in the
 * catalogue today is nineteen characters.
 */
const NAME_MAX = 120;

/**
 * Every way a catalogue write can be refused, one value each.
 *
 * There is no shared "something went wrong". The recorded precedent in this
 * repository is the newsletter form collapsing three causes into one sentence
 * (`.planning/codebase/CONCERNS.md`), and this product has **no error tracking**
 * (`meta-gates.md`) — so this returned value is the only place a refusal exists
 * for a human.
 *
 * Where a member is also enforced by the database, the comment says why the two
 * halves do not substitute for each other, in the form
 * `[id]/assignments/actions.ts:123-140` argues about its own pair.
 */
export type CatalogueRefusal =
  /**
   * An identifier that is not a uuid. Nothing was asked of the database.
   *
   * Not a formality: these arguments arrive on an untrusted POST, and PostgREST
   * answers a malformed uuid with `22P02` — a code that says nothing about which
   * argument was wrong.
   */
  | "invalid_id"
  /** A name that is empty after trimming, or longer than `NAME_MAX`. */
  | "invalid_name"
  /**
   * The name carries nothing a URL can be built from.
   *
   * `slugify` strips everything outside `a-z0-9-`, so a name of punctuation or of
   * a non-Latin script produces an empty slug. Distinct from `invalid_name`
   * because the name itself may be perfectly good — what is missing is the
   * address, and `formats.slug` is the value that travels in a link somebody may
   * have sent to somebody else.
   */
  | "slug_empty"
  /** A code that is empty, or not two to twelve characters of `A-Z0-9`. */
  | "invalid_code"
  /**
   * A colour that is missing or is not `#` plus six hex digits.
   *
   * `formats_color_hex_check` refuses the same value at the row. That constraint
   * is the RULE; this is the SENTENCE A PERSON READS — delete this branch and the
   * write still fails, with a constraint name instead of an instruction.
   */
  | "invalid_color"
  /** A sort order that is not an integer, or is outside Postgres `integer`. */
  | "invalid_sort_order"
  /** `setFormatListed` was called with something that is not a boolean. */
  | "invalid_listed"
  /** No format carries that id. */
  | "format_not_found"
  /** The format is already retired, so retiring it again would move nothing. */
  | "format_already_retired"
  /** The format is not retired, so there is nothing to restore. */
  | "format_not_retired"
  /**
   * The colour is already held by another **active** format.
   *
   * `formats_color_active_unique` is a PARTIAL unique index — on
   * `retired_at IS NULL` — so retiring a format releases its colour while the
   * retired row keeps the colour its nights actually carried. This value is
   * decided by a read **before** the write, so that the surface can name the
   * holder; the index is what makes it true when two people press save at the
   * same moment.
   *
   * The refusal carries no holder name on purpose: the surface that offers the
   * colours already holds the catalogue, so it can name the holder from the
   * colour it just tried, and a value that carried a name would put a format's
   * name into a refusal that is also rendered on a public-facing screen.
   */
  | "color_taken"
  /**
   * The code is already held by another format.
   *
   * `formats_code_unique` is TOTAL, not partial: a retired format keeps its code,
   * because a retired sigla is not re-issued (`production-calendar.md`). The slug
   * cannot reach this value — a collision is resolved with a suffix at creation,
   * the way `createVenue` resolves its own (`admin/venues/actions.ts:146-156`).
   */
  | "duplicate_code"
  /** The code is already held by another series **of the same format**. */
  | "duplicate_series_code"
  /**
   * A `23505` the reads above did not predict.
   *
   * Practically unreachable, and kept for exactly that reason: the day it is
   * returned, either two people pressed save inside the same instant or a
   * pre-check stopped working — and this value says so instead of hiding it
   * inside `write_failed`.
   */
  | "duplicate_refused_by_database"
  /** No series carries that id. */
  | "series_not_found"
  /** The series is already retired. */
  | "series_already_retired"
  /** The series is not retired, so there is nothing to restore. */
  | "series_not_retired"
  /**
   * The format is retired and cannot take a new series.
   *
   * Retirement means *no new night may be assigned to this*
   * (`20260810120000_formats_and_series.sql:129-131`), and a new series exists
   * only to carry new nights. **The database does not refuse this** — there is no
   * constraint anywhere that reads `formats.retired_at` — so unlike the colour
   * and the codes, this member has no second half. Deleting it opens the
   * operation.
   */
  | "format_retired"
  /**
   * A read that had to happen before the write could not be performed.
   *
   * Nothing was written. Distinct from `write_failed` because the two say
   * different things about the state of the row: here there is no row and no
   * attempt, there the attempt was made and refused.
   */
  | "precheck_failed"
  /** Any other database failure. Nothing was written. */
  | "write_failed";

/**
 * What every export returns.
 *
 * `id` on success is the row the call acted on, so a surface can revalidate or
 * navigate without a second read.
 */
export type CatalogueResult =
  | { ok: true; id: string }
  | { ok: false; reason: CatalogueRefusal };

type ServiceClient = ReturnType<typeof getServiceClient>;

/** `null` means the read itself failed — never "no". */
async function colorHeldByActiveFormat(
  client: ServiceClient,
  color: string,
  exceptId: string | null
): Promise<boolean | null> {
  let query = client
    .from("formats")
    .select("id")
    .eq("color", color)
    .is("retired_at", null)
    .limit(1);

  if (exceptId) query = query.neq("id", exceptId);

  const { data, error } = await query;

  if (error) {
    console.error(
      `[catalogue.precheck_failed] colour lookup: ${error.code ?? "unknown"} ${error.message}`
    );
    return null;
  }

  return (data?.length ?? 0) > 0;
}

/** `null` means the read itself failed — never "no". */
async function formatCodeHeld(
  client: ServiceClient,
  code: string,
  exceptId: string | null
): Promise<boolean | null> {
  let query = client.from("formats").select("id").eq("code", code).limit(1);

  if (exceptId) query = query.neq("id", exceptId);

  const { data, error } = await query;

  if (error) {
    console.error(
      `[catalogue.precheck_failed] format code lookup: ${error.code ?? "unknown"} ${error.message}`
    );
    return null;
  }

  return (data?.length ?? 0) > 0;
}

/**
 * Turn a `23505` into a named cause — by asking the database again, never by
 * reading the constraint name out of `error.message`.
 *
 * The message is where PostgREST puts the constraint name, and branching on it
 * would make the refusal depend on a string this project does not control.
 * Asking costs one read on a path that has already failed.
 */
async function classifyFormatDuplicate(
  client: ServiceClient,
  code: string | null,
  color: string | null,
  exceptId: string | null
): Promise<CatalogueRefusal> {
  if (color) {
    const taken = await colorHeldByActiveFormat(client, color, exceptId);
    if (taken) return "color_taken";
  }

  if (code) {
    const held = await formatCodeHeld(client, code, exceptId);
    if (held) return "duplicate_code";
  }

  return "duplicate_refused_by_database";
}

/** The three shape checks `createFormat` and `updateFormat` share. */
function checkName(name: unknown): { ok: true; value: string } | { ok: false; reason: CatalogueRefusal } {
  if (typeof name !== "string") return { ok: false, reason: "invalid_name" };
  const trimmed = name.trim();
  if (!trimmed || trimmed.length > NAME_MAX) {
    return { ok: false, reason: "invalid_name" };
  }
  return { ok: true, value: trimmed };
}

function checkCode(code: unknown): { ok: true; value: string } | { ok: false; reason: CatalogueRefusal } {
  if (typeof code !== "string") return { ok: false, reason: "invalid_code" };
  const normalised = code.trim().toUpperCase();
  if (!CODE_PATTERN.test(normalised)) {
    return { ok: false, reason: "invalid_code" };
  }
  return { ok: true, value: normalised };
}

function checkColor(color: unknown): { ok: true; value: string } | { ok: false; reason: CatalogueRefusal } {
  if (typeof color !== "string") return { ok: false, reason: "invalid_color" };
  const trimmed = color.trim();
  if (!HEX_PATTERN.test(trimmed)) {
    return { ok: false, reason: "invalid_color" };
  }
  return { ok: true, value: trimmed };
}

/**
 * Create a format.
 *
 * ── It takes no `listed` argument, and that absence is D-36-17 ────────────────
 *
 * A format is created with `listed = false`, always — the column's own default
 * (`20260810120000_formats_and_series.sql:141`), which this insert does not
 * override and must never override. Existing in the catalogue and appearing in
 * the public filter are **two separate acts**: if creation could list a format,
 * a fifth identity prepared in September would announce a November series the
 * moment somebody pressed save — the product making the announcement instead of
 * a person. Publication is `setFormatListed`, and it has its own name so that a
 * reader of the call sites can see where it happens.
 *
 * This is the line a later "convenience" would delete.
 */
export async function createFormat(
  name: string,
  code: string,
  color: string
): Promise<CatalogueResult> {
  // Asked ONCE. `cache()` does not memoise inside a Server Action body
  // (`src/lib/capabilities/server.ts:103-121`), so a second call is a second
  // full round trip and no compiler sees it.
  const { userId } = await assertCatalogueManage();
  const client = getServiceClient();

  const checkedName = checkName(name);
  if (!checkedName.ok) return checkedName;

  const checkedCode = checkCode(code);
  if (!checkedCode.ok) return checkedCode;

  const checkedColor = checkColor(color);
  if (!checkedColor.ok) return checkedColor;

  // The slug is derived once, at creation, and no export in this module changes
  // it afterwards: `/events?format=<slug>` is an address somebody may have sent
  // to somebody else, and rewriting it breaks that link
  // (`20260810120000_formats_and_series.sql:96-98`).
  const base = slugify(checkedName.value);
  if (!base) return { ok: false, reason: "slug_empty" };

  let slug = base;
  const { data: existingSlug, error: slugError } = await client
    .from("formats")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (slugError) {
    console.error(
      `[catalogue.precheck_failed] slug lookup: ${slugError.code ?? "unknown"} ${slugError.message}`
    );
    return { ok: false, reason: "precheck_failed" };
  }

  if (existingSlug) {
    slug = `${base}-${Date.now().toString(36)}`;
  }

  const codeHeld = await formatCodeHeld(client, checkedCode.value, null);
  if (codeHeld === null) return { ok: false, reason: "precheck_failed" };
  if (codeHeld) return { ok: false, reason: "duplicate_code" };

  const colorTaken = await colorHeldByActiveFormat(client, checkedColor.value, null);
  if (colorTaken === null) return { ok: false, reason: "precheck_failed" };
  if (colorTaken) return { ok: false, reason: "color_taken" };

  const { data: created, error } = await client
    .from("formats")
    .insert({
      slug,
      name: checkedName.value,
      code: checkedCode.value,
      color: checkedColor.value,
      created_by: userId,
    })
    .select("id")
    .single();

  if (error || !created) {
    console.error(
      `[catalogue.write_failed] createFormat: ${error?.code ?? "unknown"} ${error?.message ?? "no row returned"}`
    );
    if (error?.code === UNIQUE_VIOLATION) {
      return {
        ok: false,
        reason: await classifyFormatDuplicate(
          client,
          checkedCode.value,
          checkedColor.value,
          null
        ),
      };
    }
    return { ok: false, reason: "write_failed" };
  }

  // `/admin/formats` only. A format born unlisted changes nothing a visitor can
  // see, and revalidating `/events` here would be the first sentence of the
  // argument that creation is a publication. It is not.
  revalidatePath("/admin/formats");
  return { ok: true, id: created.id };
}

/**
 * Update a format's name, colour and sort order.
 *
 * Not the slug (an address already in circulation) and not the code (half of a
 * sigla that is already on material). Listing is `setFormatListed`, so an
 * accidental `updateFormat` cannot perform a publication.
 */
export async function updateFormat(
  formatId: string,
  name: string,
  color: string,
  sortOrder: number
): Promise<CatalogueResult> {
  await assertCatalogueManage();
  const client = getServiceClient();

  if (typeof formatId !== "string" || !UUID_PATTERN.test(formatId)) {
    return { ok: false, reason: "invalid_id" };
  }

  const checkedName = checkName(name);
  if (!checkedName.ok) return checkedName;

  const checkedColor = checkColor(color);
  if (!checkedColor.ok) return checkedColor;

  if (
    typeof sortOrder !== "number" ||
    !Number.isInteger(sortOrder) ||
    Math.abs(sortOrder) > INT4_MAX
  ) {
    return { ok: false, reason: "invalid_sort_order" };
  }

  const { data: existing, error: readError } = await client
    .from("formats")
    .select("id")
    .eq("id", formatId)
    .maybeSingle();

  if (readError) {
    console.error(
      `[catalogue.precheck_failed] updateFormat read: ${readError.code ?? "unknown"} ${readError.message}`
    );
    return { ok: false, reason: "precheck_failed" };
  }
  if (!existing) return { ok: false, reason: "format_not_found" };

  const colorTaken = await colorHeldByActiveFormat(client, checkedColor.value, formatId);
  if (colorTaken === null) return { ok: false, reason: "precheck_failed" };
  if (colorTaken) return { ok: false, reason: "color_taken" };

  const { error } = await client
    .from("formats")
    .update({
      name: checkedName.value,
      color: checkedColor.value,
      sort_order: sortOrder,
      updated_at: new Date().toISOString(),
    })
    .eq("id", formatId);

  if (error) {
    console.error(
      `[catalogue.write_failed] updateFormat ${formatId}: ${error.code ?? "unknown"} ${error.message}`
    );
    if (error.code === UNIQUE_VIOLATION) {
      return {
        ok: false,
        reason: await classifyFormatDuplicate(client, null, checkedColor.value, formatId),
      };
    }
    return { ok: false, reason: "write_failed" };
  }

  revalidatePath("/admin/formats");
  // A listed format's name and colour are what a visitor reads on the chip row.
  revalidatePath("/events");
  return { ok: true, id: formatId };
}

/**
 * List or unlist a format — the publication switch, and its own export.
 *
 * It is not a field of `updateFormat` because listing is a **publication**:
 * giving it a name means a reader of the call sites can see where publication
 * happens, and means a save of a name or a colour cannot perform one by
 * accident (D-36-17).
 *
 * It is not monotone in either direction, and nothing in this phase is: a format
 * can be unlisted again, and unlisting removes it from the filter without
 * touching a night that already ran. The monotone guard this phase must not
 * break is the series progressivo, which lives in the database
 * (`bump_series_watermark`, `GREATEST`) and which no export here writes.
 */
export async function setFormatListed(
  formatId: string,
  listed: boolean
): Promise<CatalogueResult> {
  await assertCatalogueManage();
  const client = getServiceClient();

  if (typeof formatId !== "string" || !UUID_PATTERN.test(formatId)) {
    return { ok: false, reason: "invalid_id" };
  }
  if (typeof listed !== "boolean") {
    return { ok: false, reason: "invalid_listed" };
  }

  const { data: existing, error: readError } = await client
    .from("formats")
    .select("id")
    .eq("id", formatId)
    .maybeSingle();

  if (readError) {
    console.error(
      `[catalogue.precheck_failed] setFormatListed read: ${readError.code ?? "unknown"} ${readError.message}`
    );
    return { ok: false, reason: "precheck_failed" };
  }
  if (!existing) return { ok: false, reason: "format_not_found" };

  const { error } = await client
    .from("formats")
    .update({ listed, updated_at: new Date().toISOString() })
    .eq("id", formatId);

  if (error) {
    console.error(
      `[catalogue.write_failed] setFormatListed ${formatId}: ${error.code ?? "unknown"} ${error.message}`
    );
    return { ok: false, reason: "write_failed" };
  }

  revalidatePath("/admin/formats");
  revalidatePath("/events");
  return { ok: true, id: formatId };
}

/**
 * Retire a format.
 *
 * **Retiring is not deleting** (D-36-10). It sets `retired_at` and rewrites
 * nothing that already happened: forward-looking surfaces filter
 * `retired_at IS NULL`, and the archive keeps rendering what a night actually
 * carried, because those nights went out under that name and the material
 * exists. No export in this module deletes a catalogue row, and the two
 * `ON DELETE RESTRICT` foreign keys make that absence structural rather than
 * remembered — deleting a format would orphan the nights that ran under it.
 *
 * It deliberately does **not** touch `listed`. Retirement and publication are
 * two switches that say different things
 * (`20260810120000_formats_and_series.sql:129-131`), and the chip row drops a
 * retired format on `retired_at IS NULL` regardless of the other one.
 *
 * It releases the format's colour, because `formats_color_active_unique` is
 * partial. That is intended, and it is the reason `restoreFormat` below can be
 * refused for a colour that was free when this ran.
 */
export async function retireFormat(formatId: string): Promise<CatalogueResult> {
  await assertCatalogueManage();
  const client = getServiceClient();

  if (typeof formatId !== "string" || !UUID_PATTERN.test(formatId)) {
    return { ok: false, reason: "invalid_id" };
  }

  const { data: existing, error: readError } = await client
    .from("formats")
    .select("id, retired_at")
    .eq("id", formatId)
    .maybeSingle();

  if (readError) {
    console.error(
      `[catalogue.precheck_failed] retireFormat read: ${readError.code ?? "unknown"} ${readError.message}`
    );
    return { ok: false, reason: "precheck_failed" };
  }
  if (!existing) return { ok: false, reason: "format_not_found" };
  if (existing.retired_at) return { ok: false, reason: "format_already_retired" };

  const now = new Date().toISOString();
  const { error } = await client
    .from("formats")
    .update({ retired_at: now, updated_at: now })
    .eq("id", formatId);

  if (error) {
    console.error(
      `[catalogue.write_failed] retireFormat ${formatId}: ${error.code ?? "unknown"} ${error.message}`
    );
    return { ok: false, reason: "write_failed" };
  }

  revalidatePath("/admin/formats");
  revalidatePath("/events");
  return { ok: true, id: formatId };
}

/**
 * Restore a retired format.
 *
 * **This is a separate act with its own confirmation, and not an undo.**
 * `production-calendar.md` holds that a retired sigla is not cited again — so
 * bringing a name back into circulation is a decision somebody takes, with the
 * same weight as the decision to retire it. A surface that offered it as an
 * "undo" beside the retire button would be describing it as a mistake being
 * corrected, which is a different thing.
 *
 * It can be refused for a colour: retiring released it, so another active format
 * may hold it now. That refusal is `color_taken`, and it is the reason this is
 * not a one-line inversion of `retireFormat`.
 */
export async function restoreFormat(formatId: string): Promise<CatalogueResult> {
  await assertCatalogueManage();
  const client = getServiceClient();

  if (typeof formatId !== "string" || !UUID_PATTERN.test(formatId)) {
    return { ok: false, reason: "invalid_id" };
  }

  const { data: existing, error: readError } = await client
    .from("formats")
    .select("id, color, retired_at")
    .eq("id", formatId)
    .maybeSingle();

  if (readError) {
    console.error(
      `[catalogue.precheck_failed] restoreFormat read: ${readError.code ?? "unknown"} ${readError.message}`
    );
    return { ok: false, reason: "precheck_failed" };
  }
  if (!existing) return { ok: false, reason: "format_not_found" };
  if (!existing.retired_at) return { ok: false, reason: "format_not_retired" };

  const colorTaken = await colorHeldByActiveFormat(client, existing.color, formatId);
  if (colorTaken === null) return { ok: false, reason: "precheck_failed" };
  if (colorTaken) return { ok: false, reason: "color_taken" };

  const { error } = await client
    .from("formats")
    .update({ retired_at: null, updated_at: new Date().toISOString() })
    .eq("id", formatId);

  if (error) {
    console.error(
      `[catalogue.write_failed] restoreFormat ${formatId}: ${error.code ?? "unknown"} ${error.message}`
    );
    if (error.code === UNIQUE_VIOLATION) {
      return {
        ok: false,
        reason: await classifyFormatDuplicate(client, null, existing.color, formatId),
      };
    }
    return { ok: false, reason: "write_failed" };
  }

  revalidatePath("/admin/formats");
  revalidatePath("/events");
  return { ok: true, id: formatId };
}

/* ────────────────────────────────────────────────────────────────────────────
 * public.party_series — WHICH RUN of a format a night belongs to
 * ────────────────────────────────────────────────────────────────────────── */

/** `null` means the read itself failed — never "no". */
async function seriesCodeHeldInFormat(
  client: ServiceClient,
  formatId: string,
  code: string,
  exceptId: string | null
): Promise<boolean | null> {
  let query = client
    .from("party_series")
    .select("id")
    .eq("format_id", formatId)
    .eq("code", code)
    .limit(1);

  if (exceptId) query = query.neq("id", exceptId);

  const { data, error } = await query;

  if (error) {
    console.error(
      `[catalogue.precheck_failed] series code lookup: ${error.code ?? "unknown"} ${error.message}`
    );
    return null;
  }

  return (data?.length ?? 0) > 0;
}

/**
 * The series half of `classifyFormatDuplicate` — same discipline, same reason:
 * the cause is decided by a read, never by looking for
 * `party_series_format_code_unique` inside a message string.
 */
async function classifySeriesDuplicate(
  client: ServiceClient,
  formatId: string,
  code: string,
  exceptId: string | null
): Promise<CatalogueRefusal> {
  const held = await seriesCodeHeldInFormat(client, formatId, code, exceptId);
  if (held) return "duplicate_series_code";
  return "duplicate_refused_by_database";
}

/**
 * Create a series under a format.
 *
 * ── The name, which is the one field in this phase that PUBLISHES ─────────────
 *
 * `party_series.name` is the string a visitor reads on **every night in the
 * series**, on every surface those nights touch. So a series named after a venue
 * publishes that venue every time one of its nights appears — and a venue that
 * has not been acquired in writing may not be named anywhere
 * (`venue-acquisition.md`; `brand-visual-system.md` repeats it).
 *
 * Two things stand behind that sentence and they are **not** the same thing:
 *
 *   · the helper text under the field (`36-UI-SPEC.md` § S5) is ADVICE — it tells
 *     a person before they type, which is the only moment the decision is still
 *     theirs;
 *   · the degradation in `36-UI-SPEC.md` § S2 is THE RULE — a card falls back to
 *     the format name alone when any night in the series is secret, whatever the
 *     operator typed.
 *
 * Neither replaces the other: advice that is ignored costs nothing because the
 * rule is structural, and a rule that fires silently teaches nobody, which is why
 * the advice exists.
 *
 * ── And there is deliberately NO validation of the name's content ─────────────
 *
 * No check here inspects a series name for venue-like content. There is no test
 * that could tell a venue from a word; a rejected string would teach the operator
 * to work around the check rather than to think about the question; and the § S2
 * fallback already holds the line structurally. A filter would buy the appearance
 * of a guarantee and spend the real one.
 */
export async function createSeries(
  formatId: string,
  name: string,
  code: string
): Promise<CatalogueResult> {
  // Asked ONCE, first, before any read. See `createFormat`.
  const { userId } = await assertCatalogueManage();
  const client = getServiceClient();

  if (typeof formatId !== "string" || !UUID_PATTERN.test(formatId)) {
    return { ok: false, reason: "invalid_id" };
  }

  const checkedName = checkName(name);
  if (!checkedName.ok) return checkedName;

  const checkedCode = checkCode(code);
  if (!checkedCode.ok) return checkedCode;

  const { data: format, error: formatError } = await client
    .from("formats")
    .select("id, retired_at")
    .eq("id", formatId)
    .maybeSingle();

  if (formatError) {
    console.error(
      `[catalogue.precheck_failed] createSeries format read: ${formatError.code ?? "unknown"} ${formatError.message}`
    );
    return { ok: false, reason: "precheck_failed" };
  }
  if (!format) return { ok: false, reason: "format_not_found" };

  // The only half there is. No constraint anywhere reads `formats.retired_at`,
  // so deleting this check opens the operation rather than moving it.
  if (format.retired_at) return { ok: false, reason: "format_retired" };

  const codeHeld = await seriesCodeHeldInFormat(client, formatId, checkedCode.value, null);
  if (codeHeld === null) return { ok: false, reason: "precheck_failed" };
  if (codeHeld) return { ok: false, reason: "duplicate_series_code" };

  const { data: created, error } = await client
    .from("party_series")
    .insert({
      format_id: formatId,
      name: checkedName.value,
      code: checkedCode.value,
      created_by: userId,
    })
    .select("id")
    .single();

  if (error || !created) {
    console.error(
      `[catalogue.write_failed] createSeries under ${formatId}: ${error?.code ?? "unknown"} ${error?.message ?? "no row returned"}`
    );
    if (error?.code === UNIQUE_VIOLATION) {
      return {
        ok: false,
        reason: await classifySeriesDuplicate(client, formatId, checkedCode.value, null),
      };
    }
    return { ok: false, reason: "write_failed" };
  }

  // `/admin/formats` only. A series with no nights is on no public surface at
  // all: `party_series_select_published` grants a read only THROUGH a published
  // night (`20260810120000_formats_and_series.sql` §4b), so there is nothing on
  // `/events` for this write to have changed.
  revalidatePath("/admin/formats");
  return { ok: true, id: created.id };
}

/**
 * Update a series' public name and code.
 *
 * ── It does NOT accept a format, and that is not an omission ──────────────────
 *
 * A series belongs to a format for its whole life. The database already refuses
 * the change: `event_parties_series_format_fk` is `ON UPDATE NO ACTION` (the
 * default), so repointing a series that already carries nights fails — and it
 * should, because moving it would rewrite what those nights were, which D-36-10
 * forbids.
 *
 * Refusing it **here**, by not offering the argument at all, is the other half.
 * The two do not substitute for each other, exactly as
 * `[id]/assignments/actions.ts:123-140` argues about its own pair: the constraint
 * keeps the contradiction from being stored, this signature means the operator
 * meets *"this series already has nights; its format does not change"* as a
 * property of the form instead of meeting a constraint name after pressing save.
 * And the database's half is CONDITIONAL — a series with no nights yet would be
 * repointed happily — so removing this one would open the operation for exactly
 * the rows where nobody would notice.
 */
export async function updateSeries(
  seriesId: string,
  name: string,
  code: string
): Promise<CatalogueResult> {
  await assertCatalogueManage();
  const client = getServiceClient();

  if (typeof seriesId !== "string" || !UUID_PATTERN.test(seriesId)) {
    return { ok: false, reason: "invalid_id" };
  }

  const checkedName = checkName(name);
  if (!checkedName.ok) return checkedName;

  const checkedCode = checkCode(code);
  if (!checkedCode.ok) return checkedCode;

  const { data: existing, error: readError } = await client
    .from("party_series")
    .select("id, format_id")
    .eq("id", seriesId)
    .maybeSingle();

  if (readError) {
    console.error(
      `[catalogue.precheck_failed] updateSeries read: ${readError.code ?? "unknown"} ${readError.message}`
    );
    return { ok: false, reason: "precheck_failed" };
  }
  if (!existing) return { ok: false, reason: "series_not_found" };

  const codeHeld = await seriesCodeHeldInFormat(
    client,
    existing.format_id,
    checkedCode.value,
    seriesId
  );
  if (codeHeld === null) return { ok: false, reason: "precheck_failed" };
  if (codeHeld) return { ok: false, reason: "duplicate_series_code" };

  const { error } = await client
    .from("party_series")
    .update({
      name: checkedName.value,
      code: checkedCode.value,
      updated_at: new Date().toISOString(),
    })
    .eq("id", seriesId);

  if (error) {
    console.error(
      `[catalogue.write_failed] updateSeries ${seriesId}: ${error.code ?? "unknown"} ${error.message}`
    );
    if (error.code === UNIQUE_VIOLATION) {
      return {
        ok: false,
        reason: await classifySeriesDuplicate(
          client,
          existing.format_id,
          checkedCode.value,
          seriesId
        ),
      };
    }
    return { ok: false, reason: "write_failed" };
  }

  revalidatePath("/admin/formats");
  // The public name travels to every published night in this series.
  revalidatePath("/events");
  return { ok: true, id: seriesId };
}

/**
 * Retire a series — the mirror of `retireFormat`, and the same rule.
 *
 * No delete. `event_parties.series_id` is `ON DELETE RESTRICT`, so a series that
 * carries nights cannot be removed at all, and a series that carries none would
 * still be a name somebody chose. Retirement stops new nights from being assigned
 * to it and rewrites nothing that already happened.
 */
export async function retireSeries(seriesId: string): Promise<CatalogueResult> {
  await assertCatalogueManage();
  const client = getServiceClient();

  if (typeof seriesId !== "string" || !UUID_PATTERN.test(seriesId)) {
    return { ok: false, reason: "invalid_id" };
  }

  const { data: existing, error: readError } = await client
    .from("party_series")
    .select("id, retired_at")
    .eq("id", seriesId)
    .maybeSingle();

  if (readError) {
    console.error(
      `[catalogue.precheck_failed] retireSeries read: ${readError.code ?? "unknown"} ${readError.message}`
    );
    return { ok: false, reason: "precheck_failed" };
  }
  if (!existing) return { ok: false, reason: "series_not_found" };
  if (existing.retired_at) return { ok: false, reason: "series_already_retired" };

  const now = new Date().toISOString();
  const { error } = await client
    .from("party_series")
    .update({ retired_at: now, updated_at: now })
    .eq("id", seriesId);

  if (error) {
    console.error(
      `[catalogue.write_failed] retireSeries ${seriesId}: ${error.code ?? "unknown"} ${error.message}`
    );
    return { ok: false, reason: "write_failed" };
  }

  // `/admin/formats` only, and the asymmetry with `retireFormat` is deliberate:
  // a retired FORMAT leaves the public chip row, which is a visitor-visible
  // change. A retired SERIES leaves no public surface — its published nights keep
  // rendering the name they ran under, because the archive is not rewritten
  // (D-36-10).
  revalidatePath("/admin/formats");
  return { ok: true, id: seriesId };
}

/**
 * Restore a retired series.
 *
 * A separate act with its own confirmation, for the reason written above
 * `restoreFormat`: a retired sigla is not cited again
 * (`production-calendar.md`), so bringing one back into circulation is a decision
 * and not an undo.
 *
 * Unlike `restoreFormat` this cannot be refused for a collision: a series holds
 * no colour, and `party_series_format_code_unique` is total, so its code was
 * never released by the retirement.
 */
export async function restoreSeries(seriesId: string): Promise<CatalogueResult> {
  await assertCatalogueManage();
  const client = getServiceClient();

  if (typeof seriesId !== "string" || !UUID_PATTERN.test(seriesId)) {
    return { ok: false, reason: "invalid_id" };
  }

  const { data: existing, error: readError } = await client
    .from("party_series")
    .select("id, retired_at")
    .eq("id", seriesId)
    .maybeSingle();

  if (readError) {
    console.error(
      `[catalogue.precheck_failed] restoreSeries read: ${readError.code ?? "unknown"} ${readError.message}`
    );
    return { ok: false, reason: "precheck_failed" };
  }
  if (!existing) return { ok: false, reason: "series_not_found" };
  if (!existing.retired_at) return { ok: false, reason: "series_not_retired" };

  const { error } = await client
    .from("party_series")
    .update({ retired_at: null, updated_at: new Date().toISOString() })
    .eq("id", seriesId);

  if (error) {
    console.error(
      `[catalogue.write_failed] restoreSeries ${seriesId}: ${error.code ?? "unknown"} ${error.message}`
    );
    return { ok: false, reason: "write_failed" };
  }

  revalidatePath("/admin/formats");
  return { ok: true, id: seriesId };
}
