import { type ReactElement, useState } from "react";

import { KiksTaskManager } from "./implementations/kiks/KiksTaskManager";
import { MobxTaskManager } from "./implementations/mobx/MobxTaskManager";
import { ReduxTaskManager } from "./implementations/redux/ReduxTaskManager";
import { ZustandTaskManager } from "./implementations/zustand/ZustandTaskManager";
import { ComparisonDashboard } from "./shared/ComparisonDashboard";

type ImplementationKey = "kiks" | "redux" | "zustand" | "mobx";

interface ImplementationInfo {
  title: string;
  subtitle: string;
  highlight: string;
  accentClass: string;
  component: ReactElement;
}

const implementations = {
  kiks: {
    title: "kiks",
    subtitle: "Разрабатываемая библиотека",
    highlight: "Встроенный time-travel и строгая типизация",
    accentClass: "is-kiks",
    component: <KiksTaskManager />,
  },
  redux: {
    title: "Redux Toolkit",
    subtitle: "Стандарт индустрии",
    highlight: "Предсказуемый reducer-flow и развитая экосистема",
    accentClass: "is-redux",
    component: <ReduxTaskManager />,
  },
  zustand: {
    title: "Zustand",
    subtitle: "Минималистичный store-подход",
    highlight: "Компактное API и легкая интеграция",
    accentClass: "is-zustand",
    component: <ZustandTaskManager />,
  },
  mobx: {
    title: "MobX",
    subtitle: "Реактивная модель",
    highlight: "Observable-состояние и реактивные обновления",
    accentClass: "is-mobx",
    component: <MobxTaskManager />,
  },
} satisfies Record<ImplementationKey, ImplementationInfo>;

const comparisonFacts = [
  {
    label: "Тема",
    value: "Разработка библиотеки управления состоянием для React-приложений",
  },
  {
    label: "Сценарий",
    value: "Единый менеджер задач на 4 реализациях",
  },
  {
    label: "Метрики",
    value: "dispatch, bundle size, rerender, boilerplate",
  },
];

const quickNavigation = [
  { href: "#overview", label: "Обзор" },
  { href: "#metrics", label: "Метрики" },
  { href: "#library-size", label: "Размер kiks" },
  { href: "#comparison-dashboard", label: "Графики" },
  { href: "#architecture", label: "Архитектура" },
  { href: "#live-demo", label: "Демо" },
];

const librarySizeFacts = [
  { label: "kiks runtime package", raw: "4.30 kB", gzip: "1.99 kB", note: "production runtime библиотеки" },
  { label: "Целевая граница", raw: "до 6 kB", gzip: "до 3 kB", note: "требование дипломного проекта" },
];

const architectureSteps = [
  {
    title: "Action",
    description: "Типизированное действие, описывающее намерение изменить состояние.",
  },
  {
    title: "Store",
    description: "Центральное хранилище, управляющее dispatch, подписками и публичным API.",
  },
  {
    title: "Reducer",
    description: "Преобразует текущее состояние в новое на основе экшена.",
  },
  {
    title: "History",
    description: "Хранит timeline состояний и обеспечивает undo, redo и timeTravel.",
  },
  {
    title: "Selector",
    description: "Вычисляет производные значения и мемоизирует результат.",
  },
  {
    title: "React Layer",
    description: "Provider и useKiks подключают store к интерфейсу React.",
  },
];

const benchmarkRows = [
  {
    library: "kiks",
    dispatch: "251 052.92",
    bundle: "66.58 kB",
    rerender: "Высокий контроль",
    timeTravel: "Встроен",
    selectors: "Встроены",
  },
  {
    library: "Redux Toolkit",
    dispatch: "8 016.85",
    bundle: "71.36 kB",
    rerender: "Средний контроль",
    timeTravel: "Внешний инструмент",
    selectors: "Частично",
  },
  {
    library: "Zustand",
    dispatch: "421 910.49",
    bundle: "63.08 kB",
    rerender: "Высокий контроль",
    timeTravel: "Кастомно",
    selectors: "Частично",
  },
  {
    library: "MobX",
    dispatch: "12 623.31",
    bundle: "80.06 kB",
    rerender: "Средний контроль",
    timeTravel: "Кастомно",
    selectors: "Нет",
  },
];

const rerenderScenarios = ["add task", "toggle task", "set search", "undo"];
const rerenderResultRows = [
  { library: "kiks", commits: "—", changedComponents: "—", note: "Заполнить после Profiler" },
  { library: "Redux Toolkit", commits: "—", changedComponents: "—", note: "Заполнить после Profiler" },
  { library: "Zustand", commits: "—", changedComponents: "—", note: "Заполнить после Profiler" },
  { library: "MobX", commits: "—", changedComponents: "—", note: "Заполнить после Profiler" },
];

export function App() {
  const [activeImplementation, setActiveImplementation] = useState<ImplementationKey>("kiks");
  const [isPresentationMode, setIsPresentationMode] = useState(false);
  const activeInfo = implementations[activeImplementation];

  return (
    <div className={isPresentationMode ? "app-shell is-presentation" : "app-shell"}>
      <header className="app-header">
        <nav aria-label="Быстрая навигация по стенду" className="project-nav">
          {quickNavigation.map((item) => (
            <a className="project-nav-link" href={item.href} key={item.href}>
              {item.label}
            </a>
          ))}
        </nav>

        <div className="masthead" id="overview">
          <div className="masthead-copy">
            <p className="eyebrow">State Management Lab</p>
            <h1>Стенд сравнительного анализа для магистерского диплома</h1>
            <p className="masthead-text">
              Один и тот же пользовательский сценарий показывает, как ведут себя
              <strong> kiks</strong>, <strong>Redux Toolkit</strong>, <strong>Zustand</strong> и
              <strong> MobX</strong> в одинаковой UI-обвязке.
            </p>
          </div>

          <div className={`focus-card ${activeInfo.accentClass}`}>
            <span className="focus-chip">Сейчас на экране</span>
            <strong>{activeInfo.title}</strong>
            <p>{activeInfo.subtitle}</p>
            <small>{activeInfo.highlight}</small>
            <button
              className="presentation-toggle"
              onClick={() => setIsPresentationMode((value) => !value)}
              type="button"
            >
              {isPresentationMode ? "Обычный режим" : "Presentation Mode"}
            </button>
          </div>
        </div>

        <div className="facts-grid">
          {comparisonFacts.map((fact) => (
            <article className="fact-card" key={fact.label}>
              <span>{fact.label}</span>
              <strong>{fact.value}</strong>
            </article>
          ))}
        </div>

        <nav aria-label="Выбор реализации" className="switcher">
          {Object.entries(implementations).map(([key, implementation]) => (
            <button
              className={[
                "switcher-button",
                implementation.accentClass,
                activeImplementation === key ? "is-active" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              key={key}
              onClick={() => setActiveImplementation(key as ImplementationKey)}
              type="button"
            >
              <span>{implementation.title}</span>
              <small>{implementation.subtitle}</small>
            </button>
          ))}
        </nav>

        <section className="comparison-showcase" id="metrics">
          <article className="comparison-panel">
            <div className="panel-head">
              <div>
                <p className="eyebrow">Сравнение</p>
                <h2>Ключевые метрики стенда</h2>
              </div>
              <span className="panel-note">Актуальные значения из benchmark-сценария</span>
            </div>

            <div className="comparison-table comparison-table--extended">
              <div className="comparison-row comparison-row--head comparison-row--extended">
                <span>Библиотека</span>
                <span>Dispatch ops/sec</span>
                <span>Bundle gzip</span>
                <span>Re-render</span>
                <span>Time-travel</span>
                <span>Селекторы</span>
              </div>

              {benchmarkRows.map((row) => (
                <div
                  className={[
                    "comparison-row",
                    "comparison-row--extended",
                    activeInfo.title === row.library ? "is-active" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  key={row.library}
                >
                  <strong>{row.library}</strong>
                  <span>{row.dispatch}</span>
                  <span>{row.bundle}</span>
                  <span>{row.rerender}</span>
                  <span>{row.timeTravel}</span>
                  <span>{row.selectors}</span>
                </div>
              ))}
            </div>
          </article>

          <article className="comparison-panel comparison-panel--narrative">
            <p className="eyebrow">Интерпретация</p>
            <h2>Что важно показать на защите</h2>
            <ul className="narrative-list">
              <li>
                <strong>`kiks`</strong> делает акцент на встроенных возможностях: история,
                типизация, селекторы и собственный pipeline middleware.
              </li>
              <li>
                <strong>Zustand</strong> демонстрирует минималистичный подход и высокую скорость
                в текущем benchmark-сценарии.
              </li>
              <li>
                <strong>Redux Toolkit</strong> хорошо показывает стандартизированную архитектуру,
                но требует большей инфраструктуры.
              </li>
              <li>
                <strong>MobX</strong> иллюстрирует реактивную модель и отличается по философии
                обновления состояния.
              </li>
            </ul>
          </article>

          <article className="comparison-panel comparison-panel--rerender">
            <div className="panel-head">
              <div>
                <p className="eyebrow">React Metric</p>
                <h2>Количество re-render</h2>
              </div>
              <span className="panel-note">Измеряется через React DevTools Profiler</span>
            </div>

            <div className="rerender-method">
              <div className="rerender-card">
                <strong>Что показывает метрика</strong>
                <p>
                  Насколько библиотека эффективно работает с UI и сколько компонентов
                  перерисовывается при типовом действии, а не только как быстро проходит `dispatch`.
                </p>
              </div>

              <div className="rerender-card">
                <strong>Как измеряется</strong>
                <p>
                  Для каждой библиотеки запускается один и тот же сценарий в React DevTools
                  Profiler, после чего фиксируется число committed renders и изменившихся
                  компонентов.
                </p>
              </div>

              <div className="rerender-card">
                <strong>Сценарии</strong>
                <ul className="rerender-scenarios">
                  {rerenderScenarios.map((scenario) => (
                    <li key={scenario}>{scenario}</li>
                  ))}
                </ul>
              </div>
            </div>

            <p className="rerender-note">
              В общей таблице выше сейчас показана архитектурная сравнительная оценка контроля
              re-render. Точные численные значения фиксируются отдельно через React DevTools
              Profiler и вносятся в шаблон результатов ниже.
            </p>

            <div className="rerender-results">
              <div className="rerender-results-head">
                <strong>Шаблон для фиксации результатов Profiler</strong>
                <span>После ручного замера сюда можно внести commits и число изменившихся компонентов</span>
              </div>

              <div className="rerender-results-table">
                <div className="rerender-results-row rerender-results-row--head">
                  <span>Библиотека</span>
                  <span>Commits</span>
                  <span>Changed components</span>
                  <span>Статус</span>
                </div>

                {rerenderResultRows.map((row) => (
                  <div className="rerender-results-row" key={row.library}>
                    <strong>{row.library}</strong>
                    <span>{row.commits}</span>
                    <span>{row.changedComponents}</span>
                    <span>{row.note}</span>
                  </div>
                ))}
              </div>
            </div>
          </article>
        </section>

        <section className="library-size-panel" id="library-size">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Размер Библиотеки</p>
              <h2>Чистый runtime `kiks` как npm-пакета</h2>
            </div>
            <span className="panel-note">
              Отдельная метрика библиотеки, а не всего demo-приложения
            </span>
          </div>

          <div className="library-size-grid">
            {librarySizeFacts.map((fact) => (
              <article className="library-size-card" key={fact.label}>
                <span>{fact.label}</span>
                <strong>{fact.gzip}</strong>
                <small>gzip</small>
                <div className="library-size-meta">
                  <b>{fact.raw}</b>
                  <em>{fact.note}</em>
                </div>
              </article>
            ))}

            <article className="library-size-card library-size-card--highlight">
              <span>Почему это сильная метрика</span>
              <strong>1.99 kB</strong>
              <small>gzip для runtime `kiks`</small>
              <p>
                Это показывает, что сама библиотека очень компактна даже с учетом встроенных
                `time-travel`, селекторов и React-интеграции. Поэтому demo bundle и library bundle
                нужно интерпретировать отдельно.
              </p>
            </article>
          </div>
        </section>

        <section id="comparison-dashboard">
          <ComparisonDashboard activeImplementation={activeImplementation} />
        </section>

        <section className="architecture-panel" id="architecture">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Архитектура</p>
              <h2>Как устроена библиотека `kiks`</h2>
            </div>
            <span className="panel-note">Схема потока данных от действия до UI</span>
          </div>

          <div className="architecture-flow">
            {architectureSteps.map((step, index) => (
              <div className="architecture-step" key={step.title}>
                <div className="architecture-index">{index + 1}</div>
                <div className="architecture-card">
                  <strong>{step.title}</strong>
                  <p>{step.description}</p>
                </div>
                {index < architectureSteps.length - 1 ? <div className="architecture-arrow">→</div> : null}
              </div>
            ))}
          </div>
        </section>
      </header>

      <section id="live-demo">
        {activeInfo.component}
      </section>
    </div>
  );
}
