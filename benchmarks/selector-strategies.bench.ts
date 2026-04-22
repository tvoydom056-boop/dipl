import { performance } from "node:perf_hooks";

import {
  createSelector,
  type MemoizedSelector,
  type SelectorOptions,
  type SelectorStrategy,
} from "../packages/kiks/src";
import {
  createInitialTaskState,
  getVisibleTasks,
  getVisibleTasksFromInputs,
  type Task,
  type TaskState,
} from "../demo/src/shared/taskModel";
import {
  selectorStrategyOrder,
  type BenchmarkResults,
  type ParetoEntry,
  type SelectorCriterionKey,
  type SelectorMethodScoreEntry,
  type SelectorStrategyBenchEntry,
  type SelectorStrategyKey,
} from "../demo/src/shared/benchmarkModel";
import { updateBenchmarkResults } from "./results-store";

const DATASET_SIZE = 2_000;
const ITERATIONS = 400;
const FIRST_RUN_SAMPLES = 120;
const REPEAT_ITERATIONS = 1_200;

type StrategyDefinition = {
  key: SelectorStrategyKey;
  title: string;
  description: string;
  memoryUnits: number;
  implementationScore: number;
  integrationScore: number;
  create(): MemoizedSelector<TaskState, Task[]>;
};

type ScenarioMetrics = {
  ms: number;
  recomputations: number;
  cacheHits: number;
  stableReferenceRate: number;
};

const criterionWeights: Record<SelectorCriterionKey, number> = {
  firstRun: 0.08,
  repeatRun: 0.22,
  unrelatedChange: 0.22,
  memoryEfficiency: 0.08,
  implementationSimplicity: 0.1,
  integrationEase: 0.1,
  rerenderStability: 0.2,
};

const selectorDependencies = [
  (state: TaskState) => state.tasks,
  (state: TaskState) => state.search,
  (state: TaskState) => state.filter,
  (state: TaskState) => state.sort,
  (state: TaskState) => state.selectedCategoryId,
] as const;

function formatNumber(value: number): string {
  return new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 3,
  }).format(value);
}

function createBenchState(): TaskState {
  const baseState = createInitialTaskState();
  const extraTasks = Array.from({ length: DATASET_SIZE }, (_, index) => ({
    id: `bench-${index}`,
    title: index % 5 === 0 ? `Alpha task ${index}` : `Task ${index}`,
    description:
      index % 7 === 0
        ? `Selector benchmark workload ${index}`
        : `Regular description ${index}`,
    status: index % 3 === 0 ? ("completed" as const) : ("active" as const),
    categoryId: index % 4 === 0 ? "cat-core" : "cat-ui",
    createdAt: Date.now() - index * 100,
  }));

  return {
    ...baseState,
    tasks: [...baseState.tasks, ...extraTasks],
    search: "alpha",
  };
}

function createLastResultOptions(): SelectorOptions<TaskState, string> {
  return {
    strategy: "last-result",
    getCacheKey: (state) =>
      [
        state.operationsCount,
        state.search,
        state.filter,
        state.sort,
        state.selectedCategoryId ?? "all",
      ].join("|"),
  };
}

const strategyDefinitions: StrategyDefinition[] = [
  {
    key: "full-recompute",
    title: "Full recompute",
    description: "Каждый вызов заново вычисляет весь производный результат без кеша.",
    memoryUnits: 1,
    implementationScore: 10,
    integrationScore: 10,
    create: () =>
      createSelector((state: TaskState) => getVisibleTasks(state), {
        strategy: "full-recompute",
      }),
  },
  {
    key: "last-result",
    title: "Last-result cache",
    description: "Хранит последний результат и один грубый cache key без явного списка зависимостей.",
    memoryUnits: 3,
    implementationScore: 8,
    integrationScore: 8,
    create: () =>
      createSelector((state: TaskState) => getVisibleTasks(state), createLastResultOptions()),
  },
  {
    key: "state-reference",
    title: "State reference memo",
    description: "Переиспользует значение только при повторном вызове с той же ссылкой на state.",
    memoryUnits: 2,
    implementationScore: 9,
    integrationScore: 9,
    create: () => createSelector((state: TaskState) => getVisibleTasks(state)),
  },
  {
    key: "dependencies",
    title: "Dependency memo",
    description: "Сравнивает только нужные входные срезы и пересчитывает selector лишь при их изменении.",
    memoryUnits: 7,
    implementationScore: 7,
    integrationScore: 9,
    create: () =>
      createSelector(selectorDependencies, (tasks, search, filter, sort, selectedCategoryId) =>
        getVisibleTasksFromInputs({
          tasks,
          search,
          filter,
          sort,
          selectedCategoryId,
        }),
      ),
  },
];

const strategyByKey = Object.fromEntries(
  strategyDefinitions.map((definition) => [definition.key, definition]),
) as Record<SelectorStrategyKey, StrategyDefinition>;

function average(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1);
}

function measureFirstRun(create: StrategyDefinition["create"], state: TaskState): ScenarioMetrics {
  const timings: number[] = [];
  let recomputations = 0;
  let cacheHits = 0;

  for (let index = 0; index < FIRST_RUN_SAMPLES; index += 1) {
    const selector = create();
    const startedAt = performance.now();
    selector(state);
    timings.push(performance.now() - startedAt);
    recomputations += selector.getStats().recomputations;
    cacheHits += selector.getStats().cacheHits;
  }

  return {
    ms: average(timings),
    recomputations,
    cacheHits,
    stableReferenceRate: 0,
  };
}

function measureRepeatRun(create: StrategyDefinition["create"], state: TaskState): ScenarioMetrics {
  const selector = create();
  selector(state);

  const startedAt = performance.now();
  for (let index = 0; index < REPEAT_ITERATIONS; index += 1) {
    selector(state);
  }
  const totalMs = performance.now() - startedAt;

  const stats = selector.getStats();

  return {
    ms: totalMs / REPEAT_ITERATIONS,
    recomputations: stats.recomputations,
    cacheHits: stats.cacheHits,
    stableReferenceRate: 1,
  };
}

function measureUnrelatedChange(create: StrategyDefinition["create"], baseState: TaskState): ScenarioMetrics {
  const selector = create();
  let previousResult = selector(baseState);
  let stableReferences = 0;

  const startedAt = performance.now();
  for (let index = 0; index < ITERATIONS; index += 1) {
    const nextState: TaskState = {
      ...baseState,
      operationsCount: baseState.operationsCount + index + 1,
    };
    const nextResult = selector(nextState);

    if (Object.is(previousResult, nextResult)) {
      stableReferences += 1;
    }

    previousResult = nextResult;
  }
  const totalMs = performance.now() - startedAt;
  const stats = selector.getStats();

  return {
    ms: totalMs / ITERATIONS,
    recomputations: stats.recomputations,
    cacheHits: stats.cacheHits,
    stableReferenceRate: stableReferences / ITERATIONS,
  };
}

function measureRelatedChange(create: StrategyDefinition["create"], baseState: TaskState): ScenarioMetrics {
  const selector = create();
  selector(baseState);
  let previousResult = selector(baseState);
  let stableReferences = 0;

  const startedAt = performance.now();
  for (let index = 0; index < ITERATIONS; index += 1) {
    const nextState: TaskState = {
      ...baseState,
      search: index % 2 === 0 ? "alpha" : "task",
    };
    const nextResult = selector(nextState);

    if (Object.is(previousResult, nextResult)) {
      stableReferences += 1;
    }

    previousResult = nextResult;
  }
  const totalMs = performance.now() - startedAt;
  const stats = selector.getStats();

  return {
    ms: totalMs / ITERATIONS,
    recomputations: stats.recomputations,
    cacheHits: stats.cacheHits,
    stableReferenceRate: stableReferences / ITERATIONS,
  };
}

function normalizeHigherBetter(value: number, max: number): number {
  if (max === 0) {
    return 0;
  }

  return value / max;
}

function normalizeLowerBetter(value: number, min: number): number {
  if (value === 0) {
    return 0;
  }

  return min / value;
}

function calculateWeightedScores(
  rows: Record<SelectorStrategyKey, SelectorStrategyBenchEntry>,
): SelectorMethodScoreEntry[] {
  const firstRunMin = Math.min(...selectorStrategyOrder.map((key) => rows[key].firstRunMs));
  const repeatMin = Math.min(...selectorStrategyOrder.map((key) => rows[key].repeatRunMs));
  const unrelatedMin = Math.min(
    ...selectorStrategyOrder.map((key) => rows[key].unrelatedChangeMs),
  );
  const memoryMin = Math.min(...selectorStrategyOrder.map((key) => rows[key].memoryUnits));
  const implementationMax = Math.max(
    ...selectorStrategyOrder.map((key) => rows[key].implementationScore),
  );
  const integrationMax = Math.max(
    ...selectorStrategyOrder.map((key) => rows[key].integrationScore),
  );
  const rerenderMax = Math.max(
    ...selectorStrategyOrder.map((key) => rows[key].rerenderStability),
  );

  return selectorStrategyOrder
    .map((key) => {
      const row = rows[key];
      const score =
        normalizeLowerBetter(row.firstRunMs, firstRunMin) * criterionWeights.firstRun +
        normalizeLowerBetter(row.repeatRunMs, repeatMin) * criterionWeights.repeatRun +
        normalizeLowerBetter(row.unrelatedChangeMs, unrelatedMin) * criterionWeights.unrelatedChange +
        normalizeLowerBetter(row.memoryUnits, memoryMin) * criterionWeights.memoryEfficiency +
        normalizeHigherBetter(row.implementationScore, implementationMax) *
          criterionWeights.implementationSimplicity +
        normalizeHigherBetter(row.integrationScore, integrationMax) *
          criterionWeights.integrationEase +
        normalizeHigherBetter(row.rerenderStability, rerenderMax) *
          criterionWeights.rerenderStability;

      return {
        key,
        title: rows[key].title,
        score: Number((score * 10).toFixed(3)),
      };
    })
    .sort((left, right) => right.score - left.score);
}

function calculateTopsisScores(
  rows: Record<SelectorStrategyKey, SelectorStrategyBenchEntry>,
): SelectorMethodScoreEntry[] {
  const criteria = {
    firstRun: selectorStrategyOrder.map((key) => rows[key].firstRunMs),
    repeatRun: selectorStrategyOrder.map((key) => rows[key].repeatRunMs),
    unrelatedChange: selectorStrategyOrder.map((key) => rows[key].unrelatedChangeMs),
    memoryEfficiency: selectorStrategyOrder.map((key) => rows[key].memoryUnits),
    implementationSimplicity: selectorStrategyOrder.map((key) => rows[key].implementationScore),
    integrationEase: selectorStrategyOrder.map((key) => rows[key].integrationScore),
    rerenderStability: selectorStrategyOrder.map((key) => rows[key].rerenderStability),
  } satisfies Record<SelectorCriterionKey, number[]>;

  const normalizedMatrix = selectorStrategyOrder.map((key, rowIndex) => {
    const row = rows[key];

    return {
      firstRun:
        (row.firstRunMs /
          Math.sqrt(criteria.firstRun.reduce((sum, value) => sum + value ** 2, 0))) *
        criterionWeights.firstRun,
      repeatRun:
        (row.repeatRunMs /
          Math.sqrt(criteria.repeatRun.reduce((sum, value) => sum + value ** 2, 0))) *
        criterionWeights.repeatRun,
      unrelatedChange:
        (row.unrelatedChangeMs /
          Math.sqrt(criteria.unrelatedChange.reduce((sum, value) => sum + value ** 2, 0))) *
        criterionWeights.unrelatedChange,
      memoryEfficiency:
        (row.memoryUnits /
          Math.sqrt(criteria.memoryEfficiency.reduce((sum, value) => sum + value ** 2, 0))) *
        criterionWeights.memoryEfficiency,
      implementationSimplicity:
        (row.implementationScore /
          Math.sqrt(
            criteria.implementationSimplicity.reduce((sum, value) => sum + value ** 2, 0),
          )) * criterionWeights.implementationSimplicity,
      integrationEase:
        (row.integrationScore /
          Math.sqrt(criteria.integrationEase.reduce((sum, value) => sum + value ** 2, 0))) *
        criterionWeights.integrationEase,
      rerenderStability:
        (row.rerenderStability /
          Math.sqrt(criteria.rerenderStability.reduce((sum, value) => sum + value ** 2, 0))) *
        criterionWeights.rerenderStability,
      rowIndex,
    };
  });

  const idealBest = {
    firstRun: Math.min(...normalizedMatrix.map((row) => row.firstRun)),
    repeatRun: Math.min(...normalizedMatrix.map((row) => row.repeatRun)),
    unrelatedChange: Math.min(...normalizedMatrix.map((row) => row.unrelatedChange)),
    memoryEfficiency: Math.min(...normalizedMatrix.map((row) => row.memoryEfficiency)),
    implementationSimplicity: Math.max(
      ...normalizedMatrix.map((row) => row.implementationSimplicity),
    ),
    integrationEase: Math.max(...normalizedMatrix.map((row) => row.integrationEase)),
    rerenderStability: Math.max(...normalizedMatrix.map((row) => row.rerenderStability)),
  };

  const idealWorst = {
    firstRun: Math.max(...normalizedMatrix.map((row) => row.firstRun)),
    repeatRun: Math.max(...normalizedMatrix.map((row) => row.repeatRun)),
    unrelatedChange: Math.max(...normalizedMatrix.map((row) => row.unrelatedChange)),
    memoryEfficiency: Math.max(...normalizedMatrix.map((row) => row.memoryEfficiency)),
    implementationSimplicity: Math.min(
      ...normalizedMatrix.map((row) => row.implementationSimplicity),
    ),
    integrationEase: Math.min(...normalizedMatrix.map((row) => row.integrationEase)),
    rerenderStability: Math.min(...normalizedMatrix.map((row) => row.rerenderStability)),
  };

  return normalizedMatrix
    .map((row) => {
      const distanceToBest = Math.sqrt(
        (row.firstRun - idealBest.firstRun) ** 2 +
          (row.repeatRun - idealBest.repeatRun) ** 2 +
          (row.unrelatedChange - idealBest.unrelatedChange) ** 2 +
          (row.memoryEfficiency - idealBest.memoryEfficiency) ** 2 +
          (row.implementationSimplicity - idealBest.implementationSimplicity) ** 2 +
          (row.integrationEase - idealBest.integrationEase) ** 2 +
          (row.rerenderStability - idealBest.rerenderStability) ** 2,
      );

      const distanceToWorst = Math.sqrt(
        (row.firstRun - idealWorst.firstRun) ** 2 +
          (row.repeatRun - idealWorst.repeatRun) ** 2 +
          (row.unrelatedChange - idealWorst.unrelatedChange) ** 2 +
          (row.memoryEfficiency - idealWorst.memoryEfficiency) ** 2 +
          (row.implementationSimplicity - idealWorst.implementationSimplicity) ** 2 +
          (row.integrationEase - idealWorst.integrationEase) ** 2 +
          (row.rerenderStability - idealWorst.rerenderStability) ** 2,
      );

      const score = distanceToWorst / (distanceToBest + distanceToWorst);
      const key = selectorStrategyOrder[row.rowIndex];

      return {
        key,
        title: rows[key].title,
        score: Number((score * 10).toFixed(3)),
      };
    })
    .sort((left, right) => right.score - left.score);
}

function calculateParetoFrontier(
  rows: Record<SelectorStrategyKey, SelectorStrategyBenchEntry>,
): ParetoEntry[] {
  const isBetterOrEqual = (
    candidate: SelectorStrategyBenchEntry,
    current: SelectorStrategyBenchEntry,
  ): boolean =>
    candidate.firstRunMs <= current.firstRunMs &&
    candidate.repeatRunMs <= current.repeatRunMs &&
    candidate.unrelatedChangeMs <= current.unrelatedChangeMs &&
    candidate.memoryUnits <= current.memoryUnits &&
    candidate.implementationScore >= current.implementationScore &&
    candidate.integrationScore >= current.integrationScore &&
    candidate.rerenderStability >= current.rerenderStability;

  const isStrictlyBetter = (
    candidate: SelectorStrategyBenchEntry,
    current: SelectorStrategyBenchEntry,
  ): boolean =>
    candidate.firstRunMs < current.firstRunMs ||
    candidate.repeatRunMs < current.repeatRunMs ||
    candidate.unrelatedChangeMs < current.unrelatedChangeMs ||
    candidate.memoryUnits < current.memoryUnits ||
    candidate.implementationScore > current.implementationScore ||
    candidate.integrationScore > current.integrationScore ||
    candidate.rerenderStability > current.rerenderStability;

  return selectorStrategyOrder.map((key) => {
    const current = rows[key];
    const dominatedBy = selectorStrategyOrder.filter((otherKey) => {
      if (otherKey === key) {
        return false;
      }

      const candidate = rows[otherKey];
      return isBetterOrEqual(candidate, current) && isStrictlyBetter(candidate, current);
    });

    return {
      key,
      title: current.title,
      dominatedBy,
      isEfficient: dominatedBy.length === 0,
    };
  });
}

function runStrategyBenchmarks(): Record<SelectorStrategyKey, SelectorStrategyBenchEntry> {
  const baseState = createBenchState();

  return Object.fromEntries(
    strategyDefinitions.map((definition) => {
      const firstRun = measureFirstRun(definition.create, baseState);
      const repeatRun = measureRepeatRun(definition.create, baseState);
      const unrelatedChange = measureUnrelatedChange(definition.create, baseState);
      const relatedChange = measureRelatedChange(definition.create, baseState);

      return [
        definition.key,
        {
          title: definition.title,
          description: definition.description,
          firstRunMs: Number(firstRun.ms.toFixed(6)),
          repeatRunMs: Number(repeatRun.ms.toFixed(6)),
          unrelatedChangeMs: Number(unrelatedChange.ms.toFixed(6)),
          relatedChangeMs: Number(relatedChange.ms.toFixed(6)),
          recomputations:
            firstRun.recomputations +
            repeatRun.recomputations +
            unrelatedChange.recomputations +
            relatedChange.recomputations,
          cacheHits:
            firstRun.cacheHits +
            repeatRun.cacheHits +
            unrelatedChange.cacheHits +
            relatedChange.cacheHits,
          memoryUnits: definition.memoryUnits,
          implementationScore: definition.implementationScore,
          integrationScore: definition.integrationScore,
          rerenderStability: Number(unrelatedChange.stableReferenceRate.toFixed(6)),
        } satisfies SelectorStrategyBenchEntry,
      ];
    }),
  ) as Record<SelectorStrategyKey, SelectorStrategyBenchEntry>;
}

function updateSelectorStrategyResults(
  current: BenchmarkResults,
  rows: Record<SelectorStrategyKey, SelectorStrategyBenchEntry>,
): BenchmarkResults {
  const weightedSum = calculateWeightedScores(rows);
  const topsis = calculateTopsisScores(rows);
  const pareto = calculateParetoFrontier(rows);
  const weightedWinner = weightedSum[0]?.key ?? "dependencies";
  const topsisWinner = topsis[0]?.key ?? "dependencies";
  const finalWinner =
    weightedWinner === topsisWinner && pareto.some((entry) => entry.key === weightedWinner && entry.isEfficient)
      ? weightedWinner
      : "dependencies";

  return {
    ...current,
    selectorStrategies: {
      iterations: ITERATIONS,
      results: rows,
      ahp: {
        weights: criterionWeights,
        consistencyRatio: 0,
      },
      weightedSum,
      topsis,
      pareto,
      winner: finalWinner,
    },
  };
}

const rows = runStrategyBenchmarks();
const weightedSum = calculateWeightedScores(rows);
const topsis = calculateTopsisScores(rows);
const pareto = calculateParetoFrontier(rows);

updateBenchmarkResults((current) => updateSelectorStrategyResults(current, rows));

console.log(`Selector benchmark: ${ITERATIONS} изменений состояния и ${REPEAT_ITERATIONS} повторных вызовов`);
console.table(
  selectorStrategyOrder.map((key) => ({
    strategy: rows[key].title,
    firstRunMs: rows[key].firstRunMs,
    repeatRunMs: rows[key].repeatRunMs,
    unrelatedChangeMs: rows[key].unrelatedChangeMs,
    relatedChangeMs: rows[key].relatedChangeMs,
    rerenderStability: rows[key].rerenderStability,
  })),
);

console.log("AHP weights:");
console.table(
  Object.entries(criterionWeights).map(([criterion, weight]) => ({
    criterion,
    weight,
  })),
);

console.log("Weighted sum:");
console.table(weightedSum);

console.log("TOPSIS:");
console.table(topsis);

console.log("Pareto frontier:");
console.table(
  pareto.map((entry) => ({
    strategy: entry.title,
    efficient: entry.isEfficient,
    dominatedBy: entry.dominatedBy.join(", ") || "none",
  })),
);

for (const key of selectorStrategyOrder) {
  const row = rows[key];
  console.log(
    `${row.title.padEnd(22)} first=${formatNumber(row.firstRunMs)} ms | repeat=${formatNumber(
      row.repeatRunMs,
    )} ms | unrelated=${formatNumber(row.unrelatedChangeMs)} ms | stable=${formatNumber(
      row.rerenderStability * 100,
    )}%`,
  );
}
