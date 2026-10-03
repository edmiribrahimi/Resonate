"use client";

import { useRef, useState, useTransition, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import AutocompleteInput, { type AutocompleteOption } from "@/components/ui/AutocompleteInput";
import { Badge, Chip } from "@/components/ui/Chip";
import { Dialog, type DialogStatus } from "@/components/ui/Dialog";
import { SectionHeading } from "@/components/ui/Typography";
import { COVER_REASON_TEXT } from "@/components/events/cover-reasons";
import {
  civilDateLabel,
  durationLabel,
  liveCutTitle,
  nightKey,
  parseDuration,
  slotLabel,
} from "@/lib/livecuts/title";
import { turinToday } from "@/utils/datetime";
import {
  deleteLiveCut,
  publishLiveCut,
  saveLiveCut,
  unpublishLiveCut,
  verifyLiveCutLink,
  type LiveCutRefusal,
  type LiveCutResult,
} from "./actions";

/**
 * The LiveCuts of one event, per party, with the form that adds them inline
 * (phase 52.3, plan 10 — MUS-04, MUS-05, MUS-07; `52.3-UI-SPEC.md` §E).
 *
 * ── Inline, not a dialog ─────────────────────────────────────────────────────
 *
 * The list of form dialogs of 41 §8.3 is closed, and an eight-field form does
 * not enter it for convenience. The form opens in a `Card` under its party's
 * list, behind a disclosure with `aria-expanded`. The one `Dialog` here is the
 * destructive confirmation, with Cancel focused on open.
 *
 * ── The cover takes the stripper's road, and only that road ─────────────────
 *
 * Deposit into the PRIVATE quarantine at `<my id>/<random>.<ext>`, then POST
 * the key to `/api/media/finalize-cover` with `purpose: "livecut"`: the route
 * checks `staff.manage` on this event, strips EXIF/GPS, re-encodes, and writes
 * the JPEG at a key IT generates under `livecuts/`. This file never names the
 * public bucket — `verify:media-strip` (C·cover) reads it for exactly that —
 * and the refusals reuse `COVER_REASON_TEXT`, shared with `EventForm`.
 *
 * ── Every no has its own sentence ────────────────────────────────────────────
 *
 * `REFUSAL_MESSAGES` is a total `Record<LiveCutRefusal, string>`: a new refusal
 * in `actions.ts` is a compile error here until it has words. A disabled
 * publish button always says why underneath it — never a mute button.
 *
 * ── Words ────────────────────────────────────────────────────────────────────
 *
 * The copy says "event", never "night": in the project's English "night" is
 * `re:sonate`, and from this surface the RamaDub LiveCuts are added too. No
 * string alludes to a sound or a scene (`sound-manifesto.md`, check H5). The
 * Mixcloud field is NOT mounted: D-52.3-01 is the owner's, at plan 52.3-13, and
 * the action receives `mixcloudUrl: null` until then.
 */

/* ────────────────────────────────────────────────────────────────────────────
 * Shapes the page hands over
 * ──────────────────────────────────────────────────────────────────────────── */

export type AdminNight = {
  id: string;
  /** `YYYY-MM-DD`, civil date of the party. */
  date: string;
  time: string | null;
  endTime: string | null;
  number: number | null;
  seriesName: string;
  /** `formats.name` — the title carries the FORMAT, never the series (D-52.3-03). */
  formatName: string;
  /** Whether the place guard on the link is active for this party. */
  venueSecret: boolean;
};

export type AdminLiveCut = {
  id: string;
  partyId: string;
  partNumber: number;
  slotStart: string;
  slotEnd: string;
  soundcloudUrl: string;
  durationSeconds: number | null;
  coverUrl: string | null;
  publishedAt: string | null;
  /** In title order. */
  artists: { id: string; name: string }[];
};

export type CatalogArtist = { id: string; name: string };

/* ────────────────────────────────────────────────────────────────────────────
 * Sentences
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * One sentence per refusal. `{part}` and `{code}` are filled by `refusalText`.
 * The ones the copy contract names are written as it names them.
 */
const REFUSAL_MESSAGES: Record<LiveCutRefusal, string> = {
  disabled: "The Music page is switched off, so LiveCuts cannot be changed right now.",
  invalid_input:
    "Part of the form did not have the expected shape, so nothing was saved. Reload the page and try again.",
  party_not_in_event:
    "That date is no longer part of this event, so nothing was saved. Reload the page.",
  livecut_not_in_event:
    "This LiveCut belongs to another event, so it was not changed. Reload the page.",
  not_found: "This LiveCut no longer exists. Reload the page to see the current list.",
  url_not_soundcloud:
    "This is not a SoundCloud track address. Paste the link from the track's page.",
  track_not_found_or_private:
    "SoundCloud can't find this track, or it is private. Check the link and the track's visibility.",
  oembed_unavailable:
    "SoundCloud didn't answer, so the link was not checked. Try again in a minute.",
  track_id_unreadable:
    "SoundCloud answered, but the track could not be read. Try the link again.",
  url_names_venue:
    "This link contains the venue's name, and this event's venue is secret. Rename the track's address on SoundCloud first.",
  invalid_mixcloud: "The Mixcloud link is not a Mixcloud show address, so nothing was saved.",
  invalid_slot:
    "The part must be a number from 1 to 24, and both set times must be filled in.",
  invalid_duration:
    "Write the duration as h:mm:ss or mm:ss, as shown on SoundCloud, under 24 hours.",
  no_artists: "Choose at least one artist from the catalogue.",
  unknown_artist:
    "One of the artists is no longer in the catalogue. Remove it and choose again.",
  cover_not_ours:
    "The cover was not uploaded through this form, so it was refused. Upload it again.",
  night_not_over: "This event hasn't happened yet. Publishing opens the day after.",
  missing_cover: "A LiveCut needs a cover before it can be published. Add the cover and save.",
  slot_taken: "Part {part} already has a LiveCut for this event.",
  refused_by_database: "The database refused the LiveCut ({code}). Nothing was changed.",
  write_failed: "The LiveCut could not be saved ({code}). Nothing was changed.",
};

const TRANSPORT_MESSAGE =
  "We could not reach the server, so we don't know whether the change went through. Reload the page before trying again.";

function refusalText(reason: LiveCutRefusal, code?: string, part?: string): string {
  return REFUSAL_MESSAGES[reason]
    .replace("{part}", part && part.trim() !== "" ? part.trim() : "This")
    .replace("{code}", code ?? "unknown");
}

const PUBLISH_WAITS_FOR_DATE = "Publishing opens the day after the event.";
const PUBLISH_WAITS_FOR_FIELDS =
  "Add the artists, the cover, the duration and a checked link to publish.";

const ACCEPTED_COVER_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_COVER_SIZE = 5 * 1024 * 1024;

/* ────────────────────────────────────────────────────────────────────────────
 * Draft state
 * ──────────────────────────────────────────────────────────────────────────── */

type LinkState =
  | { kind: "idle" }
  | { kind: "checking"; url: string }
  | { kind: "found"; url: string; title: string | null }
  | { kind: "refused"; url: string; text: string };

type Draft = {
  id: string | null;
  partyId: string;
  partNumber: string;
  slotStart: string;
  slotEnd: string;
  artists: { id: string; name: string }[];
  artistQuery: string;
  soundcloudUrl: string;
  durationText: string;
  coverUrl: string | null;
  coverUploading: boolean;
  coverError: string | null;
};

type Feedback = { partyId: string; tone: "done" | "crit"; text: string };

function emptyDraft(partyId: string): Draft {
  return {
    id: null,
    partyId,
    partNumber: "",
    slotStart: "",
    slotEnd: "",
    artists: [],
    artistQuery: "",
    soundcloudUrl: "",
    durationText: "",
    coverUrl: null,
    coverUploading: false,
    coverError: null,
  };
}

function draftFrom(cut: AdminLiveCut): Draft {
  return {
    id: cut.id,
    partyId: cut.partyId,
    partNumber: String(cut.partNumber),
    slotStart: cut.slotStart.slice(0, 5),
    slotEnd: cut.slotEnd.slice(0, 5),
    artists: cut.artists,
    artistQuery: "",
    soundcloudUrl: cut.soundcloudUrl,
    durationText: cut.durationSeconds ? durationLabel(cut.durationSeconds) : "",
    coverUrl: cut.coverUrl,
    coverUploading: false,
    coverError: null,
  };
}

/* ────────────────────────────────────────────────────────────────────────────
 * The cover upload — quarantine, then the stripper
 * ──────────────────────────────────────────────────────────────────────────── */

async function uploadLiveCutCover(
  file: File,
  eventId: string
): Promise<{ ok: true; url: string } | { ok: false; message: string }> {
  const QUARANTINE_BUCKET = "event-media-quarantine";
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    console.error("[livecut_cover.deposit_failed] code=no_session message=no session to deposit with");
    return {
      ok: false,
      message: "Your session has expired, so the cover was not uploaded. Sign in again and retry.",
    };
  }

  const ext =
    ({ "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" } as Record<string, string>)[
      file.type
    ] ?? "bin";
  const quarantinePath = `${user.id}/${crypto.randomUUID()}.${ext}`;

  const { error: depositError } = await supabase.storage
    .from(QUARANTINE_BUCKET)
    .upload(quarantinePath, file, { contentType: file.type, upsert: false });

  if (depositError) {
    console.error(
      `[livecut_cover.deposit_failed] code=${depositError.name} message=the holding area refused the write`
    );
    return {
      ok: false,
      message:
        "The cover could not be placed in the holding area, so it was not published. Nothing was saved; try again.",
    };
  }

  try {
    const response = await fetch("/api/media/finalize-cover", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId, quarantinePath, mimeType: file.type, purpose: "livecut" }),
    });
    const payload: unknown = await response.json().catch(() => null);
    const p = (typeof payload === "object" && payload !== null ? payload : {}) as {
      ok?: unknown;
      publicUrl?: unknown;
      reason?: unknown;
    };

    if (response.ok && p.ok === true && typeof p.publicUrl === "string" && p.publicUrl !== "") {
      return { ok: true, url: p.publicUrl };
    }

    const reason = typeof p.reason === "string" ? p.reason : `http_${response.status}`;
    console.error(`[livecut_cover.finalize_refused] reason=${reason}`);
    return {
      ok: false,
      message:
        COVER_REASON_TEXT[reason] ??
        `The cover was refused with an unrecognised reason (${reason}), so it was not published. Nothing was saved.`,
    };
  } catch {
    console.error("[livecut_cover.finalize_unreachable] code=network message=no answer");
    return {
      ok: false,
      message:
        "We could not reach the server that publishes the cover, so it may or may not have gone through. Nothing was saved; choose the image again.",
    };
  }
}

/* ────────────────────────────────────────────────────────────────────────────
 * The component
 * ──────────────────────────────────────────────────────────────────────────── */

export default function LiveCutForm({
  eventId,
  nights,
  liveCuts,
  catalog,
}: {
  eventId: string;
  nights: AdminNight[];
  liveCuts: AdminLiveCut[];
  catalog: CatalogArtist[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [link, setLink] = useState<LinkState>({ kind: "idle" });
  const latestLink = useRef("");
  const [deleteTarget, setDeleteTarget] = useState<AdminLiveCut | null>(null);
  const [deleteStatus, setDeleteStatus] = useState<DialogStatus | null>(null);
  const [deleteDone, setDeleteDone] = useState(false);

  // Civil date in Turin, compared as a string (`YYYY-MM-DD` is ordered like
  // the dates it spells). The server re-checks with the same function.
  const today = turinToday();
  const disabled = busy || isPending;

  function patch(next: Partial<Draft>) {
    setDraft((current) => (current ? { ...current, ...next } : current));
  }

  async function checkLink(partyId: string, raw: string) {
    const url = raw.trim();
    latestLink.current = url;
    if (url === "") {
      setLink({ kind: "idle" });
      return;
    }
    setLink({ kind: "checking", url });
    try {
      const result = await verifyLiveCutLink(eventId, partyId, url);
      if (latestLink.current !== url) return; // a newer link was typed meanwhile
      if (result.ok) {
        setLink({ kind: "found", url, title: result.soundcloudTitle });
      } else {
        setLink({ kind: "refused", url, text: refusalText(result.reason) });
      }
    } catch {
      if (latestLink.current !== url) return;
      setLink({ kind: "refused", url, text: TRANSPORT_MESSAGE });
    }
  }

  function openNew(partyId: string) {
    setFeedback(null);
    setDraft(emptyDraft(partyId));
    latestLink.current = "";
    setLink({ kind: "idle" });
  }

  function openEdit(cut: AdminLiveCut) {
    setFeedback(null);
    setDraft(draftFrom(cut));
    void checkLink(cut.partyId, cut.soundcloudUrl);
  }

  function closeForm() {
    setDraft(null);
    latestLink.current = "";
    setLink({ kind: "idle" });
  }

  async function handleCover(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !draft) return;
    if (!ACCEPTED_COVER_TYPES.includes(file.type)) {
      patch({ coverError: "Only JPEG, PNG and WebP images can be used as a cover." });
      return;
    }
    if (file.size > MAX_COVER_SIZE) {
      patch({ coverError: "The image must be smaller than 5 MB." });
      return;
    }
    patch({ coverUploading: true, coverError: null });
    const uploaded = await uploadLiveCutCover(file, eventId);
    if (uploaded.ok) {
      patch({ coverUploading: false, coverUrl: uploaded.url, coverError: null });
    } else {
      patch({ coverUploading: false, coverError: uploaded.message });
    }
  }

  function inputOf(d: Draft) {
    return {
      id: d.id,
      partyId: d.partyId,
      partNumber: Number.parseInt(d.partNumber, 10),
      slotStart: d.slotStart,
      slotEnd: d.slotEnd,
      artistIds: d.artists.map((a) => a.id),
      soundcloudUrl: d.soundcloudUrl.trim(),
      mixcloudUrl: null,
      durationText: d.durationText.trim(),
      coverUrl: d.coverUrl,
    };
  }

  async function submit(publish: boolean) {
    if (!draft) return;
    const current = draft;
    setBusy(true);
    setFeedback(null);
    try {
      const saved = await saveLiveCut(eventId, inputOf(current));
      if (!saved.ok) {
        setFeedback({
          partyId: current.partyId,
          tone: "crit",
          text: refusalText(saved.reason, saved.code, current.partNumber),
        });
        return;
      }
      if (!publish) {
        setFeedback({ partyId: current.partyId, tone: "done", text: "Saved as draft." });
        closeForm();
        startTransition(() => router.refresh());
        return;
      }
      const published = await publishLiveCut(eventId, saved.id);
      if (!published.ok) {
        // The draft exists now: keep its id, so a second try updates it
        // instead of inserting a duplicate part.
        patch({ id: saved.id });
        setFeedback({
          partyId: current.partyId,
          tone: "crit",
          text: `${refusalText(published.reason, published.code, current.partNumber)} The LiveCut was saved as a draft.`,
        });
        startTransition(() => router.refresh());
        return;
      }
      setFeedback({
        partyId: current.partyId,
        tone: "done",
        text: "Published. It is on the Music page now.",
      });
      closeForm();
      startTransition(() => router.refresh());
    } catch {
      setFeedback({ partyId: current.partyId, tone: "crit", text: TRANSPORT_MESSAGE });
    } finally {
      setBusy(false);
    }
  }

  async function rowAction(
    cut: AdminLiveCut,
    call: () => Promise<LiveCutResult>,
    successText: string
  ) {
    setBusy(true);
    setFeedback(null);
    try {
      const result = await call();
      if (result.ok) {
        setFeedback({ partyId: cut.partyId, tone: "done", text: successText });
        startTransition(() => router.refresh());
      } else {
        setFeedback({
          partyId: cut.partyId,
          tone: "crit",
          text: refusalText(result.reason, result.code, String(cut.partNumber)),
        });
      }
    } catch {
      setFeedback({ partyId: cut.partyId, tone: "crit", text: TRANSPORT_MESSAGE });
    } finally {
      setBusy(false);
    }
  }

  function openDelete(cut: AdminLiveCut) {
    setDeleteTarget(cut);
    setDeleteStatus(null);
    setDeleteDone(false);
  }

  function closeDelete() {
    setDeleteTarget(null);
    setDeleteStatus(null);
    setDeleteDone(false);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const cut = deleteTarget;
    setBusy(true);
    setDeleteStatus(null);
    try {
      const result = await deleteLiveCut(eventId, cut.id);
      if (result.ok) {
        setDeleteDone(true);
        setDeleteStatus({ tone: "done", message: "Deleted. It is no longer on the Music page." });
        if (draft?.id === cut.id) closeForm();
        startTransition(() => router.refresh());
      } else {
        setDeleteStatus({
          tone: "crit",
          message: refusalText(result.reason, result.code, String(cut.partNumber)),
        });
      }
    } catch {
      setDeleteStatus({ tone: "crit", message: TRANSPORT_MESSAGE });
    } finally {
      setBusy(false);
    }
  }

  async function searchCatalog(query: string): Promise<AutocompleteOption[]> {
    const q = query.trim().toLowerCase();
    const chosen = new Set(draft?.artists.map((a) => a.id) ?? []);
    return catalog
      .filter((a) => !chosen.has(a.id) && a.name.toLowerCase().includes(q))
      .slice(0, 8)
      .map((a) => ({ id: a.id, name: a.name }));
  }

  if (nights.length === 0) {
    return (
      <div className="px-6 py-12 text-center">
        <p className="text-base font-semibold text-ink">No dates on this event yet</p>
        <p className="mt-1 text-sm text-muted">Add a date to the event before adding LiveCuts.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {nights.map((night) => {
        const cuts = liveCuts
          .filter((c) => c.partyId === night.id)
          .sort((a, b) => a.partNumber - b.partNumber);
        const nightOver = night.date < today;
        const formOpen = draft?.partyId === night.id;
        const formId = `livecut-form-${night.id}`;
        const nightFeedback = feedback?.partyId === night.id ? feedback : null;

        return (
          <section key={night.id} aria-labelledby={`livecut-night-${night.id}`}>
            <SectionHeading className="normal-case">
              <span id={`livecut-night-${night.id}`}>
                {nightKey(night.seriesName, night.number)} &middot; {civilDateLabel(night.date)}
              </span>
            </SectionHeading>

            {nightFeedback ? (
              <Card
                role={nightFeedback.tone === "crit" ? "alert" : "status"}
                className="mb-4"
              >
                <p
                  className={`text-sm ${
                    nightFeedback.tone === "crit" ? "text-sem-crit" : "text-sem-done"
                  }`}
                >
                  {nightFeedback.text}
                </p>
              </Card>
            ) : null}

            <Card>
              {cuts.length === 0 ? (
                <div className="px-6 py-8 text-center">
                  <p className="text-base font-semibold text-ink">No LiveCuts for this event</p>
                  <p className="mt-1 text-sm text-muted">
                    Add one for each set once its recording is on SoundCloud.
                  </p>
                </div>
              ) : (
                <ul>
                  {cuts.map((cut, index) => (
                    <li
                      key={cut.id}
                      className={`flex flex-wrap min-h-11 items-center gap-2 py-2 ${
                        index < cuts.length - 1 ? "border-b border-line-soft" : ""
                      }`}
                    >
                      <span className="font-mono text-xs font-semibold text-muted">
                        <span aria-hidden="true">PT{cut.partNumber}</span>
                        <span className="sr-only">Part {cut.partNumber}</span>
                      </span>
                      <span className="text-sm text-ink">
                        {cut.artists.map((a) => a.name).join(" b2b ") || "No artist yet"}
                      </span>
                      <span className="font-mono text-xs text-muted">
                        {slotLabel(cut.slotStart, cut.slotEnd)}
                      </span>
                      {cut.publishedAt ? (
                        <Badge tone="emphasis">Published</Badge>
                      ) : (
                        <Badge>Draft</Badge>
                      )}
                      <span className="ml-auto flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={disabled}
                          onClick={() => openEdit(cut)}
                        >
                          Edit
                        </Button>
                        {cut.publishedAt ? (
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={disabled}
                            onClick={() =>
                              rowAction(
                                cut,
                                () => unpublishLiveCut(eventId, cut.id),
                                "Unpublished. It is no longer on the Music page."
                              )
                            }
                          >
                            Unpublish
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="primary"
                            disabled={disabled}
                            onClick={() =>
                              rowAction(
                                cut,
                                () => publishLiveCut(eventId, cut.id),
                                "Published. It is on the Music page now."
                              )
                            }
                          >
                            Publish
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={disabled}
                          onClick={() => openDelete(cut)}
                        >
                          Delete
                        </Button>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <div className="mt-4">
              <Button
                variant="primary"
                aria-expanded={formOpen}
                aria-controls={formId}
                disabled={disabled || (formOpen && draft?.id === null)}
                onClick={() => openNew(night.id)}
              >
                Add LiveCut
              </Button>
            </div>

            {formOpen && draft ? (
              <Card className="mt-4 space-y-4">
                <div id={formId} className="space-y-4">
                  <p className="text-base font-semibold text-ink">
                    {draft.id ? "Edit LiveCut" : "New LiveCut"}
                  </p>

                  <Input
                    id={`${formId}-part`}
                    label="Part"
                    type="number"
                    min={1}
                    max={24}
                    step={1}
                    hint="Position in the timetable: 1 is the first set."
                    value={draft.partNumber}
                    onChange={(e) => patch({ partNumber: e.target.value })}
                  />

                  <Input
                    id={`${formId}-start`}
                    label="Set starts"
                    type="time"
                    value={draft.slotStart}
                    onChange={(e) => patch({ slotStart: e.target.value })}
                  />

                  <Input
                    id={`${formId}-end`}
                    label="Set ends"
                    type="time"
                    hint="Can be after midnight."
                    value={draft.slotEnd}
                    onChange={(e) => patch({ slotEnd: e.target.value })}
                  />

                  <div className="space-y-2">
                    <label
                      htmlFor={`${formId}-artists`}
                      className="block text-xs font-semibold text-ink-2"
                    >
                      Artists
                    </label>
                    {draft.artists.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {draft.artists.map((artist) => (
                          <Chip
                            key={artist.id}
                            onClick={() =>
                              patch({
                                artists: draft.artists.filter((a) => a.id !== artist.id),
                              })
                            }
                          >
                            <span aria-hidden="true">{artist.name} &times;</span>
                            <span className="sr-only">Remove {artist.name}</span>
                          </Chip>
                        ))}
                      </div>
                    ) : null}
                    {draft.artists.length < 4 ? (
                      <AutocompleteInput
                        id={`${formId}-artists`}
                        value={draft.artistQuery}
                        onChange={(value) => patch({ artistQuery: value })}
                        onSelect={(option) =>
                          patch({
                            artists: [...draft.artists, { id: option.id, name: option.name }],
                            artistQuery: "",
                          })
                        }
                        search={searchCatalog}
                        placeholder="Search the catalogue"
                      />
                    ) : null}
                    <p className="text-xs text-muted">
                      Two names for a b2b, in the order of the title.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Input
                      id={`${formId}-link`}
                      label="SoundCloud link"
                      type="url"
                      inputMode="url"
                      hint="The track's public address: https://soundcloud.com/<account>/<track>"
                      value={draft.soundcloudUrl}
                      error={
                        link.kind === "refused" && link.url === draft.soundcloudUrl.trim()
                          ? link.text
                          : undefined
                      }
                      onChange={(e) => patch({ soundcloudUrl: e.target.value })}
                      onBlur={(e) => {
                        const url = e.target.value.trim();
                        if (link.kind !== "idle" && "url" in link && link.url === url) return;
                        void checkLink(draft.partyId, url);
                      }}
                    />
                    {link.kind === "checking" ? (
                      <p role="status" className="text-xs text-muted">
                        Checking the link on SoundCloud…
                      </p>
                    ) : null}
                    {link.kind === "found" && link.url === draft.soundcloudUrl.trim() ? (
                      <div role="status" className="space-y-1">
                        <p className="text-xs text-muted">
                          Found on SoundCloud: &ldquo;{link.title ?? "untitled"}&rdquo;
                        </p>
                        {draft.artists.length > 0 &&
                        link.title !== liveCutTitle(
                          draft.artists.map((a) => a.name),
                          night.formatName,
                          night.date
                        ) ? (
                          <p className="text-xs text-sem-warn">
                            SoundCloud&apos;s title is different. The page shows &ldquo;
                            {liveCutTitle(
                              draft.artists.map((a) => a.name),
                              night.formatName,
                              night.date
                            )}
                            &rdquo;.
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                  </div>

                  <Input
                    id={`${formId}-duration`}
                    label="Duration"
                    hint="As shown on SoundCloud, h:mm:ss."
                    inputMode="numeric"
                    value={draft.durationText}
                    onChange={(e) => patch({ durationText: e.target.value })}
                  />

                  <div className="space-y-2">
                    <label
                      htmlFor={`${formId}-cover`}
                      className="block text-xs font-semibold text-ink-2"
                    >
                      Cover
                    </label>
                    {draft.coverUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={draft.coverUrl}
                        alt=""
                        className="h-24 w-24 rounded-xl object-cover"
                      />
                    ) : null}
                    <input
                      id={`${formId}-cover`}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleCover}
                      disabled={draft.coverUploading || disabled}
                      aria-describedby={`${formId}-cover-hint`}
                      className="block min-h-11 w-full text-sm text-muted file:mr-4 file:min-h-11 file:rounded-full file:border-0 file:bg-accent/20 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-accent hover:file:bg-accent/30 file:cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                    />
                    <p id={`${formId}-cover-hint`} className="text-xs text-muted">
                      The square LiveCut cover, at least 1920 × 1920. For a secret-venue event,
                      no venue name or place on the image.
                    </p>
                    {draft.coverUploading ? (
                      <p role="status" className="text-xs text-muted">
                        Uploading the cover…
                      </p>
                    ) : null}
                    {draft.coverError ? (
                      <p role="alert" className="text-sm text-sem-crit">
                        {draft.coverError}
                      </p>
                    ) : null}
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-ink-2">Title on the page</p>
                    <p className="text-sm text-ink">
                      {draft.artists.length > 0
                        ? liveCutTitle(
                            draft.artists.map((a) => a.name),
                            night.formatName,
                            night.date
                          )
                        : "Appears once an artist is chosen."}
                    </p>
                  </div>

                  {(() => {
                    const linkChecked =
                      link.kind === "found" && link.url === draft.soundcloudUrl.trim();
                    const complete =
                      draft.artists.length > 0 &&
                      draft.coverUrl !== null &&
                      parseDuration(draft.durationText.trim()) !== null &&
                      linkChecked;
                    const publishReason = !nightOver
                      ? PUBLISH_WAITS_FOR_DATE
                      : !complete
                        ? PUBLISH_WAITS_FOR_FIELDS
                        : null;
                    return (
                      <div className="space-y-2">
                        <div className="flex flex-wrap gap-3">
                          <Button
                            variant="secondary"
                            disabled={disabled || draft.coverUploading}
                            onClick={() => submit(false)}
                          >
                            Save draft
                          </Button>
                          <Button
                            variant="primary"
                            disabled={disabled || draft.coverUploading || publishReason !== null}
                            aria-describedby={publishReason ? `${formId}-publish-reason` : undefined}
                            onClick={() => submit(true)}
                          >
                            Publish LiveCut
                          </Button>
                          <Button variant="ghost" disabled={busy} onClick={closeForm}>
                            Cancel
                          </Button>
                        </div>
                        {publishReason ? (
                          <p id={`${formId}-publish-reason`} className="text-xs text-muted">
                            {publishReason}
                          </p>
                        ) : null}
                      </div>
                    );
                  })()}
                </div>
              </Card>
            ) : null}
          </section>
        );
      })}

      <Dialog
        open={deleteTarget !== null}
        onClose={closeDelete}
        title="Delete this LiveCut?"
        size="md"
        status={deleteStatus}
        actions={
          <div className="flex gap-3">
            {/* Cancel first in the DOM and focused on open: a confirmation whose
                Enter key performs the act is a confirmation that did not ask. */}
            <Button
              variant="secondary"
              className="flex-1"
              data-initial-focus
              onClick={closeDelete}
              disabled={busy}
            >
              {deleteDone ? "Close" : "Cancel"}
            </Button>
            {deleteDone ? null : (
              <Button
                variant="destructive"
                className="flex-1"
                onClick={confirmDelete}
                disabled={busy}
              >
                Delete LiveCut
              </Button>
            )}
          </div>
        }
      >
        <p className="text-sm text-muted">
          It disappears from the Music page at once. The track stays on SoundCloud.
        </p>
      </Dialog>
    </div>
  );
}
