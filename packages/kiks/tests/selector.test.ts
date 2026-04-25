import { describe, expect, it, vi } from "vitest";

import { Action, createSelector, Store, type Reducer } from "../src";

interface TodoState {
  tasks: string[];
  filter: "all" | "active";
  metadata: {
    version: number;
  };
}

class TodoReducer implements Reducer<TodoState, Action<"noop", undefined>> {
  public reduce(state: TodoState): TodoState {
    return state;
  }
}

describe("Selector", () => {
  it("uses state-reference memoization for the default single-function overload", () => {
    const selector = vi.fn((state: TodoState) => state.tasks.length);
    const memoizedSelector = createSelector(selector);
    const state = {
      tasks: ["a", "b"],
      filter: "all" as const,
      metadata: { version: 1 },
    };

    expect(memoizedSelector(state)).toBe(2);
    expect(memoizedSelector(state)).toBe(2);
    expect(selector).toHaveBeenCalledTimes(1);
    expect(memoizedSelector.getStats()).toMatchObject({
      strategy: "state-reference",
      recomputations: 1,
      cacheHits: 1,
    });
  });

  it("supports full recompute strategy without cache hits", () => {
    const selector = vi.fn((state: TodoState) => state.tasks.join(","));
    const uncachedSelector = createSelector(selector, {
      strategy: "full-recompute",
    });
    const state = {
      tasks: ["a", "b"],
      filter: "all" as const,
      metadata: { version: 1 },
    };

    expect(uncachedSelector(state)).toBe("a,b");
    expect(uncachedSelector(state)).toBe("a,b");
    expect(selector).toHaveBeenCalledTimes(2);
    expect(uncachedSelector.getStats()).toMatchObject({
      strategy: "full-recompute",
      recomputations: 2,
      cacheHits: 0,
    });
  });

  it("supports last-result strategy with a custom cache key", () => {
    const selector = vi.fn((state: TodoState) => ({
      filter: state.filter,
      total: state.tasks.length,
    }));
    const keyedSelector = createSelector(selector, {
      strategy: "last-result",
      getCacheKey: (state) => `${state.tasks.length}:${state.filter}`,
    });
    const stateA: TodoState = {
      tasks: ["a", "b"],
      filter: "all",
      metadata: { version: 1 },
    };
    const stateB: TodoState = {
      tasks: ["a", "b"],
      filter: "all",
      metadata: { version: 2 },
    };

    const firstResult = keyedSelector(stateA);
    const secondResult = keyedSelector(stateB);

    expect(secondResult).toBe(firstResult);
    expect(selector).toHaveBeenCalledTimes(1);
    expect(keyedSelector.getStats()).toMatchObject({
      strategy: "last-result",
      recomputations: 1,
      cacheHits: 1,
    });
  });

  it("supports dependency-based memoization and skips unrelated state updates", () => {
    const projector = vi.fn((tasks: string[], filter: TodoState["filter"]) => ({
      visible: filter === "active" ? tasks.filter((task) => task.startsWith("a")) : tasks,
      total: tasks.length,
    }));
    const dependencySelector = createSelector(
      [(state: TodoState) => state.tasks, (state: TodoState) => state.filter] as const,
      projector,
    );

    const initialState: TodoState = {
      tasks: ["alpha", "beta"],
      filter: "all",
      metadata: { version: 1 },
    };
    const unrelatedState: TodoState = {
      ...initialState,
      metadata: { version: 2 },
    };
    const relatedState: TodoState = {
      ...initialState,
      filter: "active",
    };

    const firstResult = dependencySelector(initialState);
    const secondResult = dependencySelector(unrelatedState);
    const thirdResult = dependencySelector(relatedState);

    expect(secondResult).toBe(firstResult);
    expect(thirdResult).not.toBe(firstResult);
    expect(projector).toHaveBeenCalledTimes(2);
    expect(dependencySelector.getStats()).toMatchObject({
      strategy: "dependencies",
      recomputations: 2,
      cacheHits: 1,
    });
  });

  it("store.select caches raw selectors for the same store state", () => {
    const store = new Store<TodoState, Action<"noop", undefined>>({
      initialState: {
        tasks: ["a", "b", "c"],
        filter: "all",
        metadata: { version: 1 },
      },
      reducer: new TodoReducer(),
    });
    const selector = vi.fn((state: TodoState) => state.tasks.join(","));

    expect(store.select(selector)).toBe("a,b,c");
    expect(store.select(selector)).toBe("a,b,c");
    expect(selector).toHaveBeenCalledTimes(1);
  });

  it("store.select does not wrap a memoized dependency selector twice", () => {
    class MetadataAction extends Action<"metadata", number> {}

    class MetadataReducer implements Reducer<TodoState, MetadataAction> {
      public reduce(state: TodoState, action: MetadataAction): TodoState {
        return {
          ...state,
          metadata: {
            version: action.payload,
          },
        };
      }
    }

    const store = new Store<TodoState, MetadataAction>({
      initialState: {
        tasks: ["one"],
        filter: "all",
        metadata: { version: 1 },
      },
      reducer: new MetadataReducer(),
    });
    const projector = vi.fn((tasks: string[]) => tasks.length);
    const selector = createSelector([(state: TodoState) => state.tasks] as const, projector);

    expect(store.select(selector)).toBe(1);
    store.dispatch(new MetadataAction("metadata", 2));
    expect(store.select(selector)).toBe(1);
    expect(projector).toHaveBeenCalledTimes(1);
    expect(selector.getStats()).toMatchObject({
      strategy: "dependencies",
      recomputations: 1,
      cacheHits: 1,
    });
  });

  it("recomputes selectors after related state changes", () => {
    class AddTaskAction extends Action<"add", string> {}

    class AddTaskReducer implements Reducer<TodoState, AddTaskAction> {
      public reduce(state: TodoState, action: AddTaskAction): TodoState {
        return {
          ...state,
          tasks: [...state.tasks, action.payload],
        };
      }
    }

    const store = new Store<TodoState, AddTaskAction>({
      initialState: {
        tasks: ["one"],
        filter: "all",
        metadata: { version: 1 },
      },
      reducer: new AddTaskReducer(),
    });
    const selector = vi.fn((state: TodoState) => state.tasks.length);

    expect(store.select(selector)).toBe(1);
    store.dispatch(new AddTaskAction("add", "two"));
    expect(store.select(selector)).toBe(2);
    expect(selector).toHaveBeenCalledTimes(2);
  });
});
