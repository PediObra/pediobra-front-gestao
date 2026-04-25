import type { NextConfig } from "next";

function remotePatternFromOrigin(origin: string) {
  try {
    const url = new URL(origin);

    return {
      protocol: url.protocol.replace(":", "") as "http" | "https",
      hostname: url.hostname,
      port: url.port,
      pathname: "/**",
    };
  } catch {
    return null;
  }
}

const configuredImagePatterns = [
  process.env.NEXT_PUBLIC_MEDIA_URL,
  process.env.NEXT_PUBLIC_API_URL,
  process.env.NEXT_PUBLIC_SITE_URL,
]
  .flatMap((value) => value?.split(",") ?? [])
  .map((value) => remotePatternFromOrigin(value.trim()))
  .filter((value): value is NonNullable<typeof value> => Boolean(value));

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      ...configuredImagePatterns,
      {
        protocol: "http",
        hostname: "localhost",
        port: "9000",
        pathname: "/**",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "9000",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "**",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
