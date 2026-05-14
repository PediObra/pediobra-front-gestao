import type { MetadataRoute } from "next";
import { absoluteUrl, getSiteUrl } from "@/lib/seo/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/blog", "/blog/"],
      disallow: [
        "/dashboard",
        "/drivers",
        "/login",
        "/orders",
        "/payments",
        "/products",
        "/profile",
        "/seller-products",
        "/sellers",
        "/users",
      ],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
    host: getSiteUrl(),
  };
}
