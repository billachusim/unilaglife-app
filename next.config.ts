import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // drei's <Html> mounts its own React roots; StrictMode's dev double-mount races them and drops labels.
  reactStrictMode: false,
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
