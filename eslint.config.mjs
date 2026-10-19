import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  prettier,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Historical apps retain their original source and build separately.
    "examples/visionverse/**",
    "public/visionverse-history/**",
    "examples/citycraft/**",
    "examples/hearthwild/**",
    "public/minecraft/hearthwild/**",
    "public/minecraft/citycraft/planner/**",
    "output/**",
  ]),
]);

export default eslintConfig;
