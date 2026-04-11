import { useState } from "react";

import { comparisonMetricRows } from "./benchmarkResults";

type ImplementationKey = "kiks" | "redux" | "zustand" | "mobx";
type ComparisonViewMode = "cards" | "lines";
type ComparisonScope = "all" | "active";
type MetricKind = "dispatch" | "bundle" | "rerender";

interface MetricRow {
  key: ImplementationKey;
  title: string;
  dispatchOps: number;
  bundleGzipKb: number;
  rerenderChangedComponents: number;
  rerenderCommits: number;
  rerenderSummary: string;
  rerenderScore: number;
  timeTravel: string;
  selectors: string;
  dependencies: string;
  colorClass: string;
  colorHex: string;
}

interface HoveredPoint {
  metric: MetricKind;
  rowKey: ImplementationKey;
  x: number;
  y: number;
  label: string;
  value: string;
}

interface CapabilityVisualCardProps {
  title: string;
  subtitle: string;
  kind: "history" | "selectors";
  items: Array<{
    key: ImplementationKey;
    title: string;
    status: string;
    emphasis: "strong" | "medium" | "weak";
  }>;
  activeImplementation: ImplementationKey;
}

const metricRows = comparisonMetricRows satisfies MetricRow[];
const maxDispatch = Math.max(...metricRows.map((row) => row.dispatchOps), 1);
const maxBundle = Math.max(...metricRows.map((row) => row.bundleGzipKb), 1);
const minBundle = Math.min(...metricRows.map((row) => row.bundleGzipKb), 0);
const maxRerender = Math.max(...metricRows.map((row) => row.rerenderChangedComponents), 1);

function formatNumber(value: number): string {
  return new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 2,
  }).format(value);
}

function getBundleScore(bundle: number): number {
  if (maxBundle === minBundle) {
    return 100;
  }

  return ((maxBundle - bundle) / (maxBundle - minBundle)) * 100;
}

function CapabilityBadge({
  value,
  positive,
}: {
  value: string;
  positive: boolean;
}) {
  return (
    <span className={positive ? "capability-badge is-positive" : "capability-badge"}>
      {value}
    </span>
  );
}

function CapabilityVisualCard({
  title,
  subtitle,
  kind,
  items,
  activeImplementation,
}: CapabilityVisualCardProps) {
  return (
    <article className="comparison-panel capability-visual-panel">
      <div className="panel-head">
        <div>
          <p className="eyebrow">Визуализация</p>
          <h2>{title}</h2>
        </div>
        <span className="panel-note">{subtitle}</span>
      </div>

      <div className="capability-mini-scene" data-kind={kind}>
        {kind === "history" ? (
          <div className="history-scene" aria-hidden="true">
            <span className="history-scene-label">undo</span>
            <div className="history-scene-track">
              {Array.from({ length: 5 }, (_, index) => (
                <span
                  className={[
                    "history-scene-node",
                    index === 2 ? "is-current" : "",
                    index < 2 ? "is-past" : "",
                    index > 2 ? "is-future" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  key={`history-node-${index}`}
                />
              ))}
            </div>
            <span className="history-scene-label">redo</span>
          </div>
        ) : (
          <div className="selector-scene" aria-hidden="true">
            <div className="selector-scene-box">state</div>
            <div className="selector-scene-arrow" />
            <div className="selector-scene-box is-accent">
              selector
              <span className="selector-scene-dot" />
            </div>
            <div className="selector-scene-arrow" />
            <div className="selector-scene-box">ui</div>
          </div>
        )}
      </div>

      <div className="capability-visual-list">
        {items.map((item) => (
          <div
            className={[
              "capability-visual-row",
              `is-${item.emphasis}`,
              item.key === activeImplementation ? "is-active" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            key={`${title}-${item.key}`}
          >
            <div className="capability-visual-head">
              <strong>{item.title}</strong>
              <span>{item.status}</span>
            </div>
            <div className="capability-visual-track">
              <div
                className={[
                  "capability-visual-fill",
                  item.key,
                  `is-${item.emphasis}`,
                ].join(" ")}
              />
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}

function MetricLineChart({
  rows,
  title,
  subtitle,
  activeImplementation,
  selector,
  labelFormatter,
  maxValue,
  metric,
  invert = false,
}: {
  rows: MetricRow[];
  title: string;
  subtitle: string;
  activeImplementation: ImplementationKey;
  selector: (row: MetricRow) => number;
  labelFormatter: (value: number) => string;
  maxValue: number;
  metric: MetricKind;
  invert?: boolean;
}) {
  const [hoveredPoint, setHoveredPoint] = useState<HoveredPoint | null>(null);

  const width = 1000;
  const height = 420;
  const paddingX = 70;
  const paddingTop = 32;
  const paddingBottom = 54;
  const usableWidth = width - paddingX * 2;
  const usableHeight = height - paddingTop - paddingBottom;
  const centerY = paddingTop + usableHeight / 2;

  const points = rows.map((row, index) => {
    const value = selector(row);
    const x =
      rows.length === 1
        ? width / 2
        : paddingX + (usableWidth / Math.max(rows.length - 1, 1)) * index;
    const ratio = invert ? 1 - value / maxValue : value / maxValue;
    const y = paddingTop + usableHeight - ratio * usableHeight;

    return {
      row,
      value,
      x,
      y,
    };
  });

  const baseline = points.map((point) => `${point.x},${centerY}`).join(" ");
  const actualLine = points.map((point) => `${point.x},${point.y}`).join(" ");
  const ticks = [0.25, 0.5, 0.75, 1];

  return (
    <article className="comparison-panel chart-panel">
      <div className="panel-head">
        <div>
          <p className="eyebrow">График</p>
          <h2>{title}</h2>
        </div>
        <span className="panel-note">{subtitle}</span>
      </div>

      <div className="line-chart-wrapper">
        <div className="line-chart">
          <svg viewBox={`0 0 ${width} ${height}`} xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern
                height="24"
                id={`graph-grid-${metric}`}
                patternUnits="userSpaceOnUse"
                width="24"
              >
                <path
                  d="M 24 0 L 0 0 0 24"
                  fill="none"
                  stroke="rgba(19, 34, 56, 0.10)"
                  strokeWidth="1"
                />
              </pattern>
            </defs>

            <rect fill="#ffffff" height={height} rx="28" width={width} />
            <rect
              fill={`url(#graph-grid-${metric})`}
              height={height}
              opacity="0.92"
              rx="28"
              width={width}
            />

            {ticks.map((tick) => {
              const y = paddingTop + usableHeight - tick * usableHeight;
              const label = invert
                ? labelFormatter(maxValue - maxValue * tick)
                : labelFormatter(maxValue * tick);

              return (
                <g key={`${metric}-${tick}`}>
                  <line
                    stroke="rgba(19, 34, 56, 0.18)"
                    strokeWidth="1.5"
                    x1={paddingX}
                    x2={width - paddingX}
                    y1={y}
                    y2={y}
                  />
                  <text className="chart-axis-label" x="10" y={y + 4}>
                    {label}
                  </text>
                </g>
              );
            })}

            <line
              stroke="rgba(19, 34, 56, 0.55)"
              strokeWidth="3"
              x1={paddingX}
              x2={paddingX}
              y1={paddingTop - 4}
              y2={height - paddingBottom}
            />
            <line
              stroke="rgba(19, 34, 56, 0.55)"
              strokeWidth="3"
              x1={paddingX}
              x2={width - paddingX}
              y1={height - paddingBottom}
              y2={height - paddingBottom}
            />

            <polyline
              className="chart-baseline"
              fill="none"
              points={baseline}
              stroke="rgba(205, 72, 53, 0.18)"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="4"
            />
            <polyline
              className="chart-line chart-line-animated"
              fill="none"
              points={actualLine}
              stroke="rgba(205, 72, 53, 0.88)"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="7"
            />

            {points.map((point) => {
              const isActive = point.row.key === activeImplementation;
              const isHovered =
                hoveredPoint?.metric === metric && hoveredPoint.rowKey === point.row.key;

              return (
                <g key={`${metric}-${point.row.key}`}>
                  <line
                    className="library-connector library-connector-animated"
                    stroke={point.row.colorHex}
                    strokeWidth={isActive || isHovered ? 5 : 4}
                    x1={point.x}
                    x2={point.x}
                    y1={centerY}
                    y2={point.y}
                  />
                  <circle
                    className={isActive ? "chart-point is-active" : "chart-point"}
                    cx={point.x}
                    cy={point.y}
                    fill={isHovered ? point.row.colorHex : "#ffffff"}
                    onMouseEnter={() =>
                      setHoveredPoint({
                        metric,
                        rowKey: point.row.key,
                        x: point.x,
                        y: point.y,
                        label: point.row.title,
                        value:
                          metric === "rerender"
                            ? `${point.row.rerenderChangedComponents} зон / ${point.row.rerenderCommits} commits`
                            : labelFormatter(point.value),
                      })
                    }
                    onMouseLeave={() => setHoveredPoint(null)}
                    r={isActive || isHovered ? 11 : 8}
                    stroke={point.row.colorHex}
                    strokeWidth={isActive ? 6 : 5}
                  />
                  <text className="chart-x-label" x={point.x} y={height - 18}>
                    {point.row.title}
                  </text>
                  <text
                    className={isActive ? "chart-value-label is-active" : "chart-value-label"}
                    x={point.x}
                    y={point.y < paddingTop + 32 ? point.y + 30 : point.y - 16}
                  >
                    {metric === "rerender"
                      ? `${point.row.rerenderChangedComponents}`
                      : labelFormatter(point.value)}
                  </text>
                </g>
              );
            })}
          </svg>

          {hoveredPoint ? (
            <div
              className="chart-tooltip"
              style={{
                left: `${(hoveredPoint.x / width) * 100}%`,
                top: `${(hoveredPoint.y / height) * 100}%`,
              }}
            >
              <strong>{hoveredPoint.label}</strong>
              <span>{hoveredPoint.value}</span>
            </div>
          ) : null}
        </div>

        <div className="chart-legend">
          {rows.map((row) => (
            <div
              className={row.key === activeImplementation ? "legend-item is-active" : "legend-item"}
              key={`${metric}-legend-${row.key}`}
            >
              <span className={`legend-dot ${row.colorClass}`} />
              <small>{row.title}</small>
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}

export function ComparisonDashboard({
  activeImplementation,
}: {
  activeImplementation: ImplementationKey;
}) {
  const [viewMode, setViewMode] = useState<ComparisonViewMode>("cards");
  const [scopeMode, setScopeMode] = useState<ComparisonScope>("all");
  const comparisonRows =
    scopeMode === "active"
      ? metricRows.filter((row) => row.key === activeImplementation)
      : metricRows;

  return (
    <section className="comparison-dashboard-shell">
      <div className="comparison-dashboard-head">
        <div>
          <p className="eyebrow">Визуализация</p>
          <h2>Сравнение библиотек в двух режимах</h2>
        </div>

        <div className="view-toggle">
          <button
            className={viewMode === "cards" ? "view-toggle-button is-active" : "view-toggle-button"}
            onClick={() => setViewMode("cards")}
            type="button"
          >
            Текущий вид
          </button>
          <button
            className={viewMode === "lines" ? "view-toggle-button is-active" : "view-toggle-button"}
            onClick={() => setViewMode("lines")}
            type="button"
          >
            Линейные графики
          </button>
        </div>
      </div>

      {viewMode === "lines" ? (
        <div className="scope-toggle">
          <button
            className={scopeMode === "all" ? "scope-toggle-button is-active" : "scope-toggle-button"}
            onClick={() => setScopeMode("all")}
            type="button"
          >
            Показать все библиотеки
          </button>
          <button
            className={scopeMode === "active" ? "scope-toggle-button is-active" : "scope-toggle-button"}
            onClick={() => setScopeMode("active")}
            type="button"
          >
            Только текущую реализацию
          </button>
        </div>
      ) : null}

      {viewMode === "cards" ? (
        <section className="comparison-dashboard">
          <article className="comparison-panel">
            <div className="panel-head">
              <div>
                <p className="eyebrow">График 1</p>
                <h2>Производительность dispatch</h2>
              </div>
              <span className="panel-note">Чем длиннее шкала, тем выше ops/sec</span>
            </div>

            <div className="metric-chart">
              {metricRows.map((row) => {
                const width = (row.dispatchOps / maxDispatch) * 100;

                return (
                  <div
                    className={[
                      "metric-row",
                      row.key === activeImplementation ? "is-active" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    key={`dispatch-${row.key}`}
                  >
                    <div className="metric-row-head">
                      <strong>{row.title}</strong>
                      <span>{formatNumber(row.dispatchOps)} ops/sec</span>
                    </div>
                    <div className="metric-bar-track">
                      <div className={`metric-bar-fill ${row.colorClass}`} style={{ width: `${width}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </article>

          <article className="comparison-panel">
            <div className="panel-head">
              <div>
                <p className="eyebrow">График 2</p>
                <h2>Компактность bundle</h2>
              </div>
              <span className="panel-note">Чем длиннее шкала, тем меньше итоговый gzip</span>
            </div>

            <div className="metric-chart">
              {metricRows.map((row) => {
                const width = getBundleScore(row.bundleGzipKb);

                return (
                  <div
                    className={[
                      "metric-row",
                      row.key === activeImplementation ? "is-active" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    key={`bundle-${row.key}`}
                  >
                    <div className="metric-row-head">
                      <strong>{row.title}</strong>
                      <span>{formatNumber(row.bundleGzipKb)} kB gzip</span>
                    </div>
                    <div className="metric-bar-track">
                      <div className={`metric-bar-fill ${row.colorClass}`} style={{ width: `${width}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </article>

          <article className="comparison-panel">
            <div className="panel-head">
              <div>
                <p className="eyebrow">График 3</p>
                <h2>Re-render</h2>
              </div>
              <span className="panel-note">
                Чем длиннее шкала, тем меньше суммарных перерисованных UI-зон по 4 сценариям
              </span>
            </div>

            <div className="metric-chart">
              {metricRows.map((row) => (
                <div
                  className={[
                    "metric-row",
                    row.key === activeImplementation ? "is-active" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  key={`rerender-${row.key}`}
                >
                  <div className="metric-row-head">
                    <strong>{row.title}</strong>
                    <span>{row.rerenderSummary}</span>
                  </div>
                  <div className="metric-bar-track">
                    <div
                      className={`metric-bar-fill ${row.colorClass}`}
                      style={{ width: `${row.rerenderScore}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="comparison-panel comparison-panel--matrix">
            <div className="panel-head">
              <div>
                <p className="eyebrow">Матрица</p>
                <h2>Встроенные возможности</h2>
              </div>
              <span className="panel-note">Быстрый способ объяснить архитектурные различия</span>
            </div>

            <div className="capability-grid">
              {metricRows.map((row) => (
                <div
                  className={[
                    "capability-card",
                    row.key === activeImplementation ? "is-active" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  key={`cap-${row.key}`}
                >
                  <h3>{row.title}</h3>
                  <div className="capability-stack">
                    <div>
                      <span>Time-travel</span>
                      <CapabilityBadge
                        positive={row.timeTravel === "Встроен"}
                        value={row.timeTravel}
                      />
                    </div>
                    <div>
                      <span>Селекторы</span>
                      <CapabilityBadge
                        positive={row.selectors === "Встроены"}
                        value={row.selectors}
                      />
                    </div>
                    <div>
                      <span>Зависимости</span>
                      <CapabilityBadge
                        positive={row.dependencies === "React peer only"}
                        value={row.dependencies}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </article>
        </section>
      ) : (
        <section className="comparison-dashboard-lines">
          <MetricLineChart
            activeImplementation={activeImplementation}
            labelFormatter={(value) => `${Math.round(value / 1000)}k`}
            maxValue={maxDispatch}
            metric="dispatch"
            rows={comparisonRows}
            selector={(row) => row.dispatchOps}
            subtitle="Общая красная линия показывает профиль различий, цветные вертикали — отдельные библиотеки"
            title="Dispatch ops/sec"
          />

          <MetricLineChart
            activeImplementation={activeImplementation}
            invert
            labelFormatter={(value) => `${value.toFixed(0)} kB`}
            maxValue={maxBundle}
            metric="bundle"
            rows={comparisonRows}
            selector={(row) => row.bundleGzipKb}
            subtitle="Чем выше точка, тем компактнее итоговая gzip-сборка"
            title="Bundle gzip"
          />

          <MetricLineChart
            activeImplementation={activeImplementation}
            invert
            labelFormatter={(value) => `${Math.round(value)} зон`}
            maxValue={maxRerender}
            metric="rerender"
            rows={comparisonRows}
            selector={(row) => row.rerenderChangedComponents}
            subtitle="Реальный benchmark по commits и перерисованным UI-зонам после add task, toggle task, set search и undo"
            title="Re-render"
          />

          <CapabilityVisualCard
            activeImplementation={activeImplementation}
            kind="history"
            items={[
              { key: "kiks", title: "kiks", status: "Встроенный API undo / redo / timeTravel", emphasis: "strong" },
              { key: "redux", title: "Redux Toolkit", status: "Обычно через внешний DevTools-поток", emphasis: "medium" },
              { key: "zustand", title: "Zustand", status: "Реализуется как кастомное расширение store", emphasis: "medium" },
              { key: "mobx", title: "MobX", status: "Требует отдельной ручной модели истории", emphasis: "weak" },
            ]}
            subtitle="Насколько нативно библиотека поддерживает историю состояний"
            title="Time-travel"
          />

          <CapabilityVisualCard
            activeImplementation={activeImplementation}
            kind="selectors"
            items={[
              { key: "kiks", title: "kiks", status: "Встроенные memoized selectors", emphasis: "strong" },
              { key: "redux", title: "Redux Toolkit", status: "Часто через внешние selector-паттерны", emphasis: "medium" },
              { key: "zustand", title: "Zustand", status: "Частично через выборки и пользовательские memo-patterns", emphasis: "medium" },
              { key: "mobx", title: "MobX", status: "Ставка на реактивность, а не на selector API", emphasis: "weak" },
            ]}
            subtitle="Насколько явно библиотека поддерживает слой производных данных"
            title="Селекторы"
          />
        </section>
      )}
    </section>
  );
}
