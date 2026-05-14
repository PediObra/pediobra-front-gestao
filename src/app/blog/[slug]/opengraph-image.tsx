import { ImageResponse } from "next/og";
import {
  getBlogPostBySlug,
  getBlogPostDescription,
} from "@/lib/api/blog-posts";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default async function Image({ params }: { params: { slug: string } }) {
  const post = await getBlogPostBySlug(params.slug);

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: "#241f18",
        color: "#fffaf0",
        padding: 64,
        fontFamily: "Arial",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: 24,
          letterSpacing: 4,
          textTransform: "uppercase",
          color: "#f2c77d",
        }}
      >
        <span>PediObra Blog</span>
        <span>{post?.readingTimeMinutes ?? 1} min</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
        <div
          style={{
            width: 110,
            height: 8,
            background: "#c47b24",
          }}
        />
        <h1
          style={{
            margin: 0,
            maxWidth: 960,
            fontSize: 78,
            lineHeight: 0.98,
            letterSpacing: -2,
          }}
        >
          {post?.title ?? "Artigo PediObra"}
        </h1>
      </div>
      <p style={{ margin: 0, maxWidth: 880, fontSize: 28, lineHeight: 1.35 }}>
        {post
          ? getBlogPostDescription(post)
          : "Guias práticos sobre materiais, entrega e planejamento de obra."}
      </p>
    </div>,
    size,
  );
}
