/**
 * Настройки хранения истории состояний.
 */
export interface HistoryOptions<TState> {
  initialState: TState;
  limit?: number;
}

/**
 * Снимок состояния в истории.
 */
export interface HistorySnapshot<TState> {
  index: number;
  state: TState;
}

/**
 * Модуль хранения истории состояний для time-travel.
 * Поддерживает откат, повтор и переход к произвольному снимку.
 */
export class History<TState> {
  private readonly limit: number;
  private timeline: TState[];
  private pointer: number;

  public constructor(options: HistoryOptions<TState>) {
    this.limit = options.limit ?? Number.POSITIVE_INFINITY;
    this.timeline = [options.initialState];
    this.pointer = 0;
  }

  /**
   * Возвращает индекс текущего состояния в истории.
   */
  public getCurrentIndex(): number {
    return this.pointer;
  }

  /**
   * Возвращает текущее состояние из истории.
   */
  public getCurrentState(): TState {
    return this.timeline[this.pointer];
  }

  /**
   * Возвращает неизменяемое представление всей временной шкалы.
   */
  public getSnapshots(): ReadonlyArray<HistorySnapshot<TState>> {
    return this.timeline.map((state, index) => ({
      index,
      state,
    }));
  }

  /**
   * Добавляет новое состояние в историю.
   * Если ранее был выполнен undo, "будущее" отсекается.
   */
  public record(state: TState): void {
    if (Object.is(this.getCurrentState(), state)) {
      return;
    }

    const nextTimeline = this.timeline.slice(0, this.pointer + 1);
    nextTimeline.push(state);

    if (nextTimeline.length > this.limit) {
      const overflow = nextTimeline.length - this.limit;
      this.timeline = nextTimeline.slice(overflow);
      this.pointer = this.timeline.length - 1;
      return;
    }

    this.timeline = nextTimeline;
    this.pointer = this.timeline.length - 1;
  }

  /**
   * Проверяет, можно ли выполнить переход назад.
   */
  public canUndo(): boolean {
    return this.pointer > 0;
  }

  /**
   * Проверяет, можно ли выполнить переход вперёд.
   */
  public canRedo(): boolean {
    return this.pointer < this.timeline.length - 1;
  }

  /**
   * Возвращает предыдущее состояние, если оно существует.
   */
  public undo(): TState {
    if (!this.canUndo()) {
      return this.getCurrentState();
    }

    this.pointer -= 1;
    return this.getCurrentState();
  }

  /**
   * Возвращает следующее состояние, если оно существует.
   */
  public redo(): TState {
    if (!this.canRedo()) {
      return this.getCurrentState();
    }

    this.pointer += 1;
    return this.getCurrentState();
  }

  /**
   * Переходит к указанному индексу временной шкалы.
   */
  public timeTravel(index: number): TState {
    if (!Number.isInteger(index) || index < 0 || index >= this.timeline.length) {
      return this.getCurrentState();
    }

    this.pointer = index;
    return this.getCurrentState();
  }

  /**
   * Полностью переинициализирует историю новым начальным состоянием.
   */
  public reset(initialState: TState): void {
    this.timeline = [initialState];
    this.pointer = 0;
  }
}
