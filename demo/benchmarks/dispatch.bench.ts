import { performance } from "node:perf_hooks";

import { configureStore, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { makeAutoObservable } from "mobx";
import { create } from "zustand";

import { Action, Reducer, Store } from "../../packages/kiks/src";
import { updateBenchmarkResults } from "./results-store";
import { pushHistory } from "../src/shared/historyHelpers";
import { createInitialTaskState, type TaskState } from "../src/shared/taskModel";

const ITERATIONS = 100_000;

interface BenchResult {
  name: string;
  opsPerSec: number;
  totalMs: number;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 2,
  }).format(value);
}

function runBenchmark(name: string, task: () => void): BenchResult {
  const startedAt = performance.now();
  task();
  const totalMs = performance.now() - startedAt;

  return {
    name,
    totalMs,
    opsPerSec: ITERATIONS / (totalMs / 1000),
  };
}

class IncrementAction extends Action<"increment", { index: number }> {}

class BenchReducer extends Reducer<TaskState, IncrementAction> {
  public reduce(state: TaskState, action: IncrementAction): TaskState {
    const currentTask = state.tasks[action.payload.index % state.tasks.length];
    const nextTasks = state.tasks.map((task) =>
      task.id === currentTask.id
        ? {
            ...task,
            status: task.status === "completed" ? ("active" as const) : ("completed" as const),
          }
        : task,
    );

    return {
      ...state,
      tasks: nextTasks,
      operationsCount: state.operationsCount + 1,
    };
  }
}

function benchmarkKiks(): BenchResult {
  const store = new Store<TaskState, IncrementAction>({
    initialState: createInitialTaskState(),
    reducer: new BenchReducer(),
    historyLimit: 20,
  });

  return runBenchmark("kiks", () => {
    for (let index = 0; index < ITERATIONS; index += 1) {
      store.dispatch(new IncrementAction("increment", { index }));
    }
  });
}

function benchmarkRedux(): BenchResult {
  const slice = createSlice({
    name: "bench",
    initialState: {
      timeline: [createInitialTaskState()],
      pointer: 0,
    },
    reducers: {
      increment(state, action: PayloadAction<{ index: number }>) {
        const current = state.timeline[state.pointer];
        const currentTask = current.tasks[action.payload.index % current.tasks.length];
        const next = {
          ...current,
          tasks: current.tasks.map((task) =>
            task.id === currentTask.id
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
    },
  });

  const store = configureStore({
    reducer: slice.reducer,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        immutableCheck: false,
        serializableCheck: false,
      }),
  });

  return runBenchmark("redux toolkit", () => {
    for (let index = 0; index < ITERATIONS; index += 1) {
      store.dispatch(slice.actions.increment({ index }));
    }
  });
}

function benchmarkZustand(): BenchResult {
  interface ZustandBenchStore {
    timeline: TaskState[];
    pointer: number;
    increment(index: number): void;
  }

  const useStore = create<ZustandBenchStore>((set) => ({
    timeline: [createInitialTaskState()],
    pointer: 0,
    increment: (index) =>
      set((state) => {
        const current = state.timeline[state.pointer];
        const currentTask = current.tasks[index % current.tasks.length];
        const next = {
          ...current,
          tasks: current.tasks.map((task) =>
            task.id === currentTask.id
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
  }));

  return runBenchmark("zustand", () => {
    for (let index = 0; index < ITERATIONS; index += 1) {
      useStore.getState().increment(index);
    }
  });
}

class MobxBenchStore {
  public timeline: TaskState[] = [createInitialTaskState()];
  public pointer = 0;

  public constructor() {
    makeAutoObservable(this);
  }

  public increment(index: number): void {
    const current = this.timeline[this.pointer];
    const currentTask = current.tasks[index % current.tasks.length];
    const next = {
      ...current,
      tasks: current.tasks.map((task) =>
        task.id === currentTask.id
          ? {
              ...task,
              status: task.status === "completed" ? ("active" as const) : ("completed" as const),
            }
          : task,
      ),
      operationsCount: current.operationsCount + 1,
    };

    Object.assign(this, pushHistory(this.timeline, this.pointer, next));
  }
}

function benchmarkMobx(): BenchResult {
  const store = new MobxBenchStore();

  return runBenchmark("mobx", () => {
    for (let index = 0; index < ITERATIONS; index += 1) {
      store.increment(index);
    }
  });
}

const benchmarkMap = {
  kiks: benchmarkKiks(),
  redux: benchmarkRedux(),
  zustand: benchmarkZustand(),
  mobx: benchmarkMobx(),
};

updateBenchmarkResults((current) => ({
  ...current,
  dispatch: {
    iterations: ITERATIONS,
    results: benchmarkMap,
  },
}));

const sortedResults = Object.values(benchmarkMap).sort((left, right) => right.opsPerSec - left.opsPerSec);

console.log(`Dispatch benchmark, ${ITERATIONS} iterations`);
for (const result of sortedResults) {
  console.log(
    `${result.name.padEnd(14)} ${formatNumber(result.opsPerSec).padStart(12)} ops/sec | ${formatNumber(result.totalMs).padStart(9)} ms`,
  );
}
