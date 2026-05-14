export function getBlogPostDescriptionFromContent({
  content,
  excerpt,
  seoDescription,
}: {
  content: string;
  excerpt?: string | null;
  seoDescription?: string | null;
}) {
  return (seoDescription ?? excerpt ?? stripHtml(content).slice(0, 155)).trim();
}

export function normalizeArticleHtml(html: string, fallbackAlt: string) {
  const safeFallbackAlt = escapeAttribute(fallbackAlt);

  return html
    .replace(/<h1(\s|>)/gi, "<h2$1")
    .replace(/<\/h1>/gi, "</h2>")
    .replace(/<img\b(?![^>]*\balt=)/gi, `<img alt="${safeFallbackAlt}"`)
    .replace(/<img\b(?![^>]*\bloading=)/gi, '<img loading="lazy"')
    .replace(/<img\b(?![^>]*\bdecoding=)/gi, '<img decoding="async"')
    .replace(/<a\b(?![^>]*\brel=)/gi, '<a rel="noopener noreferrer"');
}

export function stripHtml(value: string) {
  return value
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeAttribute(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
