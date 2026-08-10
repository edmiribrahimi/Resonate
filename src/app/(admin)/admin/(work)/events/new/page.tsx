import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getAccessContext } from "@/lib/capabilities/server";
import { CAP } from "@/lib/capabilities/keys";
import EventForm from "@/components/events/EventForm";
import { createEvent } from "@/app/(admin)/admin/events/actions";

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
      <div className="min-h-dvh pb-24">
        <header className="px-6 pt-12 pb-6">
          <h1 className="text-3xl font-bold tracking-tight">Create Event</h1>
        </header>
        <div className="px-6">
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4">
            <p className="text-sm text-red-400">
              The list of formats and series could not be loaded, so this form cannot be
              shown: a night cannot be saved without a format and a series. Reload the
              page — if it keeps failing, the catalogue is unreachable and creating an
              event will not work until it is back.
            </p>
          </div>
          <Link
            href="/admin/events"
            className="inline-flex items-center gap-2 rounded-xl border border-card-border bg-card px-4 py-3 text-sm font-medium text-foreground hover:border-accent/50 transition-colors mt-4"
          >
            Back to Events
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh pb-24">
      <header className="px-6 pt-12 pb-6">
        <Link
          href="/admin/events"
          className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground transition-colors mb-4"
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
        <h1 className="text-3xl font-bold tracking-tight">Create Event</h1>
      </header>

      <div className="px-6">
        <EventForm
          formats={formats ?? []}
          series={series ?? []}
          action={createEvent}
          submitLabel="Create Event"
        />
      </div>
    </div>
  );
}
