import { gzipSync } from "node:zlib";
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const distDir = resolve(process.cwd(), "dist");

function collectJsFiles(directory) {
  return readdirSync(directory).flatMap((entry) => {
    const absolutePath = resolve(directory, entry);
    const stats = statSync(absolutePath);

    if (stats.isDirectory()) {
      return collectJsFiles(absolutePath);
    }

    return absolutePath.endsWith(".js") ? [absolutePath] : [];
  });
}

const runtimeFiles = collectJsFiles(distDir);
const rawBytes = runtimeFiles.reduce(
  (total, filePath) => total + readFileSync(filePath).byteLength,
  0,
);
const gzipBytes = runtimeFiles.reduce(
  (total, filePath) => total + gzipSync(readFileSync(filePath)).byteLength,
  0,
);

const formatKb = (bytes) => (bytes / 1024).toFixed(2);
const report = {
  files: runtimeFiles.length,
  rawKb: Number(formatKb(rawBytes)),
  gzipKb: Number(formatKb(gzipBytes)),
};

writeFileSync(
  resolve(process.cwd(), "size-report.json"),
  `${JSON.stringify(report, null, 2)}\n`,
  "utf8",
);

console.log("kiks library runtime size");
console.log(`files: ${runtimeFiles.length}`);
console.log(`raw:   ${formatKb(rawBytes)} kB`);
console.log(`gzip:  ${formatKb(gzipBytes)} kB`);
