import type { Action } from "../core/Action";
import type { Store } from "../core/Store";

/**
 * Базовая функция диспетчеризации.
 */
export type Dispatch<TAction> = (action: TAction) => unknown;

/**
 * Функция-посредник между middleware.
 */
export type Next<TAction> = (action: TAction) => unknown;

/**
 * API хранилища, доступное внутри middleware.
 */
export interface MiddlewareApi<TState, TAction extends Action> {
  getState(): TState;
  dispatch: Dispatch<TAction>;
  store: Store<TState, TAction>;
}

/**
 * Функция middleware.
 */
export type Middleware<TState, TAction extends Action> = (
  api: MiddlewareApi<TState, TAction>,
) => (next: Next<TAction>) => Next<TAction>;
