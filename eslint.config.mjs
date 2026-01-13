import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  // Project-level rule overrides to reduce build-blocking strictness
  {
    rules: {
      // Allow `any` usage in places during active development
      "@typescript-eslint/no-explicit-any": "off",
      // Allow unescaped entities in JSX where needed
      "react/no-unescaped-entities": "off",
    },
  },
];

export default eslintConfig;
