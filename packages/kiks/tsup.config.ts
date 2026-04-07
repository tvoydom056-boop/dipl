import { defineConfig } from "tsup";

export default defineConfig({
  entry: [
    "src/index.ts",
    "src/core/index.ts",
    "src/react/index.ts",
    "src/middleware/index.ts",
  ],
  format: ["esm"],
  dts: true,
  sourcemap: false,
  clean: true,
  minify: true,
  treeshake: true,
  target: "es2020",
  external: ["react"],
});
