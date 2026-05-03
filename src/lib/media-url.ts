import { getApiUrl } from "@/lib/api/client";

const LOCAL_STORAGE_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
  "[::1]",
]);

function decodePathPart(part: string) {
  try {
    return decodeURIComponent(part);
  } catch {
    return part;
  }
}

function isLocalStorageUrl(url: URL) {
  return (
    LOCAL_STORAGE_HOSTS.has(url.hostname.toLowerCase()) && url.port === "9000"
  );
}

export function resolveMediaUrl(url: string | null | undefined) {
  if (!url) return undefined;

  try {
    const parsedUrl = new URL(url);

    if (!isLocalStorageUrl(parsedUrl)) {
      return url;
    }

    const [bucket, ...objectPath] = parsedUrl.pathname
      .split("/")
      .filter(Boolean)
      .map(decodePathPart);

    if (!bucket || objectPath.length === 0) {
      return url;
    }

    const apiUrl = getApiUrl();
    const proxyUrl = new URL(
      "/storage/object",
      apiUrl.endsWith("/") ? apiUrl : `${apiUrl}/`,
    );
    proxyUrl.searchParams.set("bucket", bucket);
    proxyUrl.searchParams.set("key", objectPath.join("/"));

    return proxyUrl.toString();
  } catch {
    return url;
  }
}
