import {
  implementationOrder,
  libraryCriterionOrder,
  type BenchmarkResults,
  type ImplementationKey,
  type LibraryAhpResult,
  type LibraryCriterionKey,
  type LibraryCriterionScoreMap,
  type LibraryCriterionWeightMap,
  type LibraryParetoEntry,
  type LibrarySensitivityScenarioEntry,
  type LibraryTopsisResult,
  type LibraryWeightedScoreEntry,
} from "../demo/src/shared/benchmarkModel";

export const libraryTitles: Record<ImplementationKey, string> = {
  kiks: "kiks",
  redux: "Redux Toolkit",
  zustand: "Zustand",
  mobx: "MobX",
};

export const defaultWeightedCriteria: LibraryCriterionWeightMap = {
  bundleSize: 0.25,
  dispatchSpeed: 0.35,
  dependencies: 0.15,
  builtInFeatures: 0.25,
};

const dependencyCounts: Record<ImplementationKey, number> = {
  kiks: 0,
  redux: 2,
  zustand: 1,
  mobx: 2,
};

const builtInFeatureScores: Record<ImplementationKey, number> = {
  kiks: 10,
  redux: 7,
  zustand: 6,
  mobx: 6,
};

const criterionKind: Record<LibraryCriterionKey, "benefit" | "cost"> = {
  bundleSize: "cost",
  dispatchSpeed: "benefit",
  dependencies: "cost",
  builtInFeatures: "benefit",
};

function round(value: number, precision = 6): number {
  return Number(value.toFixed(precision));
}

function normalizeHigherBetter(value: number, max: number): number {
  if (max === 0) {
    return 0;
  }

  return round((value / max) * 10, 4);
}

function normalizeLowerBetter(value: number, min: number): number {
  if (value === 0) {
    return 0;
  }

  return round((min / value) * 10, 4);
}

export interface LibraryDecisionRow {
  key: ImplementationKey;
  title: string;
  raw: LibraryCriterionScoreMap;
  normalized: LibraryCriterionScoreMap;
}

export function getLibraryDecisionRows(results: BenchmarkResults): LibraryDecisionRow[] {
  const rawRows = implementationOrder.map((key) => ({
    key,
    title: libraryTitles[key],
    raw: {
      bundleSize: results.bundle.results[key]?.gzipKb ?? 0,
      dispatchSpeed: results.dispatch.results[key]?.opsPerSec ?? 0,
      dependencies: dependencyCounts[key],
      builtInFeatures: builtInFeatureScores[key],
    },
  }));

  const minBundle = Math.min(...rawRows.map((row) => row.raw.bundleSize));
  const maxDispatch = Math.max(...rawRows.map((row) => row.raw.dispatchSpeed));
  const minDependencies = Math.min(...rawRows.map((row) => row.raw.dependencies));
  const maxFeatures = Math.max(...rawRows.map((row) => row.raw.builtInFeatures));

  return rawRows.map((row) => ({
    ...row,
    normalized: {
      bundleSize: normalizeLowerBetter(row.raw.bundleSize, minBundle),
      dispatchSpeed: normalizeHigherBetter(row.raw.dispatchSpeed, maxDispatch),
      dependencies: normalizeLowerBetter(row.raw.dependencies + 1, minDependencies + 1),
      builtInFeatures: normalizeHigherBetter(row.raw.builtInFeatures, maxFeatures),
    },
  }));
}

export function calculateWeightedScores(
  rows: LibraryDecisionRow[],
  weights: LibraryCriterionWeightMap,
): LibraryWeightedScoreEntry[] {
  return rows
    .map((row) => ({
      key: row.key,
      title: row.title,
      scores: row.normalized,
      weightedTotal: round(
        libraryCriterionOrder.reduce(
          (total, criterion) => total + row.normalized[criterion] * weights[criterion],
          0,
        ),
        4,
      ),
    }))
    .sort((left, right) => right.weightedTotal - left.weightedTotal);
}

const ahpMatrix = [
  [1, 1 / 3, 1 / 2, 1 / 4],
  [3, 1, 2, 1 / 2],
  [2, 1 / 2, 1, 1 / 3],
  [4, 2, 3, 1],
];

export function calculateLibraryAhp(): LibraryAhpResult {
  const size = ahpMatrix.length;
  const columnSums = ahpMatrix[0].map((_, columnIndex) =>
    round(
      ahpMatrix.reduce((total, row) => total + row[columnIndex], 0),
      6,
    ),
  );
  const normalizedMatrix = ahpMatrix.map((row) =>
    row.map((value, columnIndex) => round(value / columnSums[columnIndex], 6)),
  );
  const weightValues = normalizedMatrix.map((row) =>
    round(row.reduce((total, value) => total + value, 0) / size, 6),
  );
  const weights = Object.fromEntries(
    libraryCriterionOrder.map((criterion, index) => [criterion, weightValues[index]]),
  ) as unknown as LibraryCriterionWeightMap;

  const weightedSums = ahpMatrix.map((row) =>
    round(
      row.reduce((total, value, index) => total + value * weightValues[index], 0),
      6,
    ),
  );
  const lambdaValues = weightedSums.map((value, index) => round(value / weightValues[index], 6));
  const lambdaMax = round(
    lambdaValues.reduce((total, value) => total + value, 0) / lambdaValues.length,
    6,
  );
  const ci = round((lambdaMax - size) / (size - 1), 6);
  const cr = round(ci / 0.9, 6);

  return {
    criteria: [...libraryCriterionOrder],
    matrix: ahpMatrix.map((row) => row.map((value) => round(value, 6))),
    columnSums,
    normalizedMatrix,
    weights,
    lambdaMax,
    ci,
    cr,
    isConsistent: cr < 0.1,
  };
}

function dominates(left: LibraryDecisionRow, right: LibraryDecisionRow): boolean {
  const allNonWorse = libraryCriterionOrder.every(
    (criterion) => left.normalized[criterion] >= right.normalized[criterion],
  );
  const atLeastOneBetter = libraryCriterionOrder.some(
    (criterion) => left.normalized[criterion] > right.normalized[criterion],
  );

  return allNonWorse && atLeastOneBetter;
}

export function calculateLibraryPareto(rows: LibraryDecisionRow[]): LibraryParetoEntry[] {
  return rows.map((row) => {
    const dominatesKeys = implementationOrder.filter((otherKey) => {
      if (otherKey === row.key) {
        return false;
      }

      const otherRow = rows.find((candidate) => candidate.key === otherKey);
      return otherRow ? dominates(row, otherRow) : false;
    });

    const dominatedByKeys = implementationOrder.filter((otherKey) => {
      if (otherKey === row.key) {
        return false;
      }

      const otherRow = rows.find((candidate) => candidate.key === otherKey);
      return otherRow ? dominates(otherRow, row) : false;
    });

    return {
      key: row.key,
      title: row.title,
      dominates: dominatesKeys,
      dominatedBy: dominatedByKeys,
      isEfficient: dominatedByKeys.length === 0,
    };
  });
}

export function calculateLibraryTopsis(
  rows: LibraryDecisionRow[],
  weights: LibraryCriterionWeightMap,
): LibraryTopsisResult {
  const denominators = Object.fromEntries(
    libraryCriterionOrder.map((criterion) => [
      criterion,
      Math.sqrt(rows.reduce((total, row) => total + row.normalized[criterion] ** 2, 0)),
    ]),
  ) as Record<LibraryCriterionKey, number>;

  const weightedMatrix = rows.map((row) => ({
    key: row.key,
    title: row.title,
    values: Object.fromEntries(
      libraryCriterionOrder.map((criterion) => [
        criterion,
        round(weights[criterion] * (row.normalized[criterion] / denominators[criterion]), 6),
      ]),
    ) as unknown as LibraryCriterionScoreMap,
  }));

  const idealBest = Object.fromEntries(
    libraryCriterionOrder.map((criterion) => [
      criterion,
      round(Math.max(...weightedMatrix.map((row) => row.values[criterion])), 6),
    ]),
  ) as unknown as LibraryCriterionScoreMap;

  const idealWorst = Object.fromEntries(
    libraryCriterionOrder.map((criterion) => [
      criterion,
      round(Math.min(...weightedMatrix.map((row) => row.values[criterion])), 6),
    ]),
  ) as unknown as LibraryCriterionScoreMap;

  const results = weightedMatrix
    .map((row) => {
      const distanceToIdeal = Math.sqrt(
        libraryCriterionOrder.reduce(
          (total, criterion) => total + (row.values[criterion] - idealBest[criterion]) ** 2,
          0,
        ),
      );
      const distanceToAntiIdeal = Math.sqrt(
        libraryCriterionOrder.reduce(
          (total, criterion) => total + (row.values[criterion] - idealWorst[criterion]) ** 2,
          0,
        ),
      );
      const score =
        distanceToIdeal + distanceToAntiIdeal === 0
          ? 0
          : distanceToAntiIdeal / (distanceToIdeal + distanceToAntiIdeal);

      return {
        key: row.key,
        title: row.title,
        distanceToIdeal: round(distanceToIdeal, 6),
        distanceToAntiIdeal: round(distanceToAntiIdeal, 6),
        score: round(score, 6),
        rank: 0,
      };
    })
    .sort((left, right) => right.score - left.score)
    .map((row, index) => ({
      ...row,
      rank: index + 1,
    }));

  return {
    weightedMatrix,
    idealBest,
    idealWorst,
    results,
  };
}

function createScenarioWeights(
  key: LibrarySensitivityScenarioEntry["key"],
): LibraryCriterionWeightMap {
  switch (key) {
    case "speed-focus":
      return {
        bundleSize: round(0.4 / 3, 6),
        dispatchSpeed: 0.6,
        dependencies: round(0.4 / 3, 6),
        builtInFeatures: round(0.4 / 3, 6),
      };
    case "bundle-focus":
      return {
        bundleSize: 0.6,
        dispatchSpeed: round(0.4 / 3, 6),
        dependencies: round(0.4 / 3, 6),
        builtInFeatures: round(0.4 / 3, 6),
      };
    case "equal":
      return {
        bundleSize: 0.25,
        dispatchSpeed: 0.25,
        dependencies: 0.25,
        builtInFeatures: 0.25,
      };
    case "baseline":
    default:
      return defaultWeightedCriteria;
  }
}

const scenarioTitles: Record<LibrarySensitivityScenarioEntry["key"], string> = {
  baseline: "Базовый",
  "speed-focus": "Акцент на скорость",
  "bundle-focus": "Акцент на размер",
  equal: "Равные веса",
};

export function calculateLibrarySensitivity(rows: LibraryDecisionRow[]): {
  scenarios: LibrarySensitivityScenarioEntry[];
  stableWinner: boolean;
  stableWinnerKey: ImplementationKey | null;
} {
  const scenarios = (["baseline", "speed-focus", "bundle-focus", "equal"] as const).map((key) => {
    const weights = createScenarioWeights(key);
    const results = calculateWeightedScores(rows, weights).map((row, index) => ({
      key: row.key,
      title: row.title,
      score: row.weightedTotal,
      rank: index + 1,
    }));

    return {
      key,
      title: scenarioTitles[key],
      weights,
      results,
      winner: results[0]?.key ?? "kiks",
    };
  });

  const baselineWinner = scenarios[0]?.winner ?? null;
  const stableWinner =
    baselineWinner !== null && scenarios.every((scenario) => scenario.winner === baselineWinner);

  return {
    scenarios,
    stableWinner,
    stableWinnerKey: stableWinner ? baselineWinner : null,
  };
}

export function buildLibraryMath(results: BenchmarkResults): BenchmarkResults["libraryMath"] {
  const rows = getLibraryDecisionRows(results);
  const ahp = calculateLibraryAhp();
  const weightedSum = calculateWeightedScores(rows, defaultWeightedCriteria);
  const topsis = calculateLibraryTopsis(rows, ahp.weights);
  const pareto = calculateLibraryPareto(rows);
  const sensitivity = calculateLibrarySensitivity(rows);

  return {
    weightedSum,
    ahp,
    topsis,
    pareto,
    sensitivity,
  };
}

export function getCriterionKind(criterion: LibraryCriterionKey): "benefit" | "cost" {
  return criterionKind[criterion];
}
