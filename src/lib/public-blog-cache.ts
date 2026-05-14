export const PUBLIC_BLOG_REVALIDATION_ENDPOINT = "/api/blog/revalidate";

const BLOG_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function normalizePublicBlogSlugs(values: unknown) {
  if (!Array.isArray(values)) return [];

  const slugs = new Set<string>();

  for (const value of values) {
    if (typeof value !== "string") continue;

    const slug = value.trim().toLowerCase();
    if (!BLOG_SLUG_PATTERN.test(slug)) continue;

    slugs.add(slug);
  }

  return [...slugs];
}
