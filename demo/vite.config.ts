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
    alias: {
      kiks: fileURLToPath(new URL("../packages/kiks/src/index.ts", import.meta.url)),
    },
  },
});
