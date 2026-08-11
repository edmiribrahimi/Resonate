"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import {
  updateVenue,
  type UpdateVenueRefusal,
  type UpdateVenueResult,
} from "@/app/(admin)/admin/venues/actions";
import { createClient } from "@/lib/supabase/client";

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
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 rounded-full bg-card border border-card-border px-4 py-2 text-sm text-muted hover:text-foreground transition-colors"
      >
        Edit Profile
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
          onClick={() => !isPending && setOpen(false)}
        >
          <div
            className="w-full max-w-md max-h-[85vh] overflow-y-auto rounded-2xl border border-card-border bg-card p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-4">Edit {venue.name}</h3>

            {error && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 mb-4">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}
            {success && (
              <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-3 mb-4">
                <p className="text-sm text-green-400">Saved!</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Photo */}
              <div>
                <label className="block text-sm font-medium text-muted mb-1">Photo</label>
                <div className="flex items-center gap-3">
                  {photoPreview ? (
                    <Image
                      src={photoPreview}
                      alt="Preview"
                      width={64}
                      height={64}
                      className="h-16 w-16 rounded-2xl object-cover"
                    />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-background text-muted">
                      &#127963;
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handlePhotoChange}
                    className="text-sm text-muted"
                  />
                </div>
              </div>

              {/* Bio */}
              <div>
                <label className="block text-sm font-medium text-muted mb-1">Bio</label>
                <textarea
                  name="bio"
                  rows={3}
                  defaultValue={venue.bio ?? ""}
                  className="w-full rounded-xl border border-card-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
                />
              </div>

              {/* Address */}
              <div>
                <label className="block text-sm font-medium text-muted mb-1">Address</label>
                <input
                  type="text"
                  name="address"
                  defaultValue={venue.address ?? ""}
                  className="w-full rounded-xl border border-card-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
                />
              </div>

              {/* Google Maps */}
              <div>
                <label className="block text-sm font-medium text-muted mb-1">Google Maps URL</label>
                <input
                  type="url"
                  name="google_maps_url"
                  defaultValue={venue.google_maps_url ?? ""}
                  className="w-full rounded-xl border border-card-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
                />
              </div>

              {/* Social links */}
              <div>
                <label className="block text-sm font-medium text-muted mb-1">Instagram URL</label>
                <input
                  type="url"
                  name="instagram_url"
                  defaultValue={venue.instagram_url ?? ""}
                  className="w-full rounded-xl border border-card-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted mb-1">Website URL</label>
                <input
                  type="url"
                  name="website_url"
                  defaultValue={venue.website_url ?? ""}
                  className="w-full rounded-xl border border-card-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  disabled={isPending}
                  className="flex-1 rounded-full border border-card-border py-2.5 text-sm font-medium text-muted hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 rounded-full bg-accent py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
                >
                  {isPending ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
