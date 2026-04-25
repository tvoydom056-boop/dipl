// @vitest-environment jsdom

import * as React from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Action, Provider, Reducer, Store, useKiks } from "../src";

interface CounterState {
  count: number;
  label: string;
}

class CounterAction extends Action<"increment" | "rename", number | string> {}

class CounterReducer extends Reducer<CounterState, CounterAction> {
  public reduce(state: CounterState, action: CounterAction): CounterState {
    switch (action.type) {
      case "increment":
        return {
          ...state,
          count: state.count + (action.payload as number),
        };
      case "rename":
        return {
          ...state,
          label: action.payload as string,
        };
      default:
        return state;
    }
  }
}

function createStore(initialState: CounterState = { count: 1, label: "initial" }) {
  return new Store<CounterState, CounterAction>({
    initialState,
    reducer: new CounterReducer(),
  });
}

const selectCount = (state: CounterState) => state.count;
const selectLabel = (state: CounterState) => state.label;

describe("React layer", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("returns the full state when useKiks receives a store only", () => {
    const store = createStore();

    function CounterStateView() {
      const state = useKiks(store);
      return <output>{`${state.label}:${state.count}`}</output>;
    }

    render(<CounterStateView />);
    expect(screen.getByText("initial:1")).toBeTruthy();

    act(() => {
      store.dispatch(new CounterAction("increment", 2));
    });
    expect(screen.getByText("initial:3")).toBeTruthy();
  });

  it("returns a derived value when useKiks receives store and selector", () => {
    const store = createStore();

    function CounterCountView() {
      const count = useKiks(store, selectCount);
      return <output>{count}</output>;
    }

    render(<CounterCountView />);
    expect(screen.getByText("1")).toBeTruthy();

    act(() => {
      store.dispatch(new CounterAction("increment", 4));
    });
    expect(screen.getByText("5")).toBeTruthy();
  });

  it("reads the store from Provider when only a selector is passed", () => {
    const store = createStore();

    function CounterLabelView() {
      const label = useKiks(selectLabel);
      return <output>{label}</output>;
    }

    render(
      <Provider store={store}>
        <CounterLabelView />
      </Provider>,
    );

    expect(screen.getByText("initial")).toBeTruthy();
    act(() => {
      store.dispatch(new CounterAction("rename", "updated"));
    });
    expect(screen.getByText("updated")).toBeTruthy();
  });

  it("throws when useKiks is called without store or Provider", () => {
    function BrokenConsumer() {
      useKiks((state: CounterState) => state.count);
      return null;
    }

    expect(() => render(<BrokenConsumer />)).toThrow(
      "useKiks требует store в аргументах или Provider в дереве компонентов.",
    );
  });

  it("keeps the store available through Provider context updates", () => {
    const store = createStore();

    function CounterContextView() {
      const count = useKiks(selectCount);
      const label = useKiks(selectLabel);
      return <output>{`${label}:${count}`}</output>;
    }

    render(
      <Provider store={store}>
        <CounterContextView />
      </Provider>,
    );

    act(() => {
      store.dispatch(new CounterAction("increment", 1));
      store.dispatch(new CounterAction("rename", "synced"));
    });

    expect(screen.getByText("synced:2")).toBeTruthy();
  });

  it("warns in development when an inline selector creates a new reference on rerender", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const store = createStore();

    function TestHarness() {
      const [tick, setTick] = React.useState(0);
      const count = useKiks((state: CounterState) => state.count + tick * 0);

      return (
        <div>
          <output>{count}</output>
          <button onClick={() => setTick((value) => value + 1)} type="button">
            rerender
          </button>
        </div>
      );
    }

    render(
      <Provider store={store}>
        <TestHarness />
      </Provider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "rerender" }));

    await waitFor(() => {
      expect(warnSpy).toHaveBeenCalledTimes(1);
    });
  });
});
