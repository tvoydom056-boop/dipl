import { Store } from "kiks";

import { createInitialTaskState } from "../../shared/taskModel";
import type { TaskActionUnion } from "./actions";
import { TaskReducer } from "./reducer";
import type { TaskState } from "./types";

/**
 * Глобальный store demo-приложения.
 */
export const taskStore = new Store<TaskState, TaskActionUnion>({
  initialState: createInitialTaskState(),
  reducer: new TaskReducer(),
  historyLimit: 20,
});
