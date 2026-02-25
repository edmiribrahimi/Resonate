"use client";

import { useState, useRef, type FormEvent, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import TagInput from "@/components/events/TagInput";

interface EventFormProps {
  initialData?: {
    id: string;
    title: string;
    description: string;
    date: string;
    time: string;
    location: string | null;
    location_secret: boolean;
    lineup: string[];
    cover_image: string | null;
    capacity: number | null;
    is_published: boolean;
  };
  action: (
    formData: FormData
  ) => Promise<{ success: boolean; id?: string; error?: string }>;
  submitLabel: string;
}

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

export default function EventForm({
  initialData,
  action,
  submitLabel,
}: EventFormProps) {
  const router = useRouter();

  // Form state
  const [title, setTitle] = useState(initialData?.title ?? "");
  const [description, setDescription] = useState(
    initialData?.description ?? ""
  );
  const [date, setDate] = useState(initialData?.date ?? "");
  const [time, setTime] = useState(initialData?.time ?? "");
  const [location, setLocation] = useState(initialData?.location ?? "");
  const [locationSecret, setLocationSecret] = useState(
    initialData?.location_secret ?? false
  );
  const [lineup, setLineup] = useState<string[]>(initialData?.lineup ?? []);
  const [capacity, setCapacity] = useState(
    initialData?.capacity?.toString() ?? ""
  );

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

  function handleImageChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setImageError(null);

    if (!file) {
      // If editing and user clears, keep existing preview
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
    // Create preview URL
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
    setIsSubmitting(true);

    try {
      // Upload image if a new file was selected
      let coverImageUrl = initialData?.cover_image ?? null;
      if (imageFile) {
        coverImageUrl = await uploadImage(imageFile);
      } else if (!imagePreview) {
        // User explicitly cleared the image
        coverImageUrl = null;
      }

      // Build FormData
      const formData = new FormData();
      formData.set("title", title);
      formData.set("description", description);
      formData.set("date", date);
      formData.set("time", time);
      formData.set("location", location);
      formData.set("location_secret", locationSecret ? "true" : "false");
      formData.set("lineup", JSON.stringify(lineup));
      formData.set("cover_image", coverImageUrl ?? "");
      formData.set("capacity", capacity);

      const result = await action(formData);

      if (result.success) {
        router.push("/organizer/events");
      } else {
        setError(result.error ?? "Something went wrong.");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
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

      {/* Date and Time row */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label
            htmlFor="event-date"
            className="block text-sm font-medium text-foreground"
          >
            Date <span className="text-red-400">*</span>
          </label>
          <input
            id="event-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            className="w-full rounded-xl border border-card-border bg-background px-4 py-3 text-foreground outline-none focus:ring-1 focus:ring-accent/50"
          />
        </div>
        <div className="space-y-2">
          <label
            htmlFor="event-time"
            className="block text-sm font-medium text-foreground"
          >
            Time <span className="text-red-400">*</span>
          </label>
          <input
            id="event-time"
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            required
            className="w-full rounded-xl border border-card-border bg-background px-4 py-3 text-foreground outline-none focus:ring-1 focus:ring-accent/50"
          />
        </div>
      </div>

      {/* Location */}
      <div className="space-y-2">
        <label
          htmlFor="event-location"
          className="block text-sm font-medium text-foreground"
        >
          Location
        </label>
        <input
          id="event-location"
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Venue address"
          className="w-full rounded-xl border border-card-border bg-background px-4 py-3 text-foreground placeholder:text-muted outline-none focus:ring-1 focus:ring-accent/50"
        />
      </div>

      {/* Secret Location toggle */}
      <div className="flex items-center justify-between rounded-xl border border-card-border bg-card px-4 py-3">
        <div>
          <p className="text-sm font-medium text-foreground">
            Secret Location
          </p>
          {locationSecret && (
            <p className="text-xs text-muted mt-0.5">
              Location will be hidden until members purchase a ticket
            </p>
          )}
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={locationSecret}
          onClick={() => setLocationSecret(!locationSecret)}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-accent/50 focus:ring-offset-2 focus:ring-offset-background ${
            locationSecret ? "bg-accent" : "bg-card-border"
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
              locationSecret ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>

      {/* Lineup */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-foreground">
          Lineup
        </label>
        <p className="text-xs text-muted">Press Enter to add artist</p>
        <TagInput
          value={lineup}
          onChange={setLineup}
          placeholder="Artist name"
        />
      </div>

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

      {/* Capacity */}
      <div className="space-y-2">
        <label
          htmlFor="event-capacity"
          className="block text-sm font-medium text-foreground"
        >
          Capacity
        </label>
        <input
          id="event-capacity"
          type="number"
          value={capacity}
          onChange={(e) => setCapacity(e.target.value)}
          placeholder="Leave empty for unlimited"
          min={1}
          className="w-full rounded-xl border border-card-border bg-background px-4 py-3 text-foreground placeholder:text-muted outline-none focus:ring-1 focus:ring-accent/50"
        />
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
  );
}
