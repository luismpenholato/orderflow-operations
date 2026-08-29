import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "domain",
          globals: true,
          environment: "node",
          include: ["apps/api/src/**/*.test.ts", "packages/contracts/src/**/*.test.ts"],
          exclude: ["**/node_modules/**", "**/dist/**", "**/*.integration.test.ts"],
        },
      },
      {
        test: {
          name: "web",
          globals: true,
          environment: "jsdom",
          setupFiles: ["apps/web/src/test/setup.ts"],
          include: ["apps/web/src/**/*.test.{ts,tsx}"],
          exclude: ["**/node_modules/**", "**/dist/**"],
        },
      },
    ],
    testTimeout: 30000,
  },
});
