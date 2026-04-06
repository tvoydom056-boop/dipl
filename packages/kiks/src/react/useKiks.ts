import {
  useContext,
  useSyncExternalStore,
} from "react";

import type { Action } from "../core/Action";
import { Store } from "../core/Store";
import type { Selector } from "../core/Selector";
import { KiksContext } from "./Provider";

const identity = <TState,>(state: TState): TState => state;

/**
 * Подключает компонент к store и возвращает выбранный фрагмент состояния.
 */
export function useKiks<TState, TAction extends Action>(
  store: Store<TState, TAction>,
): TState;
export function useKiks<TState, TAction extends Action, TResult>(
  store: Store<TState, TAction>,
  selector: Selector<TState, TResult>,
): TResult;
export function useKiks<TState, TResult>(
  selector: Selector<TState, TResult>,
): TResult;
export function useKiks<TState, TAction extends Action, TResult = TState>(
  storeOrSelector?: Store<TState, TAction> | Selector<TState, TResult>,
  selector?: Selector<TState, TResult>,
): TResult {
  const contextStore = useContext(KiksContext) as Store<TState, TAction> | null;

  const resolvedStore = storeOrSelector instanceof Store
    ? storeOrSelector
    : contextStore;

  if (!resolvedStore) {
    throw new Error(
      "useKiks требует store в аргументах или Provider в дереве компонентов.",
    );
  }

  const resolvedSelector = (
    storeOrSelector instanceof Store
      ? selector ?? identity<TState>
      : storeOrSelector ?? identity<TState>
  ) as Selector<TState, TResult>;

  return useSyncExternalStore(
    resolvedStore.subscribe.bind(resolvedStore),
    () => resolvedStore.select(resolvedSelector),
    () => resolvedStore.select(resolvedSelector),
  );
}
