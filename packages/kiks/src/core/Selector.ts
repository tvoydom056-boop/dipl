/**
 * Функция выбора производного значения из состояния.
 */
export type Selector<TState, TResult> = (state: TState) => TResult;

/**
 * Мемоизированная версия селектора.
 */
export interface MemoizedSelector<TState, TResult> {
  (state: TState): TResult;
  clear(): void;
}

/**
 * Создаёт мемоизированный селектор без внешних зависимостей.
 * Пересчёт происходит только при изменении ссылки на состояние.
 */
export function createSelector<TState, TResult>(
  selector: Selector<TState, TResult>,
): MemoizedSelector<TState, TResult> {
  let hasValue = false;
  let lastState: TState | undefined;
  let lastResult: TResult | undefined;

  const memoizedSelector = (state: TState): TResult => {
    if (hasValue && Object.is(lastState, state)) {
      return lastResult as TResult;
    }

    const nextResult = selector(state);
    lastState = state;
    lastResult = nextResult;
    hasValue = true;

    return nextResult;
  };

  memoizedSelector.clear = (): void => {
    hasValue = false;
    lastState = undefined;
    lastResult = undefined;
  };

  return memoizedSelector;
}
