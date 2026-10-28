import { defineConfig } from "oxlint";
import core from "ultracite/oxlint/core";
import drizzle from "ultracite/oxlint/drizzle";

export default defineConfig({
  env: core.env,
  extends: [core, drizzle],
  ignorePatterns: [...(core.ignorePatterns ?? []), "**/routeTree.gen.ts"],
});
