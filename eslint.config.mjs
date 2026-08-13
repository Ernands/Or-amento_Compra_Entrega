import js from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default defineConfig([
  globalIgnores(["dist/**", "coverage/**", "apps-script/dist/**"]),
  {
    files: ["src/**/*.{ts,tsx}"],
    ...js.configs.recommended,
    languageOptions: { ...js.configs.recommended.languageOptions, ecmaVersion: 2022 },
  },
  ...tseslint.configs.recommended.map((config) => ({ ...config, files: ["src/**/*.{ts,tsx}"] })),
  {
    files: ["src/**/*.{ts,tsx}"],
    plugins: { "react-hooks": reactHooks, "react-refresh": reactRefresh },
    rules: {
      ...reactHooks.configs.flat.recommended.rules,
      ...reactRefresh.configs.vite.rules,
      "react-refresh/only-export-components": "off",
    },
  },
]);
