"use client";

import { useRef, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { createVenue } from "@/app/(admin)/admin/venues/actions";
import { Button, FOCUS_RING } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Input, Textarea } from "@/components/ui/Input";

/**
 * Create a venue profile — the dialog the event form mounts when a name the
 * organiser typed matches nothing.
 *
 * ── The shell is no longer here ──────────────────────────────────────────────
 *
 * This file was the **ancestor** of the copy tree: `RetireFormatDialog.tsx`
 * names it as its source, and `RevealVenueDialog.tsx` names that one in turn.
 * `src/components/ui/Dialog.tsx` was extracted from it in phase 41, and this is
 * the plan that pays the debt back into the file it came from. What arrived with
 * the primitive: the panel, the scrim, the sheet form below 768 px, the light
 * dismiss handler, a 44 × 44 close control in place of the 32 px one, an
 * accessible name this dialog did not have, and — the part no class string
 * shows — Escape, the focus trap and the inert background, all four from
 * `showModal()` by specification rather than from a copy.
 *
 * Its width is `lg` because §8.3's closed list names it there.
 *
 * ── What this file does NOT do, and the reason is the domain ─────────────────
 *
 * It writes a venue, and a venue is the object `venue-secrecy.md` is about. The
 * conversion moved colour, type, spacing, touch targets and the dialog shell.
 * It moved **no field mapping, no validation attribute and no conditional
 * governing whether a name or an address is shown**: the address field is the
 * same field, in the same place, writing the same key, and there is no preview,
 * no map and no geocode display here — not before, and deliberately not after.
 * The secrecy flag is the event form's field and is not reachable from this
 * file at all.
 *
 * ── Initial focus: the close control, which is what it already was ───────────
 *
 * No `data-initial-focus` marker is declared, so `Dialog` falls back to the
 * close control (`Dialog.tsx:246-258`). That is the same element the user agent
 * focused before this conversion — it is first in the DOM — so the focus target
 * did not move. The analog declares the marker on its Cancel; a form dialog gets
 * nothing from moving focus between two equally harmless controls, and not
 * moving it is the smaller claim.
 *
 * ── The refusal, and the half of it this file cannot reach ───────────────────
 *
 * The hand-rolled red panel is gone: the outcome travels as the primitive's
 * `status` region, which renders `role="alert"` for the critical tone in the
 * semantic ink (`Dialog.tsx:316-322`). What changed with it is the **number of
 * sentences**, and that is deliberate. The incumbent `catch` printed one
 * message for every cause, which is the shape `meta-gates.md` records as this
 * repository's own precedent not to repeat — and worse than it looks, because
 * **Next redacts the message of an error thrown out of a Server Action in a
 * production build**, so every server-side cause arrived as the same generic
 * paragraph. Three causes are distinguishable from here and each gets its own
 * sentence, branched on the **stage** the failure happened in rather than on
 * message text, which is the same discipline `CreateFormatModal.tsx:340-353`
 * applies to its two throwing paths.
 *
 * **The fourth distinction is not available from this file.** Telling a
 * duplicate name from a missing name from a refused write needs
 * `createVenue` to return a typed refusal instead of throwing — the argument
 * `admin/venues/actions.ts:186-202` already makes for `updateVenue` — and that
 * action is not on this plan's authorised file list. It is recorded as owed
 * rather than half-done here, because a conversion commit is the wrong place to
 * change what a write returns.
 */

/**
 * The form's name, so the submit control can address it from outside.
 *
 * The primitive puts the actions in their own region below the scroller, so the
 * buttons are not descendants of the `<form>`. `form="…"` is HTML's form-owner
 * attribute, which is the mechanism for exactly this, and it keeps both routes
 * to submission identical: Enter inside a field, and the button.
 */
const FORM_ID = "create-venue-form";

/** Where a failure happened. It is what the sentences below branch on. */
type Stage = "photo" | "create";

interface CreateVenueModalProps {
  name: string;
  open: boolean;
  onClose: () => void;
  onCreated: (id: string, slug: string) => void;
}

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

export default function CreateVenueModal({
  name,
  open,
  onClose,
  onCreated,
}: CreateVenueModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [bio, setBio] = useState("");
  const [address, setAddress] = useState("");
  const [googleMapsUrl, setGoogleMapsUrl] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      .from("venue-photos")
      .upload(path, file, { cacheControl: "3600", upsert: false });

    if (uploadError) {
      throw new Error(`Image upload failed: ${uploadError.message}`);
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("venue-photos").getPublicUrl(path);

    return publicUrl;
  }

  /**
   * One sentence per cause, and each one names what happened and whether
   * anything was written.
   *
   * The photo arm runs in the browser, so its underlying message is readable
   * and is carried through. The other two are branched on shape — a network
   * fault never reaches server code, and everything else did reach it — because
   * a production build redacts what the server said.
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

    return "Could not create the profile. The server refused the write, and in a production build its own reason does not reach this screen. Nothing was created. Check that no other venue already holds this name, and that this account still has permission to manage the catalogue.";
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
      formData.set("address", address);
      formData.set("google_maps_url", googleMapsUrl);
      formData.set("photo_url", photoUrl ?? "");
      formData.set("instagram_url", instagramUrl);
      formData.set("website_url", websiteUrl);

      const result = await createVenue(formData);
      onCreated(result.id, result.slug);
    } catch (err) {
      setError(describeFailure(stage, err));
    } finally {
      setIsSubmitting(false);
    }
  }

  /**
   * Every close route lands here, because the primitive calls `onClose` for the
   * close control, for Escape and for the platform's own close event alike. The
   * incumbent reset on two of the three, so an Escape left the last refusal and
   * the last half-typed bio on screen at the next open.
   */
  function resetAndClose() {
    setBio("");
    setAddress("");
    setGoogleMapsUrl("");
    setInstagramUrl("");
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
      title="Create Venue Profile"
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
        {/* Name — carried in from the event form, not editable here. */}
        <Input
          id="venue-name"
          label="Name"
          type="text"
          value={name}
          readOnly
          className="opacity-70"
        />

        <Textarea
          id="venue-bio"
          label="Bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Short description..."
          rows={3}
          maxLength={2000}
          className="resize-y"
        />

        {/*
          The address field, unchanged in every respect that decides who can see
          an address: same key, same place, same absence of a preview.
        */}
        <Input
          id="venue-address"
          label="Address"
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Street address..."
        />

        <Input
          id="venue-maps"
          label="Google Maps URL"
          type="url"
          value={googleMapsUrl}
          onChange={(e) => setGoogleMapsUrl(e.target.value)}
          placeholder="https://maps.google.com/..."
        />

        {/*
          The one field with no primitive. §8.6 specifies three text-entry
          controls and no file control, so the label, the failure region and the
          association between them are written here in the same order and with
          the same tokens `Input` uses — rather than a fourth control being
          published from inside a conversion (D-41-04).
        */}
        <div className="space-y-2">
          <label
            htmlFor="venue-photo"
            className="block text-xs font-semibold text-ink-2"
          >
            Photo
          </label>
          {imagePreview && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={imagePreview}
              alt="Preview"
              className="h-24 w-24 rounded-xl border border-line object-cover"
            />
          )}
          <input
            ref={fileInputRef}
            id="venue-photo"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleImageChange}
            {...(imageError
              ? { "aria-invalid": true, "aria-describedby": "venue-photo-error" }
              : null)}
            className={`block min-h-11 w-full text-sm text-muted file:mr-4 file:min-h-11 file:cursor-pointer file:rounded-full file:border file:border-control file:bg-transparent file:px-4 file:text-xs file:font-semibold file:text-ink ${FOCUS_RING}`}
          />
          {imageError && (
            <p
              id="venue-photo-error"
              role="alert"
              className="text-xs text-sem-crit"
            >
              {imageError}
            </p>
          )}
        </div>

        <Input
          id="venue-instagram"
          label="Instagram URL"
          type="url"
          value={instagramUrl}
          onChange={(e) => setInstagramUrl(e.target.value)}
          placeholder="https://instagram.com/..."
        />

        <Input
          id="venue-website"
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
