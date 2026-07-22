import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PropMate — Property Management",
    short_name: "PropMate",
    description: "Your Best Mate of Solution for Property Management",
    start_url: "/",
    display: "standalone",
    background_color: "#0c1324",
    theme_color: "#7b57e7",
    orientation: "portrait",
    icons: [
      {
        src: "/logo.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/logo.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
