import { Reducer } from "../../../../packages/kiks/src";

import type { TaskActionUnion } from "./actions";
import type { TaskState } from "./types";

/**
 * Основной редьюсер менеджера задач.
 */
export class TaskReducer extends Reducer<TaskState, TaskActionUnion> {
  public reduce(state: TaskState, action: TaskActionUnion): TaskState {
    switch (action.type) {
      case "addTask":
        return {
          ...state,
          tasks: [action.payload, ...state.tasks],
          operationsCount: state.operationsCount + 1,
        };
      case "toggleTask":
        return {
          ...state,
          tasks: state.tasks.map((task) =>
            task.id === action.payload.id
              ? {
                  ...task,
                  status: task.status === "completed" ? "active" : "completed",
                }
              : task,
          ),
          operationsCount: state.operationsCount + 1,
        };
      case "deleteTask":
        return {
          ...state,
          tasks: state.tasks.filter((task) => task.id !== action.payload.id),
          operationsCount: state.operationsCount + 1,
        };
      case "setSearch":
        return {
          ...state,
          search: action.payload.value,
        };
      case "setFilter":
        return {
          ...state,
          filter: action.payload.value,
        };
      case "setSort":
        return {
          ...state,
          sort: action.payload.value,
        };
      case "addCategory":
        return {
          ...state,
          categories: [...state.categories, action.payload],
          operationsCount: state.operationsCount + 1,
        };
      case "selectCategory":
        return {
          ...state,
          selectedCategoryId: action.payload.categoryId,
        };
      default:
        return state;
    }
  }
}
