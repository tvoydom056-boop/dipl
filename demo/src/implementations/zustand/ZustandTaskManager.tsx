import { create } from "zustand";

import { pushHistory } from "../../shared/historyHelpers";
import { TaskManagerView } from "../../shared/TaskManagerView";
import {
  createInitialTaskState,
  getRootCategories,
  getTaskStats,
  getVisibleTasks,
  type FilterMode,
  type HistoryEntry,
  type SortMode,
  type TaskState,
} from "../../shared/taskModel";

interface ZustandTaskStore {
  timeline: TaskState[];
  pointer: number;
  addTask(input: { title: string; description: string; categoryId: string | null }): void;
  addCategory(input: { title: string; parentId: string | null }): void;
  toggleTask(id: string): void;
  deleteTask(id: string): void;
  setSearch(value: string): void;
  setFilter(value: FilterMode): void;
  setSort(value: SortMode): void;
  selectCategory(categoryId: string | null): void;
  undo(): void;
  redo(): void;
  timeTravel(index: number): void;
}

function updateTimelineState(
  state: Pick<ZustandTaskStore, "timeline" | "pointer">,
  updater: (current: TaskState) => TaskState,
): Pick<ZustandTaskStore, "timeline" | "pointer"> {
  return pushHistory(state.timeline, state.pointer, updater(state.timeline[state.pointer]));
}

export const useZustandTaskStore = create<ZustandTaskStore>((set) => ({
  timeline: [createInitialTaskState()],
  pointer: 0,
  addTask: (input) =>
    set((state) => {
      const current = state.timeline[state.pointer];
      const next = {
        ...current,
        tasks: [
          {
            id: `task-${Math.random().toString(36).slice(2, 9)}`,
            title: input.title,
            description: input.description,
            categoryId: input.categoryId,
            status: "active" as const,
            createdAt: Date.now(),
          },
          ...current.tasks,
        ],
        operationsCount: current.operationsCount + 1,
      };
      return pushHistory(state.timeline, state.pointer, next);
    }),
  addCategory: (input) =>
    set((state) => {
      const current = state.timeline[state.pointer];
      const next = {
        ...current,
        categories: [
          ...current.categories,
          {
            id: `category-${Math.random().toString(36).slice(2, 9)}`,
            title: input.title,
            parentId: input.parentId,
          },
        ],
        operationsCount: current.operationsCount + 1,
      };
      return pushHistory(state.timeline, state.pointer, next);
    }),
  toggleTask: (id) =>
    set((state) => {
      const current = state.timeline[state.pointer];
      const next = {
        ...current,
        tasks: current.tasks.map((task) =>
          task.id === id
            ? {
                ...task,
                status: task.status === "completed" ? ("active" as const) : ("completed" as const),
              }
            : task,
        ),
        operationsCount: current.operationsCount + 1,
      };
      return pushHistory(state.timeline, state.pointer, next);
    }),
  deleteTask: (id) =>
    set((state) => {
      const current = state.timeline[state.pointer];
      const next = {
        ...current,
        tasks: current.tasks.filter((task) => task.id !== id),
        operationsCount: current.operationsCount + 1,
      };
      return pushHistory(state.timeline, state.pointer, next);
    }),
  setSearch: (value) =>
    set((state) =>
      updateTimelineState(state, (current) => ({
        ...current,
        search: value,
      })),
    ),
  setFilter: (value) =>
    set((state) =>
      updateTimelineState(state, (current) => ({
        ...current,
        filter: value,
      })),
    ),
  setSort: (value) =>
    set((state) =>
      updateTimelineState(state, (current) => ({
        ...current,
        sort: value,
      })),
    ),
  selectCategory: (categoryId) =>
    set((state) =>
      updateTimelineState(state, (current) => ({
        ...current,
        selectedCategoryId: categoryId,
      })),
    ),
  undo: () => set((state) => ({ pointer: state.pointer > 0 ? state.pointer - 1 : state.pointer })),
  redo: () =>
    set((state) => ({
      pointer: state.pointer < state.timeline.length - 1 ? state.pointer + 1 : state.pointer,
    })),
  timeTravel: (index) =>
    set((state) => ({
      pointer: index >= 0 && index < state.timeline.length ? index : state.pointer,
    })),
}));

export const zustandBenchmarkApi = {
  addTask() {
    useZustandTaskStore.getState().addTask({
      title: "Benchmark task",
      description: "Generated during rerender benchmark",
      categoryId: null,
    });
  },
  toggleTask() {
    const firstTaskId =
      useZustandTaskStore.getState().timeline[useZustandTaskStore.getState().pointer].tasks[0]?.id;
    if (firstTaskId) {
      useZustandTaskStore.getState().toggleTask(firstTaskId);
    }
  },
  setSearch() {
    useZustandTaskStore.getState().setSearch("ui");
  },
  undo() {
    useZustandTaskStore.getState().undo();
  },
};

export function ZustandTaskManager() {
  const timeline = useZustandTaskStore((state) => state.timeline);
  const pointer = useZustandTaskStore((state) => state.pointer);
  const currentState = timeline[pointer];
  const store = useZustandTaskStore();
  const history: HistoryEntry[] = timeline.map((entry, index) => ({ index, state: entry }));

  return (
    <TaskManagerView
      controller={{
        libraryName: "zustand",
        libraryDescription:
          "Идентичный менеджер задач, собранный на минималистичном store Zustand с тем же пользовательским сценарием и history timeline.",
        tasks: getVisibleTasks(currentState),
        allCategories: currentState.categories,
        rootCategories: getRootCategories(currentState),
        stats: getTaskStats(currentState),
        selectedCategoryId: currentState.selectedCategoryId,
        search: currentState.search,
        filter: currentState.filter,
        sort: currentState.sort,
        operationsCount: currentState.operationsCount,
        history,
        historyIndex: pointer,
        canUndo: pointer > 0,
        canRedo: pointer < timeline.length - 1,
        addTask: store.addTask,
        addCategory: store.addCategory,
        toggleTask: store.toggleTask,
        deleteTask: store.deleteTask,
        setSearch: store.setSearch,
        setFilter: store.setFilter,
        setSort: store.setSort,
        selectCategory: store.selectCategory,
        undo: store.undo,
        redo: store.redo,
        timeTravel: store.timeTravel,
      }}
    />
  );
}
