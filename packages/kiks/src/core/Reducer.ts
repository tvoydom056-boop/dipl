import type { Action } from "./Action";

/**
 * Абстрактный редьюсер для ООП-подхода.
 * Каждый конкретный редьюсер отвечает за преобразование состояния.
 */
export abstract class Reducer<TState, TAction extends Action = Action> {
  /**
   * Выполняет преобразование состояния на основании экшена.
   */
  public abstract reduce(state: TState, action: TAction): TState;
}
