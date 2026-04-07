import { useKiks } from "kiks/react";

import { TaskManagerView } from "../../shared/TaskManagerView";
import { taskActions } from "./actions";
import {
  selectRootCategories,
  selectTaskStats,
  selectVisibleTasks,
} from "./selectors";
import { taskStore } from "./store";

function KiksTaskManagerInner() {
  return (
    <TaskManagerView
      controller={{
        libraryName: "kiks",
        libraryDescription:
          "Одно приложение показывает ключевые возможности библиотеки: CRUD, фильтрацию, вложенные категории, счётчик операций и переходы по истории.",
        tasks: useKiks(taskStore, selectVisibleTasks),
        allCategories: useKiks(taskStore, (state) => state.categories),
        rootCategories: useKiks(taskStore, selectRootCategories),
        stats: useKiks(taskStore, selectTaskStats),
        selectedCategoryId: useKiks(taskStore, (state) => state.selectedCategoryId),
        search: useKiks(taskStore, (state) => state.search),
        filter: useKiks(taskStore, (state) => state.filter),
        sort: useKiks(taskStore, (state) => state.sort),
        operationsCount: useKiks(taskStore, (state) => state.operationsCount),
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
