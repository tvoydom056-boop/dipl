import { performance } from "node:perf_hooks";

import { createSelector } from "../packages/kiks/src";
import { createInitialTaskState, getVisibleTasks, type TaskState } from "../demo/src/shared/taskModel";
import { updateBenchmarkResults } from "./results-store";

const ITERATIONS = 100_000;
const RUNS = 3;
const DATASET_SIZE = 250;

type SelectorBenchmarkKey =
  | "namedCacheHit"
  | "namedCacheMiss"
  | "inlineCacheHit"
  | "inlineCacheMiss";

interface SelectorBenchMeasurement {
  title: string;
  opsPerSec: number;
  totalMs: number;
  averageMs: number;
  runOpsPerSec: number[];
}

function round(value: number, precision = 6): number {
  return Number(value.toFixed(precision));
}

function createBenchState(): TaskState {
  const baseState = createInitialTaskState();
  const extraTasks = Array.from({ length: DATASET_SIZE }, (_, index) => ({
    id: `selector-${index}`,
    title: index % 5 === 0 ? `Alpha task ${index}` : `Task ${index}`,
    description: index % 7 === 0 ? `Selector workload ${index}` : `Regular ${index}`,
    status: index % 3 === 0 ? ("completed" as const) : ("active" as const),
    categoryId: index % 2 === 0 ? "cat-core" : "cat-ui",
    createdAt: Date.now() - index * 50,
  }));

  return {
    ...baseState,
    tasks: [...baseState.tasks, ...extraTasks],
    search: "alpha",
  };
}

const baseState = createBenchState();
const missStates = Array.from({ length: ITERATIONS }, (_, index) => ({
  ...baseState,
  operationsCount: baseState.operationsCount + index + 1,
}));

function runScenario(task: () => void): { totalMs: number; opsPerSec: number } {
  const startedAt = performance.now();
  task();
  const totalMs = performance.now() - startedAt;

  return {
    totalMs: round(totalMs, 6),
    opsPerSec: round(ITERATIONS / (totalMs / 1000), 6),
  };
}

function measure(title: string, factory: () => void): SelectorBenchMeasurement {
  const runOpsPerSec: number[] = [];
  const totalMsRuns: number[] = [];

  for (let run = 0; run < RUNS; run += 1) {
    const result = runScenario(factory);
    runOpsPerSec.push(result.opsPerSec);
    totalMsRuns.push(result.totalMs);
  }

  const opsPerSec = round(
    runOpsPerSec.reduce((total, value) => total + value, 0) / runOpsPerSec.length,
    6,
  );
  const totalMs = round(
    totalMsRuns.reduce((total, value) => total + value, 0) / totalMsRuns.length,
    6,
  );

  return {
    title,
    opsPerSec,
    totalMs,
    averageMs: round(totalMs / ITERATIONS, 8),
    runOpsPerSec,
  };
}

function createNamedSelector() {
  const namedSelector = (state: TaskState) => getVisibleTasks(state);
  return createSelector(namedSelector);
}

const results: Record<SelectorBenchmarkKey, SelectorBenchMeasurement> = {
  namedCacheHit: measure("Named cache hit", () => {
    const selector = createNamedSelector();
    selector(baseState);

    for (let index = 0; index < ITERATIONS; index += 1) {
      selector(baseState);
    }
  }),
  namedCacheMiss: measure("Named cache miss", () => {
    const selector = createNamedSelector();

    for (let index = 0; index < ITERATIONS; index += 1) {
      selector(missStates[index]);
    }
  }),
  inlineCacheHit: measure("Inline cache hit", () => {
    for (let index = 0; index < ITERATIONS; index += 1) {
      const selector = createSelector((state: TaskState) => getVisibleTasks(state));
      selector(baseState);
    }
  }),
  inlineCacheMiss: measure("Inline cache miss", () => {
    for (let index = 0; index < ITERATIONS; index += 1) {
      const selector = createSelector((state: TaskState) => getVisibleTasks(state));
      selector(missStates[index]);
    }
  }),
};

updateBenchmarkResults((current) => ({
  ...current,
  selectorBenchmark: {
    iterations: ITERATIONS,
    runs: RUNS,
    results,
    summary: {
      bestCacheHit:
        results.namedCacheHit.opsPerSec >= results.inlineCacheHit.opsPerSec ? "named" : "inline",
      bestCacheMiss:
        results.namedCacheMiss.opsPerSec >= results.inlineCacheMiss.opsPerSec ? "named" : "inline",
    },
  },
}));

console.log(`Selector benchmark (${ITERATIONS} iterations x ${RUNS} runs)`);
console.table(
  Object.values(results).map((row) => ({
    title: row.title,
    opsPerSec: row.opsPerSec,
    totalMs: row.totalMs,
    averageMs: row.averageMs,
  })),
);
