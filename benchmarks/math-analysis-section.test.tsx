// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest";
import { render, screen } from "../packages/kiks/node_modules/@testing-library/react";

import { createEmptyBenchmarkResults } from "../demo/src/shared/benchmarkModel";

vi.mock("../demo/src/shared/benchmarkResults", () => {
  const empty = createEmptyBenchmarkResults();

  return {
    benchmarkResults: empty,
    comparisonMetricRows: [],
    libraryAhpMatrixRows: empty.libraryMath.ahp.criteria.map((criterion, index) => ({
      criterion,
      label: criterion,
      values: empty.libraryMath.ahp.matrix[index] ?? [0, 0, 0, 0],
      normalizedValues: empty.libraryMath.ahp.normalizedMatrix[index] ?? [0, 0, 0, 0],
      weight: empty.libraryMath.ahp.weights[criterion],
      columnSum: empty.libraryMath.ahp.columnSums[index] ?? 0,
    })),
    libraryAhpSummary: {
      lambdaMax: empty.libraryMath.ahp.lambdaMax,
      ci: empty.libraryMath.ahp.ci,
      cr: empty.libraryMath.ahp.cr,
      isConsistent: empty.libraryMath.ahp.isConsistent,
    },
    libraryParetoFrontier: [],
    libraryParetoRows: [],
    librarySensitivityRows: [],
    librarySensitivityScenarios: [],
    librarySensitivitySummary: {
      stableWinner: false,
      stableWinnerLabel: null,
    },
    libraryTopsisIdeal: {
      best: [],
      worst: [],
    },
    libraryTopsisMatrixRows: [],
    libraryTopsisRows: [],
    selectorAhpWeightRows: [],
    selectorBenchmarkChartRows: [],
    selectorBenchmarkSummary: {
      iterations: 0,
      runs: 0,
      bestCacheHit: "named",
      bestCacheMiss: "named",
    },
    selectorDecisionRows: [],
    selectorStrategyRows: [],
    selectorWinner: "dependencies",
    weightedCriteria: {
      bundleSize: 0.25,
      dispatchSpeed: 0.35,
      dependencies: 0.15,
      builtInFeatures: 0.25,
    },
    weightedScoreRows: [],
  };
});

describe("MathAnalysisSection", () => {
  it("renders safely with empty benchmark results", async () => {
    const module = await import("../demo/src/shared/MathAnalysisSection");

    render(module.MathAnalysisSection({}));

    expect(screen.getByText(/данные ещё не сгенерированы/i)).toBeTruthy();
    expect(screen.getByText(/AHP:/i)).toBeTruthy();
    expect(screen.getByText(/Pareto:/i)).toBeTruthy();
    expect(screen.getAllByText(/TOPSIS:/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Selector benchmark:/i)).toBeTruthy();
  });
});
