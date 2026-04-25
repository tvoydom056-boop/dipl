import { calculateLibraryAhp } from "./library-analysis";

const ahp = calculateLibraryAhp();

console.log("AHP criteria weights");
console.table(
  ahp.criteria.map((criterion) => ({
    criterion,
    weight: ahp.weights[criterion],
    columnSum: ahp.columnSums[ahp.criteria.indexOf(criterion)],
  })),
);
console.log(
  `lambdaMax=${ahp.lambdaMax.toFixed(6)} CI=${ahp.ci.toFixed(6)} CR=${ahp.cr.toFixed(6)} ${ahp.isConsistent ? "consistent" : "not consistent"}`,
);
