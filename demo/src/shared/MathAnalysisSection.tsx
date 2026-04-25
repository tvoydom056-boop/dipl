import {
  benchmarkResults,
  comparisonMetricRows,
  libraryAhpMatrixRows,
  libraryAhpSummary,
  libraryParetoFrontier,
  libraryParetoRows,
  librarySensitivityRows,
  librarySensitivityScenarios,
  librarySensitivitySummary,
  libraryTopsisIdeal,
  libraryTopsisMatrixRows,
  libraryTopsisRows,
  selectorAhpWeightRows,
  selectorBenchmarkChartRows,
  selectorBenchmarkSummary,
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
    explanation: "При dependency-мемоизации возвращается уже вычисленный результат.",
  },
  {
    operation: "select(selector), первый вызов",
    complexity: "O(k)",
    explanation: "Стоимость зависит от логики проекторной функции конкретного selector.",
  },
  {
    operation: "History.record(state)",
    complexity: "O(1) аморт.",
    explanation: "Новый snapshot добавляется в timeline без полного обхода истории.",
  },
  {
    operation: "undo / redo / timeTravel",
    complexity: "O(1)",
    explanation: "Меняется только указатель активного snapshot в истории.",
  },
  {
    operation: "Selector dependencies compare",
    complexity: "O(d)",
    explanation: "Проверяются только явные входные зависимости selector, а не все state целиком.",
  },
  {
    operation: "getVisibleTasks(...)",
    complexity: "O(n log n)",
    explanation: "Фильтрация и сортировка списка задач для интерфейса.",
  },
];

const formulas = [
  {
    label: "Взвешенная сумма",
    formula: "S = Σ(wi × xi)",
    note: "Итоговая оценка альтернатив по нормированным критериям.",
  },
  {
    label: "AHP",
    formula: "A × w = λmax × w",
    note: "Попарные сравнения формируют согласованный вектор весов критериев.",
  },
  {
    label: "TOPSIS",
    formula: "Ci = D- / (D+ + D-)",
    note: "Побеждает альтернатива, ближайшая к идеалу и самая далёкая от антиидеала.",
  },
  {
    label: "Pareto",
    formula: "Ai ≻ Aj",
    note: "Доминируемые альтернативы отсеиваются до ранжирования.",
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
    case "bundleSize":
      return "Bundle";
    case "dispatchSpeed":
      return "Speed";
    case "dependencies":
      return "Deps";
    case "builtInFeatures":
      return "Features";
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
          <h2>Формулы, Big O и многокритериальный выбор для сравнения библиотек и selector-сценариев</h2>
        </div>
        <span className="panel-note">
          Раздел связывает benchmark-данные, методы принятия решений и итоговый выбор для ядра
          {" "}
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
            <strong>Итоговая оценка библиотек по WSM</strong>
            <span>Нормализация и веса оставлены в исходном виде, как в уже реализованной части проекта</span>
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
            <span>Ключевые операции ядра `kiks` и selector-слоя</span>
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

      <div className="math-analysis-grid">
        <article className="math-card">
          <div className="math-card-head">
            <strong>AHP: матрица попарных сравнений критериев</strong>
            <span>
              CR:
              {" "}
              <strong>{formatNumber(libraryAhpSummary.cr, 4)}</strong>
              {" "}
              <span className={`math-status ${libraryAhpSummary.isConsistent ? "is-good" : "is-bad"}`}>
                {libraryAhpSummary.isConsistent ? "согласована" : "не согласована"}
              </span>
            </span>
          </div>

          <div className="math-matrix-table">
            <div className="math-matrix-row math-matrix-row--head">
              <span>Критерий</span>
              <span>Bundle</span>
              <span>Speed</span>
              <span>Deps</span>
              <span>Features</span>
              <span>Вес</span>
            </div>

            {libraryAhpMatrixRows.map((row) => (
              <div className="math-matrix-row" key={row.criterion}>
                <strong>{row.label}</strong>
                {row.values.map((value, index) => (
                  <span key={`${row.criterion}-${index}`}>{formatNumber(value, 3)}</span>
                ))}
                <strong>{formatNumber(row.weight, 3)}</strong>
              </div>
            ))}
          </div>

          <div className="math-mini-grid">
            {libraryAhpMatrixRows.map((row) => (
              <div key={`${row.criterion}-sum`} className="math-mini-card">
                <span>Сумма столбца {row.label}</span>
                <strong>{formatNumber(row.columnSum, 3)}</strong>
              </div>
            ))}
          </div>

          <div className="math-meta-row">
            <span>λmax = {formatNumber(libraryAhpSummary.lambdaMax, 4)}</span>
            <span>CI = {formatNumber(libraryAhpSummary.ci, 4)}</span>
            <span>CR = {formatNumber(libraryAhpSummary.cr, 4)}</span>
          </div>
        </article>

        <article className="math-card">
          <div className="math-card-head">
            <strong>Pareto: доминирование библиотек</strong>
            <span>Парето-оптимальное множество: {libraryParetoFrontier.map((row) => row.title).join(", ")}</span>
          </div>

          <div className="math-pareto-list">
            {libraryParetoRows.map((row) => (
              <div className={`math-pareto-item ${row.isEfficient ? "is-efficient" : ""}`} key={row.key}>
                <div className="math-pareto-top">
                  <strong>{row.title}</strong>
                  <span className={`math-status ${row.isEfficient ? "is-good" : "is-muted"}`}>
                    {row.isEfficient ? "Pareto-optimal" : "Dominated"}
                  </span>
                </div>
                <span>
                  Доминирует:
                  {" "}
                  {row.dominatesLabels.join(", ") || "никого"}
                </span>
                <span>
                  Доминируется:
                  {" "}
                  {row.dominatedByLabels.join(", ") || "никем"}
                </span>
              </div>
            ))}
          </div>
        </article>
      </div>

      <div className="math-analysis-grid math-analysis-grid--stack">
        <article className="math-card">
          <div className="math-card-head">
            <strong>TOPSIS: взвешенная нормализованная матрица</strong>
            <span>Веса автоматически взяты из AHP</span>
          </div>

          <div className="math-matrix-table">
            <div className="math-matrix-row math-matrix-row--head">
              <span>Библиотека</span>
              <span>Bundle</span>
              <span>Speed</span>
              <span>Deps</span>
              <span>Features</span>
            </div>

            {libraryTopsisMatrixRows.map((row) => (
              <div className="math-matrix-row" key={row.key}>
                <strong>{row.label}</strong>
                <span>{formatNumber(row.values.bundleSize, 4)}</span>
                <span>{formatNumber(row.values.dispatchSpeed, 4)}</span>
                <span>{formatNumber(row.values.dependencies, 4)}</span>
                <span>{formatNumber(row.values.builtInFeatures, 4)}</span>
              </div>
            ))}
          </div>

          <div className="math-mini-grid">
            {libraryTopsisIdeal.best.map((entry) => (
              <div className="math-mini-card" key={`best-${entry.criterion}`}>
                <span>A+ {entry.label}</span>
                <strong>{formatNumber(entry.value, 4)}</strong>
              </div>
            ))}
            {libraryTopsisIdeal.worst.map((entry) => (
              <div className="math-mini-card" key={`worst-${entry.criterion}`}>
                <span>A- {entry.label}</span>
                <strong>{formatNumber(entry.value, 4)}</strong>
              </div>
            ))}
          </div>
        </article>

        <article className="math-card">
          <div className="math-card-head">
            <strong>TOPSIS: расстояния и итоговый ранг</strong>
            <span>Победитель: {libraryTopsisRows.find((row) => row.isWinner)?.title}</span>
          </div>

          <div className="math-score-table">
            <div className="math-score-row math-score-row--head math-score-row--compact-head">
              <span>Библиотека</span>
              <span>D+</span>
              <span>D-</span>
              <span>C</span>
              <span>Rank</span>
            </div>

            {libraryTopsisRows.map((row) => (
              <div
                className={["math-score-row", "math-score-row--compact", row.isWinner ? "is-winner is-kiks" : ""]
                  .filter(Boolean)
                  .join(" ")}
                key={row.key}
              >
                <strong>{row.title}</strong>
                <span>{formatNumber(row.distanceToIdeal, 4)}</span>
                <span>{formatNumber(row.distanceToAntiIdeal, 4)}</span>
                <span>{formatNumber(row.score, 4)}</span>
                <strong>{row.rank}</strong>
              </div>
            ))}
          </div>
        </article>
      </div>

      <div className="math-analysis-grid">
        <article className="math-card">
          <div className="math-card-head">
            <strong>Анализ чувствительности WSM</strong>
            <span>
              {librarySensitivitySummary.stableWinner
                ? `Победитель устойчив: ${librarySensitivitySummary.stableWinnerLabel}`
                : "Победитель меняется при смене приоритетов"}
            </span>
          </div>

          <div className="math-matrix-table">
            <div className="math-matrix-row math-matrix-row--head math-matrix-row--sensitivity">
              <span>Библиотека</span>
              {librarySensitivityScenarios.map((scenario) => (
                <span key={scenario.key}>{scenario.title}</span>
              ))}
            </div>

            {librarySensitivityRows.map((row) => (
              <div className="math-matrix-row math-matrix-row--sensitivity" key={row.key}>
                <strong>{row.title}</strong>
                {row.scenarios.map((scenario) => (
                  <span key={`${row.key}-${scenario.key}`}>
                    #{scenario.rank}
                    {" "}
                    ({formatNumber(scenario.score, 2)})
                  </span>
                ))}
              </div>
            ))}
          </div>

          <div className="math-scenario-list">
            {librarySensitivityScenarios.map((scenario) => (
              <div className="math-mini-card" key={scenario.key}>
                <span>{scenario.title}</span>
                <strong>{scenario.winner}</strong>
                <small>
                  {scenario.weights.map((entry) => `${entry.label} ${formatNumber(entry.value, 2)}`).join(" • ")}
                </small>
              </div>
            ))}
          </div>
        </article>

        <article className="math-card">
          <div className="math-card-head">
            <strong>Selector benchmark: cache hit vs miss</strong>
            <span>
              {selectorBenchmarkSummary.iterations} итераций × {selectorBenchmarkSummary.runs} прогона
            </span>
          </div>

          <div className="selector-bars">
            {selectorBenchmarkChartRows.map((row) => (
              <div className="selector-bar-row" key={row.key}>
                <div className="selector-bar-head">
                  <strong>{row.title}</strong>
                  <span>{formatNumber(row.opsPerSec)} ops/sec</span>
                </div>
                <div className="selector-bar-track">
                  <div
                    className={`selector-bar-fill ${row.group} ${row.cache}`}
                    style={{ width: `${row.widthPercent}%` }}
                  />
                </div>
                <small>
                  avg {formatNumber(row.averageMs, 6)} ms • total {formatNumber(row.totalMs, 2)} ms
                </small>
              </div>
            ))}
          </div>

          <div className="math-meta-row">
            <span>Лучший cache hit: {selectorBenchmarkSummary.bestCacheHit}</span>
            <span>Лучший cache miss: {selectorBenchmarkSummary.bestCacheMiss}</span>
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
                  {formatNumber(row.unrelatedChangeMs, 4)} ms • stable snapshot {formatNumber(row.rerenderStability * 100, 1)}%
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
              Победитель:
              {" "}
              <strong>{selectorStrategyRows.find((row) => row.key === selectorWinner)?.title}</strong>
            </span>
          </div>

          <div className="math-score-table">
            <div className="math-score-row math-score-row--head math-score-row--selector-head">
              <span>Реализация</span>
              <span>Weighted sum</span>
              <span>TOPSIS</span>
              <span>Pareto</span>
              <span>Статус</span>
            </div>

            {selectorDecisionRows.map((row) => (
              <div
                className={["math-score-row", "math-score-row--selector", row.isWinner ? "is-winner is-kiks" : ""]
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
