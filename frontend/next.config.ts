import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** Directory containing this config (`frontend/`). Forces Turbopack to resolve deps from this app, not a parent folder that only has a root `package-lock.json`. */
const appDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)));
const nm = (...segments: string[]) => path.join(appDir, "node_modules", ...segments);

const nextConfig: NextConfig = {
  turbopack: {
    root: appDir,
    resolveAlias: {
      tailwindcss: nm("tailwindcss"),
      "@tailwindcss/postcss": nm("@tailwindcss/postcss"),
      "@tailwindcss/node": nm("@tailwindcss/node"),
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "euxdqtrxuyjmyhxlbncy.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "ik.imagekit.io",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
