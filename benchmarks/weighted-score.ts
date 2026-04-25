import { readBenchmarkResults, updateBenchmarkResults } from "./results-store";
import { buildLibraryMath, defaultWeightedCriteria } from "./library-analysis";

const nextResults = updateBenchmarkResults((current) => ({
  ...current,
  libraryMath: buildLibraryMath(current),
}));

const weightedRows = nextResults.libraryMath.weightedSum;

console.log("Взвешенная оценка библиотек управления состоянием");
console.log("Веса критериев:", defaultWeightedCriteria);
console.table(
  weightedRows.map((row) => ({
    library: row.title,
    bundleScore: row.scores.bundleSize,
    speedScore: row.scores.dispatchSpeed,
    dependencyScore: row.scores.dependencies,
    featureScore: row.scores.builtInFeatures,
    weightedTotal: row.weightedTotal,
  })),
);

const current = readBenchmarkResults();
console.log(
  `AHP CR=${current.libraryMath.ahp.cr.toFixed(6)} | TOPSIS winner=${current.libraryMath.topsis.results[0]?.title ?? "n/a"} | Pareto efficient=${current.libraryMath.pareto.filter((row) => row.isEfficient).map((row) => row.title).join(", ")}`,
);
