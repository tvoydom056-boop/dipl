import { bench, describe } from "../demo/node_modules/vitest/dist/index";

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

const ITERATIONS = 100_000;

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
              status: task.status === "completed" ? "active" : "completed",
            }
          : task,
      ),
      operationsCount: state.operationsCount + 1,
    };
  }
}

function createNextTaskState(current: TaskState, index: number): TaskState {
  const currentTask = current.tasks[index % current.tasks.length];

  return {
    ...current,
    tasks: current.tasks.map((task) =>
      task.id === currentTask.id
        ? {
            ...task,
            status: task.status === "completed" ? "active" : "completed",
          }
        : task,
    ),
    operationsCount: current.operationsCount + 1,
  };
}

describe("dispatch benchmark", () => {
  bench(`kiks x${ITERATIONS}`, () => {
    const store = new Store<TaskState, IncrementAction>({
      initialState: createInitialTaskState(),
      reducer: new BenchReducer(),
      historyLimit: 20,
    });

    for (let index = 0; index < ITERATIONS; index += 1) {
      store.dispatch(new IncrementAction("increment", { index }));
    }
  });

  bench(`redux toolkit x${ITERATIONS}`, () => {
    const slice = createSlice({
      name: "bench",
      initialState: {
        timeline: [createInitialTaskState()],
        pointer: 0,
      },
      reducers: {
        increment(state, action: PayloadAction<{ index: number }>) {
          const current = state.timeline[state.pointer];
          const next = createNextTaskState(current, action.payload.index);

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

    for (let index = 0; index < ITERATIONS; index += 1) {
      store.dispatch(slice.actions.increment({ index }));
    }
  });

  bench(`zustand x${ITERATIONS}`, () => {
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
          return pushHistory(state.timeline, state.pointer, createNextTaskState(current, index));
        }),
    }));

    for (let index = 0; index < ITERATIONS; index += 1) {
      useStore.getState().increment(index);
    }
  });

  bench(`mobx x${ITERATIONS}`, () => {
    class MobxBenchStore {
      public timeline: TaskState[] = [createInitialTaskState()];
      public pointer = 0;

      public constructor() {
        makeAutoObservable(this);
      }

      public increment(index: number): void {
        const current = this.timeline[this.pointer];
        Object.assign(this, pushHistory(this.timeline, this.pointer, createNextTaskState(current, index)));
      }
    }

    const store = new MobxBenchStore();

    for (let index = 0; index < ITERATIONS; index += 1) {
      store.increment(index);
    }
  });
});
