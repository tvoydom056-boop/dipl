import { readBenchmarkResults } from "./results-store";
import { calculateLibraryPareto, getLibraryDecisionRows } from "./library-analysis";

const rows = getLibraryDecisionRows(readBenchmarkResults());
const pareto = calculateLibraryPareto(rows);

console.log("Pareto dominance");
console.table(
  pareto.map((row) => ({
    library: row.title,
    dominates: row.dominates.join(", ") || "none",
    dominatedBy: row.dominatedBy.join(", ") || "none",
    efficient: row.isEfficient ? "yes" : "no",
  })),
);
