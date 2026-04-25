import { configureStore, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { Provider, useDispatch, useSelector } from "react-redux";

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

export interface ReduxRootState {
  timeline: TaskState[];
  pointer: number;
}

function commitState(state: ReduxRootState, updater: (current: TaskState) => TaskState): void {
  const current = state.timeline[state.pointer];
  const next = updater(current);
  Object.assign(state, pushHistory(state.timeline, state.pointer, next));
}

export const taskSlice = createSlice({
  name: "reduxTasks",
  initialState: {
    timeline: [createInitialTaskState()],
    pointer: 0,
  } as ReduxRootState,
  reducers: {
    addTask(
      state,
      action: PayloadAction<{ title: string; description: string; categoryId: string | null }>,
    ) {
      const current = state.timeline[state.pointer];
      const next = {
        ...current,
        tasks: [
          {
            id: `task-${Math.random().toString(36).slice(2, 9)}`,
            title: action.payload.title,
            description: action.payload.description,
            categoryId: action.payload.categoryId,
            status: "active" as const,
            createdAt: Date.now(),
          },
          ...current.tasks,
        ],
        operationsCount: current.operationsCount + 1,
      };
      Object.assign(state, pushHistory(state.timeline, state.pointer, next));
    },
    addCategory(state, action: PayloadAction<{ title: string; parentId: string | null }>) {
      const current = state.timeline[state.pointer];
      const next = {
        ...current,
        categories: [
          ...current.categories,
          {
            id: `category-${Math.random().toString(36).slice(2, 9)}`,
            title: action.payload.title,
            parentId: action.payload.parentId,
          },
        ],
        operationsCount: current.operationsCount + 1,
      };
      Object.assign(state, pushHistory(state.timeline, state.pointer, next));
    },
    toggleTask(state, action: PayloadAction<string>) {
      const current = state.timeline[state.pointer];
      const next = {
        ...current,
        tasks: current.tasks.map((task) =>
          task.id === action.payload
            ? {
                ...task,
                status: task.status === "completed" ? ("active" as const) : ("completed" as const),
              }
            : task,
        ),
        operationsCount: current.operationsCount + 1,
      };
      Object.assign(state, pushHistory(state.timeline, state.pointer, next));
    },
    deleteTask(state, action: PayloadAction<string>) {
      const current = state.timeline[state.pointer];
      const next = {
        ...current,
        tasks: current.tasks.filter((task) => task.id !== action.payload),
        operationsCount: current.operationsCount + 1,
      };
      Object.assign(state, pushHistory(state.timeline, state.pointer, next));
    },
    setSearch(state, action: PayloadAction<string>) {
      commitState(state, (current) => ({
        ...current,
        search: action.payload,
      }));
    },
    setFilter(state, action: PayloadAction<FilterMode>) {
      commitState(state, (current) => ({
        ...current,
        filter: action.payload,
      }));
    },
    setSort(state, action: PayloadAction<SortMode>) {
      commitState(state, (current) => ({
        ...current,
        sort: action.payload,
      }));
    },
    selectCategory(state, action: PayloadAction<string | null>) {
      commitState(state, (current) => ({
        ...current,
        selectedCategoryId: action.payload,
      }));
    },
    undo(state) {
      if (state.pointer > 0) {
        state.pointer -= 1;
      }
    },
    redo(state) {
      if (state.pointer < state.timeline.length - 1) {
        state.pointer += 1;
      }
    },
    timeTravel(state, action: PayloadAction<number>) {
      if (action.payload >= 0 && action.payload < state.timeline.length) {
        state.pointer = action.payload;
      }
    },
  },
});

export const reduxStore = configureStore({
  reducer: taskSlice.reducer,
});

export const reduxBenchmarkApi = {
  addTask() {
    reduxStore.dispatch(
      taskSlice.actions.addTask({
        title: "Benchmark task",
        description: "Generated during rerender benchmark",
        categoryId: null,
      }),
    );
  },
  toggleTask() {
    const state = reduxStore.getState() as ReduxRootState;
    const firstTaskId = state.timeline[state.pointer].tasks[0]?.id;
    if (firstTaskId) {
      reduxStore.dispatch(taskSlice.actions.toggleTask(firstTaskId));
    }
  },
  setSearch() {
    reduxStore.dispatch(taskSlice.actions.setSearch("ui"));
  },
  undo() {
    reduxStore.dispatch(taskSlice.actions.undo());
  },
};

function ReduxTaskManagerInner() {
  const dispatch = useDispatch();
  const timeline = useSelector((state: ReduxRootState) => state.timeline);
  const pointer = useSelector((state: ReduxRootState) => state.pointer);
  const currentState = useSelector((state: ReduxRootState) => state.timeline[state.pointer]);
  const history: HistoryEntry[] = timeline.map((entry, index) => ({ index, state: entry }));

  return (
    <TaskManagerView
      controller={{
        libraryName: "redux toolkit",
        libraryDescription:
          "Идентичный менеджер задач, собранный на Redux Toolkit с централизованным reducer-flow и history timeline в store.",
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
        addTask: (input) => dispatch(taskSlice.actions.addTask(input)),
        addCategory: (input) => dispatch(taskSlice.actions.addCategory(input)),
        toggleTask: (id) => dispatch(taskSlice.actions.toggleTask(id)),
        deleteTask: (id) => dispatch(taskSlice.actions.deleteTask(id)),
        setSearch: (value) => dispatch(taskSlice.actions.setSearch(value)),
        setFilter: (value) => dispatch(taskSlice.actions.setFilter(value)),
        setSort: (value) => dispatch(taskSlice.actions.setSort(value)),
        selectCategory: (categoryId) => dispatch(taskSlice.actions.selectCategory(categoryId)),
        undo: () => dispatch(taskSlice.actions.undo()),
        redo: () => dispatch(taskSlice.actions.redo()),
        timeTravel: (index) => dispatch(taskSlice.actions.timeTravel(index)),
      }}
    />
  );
}

export function ReduxTaskManager() {
  return (
    <Provider store={reduxStore}>
      <ReduxTaskManagerInner />
    </Provider>
  );
}
