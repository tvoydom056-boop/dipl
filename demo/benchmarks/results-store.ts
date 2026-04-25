import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { createEmptyBenchmarkResults, type BenchmarkResults } from "../src/shared/benchmarkModel";

const resultsPath = resolve(process.cwd(), "src", "generated", "benchmark-results.json");

export function readBenchmarkResults(): BenchmarkResults {
  try {
    const rawContent = readFileSync(resultsPath, "utf8");
    return JSON.parse(rawContent) as BenchmarkResults;
  } catch {
    return createEmptyBenchmarkResults();
  }
}

export function writeBenchmarkResults(results: BenchmarkResults): void {
  mkdirSync(dirname(resultsPath), { recursive: true });
  writeFileSync(resultsPath, `${JSON.stringify(results, null, 2)}\n`, "utf8");
}

export function updateBenchmarkResults(
  updater: (current: BenchmarkResults) => BenchmarkResults,
): BenchmarkResults {
  const nextResults = updater(readBenchmarkResults());
  nextResults.generatedAt = new Date().toISOString();
  writeBenchmarkResults(nextResults);
  return nextResults;
}
