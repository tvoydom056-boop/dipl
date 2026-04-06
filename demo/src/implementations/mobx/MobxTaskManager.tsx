import { makeAutoObservable } from "mobx";
import { observer } from "mobx-react-lite";

import { pushHistory } from "../../shared/historyHelpers";
import { TaskManagerView } from "../../shared/TaskManagerView";
import {
  createInitialTaskState,
  getRootCategories,
  getTaskStats,
  getVisibleTasks,
  type FilterMode,
  type HistoryEntry,
  type SortMode,
  type TaskState,
} from "../../shared/taskModel";

class MobxTaskStore {
  public timeline: TaskState[] = [createInitialTaskState()];
  public pointer = 0;

  public constructor() {
    makeAutoObservable(this);
  }

  public get currentState(): TaskState {
    return this.timeline[this.pointer];
  }

  public get history(): HistoryEntry[] {
    return this.timeline.map((entry, index) => ({ index, state: entry }));
  }

  public get canUndo(): boolean {
    return this.pointer > 0;
  }

  public get canRedo(): boolean {
    return this.pointer < this.timeline.length - 1;
  }

  private commit(updater: (current: TaskState) => TaskState): void {
    Object.assign(
      this,
      pushHistory(this.timeline, this.pointer, updater(this.currentState)),
    );
  }

  public addTask(input: { title: string; description: string; categoryId: string | null }): void {
    const next = {
      ...this.currentState,
      tasks: [
        {
          id: `task-${Math.random().toString(36).slice(2, 9)}`,
          title: input.title,
          description: input.description,
          categoryId: input.categoryId,
          status: "active" as const,
          createdAt: Date.now(),
        },
        ...this.currentState.tasks,
      ],
      operationsCount: this.currentState.operationsCount + 1,
    };
    Object.assign(this, pushHistory(this.timeline, this.pointer, next));
  }

  public addCategory(input: { title: string; parentId: string | null }): void {
    const next = {
      ...this.currentState,
      categories: [
        ...this.currentState.categories,
        {
          id: `category-${Math.random().toString(36).slice(2, 9)}`,
          title: input.title,
          parentId: input.parentId,
        },
      ],
      operationsCount: this.currentState.operationsCount + 1,
    };
    Object.assign(this, pushHistory(this.timeline, this.pointer, next));
  }

  public toggleTask(id: string): void {
    const next = {
      ...this.currentState,
      tasks: this.currentState.tasks.map((task) =>
        task.id === id
          ? {
              ...task,
              status: task.status === "completed" ? ("active" as const) : ("completed" as const),
            }
          : task,
      ),
      operationsCount: this.currentState.operationsCount + 1,
    };
    Object.assign(this, pushHistory(this.timeline, this.pointer, next));
  }

  public deleteTask(id: string): void {
    const next = {
      ...this.currentState,
      tasks: this.currentState.tasks.filter((task) => task.id !== id),
      operationsCount: this.currentState.operationsCount + 1,
    };
    Object.assign(this, pushHistory(this.timeline, this.pointer, next));
  }

  public setSearch(value: string): void {
    this.commit((current) => ({
      ...current,
      search: value,
    }));
  }

  public setFilter(value: FilterMode): void {
    this.commit((current) => ({
      ...current,
      filter: value,
    }));
  }

  public setSort(value: SortMode): void {
    this.commit((current) => ({
      ...current,
      sort: value,
    }));
  }

  public selectCategory(categoryId: string | null): void {
    this.commit((current) => ({
      ...current,
      selectedCategoryId: categoryId,
    }));
  }

  public undo(): void {
    if (this.canUndo) {
      this.pointer -= 1;
    }
  }

  public redo(): void {
    if (this.canRedo) {
      this.pointer += 1;
    }
  }

  public timeTravel(index: number): void {
    if (index >= 0 && index < this.timeline.length) {
      this.pointer = index;
    }
  }
}

const mobxTaskStore = new MobxTaskStore();

export const MobxTaskManager = observer(function MobxTaskManager() {
  const currentState = mobxTaskStore.currentState;

  return (
    <TaskManagerView
      controller={{
        libraryName: "mobx",
        libraryDescription:
          "Идентичный менеджер задач, собранный на реактивной модели MobX с observable-состоянием и тем же time-travel интерфейсом.",
        tasks: getVisibleTasks(currentState),
        allCategories: currentState.categories,
        rootCategories: getRootCategories(currentState),
        stats: getTaskStats(currentState),
        selectedCategoryId: currentState.selectedCategoryId,
        search: currentState.search,
        filter: currentState.filter,
        sort: currentState.sort,
        operationsCount: currentState.operationsCount,
        history: mobxTaskStore.history,
        historyIndex: mobxTaskStore.pointer,
        canUndo: mobxTaskStore.canUndo,
        canRedo: mobxTaskStore.canRedo,
        addTask: (input) => mobxTaskStore.addTask(input),
        addCategory: (input) => mobxTaskStore.addCategory(input),
        toggleTask: (id) => mobxTaskStore.toggleTask(id),
        deleteTask: (id) => mobxTaskStore.deleteTask(id),
        setSearch: (value) => mobxTaskStore.setSearch(value),
        setFilter: (value) => mobxTaskStore.setFilter(value),
        setSort: (value) => mobxTaskStore.setSort(value),
        selectCategory: (categoryId) => mobxTaskStore.selectCategory(categoryId),
        undo: () => mobxTaskStore.undo(),
        redo: () => mobxTaskStore.redo(),
        timeTravel: (index) => mobxTaskStore.timeTravel(index),
      }}
    />
  );
});
