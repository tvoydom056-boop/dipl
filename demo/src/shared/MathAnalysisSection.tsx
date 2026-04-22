import {
  benchmarkResults,
  comparisonMetricRows,
  selectorAhpWeightRows,
  selectorDecisionRows,
  selectorStrategyRows,
  selectorWinner,
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
    explanation: "При победившей dependency-мемоизации возвращается уже вычисленный результат.",
  },
  {
    operation: "select(selector), первый вызов",
    complexity: "O(k)",
    explanation: "Стоимость зависит от логики проекторной функции конкретного selector.",
  },
  {
    operation: "History.record(state)",
    complexity: "O(1) аморт.",
    explanation: "Новый снимок состояния добавляется в timeline без полного обхода истории.",
  },
  {
    operation: "undo / redo / timeTravel",
    complexity: "O(1)",
    explanation: "Меняется только указатель активного snapshot истории.",
  },
  {
    operation: "Selector dependencies compare",
    complexity: "O(d)",
    explanation: "Проверяются только явные входные зависимости selector, а не всё состояние целиком.",
  },
  {
    operation: "getVisibleTasks(...)",
    complexity: "O(n log n)",
    explanation: "Фильтрация задач и сортировка результата для списка интерфейса.",
  },
];

const formulas = [
  {
    label: "Взвешенная сумма",
    formula: "S = Σ(wi * xi)",
    note: "Интегральная оценка альтернатив по нормированным критериям.",
  },
  {
    label: "AHP",
    formula: "A * w = λmax * w",
    note: "Попарные сравнения критериев формируют итоговый вектор весов.",
  },
  {
    label: "TOPSIS",
    formula: "Ci = D- / (D+ + D-)",
    note: "Побеждает реализация, ближайшая к идеальной и наиболее далёкая от худшей.",
  },
  {
    label: "Pareto",
    formula: "a ≻ b",
    note: "Доминируемые альтернативы отсекаются до итогового ранжирования.",
  },
];

function formatNumber(value: number, maximumFractionDigits = 2): string {
  return new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits,
  }).format(value);
}

function formatCriterionLabel(criterion: string): string {
  switch (criterion) {
    case "firstRun":
      return "Первый вызов";
    case "repeatRun":
      return "Повторный вызов";
    case "unrelatedChange":
      return "Несвязанные изменения";
    case "memoryEfficiency":
      return "Память";
    case "implementationSimplicity":
      return "Простота";
    case "integrationEase":
      return "Интеграция";
    case "rerenderStability":
      return "Стабильность snapshot";
    default:
      return criterion;
  }
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
          <h2>Формулы, Big O и математический выбор реализации Selector</h2>
        </div>
        <span className="panel-note">
          Раздел связывает benchmark-данные, методы принятия решений и итоговый выбор для ядра
          `kiks`
        </span>
      </div>

      <div className="math-analysis-grid">
        <article className="math-card math-card--formula">
          <div className="math-card-head">
            <strong>Четыре математических метода выбора</strong>
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
              <span>Bundle size</span>
              <strong>{weightedCriteria.bundleSize}</strong>
            </div>
            <div>
              <span>Dispatch speed</span>
              <strong>{weightedCriteria.dispatchSpeed}</strong>
            </div>
            <div>
              <span>Dependencies</span>
              <strong>{weightedCriteria.dependencies}</strong>
            </div>
            <div>
              <span>Features</span>
              <strong>{weightedCriteria.builtInFeatures}</strong>
            </div>
          </div>
        </article>

        <article className="math-card math-card--score">
          <div className="math-card-head">
            <strong>Итоговая оценка библиотек</strong>
            <span>Сводный расчёт по текущим benchmark-данным сравнительного стенда</span>
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
            <span>Ключевые операции ядра `kiks` и нового selector-слоя</span>
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
            <span>Фактические данные benchmark-стенда по библиотекам</span>
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

      <div className="math-analysis-grid math-analysis-grid--secondary">
        <article className="math-card">
          <div className="math-card-head">
            <strong>Четыре реализации Selector</strong>
            <span>Эксперимент на одинаковых сценариях фильтрации, поиска и стабильности snapshot</span>
          </div>

          <div className="complexity-table">
            <div className="complexity-row complexity-row--head">
              <span>Стратегия</span>
              <span>Первый / повторный вызов</span>
              <span>Несвязанные изменения</span>
            </div>

            {selectorStrategyRows.map((row) => (
              <div
                className={["complexity-row", row.key === selectorWinner ? "is-winner" : ""]
                  .filter(Boolean)
                  .join(" ")}
                key={row.key}
              >
                <strong>{row.title}</strong>
                <span>
                  {formatNumber(row.firstRunMs, 4)} ms / {formatNumber(row.repeatRunMs, 4)} ms
                </span>
                <span>
                  {formatNumber(row.unrelatedChangeMs, 4)} ms • stable snapshot{" "}
                  {formatNumber(row.rerenderStability * 100, 1)}%
                </span>
              </div>
            ))}
          </div>

          <div className="weight-row">
            {selectorAhpWeightRows.map((row) => (
              <div key={row.criterion}>
                <span>{formatCriterionLabel(row.criterion)}</span>
                <strong>{formatNumber(row.weight, 2)}</strong>
              </div>
            ))}
          </div>
        </article>

        <article className="math-card">
          <div className="math-card-head">
            <strong>Итог выбора через 4 метода</strong>
            <span>
              Победитель: <strong>{selectorStrategyRows.find((row) => row.key === selectorWinner)?.title}</strong>
            </span>
          </div>

          <div className="math-score-table">
            <div className="math-score-row math-score-row--head">
              <span>Реализация</span>
              <span>Weighted sum</span>
              <span>TOPSIS</span>
              <span>Pareto</span>
              <span>Статус</span>
            </div>

            {selectorDecisionRows.map((row) => (
              <div
                className={["math-score-row", row.isWinner ? "is-winner is-kiks" : ""]
                  .filter(Boolean)
                  .join(" ")}
                key={row.key}
              >
                <strong>{row.title}</strong>
                <span>{formatNumber(row.weightedSum, 3)}</span>
                <span>{formatNumber(row.topsis, 3)}</span>
                <span>{row.paretoStatus}</span>
                <strong>{row.isWinner ? "Выбран" : "Альтернатива"}</strong>
              </div>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}
