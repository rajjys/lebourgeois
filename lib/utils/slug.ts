/**
 * URL slug: lowercase, accents stripped, non-alphanumerics collapsed to "-".
 * Same rules as the SQL backfill in the data_foundation migration.
 */
export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
