import rawResults from "../generated/benchmark-results.json";
import {
  implementationOrder,
  type BenchmarkResults,
  type ImplementationKey,
  selectorStrategyOrder,
  type SelectorCriterionKey,
  type SelectorStrategyKey,
} from "./benchmarkModel";

export type ComparisonMetricRow = {
  key: ImplementationKey;
  title: string;
  dispatchOps: number;
  bundleGzipKb: number;
  rerenderChangedComponents: number;
  rerenderCommits: number;
  rerenderSummary: string;
  rerenderZoneSummary: string;
  rerenderScore: number;
  timeTravel: string;
  selectors: string;
  dependencies: string;
  colorClass: string;
  colorHex: string;
};

export type WeightedScoreRow = {
  key: ImplementationKey;
  title: string;
  bundleScore: number;
  speedScore: number;
  dependencyScore: number;
  featureScore: number;
  weightedTotal: number;
};

export type SelectorStrategyRow = {
  key: SelectorStrategyKey;
  title: string;
  description: string;
  firstRunMs: number;
  repeatRunMs: number;
  unrelatedChangeMs: number;
  relatedChangeMs: number;
  recomputations: number;
  cacheHits: number;
  memoryUnits: number;
  implementationScore: number;
  integrationScore: number;
  rerenderStability: number;
};

export type SelectorDecisionRow = {
  key: SelectorStrategyKey;
  title: string;
  weightedSum: number;
  topsis: number;
  paretoStatus: string;
  isWinner: boolean;
};

const results = rawResults as BenchmarkResults;

const implementationMeta: Record<
  ImplementationKey,
  Omit<
    ComparisonMetricRow,
    | "dispatchOps"
    | "bundleGzipKb"
    | "rerenderChangedComponents"
    | "rerenderCommits"
    | "rerenderSummary"
    | "rerenderZoneSummary"
    | "rerenderScore"
  >
> = {
  kiks: {
    key: "kiks",
    title: "kiks",
    timeTravel: "Встроен",
    selectors: "Встроены",
    dependencies: "React peer only",
    colorClass: "kiks",
    colorHex: "#2d5b8f",
  },
  redux: {
    key: "redux",
    title: "Redux Toolkit",
    timeTravel: "Через DevTools",
    selectors: "Частично",
    dependencies: "Redux ecosystem",
    colorClass: "redux",
    colorHex: "#7f49b3",
  },
  zustand: {
    key: "zustand",
    title: "Zustand",
    timeTravel: "Кастомно",
    selectors: "Частично",
    dependencies: "Zustand runtime",
    colorClass: "zustand",
    colorHex: "#2d8d7e",
  },
  mobx: {
    key: "mobx",
    title: "MobX",
    timeTravel: "Кастомно",
    selectors: "Нет",
    dependencies: "MobX runtime",
    colorClass: "mobx",
    colorHex: "#c5772f",
  },
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

export const weightedCriteria = {
  bundleSize: 0.25,
  dispatchSpeed: 0.35,
  dependencies: 0.15,
  builtInFeatures: 0.25,
} as const;

function calculateRerenderScore(totalChangedComponents: number, maxValue: number, minValue: number): number {
  if (maxValue === minValue) {
    return 100;
  }

  return ((maxValue - totalChangedComponents) / (maxValue - minValue)) * 100;
}

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

type RerenderZoneGroup =
  | "list"
  | "history"
  | "filters"
  | "stats"
  | "categories"
  | "summary"
  | "other";

function getRerenderZoneGroup(zone: string): RerenderZoneGroup {
  if (zone.startsWith("list-item:") || zone === "list-zone") {
    return "list";
  }

  if (zone.startsWith("history-item:") || zone === "history-zone") {
    return "history";
  }

  if (zone === "filters-zone") {
    return "filters";
  }

  if (zone === "stats-zone") {
    return "stats";
  }

  if (zone === "categories-zone") {
    return "categories";
  }

  if (zone === "summary-zone") {
    return "summary";
  }

  return "other";
}

function formatZoneSummary(changedZones: string[]): string {
  const grouped = new Map<RerenderZoneGroup, number>();

  for (const zone of changedZones) {
    const group = getRerenderZoneGroup(zone);
    grouped.set(group, (grouped.get(group) ?? 0) + 1);
  }

  return Array.from(grouped.entries())
    .sort((left, right) => right[1] - left[1])
    .slice(0, 3)
    .map(([group, count]) => `${group} ${count}`)
    .join(" • ");
}

export const benchmarkResults = results;

const rerenderTotals = implementationOrder.map(
  (key) => results.rerender.results[key]?.totalChangedComponents ?? 0,
);
const maxRerenderTotal = Math.max(...rerenderTotals, 0);
const minRerenderTotal = Math.min(...rerenderTotals, 0);

export const comparisonMetricRows: ComparisonMetricRow[] = implementationOrder.map((key) => {
  const dispatchEntry = results.dispatch.results[key];
  const bundleEntry = results.bundle.results[key];
  const rerenderEntry = results.rerender.results[key];
  const allChangedZones = rerenderEntry
    ? results.rerender.scenarios.flatMap((scenario) => rerenderEntry.scenarios[scenario].changedZones)
    : [];

  return {
    ...implementationMeta[key],
    dispatchOps: dispatchEntry?.opsPerSec ?? 0,
    bundleGzipKb: bundleEntry?.gzipKb ?? 0,
    rerenderChangedComponents: rerenderEntry?.totalChangedComponents ?? 0,
    rerenderCommits: rerenderEntry?.totalCommits ?? 0,
    rerenderSummary: `${rerenderEntry?.totalChangedComponents ?? 0} зон / ${rerenderEntry?.totalCommits ?? 0} commits`,
    rerenderZoneSummary: formatZoneSummary(allChangedZones),
    rerenderScore: calculateRerenderScore(
      rerenderEntry?.totalChangedComponents ?? 0,
      maxRerenderTotal,
      minRerenderTotal,
    ),
  };
});

export const comparisonOverviewRows = comparisonMetricRows.map((row) => ({
  library: row.title,
  dispatch: row.dispatchOps,
  bundle: row.bundleGzipKb,
  rerenderSummary: row.rerenderSummary,
  zoneSummary: row.rerenderZoneSummary,
  timeTravel: row.timeTravel,
  selectors: row.selectors,
}));

export const rerenderScenarioRows = implementationOrder.map((key) => {
  const rerenderEntry = results.rerender.results[key];

  return {
    library: implementationMeta[key].title,
    commits: rerenderEntry?.totalCommits ?? 0,
    changedComponents: rerenderEntry?.totalChangedComponents ?? 0,
    note: rerenderEntry
      ? `${results.rerender.scenarios.length} автоматических сценария`
      : "Нет данных",
  };
});

export const rerenderBreakdownRows = implementationOrder.map((key) => {
  const rerenderEntry = results.rerender.results[key];

  return {
    library: implementationMeta[key].title,
    totalCommits: rerenderEntry?.totalCommits ?? 0,
    totalChangedComponents: rerenderEntry?.totalChangedComponents ?? 0,
    zoneSummary: comparisonMetricRows.find((row) => row.key === key)?.rerenderZoneSummary ?? "—",
    scenarios: results.rerender.scenarios.map((scenario) => ({
      scenario,
      commits: rerenderEntry?.scenarios[scenario].commits ?? 0,
      changedComponents: rerenderEntry?.scenarios[scenario].changedComponents ?? 0,
      zoneSummary: formatZoneSummary(rerenderEntry?.scenarios[scenario].changedZones ?? []),
    })),
  };
});

export const librarySizeFact = results.librarySize.kiks;

const minBundleSize = Math.min(
  ...implementationOrder.map((key) => results.bundle.results[key]?.gzipKb ?? 0),
);
const maxDispatchSpeed = Math.max(
  ...implementationOrder.map((key) => results.dispatch.results[key]?.opsPerSec ?? 0),
);
const minDependencyCount = Math.min(
  ...implementationOrder.map((key) => dependencyCounts[key]),
);
const maxFeatureScore = Math.max(
  ...implementationOrder.map((key) => builtInFeatureScores[key]),
);

export const weightedScoreRows: WeightedScoreRow[] = implementationOrder
  .map((key) => {
    const bundleScore = normalizeLowerBetter(
      results.bundle.results[key]?.gzipKb ?? 0,
      minBundleSize,
    );
    const speedScore = normalizeHigherBetter(
      results.dispatch.results[key]?.opsPerSec ?? 0,
      maxDispatchSpeed,
    );
    const dependencyScore = normalizeLowerBetter(
      dependencyCounts[key] + 1,
      minDependencyCount + 1,
    );
    const featureScore = normalizeHigherBetter(
      builtInFeatureScores[key],
      maxFeatureScore,
    );

    const weightedTotal = Number(
      (
        bundleScore * weightedCriteria.bundleSize +
        speedScore * weightedCriteria.dispatchSpeed +
        dependencyScore * weightedCriteria.dependencies +
        featureScore * weightedCriteria.builtInFeatures
      ).toFixed(2),
    );

    return {
      key,
      title: implementationMeta[key].title,
      bundleScore,
      speedScore,
      dependencyScore,
      featureScore,
      weightedTotal,
    };
  })
  .sort((left, right) => right.weightedTotal - left.weightedTotal);

export const selectorAhpWeights = results.selectorStrategies?.ahp.weights ?? {
  firstRun: 0,
  repeatRun: 0,
  unrelatedChange: 0,
  memoryEfficiency: 0,
  implementationSimplicity: 0,
  integrationEase: 0,
  rerenderStability: 0,
};

export const selectorWinner = results.selectorStrategies?.winner ?? "dependencies";

export const selectorStrategyRows: SelectorStrategyRow[] = selectorStrategyOrder.map((key) => {
  const row = results.selectorStrategies?.results[key];

  return {
    key,
    title: row?.title ?? key,
    description: row?.description ?? "",
    firstRunMs: row?.firstRunMs ?? 0,
    repeatRunMs: row?.repeatRunMs ?? 0,
    unrelatedChangeMs: row?.unrelatedChangeMs ?? 0,
    relatedChangeMs: row?.relatedChangeMs ?? 0,
    recomputations: row?.recomputations ?? 0,
    cacheHits: row?.cacheHits ?? 0,
    memoryUnits: row?.memoryUnits ?? 0,
    implementationScore: row?.implementationScore ?? 0,
    integrationScore: row?.integrationScore ?? 0,
    rerenderStability: row?.rerenderStability ?? 0,
  };
});

const weightedSelectorScores = new Map(
  (results.selectorStrategies?.weightedSum ?? []).map((row) => [row.key, row.score]),
);
const topsisSelectorScores = new Map(
  (results.selectorStrategies?.topsis ?? []).map((row) => [row.key, row.score]),
);
const paretoSelectorStatus = new Map(
  (results.selectorStrategies?.pareto ?? []).map((row) => [
    row.key,
    row.isEfficient ? "Pareto frontier" : `Dominated by ${row.dominatedBy.join(", ")}`,
  ]),
);

export const selectorDecisionRows: SelectorDecisionRow[] = selectorStrategyRows
  .map((row) => ({
    key: row.key,
    title: row.title,
    weightedSum: weightedSelectorScores.get(row.key) ?? 0,
    topsis: topsisSelectorScores.get(row.key) ?? 0,
    paretoStatus: paretoSelectorStatus.get(row.key) ?? "No data",
    isWinner: row.key === selectorWinner,
  }))
  .sort((left, right) => right.weightedSum - left.weightedSum);

export const selectorAhpWeightRows = (
  Object.entries(selectorAhpWeights) as Array<[SelectorCriterionKey, number]>
).map(([criterion, weight]) => ({
  criterion,
  weight,
}));
