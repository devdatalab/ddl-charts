# Plan: Add Line + Beeswarm charts to the ddl-charts catalogue

**Status:** Implemented (2026-06-02)
**Date:** 2026-06-02
**Branch:** `udc-frontend-integration` (or a fresh `catalogue-line-beeswarm`)
**Author:** Aryan Srivastava (with Claude)

## Why this exists

`ddl-charts` currently ships exactly one chart — `TrajectoryChart`. The goal of
this pass is to **expand the catalogue** with two more publication-quality D3
charts in the same imperative-factory style, document them in the README, and
show rendered visuals so consumers can see what they're getting before they
install.

This is **catalogue-only**. No changes to `udc-frontend`; no rewiring udc to
consume this library; no SSR/Svelte concerns. We are porting the *ideas* of
udc's beeswarm and line charts into ddl-charts' vanilla-D3 paradigm, reusing the
pure math already landed in `core/layout.js`.

## Locked decisions (from scoping session)

1. **Line chart — multi-series, interactive.** Matches `TrajectoryChart`
   richness: 1..N lines, legend, hover-highlight, optional end-of-line labels via
   `resolveCollisions`, `initialHighlights`. A single-series chart is just N=1.
2. **Beeswarm — single configurable track.** One horizontal track with
   background / highlighted / hovered dot layers, optional median line, axis, and
   tooltip. Multi-track figures are composed by instantiating multiple charts;
   the scatter↔beeswarm view toggle is **out of scope** this pass.
3. **README visuals — Playwright screenshots.** Build one example HTML per chart,
   render headless via the already-available Playwright, commit PNGs under
   `docs/assets/`, embed in the README.
4. **No `udc-frontend` changes.** No SSR, no Svelte, no D3-removal concerns here.
5. **Additive only.** Nothing in this pass changes the rendered output or public
   API of `TrajectoryChart` or existing `core`/`components` exports.

## Conventions to follow (from the existing codebase)

- Factory naming: `createLineChart`, `createBeeswarmChart` (mirrors
  `createTrajectoryChart`). Export via `src/charts/index.js`.
- Each chart: `create*(parent, data, options = {})` builds DOM with d3, returns
  an instance object exposing update methods (see `TrajectoryChart.js:638`).
- Reuse, do **not** re-create: `createContainer` (`components/Container.js`),
  `createLinearScale` (`core/scales.js`), `createXAxis`/`createYAxis`
  (`core/axes.js`, grid via `grid: true`), `createTooltip`/`showTooltip`/
  `hideTooltip`/`positionTooltip` (`components/Tooltip.js`), `createColorManager`
  (`core/colors.js`), and from `core/layout.js`: `beeswarmLayout`,
  `nearestPoint`, `resolveCollisions`.
- Top-level docstring on every new file (repo convention / global CLAUDE.md).

## Color handling (the one shared decision)

Both new charts need a categorical palette. To stay **additive and
non-breaking**:

- Reuse `createColorManager` from `core/colors.js` for highlight state.
- Default to the existing `HIGHLIGHT_COLORS` palette so nothing else changes.
- **Optional, additive:** export an `OKABE_ITO` palette constant (the
  colorblind-safe 8-color set udc uses) from `core/colors.js` and let the new
  charts accept `options.palette` (default `HIGHLIGHT_COLORS`). Adding a new
  exported constant does not alter any existing consumer.
- The deferred "fold Okabe-Ito into `createColorManager` as the default" work
  from `udc-utilities-integration.md` stays deferred — it's a breaking change and
  not needed to ship these charts.

## File-level changes

**New chart implementations**
- `src/charts/LineChart.js` — `createLineChart(parent, data, options)`.
- `src/charts/BeeswarmChart.js` — `createBeeswarmChart(parent, data, options)`.
- `src/charts/index.js` — add `export * from './LineChart.js'` and
  `'./BeeswarmChart.js'`.

**Optional additive core export**
- `src/core/colors.js` — add `OKABE_ITO` palette constant (additive).

**Examples (also serve as screenshot sources)**
- `examples/line_chart.html`
- `examples/beeswarm.html`
- `examples/data/line_chart_sample.json` — **synthetic** multi-series time
  series (~6–10 series). Do not read udc data; hand-author plausible values
  (e.g. urban-share-style %, monotonic-ish trends with realistic noise) good
  enough to exercise legend, highlights, and de-collided end labels.
- `examples/data/beeswarm_sample.json` — **synthetic** per-entity single metric
  (~80–180 items so the swarm visibly stacks). Hand-author a realistic
  distribution (e.g. skewed, with a handful of named highlights) rather than
  copying any source dataset.

**Visuals tooling**
- `scripts/render-examples.mjs` — Playwright script: serve `examples/`, load each
  example HTML, wait for render, screenshot the chart node to `docs/assets/*.png`.
  Add an npm script `"render:examples"`. (Keeps image generation reproducible
  rather than a one-off manual screenshot.)
- `docs/assets/line-chart.png`, `docs/assets/beeswarm-chart.png` — committed
  output.

**Docs**
- `README.md` — see "README updates" below.

## API designs

### `createLineChart(parent, data, options)`

```js
const chart = createLineChart(container, data, {
  height: 500,
  margin: { top: 30, right: 120, bottom: 50, left: 70 },
  xKey: 'year',              // accessor key on each point
  yKey: 'value',
  showLegend: true,
  showLabels: true,          // end-of-line labels, de-collided
  showGrid: true,
  initialHighlights: ['USA', 'IND'],
  palette: HIGHLIGHT_COLORS, // optional
  yZeroBaseline: false,      // force y-domain to start at 0
  curve: 'linear',           // 'linear' | 'cardinal'
});
```

**Data shape**
```json
{
  "metadata": { "title": "...", "xAxisLabel": "Year", "yAxisLabel": "Share (%)" },
  "series": [
    { "id": "USA", "name": "United States",
      "points": [ { "year": 1975, "value": 73.7 }, { "year": 2020, "value": 82.7 } ] }
  ]
}
```

**Build steps (reuses existing primitives)**
1. `createContainer` → `{ container, svg, chartArea, dimensions }`.
2. x scale: `createLinearScale` (or `createTimeScale` if x is a Date) over the
   union x-extent; y scale: `createLinearScale`, padded, optional zero baseline.
3. `createXAxis` / `createYAxis` with `grid: showGrid`.
4. `colorManager = createColorManager(initialHighlights)` (with `palette`).
5. One `<g class="series-group">` per series: an invisible wide hit-area path +
   the visible `d3.line()` path. Highlighted = full opacity/width; others dimmed.
6. If `showLabels`: compute each series' final-point y, run `resolveCollisions`
   (`core/layout.js`) on those y's with a min-gap, render labels in the right
   margin.
7. Hover: snap to nearest series point with `nearestPoint` for a marker dot +
   tooltip; dim non-hovered, protect active highlights (mirror
   `TrajectoryChart`'s active-state hover logic).
8. Optional legend via `createLegend` or the inline pattern from
   `TrajectoryChart` (click to toggle highlight).
9. Return `{ container, svg, colorManager, toggleHighlight, updateAll }`.

**Single-series usage** = pass `series: [one]`, `showLegend: false`,
`showLabels: false` → equivalent to udc's `PopulationHistoryChart`.

### `createBeeswarmChart(parent, data, options)`

```js
const chart = createBeeswarmChart(container, data, {
  height: 240,
  margin: { top: 30, right: 30, bottom: 40, left: 30 },
  valueKey: 'value',
  idKey: 'id',
  label: 'Night lights (nW/cm²/sr)',
  dotRadius: 3,
  rowSpacing: 7.25,          // passed to beeswarmLayout
  highlights: ['USA', 'CHN', 'IND'],
  showMedian: true,
  hoverSnapRadius: 13,
  palette: HIGHLIGHT_COLORS, // optional
});
```

**Data shape**
```json
{
  "metadata": { "title": "...", "axisLabel": "Night lights" },
  "items": [ { "id": "USA", "name": "United States", "value": 41.2 } ]
}
```

**Build steps**
1. `createContainer`.
2. Filter non-finite values (documented requirement of `beeswarmLayout`); warn on
   drops (parity with udc's `console.warn`).
3. x scale: `createLinearScale` over `[min, max]` (nice-rounded).
4. `beeswarmLayout(values, xScale, dotRadius, trackCenterY, rowSpacing)` from
   `core/layout.js` → `{x, y}[]` in input order.
5. `createXAxis` below the track; optional median reference line + "median"
   label (compute median inline — small helper, no new dep).
6. Render three dot layers (mirror udc's `Scatter` ordering): background
   (non-highlighted, dimmed on hover), highlighted (full), hovered overlay
   (larger stroked circle, `pointer-events: none`).
7. Hover: SVG-level `mousemove` → screen coords → `nearestPoint(plotted, …,
   hoverSnapRadius)` → set hovered id → tooltip via `showTooltip` /
   `positionTooltip`.
8. Optional small legend/swatch row for highlighted entities.
9. Return `{ container, svg, setHighlights, update }`.

**Multi-track** (e.g. udc's two-track figure) = instantiate two
`createBeeswarmChart` in stacked containers. A shared-hover wrapper can come
later if needed; explicitly not built now.

## README updates

Add to `README.md`:
- Update the architecture tree: `charts/` now lists `LineChart.js`,
  `BeeswarmChart.js`, `TrajectoryChart.js`.
- New **"Charts"** catalogue section with one subsection each:
  `## LineChart`, `## BeeswarmChart` — purpose, embedded screenshot, minimal
  usage snippet, the data-format JSON, and the options table.
- Embed visuals:
  ```markdown
  ![Line chart example](docs/assets/line-chart.png)
  ![Beeswarm chart example](docs/assets/beeswarm-chart.png)
  ```
- Fix the existing usage example that calls `TrajectoryChart(...)` — the actual
  export is `createTrajectoryChart`. Align the new examples to the real names
  (`createLineChart`, `createBeeswarmChart`) and, while here, correct the
  Trajectory snippet so the README is runnable.

## Sequencing

1. **`createLineChart`** (largest piece; exercises legend/labels/hover patterns
   that beeswarm reuses). Build, wire export, build `examples/line_chart.html` +
   sample data.
2. **`createBeeswarmChart`** (reuses container/axis/tooltip/colors from step 1;
   adds the beeswarm dot layers). Build, wire export, build `examples/beeswarm.html`
   + sample data.
3. **`OKABE_ITO`** additive export in `core/colors.js` *if* we want
   colorblind-safe defaults in the examples (optional).
4. **`scripts/render-examples.mjs`** + generate `docs/assets/*.png`.
5. **README** — catalogue sections, embedded images, Trajectory snippet fix.

## Verification

- `examples/line_chart.html` and `examples/beeswarm.html` render correctly in a
  browser (`npm run dev`), including hover, legend toggle, and labels.
- `npm run render:examples` produces non-empty PNGs in `docs/assets/`.
- README images resolve (relative paths correct for GitHub rendering).
- No regression in existing `TrajectoryChart` example or `npm test`
  (existing suites still pass; this pass adds no tests — see note).

## Notes / risks / concerns

- **Tests:** existing charts have `.test.js` files. Per global CLAUDE.md, **ask
  before adding tests** — flagged here, not assumed. The pure math
  (`beeswarmLayout`, `nearestPoint`, `resolveCollisions`) is already test-worthy
  and reused; new chart factories are DOM-heavy and harder to unit-test.
- **Performance:** `beeswarmLayout` is O(n²) (documented, fine ≤250 points);
  `nearestPoint` is a linear scan. Both acceptable at chart scale. Note in
  docstrings; if a sample dataset exceeds ~250 points, downsample for the example.
- **Edge cases to handle explicitly:** empty `series`/`items`; all-equal x or y
  (degenerate domain → guard divide-by-zero in scales); non-finite values
  (filter + warn); single data point (no line segment, just a marker);
  highlight ids absent from the data (ignore gracefully).
- **Validation gap to close on the way in:** udc's chart code silently passes
  `null`/`NaN`; mirror the guarded approach used elsewhere in ddl-charts (filter
  + `console.warn`), don't propagate NaN into the DOM.
- **Image weight:** keep screenshots reasonably sized (e.g. ≤ ~1400px wide,
  PNG) so the repo doesn't bloat. Consider a fixed example width for stable,
  reproducible screenshots.
- **`package.json#main` ships raw source** — examples import from `../src/...`
  directly (same as `city_gdp_pm25.html`), so no build step is required for this
  pass.

## Out of scope (explicitly)

- Any `udc-frontend` change; SSR; removing D3 from anything.
- The beeswarm↔scatter view toggle and linked multi-track hover.
- Folding Okabe-Ito into `createColorManager` as the breaking default.
- Writing/porting unit tests (pending the CLAUDE.md "ask first" conversation).
- Publishing / version bump (additive, but coordinate a minor bump when released
  since the public catalogue grows).
