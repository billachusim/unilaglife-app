import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // drei's <Html> mounts its own React roots; StrictMode's dev double-mount races them and drops labels.
  reactStrictMode: false,
  // Lets phones on the same Wi-Fi load the dev server via the Mac's LAN address.
  allowedDevOrigins: ["192.168.*.*"],
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
