import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

import { updateBenchmarkResults } from "./results-store";

const rootDir = resolve(fileURLToPath(new URL("..", import.meta.url)));
const implementations = ["kiks", "redux", "zustand", "mobx"] as const;
const packageRootDir = resolve(rootDir, "..", "packages", "kiks");

function formatKb(bytes: number): string {
  return (bytes / 1024).toFixed(2);
}

function buildEntry(implementation: (typeof implementations)[number]): {
  rawBytes: number;
  gzipBytes: number;
} {
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
      "document.body.appendChild(root);",
      "ReactDOM.createRoot(root).render(",
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
    [
      "-NoProfile",
      "-Command",
      `Get-ChildItem -Path "${distDir}" -Filter *.js | Select-Object -ExpandProperty FullName`,
    ],
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

function readLibrarySizeReport(): { files: number; rawKb: number; gzipKb: number } {
  execFileSync("cmd", ["/c", "npm", "run", "size"], {
    cwd: packageRootDir,
    stdio: "pipe",
  });

  const reportPath = resolve(packageRootDir, "size-report.json");
  return JSON.parse(readFileSync(reportPath, "utf8")) as {
    files: number;
    rawKb: number;
    gzipKb: number;
  };
}

const bundleResults = Object.fromEntries(
  implementations.map((implementation) => {
    const result = buildEntry(implementation);

    return [
      implementation,
      {
        rawKb: Number(formatKb(result.rawBytes)),
        gzipKb: Number(formatKb(result.gzipBytes)),
      },
    ];
  }),
) as Record<(typeof implementations)[number], { rawKb: number; gzipKb: number }>;

const librarySize = readLibrarySizeReport();

updateBenchmarkResults((current) => ({
  ...current,
  bundle: {
    results: bundleResults,
  },
  librarySize: {
    kiks: librarySize,
  },
}));

console.log("Bundle benchmark by separate entry points");
for (const implementation of implementations) {
  const result = bundleResults[implementation];
  console.log(
    `${implementation.padEnd(10)} ${formatKb(result.rawKb * 1024).padStart(8)} kB raw | ${formatKb(result.gzipKb * 1024).padStart(8)} kB gzip`,
  );
}

console.log("kiks library runtime size");
console.log(
  `${String(librarySize.files).padStart(4)} files | ${librarySize.rawKb.toFixed(2).padStart(8)} kB raw | ${librarySize.gzipKb.toFixed(2).padStart(8)} kB gzip`,
);

rmSync(resolve(rootDir, ".bench-temp"), { force: true, recursive: true });
