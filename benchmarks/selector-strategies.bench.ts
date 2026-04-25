import { bench, describe } from "../demo/node_modules/vitest/dist/index";

import { createSelector } from "../packages/kiks/src";
import {
  createInitialTaskState,
  getVisibleTasks,
  getVisibleTasksFromInputs,
  type TaskState,
} from "../demo/src/shared/taskModel";

const DATASET_SIZE = 2_000;
const ITERATIONS = 5_000;

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

const baseState = createBenchState();
const unrelatedStates = Array.from({ length: ITERATIONS }, (_, index) => ({
  ...baseState,
  operationsCount: baseState.operationsCount + index + 1,
}));
const relatedStates = Array.from({ length: ITERATIONS }, (_, index) => ({
  ...baseState,
  search: index % 2 === 0 ? "alpha" : "task",
}));
const selectorDependencies = [
  (state: TaskState) => state.tasks,
  (state: TaskState) => state.search,
  (state: TaskState) => state.filter,
  (state: TaskState) => state.sort,
  (state: TaskState) => state.selectedCategoryId,
] as const;

describe("selector benchmark", () => {
  bench("full recompute cache miss", () => {
    const selector = createSelector((state: TaskState) => getVisibleTasks(state), {
      strategy: "full-recompute",
    });

    for (let index = 0; index < ITERATIONS; index += 1) {
      selector(relatedStates[index]);
    }
  });

  bench("state reference cache hit", () => {
    const selector = createSelector((state: TaskState) => getVisibleTasks(state));
    selector(baseState);

    for (let index = 0; index < ITERATIONS; index += 1) {
      selector(baseState);
    }
  });

  bench("dependency selector cache hit on unrelated changes", () => {
    const selector = createSelector<
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
    selector(baseState);

    for (let index = 0; index < ITERATIONS; index += 1) {
      selector(unrelatedStates[index]);
    }
  });

  bench("dependency selector cache miss on related changes", () => {
    const selector = createSelector<
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

    for (let index = 0; index < ITERATIONS; index += 1) {
      selector(relatedStates[index]);
    }
  });
});
