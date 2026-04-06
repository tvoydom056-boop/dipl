import { gzipSync } from "node:zlib";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const rootDir = resolve(fileURLToPath(new URL("..", import.meta.url)));
const implementations = ["kiks", "redux", "zustand", "mobx"] as const;

function formatKb(bytes: number): string {
  return (bytes / 1024).toFixed(2);
}

function buildEntry(implementation: (typeof implementations)[number]): { rawBytes: number; gzipBytes: number } {
  const tempDir = resolve(rootDir, ".bench-temp");
  const entryPath = resolve(tempDir, `${implementation}.tsx`);

  mkdirSync(tempDir, { recursive: true });

  writeFileSync(
    entryPath,
    [
      'import React from "react";',
      'import ReactDOM from "react-dom/client";',
      `import { ${implementation === "redux" ? "ReduxTaskManager" : implementation === "zustand" ? "ZustandTaskManager" : implementation === "mobx" ? "MobxTaskManager" : "KiksTaskManager"} } from "../src/implementations/${implementation}/${implementation === "redux" ? "ReduxTaskManager" : implementation === "zustand" ? "ZustandTaskManager" : implementation === "mobx" ? "MobxTaskManager" : "KiksTaskManager"}";`,
      'const root = document.createElement("div");',
      'document.body.appendChild(root);',
      'ReactDOM.createRoot(root).render(',
      "  <React.StrictMode>",
      implementation === "redux"
        ? "    <ReduxTaskManager />"
        : implementation === "zustand"
          ? "    <ZustandTaskManager />"
          : implementation === "mobx"
            ? "    <MobxTaskManager />"
            : "    <KiksTaskManager />",
      "  </React.StrictMode>,",
      ");",
    ].join("\n"),
  );

  execFileSync(
    "cmd",
    [
      "/c",
      "npx",
      "vite",
      "build",
      "--config",
      resolve(rootDir, "vite.config.ts"),
      "--outDir",
      resolve(rootDir, "dist-bench", implementation),
      "--emptyOutDir",
      "true",
      "--minify",
      "esbuild",
    ],
    {
      cwd: rootDir,
      env: {
        ...process.env,
        KIKS_BENCH_ENTRY: entryPath,
      },
      stdio: "pipe",
    },
  );

  const distDir = resolve(rootDir, "dist-bench", implementation, "assets");
  const files = execFileSync(
    "powershell",
    ["-NoProfile", "-Command", `Get-ChildItem -Path "${distDir}" -Filter *.js | Select-Object -ExpandProperty FullName`],
    { encoding: "utf8" },
  )
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const bundlePath = files[0];
  const rawContent = readFileSync(bundlePath);
  const gzipContent = gzipSync(rawContent);

  return {
    rawBytes: rawContent.byteLength,
    gzipBytes: gzipContent.byteLength,
  };
}

const results = implementations.map((implementation) => ({
  implementation,
  ...buildEntry(implementation),
}));

console.log("Bundle benchmark по отдельным entry points");
for (const result of results) {
  console.log(
    `${result.implementation.padEnd(10)} ${formatKb(result.rawBytes).padStart(8)} kB raw | ${formatKb(result.gzipBytes).padStart(8)} kB gzip`,
  );
}

rmSync(resolve(rootDir, ".bench-temp"), { force: true, recursive: true });
