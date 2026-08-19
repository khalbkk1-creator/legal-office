import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "نظام إدارة مكتب المحاماة",
    short_name: "مكتب المحاماة",
    description: "نظام إدارة شامل لمكتب المحاماة: القضايا، العملاء، المبيعات، والمزيد",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#f0f7f6",
    theme_color: "#25564f",
    orientation: "portrait-primary",
    lang: "ar",
    dir: "rtl",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
