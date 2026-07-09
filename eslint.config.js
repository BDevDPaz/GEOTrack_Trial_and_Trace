// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: [
      ".expo/**",
      "node_modules/**",
      "coverage/**",
      "dist/**",
      "build/**",
      "audit-report.json",
      "audit-report.md",
    ],
  },
]);
