import tseslint from "typescript-eslint";

export default tseslint.config(
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
    },
    rules: {
      "no-console": "off",
    },
  },
  {
    ignores: ["dist/", "node_modules/", "coverage/", "eslint.config.js"],
  }
);
