import { bench, describe } from "../demo/node_modules/vitest/dist/index";

import { Action, Reducer, Store } from "../packages/kiks/src";
import { createInitialTaskState, type TaskState } from "../demo/src/shared/taskModel";

const PREPARED_HISTORY_LENGTH = 1_100;

class IncrementAction extends Action<"increment", number> {}

class HistoryBenchReducer extends Reducer<TaskState, IncrementAction> {
  public reduce(state: TaskState, action: IncrementAction): TaskState {
    return {
      ...state,
      operationsCount: state.operationsCount + action.payload,
    };
  }
}

function createPreparedStore(): Store<TaskState, IncrementAction> {
  const store = new Store<TaskState, IncrementAction>({
    initialState: createInitialTaskState(),
    reducer: new HistoryBenchReducer(),
    historyLimit: PREPARED_HISTORY_LENGTH + 1,
  });

  for (let index = 0; index < PREPARED_HISTORY_LENGTH; index += 1) {
    store.dispatch(new IncrementAction("increment", 1));
  }

  return store;
}

function runUndoRedoCycle(stepCount: number): void {
  const store = createPreparedStore();

  for (let index = 0; index < stepCount; index += 1) {
    store.undo();
  }

  for (let index = 0; index < stepCount; index += 1) {
    store.redo();
  }
}

describe("history benchmark", () => {
  bench("undo/redo 10 steps", () => {
    runUndoRedoCycle(10);
  });

  bench("undo/redo 100 steps", () => {
    runUndoRedoCycle(100);
  });

  bench("undo/redo 1000 steps", () => {
    runUndoRedoCycle(1_000);
  });
});
