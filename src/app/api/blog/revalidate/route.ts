import { revalidatePath } from "next/cache";
import type { NextRequest } from "next/server";
import { API_URL } from "@/lib/api/base-url";
import { normalizePublicBlogSlugs } from "@/lib/public-blog-cache";

export const dynamic = "force-dynamic";

type AuthResult =
  | { ok: true }
  | { ok: false; status: 401 | 403 | 502; message: string };

export async function POST(request: NextRequest) {
  const authorization = request.headers.get("authorization");

  const auth = await verifyAdmin(authorization);
  if (!auth.ok) {
    return Response.json({ message: auth.message }, { status: auth.status });
  }

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const slugs = normalizePublicBlogSlugs(
    body && typeof body === "object" && "slugs" in body ? body.slugs : [],
  );

  revalidatePublicBlogPaths(slugs);

  return Response.json({
    revalidated: true,
    slugs,
  });
}

async function verifyAdmin(
  authorization: string | null,
): Promise<AuthResult> {
  if (!authorization?.startsWith("Bearer ")) {
    return { ok: false, status: 401, message: "Missing bearer token." };
  }

  try {
    const response = await fetch(buildApiUrl("/auth/me"), {
      cache: "no-store",
      headers: {
        Accept: "application/json",
        Authorization: authorization,
      },
    });

    if (response.status === 401) {
      return { ok: false, status: 401, message: "Invalid bearer token." };
    }

    if (!response.ok) {
      return {
        ok: false,
        status: 502,
        message: "Could not verify the current user.",
      };
    }

    const user = (await response.json()) as { roles?: unknown };
    const roles = Array.isArray(user.roles) ? user.roles : [];

    if (!roles.includes("ADMIN")) {
      return { ok: false, status: 403, message: "Admin role required." };
    }

    return { ok: true };
  } catch {
    return {
      ok: false,
      status: 502,
      message: "Could not verify the current user.",
    };
  }
}

function revalidatePublicBlogPaths(slugs: string[]) {
  revalidatePath("/blog");
  revalidatePath("/blog/[slug]", "page");
  revalidatePath("/blog/rss.xml");
  revalidatePath("/blog/opengraph-image");
  revalidatePath("/sitemap.xml");

  for (const slug of slugs) {
    revalidatePath(`/blog/${slug}`);
    revalidatePath(`/blog/${slug}/opengraph-image`);
  }
}

function buildApiUrl(path: string) {
  return new URL(
    path.startsWith("/") ? path.slice(1) : path,
    API_URL.endsWith("/") ? API_URL : `${API_URL}/`,
  ).toString();
}
