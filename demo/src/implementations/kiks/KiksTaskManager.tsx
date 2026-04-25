import { TaskManagerView } from "../../shared/TaskManagerView";
import { taskActions } from "./actions";
import { selectRootCategories, selectTaskStats, selectVisibleTasks } from "./selectors";
import { taskStore } from "./store";
import { useKiksLocal } from "./useKiksLocal";

export const kiksBenchmarkApi = {
  addTask() {
    taskStore.dispatch(
      taskActions.addTask({
        id: `task-bench-${Math.random().toString(36).slice(2, 9)}`,
        title: "Benchmark task",
        description: "Generated during rerender benchmark",
        status: "active",
        categoryId: null,
        createdAt: Date.now(),
      }),
    );
  },
  toggleTask() {
    const firstTaskId = taskStore.getState().tasks[0]?.id;
    if (firstTaskId) {
      taskStore.dispatch(taskActions.toggleTask(firstTaskId));
    }
  },
  setSearch() {
    taskStore.dispatch(taskActions.setSearch("ui"));
  },
  undo() {
    taskStore.undo();
  },
};

function KiksTaskManagerInner() {
  return (
    <TaskManagerView
      controller={{
        libraryName: "kiks",
        libraryDescription:
          "Одно приложение показывает ключевые возможности библиотеки: CRUD, фильтрацию, вложенные категории, счетчик операций и переходы по истории.",
        tasks: useKiksLocal(taskStore, selectVisibleTasks),
        allCategories: useKiksLocal(taskStore, (state) => state.categories),
        rootCategories: useKiksLocal(taskStore, selectRootCategories),
        stats: useKiksLocal(taskStore, selectTaskStats),
        selectedCategoryId: useKiksLocal(taskStore, (state) => state.selectedCategoryId),
        search: useKiksLocal(taskStore, (state) => state.search),
        filter: useKiksLocal(taskStore, (state) => state.filter),
        sort: useKiksLocal(taskStore, (state) => state.sort),
        operationsCount: useKiksLocal(taskStore, (state) => state.operationsCount),
        history: taskStore.getHistory().getSnapshots(),
        historyIndex: taskStore.getHistory().getCurrentIndex(),
        canUndo: taskStore.canUndo(),
        canRedo: taskStore.canRedo(),
        addTask: ({ title, description, categoryId }) => {
          taskStore.dispatch(
            taskActions.addTask({
              id: `task-${Math.random().toString(36).slice(2, 9)}`,
              title,
              description,
              status: "active",
              categoryId,
              createdAt: Date.now(),
            }),
          );
        },
        addCategory: ({ title, parentId }) => {
          taskStore.dispatch(
            taskActions.addCategory({
              id: `category-${Math.random().toString(36).slice(2, 9)}`,
              title,
              parentId,
            }),
          );
        },
        toggleTask: (id) => taskStore.dispatch(taskActions.toggleTask(id)),
        deleteTask: (id) => taskStore.dispatch(taskActions.deleteTask(id)),
        setSearch: (value) => taskStore.dispatch(taskActions.setSearch(value)),
        setFilter: (value) => taskStore.dispatch(taskActions.setFilter(value)),
        setSort: (value) => taskStore.dispatch(taskActions.setSort(value)),
        selectCategory: (categoryId) => taskStore.dispatch(taskActions.selectCategory(categoryId)),
        undo: () => {
          taskStore.undo();
        },
        redo: () => {
          taskStore.redo();
        },
        timeTravel: (index) => {
          taskStore.timeTravel(index);
        },
      }}
    />
  );
}

export function KiksTaskManager() {
  return <KiksTaskManagerInner />;
}
