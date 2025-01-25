import js from "@eslint/js";
import globals from "globals";

export default [
  {
    ignores: ["dist-extension/*", "build", "chrome", "vendor"]
  },
  js.configs.recommended,
  {
    "rules": {
      "dot-notation": 2,
      "max-statements-per-line": 2,
    },
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.webextensions,
      },
      sourceType: "script"
    },
  },
  {
    files: ["test/**/*.js", "**/*.mjs"],
    languageOptions: {
      globals: {
        ...globals.node,
      },
      sourceType: "module"
    }
  }
];
