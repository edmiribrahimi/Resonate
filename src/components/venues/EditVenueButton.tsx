"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import {
  updateVenue,
  type UpdateVenueRefusal,
  type UpdateVenueResult,
} from "@/app/(admin)/admin/venues/actions";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Input, Textarea } from "@/components/ui/Input";

/**
 * Edit a venue — the dialog the venue detail surface mounts.
 *
 * ── The shell is no longer here (plan 41.1-07) ───────────────────────────────
 *
 * This file held the last hand-rolled overlay on the work surface that nothing
 * else reached: its only importer is
 * `src/app/(admin)/admin/(work)/venues/[slug]/page.tsx`. Three things left
 * outright and none of them was restyled — the fixed full-screen overlay with
 * its own stacking index and blur, the panel with its own width cap, scroll cap,
 * radius, boundary, ground and padding, and the modal's own heading element. The
 * primitive owns the shell, and `title` **is** the heading.
 *
 * What arrives with it comes from the platform rather than from this file:
 * `showModal()` supplies **Escape, the focus trap, background inertness and the
 * top layer by specification**. The overlay this replaces handled none of the
 * three. The one visible consequence worth stating rather than discovering:
 * Escape now closes this dialog, where before it did nothing. A save already in
 * flight still completes — the buttons are disabled while it runs, and the
 * reload on success is unchanged.
 *
 * ── The refusal is a prop, and that is what deleted the colours ──────────────
 *
 * The two hand-rolled boxes that stood here carried four raw palette values — a
 * red-family boundary, ground and ink for the failure, a green-family set for
 * the success. They are not recoloured: they are **gone**, replaced by the
 * primitive's `status` region, which renders `role="alert"` for the critical
 * tone and `role="status"` otherwise, in the two semantic tokens. The sentences
 * themselves are untouched — `REFUSAL_SENTENCE` below is still total over
 * {@link UpdateVenueRefusal}, and `describeRefusal` still makes an unforeseen
 * cause name itself on screen.
 *
 * ── The buttons are outside the form, on purpose ─────────────────────────────
 *
 * The primitive puts its actions region **below** the scroller, so a submit
 * control written inside the form would scroll away from the person who needs
 * it. `form={FORM_ID}` is HTML's form-owner attribute and not a workaround: it
 * keeps both routes to submission identical, Enter inside a field and the
 * button.
 */

/**
 * The form's name, so the submit control can address it from the actions region.
 */
const FORM_ID = "edit-venue-form";

/**
 * One sentence per cause — WR-08.
 *
 * The `Record` is **total** over {@link UpdateVenueRefusal} on purpose: a new
 * refusal in the action becomes a compile error here rather than a blank panel.
 * Same shape, and the same reason, as `REFUSAL_SENTENCE` in
 * `admin/events/[id]/reveal/RevealVenueDialog.tsx:123`.
 *
 * What this replaces was one bucket — `err.message` or *"Something went
 * wrong"* — into which a policy refusal, a deleted venue and a network fault
 * all fell, and in a production build the first of those arrived redacted by
 * Next anyway. That is the newsletter defect recorded in
 * `.planning/codebase/CONCERNS.md`, and this product has no error tracking, so
 * what is written here is the whole of what anybody will ever learn.
 */
const REFUSAL_SENTENCE: Record<UpdateVenueRefusal, string> = {
  not_permitted:
    "Nothing was saved. This account may not edit the catalogue. The Edit button is drawn for every organizer, but writing a venue also requires an approved status — if this account is still waiting for approval, that is the reason, and nothing about the venue has changed.",
  identity_missing:
    "Nothing was saved. The server could not tell who is asking. This is NOT a refusal on the merits: a database migration is missing on this deployment. Report it — trying again will do the same thing.",
  not_found_or_refused:
    "Nothing was saved. The database matched no venue to update, and there are exactly two ways that happens: the venue was deleted while this form was open, or a row-level policy refused the write. Reload the page — if the venue is still there, it was the policy.",
  write_failed:
    "Nothing was saved. The database refused the write. Nothing about this venue has changed.",
};

/**
 * The lookup is widened to `string` deliberately: the value crosses the network
 * from a Server Action, so a value outside the union is possible at runtime
 * even though it is impossible at build time. It names itself on screen rather
 * than borrowing a sentence written for something else.
 */
function describeRefusal(reason: UpdateVenueRefusal): string {
  const known = (REFUSAL_SENTENCE as Record<string, string | undefined>)[
    reason
  ];
  return (
    known ??
    `Nothing was saved. The server refused this with "${reason}", which this form does not expect. Nothing about this venue has changed.`
  );
}

interface Venue {
  id: string;
  name: string;
  bio: string | null;
  address: string | null;
  google_maps_url: string | null;
  photo_url: string | null;
  instagram_url: string | null;
  website_url: string | null;
}

export default function EditVenueButton({ venue }: { venue: Venue }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(venue.photo_url);
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  /**
   * The one close route the primitive calls — the close control, Escape, or the
   * platform's own close event. Resetting the refusal here and nowhere else is
   * what stops a stale sentence from being on screen the next time this opens.
   */
  function close() {
    setError(null);
    setSuccess(false);
    setOpen(false);
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("Photo must be under 5MB");
      return;
    }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    const form = e.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      if (photoFile) {
        const supabase = createClient();
        const ext = photoFile.name.split(".").pop();
        const path = `${venue.id}/${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from("venue-photos")
          .upload(path, photoFile, { upsert: true });
        if (uploadErr) {
          // Its own sentence, and its own moment: this failed in the browser,
          // before the server was asked anything, so the venue is untouched and
          // the other fields were never submitted. The message is readable here
          // because it never crossed a Server Action boundary.
          setError(
            `Nothing was saved. The photo could not be uploaded, so the form was not submitted: ${uploadErr.message}`
          );
          return;
        }
        const { data: urlData } = supabase.storage
          .from("venue-photos")
          .getPublicUrl(path);
        formData.set("photo_url", urlData.publicUrl);
      }

      let result: UpdateVenueResult;
      try {
        result = await updateVenue(venue.id, formData);
      } catch {
        // The action did not come back at all: the request never arrived, or it
        // threw for a reason it does not name. The thrown message is
        // deliberately NOT read — Next redacts it in a production build, so
        // printing it would show a paragraph about a digest and say nothing.
        setError(
          "Nothing was saved. The request never came back from the server. Check the connection and try again; if it keeps happening, the deployment is refusing this call before it reaches the venue, and the reason is only in the server logs."
        );
        return;
      }

      if (!result.ok) {
        setError(describeRefusal(result.reason));
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        setOpen(false);
        window.location.reload();
      }, 800);
    });
  }

  return (
    <>
      <Button
        variant="secondary"
        size="sm"
        className="mt-3"
        onClick={() => setOpen(true)}
      >
        Edit Profile
      </Button>

      <Dialog
        open={open}
        onClose={close}
        title={`Edit ${venue.name}`}
        /*
          `lg` because §8.3's closed list names this file there: it is a form
          dialog with six fields, and the list is what decides, not the count.
        */
        size="lg"
        /*
          The failure and the success are ONE region and it is the primitive's.
          The failure wins when both are somehow set, because a person who needs
          to read why nothing was saved must not be shown a tick instead.
        */
        status={
          error
            ? { tone: "crit", message: error }
            : success
              ? { tone: "done", message: "Saved!" }
              : null
        }
        actions={
          <div className="flex gap-3">
            <Button
              type="submit"
              form={FORM_ID}
              className="flex-1"
              disabled={isPending}
            >
              {isPending ? "Saving..." : "Save"}
            </Button>
            <Button
              variant="secondary"
              data-initial-focus
              onClick={close}
              disabled={isPending}
            >
              Cancel
            </Button>
          </div>
        }
      >
        <form id={FORM_ID} onSubmit={handleSubmit} className="space-y-4">
          {/* Photo — the preview beside the control it changes. */}
          <div className="flex items-center gap-3">
            {photoPreview ? (
              <Image
                src={photoPreview}
                alt="Preview"
                width={64}
                height={64}
                className="h-16 w-16 shrink-0 rounded-2xl object-cover"
              />
            ) : (
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-sunk text-muted">
                &#127963;
              </div>
            )}
            <div className="min-w-0 flex-1">
              <Input
                id="venue-photo"
                label="Photo"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handlePhotoChange}
              />
            </div>
          </div>

          <Textarea
            id="venue-bio"
            label="Bio"
            name="bio"
            rows={3}
            defaultValue={venue.bio ?? ""}
          />

          {/*
            The address. It is the one field on this form that carries a
            venue's location, and the form neither reveals nor conceals: what
            an address means to a public surface is decided by the reveal
            state on the party, not here (`venue-secrecy.md`). This control is
            the same control it was, on the shared contract.
          */}
          <Input
            id="venue-address"
            label="Address"
            type="text"
            name="address"
            defaultValue={venue.address ?? ""}
          />

          <Input
            id="venue-google-maps-url"
            label="Google Maps URL"
            type="url"
            name="google_maps_url"
            defaultValue={venue.google_maps_url ?? ""}
          />

          <Input
            id="venue-instagram-url"
            label="Instagram URL"
            type="url"
            name="instagram_url"
            defaultValue={venue.instagram_url ?? ""}
          />

          <Input
            id="venue-website-url"
            label="Website URL"
            type="url"
            name="website_url"
            defaultValue={venue.website_url ?? ""}
          />
        </form>
      </Dialog>
    </>
  );
}
