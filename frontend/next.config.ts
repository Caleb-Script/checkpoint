import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ⬇️ Verhindert, dass ESLint-Fehler den Produktionsbuild abbrechen
  eslint: {
    ignoreDuringBuilds: true,
  },

  experimental: {
    // Optional, harmless – sorgt für saubere typed routes falls genutzt
    // typedRoutes: true,
  },
};

export default nextConfig;
