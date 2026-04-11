import { type ReactElement, useState } from "react";

import { KiksTaskManager } from "./implementations/kiks/KiksTaskManager";
import { MobxTaskManager } from "./implementations/mobx/MobxTaskManager";
import { ReduxTaskManager } from "./implementations/redux/ReduxTaskManager";
import { ZustandTaskManager } from "./implementations/zustand/ZustandTaskManager";
import {
  benchmarkResults,
  comparisonOverviewRows,
  librarySizeFact,
  rerenderBreakdownRows,
  rerenderScenarioRows,
} from "./shared/benchmarkResults";
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
    value: "dispatch, bundle size, re-render, library size",
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

function formatNumber(value: number): string {
  return new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 2,
  }).format(value);
}

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
              <span className="panel-note">
                Данные берутся из автогенерируемого benchmark-results.json
              </span>
            </div>

            <div className="comparison-table comparison-table--extended">
              <div className="comparison-row comparison-row--head comparison-row--extended">
                <span>Библиотека</span>
                <span>Dispatch ops/sec</span>
                <span>Bundle gzip</span>
                <span>Re-render</span>
                <span>Breakdown</span>
                <span>Time-travel</span>
                <span>Селекторы</span>
              </div>

              {comparisonOverviewRows.map((row) => (
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
                  <span>{formatNumber(row.dispatch)}</span>
                  <span>{formatNumber(row.bundle)} kB</span>
                  <span>{row.rerenderSummary}</span>
                  <span>{row.zoneSummary}</span>
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
              <span className="panel-note">
                Автоматический замер через React Profiler и render tracker
              </span>
            </div>

            <div className="rerender-method">
              <div className="rerender-card">
                <strong>Что показывает метрика</strong>
                <p>
                  Насколько библиотека эффективно работает с UI и сколько логических зон интерфейса
                  и commits она затрагивает при типовом действии.
                </p>
              </div>

              <div className="rerender-card">
                <strong>Как измеряется</strong>
                <p>
                  Скрипт монтирует каждую реализацию в jsdom, выполняет add task, toggle task,
                  set search и undo, а затем сохраняет commits и число реально перерисованных
                  UI-зон.
                </p>
              </div>

              <div className="rerender-card">
                <strong>Последний прогон</strong>
                <p>
                  {benchmarkResults.generatedAt
                    ? new Date(benchmarkResults.generatedAt).toLocaleString("ru-RU")
                    : "данные ещё не сгенерированы"}
                </p>
              </div>
            </div>

            <div className="rerender-results">
              <div className="rerender-results-head">
                <strong>Итог benchmark по re-render</strong>
                <span>Чем меньше changed components, тем лучше контроль лишних UI-обновлений</span>
              </div>

              <div className="rerender-results-table">
                <div className="rerender-results-row rerender-results-row--head">
                  <span>Библиотека</span>
                  <span>Commits</span>
                  <span>Changed components</span>
                  <span>Источник</span>
                </div>

                {rerenderScenarioRows.map((row) => (
                  <div className="rerender-results-row" key={row.library}>
                    <strong>{row.library}</strong>
                    <span>{row.commits}</span>
                    <span>{row.changedComponents}</span>
                    <span>{row.note}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rerender-breakdown">
              <div className="rerender-results-head">
                <strong>Breakdown по зонам интерфейса</strong>
                <span>
                  Отдельно видно, как часто затрагиваются `list`, `history`, `filters`, `stats`
                  и другие зоны
                </span>
              </div>

              <div className="rerender-breakdown-grid">
                {rerenderBreakdownRows.map((row) => (
                  <article className="rerender-breakdown-card" key={row.library}>
                    <div className="rerender-breakdown-top">
                      <strong>{row.library}</strong>
                      <span>{row.zoneSummary}</span>
                    </div>

                    <div className="rerender-breakdown-meta">
                      <span>{row.totalChangedComponents} зон</span>
                      <span>{row.totalCommits} commits</span>
                    </div>

                    <div className="rerender-breakdown-list">
                      {row.scenarios.map((scenarioRow) => (
                        <div className="rerender-breakdown-row" key={`${row.library}-${scenarioRow.scenario}`}>
                          <strong>{scenarioRow.scenario}</strong>
                          <span>{scenarioRow.changedComponents} зон</span>
                          <small>{scenarioRow.zoneSummary}</small>
                        </div>
                      ))}
                    </div>
                  </article>
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
            <article className="library-size-card">
              <span>kiks runtime package</span>
              <strong>{librarySizeFact ? `${librarySizeFact.gzipKb.toFixed(2)} kB` : "—"}</strong>
              <small>gzip</small>
              <div className="library-size-meta">
                <b>{librarySizeFact ? `${librarySizeFact.rawKb.toFixed(2)} kB raw` : "—"}</b>
                <em>
                  {librarySizeFact
                    ? `${librarySizeFact.files} runtime files после production build`
                    : "запустите npm run bench:bundle"}
                </em>
              </div>
            </article>

            <article className="library-size-card">
              <span>Целевая граница</span>
              <strong>до 3 kB</strong>
              <small>gzip</small>
              <div className="library-size-meta">
                <b>до 6 kB raw</b>
                <em>требование дипломного проекта</em>
              </div>
            </article>

            <article className="library-size-card library-size-card--highlight">
              <span>Почему это сильная метрика</span>
              <strong>{librarySizeFact ? `${librarySizeFact.gzipKb.toFixed(2)} kB` : "—"}</strong>
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
