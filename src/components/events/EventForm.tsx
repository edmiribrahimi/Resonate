"use client";

import { useState, useRef, useCallback, type FormEvent, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AutocompleteTagInput from "@/components/events/AutocompleteTagInput";
import AutocompleteInput, { type AutocompleteOption } from "@/components/ui/AutocompleteInput";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { Button, IconButton } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Chip";
import { Card } from "@/components/ui/Card";
import { Switch } from "@/components/ui/Switch";
import CreateArtistModal from "@/components/artists/CreateArtistModal";
import VenueProfilePrompt from "@/components/venues/VenueProfilePrompt";
import CreateVenueModal from "@/components/venues/CreateVenueModal";
import { searchArtists } from "@/app/(admin)/admin/artists/actions";
import { searchVenues, checkVenueExists } from "@/app/(admin)/admin/venues/actions";
import type { NightRefusal } from "@/app/(admin)/admin/events/actions";
import type { AccessType } from "@/types/database";
// The reveal window has ONE home (plan 37-04). Imported, never retyped as a
// number here: a copy in this file would be the place where the form and the
// server drift apart, and the form is where an operator reads the promise.
import { DEFAULT_VENUE_REVEAL_HOURS } from "@/utils/datetime";

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

/**
 * The reveal window explained to the person typing — and, like the constant
 * above, ONE copy rather than two.
 *
 * The sentence was written twice, byte-identical, on the per-night block and on
 * the single-night Event Details block. Two copies of a sentence about **when an
 * address leaves this system** is two places for it to drift, and the domain
 * rule (`venue-secrecy.md`) is that a reveal has no rollback: a form that
 * announced two different floors would send an operator to the one that reads
 * more permissively. The floor itself is still imported and never retyped
 * (plan 37-04); this constant only stops the explanation of it from forking.
 *
 * Verbatim from both incumbent copies. The apostrophe is the character, not the
 * entity, because a JavaScript string is not JSX — the rendered text is the same.
 */
const VENUE_REVEAL_HOURS_HELP =
  `Approved members see the venue this many hours before the night starts. ` +
  `Minimum ${DEFAULT_VENUE_REVEAL_HOURS} hours: below that the address mail can ` +
  `leave AFTER the party has started, because the reveal cron runs once a day and ` +
  `a narrower window can open after the day's run has already gone. Widen the ` +
  `window, not the floor.`;

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

  /**
   * The secrecy control — and the one place in this file where a conversion has
   * to prove a negative.
   *
   * ── What changed, and what deliberately did not ─────────────────────────────
   *
   * The hand-written track is now the `Switch` primitive. That is a **target**
   * change, not a **guard** change: the drawn track keeps its 24px size and
   * gains the 44×44 hit area §6.1 requires, and the focus expression is imported
   * rather than suppressed, which is what the incumbent's own class string did.
   *
   * **A larger hit area is a fix for a mis-hit, not an invitation.** The three
   * properties that decide how hard this is to trip are unchanged, and they are
   * listed rather than assumed:
   *
   *  1. **Its default.** `defaultSubEvent` sets `venue_secret: false` and the
   *     event-level state falls back to `false`. Still false, on both paths.
   *  2. **What stands between the operator and the change.** Nothing did, and
   *     nothing does: this control has never carried a confirmation, and adding
   *     one here would be a behaviour change inside a conversion commit. It is
   *     reported instead.
   *  3. **Its position.** The control sits AFTER the venue field and BEFORE the
   *     fields it gates, in both blocks. Unchanged — see the venue field's own
   *     comment. Nothing in this file moves an address earlier in the reading
   *     order, and the only component that renders one is not opened here.
   *
   * The row already names the thing being switched, so the control's own label
   * is hidden from sight and kept for assistive technology — `Switch.tsx`'s
   * `labelHidden`, and the case its docblock says it exists for. The name is
   * built from the row's own words so two switches on one page are told apart
   * by somebody who cannot see which row they are in.
   *
   * `id` is a parameter because this renders once per night plus once for the
   * single-night block, and a duplicated id would bind a label to the wrong
   * control — silently, and only for the reader who depends on it.
   */
  function renderVenueSecretToggle(
    id: string,
    value: boolean,
    onToggle: () => void,
    label?: string
  ) {
    const name = label ?? "Secret Venue";
    return (
      <Card className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-ink">{name}</p>
          {value && (
            <p className="mt-1 text-xs text-muted">
              Venue will be hidden until members purchase a ticket or a configurable time before event
            </p>
          )}
        </div>
        <Switch
          id={id}
          label={name}
          labelHidden
          checked={value}
          onChange={onToggle}
          className="shrink-0"
        />
      </Card>
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

    /**
     * The two sentences that explain a carried catalogue row, as ONE hint.
     *
     * They are mutually exclusive by construction — `carriedFormatIsRetired`
     * needs the row to be readable and `carriedFormatIsUnreadable` needs it not
     * to be — so the field never has two, and picking between them here is not a
     * precedence rule being invented.
     *
     * They were loose paragraphs beside the control and are now the control's
     * `hint`, which is the same words plus the association a sighted reviewer
     * cannot see missing (`Input.tsx`'s `hint`, added by plan 41-09 for exactly
     * this reason on a venue-secrecy sentence).
     */
    const formatHint = carriedFormatIsRetired
      ? "This night was recorded under a retired format and keeps it. Pick another format only if you mean to move the night."
      : carriedFormatIsUnreadable
        ? "This night carries a format your account cannot see. It is kept as it is unless you pick another one."
        : undefined;

    const seriesHint = carriedSeriesIsUnreadable
      ? "This night carries a series your account cannot see. It is kept as it is unless you pick another one."
      : undefined;

    return (
      <>
        {/* Format */}
        <Select
          id={`${idPrefix}-format`}
          label={required ? "Format *" : "Format"}
          hint={formatHint}
          value={formatId}
          required={required}
          onChange={(e) =>
            // Changing the format clears the series AND the number: a series
            // belongs to exactly one format, so keeping either would leave a
            // pair the composite key refuses to store.
            onChange({ format_id: e.target.value, series_id: "", number: "" })
          }
          className="normal-case"
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
        </Select>

        {/* Series */}
        <Select
          id={`${idPrefix}-series`}
          label={required ? "Series *" : "Series"}
          hint={seriesHint}
          value={seriesId}
          required={required}
          disabled={formatId === ""}
          className="normal-case disabled:opacity-50"
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
        </Select>

        {/*
          Number.

          The refusal and the standing sentence both reach the control through
          the primitive, which addresses them by id and names them in
          `aria-describedby` — **failure first, then the standing sentence**,
          which is the order the hand-written attribute already used. What moved
          is where the refusal is DRAWN: it now sits below the standing sentence
          rather than above it. Nothing else about this field changed, and in
          particular the typed value is still never cleared by a refusal.
        */}
        <Input
          id={`${idPrefix}-number`}
          label="Number"
          hint={SERIES_NUMBER_HELP}
          error={numberError ?? undefined}
          type="number"
          inputMode="numeric"
          min={1}
          value={number}
          // The typed value is NEVER cleared by a refusal: the person came
          // here with a number from a poster, and clearing it would lose the
          // only copy on screen.
          onChange={(e) => onChange({ number: e.target.value })}
          placeholder="Leave empty for a night with no number of its own"
          className="tabular-nums"
        />
      </>
    );
  }

  function renderSubEventSection(
    subEvent: SubEventFormState,
    index: number
  ) {
    const idPrefix = `sub-${index}`;
    return (
      <Card key={index} className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          {/*
            The section-heading class string, written out rather than imported.
            D-41-11: the component is a convenience and a surface that writes the
            string is equally converted — and the string is written here without
            the component's own bottom margin, which would push a flex row's
            baseline apart for nothing.
          */}
          <h3 className="font-mono text-xs font-semibold uppercase tracking-widest text-muted">
            Sub-Event {index + 1}
          </h3>
          {/*
            Remove — the SAME visual weight it had, on a 44px target.

            Not the `destructive` variant: that rung is a fill, and a fill here
            would make the control that deletes a night LOUDER than the one that
            adds one. The removal is real — `updateEvent` deletes the nights
            taken off this form — and a night can carry a series progressivo that
            is already on a poster, so the safe direction for this control is
            "no more inviting than before", which is what the bordered rung is.
            The red tone is not replaced: D-41.1-25 refuses outcome tones and
            D-41.1-29 measured that the palette could not carry a distinguishable
            pair anyway. The word is the channel.

            **That this control has no confirmation at all is a finding, not a
            thing fixed here** — adding one would be a behaviour change inside a
            conversion commit.
          */}
          <Button
            size="sm"
            variant="secondary"
            onClick={() => removeSubEvent(index)}
            className="shrink-0"
          >
            Remove
          </Button>
        </div>

        {/*
          Title.

          The asterisk is carried in the label TEXT and no longer in a coloured
          span, because the label is a string on this control. **The `required`
          attribute is not added here**: this field has never carried one, and a
          field's required flag is validation rather than styling — adding it
          would change what the browser refuses to submit.
        */}
        <Input
          id={`${idPrefix}-title`}
          label="Title *"
          type="text"
          value={subEvent.title}
          onChange={(e) => updateSubEvent(index, "title", e.target.value)}
          placeholder="Sub-event name"
          maxLength={100}
        />

        {/* Description */}
        <Textarea
          id={`${idPrefix}-description`}
          label="Description"
          value={subEvent.description}
          onChange={(e) => updateSubEvent(index, "description", e.target.value)}
          placeholder="Optional description..."
          rows={2}
          maxLength={2000}
          className="resize-y"
        />

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
        <Input
          id={`${idPrefix}-date`}
          label="Date *"
          type="date"
          value={subEvent.date}
          onChange={(e) => updateSubEvent(index, "date", e.target.value)}
          required
        />

        {/* Time row */}
        <div className="grid grid-cols-2 gap-4">
          <Input
            id={`${idPrefix}-time`}
            label="Start Time *"
            type="time"
            value={subEvent.time}
            onChange={(e) => updateSubEvent(index, "time", e.target.value)}
            required
          />
          <Input
            id={`${idPrefix}-end-time`}
            label="End Time"
            type="time"
            value={subEvent.end_time}
            onChange={(e) => updateSubEvent(index, "end_time", e.target.value)}
          />
        </div>

        {/* Menu closes at */}
        <Input
          id={`${idPrefix}-menu-closes-at`}
          label="Menu Closes At"
          hint="If empty, the menu closes at End Time. After closing, tokens are redeemable for 1 more hour."
          type="time"
          value={subEvent.menu_closes_at}
          onChange={(e) => updateSubEvent(index, "menu_closes_at", e.target.value)}
        />

        {/*
          Venue — the field the address arrives through, and it keeps its place.

          `AutocompleteInput` belongs to plan 41.1-19 and is not opened here, so
          this block keeps its own wrapper and its own label; only the label's
          class string moves onto §8.6's convention. The DOM order of this region
          — venue, then the secrecy control, then the fields the secrecy control
          gates — is unchanged, and that is a `venue-secrecy.md` invariant rather
          than a layout preference.
        */}
        <div className="space-y-2">
          <label
            htmlFor={`${idPrefix}-venue`}
            className="block text-xs font-semibold text-ink-2"
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
          `${idPrefix}-venue-secret`,
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
            <Input
              id={`${idPrefix}-venue-hint`}
              label="Venue Hint"
              hint="Shown to users who can't see the venue yet"
              type="text"
              value={subEvent.venue_secret_hint}
              onChange={(e) => updateSubEvent(index, "venue_secret_hint", e.target.value)}
              placeholder="e.g. 'Near Trastevere...'"
              maxLength={500}
            />
            {/*
              The window the staff side announces, and the floor it refuses
              at, both read from `DEFAULT_VENUE_REVEAL_HOURS` — see the twin
              field on the single-night form below, which carries the full
              reasoning. `min` is UX, not a control: the real floor is
              server-side in `validateEventData`.

              The explaining sentence is now the field's `hint`, so it is
              addressed by `aria-describedby` instead of sitting beside the
              control unassociated. Same words, one copy, one home.
            */}
            <Input
              id={`${idPrefix}-reveal-hours`}
              label="Reveal Hours Before Event"
              hint={VENUE_REVEAL_HOURS_HELP}
              type="number"
              value={subEvent.venue_reveal_hours}
              onChange={(e) => updateSubEvent(index, "venue_reveal_hours", e.target.value)}
              placeholder={`${DEFAULT_VENUE_REVEAL_HOURS} (default)`}
              min={DEFAULT_VENUE_REVEAL_HOURS}
            />

            {/* Reveal on Purchase toggle */}
            <Card className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-ink">
                  Reveal on Ticket Purchase
                </p>
                <p className="mt-1 text-xs text-muted">
                  {subEvent.venue_reveal_on_purchase
                    ? "Ticket holders see the venue immediately"
                    : "Ticket holders see the venue only when the reveal timer triggers"}
                </p>
              </div>
              <Switch
                id={`${idPrefix}-reveal-on-purchase`}
                label="Reveal on Ticket Purchase"
                labelHidden
                checked={subEvent.venue_reveal_on_purchase}
                onChange={() => {
                  setSubEvents((prev) =>
                    prev.map((se, i) =>
                      i === index ? { ...se, venue_reveal_on_purchase: !se.venue_reveal_on_purchase } : se
                    )
                  );
                }}
                className="shrink-0"
              />
            </Card>
          </div>
        )}

        {/* Lineup with autocomplete */}
        <div className="space-y-2">
          {/*
            The label is CONVERTED but still UNBOUND, and that is reported
            rather than papered over.

            `AutocompleteTagInput` exposes no `id`, so there is nothing for a
            `htmlFor` to name, and the component belongs to plan 41.1-19 — this
            plan does not open it. A `<label>` with no association is the state
            this field arrived in; the class string moves onto §8.6's convention
            and the association is owed to the plan that owns the component.
          */}
          <label className="block text-xs font-semibold text-ink-2">
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
        <Select
          id={`${idPrefix}-access-type`}
          label="Access Type"
          value={subEvent.access_type}
          onChange={(e) =>
            updateSubEvent(index, "access_type", e.target.value)
          }
        >
          {(Object.entries(ACCESS_TYPE_LABELS) as [AccessType, string][]).map(
            ([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            )
          )}
        </Select>

        {/* Capacity */}
        <Input
          id={`${idPrefix}-capacity`}
          label="Capacity"
          type="number"
          value={subEvent.capacity}
          onChange={(e) => updateSubEvent(index, "capacity", e.target.value)}
          placeholder="Leave empty for unlimited"
          min={1}
        />
      </Card>
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
      <Card className="space-y-3">
        <h3 className="font-mono text-xs font-semibold uppercase tracking-widest text-muted">
          Aggregated View (read-only)
        </h3>
        {allLineup.size > 0 && (
          <div>
            <p className="mb-1 text-xs text-muted">Lineup (all sub-events)</p>
            <div className="flex flex-wrap gap-1.5">
              {/*
                A mark that names a thing and cannot be operated is a badge, not
                a chip (§8.5). These are read, never pressed — so no 44px floor
                applies to them, and giving them one would make a read-only
                summary look like a row of controls.
              */}
              {[...allLineup].sort().map((a) => (
                <Badge key={a}>{a}</Badge>
              ))}
            </div>
          </div>
        )}
        {venuesBySubEvent.length > 0 && (
          <div>
            <p className="mb-1 text-xs text-muted">Venues</p>
            <div className="space-y-1">
              {/*
                THE CONDITIONAL THAT DECIDES WHETHER A VENUE NAME IS DRAWN, and
                it is byte-identical to what it was. It reads the night's own
                secrecy flag and prints the words `Secret Venue` in place of the
                name — a `venue-secrecy.md` decision wearing a summary's clothes.
                Nothing about this line, its branches or its order moved.
              */}
              {venuesBySubEvent.map((v, i) => (
                <p key={i} className="text-xs text-ink">
                  <span className="text-muted">{v.title}:</span>{" "}
                  {v.venueSecret ? "Secret Venue" : v.venueName}
                </p>
              ))}
            </div>
          </div>
        )}
      </Card>
    );
  }

  return (
    <>
    <form onSubmit={handleSubmit} className="space-y-6">
      {/*
        The form's refusal region — §11, and `meta-gates.md`'s zero-silent-
        failures rule.

        `role="alert"` is the addition, and it is the contract rather than a
        nicety: this region is the only place a refused save is announced, and
        without the role it is announced to nobody who is not looking at it.

        The sentence it carries is NOT collapsed and is not made generic. Three
        distinct causes reach it — a network or upload failure, a named refusal
        from the action, and a refusal that arrived with no reason at all — and
        each keeps its own words, which is why `handleSubmit` sets the category
        before the sentence. This repository already records what the other
        shape costs: the newsletter form's one message for every failure.
      */}
      {error && (
        <div
          role="alert"
          className="rounded-2xl border border-sem-crit/30 bg-sem-crit/10 p-4"
        >
          <p className="text-sm text-sem-crit">{error}</p>
        </div>
      )}

      {/* Title */}
      <Input
        id="event-title"
        label="Title *"
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Event title"
        required
        maxLength={100}
      />

      {/* Description */}
      <Textarea
        id="event-description"
        label="Description *"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Describe the event..."
        required
        rows={4}
        maxLength={5000}
        className="resize-y"
      />

      {/* Event details (shown when no sub-events) */}
      {subEvents.length === 0 && (
        <Card className="space-y-4">
          <h3 className="font-mono text-xs font-semibold uppercase tracking-widest text-muted">
            Event Details
          </h3>

          {/* Date */}
          <Input
            id="event-date"
            label="Date *"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />

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
            <Input
              id="main-time"
              label="Start Time"
              type="time"
              value={mainTime}
              onChange={(e) => setMainTime(e.target.value)}
            />
            <Input
              id="main-end-time"
              label="End Time"
              type="time"
              value={mainEndTime}
              onChange={(e) => setMainEndTime(e.target.value)}
            />
          </div>

          {/* Menu closes at */}
          <Input
            id="main-menu-closes-at"
            label="Menu Closes At"
            hint="If empty, the menu closes at End Time. After closing, tokens are redeemable for 1 more hour."
            type="time"
            value={mainMenuClosesAt}
            onChange={(e) => setMainMenuClosesAt(e.target.value)}
          />

          {/*
            Venue — the twin of the per-night field above, and it keeps its
            place for the same reason: the DOM order of this region is venue,
            then the secrecy control, then what the secrecy control gates.
          */}
          <div className="space-y-2">
            <label htmlFor="main-venue" className="block text-xs font-semibold text-ink-2">Venue</label>
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
            "main-venue-secret",
            venueSecret,
            () => setVenueSecret(!venueSecret)
          )}

          {/* Venue secret hint & reveal hours */}
          {venueSecret && (
            <div className="space-y-3 pl-2 border-l-2 border-accent/20">
              <Input
                id="main-venue-hint"
                label="Venue Hint"
                hint="Shown to users who can't see the venue yet"
                type="text"
                value={mainVenueSecretHint}
                onChange={(e) => setMainVenueSecretHint(e.target.value)}
                placeholder="e.g. 'Near Trastevere...'"
                maxLength={500}
              />
              {/*
                ── The field announced a number the system no longer applies ──

                It said `24` and accepted `min={1}`. Both were promises this
                form cannot keep: the effective default is
                `DEFAULT_VENUE_REVEAL_HOURS` (plan 37-04), and anything under
                that floor is refused by `validateEventData` at save time.
                Announcing 24 and taking 6 meant the operator discovered the
                refusal only after filling the whole form.

                Both values are built from the imported constant, never
                retyped: a literal here would be a fourth home for a number
                that phase 37 exists to keep in one.

                `min` is UX and nothing more. The browser attribute stops a
                spinner, not a request — the control that matters is the
                server-side floor, and it stays there. The point of this
                change is that the refusal is visible BEFORE saving, not that
                the browser enforces anything.

                The helper text names the CAUSE with the server's own words,
                so the operator does not read two different explanations of
                the same refusal — and it is now ONE copy shared with the
                per-night field, addressed by `aria-describedby` rather than
                sitting beside the control unassociated.
              */}
              <Input
                id="main-reveal-hours"
                label="Reveal Hours Before Event"
                hint={VENUE_REVEAL_HOURS_HELP}
                type="number"
                value={mainVenueRevealHours}
                onChange={(e) => setMainVenueRevealHours(e.target.value)}
                placeholder={`${DEFAULT_VENUE_REVEAL_HOURS} (default)`}
                min={DEFAULT_VENUE_REVEAL_HOURS}
              />

              {/* Reveal on Purchase toggle */}
              <Card className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-ink">
                    Reveal on Ticket Purchase
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {mainVenueRevealOnPurchase
                      ? "Ticket holders see the venue immediately"
                      : "Ticket holders see the venue only when the reveal timer triggers"}
                  </p>
                </div>
                <Switch
                  id="main-reveal-on-purchase"
                  label="Reveal on Ticket Purchase"
                  labelHidden
                  checked={mainVenueRevealOnPurchase}
                  onChange={() => setMainVenueRevealOnPurchase(!mainVenueRevealOnPurchase)}
                  className="shrink-0"
                />
              </Card>
            </div>
          )}

          {/* Access Type */}
          <Select
            id="main-access-type"
            label="Access Type"
            value={mainAccessType}
            onChange={(e) => setMainAccessType(e.target.value as AccessType)}
          >
            {(Object.entries(ACCESS_TYPE_LABELS) as [AccessType, string][]).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </Select>

          {/* Capacity */}
          <Input
            id="main-capacity"
            label="Capacity"
            type="number"
            value={mainCapacity}
            onChange={(e) => setMainCapacity(e.target.value)}
            placeholder="Leave empty for unlimited"
            min={1}
          />
        </Card>
      )}

      {/* Secret venue toggle and hint/reveal fields are now inside the Event Details card, right after the venue field */}

      {/* Lineup - only shown when no sub-events */}
      {subEvents.length === 0 && (
        <div className="space-y-2">
          {/*
            The label is CONVERTED but still UNBOUND, and that is reported
            rather than papered over.

            `AutocompleteTagInput` exposes no `id`, so there is nothing for a
            `htmlFor` to name, and the component belongs to plan 41.1-19 — this
            plan does not open it. A `<label>` with no association is the state
            this field arrived in; the class string moves onto §8.6's convention
            and the association is owed to the plan that owns the component.
          */}
          <label className="block text-xs font-semibold text-ink-2">
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
        {/*
          This label CAN be bound, because the control it names lives in this
          file: the file input gains an `id` and the label a `htmlFor`. That is
          D-41-11's convention rather than a new idea, and it is the difference
          between a control announced by its name and one announced as "file
          upload" and nothing else.
        */}
        <label
          htmlFor="event-cover-image"
          className="block text-xs font-semibold text-ink-2"
        >
          Cover Image
        </label>
        {/*
          ── The preview LOST ITS WIDTH CAP, and that is recorded, not hidden ──

          The wrapper carried a container maximum, and D-41-06 says a maximum is
          the shell's and never a page's. It is NOT a typographic measure — no
          text reads across it — so D-41.1-27's declared-measure mechanism does
          not apply and inventing an arbitrary width to satisfy a grep would be
          moving a number without moving the work.

          So the cap is dropped and the preview is as wide as the shell lets it
          be, which is `Card.tsx`'s own sentence. **The consequence is visible**:
          on a desktop the thumbnail becomes a wide 160px-tall strip instead of a
          320px card. It is reversible, it changes no behaviour, and it is a row
          in this plan's human pass rather than something a person meets by
          surprise.
        */}
        {imagePreview && (
          <div className="relative w-full">
            <img
              src={imagePreview}
              alt="Cover preview"
              className="h-40 w-full rounded-xl border border-line object-cover"
            />
            <IconButton
              onClick={clearImage}
              aria-label="Remove image"
              className="absolute top-2 right-2 bg-ground/80"
            >
              <svg
                className="h-5 w-5"
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
            </IconButton>
          </div>
        )}
        {/*
          The file input stays a raw element rather than becoming the text
          control: the shared control string draws a well and a boundary around
          a value, and a file input has no typed value to draw them around. What
          it takes from the system is the part that applies — the 44px floor on
          both the element and the button the browser draws inside it (`file:`),
          and a weight the type scale actually has.

          `accept` is validation, not styling, and is unchanged; so is the
          double check in `handleImageChange`, which is what actually refuses a
          file, since the attribute is only a picker filter.
        */}
        <input
          ref={fileInputRef}
          id="event-cover-image"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleImageChange}
          className="block min-h-11 w-full text-sm text-muted file:mr-4 file:min-h-11 file:rounded-full file:border-0 file:bg-accent/20 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-accent hover:file:bg-accent/30 file:cursor-pointer"
        />
        {/*
          Its own region, its own cause. `handleImageChange` sets one of two
          distinct sentences — a rejected type and a rejected size — and neither
          collapses into the other, nor into the submit failure above. §11's
          `role="alert"` is what makes it reach a reader who is not looking at
          it, which a bare paragraph did not.
        */}
        {imageError && (
          <p role="alert" className="text-sm text-sem-crit">{imageError}</p>
        )}
      </div>

      {/* Aggregated view when sub-events exist */}
      {renderAggregatedView()}

      {/* Sub-Events */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-mono text-xs font-semibold uppercase tracking-widest text-muted">
            Sub-Events
          </h2>
          <Button
            size="sm"
            variant="secondary"
            onClick={addSubEvent}
            className="shrink-0"
          >
            + Add Sub-Event
          </Button>
        </div>
        {subEvents.map((subEvent, index) =>
          renderSubEventSection(subEvent, index)
        )}
      </div>

      {/*
        Submit.

        `type="submit"` is written AFTER the variant props so it reaches the
        element: the ladder writes `type="button"` before its own spread
        precisely so a caller can still say this. Without it the one control
        that saves the form would stop saving it, silently.

        The ink moves from the achromatic light name to the page ground —
        finding A2's arithmetic, 2.91:1 becoming 6.85:1 on the accent fill. The
        label is untouched; §11 introduces no copy.
      */}
      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full"
      >
        {isSubmitting ? "Saving..." : submitLabel}
      </Button>
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
