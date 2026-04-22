export type ImplementationKey = "kiks" | "redux" | "zustand" | "mobx";
export type RerenderScenarioKey = "addTask" | "toggleTask" | "setSearch" | "undo";
export type SelectorStrategyKey =
  | "full-recompute"
  | "last-result"
  | "state-reference"
  | "dependencies";
export type SelectorCriterionKey =
  | "firstRun"
  | "repeatRun"
  | "unrelatedChange"
  | "memoryEfficiency"
  | "implementationSimplicity"
  | "integrationEase"
  | "rerenderStability";

export interface DispatchBenchEntry {
  name: string;
  opsPerSec: number;
  totalMs: number;
}

export interface BundleBenchEntry {
  rawKb: number;
  gzipKb: number;
}

export interface RerenderScenarioEntry {
  commits: number;
  changedComponents: number;
  changedZones: string[];
}

export interface RerenderBenchEntry {
  totalCommits: number;
  totalChangedComponents: number;
  scenarios: Record<RerenderScenarioKey, RerenderScenarioEntry>;
}

export interface LibrarySizeEntry {
  files: number;
  rawKb: number;
  gzipKb: number;
}

export interface SelectorStrategyBenchEntry {
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
}

export interface SelectorMethodScoreEntry {
  key: SelectorStrategyKey;
  title: string;
  score: number;
}

export interface ParetoEntry {
  key: SelectorStrategyKey;
  title: string;
  dominatedBy: SelectorStrategyKey[];
  isEfficient: boolean;
}

export interface BenchmarkResults {
  generatedAt: string | null;
  dispatch: {
    iterations: number;
    results: Record<ImplementationKey, DispatchBenchEntry>;
  };
  bundle: {
    results: Record<ImplementationKey, BundleBenchEntry>;
  };
  rerender: {
    scenarios: RerenderScenarioKey[];
    results: Record<ImplementationKey, RerenderBenchEntry>;
  };
  librarySize: {
    kiks: LibrarySizeEntry | null;
  };
  selectorStrategies: {
    iterations: number;
    results: Record<SelectorStrategyKey, SelectorStrategyBenchEntry>;
    ahp: {
      weights: Record<SelectorCriterionKey, number>;
      consistencyRatio: number;
    };
    weightedSum: SelectorMethodScoreEntry[];
    topsis: SelectorMethodScoreEntry[];
    pareto: ParetoEntry[];
    winner: SelectorStrategyKey;
  };
}

export const implementationOrder: ImplementationKey[] = [
  "kiks",
  "redux",
  "zustand",
  "mobx",
];

export const rerenderScenarioOrder: RerenderScenarioKey[] = [
  "addTask",
  "toggleTask",
  "setSearch",
  "undo",
];

export const selectorStrategyOrder: SelectorStrategyKey[] = [
  "full-recompute",
  "last-result",
  "state-reference",
  "dependencies",
];

function createEmptySelectorStrategyEntry(key: SelectorStrategyKey): SelectorStrategyBenchEntry {
  const titles: Record<SelectorStrategyKey, string> = {
    "full-recompute": "Full recompute",
    "last-result": "Last-result cache",
    "state-reference": "State reference memo",
    dependencies: "Dependency memo",
  };

  return {
    title: titles[key],
    description: "",
    firstRunMs: 0,
    repeatRunMs: 0,
    unrelatedChangeMs: 0,
    relatedChangeMs: 0,
    recomputations: 0,
    cacheHits: 0,
    memoryUnits: 0,
    implementationScore: 0,
    integrationScore: 0,
    rerenderStability: 0,
  };
}

function createEmptyRerenderScenario(): RerenderScenarioEntry {
  return {
    commits: 0,
    changedComponents: 0,
    changedZones: [],
  };
}

function createEmptyRerenderEntry(): RerenderBenchEntry {
  return {
    totalCommits: 0,
    totalChangedComponents: 0,
    scenarios: {
      addTask: createEmptyRerenderScenario(),
      toggleTask: createEmptyRerenderScenario(),
      setSearch: createEmptyRerenderScenario(),
      undo: createEmptyRerenderScenario(),
    },
  };
}

export function createEmptyBenchmarkResults(): BenchmarkResults {
  return {
    generatedAt: null,
    dispatch: {
      iterations: 0,
      results: {
        kiks: { name: "kiks", opsPerSec: 0, totalMs: 0 },
        redux: { name: "redux toolkit", opsPerSec: 0, totalMs: 0 },
        zustand: { name: "zustand", opsPerSec: 0, totalMs: 0 },
        mobx: { name: "mobx", opsPerSec: 0, totalMs: 0 },
      },
    },
    bundle: {
      results: {
        kiks: { rawKb: 0, gzipKb: 0 },
        redux: { rawKb: 0, gzipKb: 0 },
        zustand: { rawKb: 0, gzipKb: 0 },
        mobx: { rawKb: 0, gzipKb: 0 },
      },
    },
    rerender: {
      scenarios: [...rerenderScenarioOrder],
      results: {
        kiks: createEmptyRerenderEntry(),
        redux: createEmptyRerenderEntry(),
        zustand: createEmptyRerenderEntry(),
        mobx: createEmptyRerenderEntry(),
      },
    },
    librarySize: {
      kiks: null,
    },
    selectorStrategies: {
      iterations: 0,
      results: {
        "full-recompute": createEmptySelectorStrategyEntry("full-recompute"),
        "last-result": createEmptySelectorStrategyEntry("last-result"),
        "state-reference": createEmptySelectorStrategyEntry("state-reference"),
        dependencies: createEmptySelectorStrategyEntry("dependencies"),
      },
      ahp: {
        weights: {
          firstRun: 0,
          repeatRun: 0,
          unrelatedChange: 0,
          memoryEfficiency: 0,
          implementationSimplicity: 0,
          integrationEase: 0,
          rerenderStability: 0,
        },
        consistencyRatio: 0,
      },
      weightedSum: [],
      topsis: [],
      pareto: [],
      winner: "dependencies",
    },
  };
}
