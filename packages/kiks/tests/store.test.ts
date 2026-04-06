import { describe, expect, it, vi } from "vitest";

import { Action, Reducer, Store } from "../src";

interface CounterState {
  value: number;
}

class CounterAction extends Action<"increment" | "decrement", number> {}

class CounterReducer extends Reducer<CounterState, CounterAction> {
  public reduce(state: CounterState, action: CounterAction): CounterState {
    switch (action.type) {
      case "increment":
        return {
          ...state,
          value: state.value + action.payload,
        };
      case "decrement":
        return {
          ...state,
          value: state.value - action.payload,
        };
      default:
        return state;
    }
  }
}

describe("Store", () => {
  it("изменяет состояние через dispatch", () => {
    const store = new Store<CounterState, CounterAction>({
      initialState: { value: 0 },
      reducer: new CounterReducer(),
    });

    const state = store.dispatch(new CounterAction("increment", 2));

    expect(state).toEqual({ value: 2 });
    expect(store.getState()).toEqual({ value: 2 });
  });

  it("вызывает подписчиков при изменении состояния", () => {
    const store = new Store<CounterState, CounterAction>({
      initialState: { value: 1 },
      reducer: new CounterReducer(),
    });
    const listener = vi.fn();

    store.subscribe(listener);
    store.dispatch(new CounterAction("increment", 3));

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith({ value: 4 }, { value: 1 });
  });

  it("не вызывает подписчиков, если состояние не изменилось", () => {
    class IdentityReducer extends Reducer<CounterState, CounterAction> {
      public reduce(state: CounterState): CounterState {
        return state;
      }
    }

    const store = new Store<CounterState, CounterAction>({
      initialState: { value: 5 },
      reducer: new IdentityReducer(),
    });
    const listener = vi.fn();

    store.subscribe(listener);
    store.dispatch(new CounterAction("increment", 1));

    expect(listener).not.toHaveBeenCalled();
  });

  it("поддерживает замену редьюсера", () => {
    class MultiplyReducer extends Reducer<CounterState, CounterAction> {
      public reduce(state: CounterState, action: CounterAction): CounterState {
        if (action.type !== "increment") {
          return state;
        }

        return {
          ...state,
          value: state.value * action.payload,
        };
      }
    }

    const store = new Store<CounterState, CounterAction>({
      initialState: { value: 2 },
      reducer: new CounterReducer(),
    });

    store.replaceReducer(new MultiplyReducer());
    const state = store.dispatch(new CounterAction("increment", 4));

    expect(state).toEqual({ value: 8 });
  });
});
