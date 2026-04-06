import { useMemo, useState } from "react";

import type {
  Category,
  FilterMode,
  HistoryEntry,
  SortMode,
  Task,
  TaskStats,
} from "./taskModel";

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
          <div className="tree-children">
            {children.map((child) => renderNode(child))}
          </div>
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
  addTask(input: {
    title: string;
    description: string;
    categoryId: string | null;
  }): void;
  addCategory(input: {
    title: string;
    parentId: string | null;
  }): void;
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
      return "Только завершённые";
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

/**
 * Единый UI для сравнения реализаций на разных библиотеках управления состоянием.
 */
export function TaskManagerView({
  controller,
}: {
  controller: TaskManagerController;
}) {
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [categoryTitle, setCategoryTitle] = useState("");

  const selectedCategoryTitle = useMemo(() => {
    if (!controller.selectedCategoryId) {
      return "Все категории";
    }

    return (
      controller.allCategories.find((category) => category.id === controller.selectedCategoryId)?.title ??
      "Выбранная категория"
    );
  }, [controller.allCategories, controller.selectedCategoryId]);

  const historyProgress = controller.history.length > 1
    ? Math.round((controller.historyIndex / (controller.history.length - 1)) * 100)
    : 0;

  return (
    <main className="page">
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">{controller.libraryName}</p>
          <h2>Менеджер задач с встроенным time-travel</h2>
          <p className="hero-text">{controller.libraryDescription}</p>
        </div>

        <div className="hero-summary">
          <div className="summary-chip">
            <span>Фильтр</span>
            <strong>{formatFilter(controller.filter)}</strong>
          </div>
          <div className="summary-chip">
            <span>Сортировка</span>
            <strong>{formatSort(controller.sort)}</strong>
          </div>
          <div className="summary-chip">
            <span>Категория</span>
            <strong>{selectedCategoryTitle}</strong>
          </div>
          <div className="summary-chip">
            <span>История</span>
            <strong>
              {controller.historyIndex + 1} / {controller.history.length}
            </strong>
          </div>
        </div>
      </section>

      <section className="dashboard">
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
              <strong>{controller.stats.total}</strong>
            </div>
            <div>
              <span>Активных</span>
              <strong>{controller.stats.active}</strong>
            </div>
            <div>
              <span>Завершённых</span>
              <strong>{controller.stats.completed}</strong>
            </div>
            <div>
              <span>Операций</span>
              <strong>{controller.operationsCount}</strong>
            </div>
          </div>
        </article>

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
                onChange={(event) => controller.setSearch(event.target.value)}
                placeholder="Найти задачу или описание"
                type="search"
                value={controller.search}
              />
            </label>

            <label>
              <span>Фильтр</span>
              <select
                onChange={(event) => controller.setFilter(event.target.value as FilterMode)}
                value={controller.filter}
              >
                <option value="all">Все</option>
                <option value="active">Активные</option>
                <option value="completed">Завершённые</option>
              </select>
            </label>

            <label>
              <span>Сортировка</span>
              <select
                onChange={(event) => controller.setSort(event.target.value as SortMode)}
                value={controller.sort}
              >
                <option value="created-desc">Сначала новые</option>
                <option value="created-asc">Сначала старые</option>
                <option value="title-asc">По названию</option>
              </select>
            </label>
          </div>
        </article>
      </section>

      <section className="workspace">
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
            onSubmit={(event) => {
              event.preventDefault();

              if (!taskTitle.trim()) {
                return;
              }

              controller.addTask({
                title: taskTitle.trim(),
                description: taskDescription.trim(),
                categoryId: controller.selectedCategoryId,
              });

              setTaskTitle("");
              setTaskDescription("");
            }}
          >
            <label>
              <span>Название задачи</span>
              <input
                onChange={(event) => setTaskTitle(event.target.value)}
                placeholder="Например: Подготовить главу о benchmark"
                value={taskTitle}
              />
            </label>

            <label>
              <span>Описание</span>
              <textarea
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

              controller.addCategory({
                title: categoryTitle.trim(),
                parentId: controller.selectedCategoryId,
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

        <article className="panel category-panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Иерархия</p>
              <h3>Категории</h3>
            </div>
            <span className="panel-note">{controller.allCategories.length} всего</span>
          </div>

          <button
            className={controller.selectedCategoryId === null ? "tree-button is-active" : "tree-button"}
            onClick={() => controller.selectCategory(null)}
            type="button"
          >
            <span>Все категории</span>
          </button>

          <CategoryTree
            activeId={controller.selectedCategoryId}
            allCategories={controller.allCategories}
            categories={controller.rootCategories}
            onSelectCategory={controller.selectCategory}
          />
        </article>

        <article className="panel list-panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Результат</p>
              <h3>Список задач</h3>
            </div>
            <span className="panel-note">{controller.tasks.length} показано после фильтрации</span>
          </div>

          <div className="task-list">
            {controller.tasks.map((task) => (
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
                      {controller.allCategories.find((category) => category.id === task.categoryId)?.title ??
                        "Без категории"}
                    </strong>
                  </span>
                  <span>Идентификатор: {task.id}</span>
                </div>

                <div className="task-actions">
                  <button
                    className="secondary-button"
                    onClick={() => controller.toggleTask(task.id)}
                    type="button"
                  >
                    Переключить статус
                  </button>
                  <button
                    className="ghost-button"
                    onClick={() => controller.deleteTask(task.id)}
                    type="button"
                  >
                    Удалить
                  </button>
                </div>
              </div>
            ))}

            {controller.tasks.length === 0 ? (
              <div className="empty-state">
                <strong>По текущим фильтрам задач не найдено.</strong>
                <p>Попробуйте изменить категорию, поиск или режим фильтрации.</p>
              </div>
            ) : null}
          </div>
        </article>
      </section>

      <section className="panel history-panel">
        <div className="history-top">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Time-travel</p>
              <h3>История изменений</h3>
            </div>
            <span className="panel-note">
              Снимок {controller.historyIndex + 1} из {controller.history.length}
            </span>
          </div>

          <div className="history-actions">
            <button
              className="secondary-button"
              disabled={!controller.canUndo}
              onClick={controller.undo}
              type="button"
            >
              Undo
            </button>
            <button
              className="secondary-button"
              disabled={!controller.canRedo}
              onClick={controller.redo}
              type="button"
            >
              Redo
            </button>
          </div>
        </div>

        <div aria-hidden="true" className="history-progress">
          <div className="history-progress-fill" style={{ width: `${historyProgress}%` }} />
        </div>

        <div className="history-list">
          {controller.history.map((snapshot) => (
            <button
              className={snapshot.index === controller.historyIndex ? "history-item is-active" : "history-item"}
              key={snapshot.index}
              onClick={() => controller.timeTravel(snapshot.index)}
              type="button"
            >
              <div>
                <span>Снимок {snapshot.index}</span>
                <small>
                  {snapshot.state.tasks.length} задач, {snapshot.state.categories.length} категорий
                </small>
              </div>
              <strong>{snapshot.index === controller.historyIndex ? "Текущий" : "Открыть"}</strong>
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}
