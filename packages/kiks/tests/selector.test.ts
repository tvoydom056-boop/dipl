import { describe, expect, it, vi } from "vitest";

import { Action, createSelector, Store, type Reducer } from "../src";

interface TodoState {
  tasks: string[];
}

class TodoReducer implements Reducer<TodoState, Action<"noop", undefined>> {
  public reduce(state: TodoState): TodoState {
    return state;
  }
}

describe("Selector", () => {
  it("мемоизирует результат createSelector для одной и той же ссылки на состояние", () => {
    const selector = vi.fn((state: TodoState) => state.tasks.length);
    const memoizedSelector = createSelector(selector);
    const state = { tasks: ["a", "b"] };

    expect(memoizedSelector(state)).toBe(2);
    expect(memoizedSelector(state)).toBe(2);
    expect(selector).toHaveBeenCalledTimes(1);
  });

  it("store.select кеширует вычисления для одного и того же селектора", () => {
    const store = new Store<TodoState, Action<"noop", undefined>>({
      initialState: { tasks: ["a", "b", "c"] },
      reducer: new TodoReducer(),
    });
    const selector = vi.fn((state: TodoState) => state.tasks.join(","));

    expect(store.select(selector)).toBe("a,b,c");
    expect(store.select(selector)).toBe("a,b,c");
    expect(selector).toHaveBeenCalledTimes(1);
  });

  it("пересчитывает селектор после изменения состояния", () => {
    class AddTaskAction extends Action<"add", string> {}

    class AddTaskReducer implements Reducer<TodoState, AddTaskAction> {
      public reduce(state: TodoState, action: AddTaskAction): TodoState {
        return {
          tasks: [...state.tasks, action.payload],
        };
      }
    }

    const store = new Store<TodoState, AddTaskAction>({
      initialState: { tasks: ["one"] },
      reducer: new AddTaskReducer(),
    });
    const selector = vi.fn((state: TodoState) => state.tasks.length);

    expect(store.select(selector)).toBe(1);
    store.dispatch(new AddTaskAction("add", "two"));
    expect(store.select(selector)).toBe(2);
    expect(selector).toHaveBeenCalledTimes(2);
  });
});
