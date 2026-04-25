import { memo, type ReactNode, useMemo, useState } from "react";

import { trackRender } from "./renderTracker";
import type { Category, FilterMode, HistoryEntry, SortMode, Task, TaskStats } from "./taskModel";

function RenderZone({ zone, children }: { zone: string; children: ReactNode }) {
  trackRender(zone);
  return <>{children}</>;
}

function CategoryTree({
  allCategories,
  categories,
  activeId,
  onSelectCategory,
}: {
  allCategories: Category[];
  categories: Category[];
  activeId: string | null;
  onSelectCategory: (categoryId: string | null) => void;
}) {
  const renderNode = (category: Category) => {
    trackRender(`category-node:${category.id}`);
    const children = allCategories.filter((item) => item.parentId === category.id);

    return (
      <div className="tree-node" key={category.id}>
        <button
          className={activeId === category.id ? "tree-button is-active" : "tree-button"}
          onClick={() => onSelectCategory(category.id)}
          type="button"
        >
          <span>{category.title}</span>
          {children.length > 0 ? <small>{children.length}</small> : null}
        </button>

        {children.length > 0 ? (
          <div className="tree-children">{children.map((child) => renderNode(child))}</div>
        ) : null}
      </div>
    );
  };

  return <div className="category-tree">{categories.map((category) => renderNode(category))}</div>;
}

/**
 * Контракт между общим UI и конкретной реализацией state management.
 */
export interface TaskManagerController {
  libraryName: string;
  libraryDescription: string;
  tasks: Task[];
  allCategories: Category[];
  rootCategories: Category[];
  stats: TaskStats;
  selectedCategoryId: string | null;
  search: string;
  filter: FilterMode;
  sort: SortMode;
  operationsCount: number;
  history: ReadonlyArray<HistoryEntry>;
  historyIndex: number;
  canUndo: boolean;
  canRedo: boolean;
  addTask(input: { title: string; description: string; categoryId: string | null }): void;
  addCategory(input: { title: string; parentId: string | null }): void;
  toggleTask(id: string): void;
  deleteTask(id: string): void;
  setSearch(value: string): void;
  setFilter(value: FilterMode): void;
  setSort(value: SortMode): void;
  selectCategory(categoryId: string | null): void;
  undo(): void;
  redo(): void;
  timeTravel(index: number): void;
}

function formatFilter(value: FilterMode): string {
  switch (value) {
    case "active":
      return "Только активные";
    case "completed":
      return "Только завершенные";
    case "all":
    default:
      return "Все задачи";
  }
}

function formatSort(value: SortMode): string {
  switch (value) {
    case "created-asc":
      return "Сначала старые";
    case "title-asc":
      return "По названию";
    case "created-desc":
    default:
      return "Сначала новые";
  }
}

const HeroSection = memo(function HeroSection({
  libraryName,
  libraryDescription,
  filter,
  sort,
  selectedCategoryTitle,
  historyIndex,
  historyLength,
}: {
  libraryName: string;
  libraryDescription: string;
  filter: FilterMode;
  sort: SortMode;
  selectedCategoryTitle: string;
  historyIndex: number;
  historyLength: number;
}) {
  return (
    <RenderZone zone="hero">
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">{libraryName}</p>
          <h2>Менеджер задач со встроенным time-travel</h2>
          <p className="hero-text">{libraryDescription}</p>
        </div>

        <div className="hero-summary">
          <div className="summary-chip">
            <span>Фильтр</span>
            <strong>{formatFilter(filter)}</strong>
          </div>
          <div className="summary-chip">
            <span>Сортировка</span>
            <strong>{formatSort(sort)}</strong>
          </div>
          <div className="summary-chip">
            <span>Категория</span>
            <strong>{selectedCategoryTitle}</strong>
          </div>
          <div className="summary-chip">
            <span>История</span>
            <strong>
              {historyIndex + 1} / {historyLength}
            </strong>
          </div>
        </div>
      </section>
    </RenderZone>
  );
});

const StatsPanel = memo(function StatsPanel({
  stats,
  operationsCount,
}: {
  stats: TaskStats;
  operationsCount: number;
}) {
  return (
    <RenderZone zone="stats-panel">
      <article className="panel stats-panel">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Показатели</p>
            <h3>Сводка сценария</h3>
          </div>
          <span className="panel-note">Реальное состояние выбранной реализации</span>
        </div>

        <div className="stats-grid">
          <div>
            <span>Всего задач</span>
            <strong>{stats.total}</strong>
          </div>
          <div>
            <span>Активных</span>
            <strong>{stats.active}</strong>
          </div>
          <div>
            <span>Завершенных</span>
            <strong>{stats.completed}</strong>
          </div>
          <div>
            <span>Операций</span>
            <strong>{operationsCount}</strong>
          </div>
        </div>
      </article>
    </RenderZone>
  );
});

const ControlsPanel = memo(
  function ControlsPanel({
    search,
    filter,
    sort,
    setSearch,
    setFilter,
    setSort,
  }: {
    search: string;
    filter: FilterMode;
    sort: SortMode;
    setSearch: (value: string) => void;
    setFilter: (value: FilterMode) => void;
    setSort: (value: SortMode) => void;
  }) {
    return (
      <RenderZone zone="controls-panel">
        <article className="panel controls-panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Управление</p>
              <h3>Фильтры и навигация</h3>
            </div>
            <span className="panel-note">Все изменения попадают в историю</span>
          </div>

          <div className="form-grid">
            <label>
              <span>Поиск</span>
              <input
                data-bench="search-input"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Найти задачу или описание"
                type="search"
                value={search}
              />
            </label>

            <label>
              <span>Фильтр</span>
              <select
                onChange={(event) => setFilter(event.target.value as FilterMode)}
                value={filter}
              >
                <option value="all">Все</option>
                <option value="active">Активные</option>
                <option value="completed">Завершенные</option>
              </select>
            </label>

            <label>
              <span>Сортировка</span>
              <select onChange={(event) => setSort(event.target.value as SortMode)} value={sort}>
                <option value="created-desc">Сначала новые</option>
                <option value="created-asc">Сначала старые</option>
                <option value="title-asc">По названию</option>
              </select>
            </label>
          </div>
        </article>
      </RenderZone>
    );
  },
  (previous, next) =>
    previous.search === next.search &&
    previous.filter === next.filter &&
    previous.sort === next.sort,
);

const FormPanel = memo(
  function FormPanel({
    selectedCategoryId,
    addTask,
    addCategory,
  }: {
    selectedCategoryId: string | null;
    addTask: TaskManagerController["addTask"];
    addCategory: TaskManagerController["addCategory"];
  }) {
    const [taskTitle, setTaskTitle] = useState("");
    const [taskDescription, setTaskDescription] = useState("");
    const [categoryTitle, setCategoryTitle] = useState("");

    return (
      <RenderZone zone="form-panel">
        <article className="panel form-panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Редактирование</p>
              <h3>Новые сущности</h3>
            </div>
            <span className="panel-note">Данные сразу отражаются в сравнительном стенде</span>
          </div>

          <form
            className="stack"
            data-bench="task-form"
            onSubmit={(event) => {
              event.preventDefault();

              if (!taskTitle.trim()) {
                return;
              }

              addTask({
                title: taskTitle.trim(),
                description: taskDescription.trim(),
                categoryId: selectedCategoryId,
              });

              setTaskTitle("");
              setTaskDescription("");
            }}
          >
            <label>
              <span>Название задачи</span>
              <input
                data-bench="task-title-input"
                onChange={(event) => setTaskTitle(event.target.value)}
                placeholder="Например: Подготовить главу о benchmark"
                value={taskTitle}
              />
            </label>

            <label>
              <span>Описание</span>
              <textarea
                data-bench="task-description-input"
                onChange={(event) => setTaskDescription(event.target.value)}
                placeholder="Кратко опишите цель задачи"
                rows={4}
                value={taskDescription}
              />
            </label>

            <button className="primary-button" type="submit">
              Добавить задачу
            </button>
          </form>

          <div className="divider" />

          <form
            className="inline-form"
            onSubmit={(event) => {
              event.preventDefault();

              if (!categoryTitle.trim()) {
                return;
              }

              addCategory({
                title: categoryTitle.trim(),
                parentId: selectedCategoryId,
              });

              setCategoryTitle("");
            }}
          >
            <label className="inline-label">
              <span>Новая категория</span>
              <input
                onChange={(event) => setCategoryTitle(event.target.value)}
                placeholder="Например: Визуализация"
                value={categoryTitle}
              />
            </label>
            <button className="secondary-button" type="submit">
              Добавить
            </button>
          </form>
        </article>
      </RenderZone>
    );
  },
  (previous, next) => previous.selectedCategoryId === next.selectedCategoryId,
);

const CategoryPanel = memo(
  function CategoryPanel({
    allCategories,
    rootCategories,
    selectedCategoryId,
    selectCategory,
  }: {
    allCategories: Category[];
    rootCategories: Category[];
    selectedCategoryId: string | null;
    selectCategory: (categoryId: string | null) => void;
  }) {
    return (
      <RenderZone zone="category-panel">
        <article className="panel category-panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Иерархия</p>
              <h3>Категории</h3>
            </div>
            <span className="panel-note">{allCategories.length} всего</span>
          </div>

          <button
            className={selectedCategoryId === null ? "tree-button is-active" : "tree-button"}
            onClick={() => selectCategory(null)}
            type="button"
          >
            <span>Все категории</span>
          </button>

          <CategoryTree
            activeId={selectedCategoryId}
            allCategories={allCategories}
            categories={rootCategories}
            onSelectCategory={selectCategory}
          />
        </article>
      </RenderZone>
    );
  },
  (previous, next) =>
    previous.allCategories === next.allCategories &&
    previous.rootCategories === next.rootCategories &&
    previous.selectedCategoryId === next.selectedCategoryId,
);

const ListPanel = memo(
  function ListPanel({
    tasks,
    allCategories,
    toggleTask,
    deleteTask,
  }: {
    tasks: Task[];
    allCategories: Category[];
    toggleTask: (id: string) => void;
    deleteTask: (id: string) => void;
  }) {
    return (
      <RenderZone zone="list-panel">
        <article className="panel list-panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Результат</p>
              <h3>Список задач</h3>
            </div>
            <span className="panel-note">{tasks.length} показано после фильтрации</span>
          </div>

          <div className="task-list">
            {tasks.map((task) => {
              trackRender(`task-card:${task.id}`);

              return (
                <div className="task-card" key={task.id}>
                  <div className="task-head">
                    <div>
                      <h4>{task.title}</h4>
                      <p>{task.description || "Описание не задано"}</p>
                    </div>
                    <span className={task.status === "completed" ? "badge is-done" : "badge"}>
                      {task.status === "completed" ? "Выполнено" : "В работе"}
                    </span>
                  </div>

                  <div className="task-meta">
                    <span>
                      Категория:{" "}
                      <strong>
                        {allCategories.find((category) => category.id === task.categoryId)?.title ??
                          "Без категории"}
                      </strong>
                    </span>
                    <span>Идентификатор: {task.id}</span>
                  </div>

                  <div className="task-actions">
                    <button
                      className="secondary-button"
                      data-bench="toggle-task-button"
                      onClick={() => toggleTask(task.id)}
                      type="button"
                    >
                      Переключить статус
                    </button>
                    <button
                      className="ghost-button"
                      onClick={() => deleteTask(task.id)}
                      type="button"
                    >
                      Удалить
                    </button>
                  </div>
                </div>
              );
            })}

            {tasks.length === 0 ? (
              <div className="empty-state">
                <strong>По текущим фильтрам задач не найдено.</strong>
                <p>Попробуйте изменить категорию, поиск или режим фильтрации.</p>
              </div>
            ) : null}
          </div>
        </article>
      </RenderZone>
    );
  },
  (previous, next) =>
    previous.tasks === next.tasks && previous.allCategories === next.allCategories,
);

const HistoryPanel = memo(
  function HistoryPanel({
    history,
    historyIndex,
    canUndo,
    canRedo,
    undo,
    redo,
    timeTravel,
  }: {
    history: ReadonlyArray<HistoryEntry>;
    historyIndex: number;
    canUndo: boolean;
    canRedo: boolean;
    undo: () => void;
    redo: () => void;
    timeTravel: (index: number) => void;
  }) {
    const historyProgress =
      history.length > 1 ? Math.round((historyIndex / (history.length - 1)) * 100) : 0;

    return (
      <RenderZone zone="history-panel">
        <section className="panel history-panel">
          <div className="history-top">
            <div className="panel-head">
              <div>
                <p className="eyebrow">Time-travel</p>
                <h3>История изменений</h3>
              </div>
              <span className="panel-note">
                Снимок {historyIndex + 1} из {history.length}
              </span>
            </div>

            <div className="history-actions">
              <button
                className="secondary-button"
                data-bench="undo-button"
                disabled={!canUndo}
                onClick={undo}
                type="button"
              >
                Undo
              </button>
              <button className="secondary-button" disabled={!canRedo} onClick={redo} type="button">
                Redo
              </button>
            </div>
          </div>

          <div aria-hidden="true" className="history-progress">
            <div className="history-progress-fill" style={{ width: `${historyProgress}%` }} />
          </div>

          <div className="history-list">
            {history.map((snapshot) => {
              trackRender(`history-item:${snapshot.index}`);

              return (
                <button
                  className={
                    snapshot.index === historyIndex ? "history-item is-active" : "history-item"
                  }
                  key={snapshot.index}
                  onClick={() => timeTravel(snapshot.index)}
                  type="button"
                >
                  <div>
                    <span>Снимок {snapshot.index}</span>
                    <small>
                      {snapshot.state.tasks.length} задач, {snapshot.state.categories.length}{" "}
                      категорий
                    </small>
                  </div>
                  <strong>{snapshot.index === historyIndex ? "Текущий" : "Открыть"}</strong>
                </button>
              );
            })}
          </div>
        </section>
      </RenderZone>
    );
  },
  (previous, next) =>
    previous.history === next.history &&
    previous.historyIndex === next.historyIndex &&
    previous.canUndo === next.canUndo &&
    previous.canRedo === next.canRedo,
);

/**
 * Единый UI для сравнения реализаций на разных библиотеках управления состоянием.
 */
export function TaskManagerView({ controller }: { controller: TaskManagerController }) {
  trackRender("task-manager-view");

  const selectedCategoryTitle = useMemo(() => {
    if (!controller.selectedCategoryId) {
      return "Все категории";
    }

    return (
      controller.allCategories.find((category) => category.id === controller.selectedCategoryId)
        ?.title ?? "Выбранная категория"
    );
  }, [controller.allCategories, controller.selectedCategoryId]);

  return (
    <main className="page">
      <HeroSection
        filter={controller.filter}
        historyIndex={controller.historyIndex}
        historyLength={controller.history.length}
        libraryDescription={controller.libraryDescription}
        libraryName={controller.libraryName}
        selectedCategoryTitle={selectedCategoryTitle}
        sort={controller.sort}
      />

      <section className="dashboard">
        <StatsPanel operationsCount={controller.operationsCount} stats={controller.stats} />
        <ControlsPanel
          filter={controller.filter}
          search={controller.search}
          setFilter={controller.setFilter}
          setSearch={controller.setSearch}
          setSort={controller.setSort}
          sort={controller.sort}
        />
      </section>

      <section className="workspace">
        <FormPanel
          addCategory={controller.addCategory}
          addTask={controller.addTask}
          selectedCategoryId={controller.selectedCategoryId}
        />

        <CategoryPanel
          allCategories={controller.allCategories}
          rootCategories={controller.rootCategories}
          selectCategory={controller.selectCategory}
          selectedCategoryId={controller.selectedCategoryId}
        />

        <ListPanel
          allCategories={controller.allCategories}
          deleteTask={controller.deleteTask}
          tasks={controller.tasks}
          toggleTask={controller.toggleTask}
        />
      </section>

      <HistoryPanel
        canRedo={controller.canRedo}
        canUndo={controller.canUndo}
        history={controller.history}
        historyIndex={controller.historyIndex}
        redo={controller.redo}
        timeTravel={controller.timeTravel}
        undo={controller.undo}
      />
    </main>
  );
}
