import type { Action } from "../core/Action";
import type { Middleware } from "./types";

/**
 * Встроенный middleware логирования.
 * Выводит тип экшена и снимки состояния до и после обработки.
 */
export function loggerMiddleware<TState, TAction extends Action>(): Middleware<TState, TAction> {
  return ({ getState }) =>
    (next) =>
    (action) => {
      const previousState = getState();

      if (typeof console !== "undefined") {
        console.groupCollapsed(`[kiks] ${action.type}`);
        console.log("prev state", previousState);
        console.log("action", action);
      }

      const result = next(action);
      const nextState = getState();

      if (typeof console !== "undefined") {
        console.log("next state", nextState);
        console.groupEnd();
      }

      return result;
    };
}
