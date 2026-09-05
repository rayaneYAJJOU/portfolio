import type { NextConfig } from "next";

// Set by the GitHub Actions workflow to "/<repo-name>" for project sites
// (e.g. github.com/you/portfolio -> yourname.github.io/portfolio).
// Left empty for local dev and for username.github.io repos.
const basePath = process.env.BASE_PATH || "";

const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  trailingSlash: true,
  basePath,
  assetPrefix: basePath || undefined,
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
};

export default nextConfig;
