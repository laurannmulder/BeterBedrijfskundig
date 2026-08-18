import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standaard 1MB — te klein voor een batch van meerdere gescande PDF's
  // ineens (zie "Documenten uploaden" op de zaakpagina, meerdere bestanden
  // tegelijk).
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
};

export default nextConfig;
