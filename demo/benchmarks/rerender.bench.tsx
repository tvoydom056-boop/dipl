import { type ProfilerOnRenderCallback, type ReactElement, Profiler, act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { Provider, useSelector } from "react-redux";
import { observer } from "mobx-react-lite";
import { JSDOM } from "jsdom";

import { taskStore } from "../src/implementations/kiks/store";
import {
  selectRootCategories,
  selectTaskStats,
  selectVisibleTasks,
} from "../src/implementations/kiks/selectors";
import { useKiksLocal } from "../src/implementations/kiks/useKiksLocal";
import { kiksBenchmarkApi } from "../src/implementations/kiks/KiksTaskManager";
import {
  reduxBenchmarkApi,
  reduxStore,
  type ReduxRootState,
} from "../src/implementations/redux/ReduxTaskManager";
import {
  zustandBenchmarkApi,
  useZustandTaskStore,
} from "../src/implementations/zustand/ZustandTaskManager";
import { mobxBenchmarkApi, mobxTaskStore } from "../src/implementations/mobx/MobxTaskManager";
import { trackRender } from "../src/shared/renderTracker";
import { getRootCategories, getTaskStats, getVisibleTasks } from "../src/shared/taskModel";
import {
  implementationOrder,
  rerenderScenarioOrder,
  type ImplementationKey,
  type RerenderBenchEntry,
  type RerenderScenarioKey,
} from "../src/shared/benchmarkModel";
import { updateBenchmarkResults } from "./results-store";

const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  pretendToBeVisual: true,
  url: "http://localhost",
});

const { window } = dom;

Object.assign(globalThis, {
  window,
  document: window.document,
  navigator: window.navigator,
  HTMLElement: window.HTMLElement,
  HTMLInputElement: window.HTMLInputElement,
  HTMLTextAreaElement: window.HTMLTextAreaElement,
  HTMLButtonElement: window.HTMLButtonElement,
  Event: window.Event,
  MouseEvent: window.MouseEvent,
  SubmitEvent: window.SubmitEvent,
  Node: window.Node,
  MutationObserver: window.MutationObserver,
  requestAnimationFrame: window.requestAnimationFrame.bind(window),
  cancelAnimationFrame: window.cancelAnimationFrame.bind(window),
  IS_REACT_ACT_ENVIRONMENT: true,
  __KIKS_RENDER_TRACKER__: { counts: {} },
});

function SnapshotZone({
  zone,
  values,
}: {
  zone: string;
  values: Array<string | number | boolean | null>;
}) {
  trackRender(zone);
  return <div data-zone={zone}>{values.join("|")}</div>;
}

function KiksSummaryZone() {
  const search = useKiksLocal(taskStore, (state) => state.search);
  const filter = useKiksLocal(taskStore, (state) => state.filter);
  const sort = useKiksLocal(taskStore, (state) => state.sort);
  const selectedCategoryId = useKiksLocal(taskStore, (state) => state.selectedCategoryId);
  return <SnapshotZone values={[search, filter, sort, selectedCategoryId]} zone="summary-zone" />;
}

function KiksStatsZone() {
  const stats = useKiksLocal(taskStore, selectTaskStats);
  const operationsCount = useKiksLocal(taskStore, (state) => state.operationsCount);
  return (
    <SnapshotZone
      values={[stats.total, stats.active, stats.completed, operationsCount]}
      zone="stats-zone"
    />
  );
}

function KiksFiltersZone() {
  const search = useKiksLocal(taskStore, (state) => state.search);
  const filter = useKiksLocal(taskStore, (state) => state.filter);
  const sort = useKiksLocal(taskStore, (state) => state.sort);
  return <SnapshotZone values={[search, filter, sort]} zone="filters-zone" />;
}

function KiksCategoriesZone() {
  const allCategories = useKiksLocal(taskStore, (state) => state.categories);
  const rootCategories = useKiksLocal(taskStore, selectRootCategories);
  const selectedCategoryId = useKiksLocal(taskStore, (state) => state.selectedCategoryId);

  trackRender("categories-zone");

  return (
    <div data-zone="categories-zone">
      <span>{allCategories.length}</span>
      <span>{rootCategories.length}</span>
      <span>{selectedCategoryId ?? "all"}</span>
    </div>
  );
}

function KiksListZone() {
  const tasks = useKiksLocal(taskStore, selectVisibleTasks);

  trackRender("list-zone");

  return (
    <div data-zone="list-zone">
      <span>{tasks.length}</span>
      {tasks.map((task) => {
        trackRender(`list-item:${task.id}`);
        return (
          <span key={task.id}>
            {task.id}:{task.status}
          </span>
        );
      })}
    </div>
  );
}

function KiksHistoryZone() {
  useKiksLocal(taskStore, (state) => state.operationsCount);
  const snapshots = taskStore.getHistory().getSnapshots();
  const historyIndex = taskStore.getHistory().getCurrentIndex();

  trackRender("history-zone");

  return (
    <div data-zone="history-zone">
      <span>{snapshots.length}</span>
      <span>{historyIndex}</span>
      {snapshots.map((snapshot) => {
        trackRender(`history-item:${snapshot.index}`);
        return <span key={snapshot.index}>{snapshot.index}</span>;
      })}
    </div>
  );
}

function KiksBenchmarkBoard() {
  return (
    <>
      <KiksSummaryZone />
      <KiksStatsZone />
      <KiksFiltersZone />
      <KiksCategoriesZone />
      <KiksListZone />
      <KiksHistoryZone />
    </>
  );
}

function ReduxSummaryZone() {
  const currentState = useSelector((state: ReduxRootState) => state.timeline[state.pointer]);
  return (
    <SnapshotZone
      values={[
        currentState.search,
        currentState.filter,
        currentState.sort,
        currentState.selectedCategoryId,
      ]}
      zone="summary-zone"
    />
  );
}

function ReduxStatsZone() {
  const currentState = useSelector((state: ReduxRootState) => state.timeline[state.pointer]);
  const stats = getTaskStats(currentState);
  return (
    <SnapshotZone
      values={[stats.total, stats.active, stats.completed, currentState.operationsCount]}
      zone="stats-zone"
    />
  );
}

function ReduxFiltersZone() {
  const currentState = useSelector((state: ReduxRootState) => state.timeline[state.pointer]);
  return (
    <SnapshotZone
      values={[currentState.search, currentState.filter, currentState.sort]}
      zone="filters-zone"
    />
  );
}

function ReduxCategoriesZone() {
  const currentState = useSelector((state: ReduxRootState) => state.timeline[state.pointer]);
  const rootCategories = getRootCategories(currentState);

  trackRender("categories-zone");

  return (
    <div data-zone="categories-zone">
      <span>{currentState.categories.length}</span>
      <span>{rootCategories.length}</span>
      <span>{currentState.selectedCategoryId ?? "all"}</span>
    </div>
  );
}

function ReduxListZone() {
  const currentState = useSelector((state: ReduxRootState) => state.timeline[state.pointer]);
  const tasks = getVisibleTasks(currentState);

  trackRender("list-zone");

  return (
    <div data-zone="list-zone">
      <span>{tasks.length}</span>
      {tasks.map((task) => {
        trackRender(`list-item:${task.id}`);
        return (
          <span key={task.id}>
            {task.id}:{task.status}
          </span>
        );
      })}
    </div>
  );
}

function ReduxHistoryZone() {
  const timeline = useSelector((state: ReduxRootState) => state.timeline);
  const pointer = useSelector((state: ReduxRootState) => state.pointer);

  trackRender("history-zone");

  return (
    <div data-zone="history-zone">
      <span>{timeline.length}</span>
      <span>{pointer}</span>
      {timeline.map((snapshot, index) => {
        trackRender(`history-item:${index}`);
        return (
          <span key={index}>
            {index}:{snapshot.tasks.length}
          </span>
        );
      })}
    </div>
  );
}

function ReduxBenchmarkBoard() {
  return (
    <Provider store={reduxStore}>
      <ReduxSummaryZone />
      <ReduxStatsZone />
      <ReduxFiltersZone />
      <ReduxCategoriesZone />
      <ReduxListZone />
      <ReduxHistoryZone />
    </Provider>
  );
}

function ZustandSummaryZone() {
  const currentState = useZustandTaskStore((state) => state.timeline[state.pointer]);
  return (
    <SnapshotZone
      values={[
        currentState.search,
        currentState.filter,
        currentState.sort,
        currentState.selectedCategoryId,
      ]}
      zone="summary-zone"
    />
  );
}

function ZustandStatsZone() {
  const currentState = useZustandTaskStore((state) => state.timeline[state.pointer]);
  const stats = getTaskStats(currentState);
  return (
    <SnapshotZone
      values={[stats.total, stats.active, stats.completed, currentState.operationsCount]}
      zone="stats-zone"
    />
  );
}

function ZustandFiltersZone() {
  const currentState = useZustandTaskStore((state) => state.timeline[state.pointer]);
  return (
    <SnapshotZone
      values={[currentState.search, currentState.filter, currentState.sort]}
      zone="filters-zone"
    />
  );
}

function ZustandCategoriesZone() {
  const currentState = useZustandTaskStore((state) => state.timeline[state.pointer]);
  const rootCategories = getRootCategories(currentState);

  trackRender("categories-zone");

  return (
    <div data-zone="categories-zone">
      <span>{currentState.categories.length}</span>
      <span>{rootCategories.length}</span>
      <span>{currentState.selectedCategoryId ?? "all"}</span>
    </div>
  );
}

function ZustandListZone() {
  const currentState = useZustandTaskStore((state) => state.timeline[state.pointer]);
  const tasks = getVisibleTasks(currentState);

  trackRender("list-zone");

  return (
    <div data-zone="list-zone">
      <span>{tasks.length}</span>
      {tasks.map((task) => {
        trackRender(`list-item:${task.id}`);
        return (
          <span key={task.id}>
            {task.id}:{task.status}
          </span>
        );
      })}
    </div>
  );
}

function ZustandHistoryZone() {
  const timeline = useZustandTaskStore((state) => state.timeline);
  const pointer = useZustandTaskStore((state) => state.pointer);

  trackRender("history-zone");

  return (
    <div data-zone="history-zone">
      <span>{timeline.length}</span>
      <span>{pointer}</span>
      {timeline.map((snapshot, index) => {
        trackRender(`history-item:${index}`);
        return (
          <span key={index}>
            {index}:{snapshot.tasks.length}
          </span>
        );
      })}
    </div>
  );
}

function ZustandBenchmarkBoard() {
  return (
    <>
      <ZustandSummaryZone />
      <ZustandStatsZone />
      <ZustandFiltersZone />
      <ZustandCategoriesZone />
      <ZustandListZone />
      <ZustandHistoryZone />
    </>
  );
}

const MobxSummaryZone = observer(function MobxSummaryZone() {
  const currentState = mobxTaskStore.currentState;
  return (
    <SnapshotZone
      values={[
        currentState.search,
        currentState.filter,
        currentState.sort,
        currentState.selectedCategoryId,
      ]}
      zone="summary-zone"
    />
  );
});

const MobxStatsZone = observer(function MobxStatsZone() {
  const stats = getTaskStats(mobxTaskStore.currentState);
  return (
    <SnapshotZone
      values={[
        stats.total,
        stats.active,
        stats.completed,
        mobxTaskStore.currentState.operationsCount,
      ]}
      zone="stats-zone"
    />
  );
});

const MobxFiltersZone = observer(function MobxFiltersZone() {
  const currentState = mobxTaskStore.currentState;
  return (
    <SnapshotZone
      values={[currentState.search, currentState.filter, currentState.sort]}
      zone="filters-zone"
    />
  );
});

const MobxCategoriesZone = observer(function MobxCategoriesZone() {
  const currentState = mobxTaskStore.currentState;
  const rootCategories = getRootCategories(currentState);

  trackRender("categories-zone");

  return (
    <div data-zone="categories-zone">
      <span>{currentState.categories.length}</span>
      <span>{rootCategories.length}</span>
      <span>{currentState.selectedCategoryId ?? "all"}</span>
    </div>
  );
});

const MobxListZone = observer(function MobxListZone() {
  const tasks = getVisibleTasks(mobxTaskStore.currentState);

  trackRender("list-zone");

  return (
    <div data-zone="list-zone">
      <span>{tasks.length}</span>
      {tasks.map((task) => {
        trackRender(`list-item:${task.id}`);
        return (
          <span key={task.id}>
            {task.id}:{task.status}
          </span>
        );
      })}
    </div>
  );
});

const MobxHistoryZone = observer(function MobxHistoryZone() {
  const history = mobxTaskStore.history;
  const pointer = mobxTaskStore.pointer;

  trackRender("history-zone");

  return (
    <div data-zone="history-zone">
      <span>{history.length}</span>
      <span>{pointer}</span>
      {history.map((snapshot) => {
        trackRender(`history-item:${snapshot.index}`);
        return (
          <span key={snapshot.index}>
            {snapshot.index}:{snapshot.state.tasks.length}
          </span>
        );
      })}
    </div>
  );
});

function MobxBenchmarkBoard() {
  return (
    <>
      <MobxSummaryZone />
      <MobxStatsZone />
      <MobxFiltersZone />
      <MobxCategoriesZone />
      <MobxListZone />
      <MobxHistoryZone />
    </>
  );
}

const implementations = {
  kiks: {
    title: "kiks",
    render: () => <KiksBenchmarkBoard />,
    runScenario: (scenario) => {
      if (scenario === "addTask") {
        kiksBenchmarkApi.addTask();
        return;
      }
      if (scenario === "toggleTask") {
        kiksBenchmarkApi.toggleTask();
        return;
      }
      if (scenario === "setSearch") {
        kiksBenchmarkApi.setSearch();
        return;
      }
      kiksBenchmarkApi.undo();
    },
  },
  redux: {
    title: "Redux Toolkit",
    render: () => <ReduxBenchmarkBoard />,
    runScenario: (scenario) => {
      if (scenario === "addTask") {
        reduxBenchmarkApi.addTask();
        return;
      }
      if (scenario === "toggleTask") {
        reduxBenchmarkApi.toggleTask();
        return;
      }
      if (scenario === "setSearch") {
        reduxBenchmarkApi.setSearch();
        return;
      }
      reduxBenchmarkApi.undo();
    },
  },
  zustand: {
    title: "Zustand",
    render: () => <ZustandBenchmarkBoard />,
    runScenario: (scenario) => {
      if (scenario === "addTask") {
        zustandBenchmarkApi.addTask();
        return;
      }
      if (scenario === "toggleTask") {
        zustandBenchmarkApi.toggleTask();
        return;
      }
      if (scenario === "setSearch") {
        zustandBenchmarkApi.setSearch();
        return;
      }
      zustandBenchmarkApi.undo();
    },
  },
  mobx: {
    title: "MobX",
    render: () => <MobxBenchmarkBoard />,
    runScenario: (scenario) => {
      if (scenario === "addTask") {
        mobxBenchmarkApi.addTask();
        return;
      }
      if (scenario === "toggleTask") {
        mobxBenchmarkApi.toggleTask();
        return;
      }
      if (scenario === "setSearch") {
        mobxBenchmarkApi.setSearch();
        return;
      }
      mobxBenchmarkApi.undo();
    },
  },
} satisfies Record<
  ImplementationKey,
  {
    title: string;
    render: () => ReactElement;
    runScenario: (scenario: RerenderScenarioKey) => void;
  }
>;

function cloneRenderCounts(): Record<string, number> {
  return { ...(globalThis.__KIKS_RENDER_TRACKER__?.counts ?? {}) };
}

function collectChangedZones(
  previous: Record<string, number>,
  current: Record<string, number>,
): string[] {
  return Array.from(new Set([...Object.keys(previous), ...Object.keys(current)]))
    .filter((key) => (current[key] ?? 0) > (previous[key] ?? 0))
    .sort();
}

async function flushUpdates(): Promise<void> {
  await new Promise((resolve) => {
    window.setTimeout(resolve, 0);
  });
}

async function measureImplementation(key: ImplementationKey): Promise<RerenderBenchEntry> {
  globalThis.__KIKS_RENDER_TRACKER__ = { counts: {} };

  const container = window.document.createElement("div");
  window.document.body.appendChild(container);

  let commits = 0;
  const onRender: ProfilerOnRenderCallback = () => {
    commits += 1;
  };

  const root: Root = createRoot(container);

  await act(async () => {
    root.render(
      <Profiler id={`rerender-${key}`} onRender={onRender}>
        {implementations[key].render()}
      </Profiler>,
    );
    await flushUpdates();
  });

  let previousCommitCount = commits;
  let previousRenderCounts = cloneRenderCounts();
  const scenarioResults = {
    addTask: { commits: 0, changedComponents: 0, changedZones: [] },
    toggleTask: { commits: 0, changedComponents: 0, changedZones: [] },
    setSearch: { commits: 0, changedComponents: 0, changedZones: [] },
    undo: { commits: 0, changedComponents: 0, changedZones: [] },
  } as RerenderBenchEntry["scenarios"];

  for (const scenario of rerenderScenarioOrder) {
    await act(async () => {
      implementations[key].runScenario(scenario);
      await flushUpdates();
    });

    const currentCommitCount = commits;
    const currentRenderCounts = cloneRenderCounts();
    const changedZones = collectChangedZones(previousRenderCounts, currentRenderCounts);

    scenarioResults[scenario] = {
      commits: currentCommitCount - previousCommitCount,
      changedComponents: changedZones.length,
      changedZones,
    };

    previousCommitCount = currentCommitCount;
    previousRenderCounts = currentRenderCounts;
  }

  await act(async () => {
    root.unmount();
    await flushUpdates();
  });

  container.remove();

  const totalCommits = rerenderScenarioOrder.reduce(
    (total, scenario) => total + scenarioResults[scenario].commits,
    0,
  );
  const totalChangedComponents = rerenderScenarioOrder.reduce(
    (total, scenario) => total + scenarioResults[scenario].changedComponents,
    0,
  );

  return {
    totalCommits,
    totalChangedComponents,
    scenarios: scenarioResults,
  };
}

const rerenderEntries: Array<readonly [ImplementationKey, RerenderBenchEntry]> = [];

for (const key of implementationOrder) {
  rerenderEntries.push([key, await measureImplementation(key)] as const);
}

const rerenderResults = Object.fromEntries(rerenderEntries) as Record<
  ImplementationKey,
  RerenderBenchEntry
>;

updateBenchmarkResults((current) => ({
  ...current,
  rerender: {
    scenarios: [...rerenderScenarioOrder],
    results: rerenderResults,
  },
}));

console.log("Rerender benchmark");
for (const key of implementationOrder) {
  const result = rerenderResults[key];
  console.log(
    `${implementations[key].title.padEnd(14)} commits: ${String(result.totalCommits).padStart(3)} | changed components: ${String(result.totalChangedComponents).padStart(3)}`,
  );
}
