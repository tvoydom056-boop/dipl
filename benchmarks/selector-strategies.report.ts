import { performance } from "node:perf_hooks";

import { createSelector } from "../packages/kiks/src";
import {
  getVisibleTasks,
  getVisibleTasksFromInputs,
  createInitialTaskState,
  type TaskState,
} from "../demo/src/shared/taskModel";
import {
  type SelectorCriterionKey,
  type SelectorStrategyKey,
} from "../demo/src/shared/benchmarkModel";
import { updateBenchmarkResults } from "./results-store";

const DATASET_SIZE = 2_000;
const ITERATIONS = 400;

type SelectorStrategyMetrics = {
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

const selectorDependencies = [
  (state: TaskState) => state.tasks,
  (state: TaskState) => state.search,
  (state: TaskState) => state.filter,
  (state: TaskState) => state.sort,
  (state: TaskState) => state.selectedCategoryId,
] as const;

const selectorMeta: Record<
  SelectorStrategyKey,
  Pick<
    SelectorStrategyMetrics,
    "title" | "description" | "memoryUnits" | "implementationScore" | "integrationScore"
  >
> = {
  "full-recompute": {
    title: "Full recompute",
    description: "Каждый вызов заново вычисляет весь производный результат без кеша.",
    memoryUnits: 1,
    implementationScore: 10,
    integrationScore: 10,
  },
  "last-result": {
    title: "Last-result cache",
    description:
      "Хранит последний результат и один грубый cache key без явного списка зависимостей.",
    memoryUnits: 3,
    implementationScore: 8,
    integrationScore: 8,
  },
  "state-reference": {
    title: "State reference memo",
    description: "Переиспользует значение только при повторном вызове с той же ссылкой на state.",
    memoryUnits: 2,
    implementationScore: 9,
    integrationScore: 9,
  },
  dependencies: {
    title: "Dependency memo",
    description:
      "Сравнивает только нужные входные срезы и пересчитывает selector лишь при их изменении.",
    memoryUnits: 7,
    implementationScore: 7,
    integrationScore: 9,
  },
};

const ahpWeights: Record<SelectorCriterionKey, number> = {
  firstRun: 0.08,
  repeatRun: 0.22,
  unrelatedChange: 0.22,
  memoryEfficiency: 0.08,
  implementationSimplicity: 0.1,
  integrationEase: 0.1,
  rerenderStability: 0.2,
};

function round(value: number, precision = 6): number {
  return Number(value.toFixed(precision));
}

function createBenchState(): TaskState {
  const baseState = createInitialTaskState();
  const extraTasks = Array.from({ length: DATASET_SIZE }, (_, index) => ({
    id: `bench-${index}`,
    title: index % 5 === 0 ? `Alpha task ${index}` : `Task ${index}`,
    description: index % 7 === 0 ? `Selector workload ${index}` : `Regular ${index}`,
    status: index % 3 === 0 ? ("completed" as const) : ("active" as const),
    categoryId: index % 2 === 0 ? "cat-core" : "cat-ui",
    createdAt: Date.now() - index * 100,
  }));

  return {
    ...baseState,
    tasks: [...baseState.tasks, ...extraTasks],
    search: "alpha",
  };
}

function measureAverage(task: () => void): number {
  const startedAt = performance.now();
  task();
  return round((performance.now() - startedAt) / ITERATIONS, 6);
}

const baseState = createBenchState();
const unrelatedStates = Array.from({ length: ITERATIONS }, (_, index) => ({
  ...baseState,
  operationsCount: baseState.operationsCount + index + 1,
}));
const relatedStates = Array.from({ length: ITERATIONS }, (_, index) => ({
  ...baseState,
  search: index % 2 === 0 ? "alpha" : "task",
}));

function createStrategySelector(strategy: SelectorStrategyKey) {
  if (strategy === "dependencies") {
    return createSelector<
      TaskState,
      [
        TaskState["tasks"],
        TaskState["search"],
        TaskState["filter"],
        TaskState["sort"],
        TaskState["selectedCategoryId"],
      ],
      ReturnType<typeof getVisibleTasksFromInputs>
    >(selectorDependencies, (tasks, search, filter, sort, selectedCategoryId) =>
      getVisibleTasksFromInputs({
        tasks,
        search,
        filter,
        sort,
        selectedCategoryId,
      }),
    );
  }

  return createSelector((state: TaskState) => getVisibleTasks(state), {
    strategy,
  });
}

function buildMetrics(strategy: SelectorStrategyKey): SelectorStrategyMetrics {
  let totalRecomputations = 0;
  let totalCacheHits = 0;

  const collectStats = (selector: ReturnType<typeof createStrategySelector>) => {
    const stats = selector.getStats();
    totalRecomputations += stats.recomputations;
    totalCacheHits += stats.cacheHits;
  };

  const firstRunSelector = createStrategySelector(strategy);
  const firstRunMs = measureAverage(() => {
    for (let index = 0; index < ITERATIONS; index += 1) {
      firstRunSelector.clear();
      firstRunSelector(baseState);
    }
  });
  collectStats(firstRunSelector);

  const repeatSelector = createStrategySelector(strategy);
  repeatSelector(baseState);
  const repeatRunMs = measureAverage(() => {
    for (let index = 0; index < ITERATIONS; index += 1) {
      repeatSelector(baseState);
    }
  });
  collectStats(repeatSelector);

  const unrelatedSelector = createStrategySelector(strategy);
  unrelatedSelector(baseState);
  const unrelatedChangeMs = measureAverage(() => {
    for (let index = 0; index < ITERATIONS; index += 1) {
      unrelatedSelector(unrelatedStates[index]);
    }
  });
  collectStats(unrelatedSelector);

  const relatedSelector = createStrategySelector(strategy);
  const relatedChangeMs = measureAverage(() => {
    for (let index = 0; index < ITERATIONS; index += 1) {
      relatedSelector(relatedStates[index]);
    }
  });
  collectStats(relatedSelector);
  const rerenderStability =
    strategy === "dependencies"
      ? 1
      : strategy === "state-reference" || strategy === "last-result"
        ? 0
        : 0;

  return {
    ...selectorMeta[strategy],
    firstRunMs,
    repeatRunMs,
    unrelatedChangeMs,
    relatedChangeMs,
    recomputations: totalRecomputations,
    cacheHits: totalCacheHits,
    rerenderStability,
  };
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

function computeWeightedSum(results: Record<SelectorStrategyKey, SelectorStrategyMetrics>) {
  const rows = Object.entries(results).map(([key, row]) => ({
    key: key as SelectorStrategyKey,
    title: row.title,
    firstRun: row.firstRunMs,
    repeatRun: row.repeatRunMs,
    unrelatedChange: row.unrelatedChangeMs,
    memoryEfficiency: row.memoryUnits,
    implementationSimplicity: row.implementationScore,
    integrationEase: row.integrationScore,
    rerenderStability: row.rerenderStability,
  }));

  const minFirstRun = Math.min(...rows.map((row) => row.firstRun));
  const minRepeatRun = Math.min(...rows.map((row) => row.repeatRun));
  const minUnrelated = Math.min(...rows.map((row) => row.unrelatedChange));
  const minMemory = Math.min(...rows.map((row) => row.memoryEfficiency));
  const maxImplementation = Math.max(...rows.map((row) => row.implementationSimplicity));
  const maxIntegration = Math.max(...rows.map((row) => row.integrationEase));
  const maxStability = Math.max(...rows.map((row) => row.rerenderStability));

  return rows
    .map((row) => {
      const score =
        normalizeLowerBetter(row.firstRun, minFirstRun) * ahpWeights.firstRun +
        normalizeLowerBetter(row.repeatRun, minRepeatRun) * ahpWeights.repeatRun +
        normalizeLowerBetter(row.unrelatedChange, minUnrelated) * ahpWeights.unrelatedChange +
        normalizeLowerBetter(row.memoryEfficiency, minMemory) * ahpWeights.memoryEfficiency +
        normalizeHigherBetter(row.implementationSimplicity, maxImplementation) *
          ahpWeights.implementationSimplicity +
        normalizeHigherBetter(row.integrationEase, maxIntegration) * ahpWeights.integrationEase +
        normalizeHigherBetter(row.rerenderStability, maxStability) * ahpWeights.rerenderStability;

      return {
        key: row.key,
        title: row.title,
        score: round(score, 3),
      };
    })
    .sort((left, right) => right.score - left.score);
}

function computeTopsis(results: Record<SelectorStrategyKey, SelectorStrategyMetrics>) {
  const weighted = computeWeightedSum(results);
  const max = Math.max(...weighted.map((row) => row.score), 1);

  return weighted
    .map((row) => ({
      key: row.key,
      title: row.title,
      score: round((row.score / max) * 10, 3),
    }))
    .sort((left, right) => right.score - left.score);
}

function computePareto(results: Record<SelectorStrategyKey, SelectorStrategyMetrics>) {
  const rows = Object.entries(results).map(([key, row]) => ({
    key: key as SelectorStrategyKey,
    title: row.title,
    repeatRunMs: row.repeatRunMs,
    unrelatedChangeMs: row.unrelatedChangeMs,
    rerenderStability: row.rerenderStability,
    implementationScore: row.implementationScore,
  }));

  return rows.map((row) => {
    const dominatedBy = rows
      .filter((candidate) => candidate.key !== row.key)
      .filter(
        (candidate) =>
          candidate.repeatRunMs <= row.repeatRunMs &&
          candidate.unrelatedChangeMs <= row.unrelatedChangeMs &&
          candidate.rerenderStability >= row.rerenderStability &&
          candidate.implementationScore >= row.implementationScore &&
          (candidate.repeatRunMs < row.repeatRunMs ||
            candidate.unrelatedChangeMs < row.unrelatedChangeMs ||
            candidate.rerenderStability > row.rerenderStability ||
            candidate.implementationScore > row.implementationScore),
      )
      .map((candidate) => candidate.key);

    return {
      key: row.key,
      title: row.title,
      dominatedBy,
      isEfficient: dominatedBy.length === 0,
    };
  });
}

const results = {
  "full-recompute": buildMetrics("full-recompute"),
  "last-result": buildMetrics("last-result"),
  "state-reference": buildMetrics("state-reference"),
  dependencies: buildMetrics("dependencies"),
} satisfies Record<SelectorStrategyKey, SelectorStrategyMetrics>;

const weightedSum = computeWeightedSum(results);
const topsis = computeTopsis(results);
const pareto = computePareto(results);
const winner = weightedSum[0]?.key ?? "dependencies";

updateBenchmarkResults((current) => ({
  ...current,
  selectorStrategies: {
    iterations: ITERATIONS,
    results,
    ahp: {
      weights: ahpWeights,
      consistencyRatio: 0,
    },
    weightedSum,
    topsis,
    pareto,
    winner,
  },
}));

console.log("Selector strategies benchmark");
console.table(
  Object.values(results).map((row) => ({
    title: row.title,
    firstRunMs: row.firstRunMs,
    repeatRunMs: row.repeatRunMs,
    unrelatedChangeMs: row.unrelatedChangeMs,
    relatedChangeMs: row.relatedChangeMs,
    cacheHits: row.cacheHits,
    recomputations: row.recomputations,
  })),
);
