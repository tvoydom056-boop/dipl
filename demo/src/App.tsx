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
    highlight: "Компактное API и лёгкая интеграция",
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
  { library: "kiks", dispatch: "251 052.92", bundle: "65.87 kB", timeTravel: "Встроен", selectors: "Встроены" },
  { library: "Redux Toolkit", dispatch: "8 016.85", bundle: "70.59 kB", timeTravel: "Внешний инструмент", selectors: "Частично" },
  { library: "Zustand", dispatch: "421 910.49", bundle: "62.31 kB", timeTravel: "Кастомно", selectors: "Частично" },
  { library: "MobX", dispatch: "12 623.31", bundle: "79.31 kB", timeTravel: "Кастомно", selectors: "Нет" },
];

export function App() {
  const [activeImplementation, setActiveImplementation] = useState<ImplementationKey>("kiks");
  const [isPresentationMode, setIsPresentationMode] = useState(false);
  const activeInfo = implementations[activeImplementation];

  return (
    <div className={isPresentationMode ? "app-shell is-presentation" : "app-shell"}>
      <header className="app-header">
        <div className="masthead">
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

        <section className="comparison-showcase">
          <article className="comparison-panel">
            <div className="panel-head">
              <div>
                <p className="eyebrow">Сравнение</p>
                <h2>Ключевые метрики стенда</h2>
              </div>
              <span className="panel-note">Актуальные значения из benchmark-сценария</span>
            </div>

            <div className="comparison-table">
              <div className="comparison-row comparison-row--head">
                <span>Библиотека</span>
                <span>Dispatch ops/sec</span>
                <span>Bundle gzip</span>
                <span>Time-travel</span>
                <span>Селекторы</span>
              </div>

              {benchmarkRows.map((row) => (
                <div
                  className={[
                    "comparison-row",
                    activeInfo.title === row.library ? "is-active" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  key={row.library}
                >
                  <strong>{row.library}</strong>
                  <span>{row.dispatch}</span>
                  <span>{row.bundle}</span>
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
                <strong>Zustand</strong> демонстрирует минималистичный подход и высокую
                скорость в текущем benchmark-сценарии.
              </li>
              <li>
                <strong>Redux Toolkit</strong> хорошо показывает стандартизированную
                архитектуру, но требует большей инфраструктуры.
              </li>
              <li>
                <strong>MobX</strong> иллюстрирует реактивную модель и отличается по
                философии обновления состояния.
              </li>
            </ul>
          </article>
        </section>

        <ComparisonDashboard activeImplementation={activeImplementation} />

        <section className="architecture-panel">
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

      {activeInfo.component}
    </div>
  );
}
