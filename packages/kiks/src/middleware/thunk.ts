import type { Action } from "../core/Action";
import type { Middleware } from "./types";

/**
 * Асинхронный экшен в стиле thunk.
 */
export type ThunkAction<TState, TAction extends Action> = (
  dispatch: ThunkDispatch<TState, TAction>,
  getState: () => TState,
) => unknown;

/**
 * Расширенная функция dispatch, понимающая как обычные экшены, так и thunk.
 */
export type ThunkDispatch<TState, TAction extends Action> = (
  action: TAction | ThunkAction<TState, TAction>,
) => unknown;

/**
 * Объединённый тип стандартного экшена и thunk-функции.
 */
export type Dispatchable<TState, TAction extends Action> = TAction | ThunkAction<TState, TAction>;

/**
 * Встроенный middleware для поддержки асинхронных операций.
 */
export function thunkMiddleware<TState, TAction extends Action>(): Middleware<TState, TAction> {
  return ({ dispatch, getState }) =>
    (next) =>
    (action) => {
      const candidate = action as unknown;

      if (typeof candidate === "function") {
        return (candidate as ThunkAction<TState, TAction>)(
          dispatch as ThunkDispatch<TState, TAction>,
          getState,
        );
      }

      return next(action);
    };
}
