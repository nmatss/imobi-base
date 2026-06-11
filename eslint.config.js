import js from "@eslint/js";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import jsxA11yPlugin from "eslint-plugin-jsx-a11y";
import globals from "globals";

export default [
  js.configs.recommended,
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      ".next/**",
      "build/**",
      "*.config.js",
      "*.config.ts",
      // Não lintar cópias de worktrees de agentes, artefatos e diretórios não-fonte
      ".claude/**",
      "coverage/**",
      "playwright-report/**",
      "test-results/**",
      ".storybook/**",
      "stories/**",
      "attached_assets/**",
      "uploads/**",
      ".vercel/**",
      ".tmp/**",
      "public/**",
      "migrations/**",
      "migrations-sqlite/**",
      // Bundle serverless gerado pelo build (script/build.ts) — não é fonte
      "api/_handler.mjs",
    ],
  },
  {
    files: ["**/*.{ts,tsx,js,jsx,mjs,cjs}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2020,
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
      react: reactPlugin,
      "react-hooks": reactHooksPlugin,
      "jsx-a11y": jsxA11yPlugin,
    },
    rules: {
      // TypeScript rules - ENHANCED
      // TODO Onda 4: eliminar o débito de `any` (db: any, ~131 `as any` em storage.ts).
      // Mantido como 'warn' (não 'error') para não travar o gate de CI; re-escalar para 'error' após a limpeza.
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/explicit-function-return-type": [
        "warn",
        {
          allowExpressions: true,
          allowTypedFunctionExpressions: true,
          allowHigherOrderFunctions: true,
        },
      ],
      // Note: type-aware rules (no-unsafe-*, prefer-nullish-coalescing,
      // prefer-optional-chain) removed — require parserOptions.project

      // React rules
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",

      // React Hooks rules
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",

      // no-undef: desligado para TS — o TypeScript já checa símbolos não definidos,
      // e a regra gera falsos positivos em TIPOS globais (NodeJS, Express, RequestInit, React).
      // (recomendação oficial do typescript-eslint)
      "no-undef": "off",

      // Accessibility rules — atributos ARIA críticos mantidos como ERROR (baratos e importantes).
      "jsx-a11y/alt-text": "error",
      "jsx-a11y/aria-props": "error",
      "jsx-a11y/aria-proptypes": "error",
      "jsx-a11y/aria-unsupported-elements": "error",
      "jsx-a11y/role-has-required-aria-props": "error",
      "jsx-a11y/role-supports-aria-props": "error",
      "jsx-a11y/html-has-lang": "error",
      "jsx-a11y/img-redundant-alt": "error",
      // TODO Onda 4 (UX/a11y): ~100 sites precisam de aria-label/handlers de teclado.
      // Rebaixadas para 'warn' para estabelecer o gate sem rush; re-escalar para 'error' após a onda de a11y.
      "jsx-a11y/heading-has-content": "warn",
      "jsx-a11y/label-has-associated-control": "warn",
      "jsx-a11y/no-autofocus": "warn",
      "jsx-a11y/click-events-have-key-events": "warn",
      "jsx-a11y/no-static-element-interactions": "warn",
      "jsx-a11y/anchor-is-valid": "warn",
      "jsx-a11y/interactive-supports-focus": "warn",
      "jsx-a11y/no-noninteractive-tabindex": "warn",

      // General rules - ENHANCED
      "no-console": ["warn", { allow: ["warn", "error"] }], // Allow console.warn and console.error
      "no-unused-vars": "off", // Use TypeScript version instead
      "prefer-const": "error",
      "prefer-arrow-callback": "warn",
      "arrow-body-style": ["warn", "as-needed"],
      "no-var": "error",
      "object-shorthand": "warn",
      "prefer-template": "warn",
      "no-nested-ternary": "warn",
      "max-depth": ["warn", 4],
      "max-lines-per-function": [
        "warn",
        { max: 150, skipBlankLines: true, skipComments: true },
      ],
      complexity: ["warn", 15],
    },
    settings: {
      react: {
        version: "detect",
      },
    },
  },
  {
    // Storybook stories: render functions disparam falso positivo de rules-of-hooks (useState dentro do render da story)
    files: ["**/*.stories.{ts,tsx}"],
    rules: {
      "react-hooks/rules-of-hooks": "off",
    },
  },
  {
    // Playwright e2e: `use(...)` é a API de FIXTURE do Playwright, não um hook React.
    // Falso positivo de rules-of-hooks; desligado para os fixtures/specs de e2e.
    files: ["tests/e2e/**"],
    rules: {
      "react-hooks/rules-of-hooks": "off",
    },
  },
];
