import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PediObra - Painel de gestao",
    short_name: "PediObra",
    description:
      "Painel administrativo para gestao de entregas de materiais de construcao.",
    start_url: "/",
    display: "standalone",
    background_color: "#111114",
    theme_color: "#efa51a",
    icons: [
      {
        src: "/fav-icons/android-chrome-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/fav-icons/android-chrome-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
