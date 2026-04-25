# diplom

Diploma project for researching and comparing state management approaches in React applications. The repository contains the custom `kiks` state manager, a Vite demo application, reproducible benchmarks, and diploma materials.

## Repository Structure

- `packages/kiks` - lightweight TypeScript state management library with reducers, middleware, history, selectors, and React bindings.
- `demo` - React/Vite application that compares `kiks`, Redux Toolkit, Zustand, and MobX on the same task manager scenario.
- `benchmarks` - benchmark scripts and multicriteria analysis helpers: WSM, AHP, TOPSIS, Pareto, sensitivity analysis, selector scenarios, and history operations.
- `diploma` - thesis drafts, defense speech, Q&A notes, and presentation outline.

## Getting Started

Install dependencies:

```bash
npm ci
```

Run the demo:

```bash
npm run dev --prefix demo
```

Run the full verification pipeline:

```bash
npm run verify
```

## Useful Commands

```bash
npm test
npm run build
npm run typecheck
npm run lint
npm run format:check
npm run bench
```

## Benchmark Workflow

The benchmark layer measures dispatch speed, bundle size, rerenders, selector memoization strategies, selector operation cost, and history operations. Generated results are consumed by the demo analytics section and by the multicriteria methods in `benchmarks`.

The current analysis combines:

- Weighted Sum Model for baseline scoring.
- AHP for criteria weighting and consistency checks.
- TOPSIS for distance from ideal and anti-ideal alternatives.
- Pareto analysis for dominance filtering.
- Sensitivity scenarios for checking ranking stability.

## Quality Gates

GitHub Actions runs on `prod`, `main`, `master`, and pull requests. CI installs dependencies, checks formatting, runs ESLint, typechecks, tests the library and benchmark analytics, then builds the package and demo.

## Package

The library package lives in `packages/kiks`.

```bash
npm run test --prefix packages/kiks
npm run build --prefix packages/kiks
```

See `packages/kiks/README.md` for API examples and package-level documentation.
