import { readBenchmarkResults } from "./results-store";
import {
  calculateLibraryAhp,
  calculateLibraryTopsis,
  getLibraryDecisionRows,
} from "./library-analysis";

const rows = getLibraryDecisionRows(readBenchmarkResults());
const ahp = calculateLibraryAhp();
const topsis = calculateLibraryTopsis(rows, ahp.weights);

console.log("TOPSIS ranking");
console.table(
  topsis.results.map((row) => ({
    library: row.title,
    dPlus: row.distanceToIdeal,
    dMinus: row.distanceToAntiIdeal,
    closeness: row.score,
    rank: row.rank,
  })),
);
