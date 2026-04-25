import { useSyncExternalStore } from "react";

import type { Action } from "../../../../packages/kiks/src/core/Action";
import type { Selector } from "../../../../packages/kiks/src/core/Selector";
import type { Store } from "../../../../packages/kiks/src/core/Store";

const identity = <TState>(state: TState): TState => state;

/**
 * Упрощенный demo-хук без Provider, чтобы benchmark использовал одну копию React.
 */
export function useKiksLocal<TState, TAction extends Action>(store: Store<TState, TAction>): TState;
export function useKiksLocal<TState, TAction extends Action, TResult>(
  store: Store<TState, TAction>,
  selector: Selector<TState, TResult>,
): TResult;
export function useKiksLocal<TState, TAction extends Action, TResult = TState>(
  store: Store<TState, TAction>,
  selector?: Selector<TState, TResult>,
): TResult {
  const resolvedSelector = (selector ?? identity<TState>) as Selector<TState, TResult>;

  return useSyncExternalStore(
    store.subscribe.bind(store),
    () => store.select(resolvedSelector),
    () => store.select(resolvedSelector),
  );
}
