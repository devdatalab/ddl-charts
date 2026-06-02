# Plan: Integrate udc-frontend utilities into ddl-charts

**Status:** Proposed
**Date:** 2026-06-02
**Branch:** `udc-frontend-integration`
**Author:** Aryan Srivastava (with Claude)

## Why this exists

`ddl-charts` is intended to be DDL's shared charting library — preconfigured
styles and reusable primitives usable across projects. `udc-frontend` (the Urban
Data Commons frontend) independently grew a set of charting utilities and SVG
chart components. This plan catalogues those, decides what belongs in the shared
library, and sequences the work to bring the framework-agnostic utilities into
`ddl-charts`.

The eventual goal is for `udc-frontend` to consume `ddl-charts` instead of its
local copies. **That rewiring is out of scope here** — this pass only adds the
utilities to `ddl-charts`. No changes are made to `udc-frontend`.

## Context: the two codebases

- **`ddl-charts`** — vanilla JS + D3, imperative factory functions
  (`create*(parent, …)` that build DOM). JSDoc-documented. Tested with
  vitest/jsdom. `package.json#main` → `src/index.js` (ships source, no build
  step today).
- **`udc-frontend`** — SvelteKit + Svelte 5 runes + TypeScript, and
  deliberately **no D3** — charts are pure hand-rolled SVG (see
  `src/lib/components/charts/AGENTS.md`).

These are opposite paradigms. The pure-TS utilities port cleanly into either; the
Svelte components do not fit a D3/vanilla library.

## Locked decisions

1. **Library paradigm:** `ddl-charts` stays vanilla/D3. Port the
   framework-agnostic **utilities only**. The udc `.svelte` primitives
   (`ChartCanvas`, `ChartGrid`, `ChartTooltip`, `Scatter`) stay in `udc-frontend`.
   `ddl-charts` keeps its existing D3 components.
2. **Overlap handling:** reconcile overlapping primitives into **one canonical
   API** (don't ship side-by-side duplicates).
3. **Language:** introducing **TypeScript** into `ddl-charts` is acceptable.
   Ported utilities land as `.ts`. (Implies new tooling — see "Tooling impact".)
4. **`linearScale`:** **excluded** — redundant with `d3.scaleLinear` /
   existing `createLinearScale` in a D3 library.
5. **Tests:** **not in scope** for this pass.
6. **No `udc-frontend` changes** in this pass.

## Catalogue & disposition

| udc source | ddl-charts overlap | Disposition | Lands in |
|---|---|---|---|
| `chartScales.resolveCollisions` | none | **Port** | new `core/layout.ts` |
| `beeswarm.beeswarmLayout` | none | **Port** | `core/layout.ts` |
| `nearestPoint.nearestPoint` | none | **Port** | `core/layout.ts` |
| `chartScales.linearScale` | `createLinearScale` (D3) | **Exclude** (redundant) | — |
| `formatters.formatCompactNumber` | `formatNumber` | **Reconcile** into one | `core/utils.js` |
| `formatters.formatPercentage` | none | **Port** | `core/utils.js` |
| `formatters.formatLocaleNumber` | partial | **Port** as explicit helper | `core/utils.js` |
| `chartTypes.COUNTRY_PALETTE` + `getCountryColor` | `HIGHLIGHT_COLORS` + `createColorManager` | **Reconcile** (adopt Okabe-Ito) | `core/colors.js` |
| `textMeasure.*` | none | **Defer (Phase 3)** — adds `@chenglou/pretext`, browser-only | `core/text.ts` |
| `colorScales.*` (raster ramps) | none | **Exclude** — map-specific, not charting-general | — |
| `fetchData`, `dataPaths`, `createLeafletMap`, `cityState`, `submitFeedback`, `useMapVisibility`, `annotationStoryState` | n/a | **Exclude** — app/domain infra | — |

## Reconciliation designs (the "one canonical set")

### Number formatting (`core/utils.js`)
Make ddl's `formatNumber` the single compact formatter. Reconcile rounding:
- udc `formatCompactNumber`: `Number.isInteger ? toFixed(0) : toFixed(1)`, stops
  at `M`, no null guards.
- ddl `formatNumber`: supports `B`, sub-1, a `precision` arg, and null/NaN →
  `'N/A'` guards.

**Canonical:** keep ddl's signature and guards; adjust behavior so integer
results print clean (`45K`, not `45.00K`). Add `formatPercentage` and
`formatLocaleNumber` alongside, **with the same null/NaN guards** (udc's versions
lack them — a validation gap closed on the way in).

### Categorical color (`core/colors.js`) — deferred to its own task
Adopting udc's Okabe-Ito colorblind-safe palette and folding `getCountryColor`'s
cycle-with-opacity-decay into `createColorManager` was discussed but is **out of
scope for this task** (decision 3 in the working session: "not within scope").
Documented here so it isn't lost; revisit separately. Note it would change
rendered output of existing consumers → version bump warranted when done.

### Scales
`linearScale` excluded (see locked decision 4). No scale changes this pass.

## File-level changes in `ddl-charts`

- **New:** `src/core/layout.ts` — `resolveCollisions`, `beeswarmLayout`,
  `nearestPoint`. Top-level docstring per repo conventions. Re-export from
  `src/core/index.js`.
- **Edit:** `src/core/utils.js` — formatters reconciliation
  (`formatNumber` adjustment, add `formatPercentage`, `formatLocaleNumber`).
- **Edit:** `src/core/index.js` / `src/index.js` — wire up new exports.
- **Phase 3 (optional):** `src/core/text.ts` + add `@chenglou/pretext`.

## Tooling impact of introducing TypeScript

Because `package.json#main` currently ships raw `src/index.js`, adding `.ts`
files requires either a build step or consumer-side compilation. Minimum
additions:
- `typescript` devDependency + `tsconfig.json` (allowJs so `.ts` and `.js`
  coexist during migration).
- A build that emits JS + `.d.ts` (e.g. `tsc` or the existing Vite build), and
  update `package.json` `main`/`types`/`exports` to point at build output.
- vitest already runs via Vite, so `.ts` test/runtime resolution works without
  extra config; CI/build scripts need the emit step.

Keep this minimal: only the ported utilities need to be `.ts`; existing `.js`
files stay until there's reason to convert them.

## Sequencing

- **Phase 1 — `core/layout.ts` (mechanical, low-risk).** Port the three
  no-overlap utilities. Pure functions, immediate value, nothing to reconcile.
  Add minimal TS tooling (tsconfig + build wiring) as part of this phase.
- **Phase 2 — formatters reconciliation.** Adjust `formatNumber`, add
  `formatPercentage` / `formatLocaleNumber` with guards. Behavior change to a
  public API → note in README, coordinate version bump.
- **Phase 3 — (optional) `textMeasure`.** Only if label measurement is wanted in
  the library; pulls in `@chenglou/pretext` (browser-only).

Color-palette reconciliation is intentionally **not scheduled** here (out of
scope this task).

## Notes / risks

- `beeswarmLayout` is O(n²) (fine ≤250 pts, documented); `nearestPoint` is a
  linear scan — acceptable at chart-scale data. Keep perf notes in docstrings.
- udc formatters silently pass `null`/`NaN` through; ddl guards them. Reconcile
  toward the guarded behavior (safer canonical choice).
- Formatter behavior change is a public-API change → version note, not silent.

## Out of scope (explicitly)

- Any modification to `udc-frontend`.
- Porting the `.svelte` chart components.
- The Okabe-Ito color-palette / `createColorManager` reconciliation.
- Writing or porting unit tests.
- Rewiring `udc-frontend` to consume `ddl-charts`.
