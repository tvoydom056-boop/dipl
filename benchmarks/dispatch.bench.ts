import { performance } from "node:perf_hooks";

import {
  configureStore,
  createSlice,
  type PayloadAction,
} from "../demo/node_modules/@reduxjs/toolkit";
import { makeAutoObservable } from "../demo/node_modules/mobx";
import { create } from "../demo/node_modules/zustand";

import { Action, Reducer, Store } from "../packages/kiks/src";
import { pushHistory } from "../demo/src/shared/historyHelpers";
import {
  createInitialTaskState,
  type TaskState,
} from "../demo/src/shared/taskModel";
import { updateBenchmarkResults } from "./results-store";

const ITERATIONS = 100_000;
const RUNS = 3;

type LibraryKey = "kiks" | "redux" | "zustand" | "mobx";

interface BenchResult {
  name: string;
  totalMs: number;
  opsPerSec: number;
}

interface BenchRun {
  totalMs: number;
  opsPerSec: number;
}

class IncrementAction extends Action<"increment", { index: number }> {}

class BenchReducer extends Reducer<TaskState, IncrementAction> {
  public reduce(state: TaskState, action: IncrementAction): TaskState {
    const currentTask = state.tasks[action.payload.index % state.tasks.length];

    return {
      ...state,
      tasks: state.tasks.map((task) =>
        task.id === currentTask.id
          ? {
              ...task,
              status:
                task.status === "completed"
                  ? ("active" as const)
                  : ("completed" as const),
            }
          : task
      ),
      operationsCount: state.operationsCount + 1,
    };
  }
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 2,
  }).format(value);
}

function runSinglePass(task: () => void): BenchRun {
  const startedAt = performance.now();
  task();
  const totalMs = performance.now() - startedAt;

  return {
    totalMs,
    opsPerSec: ITERATIONS / (totalMs / 1000),
  };
}

function averageRuns(name: string, factory: () => () => void): BenchResult {
  const runs: BenchRun[] = [];

  for (let runIndex = 0; runIndex < RUNS; runIndex += 1) {
    runs.push(runSinglePass(factory()));
  }

  const totalMs = runs.reduce((sum, run) => sum + run.totalMs, 0) / RUNS;
  const opsPerSec = runs.reduce((sum, run) => sum + run.opsPerSec, 0) / RUNS;

  return {
    name,
    totalMs,
    opsPerSec,
  };
}

function benchmarkKiks(): BenchResult {
  return averageRuns("kiks", () => {
    const store = new Store<TaskState, IncrementAction>({
      initialState: createInitialTaskState(),
      reducer: new BenchReducer(),
      historyLimit: 20,
    });

    return () => {
      for (let index = 0; index < ITERATIONS; index += 1) {
        store.dispatch(new IncrementAction("increment", { index }));
      }
    };
  });
}

function benchmarkRedux(): BenchResult {
  return averageRuns("redux toolkit", () => {
    const slice = createSlice({
      name: "bench",
      initialState: {
        timeline: [createInitialTaskState()],
        pointer: 0,
      },
      reducers: {
        increment(state, action: PayloadAction<{ index: number }>) {
          const current = state.timeline[state.pointer];
          const currentTask =
            current.tasks[action.payload.index % current.tasks.length];
          const next = {
            ...current,
            tasks: current.tasks.map((task) =>
              task.id === currentTask.id
                ? {
                    ...task,
                    status:
                      task.status === "completed"
                        ? ("active" as const)
                        : ("completed" as const),
                  }
                : task
            ),
            operationsCount: current.operationsCount + 1,
          };

          Object.assign(
            state,
            pushHistory(state.timeline, state.pointer, next)
          );
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

    return () => {
      for (let index = 0; index < ITERATIONS; index += 1) {
        store.dispatch(slice.actions.increment({ index }));
      }
    };
  });
}

function benchmarkZustand(): BenchResult {
  interface ZustandBenchStore {
    timeline: TaskState[];
    pointer: number;
    increment(index: number): void;
  }

  return averageRuns("zustand", () => {
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
                    status:
                      task.status === "completed"
                        ? ("active" as const)
                        : ("completed" as const),
                  }
                : task
            ),
            operationsCount: current.operationsCount + 1,
          };

          return pushHistory(state.timeline, state.pointer, next);
        }),
    }));

    return () => {
      for (let index = 0; index < ITERATIONS; index += 1) {
        useStore.getState().increment(index);
      }
    };
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
              status:
                task.status === "completed"
                  ? ("active" as const)
                  : ("completed" as const),
            }
          : task
      ),
      operationsCount: current.operationsCount + 1,
    };

    Object.assign(this, pushHistory(this.timeline, this.pointer, next));
  }
}

function benchmarkMobx(): BenchResult {
  return averageRuns("mobx", () => {
    const store = new MobxBenchStore();

    return () => {
      for (let index = 0; index < ITERATIONS; index += 1) {
        store.increment(index);
      }
    };
  });
}

const benchmarkMap: Record<LibraryKey, BenchResult> = {
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

const sortedResults = Object.entries(benchmarkMap)
  .map(([key, result]) => ({
    key,
    name: result.name,
    runs: RUNS,
    iterations: ITERATIONS,
    averageMs: Number(result.totalMs.toFixed(2)),
    averageOpsPerSec: Number(result.opsPerSec.toFixed(2)),
  }))
  .sort((left, right) => right.averageOpsPerSec - left.averageOpsPerSec);

console.log(
  `Dispatch benchmark: ${ITERATIONS} итераций, ${RUNS} прогона, среднее значение`
);
console.table(sortedResults);

for (const result of sortedResults) {
  console.log(
    `${result.name.padEnd(14)} ${formatNumber(result.averageOpsPerSec).padStart(
      12
    )} ops/sec | ${formatNumber(result.averageMs).padStart(9)} ms`
  );
}
