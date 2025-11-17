import js from "@eslint/js"
import globals from "globals"
import tsParser from "@typescript-eslint/parser"

export default [
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      "build-terrazea.zip",
      "tsconfig.tsbuildinfo",
      ".next/**",
      "coverage/**",
      "eslint.config.js",
      ".eslintrc.cjs",
    ],
  },
  js.configs.recommended,
  {
    files: ["server/**/*.{ts,tsx,js,jsx}", "scripts/**/*.{ts,js}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: "module",
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        React: "readonly",
      },
    },
    rules: {
      "no-undef": "off",
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/no-empty-object-type": "off",
    },
  },
]

