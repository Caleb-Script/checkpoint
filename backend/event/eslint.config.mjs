// @ts-check
import eslint from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
// Flat-Config Prettier-Empfehlung (aktiviert "prettier/prettier")
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";

/**
 * Hinweise:
 * - Node 22+, ESM only
 * - Type-aware Linting via typescript-eslint projectService
 * - ecmaVersion: "latest" (statt 5)
 * - Getrennte Overrides für Test-/Config-/Script-Dateien
 */

export default tseslint.config(
  // 0) Global Ignorieren (Flat-Config Stil)
  {
    ignores: [
      "node_modules/",
      "dist/",
      ".turbo/",
      ".next/",
      "coverage/",
      // Ignoriere eigene Config, wenn gewünscht:
      "eslint.config.mjs"
    ]
  },

  // 1) ESLint Base (JS-Empfehlungen)
  {
    ...eslint.configs.recommended,
    files: ["**/*.{js,cjs,mjs,ts,tsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.node
      }
    }
  },

  // 2) TypeScript-Empfehlungen (type-aware)
  ...tseslint.configs.recommendedTypeChecked,
  // 3) Optionale Style-Regeln von typescript-eslint (type-aware)
  ...tseslint.configs.stylisticTypeChecked,

  // 4) Prettier-Empfehlung als Flat-Config (setzt auch "prettier/prettier")
  eslintPluginPrettierRecommended,

  // 5) Gemeinsame Spracheinstellungen für TS (Project Service an)
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parserOptions: {
        // Nutzt automatisch die nächstgelegene tsconfig.* via Project Service
        projectService: true,
        // Für ESM-Flat-Config korrekt:
        tsconfigRootDir: import.meta.dirname
      }
    }
  },

  // 6) Projektweite Regeln
  {
    files: ["**/*.{ts,tsx,js,mjs,cjs}"],
    rules: {
      // Zukunftsorientiert, aber praxisnah:
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-floating-promises": "warn",
      "@typescript-eslint/no-unsafe-argument": "warn",

      // Kleine Quality-Boosts (type-aware):
      "@typescript-eslint/consistent-type-imports": ["warn", { prefer: "type-imports" }],
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" }
      ],

      // Prettier als Source-of-Truth fürs Formatting:
      "prettier/prettier": "warn"
    }
  },

  // 7) Overrides: Test-Dateien (Jest/Vitest o.ä.)
  {
    files: ["**/*.{test,spec}.ts", "**/__tests__/**/*.{ts,tsx}"],
    languageOptions: {
      globals: {
        ...globals.jest
      }
    },
    rules: {
      "no-console": "off"
    }
  },

  // 8) Overrides: Build-/Config-Skripte (dürfen console u.ä.)
  {
    files: [
      "**/*.config.{js,cjs,mjs,ts}",
      "scripts/**/*.{js,ts}",
      "prisma/**/*.ts"
    ],
    rules: {
      "no-console": "off"
    }
  }
);
