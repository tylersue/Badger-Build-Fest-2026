import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  /* PDF and DOCX parsers run in the Node runtime of app/api/extract; keep them out of the server bundle. */
  serverExternalPackages: ["unpdf", "mammoth"],
};

export default nextConfig;
