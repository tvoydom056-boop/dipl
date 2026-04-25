import { Action } from "../../../../packages/kiks/src";

import type { Category, FilterMode, SortMode, Task } from "./types";

/**
 * Полезные нагрузки экшенов demo-приложения.
 */
export interface TaskActionPayloads {
  addTask: Task;
  toggleTask: { id: string };
  deleteTask: { id: string };
  setSearch: { value: string };
  setFilter: { value: FilterMode };
  setSort: { value: SortMode };
  addCategory: Category;
  selectCategory: { categoryId: string | null };
}

/**
 * Типы экшенов demo-приложения.
 */
export type TaskActionType = keyof TaskActionPayloads;

/**
 * Объединённый тип экшена demo-приложения.
 */
export type TaskActionUnion = {
  [K in TaskActionType]: Action<K, TaskActionPayloads[K]>;
}[TaskActionType];

/**
 * Фабрики экшенов.
 */
export const taskActions = {
  addTask(task: Task): TaskActionUnion {
    return new Action("addTask", task);
  },
  toggleTask(id: string): TaskActionUnion {
    return new Action("toggleTask", { id });
  },
  deleteTask(id: string): TaskActionUnion {
    return new Action("deleteTask", { id });
  },
  setSearch(value: string): TaskActionUnion {
    return new Action("setSearch", { value });
  },
  setFilter(value: FilterMode): TaskActionUnion {
    return new Action("setFilter", { value });
  },
  setSort(value: SortMode): TaskActionUnion {
    return new Action("setSort", { value });
  },
  addCategory(category: Category): TaskActionUnion {
    return new Action("addCategory", category);
  },
  selectCategory(categoryId: string | null): TaskActionUnion {
    return new Action("selectCategory", { categoryId });
  },
};
