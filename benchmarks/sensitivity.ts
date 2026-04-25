import { readBenchmarkResults } from "./results-store";
import { calculateLibrarySensitivity, getLibraryDecisionRows } from "./library-analysis";

const rows = getLibraryDecisionRows(readBenchmarkResults());
const sensitivity = calculateLibrarySensitivity(rows);

console.log("WSM sensitivity");
for (const scenario of sensitivity.scenarios) {
  console.log(`${scenario.title} (${scenario.winner})`);
  console.table(
    scenario.results.map((row) => ({
      library: row.title,
      score: row.score,
      rank: row.rank,
    })),
  );
}
