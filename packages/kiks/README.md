# kiks

Lightweight state management library for React applications with built-in history, selectors, middleware, and React bindings.

## Installation

```bash
npm install kiks react
```

`react` is a peer dependency.

## Quick Start

```ts
import {
  Action,
  Provider,
  Reducer,
  Store,
  useKiks,
} from "kiks";

interface CounterState {
  count: number;
}

class IncrementAction extends Action<"increment", number> {}

class CounterReducer extends Reducer<CounterState, IncrementAction> {
  public reduce(state: CounterState, action: IncrementAction): CounterState {
    switch (action.type) {
      case "increment":
        return { count: state.count + action.payload };
      default:
        return state;
    }
  }
}

const counterStore = new Store<CounterState, IncrementAction>({
  initialState: { count: 0 },
  reducer: new CounterReducer(),
  historyLimit: 50,
});

function CounterValue() {
  const count = useKiks((state: CounterState) => state.count);

  return (
    <button onClick={() => counterStore.dispatch(new IncrementAction("increment", 1))} type="button">
      Count: {count}
    </button>
  );
}

export function App() {
  return (
    <Provider store={counterStore}>
      <CounterValue />
    </Provider>
  );
}
```

## API Reference

### `Store`

Central state container.

```ts
const store = new Store<State, AppAction>({
  initialState,
  reducer,
  historyLimit: 100,
  middleware: [],
});
```

Main methods:

- `getState(): TState` returns the current state snapshot.
- `dispatch(action): TState` runs reducers and middleware.
- `select(selector): TResult` resolves a memoized selector result.
- `subscribe(listener): () => void` subscribes to state changes.
- `replaceReducer(reducer): void` replaces reducer instances without recreating the store.
- `getHistory(): History<TState>` returns the history module.
- `undo(): TState`, `redo(): TState`, `timeTravel(index): TState` navigate snapshots.
- `canUndo(): boolean`, `canRedo(): boolean` expose history availability.

### `History`

Snapshot timeline used by the store for time-travel operations.

```ts
const history = store.getHistory();

history.getCurrentIndex();
history.getSnapshots();
history.canUndo();
history.canRedo();
```

Notes:

- `historyLimit` trims the oldest snapshots when the limit is reached.
- `undo()` followed by a new `dispatch()` drops the abandoned future branch.

### `createSelector`

Memoized selector factory with several strategies.

Single-function selector:

```ts
import { createSelector } from "kiks";

const selectCompletedCount = createSelector((state: TodoState) =>
  state.tasks.filter((task) => task.done).length,
);
```

Dependency-based selector:

```ts
const selectVisibleTasks = createSelector(
  [
    (state: TodoState) => state.tasks,
    (state: TodoState) => state.filter,
  ] as const,
  (tasks, filter) => tasks.filter((task) => filter === "all" || task.status === filter),
);
```

Supported strategies:

- `"state-reference"`: default, cache hit only for the same state reference.
- `"full-recompute"`: no caching, always recomputes.
- `"last-result"`: reuses the last result by custom cache key.
- `"dependencies"`: recomputes only when selected dependencies change.

Memoized selectors expose:

- `clear()`
- `getStats()`
- `strategy`

### `useKiks`

React hook for reading state from the store.

Supported overloads:

```ts
const fullState = useKiks(store);
const count = useKiks(store, selectCount);
const visibleTasks = useKiks(selectVisibleTasks);
```

Behavior:

- Reads from the explicit `store` argument when provided.
- Falls back to `Provider` context when only a selector is passed.
- Throws when neither a direct store nor a context store is available.
- Warns in development if a new inline selector reference is created on every render, because store-level selector caching cannot be reused.

### `Provider`

Context bridge for React components.

```tsx
<Provider store={store}>
  <App />
</Provider>
```

### Middleware

Middleware composes around `dispatch` from right to left.

```ts
import {
  loggerMiddleware,
  thunkMiddleware,
  type Middleware,
} from "kiks";

const metricsMiddleware: Middleware<State, AppAction> =
  ({ getState, dispatch }) =>
  (next) =>
  (action) => {
    const before = getState();
    const result = next(action);
    const after = getState();

    if (before !== after) {
      dispatch(new AppAction("tracked", action.type));
    }

    return result;
  };
```

Built-in middleware:

- `loggerMiddleware()`
- `thunkMiddleware()`

## TypeScript Example

```ts
import { Action, Reducer, Store, createSelector } from "kiks";

interface Task {
  id: string;
  title: string;
  completed: boolean;
}

interface TaskState {
  tasks: Task[];
  search: string;
}

class AddTaskAction extends Action<"task/add", Task> {}
class SetSearchAction extends Action<"task/search", string> {}

type TaskAction = AddTaskAction | SetSearchAction;

class TaskReducer extends Reducer<TaskState, TaskAction> {
  public reduce(state: TaskState, action: TaskAction): TaskState {
    switch (action.type) {
      case "task/add":
        return {
          ...state,
          tasks: [...state.tasks, action.payload],
        };
      case "task/search":
        return {
          ...state,
          search: action.payload,
        };
      default:
        return state;
    }
  }
}

export const taskStore = new Store<TaskState, TaskAction>({
  initialState: {
    tasks: [],
    search: "",
  },
  reducer: new TaskReducer(),
});

export const selectVisibleTasks = createSelector(
  [
    (state: TaskState) => state.tasks,
    (state: TaskState) => state.search,
  ] as const,
  (tasks, search) => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return tasks;
    }

    return tasks.filter((task) => task.title.toLowerCase().includes(query));
  },
);
```

## Development

```bash
npm test
npm run build
```
