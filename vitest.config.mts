import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
    // .claude/ holds Claude Code worktrees (each with its own node_modules); never a test source.
    exclude: ["**/node_modules/**", ".next/**", ".claude/**"],
  },
  resolve: {
    alias: { "@": path.dirname(fileURLToPath(import.meta.url)) },
  },
});
