"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { createArtist } from "@/app/(admin)/admin/artists/actions";
import { Button, FOCUS_RING } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Input, Textarea } from "@/components/ui/Input";

/**
 * Create an artist profile — the dialog the event form mounts from the lineup
 * field when a typed name matches nothing.
 *
 * ── The shell is no longer here ──────────────────────────────────────────────
 *
 * It was byte-identical to `CreateVenueModal.tsx`'s, which is the ancestor
 * `src/components/ui/Dialog.tsx` was extracted from. Both are converted in the
 * same plan, so the two copies leave together. What arrived with the primitive:
 * the panel, the scrim, the sheet form below 768 px, the light dismiss handler,
 * a 44 × 44 close control in place of the 32 px one, an accessible name this
 * dialog did not have, and Escape, the focus trap and the inert background —
 * from `showModal()` by specification, not from a listener anybody has to
 * maintain.
 *
 * Its width is `lg` because §8.3's closed list names it there.
 *
 * ── The name is published verbatim, and that is a production rule ────────────
 *
 * An artist name is read off a poster and out of a caption, and
 * `brand-visual-system.md` requires the spelling to be verified at the source
 * before anything is produced with it. Nothing in this file transforms the
 * name: it arrives from the event form and is rendered read-only. The
 * conversion added no filter, no casing rule and no placeholder describing what
 * anybody plays — three of the four formats have no written manifesto and a
 * placeholder is not the place to write one (`sound-manifesto.md`).
 *
 * ── Initial focus: the close control, which is what it already was ───────────
 *
 * No `data-initial-focus` marker is declared, so `Dialog` falls back to the
 * close control (`Dialog.tsx:246-258`) — the same element the user agent
 * focused before, because it is first in the DOM. The focus target did not move.
 *
 * ── The refusal, and the half of it this file cannot reach ───────────────────
 *
 * The hand-rolled red panel is gone: the outcome travels as the primitive's
 * `status` region, `role="alert"` in the semantic ink. The number of sentences
 * changed with it, deliberately: the incumbent `catch` printed one message for
 * every cause — the shape `meta-gates.md` records as this repository's own
 * precedent not to repeat — and **Next redacts the message of an error thrown
 * out of a Server Action in a production build**, so every server-side cause
 * arrived as the same generic paragraph. Three causes are distinguishable from
 * here and each gets its own sentence, branched on the **stage** rather than on
 * message text.
 *
 * **The fourth distinction is not available from this file.** Telling a
 * duplicate name from a missing name from a refused write needs `createArtist`
 * to return a typed refusal instead of throwing, and that action is not on this
 * plan's authorised file list. Recorded as owed rather than half-done.
 */

/**
 * The form's name, so the submit control can address it from outside the
 * `<form>` — the actions region sits below the scroller, so a submit inside the
 * form would scroll away. `form="…"` is HTML's form-owner attribute.
 */
const FORM_ID = "create-artist-form";

/** Where a failure happened. It is what the sentences below branch on. */
type Stage = "photo" | "create";

interface CreateArtistModalProps {
  name: string;
  open: boolean;
  onClose: () => void;
  onCreated: (slug: string) => void;
}

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

export default function CreateArtistModal({
  name,
  open,
  onClose,
  onCreated,
}: CreateArtistModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [bio, setBio] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [soundcloudUrl, setSoundcloudUrl] = useState("");
  const [spotifyUrl, setSpotifyUrl] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset all state when modal opens (fixes stale data between consecutive creations)
  useEffect(() => {
    if (open) {
      setBio(""); setInstagramUrl(""); setSoundcloudUrl("");
      setSpotifyUrl(""); setWebsiteUrl("");
      setImageFile(null); setImagePreview(null); setImageError(null); setError(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [open]);

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setImageError(null);

    if (!file) return;

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
    setImagePreview(URL.createObjectURL(file));
  }

  async function uploadPhoto(file: File): Promise<string> {
    const supabase = createClient();
    const timestamp = Date.now();
    const sanitized = file.name
      .replace(/[^a-zA-Z0-9._-]/g, "-")
      .toLowerCase();
    const path = `photos/${timestamp}-${sanitized}`;

    const { error: uploadError } = await supabase.storage
      .from("artist-photos")
      .upload(path, file, { cacheControl: "3600", upsert: false });

    if (uploadError) {
      throw new Error(`Image upload failed: ${uploadError.message}`);
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("artist-photos").getPublicUrl(path);

    return publicUrl;
  }

  /**
   * One sentence per cause. The photo arm runs in the browser, so its
   * underlying message is readable and is carried through; the other two are
   * branched on shape, because a production build redacts what the server said.
   */
  function describeFailure(stage: Stage, err: unknown): string {
    if (stage === "photo") {
      const detail = err instanceof Error ? err.message : String(err);
      return `Could not create the profile. The photo could not be uploaded, so nothing was created — ${detail} Remove the photo and try again, or create the profile without one.`;
    }

    const unreachable =
      err instanceof TypeError ||
      (typeof navigator !== "undefined" && navigator.onLine === false);

    if (unreachable) {
      return "Could not create the profile. The request never reached the server. Nothing was created — check the connection and try again.";
    }

    return "Could not create the profile. The server refused the write, and in a production build its own reason does not reach this screen. Nothing was created. Check that no other artist already holds this name, and that this account still has permission to manage the catalogue.";
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    let stage: Stage = "photo";

    try {
      let photoUrl: string | null = null;
      if (imageFile) {
        photoUrl = await uploadPhoto(imageFile);
      }

      stage = "create";

      const formData = new FormData();
      formData.set("name", name);
      formData.set("bio", bio);
      formData.set("photo_url", photoUrl ?? "");
      formData.set("instagram_url", instagramUrl);
      formData.set("soundcloud_url", soundcloudUrl);
      formData.set("spotify_url", spotifyUrl);
      formData.set("website_url", websiteUrl);

      const result = await createArtist(formData);
      onCreated(result.slug);
    } catch (err) {
      setError(describeFailure(stage, err));
    } finally {
      setIsSubmitting(false);
    }
  }

  /**
   * Every close route lands here, because the primitive calls `onClose` for the
   * close control, for Escape and for the platform's own close event alike.
   */
  function resetAndClose() {
    setBio("");
    setInstagramUrl("");
    setSoundcloudUrl("");
    setSpotifyUrl("");
    setWebsiteUrl("");
    setImageFile(null);
    setImagePreview(null);
    setImageError(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    onClose();
  }

  return (
    <Dialog
      open={open}
      onClose={resetAndClose}
      title="Create Artist Profile"
      size="lg"
      status={error ? { tone: "crit", message: error } : null}
      actions={
        <div className="flex gap-3">
          <Button
            type="submit"
            form={FORM_ID}
            className="flex-1"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Creating..." : "Create Profile"}
          </Button>
          <Button
            variant="secondary"
            onClick={resetAndClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        </div>
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit} className="space-y-4">
        {/* Name — carried in from the lineup field, rendered verbatim. */}
        <Input
          id="artist-name"
          label="Name"
          type="text"
          value={name}
          readOnly
          className="opacity-70"
        />

        <Textarea
          id="artist-bio"
          label="Bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Short bio..."
          rows={3}
          maxLength={2000}
          className="resize-y"
        />

        {/*
          The one field with no primitive — §8.6 specifies three text-entry
          controls and no file control. The label, the failure region and the
          association between them are written here with the tokens `Input`
          uses, rather than a fourth control being published inside a conversion.
        */}
        <div className="space-y-2">
          <label
            htmlFor="artist-photo"
            className="block text-xs font-semibold text-ink-2"
          >
            Profile Photo
          </label>
          {imagePreview && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={imagePreview}
              alt="Preview"
              className="h-24 w-24 rounded-full border border-line object-cover"
            />
          )}
          <input
            ref={fileInputRef}
            id="artist-photo"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleImageChange}
            {...(imageError
              ? { "aria-invalid": true, "aria-describedby": "artist-photo-error" }
              : null)}
            className={`block min-h-11 w-full text-sm text-muted file:mr-4 file:min-h-11 file:cursor-pointer file:rounded-full file:border file:border-control file:bg-transparent file:px-4 file:text-xs file:font-semibold file:text-ink ${FOCUS_RING}`}
          />
          {imageError && (
            <p
              id="artist-photo-error"
              role="alert"
              className="text-xs text-sem-crit"
            >
              {imageError}
            </p>
          )}
        </div>

        <Input
          id="artist-instagram"
          label="Instagram URL"
          type="url"
          value={instagramUrl}
          onChange={(e) => setInstagramUrl(e.target.value)}
          placeholder="https://instagram.com/..."
        />

        <Input
          id="artist-soundcloud"
          label="SoundCloud URL"
          type="url"
          value={soundcloudUrl}
          onChange={(e) => setSoundcloudUrl(e.target.value)}
          placeholder="https://soundcloud.com/..."
        />

        <Input
          id="artist-spotify"
          label="Spotify URL"
          type="url"
          value={spotifyUrl}
          onChange={(e) => setSpotifyUrl(e.target.value)}
          placeholder="https://open.spotify.com/artist/..."
        />

        <Input
          id="artist-website"
          label="Website"
          type="url"
          value={websiteUrl}
          onChange={(e) => setWebsiteUrl(e.target.value)}
          placeholder="https://..."
        />
      </form>
    </Dialog>
  );
}
