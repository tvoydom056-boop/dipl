import rawResults from "../demo/src/generated/benchmark-results.json";
import { describe, expect, it } from "../demo/node_modules/vitest/dist/index";

import type { BenchmarkResults } from "../demo/src/shared/benchmarkModel";

const results = rawResults as BenchmarkResults;

describe("benchmark results shape", () => {
  it("includes selector benchmark scenarios and summary", () => {
    expect(results.selectorBenchmark.iterations).toBe(100_000);
    expect(results.selectorBenchmark.runs).toBe(3);
    expect(results.selectorBenchmark.results.namedCacheHit.title).toBeTruthy();
    expect(results.selectorBenchmark.results.namedCacheMiss.title).toBeTruthy();
    expect(results.selectorBenchmark.results.inlineCacheHit.title).toBeTruthy();
    expect(results.selectorBenchmark.results.inlineCacheMiss.title).toBeTruthy();
    expect(["named", "inline"]).toContain(results.selectorBenchmark.summary.bestCacheHit);
    expect(["named", "inline"]).toContain(results.selectorBenchmark.summary.bestCacheMiss);
  });

  it("includes library math sections required by the demo", () => {
    expect(results.libraryMath.weightedSum).toHaveLength(4);
    expect(results.libraryMath.ahp.criteria).toHaveLength(4);
    expect(results.libraryMath.pareto).toHaveLength(4);
    expect(results.libraryMath.topsis.results).toHaveLength(4);
    expect(results.libraryMath.sensitivity.scenarios).toHaveLength(4);
  });
});
