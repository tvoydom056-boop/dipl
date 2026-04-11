import rawResults from "../generated/benchmark-results.json";
import {
  implementationOrder,
  type BenchmarkResults,
  type ImplementationKey,
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

function calculateRerenderScore(totalChangedComponents: number, maxValue: number, minValue: number): number {
  if (maxValue === minValue) {
    return 100;
  }

  return ((maxValue - totalChangedComponents) / (maxValue - minValue)) * 100;
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
