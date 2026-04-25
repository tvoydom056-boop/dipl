import { describe, expect, it } from "vitest";

import {
  buildLibraryMath,
  calculateLibraryAhp,
  calculateLibraryPareto,
  calculateLibrarySensitivity,
  calculateLibraryTopsis,
  getLibraryDecisionRows,
} from "./library-analysis";
import { createEmptyBenchmarkResults } from "../demo/src/shared/benchmarkModel";

function createFixtureResults() {
  const results = createEmptyBenchmarkResults();

  results.bundle.results = {
    kiks: { rawKb: 207.28, gzipKb: 64.3 },
    redux: { rawKb: 226.95, gzipKb: 71.98 },
    zustand: { rawKb: 204.83, gzipKb: 63.71 },
    mobx: { rawKb: 265.04, gzipKb: 80.67 },
  };
  results.dispatch.results = {
    kiks: { name: "kiks", opsPerSec: 128222.756363, totalMs: 783.8059 },
    redux: { name: "redux toolkit", opsPerSec: 2858.257179, totalMs: 34988.015733 },
    zustand: { name: "zustand", opsPerSec: 136803.574245, totalMs: 735.891567 },
    mobx: { name: "mobx", opsPerSec: 3574.411892, totalMs: 27977.1668 },
  };

  return results;
}

describe("library analysis", () => {
  it("calculates AHP weights with a consistent matrix", () => {
    const ahp = calculateLibraryAhp();
    const weightSum = Object.values(ahp.weights).reduce((total, value) => total + value, 0);

    expect(ahp.columnSums).toHaveLength(4);
    expect(weightSum).toBeCloseTo(1, 4);
    expect(ahp.cr).toBeLessThan(0.1);
    expect(ahp.isConsistent).toBe(true);
  });

  it("builds Pareto, TOPSIS and sensitivity outputs for library data", () => {
    const rows = getLibraryDecisionRows(createFixtureResults());
    const pareto = calculateLibraryPareto(rows);
    const topsis = calculateLibraryTopsis(rows, calculateLibraryAhp().weights);
    const sensitivity = calculateLibrarySensitivity(rows);

    expect(pareto).toHaveLength(4);
    expect(pareto.some((row) => row.isEfficient)).toBe(true);
    expect(topsis.results[0]?.rank).toBe(1);
    expect(topsis.results.every((row) => row.score >= 0 && row.score <= 1)).toBe(true);
    expect(sensitivity.scenarios).toHaveLength(4);
    expect(sensitivity.scenarios.every((scenario) => scenario.results.length === 4)).toBe(true);
  });

  it("builds the full library math payload", () => {
    const math = buildLibraryMath(createFixtureResults());

    expect(math.weightedSum).toHaveLength(4);
    expect(math.topsis.results).toHaveLength(4);
    expect(math.sensitivity.scenarios).toHaveLength(4);
  });
});
