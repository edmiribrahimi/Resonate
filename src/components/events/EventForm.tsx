"use client";

import { useState, useRef, useCallback, type FormEvent, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AutocompleteTagInput from "@/components/events/AutocompleteTagInput";
import AutocompleteInput, { type AutocompleteOption } from "@/components/ui/AutocompleteInput";
import CreateArtistModal from "@/components/artists/CreateArtistModal";
import VenueProfilePrompt from "@/components/venues/VenueProfilePrompt";
import CreateVenueModal from "@/components/venues/CreateVenueModal";
import { searchArtists } from "@/app/(admin)/admin/artists/actions";
import { searchVenues, checkVenueExists } from "@/app/(admin)/admin/venues/actions";
import type { NightRefusal } from "@/app/(admin)/admin/events/actions";
import type { AccessType } from "@/types/database";

/**
 * The catalogue rows the two pages hand this form.
 *
 * `color` is carried even though a native `<option>` cannot render a swatch —
 * see `renderCatalogueFields` — so that the surfaces which can (S2, S3, S5)
 * take it from the same prop rather than from a constant in the code (D-36-12).
 */
export interface FormatOption {
  id: string;
  name: string;
  color: string;
  retired_at: string | null;
}

export interface SeriesOption {
  id: string;
  format_id: string;
  name: string;
  /**
   * A WATER LEVEL, not a count of nights.
   *
   * The database raises it with `GREATEST` through a trigger, so it never falls
   * — which is the whole reason the suggestion reads it. `updateEvent` really
   * deletes the nights removed from the form, so a suggestion derived from the
   * highest stored number, or from how many nights a series has, would
   * re-propose a number that is already on a poster; a progressivo assigned is
   * appended, never renumbered (`meta-gates.md`, guardie monotone).
   */
  highest_assigned: number;
}

/**
 * The one place the stored-not-recalculated contract is stated to the person
 * typing.
 *
 * A constant and not two copies: the field is rendered on the per-night block
 * AND on the single-night Event Details block, and the two must not be able to
 * drift into saying different things about the same rule. Verbatim from the
 * copywriting contract of `36-UI-SPEC.md` §S4 — it is the contract, not
 * decoration, and it is not to be dropped as such.
 */
const SERIES_NUMBER_HELP =
  "Suggested from the last number in this series. What you save is stored as written and never recalculated — moving or deleting a night does not renumber the others.";

interface SubEventFormState {
  id?: string;
  title: string;
  description: string;
  date: string;
  time: string;
  end_time: string;
  menu_closes_at: string;
  venue_text: string;
  venue_id: string | null;
  venue_name: string;
  lineup: string[];
  venue_secret: boolean;
  venue_secret_hint: string;
  venue_reveal_hours: string;
  venue_reveal_on_purchase: boolean;
  access_type: AccessType;
  capacity: string;
  sort_order: number;
  format_id: string;
  series_id: string;
  /** Held as a string, the convention this file already uses for numbers in form state. */
  number: string;
}

function defaultSubEvent(sortOrder: number): SubEventFormState {
  return {
    title: "",
    description: "",
    date: "",
    time: "",
    end_time: "",
    menu_closes_at: "",
    venue_text: "",
    venue_id: null,
    venue_name: "",
    lineup: [],
    venue_secret: false,
    venue_secret_hint: "",
    venue_reveal_hours: "",
    venue_reveal_on_purchase: true,
    access_type: "paid",
    capacity: "",
    sort_order: sortOrder,
    format_id: "",
    series_id: "",
    number: "",
  };
}

export interface PartyInitialData {
  id?: string;
  title: string;
  description: string | null;
  date: string;
  time: string;
  end_time: string | null;
  menu_closes_at: string | null;
  venue_text: string | null;
  venue_id: string | null;
  venue_name: string | null;
  lineup: string[];
  venue_secret: boolean;
  venue_secret_hint: string | null;
  venue_reveal_hours: number | null;
  venue_reveal_on_purchase: boolean;
  access_type: AccessType;
  capacity: number | null;
  sort_order: number;
  format_id: string | null;
  series_id: string | null;
  /**
   * `number | null` and not `number`: a night that is the ACT of another night
   * carries that night's format and series and no number of its own, and one
   * such row exists in production (36-06, §9a of the migration).
   */
  number: number | null;
}

interface EventFormProps {
  initialData?: {
    id: string;
    title: string;
    description: string;
    date: string;
    venue_secret: boolean;
    lineup: string[];
    cover_image: string | null;
    is_published: boolean;
    parties: PartyInitialData[];
  };
  /** The assignable catalogue, read by the page with the caller's own client. */
  formats: FormatOption[];
  series: SeriesOption[];
  action: (
    formData: FormData
  ) => Promise<{
    success: boolean;
    id?: string;
    error?: string;
    refusal?: NightRefusal;
  }>;
  submitLabel: string;
}

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

const ACCESS_TYPE_LABELS: Record<AccessType, string> = {
  free_public: "Free (Open to all)",
  free_rsvp: "Free (RSVP required)",
  paid: "Paid (Tickets)",
};

function subEventFromInitial(p: PartyInitialData): SubEventFormState {
  return {
    id: p.id,
    title: p.title,
    description: p.description ?? "",
    date: p.date,
    time: p.time,
    end_time: p.end_time ?? "",
    menu_closes_at: p.menu_closes_at ?? "",
    venue_text: p.venue_text ?? "",
    venue_id: p.venue_id ?? null,
    venue_name: p.venue_name ?? "",
    lineup: p.lineup ?? [],
    venue_secret: p.venue_secret ?? false,
    venue_secret_hint: p.venue_secret_hint ?? "",
    venue_reveal_hours: p.venue_reveal_hours?.toString() ?? "",
    venue_reveal_on_purchase: p.venue_reveal_on_purchase ?? true,
    access_type: p.access_type,
    capacity: p.capacity?.toString() ?? "",
    sort_order: p.sort_order,
    format_id: p.format_id ?? "",
    series_id: p.series_id ?? "",
    number: p.number?.toString() ?? "",
  };
}

export default function EventForm({
  initialData,
  formats,
  series,
  action,
  submitLabel,
}: EventFormProps) {
  const router = useRouter();

  // Form state
  const [title, setTitle] = useState(initialData?.title ?? "");
  const [description, setDescription] = useState(
    initialData?.description ?? ""
  );
  const [venueSecret, setVenueSecret] = useState(
    initialData?.venue_secret ?? false
  );
  const [mainVenueSecretHint, setMainVenueSecretHint] = useState(
    initialData?.parties?.[0]?.venue_secret_hint ?? ""
  );
  const [mainVenueRevealHours, setMainVenueRevealHours] = useState(
    initialData?.parties?.[0]?.venue_reveal_hours?.toString() ?? ""
  );
  const [mainVenueRevealOnPurchase, setMainVenueRevealOnPurchase] = useState(
    initialData?.parties?.[0]?.venue_reveal_on_purchase ?? true
  );
  const [lineup, setLineup] = useState<string[]>(initialData?.lineup ?? []);

  // Artist modal state
  const [pendingArtistName, setPendingArtistName] = useState<string | null>(null);
  const [showArtistModal, setShowArtistModal] = useState(false);

  // Venue profile prompt state
  const [pendingVenueIndex, setPendingVenueIndex] = useState<number | null>(null);
  const [pendingVenueName, setPendingVenueName] = useState<string | null>(null);
  const [showVenueModal, setShowVenueModal] = useState(false);
  const [skippedVenues, setSkippedVenues] = useState<Set<string>>(new Set());

  // Autocomplete search wrappers
  const searchArtistsWrapped = useCallback(
    async (query: string) => {
      const results = await searchArtists(query);
      return results.map((a) => ({ id: a.id, name: a.name, slug: a.slug }));
    },
    []
  );

  const searchVenuesWrapped = useCallback(
    async (query: string) => {
      const results = await searchVenues(query);
      return results.map((v) => ({ id: v.id, name: v.name, detail: v.address }));
    },
    []
  );

  function handleCreateNewArtist(name: string) {
    setPendingArtistName(name);
    setShowArtistModal(true);
  }

  async function handleVenueNameBlur(index: number, venueName: string) {
    const trimmed = venueName.trim();
    if (!trimmed) return;
    if (skippedVenues.has(trimmed.toLowerCase())) return;

    try {
      const result = await checkVenueExists(trimmed);
      if (index === -1) {
        if (result.exists && result.id) {
          setMainVenueId(result.id);
          setMainVenueName(trimmed);
        } else {
          setPendingVenueIndex(-1);
          setPendingVenueName(trimmed);
        }
      } else if (result.exists && result.id) {
        setSubEvents((prev) =>
          prev.map((se, i) =>
            i === index ? { ...se, venue_id: result.id, venue_name: trimmed } : se
          )
        );
      } else {
        setPendingVenueIndex(index);
        setPendingVenueName(trimmed);
      }
    } catch {
      // Silently fail
    }
  }

  // Determine if the single party represents the main event (not a sub-event)
  const singleParty = initialData?.parties?.length === 1 ? initialData.parties[0] : null;
  const isMainEventParty = singleParty !== null;

  // Main event fields (used when no sub-events)
  const [date, setDate] = useState(initialData?.date ?? "");
  const [mainTime, setMainTime] = useState(
    isMainEventParty ? singleParty.time : ""
  );
  const [mainEndTime, setMainEndTime] = useState(
    isMainEventParty ? (singleParty.end_time ?? "") : ""
  );
  const [mainMenuClosesAt, setMainMenuClosesAt] = useState(
    isMainEventParty ? (singleParty.menu_closes_at ?? "") : ""
  );
  const [mainVenueName, setMainVenueName] = useState(
    isMainEventParty ? (singleParty.venue_name ?? "") : ""
  );
  const [mainVenueId, setMainVenueId] = useState<string | null>(
    isMainEventParty ? (singleParty.venue_id ?? null) : null
  );
  const [mainVenueText, setMainVenueText] = useState(
    isMainEventParty ? (singleParty.venue_text ?? "") : ""
  );
  const [mainAccessType, setMainAccessType] = useState<AccessType>(
    isMainEventParty ? singleParty.access_type : "paid"
  );
  const [mainCapacity, setMainCapacity] = useState(
    isMainEventParty && singleParty.capacity ? singleParty.capacity.toString() : ""
  );

  // Format, series and number for the single-night path. The Event Details
  // block writes a row of `event_parties` exactly as a sub-event block does, and
  // both `format_id` and `series_id` are NOT NULL — a night saved from here
  // without them would be refused by the database with nothing on screen
  // explaining why.
  const [mainFormatId, setMainFormatId] = useState(
    isMainEventParty ? (singleParty.format_id ?? "") : ""
  );
  const [mainSeriesId, setMainSeriesId] = useState(
    isMainEventParty ? (singleParty.series_id ?? "") : ""
  );
  const [mainNumber, setMainNumber] = useState(
    isMainEventParty ? (singleParty.number?.toString() ?? "") : ""
  );

  // Sub-events state: 1 party = main event, 2+ parties = sub-events
  const initialSubEvents = initialData?.parties && initialData.parties.length > 1
    ? initialData.parties.map(subEventFromInitial)
    : [];

  const [subEvents, setSubEvents] = useState<SubEventFormState[]>(initialSubEvents);

  function addSubEvent() {
    // Transition: clear event-level lineup/venueSecret when adding first sub-event
    if (subEvents.length === 0) {
      setLineup([]);
      setVenueSecret(false);
    }
    setSubEvents((prev) => [...prev, defaultSubEvent(prev.length)]);
  }

  function removeSubEvent(index: number) {
    setSubEvents((prev) => prev.filter((_, i) => i !== index));
  }

  function updateSubEvent(index: number, field: keyof SubEventFormState, value: string) {
    setSubEvents((prev) =>
      prev.map((se, i) => (i === index ? { ...se, [field]: value } : se))
    );
  }

  // Image state
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(
    initialData?.cover_image ?? null
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);

  /**
   * The named refusal of the last save, kept apart from `error`.
   *
   * `error` is the sentence at the top of the form; this is the CATEGORY, and
   * it is what lets the duplicate-number refusal be attached to the night and
   * the field that caused it. It arrives as a returned value and never as the
   * message of a thrown error, because Next redacts those in a production build
   * (`src/lib/capabilities/server.ts:59-63`).
   */
  const [refusal, setRefusal] = useState<NightRefusal | null>(null);

  const seriesById = new Map(series.map((s) => [s.id, s]));

  /**
   * The refusal sentence, upgraded with the series' own NAME where the action
   * could only carry an id. Three different failures — a network failure, a
   * permission refusal and a duplicate number — produce three different
   * sentences on this form; there is no shared "something went wrong".
   */
  function refusalSentence(r: NightRefusal): string {
    if (r.kind === "duplicate_number") {
      const seriesName = r.seriesId ? seriesById.get(r.seriesId)?.name : undefined;
      if (r.number !== null && seriesName) {
        return `Number ${r.number} is already assigned in ${seriesName}. Pick another.`;
      }
      if (r.number !== null) {
        return `Number ${r.number} is already assigned in this series. Pick another.`;
      }
      return "One of these nights carries a number already assigned in its series. Pick another.";
    }
    if (r.kind === "number_not_positive") {
      return "A series number must be a whole number of 1 or more.";
    }
    return "";
  }

  /** True when the last refusal was about THIS night's number field. */
  function numberRefusalFor(sortOrder: number): string | null {
    if (!refusal) return null;
    if (refusal.kind !== "duplicate_number" && refusal.kind !== "number_not_positive") {
      return null;
    }
    if (refusal.sortOrder !== sortOrder) return null;
    return refusalSentence(refusal) || null;
  }

  function handleImageChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setImageError(null);

    if (!file) {
      if (!initialData?.cover_image) {
        setImageFile(null);
        setImagePreview(null);
      }
      return;
    }

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setImageError("Only JPEG, PNG, and WebP images are allowed.");
      e.target.value = "";
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      setImageError("Image must be less than 5MB.");
      e.target.value = "";
      return;
    }

    setImageFile(file);
    const url = URL.createObjectURL(file);
    setImagePreview(url);
  }

  function clearImage() {
    setImageFile(null);
    setImagePreview(null);
    setImageError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function uploadImage(file: File): Promise<string> {
    const supabase = createClient();
    const timestamp = Date.now();
    const sanitized = file.name
      .replace(/[^a-zA-Z0-9._-]/g, "-")
      .toLowerCase();
    const path = `covers/${timestamp}-${sanitized}`;

    const { error: uploadError } = await supabase.storage
      .from("event-images")
      .upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`Image upload failed: ${uploadError.message}`);
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("event-images").getPublicUrl(path);

    return publicUrl;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setRefusal(null);
    setIsSubmitting(true);

    try {
      let coverImageUrl = initialData?.cover_image ?? null;
      if (imageFile) {
        coverImageUrl = await uploadImage(imageFile);
      } else if (!imagePreview) {
        coverImageUrl = null;
      }

      let partiesPayload: Record<string, unknown>[];
      let eventLineup: string[];
      let eventVenueSecret: boolean;

      if (subEvents.length > 0) {
        partiesPayload = subEvents.map((se, index) => ({
          id: se.id || undefined,
          title: se.title || title,
          description: se.description || undefined,
          date: se.date,
          time: se.time,
          end_time: se.end_time || undefined,
          menu_closes_at: se.menu_closes_at || undefined,
          venue_text: se.venue_text || undefined,
          venue_id: se.venue_id || undefined,
          lineup: se.lineup,
          venue_secret: se.venue_secret,
          venue_secret_hint: se.venue_secret ? (se.venue_secret_hint || undefined) : undefined,
          venue_reveal_hours: se.venue_secret && se.venue_reveal_hours ? parseInt(se.venue_reveal_hours, 10) : undefined,
          venue_reveal_on_purchase: se.venue_secret ? se.venue_reveal_on_purchase : true,
          access_type: se.access_type,
          capacity: se.capacity ? parseInt(se.capacity, 10) : null,
          sort_order: index,
          format_id: se.format_id,
          series_id: se.series_id,
          // An empty field is the real state "this night has no number of its
          // own" (§9a), so it travels as null and is not coerced to 0.
          number: se.number ? parseInt(se.number, 10) : null,
        }));
        // Aggregated values for event level
        const allLineup = new Set<string>();
        let anySecret = false;
        for (const se of subEvents) {
          for (const a of se.lineup) allLineup.add(a);
          if (se.venue_secret) anySecret = true;
        }
        eventLineup = [...allLineup];
        eventVenueSecret = anySecret;
      } else if (mainTime) {
        // Preserve the existing party id when editing a single-party event
        const existingPartyId = isMainEventParty ? singleParty.id : undefined;
        partiesPayload = [{
          id: existingPartyId,
          title: title,
          date: date,
          time: mainTime,
          end_time: mainEndTime || undefined,
          menu_closes_at: mainMenuClosesAt || undefined,
          venue_text: mainVenueText || undefined,
          venue_id: mainVenueId || undefined,
          lineup: lineup,
          venue_secret: venueSecret,
          venue_secret_hint: venueSecret ? (mainVenueSecretHint || undefined) : undefined,
          venue_reveal_hours: venueSecret && mainVenueRevealHours ? parseInt(mainVenueRevealHours, 10) : undefined,
          venue_reveal_on_purchase: venueSecret ? mainVenueRevealOnPurchase : true,
          access_type: mainAccessType,
          capacity: mainCapacity ? parseInt(mainCapacity, 10) : null,
          sort_order: 0,
          format_id: mainFormatId,
          series_id: mainSeriesId,
          number: mainNumber ? parseInt(mainNumber, 10) : null,
        }];
        eventLineup = lineup;
        eventVenueSecret = venueSecret;
      } else {
        partiesPayload = [];
        eventLineup = lineup;
        eventVenueSecret = venueSecret;
      }

      const formData = new FormData();
      formData.set("title", title);
      formData.set("description", description);
      formData.set("date", date);
      formData.set("venue_secret", eventVenueSecret ? "true" : "false");
      formData.set("lineup", JSON.stringify(eventLineup));
      formData.set("cover_image", coverImageUrl ?? "");
      formData.set("parties", JSON.stringify(partiesPayload));

      const result = await action(formData);

      if (result.success) {
        // The collapsed events surface. This was `/organizer/events` until plan
        // 34-11 merged the two lists into one address; that page no longer
        // exists, so `typedRoutes` refuses the old literal — which is how this
        // line was found, since no grep on a module path can see an address.
        // Not left to the redirect table on purpose: this is the destination
        // after creating or editing an event, and D-34-15 flips those redirects
        // to a 308 the browser caches and does not come back from.
        router.push("/admin/events");
      } else {
        // The category first, so the sentence can be attached to the night and
        // the field that caused it; the top-of-form sentence second. A refused
        // save that arrived with no reason at all says exactly that instead of
        // collapsing into a shared "something went wrong" — the newsletter form
        // is the recorded precedent not to repeat (`meta-gates.md`).
        setRefusal(result.refusal ?? null);
        setError(
          result.error ??
            "The save was refused and no reason travelled back. Reload the page and try again."
        );
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function renderVenueSecretToggle(
    value: boolean,
    onToggle: () => void,
    label?: string
  ) {
    return (
      <div className="flex items-center justify-between rounded-xl border border-card-border bg-card px-4 py-3">
        <div>
          <p className="text-sm font-medium text-foreground">
            {label ?? "Secret Venue"}
          </p>
          {value && (
            <p className="text-xs text-muted mt-0.5">
              Venue will be hidden until members purchase a ticket or a configurable time before event
            </p>
          )}
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={value}
          onClick={onToggle}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-accent/50 focus:ring-offset-2 focus:ring-offset-background ${
            value ? "bg-accent" : "bg-card-border"
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
              value ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>
    );
  }

  /**
   * Format, series and number — the three fields, rendered once and used by
   * both the per-night block and the single-night Event Details block.
   *
   * ── Why one function and not two copies ──────────────────────────────────
   *
   * Both blocks write a row of `event_parties`. A field added to one and
   * forgotten on the other is the same class of defect as a field added to one
   * of the three parallel shapes above: the value silently never reaches the
   * action, and the database refuses a `NOT NULL` column with nothing on screen
   * to explain it.
   *
   * ── Why no swatch here ───────────────────────────────────────────────────
   *
   * A native `<option>` renders text and nothing else, so `FormatMarker` — the
   * one component that draws a format's colour — cannot be mounted inside this
   * select. The name alone is the accessible content (`36-UI-SPEC.md` §S4), and
   * the colour reaches the surfaces that can draw it through the same prop this
   * one reads. No colour constant is introduced here to compensate (D-36-12).
   */
  function renderCatalogueFields(opts: {
    idPrefix: string;
    sortOrder: number;
    formatId: string;
    seriesId: string;
    number: string;
    required: boolean;
    onChange: (patch: {
      format_id?: string;
      series_id?: string;
      number?: string;
    }) => void;
  }) {
    const { idPrefix, sortOrder, formatId, seriesId, number, required, onChange } = opts;

    // Active formats — plus, and ONLY, the retired one this night already
    // carries. Without that exception, merely opening the edit form and saving
    // would silently reassign an archived night, and archived nights are not
    // rewritten (D-36-10). The select's job is to be able to display the truth;
    // refusing a *change to* a retired format is the action's job.
    const formatOptions = formats.filter(
      (f) => f.retired_at === null || f.id === formatId
    );
    const carriedFormatIsRetired = formats.some(
      (f) => f.id === formatId && f.retired_at !== null
    );

    // Never typed text. A venue spelled two slightly different ways would
    // silently start a second numbering from 1, which is the whole reason a
    // series is a catalogue row and not a string on the night (D-36-05).
    const seriesOptions = series.filter((s) => s.format_id === formatId);

    // ── The row this caller cannot READ ──────────────────────────────────────
    //
    // The catalogue arrives through the cookie client, so an organizer who does
    // not hold `catalogue.manage` sees the listed formats and no others. A night
    // recorded under an UNLISTED format would therefore reach a select that does
    // not contain it, the control would fall back to the placeholder, and saving
    // would reassign the night to whatever was picked instead — the same silent
    // data loss the retired exception exists to prevent, arriving down a
    // different road.
    //
    // The id is kept as its own option so the value round-trips unchanged. No
    // name is invented for it: this form does not know one, and `updateEvent`
    // admits it precisely because the night already carries it.
    const carriedFormatIsUnreadable =
      formatId !== "" && !formats.some((f) => f.id === formatId);
    const carriedSeriesIsUnreadable =
      seriesId !== "" && !series.some((s) => s.id === seriesId);

    const numberError = numberRefusalFor(sortOrder);
    const helpId = `${idPrefix}-number-help`;
    const errorId = `${idPrefix}-number-error`;

    return (
      <>
        {/* Format */}
        <div className="space-y-2">
          <label
            htmlFor={`${idPrefix}-format`}
            className="block text-sm font-medium text-foreground"
          >
            Format {required && <span className="text-red-400">*</span>}
          </label>
          <select
            id={`${idPrefix}-format`}
            value={formatId}
            required={required}
            onChange={(e) =>
              // Changing the format clears the series AND the number: a series
              // belongs to exactly one format, so keeping either would leave a
              // pair the composite key refuses to store.
              onChange({ format_id: e.target.value, series_id: "", number: "" })
            }
            className="w-full rounded-xl border border-card-border bg-background px-4 py-3 text-foreground normal-case outline-none focus:ring-1 focus:ring-accent/50"
          >
            <option value="">Choose a format…</option>
            {carriedFormatIsUnreadable && (
              <option value={formatId}>
                This night&apos;s format (not one you can see)
              </option>
            )}
            {formatOptions.map((f) => (
              <option key={f.id} value={f.id}>
                {f.retired_at !== null ? `${f.name} (retired)` : f.name}
              </option>
            ))}
          </select>
          {carriedFormatIsRetired && (
            <p className="text-xs text-muted">
              This night was recorded under a retired format and keeps it. Pick another
              format only if you mean to move the night.
            </p>
          )}
          {carriedFormatIsUnreadable && (
            <p className="text-xs text-muted">
              This night carries a format your account cannot see. It is kept as it is
              unless you pick another one.
            </p>
          )}
        </div>

        {/* Series */}
        <div className="space-y-2">
          <label
            htmlFor={`${idPrefix}-series`}
            className="block text-sm font-medium text-foreground"
          >
            Series {required && <span className="text-red-400">*</span>}
          </label>
          <select
            id={`${idPrefix}-series`}
            value={seriesId}
            required={required}
            disabled={formatId === ""}
            onChange={(e) => {
              const nextId = e.target.value;
              const chosen = seriesById.get(nextId);
              // THE SUGGESTION, and it is a WATERMARK READ, never a count.
              // `highest_assigned` only rises, so the proposal cannot land on a
              // number a deleted night already used — which taking the highest
              // stored number, or the length of the list plus one, would do the
              // moment a night is removed.
              //
              // A count-like affordance is allowed HERE: this surface sits
              // behind a capability, and the no-count rule governs the public
              // ones. Said out loud because over-applying it would remove the
              // one thing that makes the field usable.
              onChange({
                series_id: nextId,
                number: chosen ? String(chosen.highest_assigned + 1) : "",
              });
            }}
            className="w-full rounded-xl border border-card-border bg-background px-4 py-3 text-foreground normal-case outline-none focus:ring-1 focus:ring-accent/50 disabled:opacity-50"
          >
            <option value="">
              {formatId === "" ? "Pick a format first…" : "Choose a series…"}
            </option>
            {carriedSeriesIsUnreadable && (
              <option value={seriesId}>
                This night&apos;s series (not one you can see)
              </option>
            )}
            {seriesOptions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          {carriedSeriesIsUnreadable && (
            <p className="text-xs text-muted">
              This night carries a series your account cannot see. It is kept as it is
              unless you pick another one.
            </p>
          )}
        </div>

        {/* Number */}
        <div className="space-y-2">
          <label
            htmlFor={`${idPrefix}-number`}
            className="block text-sm font-medium text-foreground"
          >
            Number
          </label>
          <input
            id={`${idPrefix}-number`}
            type="number"
            inputMode="numeric"
            min={1}
            value={number}
            // The typed value is NEVER cleared by a refusal: the person came
            // here with a number from a poster, and clearing it would lose the
            // only copy on screen.
            onChange={(e) => onChange({ number: e.target.value })}
            placeholder="Leave empty for a night with no number of its own"
            aria-invalid={numberError ? true : undefined}
            aria-describedby={numberError ? `${errorId} ${helpId}` : helpId}
            className="w-full rounded-xl border border-card-border bg-background px-4 py-3 text-foreground tabular-nums placeholder:text-muted outline-none focus:ring-1 focus:ring-accent/50"
          />
          {numberError && (
            <p id={errorId} className="text-sm text-red-400">
              {numberError}
            </p>
          )}
          <p id={helpId} className="text-xs text-muted">
            {SERIES_NUMBER_HELP}
          </p>
        </div>
      </>
    );
  }

  function renderSubEventSection(
    subEvent: SubEventFormState,
    index: number
  ) {
    const idPrefix = `sub-${index}`;
    return (
      <div key={index} className="space-y-4 rounded-xl border border-card-border bg-card/50 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">
            Sub-Event {index + 1}
          </h3>
          <button
            type="button"
            onClick={() => removeSubEvent(index)}
            className="rounded-full border border-red-500/30 px-3 py-1 text-xs font-medium text-red-400 hover:bg-red-500/10 transition-colors"
          >
            Remove
          </button>
        </div>

        {/* Title */}
        <div className="space-y-2">
          <label
            htmlFor={`${idPrefix}-title`}
            className="block text-sm font-medium text-foreground"
          >
            Title <span className="text-red-400">*</span>
          </label>
          <input
            id={`${idPrefix}-title`}
            type="text"
            value={subEvent.title}
            onChange={(e) => updateSubEvent(index, "title", e.target.value)}
            placeholder="Sub-event name"
            maxLength={100}
            className="w-full rounded-xl border border-card-border bg-background px-4 py-3 text-foreground placeholder:text-muted outline-none focus:ring-1 focus:ring-accent/50"
          />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <label
            htmlFor={`${idPrefix}-description`}
            className="block text-sm font-medium text-foreground"
          >
            Description
          </label>
          <textarea
            id={`${idPrefix}-description`}
            value={subEvent.description}
            onChange={(e) => updateSubEvent(index, "description", e.target.value)}
            placeholder="Optional description..."
            rows={2}
            maxLength={2000}
            className="w-full rounded-xl border border-card-border bg-background px-4 py-3 text-foreground placeholder:text-muted outline-none focus:ring-1 focus:ring-accent/50 resize-y"
          />
        </div>

        {/* Format, series and number — a sub-event always becomes a night, so
            the two catalogue fields are always required here. */}
        {renderCatalogueFields({
          idPrefix,
          sortOrder: index,
          formatId: subEvent.format_id,
          seriesId: subEvent.series_id,
          number: subEvent.number,
          required: true,
          onChange: (patch) =>
            setSubEvents((prev) =>
              prev.map((se, i) => (i === index ? { ...se, ...patch } : se))
            ),
        })}

        {/* Date */}
        <div className="space-y-2">
          <label
            htmlFor={`${idPrefix}-date`}
            className="block text-sm font-medium text-foreground"
          >
            Date <span className="text-red-400">*</span>
          </label>
          <input
            id={`${idPrefix}-date`}
            type="date"
            value={subEvent.date}
            onChange={(e) => updateSubEvent(index, "date", e.target.value)}
            required
            className="w-full rounded-xl border border-card-border bg-background px-4 py-3 text-foreground outline-none focus:ring-1 focus:ring-accent/50"
          />
        </div>

        {/* Time row */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label
              htmlFor={`${idPrefix}-time`}
              className="block text-sm font-medium text-foreground"
            >
              Start Time <span className="text-red-400">*</span>
            </label>
            <input
              id={`${idPrefix}-time`}
              type="time"
              value={subEvent.time}
              onChange={(e) => updateSubEvent(index, "time", e.target.value)}
              required
              className="w-full rounded-xl border border-card-border bg-background px-4 py-3 text-foreground outline-none focus:ring-1 focus:ring-accent/50"
            />
          </div>
          <div className="space-y-2">
            <label
              htmlFor={`${idPrefix}-end-time`}
              className="block text-sm font-medium text-foreground"
            >
              End Time
            </label>
            <input
              id={`${idPrefix}-end-time`}
              type="time"
              value={subEvent.end_time}
              onChange={(e) => updateSubEvent(index, "end_time", e.target.value)}
              className="w-full rounded-xl border border-card-border bg-background px-4 py-3 text-foreground outline-none focus:ring-1 focus:ring-accent/50"
            />
          </div>
        </div>

        {/* Menu closes at */}
        <div className="space-y-2">
          <label
            htmlFor={`${idPrefix}-menu-closes-at`}
            className="block text-sm font-medium text-foreground"
          >
            Menu Closes At
          </label>
          <input
            id={`${idPrefix}-menu-closes-at`}
            type="time"
            value={subEvent.menu_closes_at}
            onChange={(e) => updateSubEvent(index, "menu_closes_at", e.target.value)}
            className="w-full rounded-xl border border-card-border bg-background px-4 py-3 text-foreground outline-none focus:ring-1 focus:ring-accent/50"
          />
          <p className="text-xs text-muted">
            If empty, the menu closes at End Time. After closing, tokens are redeemable for 1 more hour.
          </p>
        </div>

        {/* Venue with autocomplete */}
        <div className="space-y-2">
          <label
            htmlFor={`${idPrefix}-venue`}
            className="block text-sm font-medium text-foreground"
          >
            Venue
          </label>
          <AutocompleteInput
            id={`${idPrefix}-venue`}
            value={subEvent.venue_name}
            onChange={(val) => {
              setSubEvents((prev) =>
                prev.map((se, i) =>
                  i === index ? { ...se, venue_name: val, venue_id: null } : se
                )
              );
            }}
            onSelect={(option: AutocompleteOption) => {
              setSubEvents((prev) =>
                prev.map((se, i) =>
                  i === index ? { ...se, venue_name: option.name, venue_id: option.id } : se
                )
              );
            }}
            onCreateNew={(name) => {
              setPendingVenueIndex(index);
              setPendingVenueName(name);
              setShowVenueModal(true);
            }}
            search={searchVenuesWrapped}
            placeholder="Search venue..."
            selectedId={subEvent.venue_id}
            createLabel="Create new venue"
          />
          {pendingVenueIndex === index && pendingVenueName && !showVenueModal && (
            <VenueProfilePrompt
              name={pendingVenueName}
              onCreateClick={() => setShowVenueModal(true)}
              onSkip={() => {
                setSkippedVenues((prev) => new Set(prev).add(pendingVenueName.toLowerCase()));
                setPendingVenueIndex(null);
                setPendingVenueName(null);
              }}
            />
          )}
        </div>

        {/* Venue Secret toggle */}
        {renderVenueSecretToggle(
          subEvent.venue_secret,
          () => {
            setSubEvents((prev) =>
              prev.map((se, i) =>
                i === index ? { ...se, venue_secret: !se.venue_secret } : se
              )
            );
          }
        )}

        {/* Venue secret hint & reveal hours */}
        {subEvent.venue_secret && (
          <div className="space-y-3 pl-2 border-l-2 border-accent/20">
            <div className="space-y-2">
              <label
                htmlFor={`${idPrefix}-venue-hint`}
                className="block text-sm font-medium text-foreground"
              >
                Venue Hint
              </label>
              <input
                id={`${idPrefix}-venue-hint`}
                type="text"
                value={subEvent.venue_secret_hint}
                onChange={(e) => updateSubEvent(index, "venue_secret_hint", e.target.value)}
                placeholder="e.g. 'Near Trastevere...'"
                maxLength={500}
                className="w-full rounded-xl border border-card-border bg-background px-4 py-3 text-foreground placeholder:text-muted outline-none focus:ring-1 focus:ring-accent/50"
              />
              <p className="text-xs text-muted">Shown to users who can&apos;t see the venue yet</p>
            </div>
            <div className="space-y-2">
              <label
                htmlFor={`${idPrefix}-reveal-hours`}
                className="block text-sm font-medium text-foreground"
              >
                Reveal Hours Before Event
              </label>
              <input
                id={`${idPrefix}-reveal-hours`}
                type="number"
                value={subEvent.venue_reveal_hours}
                onChange={(e) => updateSubEvent(index, "venue_reveal_hours", e.target.value)}
                placeholder="24 (default)"
                min={1}
                className="w-full rounded-xl border border-card-border bg-background px-4 py-3 text-foreground placeholder:text-muted outline-none focus:ring-1 focus:ring-accent/50"
              />
              <p className="text-xs text-muted">Approved members see the venue this many hours before the event. An email will be sent when the venue is revealed.</p>
            </div>

            {/* Reveal on Purchase toggle */}
            <div className="flex items-center justify-between rounded-xl border border-card-border bg-card px-4 py-3">
              <div>
                <p className="text-sm font-medium text-foreground">
                  Reveal on Ticket Purchase
                </p>
                <p className="text-xs text-muted mt-0.5">
                  {subEvent.venue_reveal_on_purchase
                    ? "Ticket holders see the venue immediately"
                    : "Ticket holders see the venue only when the reveal timer triggers"}
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={subEvent.venue_reveal_on_purchase}
                onClick={() => {
                  setSubEvents((prev) =>
                    prev.map((se, i) =>
                      i === index ? { ...se, venue_reveal_on_purchase: !se.venue_reveal_on_purchase } : se
                    )
                  );
                }}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-accent/50 focus:ring-offset-2 focus:ring-offset-background ${
                  subEvent.venue_reveal_on_purchase ? "bg-accent" : "bg-card-border"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    subEvent.venue_reveal_on_purchase ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>
        )}

        {/* Lineup with autocomplete */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-foreground">
            Lineup
          </label>
          <p className="text-xs text-muted">Press Enter to add artist</p>
          <AutocompleteTagInput
            value={subEvent.lineup}
            onChange={(newLineup) => {
              setSubEvents((prev) =>
                prev.map((se, i) => (i === index ? { ...se, lineup: newLineup } : se))
              );
            }}
            search={searchArtistsWrapped}
            onCreateNew={handleCreateNewArtist}
            placeholder="Artist name"
          />
        </div>

        {/* Access Type */}
        <div className="space-y-2">
          <label
            htmlFor={`${idPrefix}-access-type`}
            className="block text-sm font-medium text-foreground"
          >
            Access Type
          </label>
          <select
            id={`${idPrefix}-access-type`}
            value={subEvent.access_type}
            onChange={(e) =>
              updateSubEvent(index, "access_type", e.target.value)
            }
            className="w-full rounded-xl border border-card-border bg-background px-4 py-3 text-foreground outline-none focus:ring-1 focus:ring-accent/50"
          >
            {(Object.entries(ACCESS_TYPE_LABELS) as [AccessType, string][]).map(
              ([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              )
            )}
          </select>
        </div>

        {/* Capacity */}
        <div className="space-y-2">
          <label
            htmlFor={`${idPrefix}-capacity`}
            className="block text-sm font-medium text-foreground"
          >
            Capacity
          </label>
          <input
            id={`${idPrefix}-capacity`}
            type="number"
            value={subEvent.capacity}
            onChange={(e) => updateSubEvent(index, "capacity", e.target.value)}
            placeholder="Leave empty for unlimited"
            min={1}
            className="w-full rounded-xl border border-card-border bg-background px-4 py-3 text-foreground placeholder:text-muted outline-none focus:ring-1 focus:ring-accent/50"
          />
        </div>
      </div>
    );
  }

  // Aggregated read-only view when sub-events exist
  function renderAggregatedView() {
    if (subEvents.length === 0) return null;

    const allLineup = new Set<string>();
    const venuesBySubEvent: { title: string; venueName: string; venueSecret: boolean }[] = [];
    for (const se of subEvents) {
      for (const a of se.lineup) allLineup.add(a);
      if (se.venue_name || se.venue_id) {
        venuesBySubEvent.push({
          title: se.title || `Sub-Event ${se.sort_order + 1}`,
          venueName: se.venue_name,
          venueSecret: se.venue_secret,
        });
      }
    }

    if (allLineup.size === 0 && venuesBySubEvent.length === 0) return null;

    return (
      <div className="rounded-xl border border-card-border bg-card/30 p-4 space-y-3">
        <h3 className="text-sm font-semibold text-muted uppercase tracking-wider">
          Aggregated View (read-only)
        </h3>
        {allLineup.size > 0 && (
          <div>
            <p className="text-xs text-muted mb-1">Lineup (all sub-events)</p>
            <div className="flex flex-wrap gap-1.5">
              {[...allLineup].sort().map((a) => (
                <span key={a} className="rounded-full bg-accent/10 px-2.5 py-0.5 text-xs text-accent">
                  {a}
                </span>
              ))}
            </div>
          </div>
        )}
        {venuesBySubEvent.length > 0 && (
          <div>
            <p className="text-xs text-muted mb-1">Venues</p>
            <div className="space-y-1">
              {venuesBySubEvent.map((v, i) => (
                <p key={i} className="text-xs text-foreground">
                  <span className="text-muted">{v.title}:</span>{" "}
                  {v.venueSecret ? "Secret Venue" : v.venueName}
                </p>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Title */}
      <div className="space-y-2">
        <label
          htmlFor="event-title"
          className="block text-sm font-medium text-foreground"
        >
          Title <span className="text-red-400">*</span>
        </label>
        <input
          id="event-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Event title"
          required
          maxLength={100}
          className="w-full rounded-xl border border-card-border bg-background px-4 py-3 text-foreground placeholder:text-muted outline-none focus:ring-1 focus:ring-accent/50"
        />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <label
          htmlFor="event-description"
          className="block text-sm font-medium text-foreground"
        >
          Description <span className="text-red-400">*</span>
        </label>
        <textarea
          id="event-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe the event..."
          required
          rows={4}
          maxLength={5000}
          className="w-full rounded-xl border border-card-border bg-background px-4 py-3 text-foreground placeholder:text-muted outline-none focus:ring-1 focus:ring-accent/50 resize-y"
        />
      </div>

      {/* Event details (shown when no sub-events) */}
      {subEvents.length === 0 && (
        <div className="space-y-4 rounded-xl border border-card-border bg-card/50 p-4">
          <h3 className="text-sm font-semibold text-foreground">Event Details</h3>

          {/* Date */}
          <div className="space-y-2">
            <label htmlFor="event-date" className="block text-sm font-medium text-foreground">
              Date <span className="text-red-400">*</span>
            </label>
            <input id="event-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required
              className="w-full rounded-xl border border-card-border bg-background px-4 py-3 text-foreground outline-none focus:ring-1 focus:ring-accent/50" />
          </div>

          {/* Format, series and number.
              `required` only once a start time exists, because that is exactly
              when this block produces a night: an event saved with no time
              writes no row of `event_parties`, and demanding a format for a
              night that will not exist would refuse a save for nothing. */}
          {renderCatalogueFields({
            idPrefix: "main",
            sortOrder: 0,
            formatId: mainFormatId,
            seriesId: mainSeriesId,
            number: mainNumber,
            required: mainTime !== "",
            onChange: (patch) => {
              if (patch.format_id !== undefined) setMainFormatId(patch.format_id);
              if (patch.series_id !== undefined) setMainSeriesId(patch.series_id);
              if (patch.number !== undefined) setMainNumber(patch.number);
            },
          })}

          {/* Time row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="main-time" className="block text-sm font-medium text-foreground">Start Time</label>
              <input id="main-time" type="time" value={mainTime} onChange={(e) => setMainTime(e.target.value)}
                className="w-full rounded-xl border border-card-border bg-background px-4 py-3 text-foreground outline-none focus:ring-1 focus:ring-accent/50" />
            </div>
            <div className="space-y-2">
              <label htmlFor="main-end-time" className="block text-sm font-medium text-foreground">End Time</label>
              <input id="main-end-time" type="time" value={mainEndTime} onChange={(e) => setMainEndTime(e.target.value)}
                className="w-full rounded-xl border border-card-border bg-background px-4 py-3 text-foreground outline-none focus:ring-1 focus:ring-accent/50" />
            </div>
          </div>

          {/* Menu closes at */}
          <div className="space-y-2">
            <label htmlFor="main-menu-closes-at" className="block text-sm font-medium text-foreground">Menu Closes At</label>
            <input id="main-menu-closes-at" type="time" value={mainMenuClosesAt} onChange={(e) => setMainMenuClosesAt(e.target.value)}
              className="w-full rounded-xl border border-card-border bg-background px-4 py-3 text-foreground outline-none focus:ring-1 focus:ring-accent/50" />
            <p className="text-xs text-muted">
              If empty, the menu closes at End Time. After closing, tokens are redeemable for 1 more hour.
            </p>
          </div>

          {/* Venue with autocomplete */}
          <div className="space-y-2">
            <label htmlFor="main-venue" className="block text-sm font-medium text-foreground">Venue</label>
            <AutocompleteInput
              id="main-venue"
              value={mainVenueName}
              onChange={(val) => { setMainVenueName(val); setMainVenueId(null); }}
              onSelect={(option: AutocompleteOption) => {
                setMainVenueName(option.name);
                setMainVenueId(option.id);
              }}
              onCreateNew={(name) => {
                setPendingVenueIndex(-1);
                setPendingVenueName(name);
                setShowVenueModal(true);
              }}
              search={searchVenuesWrapped}
              placeholder="Search venue..."
              selectedId={mainVenueId}
              createLabel="Create new venue"
            />
            {pendingVenueIndex === -1 && pendingVenueName && !showVenueModal && (
              <VenueProfilePrompt name={pendingVenueName} onCreateClick={() => setShowVenueModal(true)}
                onSkip={() => { setSkippedVenues((prev) => new Set(prev).add(pendingVenueName.toLowerCase())); setPendingVenueIndex(null); setPendingVenueName(null); }} />
            )}
          </div>

          {/* Secret Venue toggle */}
          {renderVenueSecretToggle(
            venueSecret,
            () => setVenueSecret(!venueSecret)
          )}

          {/* Venue secret hint & reveal hours */}
          {venueSecret && (
            <div className="space-y-3 pl-2 border-l-2 border-accent/20">
              <div className="space-y-2">
                <label htmlFor="main-venue-hint" className="block text-sm font-medium text-foreground">
                  Venue Hint
                </label>
                <input
                  id="main-venue-hint"
                  type="text"
                  value={mainVenueSecretHint}
                  onChange={(e) => setMainVenueSecretHint(e.target.value)}
                  placeholder="e.g. 'Near Trastevere...'"
                  maxLength={500}
                  className="w-full rounded-xl border border-card-border bg-background px-4 py-3 text-foreground placeholder:text-muted outline-none focus:ring-1 focus:ring-accent/50"
                />
                <p className="text-xs text-muted">Shown to users who can&apos;t see the venue yet</p>
              </div>
              <div className="space-y-2">
                <label htmlFor="main-reveal-hours" className="block text-sm font-medium text-foreground">
                  Reveal Hours Before Event
                </label>
                <input
                  id="main-reveal-hours"
                  type="number"
                  value={mainVenueRevealHours}
                  onChange={(e) => setMainVenueRevealHours(e.target.value)}
                  placeholder="24"
                  min={1}
                  className="w-full rounded-xl border border-card-border bg-background px-4 py-3 text-foreground placeholder:text-muted outline-none focus:ring-1 focus:ring-accent/50"
                />
                <p className="text-xs text-muted">Approved members see the venue this many hours before. An email will be sent when the venue is revealed.</p>
              </div>

              {/* Reveal on Purchase toggle */}
              <div className="flex items-center justify-between rounded-xl border border-card-border bg-card px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Reveal on Ticket Purchase
                  </p>
                  <p className="text-xs text-muted mt-0.5">
                    {mainVenueRevealOnPurchase
                      ? "Ticket holders see the venue immediately"
                      : "Ticket holders see the venue only when the reveal timer triggers"}
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={mainVenueRevealOnPurchase}
                  onClick={() => setMainVenueRevealOnPurchase(!mainVenueRevealOnPurchase)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-accent/50 focus:ring-offset-2 focus:ring-offset-background ${
                    mainVenueRevealOnPurchase ? "bg-accent" : "bg-card-border"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      mainVenueRevealOnPurchase ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>
          )}

          {/* Access Type */}
          <div className="space-y-2">
            <label htmlFor="main-access-type" className="block text-sm font-medium text-foreground">Access Type</label>
            <select id="main-access-type" value={mainAccessType} onChange={(e) => setMainAccessType(e.target.value as AccessType)}
              className="w-full rounded-xl border border-card-border bg-background px-4 py-3 text-foreground outline-none focus:ring-1 focus:ring-accent/50">
              {(Object.entries(ACCESS_TYPE_LABELS) as [AccessType, string][]).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          {/* Capacity */}
          <div className="space-y-2">
            <label htmlFor="main-capacity" className="block text-sm font-medium text-foreground">Capacity</label>
            <input id="main-capacity" type="number" value={mainCapacity} onChange={(e) => setMainCapacity(e.target.value)}
              placeholder="Leave empty for unlimited" min={1}
              className="w-full rounded-xl border border-card-border bg-background px-4 py-3 text-foreground placeholder:text-muted outline-none focus:ring-1 focus:ring-accent/50" />
          </div>
        </div>
      )}

      {/* Secret venue toggle and hint/reveal fields are now inside the Event Details card, right after the venue field */}

      {/* Lineup - only shown when no sub-events */}
      {subEvents.length === 0 && (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-foreground">
            Lineup
          </label>
          <p className="text-xs text-muted">Press Enter to add artist</p>
          <AutocompleteTagInput
            value={lineup}
            onChange={setLineup}
            search={searchArtistsWrapped}
            onCreateNew={handleCreateNewArtist}
            placeholder="Artist name"
          />
        </div>
      )}

      {/* Cover Image */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-foreground">
          Cover Image
        </label>
        {imagePreview && (
          <div className="relative w-full max-w-xs">
            <img
              src={imagePreview}
              alt="Cover preview"
              className="rounded-xl border border-card-border object-cover w-full h-40"
            />
            <button
              type="button"
              onClick={clearImage}
              className="absolute top-2 right-2 rounded-full bg-background/80 p-1.5 text-foreground hover:bg-background transition-colors"
              aria-label="Remove image"
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
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleImageChange}
          className="block w-full text-sm text-muted file:mr-4 file:rounded-full file:border-0 file:bg-accent/20 file:px-4 file:py-2 file:text-sm file:font-medium file:text-accent hover:file:bg-accent/30 file:cursor-pointer"
        />
        {imageError && (
          <p className="text-sm text-red-400">{imageError}</p>
        )}
      </div>

      {/* Aggregated view when sub-events exist */}
      {renderAggregatedView()}

      {/* Sub-Events */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Sub-Events</h2>
          <button
            type="button"
            onClick={addSubEvent}
            className="rounded-full border border-accent/30 px-3 py-1.5 text-xs font-medium text-accent hover:bg-accent/10 transition-colors"
          >
            + Add Sub-Event
          </button>
        </div>
        {subEvents.map((subEvent, index) =>
          renderSubEventSection(subEvent, index)
        )}
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? "Saving..." : submitLabel}
      </button>
    </form>

    {/* Modals rendered outside <form> to avoid nested form hydration error */}
    <CreateArtistModal
      name={pendingArtistName ?? ""}
      open={showArtistModal}
      onClose={() => {
        setShowArtistModal(false);
        setPendingArtistName(null);
      }}
      onCreated={() => {
        setShowArtistModal(false);
        setPendingArtistName(null);
      }}
    />
    <CreateVenueModal
      name={pendingVenueName ?? ""}
      open={showVenueModal}
      onClose={() => {
        setShowVenueModal(false);
        setPendingVenueIndex(null);
        setPendingVenueName(null);
      }}
      onCreated={(id) => {
        if (pendingVenueIndex === -1) {
          setMainVenueId(id);
          setMainVenueName(pendingVenueName ?? mainVenueName);
        } else if (pendingVenueIndex !== null) {
          setSubEvents((prev) =>
            prev.map((se, i) =>
              i === pendingVenueIndex ? { ...se, venue_id: id, venue_name: pendingVenueName ?? se.venue_name } : se
            )
          );
        }
        setShowVenueModal(false);
        setPendingVenueIndex(null);
        setPendingVenueName(null);
      }}
    />
    </>
  );
}
