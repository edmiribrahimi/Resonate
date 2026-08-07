"use server";

import { revalidatePath } from "next/cache";
import { getServiceClient } from "@/lib/supabase/service";
import { processGuestEntry } from "@/lib/guest-list/process-entry";
import { getPostHogServer } from "@/lib/posthog/server";
import {
  assertEventOwnership,
  assertStaffManage,
} from "@/lib/capabilities/guards";

/**
 * Verify the caller is an organizer or master who owns the event.
 * Returns the authenticated user's ID.
 *
 * ── What was deleted from this body, and why it mattered ─────────────────────
 *
 * It used to derive **both** the role and the identity from the two request
 * headers the proxy injects. Those are INBOUND headers: a client can send
 * whatever it likes, and only `src/lib/supabase/middleware.ts` may legitimately
 * set them, so every read elsewhere trusted a proxy that runs before rather
 * than a session. Both now come from `my_access_context()`, which is
 * `auth.uid()` and the caller's own grants, verified by Postgres.
 *
 * (The header names are deliberately not spelled here: the CAP-05 burn-down
 * meter, `npm run verify:no-header-identity`, counts comment-shaped mentions
 * toward its verdict on purpose, and a documentation line is not a reason to
 * keep a file on it.)
 *
 * **The identity is load-bearing, not convenient.** It is what `added_by`
 * records on a guest-list row. `ticketing-payments.md`, gate *guest list*: *«Un
 * ingresso in guest list e' un ingresso non pagato … Ogni percorso che aggiunge
 * nomi va tracciato con chi lo ha fatto.»* Under `ACCESS-MODEL-DECISIONS.md` §5
 * that attribution is a requirement, so it is narrowed to a non-null `string`
 * here, once, by an explicit throw — never by a `!` at the insert.
 *
 * ── The ownership read still uses the SERVICE client. Read this before ────────
 * ── "simplifying" it. ────────────────────────────────────────────────────────
 *
 * `getServiceClient()` bypasses every row-level policy. That is what this call
 * site has always used. The two sibling implementations
 * (`organizer/events/actions.ts`, `organizer/events/[id]/tickets/actions.ts`)
 * read the same column through the cookie client, where RLS applies. **They
 * agree today. They are not equivalent**, and they can disagree the moment the
 * `events` SELECT policy narrows — for a caller whose RLS would have refused
 * the read, the cookie client answers "no row" where the service client answers
 * the truth.
 *
 * `assertEventOwnership` takes the client as an argument precisely so that
 * difference is **one legible line here** rather than a third copy of the
 * function. Moving this to the cookie client is a real improvement with its own
 * evidence burden, and the evidence is one target out of two: the phase-32
 * **container** read matrix shows `organizer/approved`, `/pending` and
 * `/rejected` each reading **2 of 2** `events` rows through RLS, so the swap
 * would be equivalent there — but the **production** matrix leaves `organizer/*`
 * `resolved: false`, because no such account exists on that target, and the two
 * targets' `events` fixtures already differ (container `anon` reads 0,
 * production `anon` reads 2). Carried forward with that evidence attached, not
 * decided here. Criterion 4 asks that every role reach exactly the surfaces it
 * reached before; a client swap is not that change.
 *
 * ── Four failure categories, decided by POSITION ─────────────────────────────
 *
 *   `forbidden.staff_manage_required`      — assertStaffManage
 *   `capabilities.resolve_failed: …`       — the resolver, or no_subject below
 *   `forbidden.not_event_owner`            — assertEventOwnership
 *   `event.lookup_failed: <code>`          — assertEventOwnership, no answer
 *
 * Which one you got is decided by **which line threw**, never by parsing a
 * message. No `catch` here flattens them.
 *
 * ⚠️ `access-gating.md`, gate *service role*: a service client must never be
 * reachable from untrusted input. `eventId` **is** untrusted input — it arrives
 * from a client on a Server Action, which is a public POST endpoint. That is
 * exactly why this check exists, and it runs **before any write** at every call
 * site: verified by reading each one (`addGuest`, `removeGuest`,
 * `fetchGuestList`), where it is the first statement of the body.
 */
async function verifyOrganizerAccess(eventId: string): Promise<string> {
  const ctx = await assertStaffManage();

  if (!ctx.userId) {
    throw new Error("capabilities.resolve_failed: no_subject");
  }

  // The SERVICE client, deliberately and unchanged. See the note above.
  await assertEventOwnership(getServiceClient(), eventId, ctx);

  return ctx.userId;
}

/**
 * Add a guest to the event guest list.
 * If email is provided, the guest is auto-processed (registered/approved/ticketed/emailed).
 */
export async function addGuest(
  eventId: string,
  data: {
    first_name: string;
    last_name: string;
    email?: string;
    party_id?: string;
  }
) {
  try {
    const userId = await verifyOrganizerAccess(eventId);
    const serviceClient = getServiceClient();

    // Validate required fields
    const firstName = data.first_name?.trim();
    const lastName = data.last_name?.trim();
    if (!firstName || !lastName) {
      return { error: "First name and last name are required" };
    }

    // Normalize email
    let email: string | null = null;
    if (data.email) {
      email = data.email.trim().toLowerCase();
      // Basic email format validation
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return { error: "Invalid email format" };
      }
    }

    const partyId = data.party_id || null;

    // Insert into guest_list_entries
    const { data: entry, error: insertError } = await serviceClient
      .from("guest_list_entries")
      .insert({
        event_id: eventId,
        party_id: partyId,
        first_name: firstName,
        last_name: lastName,
        email,
        added_by: userId,
        status: "pending",
      })
      .select()
      .single();

    if (insertError) {
      // Handle unique constraint violation on (event_id, LOWER(email))
      if (
        insertError.code === "23505" ||
        insertError.message?.includes("duplicate") ||
        insertError.message?.includes("unique")
      ) {
        return { error: "This email is already on the guest list" };
      }
      return { error: `Failed to add guest: ${insertError.message}` };
    }

    // If email provided, auto-process the entry
    if (email) {
      // Fetch event details for the email template
      const { data: event } = await serviceClient
        .from("events")
        .select("title, date")
        .eq("id", eventId)
        .single();

      let partyTitle: string | undefined;
      let partyTime = "";
      if (partyId) {
        const { data: party } = await serviceClient
          .from("event_parties")
          .select("title, time")
          .eq("id", partyId)
          .single();
        partyTitle = party?.title;
        partyTime = party?.time || "";
      }

      // Process the entry (register user, create ticket, send email)
      await processGuestEntry(
        {
          id: entry.id,
          event_id: eventId,
          party_id: partyId,
          first_name: firstName,
          last_name: lastName,
          email,
        },
        {
          title: event?.title || "Event",
          date: event?.date || "",
          time: partyTime,
          partyTitle,
        }
      );
    }

    revalidatePath(`/organizer/events/${eventId}/guest-list`);

    const posthog = getPostHogServer();
    posthog.capture({
      distinctId: userId,
      event: "guest_list_add",
      properties: {
        event_id: eventId,
        has_email: !!email,
        party_id: partyId,
      },
    });

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { error: message };
  }
}

/**
 * Remove a guest from the guest list.
 * The ticket (if issued) remains valid -- only the guest list entry is removed.
 */
export async function removeGuest(entryId: string, eventId: string) {
  try {
    const userId = await verifyOrganizerAccess(eventId);
    const serviceClient = getServiceClient();

    // Fetch the entry to check if a ticket was issued
    const { data: entry } = await serviceClient
      .from("guest_list_entries")
      .select("ticket_id, event_id")
      .eq("id", entryId)
      .single();

    if (!entry) {
      return { error: "Guest list entry not found" };
    }

    const hadTicket = !!entry.ticket_id;

    // Delete the guest list entry
    const { error: deleteError } = await serviceClient
      .from("guest_list_entries")
      .delete()
      .eq("id", entryId);

    if (deleteError) {
      return { error: `Failed to remove guest: ${deleteError.message}` };
    }

    revalidatePath(`/organizer/events/${eventId}/guest-list`);

    const posthog = getPostHogServer();
    posthog.capture({
      distinctId: userId,
      event: "guest_list_remove",
      properties: {
        event_id: eventId,
        had_ticket: hadTicket,
      },
    });

    return { success: true, hadTicket };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { error: message };
  }
}

/**
 * Fetch guest list entries for an event (used by the page server component).
 *
 * ⚠️ **The gate below was ADDED, and it is a behaviour change — declared, not
 * slipped in.** This function is exported from a `"use server"` module, which
 * makes it a public POST endpoint with a convenient signature, not a private
 * helper of the page that imports it (`nextjs-architecture.md`, gate *server
 * action autorizzata*: being imported by a protected page does not protect it).
 * It took an attacker-chosen `eventId` straight to a **service client**, which
 * bypasses every row-level policy, and returned every guest's first name, last
 * name and email address. Any authenticated caller could read any event's guest
 * list. `access-gating.md`, gate *service role*, forbids exactly that reach.
 *
 * Who is refused now who was not before: everyone without `staff.manage`, and
 * any organizer who does not own the event. Nobody legitimate — both real
 * callers are staff surfaces (`organizer/…/guest-list/page.tsx` and
 * `admin/…/guest-list/page.tsx`), whose users hold `staff.manage` and either own
 * the event or are master. The change moves the guard in the harder-to-trip
 * direction only, which is the sole direction `meta-gates.md` permits without
 * explicit authorisation.
 *
 * It costs nothing on the page: `cache()` DOES memoise within one render, so
 * this shares the round trip with the page's own resolution. (It would not, in
 * a Server Action body — see `@/lib/capabilities/server`.)
 *
 * A refusal here throws rather than returning `[]`. An empty guest list and a
 * refused read must not look the same: this project has no error tracking, and
 * a list that silently renders empty is the recorded newsletter defect with a
 * different face. The `console.error` + `return []` below is the *lookup*
 * failure path and is pre-existing; it is flagged in the summary, not widened.
 */
export async function fetchGuestList(eventId: string) {
  await verifyOrganizerAccess(eventId);

  const serviceClient = getServiceClient();

  const { data: entries, error } = await serviceClient
    .from("guest_list_entries")
    .select("*")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch guest list:", error);
    return [];
  }

  return entries ?? [];
}
