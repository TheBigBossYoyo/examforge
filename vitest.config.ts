import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      // See test/node-sqlite-shim.ts — Vite cannot externalise node:sqlite on
      // its own, so DB-backed modules would fail to load under test.
      "node:sqlite": path.resolve(__dirname, "test/node-sqlite-shim.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts", "scripts/**/*.test.ts", "test/**/*.test.ts"],
    // Each DB-backed test file gets its own process, so a test database opened
    // by one file cannot leak into another.
    pool: "forks",
  },
});
