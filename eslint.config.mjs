import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // shadcn-generated code is add-only (CONTRIBUTING.md); lint our code, not the vendored copies.
    "components/ui/**",
    "hooks/use-mobile.ts",
    // Claude Code worktrees live inside the repo; they are full checkouts, not our source.
    ".claude/**",
  ]),
]);

export default eslintConfig;
