/**
 * Статус отдельной задачи.
 */
export type TaskStatus = "active" | "completed";

/**
 * Параметры сортировки списка задач.
 */
export type SortMode = "created-desc" | "created-asc" | "title-asc";

/**
 * Режим фильтрации задач.
 */
export type FilterMode = "all" | "active" | "completed";

/**
 * Категория задачи. Иерархия задаётся через parentId.
 */
export interface Category {
  id: string;
  title: string;
  parentId: string | null;
}

/**
 * Сущность задачи в demo-приложении.
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
 * Полное состояние demo-приложения.
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
 * Снимок истории изменений.
 */
export interface HistoryEntry {
  index: number;
  state: TaskState;
}

/**
 * Статистика по задачам.
 */
export interface TaskStats {
  total: number;
  active: number;
  completed: number;
}

const now = Date.now();

/**
 * Возвращает начальное состояние для всех реализаций.
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
 * Возвращает категории верхнего уровня.
 */
export function getRootCategories(state: TaskState): Category[] {
  return state.categories.filter((category) => category.parentId === null);
}

/**
 * Возвращает видимый список задач.
 */
export function getVisibleTasks(state: TaskState): Task[] {
  const normalizedSearch = state.search.trim().toLowerCase();

  return [...state.tasks]
    .filter((task) => {
      if (state.selectedCategoryId && task.categoryId !== state.selectedCategoryId) {
        return false;
      }

      if (state.filter === "active" && task.status !== "active") {
        return false;
      }

      if (state.filter === "completed" && task.status !== "completed") {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const haystack = `${task.title} ${task.description}`.toLowerCase();
      return haystack.includes(normalizedSearch);
    })
    .sort((left, right) => {
      switch (state.sort) {
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
 * Возвращает сводные показатели по задачам.
 */
export function getTaskStats(state: TaskState): TaskStats {
  const completed = state.tasks.filter((task) => task.status === "completed").length;
  const total = state.tasks.length;

  return {
    total,
    active: total - completed,
    completed,
  };
}
