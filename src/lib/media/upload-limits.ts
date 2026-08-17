/**
 * The photograph limits a BROWSER has to know — the client-safe half of numbers
 * that already exist on the server.
 *
 * ── Why this module exists, and it is a fact about `server-only` ────────────
 *
 * `strip-metadata.ts` owns the authoritative list of image types this product
 * can strip, and it opens with `import "server-only"` — deliberately, because a
 * gate that ships to the browser is a gate the browser chooses whether to run.
 * So a client component **cannot** import that list, and the alternative is what
 * this repository already had: the three types typed out again inside
 * `MediaUpload.tsx`, and typed out a third time by the next uploader.
 *
 * This file is that second spelling, made **one** instead of many. It is plain,
 * imports nothing, and is safe on both sides of the boundary.
 *
 * ⚠ **THE TWO SPELLINGS MUST MOVE TOGETHER.** `STRIPPABLE_MIME_TYPES` is the
 * one that decides what actually happens to a file; this one decides what a
 * person is allowed to pick. If they diverge, the divergence shows up as an
 * upload accepted by the browser and refused after it has been sent — the worst
 * place to put a type error, because by then somebody has waited for it.
 *
 * The video types are **not** here. They belong to the gallery path only, they
 * live in the two files that use them, and nothing strips them: the archive
 * accepts no video at all, because nothing that cannot be stripped may be kept
 * in an archive that is drawn on months later.
 */

/**
 * The image types both upload surfaces accept, and the mirror of
 * `STRIPPABLE_MIME_TYPES` in `src/lib/media/strip-metadata.ts` — read from those
 * lines rather than rewritten from memory.
 */
export const PHOTO_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

/** What a browser's file picker offers, built from the list above and not beside it. */
export const PHOTO_ACCEPT_STRING = PHOTO_MIME_TYPES.join(",");

/**
 * The ceiling for one photograph, in bytes.
 *
 * 50 MB, and it is the number `MediaUpload.tsx` already enforced — hoisted here
 * rather than restated, so the archive's uploader could not quietly pick a
 * different one. It is well above the 4.5 MB a Vercel Function accepts as a
 * request body, which is exactly why neither uploader sends the bytes through a
 * request: they deposit into the private quarantine bucket and post a key. The
 * reasoning and its source are in the header of
 * `src/app/api/media/finalize/route.ts`.
 */
export const MAX_PHOTO_BYTES = 50 * 1024 * 1024;

/** `52428800` -> `50.0 MB`. Local formatting only; nothing is parsed back. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
