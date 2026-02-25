/**
 * Converts a title to a URL-friendly slug.
 *
 * - Lowercases
 * - Normalizes NFD and removes diacritics
 * - Removes non-alphanumeric chars except spaces and hyphens
 * - Replaces spaces/multiple hyphens with single hyphen
 * - Trims leading/trailing hyphens
 * - Limits to 80 characters
 */
export function slugify(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove diacritics (accents)
    .replace(/[^a-z0-9\s-]/g, "") // Remove non-alphanumeric except spaces and hyphens
    .replace(/[\s-]+/g, "-") // Replace spaces and multiple hyphens with single hyphen
    .replace(/^-+|-+$/g, "") // Trim leading/trailing hyphens
    .substring(0, 80); // Limit length
}
