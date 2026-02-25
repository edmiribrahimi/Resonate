"use client";

import { useState, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { validateMediaUpload, registerMedia } from "@/app/(public)/events/[slug]/actions";

// File validation constants
const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/quicktime"];
const ALL_ALLOWED_TYPES = [...ALLOWED_PHOTO_TYPES, ...ALLOWED_VIDEO_TYPES];
const MAX_PHOTO_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB

const ACCEPT_STRING = "image/jpeg,image/png,image/webp,video/mp4,video/quicktime";

interface SelectedFile {
  file: File;
  preview: string;
  type: "photo" | "video";
  error?: string;
}

interface MediaUploadProps {
  eventId: string;
  onUploadComplete?: () => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileExtension(file: File): string {
  const name = file.name;
  const dot = name.lastIndexOf(".");
  if (dot >= 0) return name.slice(dot + 1).toLowerCase();
  // Fallback from MIME type
  const mimeMap: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "video/mp4": "mp4",
    "video/quicktime": "mov",
  };
  return mimeMap[file.type] || "bin";
}

export default function MediaUpload({ eventId, onUploadComplete }: MediaUploadProps) {
  const [files, setFiles] = useState<SelectedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Map<number, "pending" | "uploading" | "done" | "error">>(new Map());
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback((file: File): { valid: boolean; type: "photo" | "video"; error?: string } => {
    const isPhoto = ALLOWED_PHOTO_TYPES.includes(file.type);
    const isVideo = ALLOWED_VIDEO_TYPES.includes(file.type);

    if (!isPhoto && !isVideo) {
      return { valid: false, type: "photo", error: `"${file.name}" -- unsupported file type (${file.type || "unknown"})` };
    }

    const type = isPhoto ? "photo" : "video";
    const maxSize = isPhoto ? MAX_PHOTO_SIZE : MAX_VIDEO_SIZE;

    if (file.size > maxSize) {
      const limit = isPhoto ? "10MB" : "100MB";
      return { valid: false, type, error: `"${file.name}" exceeds ${limit} limit (${formatFileSize(file.size)})` };
    }

    return { valid: true, type };
  }, []);

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    setError(null);
    setSuccessMessage(null);
    const fileArray = Array.from(newFiles);
    const errors: string[] = [];
    const validFiles: SelectedFile[] = [];

    for (const file of fileArray) {
      const result = validateFile(file);
      if (result.valid) {
        validFiles.push({
          file,
          preview: URL.createObjectURL(file),
          type: result.type,
        });
      } else if (result.error) {
        errors.push(result.error);
      }
    }

    if (errors.length > 0) {
      setError(errors.join(". "));
    }

    if (validFiles.length > 0) {
      setFiles((prev) => [...prev, ...validFiles]);
    }
  }, [validateFile]);

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => {
      const removed = prev[index];
      if (removed) URL.revokeObjectURL(removed.preview);
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (e.dataTransfer.files.length > 0) {
        addFiles(e.dataTransfer.files);
      }
    },
    [addFiles]
  );

  const handleUpload = async () => {
    if (files.length === 0 || uploading) return;

    setUploading(true);
    setError(null);
    setSuccessMessage(null);

    // Step 1: Validate upload permission
    let userId: string;
    try {
      const result = await validateMediaUpload(eventId);
      userId = result.userId;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload validation failed");
      setUploading(false);
      return;
    }

    // Step 2: Upload each file
    const supabase = createClient();
    const progressMap = new Map<number, "pending" | "uploading" | "done" | "error">();
    files.forEach((_, i) => progressMap.set(i, "pending"));
    setUploadProgress(new Map(progressMap));

    let allSucceeded = true;

    for (let i = 0; i < files.length; i++) {
      const selectedFile = files[i];
      progressMap.set(i, "uploading");
      setUploadProgress(new Map(progressMap));

      const ext = getFileExtension(selectedFile.file);
      const storagePath = `${eventId}/${userId}/${Date.now()}-${i}.${ext}`;

      try {
        const { error: uploadError } = await supabase.storage
          .from("event-media")
          .upload(storagePath, selectedFile.file);

        if (uploadError) {
          throw uploadError;
        }

        // Register in DB
        await registerMedia(eventId, storagePath, selectedFile.type, selectedFile.file.size);

        progressMap.set(i, "done");
        setUploadProgress(new Map(progressMap));
      } catch (err) {
        progressMap.set(i, "error");
        setUploadProgress(new Map(progressMap));
        allSucceeded = false;
        console.error(`Upload failed for ${selectedFile.file.name}:`, err);
      }
    }

    if (allSucceeded) {
      // Clean up previews
      files.forEach((f) => URL.revokeObjectURL(f.preview));
      setFiles([]);
      setUploadProgress(new Map());
      setSuccessMessage("Media uploaded! It will appear after organizer approval.");
      onUploadComplete?.();
    } else {
      setError("Some files failed to upload. You can retry the failed ones.");
    }

    setUploading(false);
  };

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        className={`relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-colors ${
          dragOver
            ? "border-accent bg-accent/5"
            : "border-card-border hover:border-accent/50"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragEnter={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setDragOver(false);
        }}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <svg className="mb-2 h-8 w-8 text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
          <path d="M12 16V4m0 0l-4 4m4-4l4 4M4 18h16" />
        </svg>
        <p className="text-sm text-muted">
          Drag &amp; drop photos or videos, or <span className="text-accent font-medium">browse</span>
        </p>
        <p className="mt-1 text-xs text-muted/70">
          JPEG, PNG, WebP up to 10MB -- MP4, MOV up to 100MB
        </p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ACCEPT_STRING}
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              addFiles(e.target.files);
              e.target.value = "";
            }
          }}
        />
      </div>

      {/* Error message */}
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Success message */}
      {successMessage && (
        <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-3">
          <p className="text-sm text-green-400">{successMessage}</p>
        </div>
      )}

      {/* Preview grid */}
      {files.length > 0 && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {files.map((selectedFile, index) => {
              const status = uploadProgress.get(index);
              return (
                <div key={index} className="relative rounded-lg bg-card overflow-hidden">
                  <div className="aspect-square">
                    {selectedFile.type === "photo" ? (
                      <img
                        src={selectedFile.preview}
                        alt={selectedFile.file.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-900">
                        <svg className="h-10 w-10 text-white/80" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* File info overlay at bottom */}
                  <div className="absolute bottom-0 left-0 right-0 bg-black/70 px-2 py-1">
                    <p className="truncate text-xs text-white/80">{selectedFile.file.name}</p>
                    <p className="text-xs text-white/50">{formatFileSize(selectedFile.file.size)}</p>
                  </div>

                  {/* Status overlay */}
                  {status === "uploading" && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    </div>
                  )}
                  {status === "done" && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <svg className="h-8 w-8 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                  {status === "error" && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <svg className="h-8 w-8 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    </div>
                  )}

                  {/* Remove button (not during upload) */}
                  {!uploading && (
                    <button
                      type="button"
                      className="absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white/80 hover:bg-black/80 transition-colors"
                      onClick={() => removeFile(index)}
                      aria-label={`Remove ${selectedFile.file.name}`}
                    >
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Upload button */}
          {!uploading && (
            <button
              type="button"
              className="w-full rounded-full bg-accent py-3 font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
              onClick={handleUpload}
              disabled={files.length === 0}
            >
              Upload {files.length} {files.length === 1 ? "file" : "files"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
