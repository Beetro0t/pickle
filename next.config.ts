import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  output: "export",
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || "/pickle",
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: { optimizePackageImports: ["lucide-react"] },
};
export default nextConfig;
