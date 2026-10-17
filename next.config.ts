import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The PDF renderer runs on the server only and must not be bundled.
  serverExternalPackages: ["@react-pdf/renderer"],
  // pdfkit loads its built-in fonts (Helvetica) by computed path, which
  // Vercel's file tracing can't see. Ship them with every server function.
  outputFileTracingIncludes: {
    "/**": ["./node_modules/pdfkit/js/standard-fonts/**"],
  },
};

export default nextConfig;
