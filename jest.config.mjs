import nextJest from "next/jest.js";

const createJestConfig = nextJest({
  dir: "./",
});

/** @type {import("jest").Config} */
const config = {
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  testEnvironment: "jsdom",
  coverageProvider: "v8",
  collectCoverageFrom: [
    "src/components/forms/image-file-preview.tsx",
    "src/components/layout/sidebar.tsx",
    "src/components/theme/theme-toggle.tsx",
    "src/lib/theme.ts",
    "src/lib/theme-provider.tsx",
    "src/lib/theme-store.ts",
  ],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov"],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
};

export default createJestConfig(config);
