import type { BlogPostStatus } from "@/lib/api/types";

export function slugifyBlogSlug(value: string) {
  const slug = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "post";
}

export function parseCommaList(value?: string | null) {
  const itemsBySlug = new Map<string, string>();

  for (const item of value?.split(",") ?? []) {
    const label = item.trim();
    if (!label) continue;

    const key = slugifyBlogSlug(label);
    if (!itemsBySlug.has(key)) {
      itemsBySlug.set(key, label);
    }
  }

  return [...itemsBySlug.values()];
}

export function joinCommaList(items: string[]) {
  return parseCommaList(items.join(",")).join(", ");
}

export function getPublishFields(
  publishedAt: string | undefined,
  now = new Date(),
): { status: BlogPostStatus; publishedAt: string } {
  return {
    status: "PUBLISHED",
    publishedAt: publishedAt ? new Date(publishedAt).toISOString() : now.toISOString(),
  };
}

export function toDateTimeLocal(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60_000);
  return localDate.toISOString().slice(0, 16);
}
