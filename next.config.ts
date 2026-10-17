import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The PDF renderer runs on the server only and must not be bundled.
  serverExternalPackages: ["@react-pdf/renderer"],
};

export default nextConfig;
