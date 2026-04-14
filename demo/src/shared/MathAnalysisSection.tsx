import {
  benchmarkResults,
  comparisonMetricRows,
  weightedCriteria,
  weightedScoreRows,
} from "./benchmarkResults";

const complexityRows = [
  {
    operation: "dispatch(action)",
    complexity: "O(n + s)",
    explanation: "Последовательный проход по редьюсерам и уведомление всех подписчиков.",
  },
  {
    operation: "select(selector), повторно",
    complexity: "O(1)",
    explanation: "Возвращается кешированное значение memoized selector.",
  },
  {
    operation: "select(selector), первый вызов",
    complexity: "O(k)",
    explanation: "Стоимость зависит от самой логики вычисления селектора.",
  },
  {
    operation: "History.record(state)",
    complexity: "O(1) аморт.",
    explanation: "Новый снимок состояния добавляется в timeline.",
  },
  {
    operation: "undo / redo / timeTravel",
    complexity: "O(1)",
    explanation: "Меняется только указатель активного снимка истории.",
  },
  {
    operation: "subscribe / unsubscribe",
    complexity: "O(1)",
    explanation: "Добавление и удаление обработчиков через Set.",
  },
  {
    operation: "getVisibleTasks(state)",
    complexity: "O(n log n)",
    explanation: "Фильтрация списка задач и сортировка результата.",
  },
];

const formulas = [
  {
    label: "Интегральная оценка",
    formula: "S = Σ(wi * xi)",
    note: "Сумма нормированных критериев, умноженных на их веса.",
  },
  {
    label: "Если больше лучше",
    formula: "xi = (ai / amax) * 10",
    note: "Применяется к скорости dispatch и встроенным возможностям.",
  },
  {
    label: "Если меньше лучше",
    formula: "xi = (amin / ai) * 10",
    note: "Применяется к размеру bundle и числу зависимостей.",
  },
];

function formatNumber(value: number): string {
  return new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 2,
  }).format(value);
}

export function MathAnalysisSection() {
  const generatedAt = benchmarkResults.generatedAt
    ? new Date(benchmarkResults.generatedAt).toLocaleString("ru-RU")
    : "данные ещё не сгенерированы";

  return (
    <section className="math-analysis-panel" id="math-analysis">
      <div className="panel-head">
        <div>
          <p className="eyebrow">Мат анализ</p>
          <h2>Формулы, Big O и итоговая оценка библиотек</h2>
        </div>
        <span className="panel-note">
          Раздел связывает benchmark-данные, математические методы и выводы диплома
        </span>
      </div>

      <div className="math-analysis-grid">
        <article className="math-card math-card--formula">
          <div className="math-card-head">
            <strong>Метод взвешенных оценок</strong>
            <span>Последний пересчёт: {generatedAt}</span>
          </div>

          <div className="formula-stack">
            {formulas.map((item) => (
              <div className="formula-item" key={item.label}>
                <span>{item.label}</span>
                <code>{item.formula}</code>
                <p>{item.note}</p>
              </div>
            ))}
          </div>

          <div className="weight-row">
            <div>
              <span>Размер bundle</span>
              <strong>{weightedCriteria.bundleSize}</strong>
            </div>
            <div>
              <span>Скорость dispatch</span>
              <strong>{weightedCriteria.dispatchSpeed}</strong>
            </div>
            <div>
              <span>Зависимости</span>
              <strong>{weightedCriteria.dependencies}</strong>
            </div>
            <div>
              <span>Возможности</span>
              <strong>{weightedCriteria.builtInFeatures}</strong>
            </div>
          </div>
        </article>

        <article className="math-card math-card--score">
          <div className="math-card-head">
            <strong>Итоговая взвешенная оценка</strong>
            <span>Автоматический расчёт по текущим benchmark-данным</span>
          </div>

          <div className="math-score-table">
            <div className="math-score-row math-score-row--head">
              <span>Библиотека</span>
              <span>Bundle</span>
              <span>Speed</span>
              <span>Deps</span>
              <span>Features</span>
              <span>Итог</span>
            </div>

            {weightedScoreRows.map((row, index) => (
              <div
                className={[
                  "math-score-row",
                  index === 0 ? "is-winner" : "",
                  row.key === "kiks" ? "is-kiks" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                key={row.key}
              >
                <strong>{row.title}</strong>
                <span>{row.bundleScore}</span>
                <span>{row.speedScore}</span>
                <span>{row.dependencyScore}</span>
                <span>{row.featureScore}</span>
                <strong>{row.weightedTotal}</strong>
              </div>
            ))}
          </div>
        </article>
      </div>

      <div className="math-analysis-grid math-analysis-grid--secondary">
        <article className="math-card">
          <div className="math-card-head">
            <strong>Оценки алгоритмической сложности</strong>
            <span>Ключевые операции из ядра kiks и demo-сценария</span>
          </div>

          <div className="complexity-table">
            <div className="complexity-row complexity-row--head">
              <span>Операция</span>
              <span>Сложность</span>
              <span>Обоснование</span>
            </div>

            {complexityRows.map((row) => (
              <div className="complexity-row" key={row.operation}>
                <strong>{row.operation}</strong>
                <code>{row.complexity}</code>
                <span>{row.explanation}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="math-card">
          <div className="math-card-head">
            <strong>Связь теории и эксперимента</strong>
            <span>Фактические данные benchmark-стенда</span>
          </div>

          <div className="bench-snapshot">
            {comparisonMetricRows.map((row) => (
              <div className={`bench-snapshot-row ${row.colorClass}`} key={row.key}>
                <div>
                  <strong>{row.title}</strong>
                  <span>{row.dependencies}</span>
                </div>
                <div>
                  <span>dispatch</span>
                  <strong>{formatNumber(row.dispatchOps)} ops/sec</strong>
                </div>
                <div>
                  <span>bundle gzip</span>
                  <strong>{formatNumber(row.bundleGzipKb)} kB</strong>
                </div>
                <div>
                  <span>re-render</span>
                  <strong>{row.rerenderSummary}</strong>
                </div>
              </div>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}
