/** Match backend `lib/slug.js` for category slugs. */
export function slugifyCategory(input: string): string {
  const s = String(input || "")
    .toLowerCase()
    .trim()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return s || "general";
}
