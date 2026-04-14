import { readBenchmarkResults } from "./results-store";

type LibraryKey = "kiks" | "redux" | "zustand" | "mobx";

interface CriterionWeights {
  bundleSize: number;
  dispatchSpeed: number;
  dependencies: number;
  builtInFeatures: number;
}

interface StaticLibraryData {
  dependencies: number;
  builtInFeatures: number;
}

interface WeightedScoreRow {
  library: string;
  bundleScore: number;
  speedScore: number;
  dependencyScore: number;
  featureScore: number;
  weightedTotal: number;
}

const WEIGHTS: CriterionWeights = {
  bundleSize: 0.25,
  dispatchSpeed: 0.35,
  dependencies: 0.15,
  builtInFeatures: 0.25,
};

const STATIC_DATA: Record<LibraryKey, StaticLibraryData> = {
  kiks: {
    dependencies: 0,
    builtInFeatures: 10,
  },
  redux: {
    dependencies: 2,
    builtInFeatures: 7,
  },
  zustand: {
    dependencies: 1,
    builtInFeatures: 6,
  },
  mobx: {
    dependencies: 2,
    builtInFeatures: 6,
  },
};

const LIBRARY_TITLES: Record<LibraryKey, string> = {
  kiks: "kiks",
  redux: "Redux Toolkit",
  zustand: "Zustand",
  mobx: "MobX",
};

function normalizeHigherBetter(value: number, max: number): number {
  if (max === 0) {
    return 0;
  }

  return Number(((value / max) * 10).toFixed(2));
}

function normalizeLowerBetter(value: number, min: number): number {
  if (value === 0) {
    return 0;
  }

  return Number(((min / value) * 10).toFixed(2));
}

const benchmarkResults = readBenchmarkResults();

const bundleValues = {
  kiks: benchmarkResults.bundle.results.kiks.gzipKb,
  redux: benchmarkResults.bundle.results.redux.gzipKb,
  zustand: benchmarkResults.bundle.results.zustand.gzipKb,
  mobx: benchmarkResults.bundle.results.mobx.gzipKb,
} satisfies Record<LibraryKey, number>;

const dispatchValues = {
  kiks: benchmarkResults.dispatch.results.kiks.opsPerSec,
  redux: benchmarkResults.dispatch.results.redux.opsPerSec,
  zustand: benchmarkResults.dispatch.results.zustand.opsPerSec,
  mobx: benchmarkResults.dispatch.results.mobx.opsPerSec,
} satisfies Record<LibraryKey, number>;

const dependencyValues = {
  kiks: STATIC_DATA.kiks.dependencies,
  redux: STATIC_DATA.redux.dependencies,
  zustand: STATIC_DATA.zustand.dependencies,
  mobx: STATIC_DATA.mobx.dependencies,
} satisfies Record<LibraryKey, number>;

const minBundle = Math.min(...Object.values(bundleValues));
const maxDispatch = Math.max(...Object.values(dispatchValues));
const minDependencies = Math.min(...Object.values(dependencyValues));
const maxFeatures = Math.max(
  STATIC_DATA.kiks.builtInFeatures,
  STATIC_DATA.redux.builtInFeatures,
  STATIC_DATA.zustand.builtInFeatures,
  STATIC_DATA.mobx.builtInFeatures,
);

const scoreRows: WeightedScoreRow[] = (
  ["kiks", "redux", "zustand", "mobx"] as const
).map((libraryKey) => {
  const bundleScore = normalizeLowerBetter(bundleValues[libraryKey], minBundle);
  const speedScore = normalizeHigherBetter(dispatchValues[libraryKey], maxDispatch);
  const dependencyScore = normalizeLowerBetter(
    dependencyValues[libraryKey] + 1,
    minDependencies + 1,
  );
  const featureScore = normalizeHigherBetter(
    STATIC_DATA[libraryKey].builtInFeatures,
    maxFeatures,
  );

  const weightedTotal = Number(
    (
      bundleScore * WEIGHTS.bundleSize +
      speedScore * WEIGHTS.dispatchSpeed +
      dependencyScore * WEIGHTS.dependencies +
      featureScore * WEIGHTS.builtInFeatures
    ).toFixed(2),
  );

  return {
    library: LIBRARY_TITLES[libraryKey],
    bundleScore,
    speedScore,
    dependencyScore,
    featureScore,
    weightedTotal,
  };
});

const sortedRows = [...scoreRows].sort((left, right) => right.weightedTotal - left.weightedTotal);

console.log("Взвешенная оценка библиотек управления состоянием");
console.log("Веса критериев:", WEIGHTS);
console.table(sortedRows);
