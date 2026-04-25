export const SITE_NAME = "PediObra";
export const SITE_LOCALE = "pt_BR";
export const SITE_LANGUAGE = "pt-BR";
export const SITE_TWITTER_CARD = "summary_large_image";

const DEFAULT_SITE_URL = "https://pediobra.com.br";

export function getSiteUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL ?? DEFAULT_SITE_URL;

  try {
    return new URL(configuredUrl).origin;
  } catch {
    return DEFAULT_SITE_URL;
  }
}

export function absoluteUrl(path = "/") {
  const siteUrl = getSiteUrl();
  return new URL(path, siteUrl).toString();
}

export function blogPostUrl(slug: string) {
  return absoluteUrl(`/blog/${slug}`);
}
