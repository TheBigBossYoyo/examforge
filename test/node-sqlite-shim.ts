/**
 * Test-only shim for `node:sqlite`.
 *
 * Vite decides whether to externalise a bare import by checking Node's
 * `builtinModules` — but it strips the `node:` prefix first, and Node lists
 * `node:sqlite` there WITHOUT a bare `sqlite` alias (unlike every older
 * builtin). Vite therefore tries to bundle it as an npm package and fails with
 * "Failed to load url sqlite".
 *
 * Loading it through createRequire at runtime hides it from Vite's static
 * analysis. Aliased in vitest.config.ts only; the app itself imports
 * `node:sqlite` directly.
 */
import { createRequire } from "node:module";

const nodeRequire = createRequire(import.meta.url);
const sqlite = nodeRequire("node:sqlite");

export const { DatabaseSync, StatementSync } = sqlite;
export default sqlite;
