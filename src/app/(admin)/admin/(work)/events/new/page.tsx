import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getAccessContext } from "@/lib/capabilities/server";
import { CAP } from "@/lib/capabilities/keys";
import EventForm from "@/components/events/EventForm";
import { createEvent } from "@/app/(admin)/admin/events/actions";
import { PageShell } from "@/components/ui/PageShell";
import { PageTitle } from "@/components/ui/Typography";
import { Chip } from "@/components/ui/Chip";

/**
 * The single event-creation form, where `/admin/events/new` and
 * `/organizer/events/new` were two (D-34-05).
 *
 * The guard is `organizer.access` — the key `CAPABILITY_ROUTES` binds
 * `/admin/events/new` to (`src/lib/routes/capability-routes.ts:255`), so this
 * page and the middleware read one declaration (D-34-09). It replaces the
 * `/admin` version's `admin.access` because the address's binding moved, not
 * because this page decided to admit anyone new: an organizer already reached
 * this exact form at `/organizer/events/new`.
 *
 * Reaching the form is not permission to create an event. `createEvent` is a
 * Server Action, therefore its own public entry point, and re-asks its own
 * question inside itself — which is why `actions.ts` stays outside `(work)`
 * (R-WORK-ROUTES) and is imported by absolute specifier from here.
 *
 * Both navs and the two `UserRole` / `UserStatus` casts are `(work)/layout.tsx`'s.
 *
 * ── The catalogue read, and the filter it deliberately does not apply ────────
 *
 * The formats query does **not** filter on `listed`, and that is a decision, not
 * an omission. `listed` and `retired_at` are different axes: `retired_at` says
 * NO NEW NIGHT MAY BE ASSIGNED TO THIS, `listed` says A PERSON HAS DECIDED THIS
 * MAY BE SEEN. A format must be assignable to a night **before** it is
 * announced, which is the entire point of the separation D-36-17 introduced —
 * so filtering the select on `listed` would make a format unusable until the
 * moment it becomes public, which is the opposite of what it is for.
 *
 * The read uses the COOKIE client on purpose, so the caller's own capabilities
 * decide what comes back: `formats_select_listed` admits the listed rows to
 * everyone and `formats_select_catalogue_manage` admits everything to a holder
 * of `catalogue.manage`. An organizer who holds that key therefore sees the
 * unlisted formats in the select, which is correct. `retired_at IS NULL` IS
 * filtered here, because every night this page creates is new and none of them
 * can already carry a retired format — the edit page, where one can, filters it
 * differently and says so.
 */
export default async function NewEventPage() {
  const { capabilities } = await getAccessContext();

  if (!capabilities.has(CAP.ORGANIZER_ACCESS)) {
    redirect("/dashboard");
  }

  const supabase = await createClient();

  const [{ data: formats, error: formatsError }, { data: series, error: seriesError }] =
    await Promise.all([
      supabase
        .from("formats")
        .select("id, name, color, retired_at")
        .is("retired_at", null)
        .order("sort_order", { ascending: true }),
      supabase
        .from("party_series")
        .select("id, format_id, name, highest_assigned")
        .order("name", { ascending: true }),
    ]);

  // A failed catalogue read does NOT render a form with empty selects.
  //
  // `/events` turns a failed read into an empty list (`page.tsx:135-139`) and
  // `meta-gates.md` names that shape as the one not to repeat: here it would let
  // somebody fill in a whole event, save it, and receive an unexplained refusal
  // from a `NOT NULL` column. An empty dropdown and a healthy one look the same.
  if (formatsError || seriesError) {
    console.error(
      `[events.catalogue_read_failed] formats=${formatsError?.code ?? "ok"} ` +
        `series=${seriesError?.code ?? "ok"}`
    );
    return (
      /*
        `default` and not `wide`: §4's wide list is closed and does not name this
        route, and default is not a fallback — it is the answer for every surface
        nobody had to argue about. The refusal branch takes the same width as the
        branch it replaces, so the page does not change measure on failing.
      */
      <PageShell width="default">
        <header className="mb-6">
          <PageTitle>Create Event</PageTitle>
        </header>
        {/*
          §3.6's refusal region, and `meta-gates.md`'s zero-silent-failures rule.
          `role="alert"` is the contract rather than a nicety: with no error
          tracking in this project, a refusal nobody is looking at is a refusal
          nobody ever reads. The sentence names its own cause and is not
          collapsed into a generic one.
        */}
        <div
          role="alert"
          className="rounded-2xl border border-sem-crit/30 bg-sem-crit/10 p-4"
        >
          <p className="text-sm text-sem-crit">
            The list of formats and series could not be loaded, so this form cannot be
            shown: a night cannot be saved without a format and a series. Reload the
            page — if it keeps failing, the catalogue is unreachable and creating an
            event will not work until it is back.
          </p>
        </div>
        {/*
          A chip and not a button with an address (D-41.1-26): this is internal
          navigation, and the chip is the generic that carries the finger target
          and the focus expression without a control's semantics.
        */}
        <div className="mt-4">
          <Chip href="/admin/events">Back to Events</Chip>
        </div>
      </PageShell>
    );
  }

  return (
    /*
      `default` — see the refusal branch above for the reason. The shell owns the
      maximum, the gutter, the vertical rhythm and the navigation clearance in
      both tiers, so this page writes none of them: the hand-written bottom
      clearance it used to carry was the phone number only, and from 768px up the
      navigation leaves the bottom edge entirely.
    */
    <PageShell width="default">
      <header className="mb-6">
        {/*
          The back link keeps its glyph and its words; what changed is that it is
          now a finger target rather than a line of text one has to hit exactly.
          It is navigation and is reversible in one press, so D-41.1-31 does not
          bite — but the growth is named in the SUMMARY rather than left silent.
        */}
        <Link
          href="/admin/events"
          className="mb-4 inline-flex min-h-11 items-center gap-1 text-sm text-muted transition-colors hover:text-ink"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 19.5L8.25 12l7.5-7.5"
            />
          </svg>
          Back to Events
        </Link>
        <PageTitle>Create Event</PageTitle>
      </header>

      <EventForm
        formats={formats ?? []}
        series={series ?? []}
        action={createEvent}
        submitLabel="Create Event"
      />
    </PageShell>
  );
}
