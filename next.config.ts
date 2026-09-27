import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  /* The dev badge sits on the sidebar identity card in demo recordings; errors still surface. */
  devIndicators: false,
  /* PDF and DOCX parsers run in the Node runtime of app/api/extract; keep them out of the server bundle. */
  serverExternalPackages: ["unpdf", "mammoth"],
};

export default nextConfig;
