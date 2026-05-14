export interface BlogPostCtaFields {
  ctaTitle?: string | null;
  ctaDescription?: string | null;
  ctaButtonText?: string | null;
  ctaHref?: string | null;
  ctaOpenInNewTab?: boolean | null;
}

const BLOG_CTA_HREF_PATTERN =
  /^(https?:\/\/[^\s]+|\/(?!\/)[^\s]*|mailto:[^\s@]+@[^\s@]+\.[^\s@]+|tel:\+?[0-9][0-9\s().-]*)$/i;

export function trimBlogCtaValue(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : "";
}

export function isValidBlogCtaHref(value?: string | null) {
  const href = trimBlogCtaValue(value);
  return href.length > 0 && BLOG_CTA_HREF_PATTERN.test(href);
}

export function hasBlogPostCta(cta: BlogPostCtaFields) {
  return Boolean(
    trimBlogCtaValue(cta.ctaTitle) &&
      trimBlogCtaValue(cta.ctaButtonText) &&
      isValidBlogCtaHref(cta.ctaHref),
  );
}
