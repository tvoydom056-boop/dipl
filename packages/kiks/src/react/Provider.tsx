import {
  createContext,
  type ReactNode,
} from "react";

import type { Action } from "../core/Action";
import type { Store } from "../core/Store";

type AnyStore = Store<unknown, Action>;

/**
 * Контекст для передачи store по дереву React-компонентов.
 */
export const KiksContext = createContext<AnyStore | null>(null);

/**
 * Свойства провайдера библиотеки kiks.
 */
export interface ProviderProps<TState, TAction extends Action> {
  store: Store<TState, TAction>;
  children?: ReactNode;
}

/**
 * Опциональный провайдер для подключения store через React Context.
 */
export function Provider<TState, TAction extends Action>({
  store,
  children,
}: ProviderProps<TState, TAction>) {
  return (
    <KiksContext.Provider value={store as unknown as AnyStore}>
      {children}
    </KiksContext.Provider>
  );
}
