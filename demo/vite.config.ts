import { fileURLToPath, URL } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: process.env.KIKS_BENCH_ENTRY
      ? {
          input: process.env.KIKS_BENCH_ENTRY,
        }
      : undefined,
  },
  resolve: {
    alias: [
      {
        find: /^kiks\/core$/,
        replacement: fileURLToPath(new URL("../packages/kiks/src/core/index.ts", import.meta.url)),
      },
      {
        find: /^kiks\/react$/,
        replacement: fileURLToPath(new URL("../packages/kiks/src/react/index.ts", import.meta.url)),
      },
      {
        find: /^kiks\/middleware$/,
        replacement: fileURLToPath(new URL("../packages/kiks/src/middleware/index.ts", import.meta.url)),
      },
      {
        find: /^kiks$/,
        replacement: fileURLToPath(new URL("../packages/kiks/src/index.ts", import.meta.url)),
      },
    ],
  },
});
