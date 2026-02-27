"use client";

import { useState, useRef, useEffect, useCallback, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { createArtist } from "@/app/(organizer)/organizer/artists/actions";

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
  const dialogRef = useRef<HTMLDialogElement>(null);
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

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      if (!dialog.open) dialog.showModal();
    } else {
      if (dialog.open) dialog.close();
    }
  }, [open]);

  // Reset all state when modal opens (fixes stale data between consecutive creations)
  useEffect(() => {
    if (open) {
      setBio(""); setInstagramUrl(""); setSoundcloudUrl("");
      setSpotifyUrl(""); setWebsiteUrl("");
      setImageFile(null); setImagePreview(null); setImageError(null); setError(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [open]);

  const handleDialogClose = useCallback(() => {
    onClose();
  }, [onClose]);

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

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      let photoUrl: string | null = null;
      if (imageFile) {
        photoUrl = await uploadPhoto(imageFile);
      }

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
      setError(err instanceof Error ? err.message : "An error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  }

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
    <dialog
      ref={dialogRef}
      className="fixed inset-0 m-0 h-dvh w-dvw max-h-none max-w-none bg-black/80 backdrop:bg-transparent p-0"
      onClose={handleDialogClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) resetAndClose();
      }}
    >
      <div className="flex h-full w-full items-center justify-center p-4">
        <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-card-border bg-background p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-foreground">
              Create Artist Profile
            </h2>
            <button
              type="button"
              onClick={resetAndClose}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-card text-muted hover:text-foreground transition-colors"
              aria-label="Close"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {error && (
            <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name (read-only) */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-foreground">
                Name
              </label>
              <input
                type="text"
                value={name}
                readOnly
                className="w-full rounded-xl border border-card-border bg-card px-4 py-3 text-foreground text-sm opacity-70"
              />
            </div>

            {/* Bio */}
            <div className="space-y-2">
              <label htmlFor="artist-bio" className="block text-sm font-medium text-foreground">
                Bio
              </label>
              <textarea
                id="artist-bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Short bio..."
                rows={3}
                maxLength={2000}
                className="w-full rounded-xl border border-card-border bg-background px-4 py-3 text-foreground placeholder:text-muted outline-none focus:ring-1 focus:ring-accent/50 resize-y text-sm"
              />
            </div>

            {/* Photo */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-foreground">
                Profile Photo
              </label>
              {imagePreview && (
                <div className="relative w-24 h-24">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-24 h-24 rounded-full object-cover border border-card-border"
                  />
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

            {/* Social links */}
            <div className="space-y-2">
              <label htmlFor="artist-instagram" className="block text-sm font-medium text-foreground">
                Instagram URL
              </label>
              <input
                id="artist-instagram"
                type="url"
                value={instagramUrl}
                onChange={(e) => setInstagramUrl(e.target.value)}
                placeholder="https://instagram.com/..."
                className="w-full rounded-xl border border-card-border bg-background px-4 py-3 text-foreground placeholder:text-muted outline-none focus:ring-1 focus:ring-accent/50 text-sm"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="artist-soundcloud" className="block text-sm font-medium text-foreground">
                SoundCloud URL
              </label>
              <input
                id="artist-soundcloud"
                type="url"
                value={soundcloudUrl}
                onChange={(e) => setSoundcloudUrl(e.target.value)}
                placeholder="https://soundcloud.com/..."
                className="w-full rounded-xl border border-card-border bg-background px-4 py-3 text-foreground placeholder:text-muted outline-none focus:ring-1 focus:ring-accent/50 text-sm"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="artist-spotify" className="block text-sm font-medium text-foreground">
                Spotify URL
              </label>
              <input
                id="artist-spotify"
                type="url"
                value={spotifyUrl}
                onChange={(e) => setSpotifyUrl(e.target.value)}
                placeholder="https://open.spotify.com/artist/..."
                className="w-full rounded-xl border border-card-border bg-background px-4 py-3 text-foreground placeholder:text-muted outline-none focus:ring-1 focus:ring-accent/50 text-sm"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="artist-website" className="block text-sm font-medium text-foreground">
                Website
              </label>
              <input
                id="artist-website"
                type="url"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="https://..."
                className="w-full rounded-xl border border-card-border bg-background px-4 py-3 text-foreground placeholder:text-muted outline-none focus:ring-1 focus:ring-accent/50 text-sm"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Creating..." : "Create Profile"}
              </button>
              <button
                type="button"
                onClick={resetAndClose}
                disabled={isSubmitting}
                className="rounded-full border border-card-border px-6 py-3 text-sm font-medium text-muted transition-colors hover:text-foreground disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </dialog>
  );
}
