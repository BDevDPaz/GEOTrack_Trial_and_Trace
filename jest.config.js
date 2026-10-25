/** @type {import('jest').Config} */
const base = {
  testPathIgnorePatterns: ["/node_modules/", "\\.benchmark\\.ts$"],
  globals: { __DEV__: true },
};

module.exports = {
  watchman: false,
  projects: [
    {
      ...base,
      displayName: "logic",
      preset: "ts-jest",
      testEnvironment: "node",
      testMatch: ["**/?(*.)+(spec|test).ts"],
    },
    {
      ...base,
      displayName: "components",
      preset: "jest-expo",
      testMatch: ["**/?(*.)+(spec|test).tsx"],
    },
  ],
};
