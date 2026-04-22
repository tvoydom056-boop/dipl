import type { Action } from "./Action";
import { History } from "./History";
import type { Reducer } from "./Reducer";
import {
  createSelector,
  isMemoizedSelector,
  type MemoizedSelector,
  type Selector,
} from "./Selector";
import type {
  Dispatch,
  Middleware,
  MiddlewareApi,
} from "../middleware/types";

/**
 * Подписчик, вызываемый после изменения состояния.
 */
export type Listener<TState> = (state: TState, previousState: TState) => void;

/**
 * Функция отписки от обновлений хранилища.
 */
export type Unsubscribe = () => void;

/**
 * Конфигурация хранилища.
 */
export interface StoreOptions<TState, TAction extends Action> {
  initialState: TState;
  reducer: Reducer<TState, TAction> | ReadonlyArray<Reducer<TState, TAction>>;
  historyLimit?: number;
  middleware?: ReadonlyArray<Middleware<TState, TAction>>;
}

/**
 * Ядро библиотеки kiks.
 * Хранит состояние, управляет подписками и централизует обработку экшенов.
 */
export class Store<
  TState,
  TAction extends Action = Action,
> {
  private state: TState;
  private reducers: Reducer<TState, TAction>[];
  private readonly history: History<TState>;
  private readonly listeners: Set<Listener<TState>>;
  private readonly middleware: ReadonlyArray<Middleware<TState, TAction>>;
  private readonly selectorCache: WeakMap<
    Selector<TState, unknown>,
    MemoizedSelector<TState, unknown>
  >;
  private readonly baseDispatch: Dispatch<TAction>;
  private readonly dispatchPipeline: Dispatch<TAction>;

  public constructor(options: StoreOptions<TState, TAction>) {
    this.state = options.initialState;
    this.reducers = Array.isArray(options.reducer)
      ? [...options.reducer]
      : [options.reducer];
    this.history = new History<TState>({
      initialState: options.initialState,
      limit: options.historyLimit,
    });
    this.listeners = new Set<Listener<TState>>();
    this.middleware = options.middleware ?? [];
    this.selectorCache = new WeakMap<
      Selector<TState, unknown>,
      MemoizedSelector<TState, unknown>
    >();
    this.baseDispatch = (action: TAction): TState => this.reduce(action);
    this.dispatchPipeline = this.composeMiddleware();
  }

  /**
   * Возвращает текущее состояние без его модификации.
   */
  public getState(): TState {
    return this.state;
  }

  /**
   * Возвращает мемоизированный результат селектора для текущего состояния.
   */
  public select<TResult>(selector: Selector<TState, TResult>): TResult {
    if (isMemoizedSelector(selector)) {
      return selector(this.state);
    }

    let memoizedSelector = this.selectorCache.get(selector) as
      | MemoizedSelector<TState, TResult>
      | undefined;

    if (!memoizedSelector) {
      memoizedSelector = createSelector(selector);
      this.selectorCache.set(
        selector as Selector<TState, unknown>,
        memoizedSelector as MemoizedSelector<TState, unknown>,
      );
    }

    return memoizedSelector(this.state);
  }

  /**
   * Последовательно пропускает экшен через все редьюсеры
   * и уведомляет подписчиков только при изменении ссылки на состояние.
   */
  public dispatch(action: TAction): TState {
    return this.dispatchPipeline(action) as TState;
  }

  /**
   * Последовательно пропускает экшен через все редьюсеры
   * и уведомляет подписчиков только при изменении ссылки на состояние.
   */
  private reduce(action: TAction): TState {
    const previousState = this.state;
    const nextState = this.reducers.reduce<TState>(
      (currentState, reducer) => reducer.reduce(currentState, action),
      previousState,
    );

    if (Object.is(previousState, nextState)) {
      return this.state;
    }

    this.state = nextState;
    this.history.record(nextState);
    this.emit(this.state, previousState);

    return this.state;
  }

  /**
   * Подписывает обработчик на изменения состояния.
   */
  public subscribe(listener: Listener<TState>): Unsubscribe {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Позволяет заменить набор редьюсеров без пересоздания store.
   * Это пригодится для модульной архитектуры и тестирования.
   */
  public replaceReducer(
    reducer: Reducer<TState, TAction> | ReadonlyArray<Reducer<TState, TAction>>,
  ): void {
    this.reducers = Array.isArray(reducer) ? [...reducer] : [reducer];
  }

  /**
   * Возвращает модуль истории для чтения метаданных.
   */
  public getHistory(): History<TState> {
    return this.history;
  }

  /**
   * Выполняет переход к предыдущему состоянию, если оно существует.
   */
  public undo(): TState {
    return this.applyHistoryState(this.history.undo());
  }

  /**
   * Выполняет повтор ранее отменённого состояния.
   */
  public redo(): TState {
    return this.applyHistoryState(this.history.redo());
  }

  /**
   * Выполняет переход к произвольному состоянию по его индексу.
   */
  public timeTravel(index: number): TState {
    return this.applyHistoryState(this.history.timeTravel(index));
  }

  /**
   * Возвращает true, если возможен переход назад.
   */
  public canUndo(): boolean {
    return this.history.canUndo();
  }

  /**
   * Возвращает true, если возможен переход вперёд.
   */
  public canRedo(): boolean {
    return this.history.canRedo();
  }

  private emit(state: TState, previousState: TState): void {
    for (const listener of this.listeners) {
      listener(state, previousState);
    }
  }

  private applyHistoryState(nextState: TState): TState {
    const previousState = this.state;

    if (Object.is(previousState, nextState)) {
      return this.state;
    }

    this.state = nextState;
    this.emit(this.state, previousState);

    return this.state;
  }

  private composeMiddleware(): Dispatch<TAction> {
    if (this.middleware.length === 0) {
      return this.baseDispatch;
    }

    const api: MiddlewareApi<TState, TAction> = {
      getState: () => this.getState(),
      dispatch: (action: TAction) => this.dispatch(action),
      store: this,
    };

    return this.middleware.reduceRight<Dispatch<TAction>>(
      (next, middleware) => middleware(api)(next),
      this.baseDispatch,
    );
  }
}
