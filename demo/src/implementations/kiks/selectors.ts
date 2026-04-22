import { createSelector, type Selector } from "kiks";

import {
  getChildCategoriesFromList,
  getRootCategoriesFromList,
  getTaskStatsFromTasks,
  getVisibleTasksFromInputs,
  type Category,
  type Task,
  type TaskState,
} from "../../shared/taskModel";

/**
 * Returns top-level categories and skips recomputation when categories stay stable.
 */
export const selectRootCategories = createSelector<TaskState, [Category[]], Category[]>(
  [(state) => state.categories] as const,
  (categories) => getRootCategoriesFromList(categories),
);

/**
 * Returns child categories for a given parent id.
 */
export function selectChildCategories(parentId: string | null): Selector<TaskState, Category[]> {
  return createSelector<TaskState, [Category[]], Category[]>(
    [(state) => state.categories] as const,
    (categories) => getChildCategoriesFromList(categories, parentId),
  );
}

/**
 * Returns tasks filtered by search, status, category and sort mode.
 */
export const selectVisibleTasks = createSelector<
  TaskState,
  [Task[], string, TaskState["filter"], TaskState["sort"], string | null],
  Task[]
>(
  [
    (state) => state.tasks,
    (state) => state.search,
    (state) => state.filter,
    (state) => state.sort,
    (state) => state.selectedCategoryId,
  ] as const,
  (tasks, search, filter, sort, selectedCategoryId) =>
    getVisibleTasksFromInputs({
      tasks,
      search,
      filter,
      sort,
      selectedCategoryId,
    }),
);

/**
 * Returns summary statistics derived only from the task list.
 */
export const selectTaskStats = createSelector<TaskState, [Task[]], {
  total: number;
  active: number;
  completed: number;
}>(
  [(state) => state.tasks] as const,
  (tasks) => getTaskStatsFromTasks(tasks),
);
