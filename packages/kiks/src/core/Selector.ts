/**
 * Function that derives a value from the current store state.
 */
export type Selector<TState, TResult> = (state: TState) => TResult;

/**
 * Alias for selectors used as explicit dependency extractors.
 */
export type SelectorDependency<TState, TResult> = Selector<TState, TResult>;

/**
 * Supported selector caching strategies.
 */
export type SelectorStrategy =
  | "full-recompute"
  | "last-result"
  | "state-reference"
  | "dependencies";

/**
 * Runtime telemetry for selector benchmarks and diagnostics.
 */
export interface SelectorStats {
  strategy: SelectorStrategy;
  recomputations: number;
  cacheHits: number;
}

/**
 * Options for single-function selectors.
 */
export interface SelectorOptions<TState, TCacheKey = unknown> {
  strategy?: Exclude<SelectorStrategy, "dependencies">;
  getCacheKey?: Selector<TState, TCacheKey>;
  isEqual?: (left: TCacheKey, right: TCacheKey) => boolean;
}

/**
 * Options for selectors with explicit dependency lists.
 */
export interface DependencySelectorOptions<TDependency = unknown> {
  strategy?: "dependencies";
  isEqual?: (left: TDependency, right: TDependency) => boolean;
}

/**
 * Memoized selector with lifecycle helpers.
 */
export interface MemoizedSelector<TState, TResult> {
  (state: TState): TResult;
  clear(): void;
  getStats(): SelectorStats;
  readonly strategy: SelectorStrategy;
}

const MEMOIZED_SELECTOR_SYMBOL = Symbol.for("kiks.memoizedSelector");

type InternalMemoizedSelector<TState, TResult> = MemoizedSelector<TState, TResult> & {
  [MEMOIZED_SELECTOR_SYMBOL]: true;
};

type DependencySelectorList<TState, TDependencies extends readonly unknown[]> = {
  readonly [K in keyof TDependencies]: SelectorDependency<TState, TDependencies[K]>;
};

function createStats(strategy: SelectorStrategy): SelectorStats {
  return {
    strategy,
    recomputations: 0,
    cacheHits: 0,
  };
}

function defineMemoizedSelector<TState, TResult>(
  strategy: SelectorStrategy,
  execute: (state: TState, stats: SelectorStats) => TResult,
  reset: () => void,
): MemoizedSelector<TState, TResult> {
  const stats = createStats(strategy);

  const memoizedSelector = ((state: TState): TResult =>
    execute(state, stats)) as InternalMemoizedSelector<TState, TResult>;

  memoizedSelector.clear = (): void => {
    reset();
    stats.recomputations = 0;
    stats.cacheHits = 0;
  };

  memoizedSelector.getStats = (): SelectorStats => ({
    ...stats,
  });

  Object.defineProperty(memoizedSelector, "strategy", {
    value: strategy,
    enumerable: true,
    configurable: false,
    writable: false,
  });

  Object.defineProperty(memoizedSelector, MEMOIZED_SELECTOR_SYMBOL, {
    value: true,
    enumerable: false,
    configurable: false,
    writable: false,
  });

  return memoizedSelector;
}

/**
 * Checks whether a selector was produced by createSelector.
 */
export function isMemoizedSelector<TState, TResult>(
  selector: Selector<TState, TResult>,
): selector is MemoizedSelector<TState, TResult> {
  return Boolean(
    selector &&
    typeof selector === "function" &&
    MEMOIZED_SELECTOR_SYMBOL in (selector as unknown as Record<PropertyKey, unknown>),
  );
}

/**
 * Creates a selector from a single state reader.
 */
export function createSelector<TState, TResult>(
  selector: Selector<TState, TResult>,
  options?: SelectorOptions<TState>,
): MemoizedSelector<TState, TResult>;

/**
 * Creates a selector with explicit dependencies and projector function.
 */
export function createSelector<TState, const TDependencies extends readonly unknown[], TResult>(
  dependencies: DependencySelectorList<TState, TDependencies>,
  projector: (...dependencies: TDependencies) => TResult,
  options?: DependencySelectorOptions,
): MemoizedSelector<TState, TResult>;

export function createSelector<TState, TResult, const TDependencies extends readonly unknown[]>(
  selectorOrDependencies: Selector<TState, TResult> | DependencySelectorList<TState, TDependencies>,
  projectorOrOptions?: SelectorOptions<TState> | ((...dependencies: TDependencies) => TResult),
  maybeOptions?: DependencySelectorOptions,
): MemoizedSelector<TState, TResult> {
  if (Array.isArray(selectorOrDependencies)) {
    const dependencies = selectorOrDependencies as DependencySelectorList<TState, TDependencies>;
    const projector = projectorOrOptions as (...dependencies: TDependencies) => TResult;

    if (typeof projector !== "function") {
      throw new TypeError("Dependency-based createSelector requires a projector function.");
    }

    const equality = maybeOptions?.isEqual ?? Object.is;
    let hasValue = false;
    let lastDependencies: TDependencies | undefined;
    let lastResult: TResult | undefined;

    return defineMemoizedSelector<TState, TResult>(
      "dependencies",
      (state, stats) => {
        const nextDependencies = dependencies.map((dependency) =>
          dependency(state),
        ) as unknown as TDependencies;

        if (
          hasValue &&
          lastDependencies &&
          nextDependencies.length === lastDependencies.length &&
          nextDependencies.every((dependency, index) =>
            equality(dependency, (lastDependencies as TDependencies)[index]),
          )
        ) {
          stats.cacheHits += 1;
          return lastResult as TResult;
        }

        const nextResult = projector(...nextDependencies);
        lastDependencies = nextDependencies;
        lastResult = nextResult;
        hasValue = true;
        stats.recomputations += 1;

        return nextResult;
      },
      () => {
        hasValue = false;
        lastDependencies = undefined;
        lastResult = undefined;
      },
    );
  }

  const selector = selectorOrDependencies as Selector<TState, TResult>;
  const options = (projectorOrOptions ?? {}) as SelectorOptions<TState>;
  const strategy = options.strategy ?? "state-reference";
  const equality = options.isEqual ?? Object.is;

  if (strategy === "full-recompute") {
    return defineMemoizedSelector<TState, TResult>(
      "full-recompute",
      (state, stats) => {
        stats.recomputations += 1;
        return selector(state);
      },
      () => undefined,
    );
  }

  if (strategy === "last-result") {
    const getCacheKey = options.getCacheKey ?? ((state: TState) => state);
    let hasValue = false;
    let lastKey: unknown;
    let lastResult: TResult | undefined;

    return defineMemoizedSelector<TState, TResult>(
      "last-result",
      (state, stats) => {
        const nextKey = getCacheKey(state);

        if (hasValue && equality(lastKey as never, nextKey as never)) {
          stats.cacheHits += 1;
          return lastResult as TResult;
        }

        const nextResult = selector(state);
        lastKey = nextKey;
        lastResult = nextResult;
        hasValue = true;
        stats.recomputations += 1;

        return nextResult;
      },
      () => {
        hasValue = false;
        lastKey = undefined;
        lastResult = undefined;
      },
    );
  }

  let hasValue = false;
  let lastState: TState | undefined;
  let lastResult: TResult | undefined;

  return defineMemoizedSelector<TState, TResult>(
    "state-reference",
    (state, stats) => {
      if (hasValue && Object.is(lastState, state)) {
        stats.cacheHits += 1;
        return lastResult as TResult;
      }

      const nextResult = selector(state);
      lastState = state;
      lastResult = nextResult;
      hasValue = true;
      stats.recomputations += 1;

      return nextResult;
    },
    () => {
      hasValue = false;
      lastState = undefined;
      lastResult = undefined;
    },
  );
}
