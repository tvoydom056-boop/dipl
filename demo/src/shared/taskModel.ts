/**
 * Status for a single task.
 */
export type TaskStatus = "active" | "completed";

/**
 * Supported task sort modes.
 */
export type SortMode = "created-desc" | "created-asc" | "title-asc";

/**
 * Supported task filter modes.
 */
export type FilterMode = "all" | "active" | "completed";

/**
 * Task category.
 */
export interface Category {
  id: string;
  title: string;
  parentId: string | null;
}

/**
 * Task entity used in the demo application.
 */
export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  categoryId: string | null;
  createdAt: number;
}

/**
 * Full demo state shared by all implementations.
 */
export interface TaskState {
  tasks: Task[];
  categories: Category[];
  search: string;
  filter: FilterMode;
  sort: SortMode;
  operationsCount: number;
  selectedCategoryId: string | null;
}

/**
 * History snapshot for time-travel controls.
 */
export interface HistoryEntry {
  index: number;
  state: TaskState;
}

/**
 * Task statistics shown in the summary widgets.
 */
export interface TaskStats {
  total: number;
  active: number;
  completed: number;
}

/**
 * Inputs needed to derive the visible task list.
 */
export interface VisibleTaskInputs {
  tasks: Task[];
  search: string;
  filter: FilterMode;
  sort: SortMode;
  selectedCategoryId: string | null;
}

const now = Date.now();

/**
 * Creates the initial state shared by every benchmark and implementation.
 */
export function createInitialTaskState(): TaskState {
  return {
    tasks: [
      {
        id: "task-1",
        title: "Подготовить обзор существующих решений",
        description: "Сравнить Redux Toolkit, Zustand и MobX по архитектуре.",
        status: "completed",
        categoryId: "cat-research",
        createdAt: now - 40_000,
      },
      {
        id: "task-2",
        title: "Реализовать модуль истории",
        description: "Добавить undo, redo и timeTravel в ядро store.",
        status: "active",
        categoryId: "cat-core",
        createdAt: now - 20_000,
      },
      {
        id: "task-3",
        title: "Собрать demo-приложение",
        description: "Подготовить интерфейс для сравнительного анализа библиотек.",
        status: "active",
        categoryId: "cat-ui",
        createdAt: now - 10_000,
      },
    ],
    categories: [
      { id: "cat-research", title: "Исследование", parentId: null },
      { id: "cat-core", title: "Ядро kiks", parentId: null },
      { id: "cat-ui", title: "Интерфейс demo", parentId: null },
      { id: "cat-ui-history", title: "Time-travel панель", parentId: "cat-ui" },
    ],
    search: "",
    filter: "all",
    sort: "created-desc",
    operationsCount: 3,
    selectedCategoryId: null,
  };
}

/**
 * Returns only root categories.
 */
export function getRootCategories(state: TaskState): Category[] {
  return getRootCategoriesFromList(state.categories);
}

/**
 * Returns only root categories from a preselected category list.
 */
export function getRootCategoriesFromList(categories: Category[]): Category[] {
  return categories.filter((category) => category.parentId === null);
}

/**
 * Returns child categories for a given parent id.
 */
export function getChildCategoriesFromList(
  categories: Category[],
  parentId: string | null,
): Category[] {
  return categories.filter((category) => category.parentId === parentId);
}

/**
 * Returns the visible task list for the full state object.
 */
export function getVisibleTasks(state: TaskState): Task[] {
  return getVisibleTasksFromInputs({
    tasks: state.tasks,
    search: state.search,
    filter: state.filter,
    sort: state.sort,
    selectedCategoryId: state.selectedCategoryId,
  });
}

/**
 * Returns the visible task list for explicit selector dependencies.
 */
export function getVisibleTasksFromInputs(inputs: VisibleTaskInputs): Task[] {
  const normalizedSearch = inputs.search.trim().toLowerCase();

  return [...inputs.tasks]
    .filter((task) => {
      if (inputs.selectedCategoryId && task.categoryId !== inputs.selectedCategoryId) {
        return false;
      }

      if (inputs.filter === "active" && task.status !== "active") {
        return false;
      }

      if (inputs.filter === "completed" && task.status !== "completed") {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const haystack = `${task.title} ${task.description}`.toLowerCase();
      return haystack.includes(normalizedSearch);
    })
    .sort((left, right) => {
      switch (inputs.sort) {
        case "created-asc":
          return left.createdAt - right.createdAt;
        case "title-asc":
          return left.title.localeCompare(right.title, "ru");
        case "created-desc":
        default:
          return right.createdAt - left.createdAt;
      }
    });
}

/**
 * Returns task statistics for the full state object.
 */
export function getTaskStats(state: TaskState): TaskStats {
  return getTaskStatsFromTasks(state.tasks);
}

/**
 * Returns task statistics for an explicit task list.
 */
export function getTaskStatsFromTasks(tasks: Task[]): TaskStats {
  const completed = tasks.filter((task) => task.status === "completed").length;
  const total = tasks.length;

  return {
    total,
    active: total - completed,
    completed,
  };
}
