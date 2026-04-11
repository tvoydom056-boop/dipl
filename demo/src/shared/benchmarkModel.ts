export type ImplementationKey = "kiks" | "redux" | "zustand" | "mobx";
export type RerenderScenarioKey = "addTask" | "toggleTask" | "setSearch" | "undo";

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
  };
}
