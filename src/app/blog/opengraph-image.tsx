import { ImageResponse } from "next/og";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: "#f7f3ea",
        color: "#241f18",
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
          color: "#7b5b25",
        }}
      >
        <span>PediObra Blog</span>
        <span>PT-BR</span>
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
            maxWidth: 860,
            fontSize: 94,
            lineHeight: 0.95,
            letterSpacing: -2,
          }}
        >
          Guias práticos para comprar e tocar obra melhor
        </h1>
      </div>
      <p style={{ margin: 0, maxWidth: 860, fontSize: 30, lineHeight: 1.35 }}>
        Materiais de construção, entrega, orçamento e planejamento sem ruído.
      </p>
    </div>,
    size,
  );
}
