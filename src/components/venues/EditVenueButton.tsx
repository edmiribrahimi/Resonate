"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { updateVenue } from "@/app/(admin)/admin/venues/actions";
import { createClient } from "@/lib/supabase/client";

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
      try {
        if (photoFile) {
          const supabase = createClient();
          const ext = photoFile.name.split(".").pop();
          const path = `${venue.id}/${Date.now()}.${ext}`;
          const { error: uploadErr } = await supabase.storage
            .from("venue-photos")
            .upload(path, photoFile, { upsert: true });
          if (uploadErr) throw new Error(`Photo upload failed: ${uploadErr.message}`);
          const { data: urlData } = supabase.storage
            .from("venue-photos")
            .getPublicUrl(path);
          formData.set("photo_url", urlData.publicUrl);
        }

        await updateVenue(venue.id, formData);
        setSuccess(true);
        setTimeout(() => {
          setOpen(false);
          window.location.reload();
        }, 800);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
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
