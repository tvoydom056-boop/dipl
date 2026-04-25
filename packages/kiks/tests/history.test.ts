import { describe, expect, it } from "vitest";

import { Action, Reducer, Store } from "../src";

interface CounterState {
  value: number;
}

class CounterAction extends Action<"increment", number> {}

class CounterReducer extends Reducer<CounterState, CounterAction> {
  public reduce(state: CounterState, action: CounterAction): CounterState {
    return {
      ...state,
      value: state.value + action.payload,
    };
  }
}

describe("History", () => {
  it("сохраняет историю состояний и поддерживает undo/redo", () => {
    const store = new Store<CounterState, CounterAction>({
      initialState: { value: 0 },
      reducer: new CounterReducer(),
    });

    store.dispatch(new CounterAction("increment", 1));
    store.dispatch(new CounterAction("increment", 2));

    expect(store.getState()).toEqual({ value: 3 });
    expect(store.canUndo()).toBe(true);

    store.undo();
    expect(store.getState()).toEqual({ value: 1 });
    expect(store.canRedo()).toBe(true);

    store.redo();
    expect(store.getState()).toEqual({ value: 3 });
  });

  it("выполняет переход к состоянию по индексу", () => {
    const store = new Store<CounterState, CounterAction>({
      initialState: { value: 10 },
      reducer: new CounterReducer(),
    });

    store.dispatch(new CounterAction("increment", 5));
    store.dispatch(new CounterAction("increment", 2));

    store.timeTravel(0);
    expect(store.getState()).toEqual({ value: 10 });

    store.timeTravel(2);
    expect(store.getState()).toEqual({ value: 17 });
  });

  it("обрезает будущее после нового dispatch из прошлого", () => {
    const store = new Store<CounterState, CounterAction>({
      initialState: { value: 0 },
      reducer: new CounterReducer(),
    });

    store.dispatch(new CounterAction("increment", 1));
    store.dispatch(new CounterAction("increment", 1));
    store.undo();

    store.dispatch(new CounterAction("increment", 5));

    expect(store.getState()).toEqual({ value: 6 });
    expect(store.canRedo()).toBe(false);
    expect(store.getHistory().getSnapshots()).toHaveLength(3);
  });

  it("ограничивает длину истории по historyLimit", () => {
    const store = new Store<CounterState, CounterAction>({
      initialState: { value: 0 },
      reducer: new CounterReducer(),
      historyLimit: 3,
    });

    store.dispatch(new CounterAction("increment", 1));
    store.dispatch(new CounterAction("increment", 1));
    store.dispatch(new CounterAction("increment", 1));

    expect(
      store
        .getHistory()
        .getSnapshots()
        .map((item) => item.state),
    ).toEqual([{ value: 1 }, { value: 2 }, { value: 3 }]);
    expect(store.getHistory().getCurrentIndex()).toBe(2);
  });
});
