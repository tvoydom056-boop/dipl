import { afterEach, describe, expect, it, vi } from "vitest";

import {
  Action,
  Reducer,
  Store,
  loggerMiddleware,
  thunkMiddleware,
} from "../src";
import type { Middleware, ThunkDispatch } from "../src";

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

describe("middleware", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("loggerMiddleware логирует экшен и снимки состояния", () => {
    const groupCollapsedSpy = vi
      .spyOn(console, "groupCollapsed")
      .mockImplementation(() => undefined);
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const groupEndSpy = vi
      .spyOn(console, "groupEnd")
      .mockImplementation(() => undefined);
    const store = new Store<CounterState, CounterAction>({
      initialState: { value: 1 },
      reducer: new CounterReducer(),
      middleware: [loggerMiddleware()],
    });
    const action = new CounterAction("increment", 2);

    const state = store.dispatch(action);

    expect(state).toEqual({ value: 3 });
    expect(groupCollapsedSpy).toHaveBeenCalledTimes(1);
    expect(groupCollapsedSpy).toHaveBeenCalledWith("[kiks] increment");
    expect(logSpy).toHaveBeenNthCalledWith(1, "prev state", { value: 1 });
    expect(logSpy).toHaveBeenNthCalledWith(2, "action", action);
    expect(logSpy).toHaveBeenNthCalledWith(3, "next state", { value: 3 });
    expect(groupEndSpy).toHaveBeenCalledTimes(1);
  });

  it("thunkMiddleware вызывает функцию с dispatch и getState", () => {
    const store = new Store<CounterState, CounterAction>({
      initialState: { value: 2 },
      reducer: new CounterReducer(),
      middleware: [thunkMiddleware()],
    });
    const dispatch = store.dispatch.bind(store) as ThunkDispatch<
      CounterState,
      CounterAction
    >;
    const thunkSpy = vi.fn(
      (
        innerDispatch: ThunkDispatch<CounterState, CounterAction>,
        getState: () => CounterState,
      ) => {
        expect(getState()).toEqual({ value: 2 });

        innerDispatch(new CounterAction("increment", 5));

        return getState().value;
      },
    );

    const result = dispatch(thunkSpy);

    expect(thunkSpy).toHaveBeenCalledTimes(1);
    expect(result).toBe(7);
    expect(store.getState()).toEqual({ value: 7 });
  });

  it("выстраивает цепочку из нескольких middleware в правильном порядке", () => {
    const calls: string[] = [];
    const firstMiddleware: Middleware<CounterState, CounterAction> =
      ({ getState }) =>
      (next) =>
      (action) => {
        calls.push(`first-before:${getState().value}`);
        const result = next(action);
        calls.push(`first-after:${getState().value}`);

        return result;
      };
    const secondMiddleware: Middleware<CounterState, CounterAction> =
      ({ getState }) =>
      (next) =>
      (action) => {
        calls.push(`second-before:${getState().value}`);
        const result = next(action);
        calls.push(`second-after:${getState().value}`);

        return result;
      };
    const store = new Store<CounterState, CounterAction>({
      initialState: { value: 0 },
      reducer: new CounterReducer(),
      middleware: [firstMiddleware, secondMiddleware],
    });

    store.dispatch(new CounterAction("increment", 1));

    expect(calls).toEqual([
      "first-before:0",
      "second-before:0",
      "second-after:1",
      "first-after:1",
    ]);
  });
});
