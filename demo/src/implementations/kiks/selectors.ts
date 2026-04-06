import { createSelector, type Selector } from "kiks";

import {
  getRootCategories,
  getTaskStats,
  getVisibleTasks,
  type Category,
  type Task,
  type TaskState,
} from "../../shared/taskModel";

/**
 * Возвращает список категорий верхнего уровня.
 */
export const selectRootCategories = createSelector<TaskState, Category[]>(
  (state) => getRootCategories(state),
);

/**
 * Возвращает дочерние категории по идентификатору родителя.
 */
export function selectChildCategories(parentId: string | null): Selector<TaskState, Category[]> {
  return createSelector((state: TaskState) =>
    state.categories.filter((category) => category.parentId === parentId),
  );
}

/**
 * Возвращает задачи с учётом поиска, фильтра и сортировки.
 */
export const selectVisibleTasks = createSelector<TaskState, Task[]>((state) => {
  return getVisibleTasks(state);
});

/**
 * Сводные показатели по задачам.
 */
export const selectTaskStats = createSelector<TaskState, {
  total: number;
  active: number;
  completed: number;
}>((state) => getTaskStats(state));
