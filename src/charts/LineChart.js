/**
 * Multi-series interactive line chart factory for the ddl-charts catalogue.
 *
 * Renders 1..N time series as D3 line paths in the same imperative-factory
 * style as `createTrajectoryChart`: build DOM up front, return an instance
 * object exposing update methods. Highlighted series are drawn in full colour
 * and raised; non-highlighted series are muted, mirroring the Trajectory
 * chart's "active state" model. Supports a clickable legend, hover that snaps
 * to the nearest series point, and optional de-collided end-of-line labels.
 *
 * A single-series chart is just the N=1 case (pass `showLegend: false`,
 * `showLabels: false`).
 *
 * Reuses existing primitives rather than re-implementing them:
 *  - `createContainer` (components/Container.js) for the responsive SVG shell
 *  - `createLinearScale` (core/scales.js) for x/y scales
 *  - `createXAxis` / `createYAxis` (core/axes.js) for OWID-styled axes + grid
 *  - `createColorManager` (core/colors.js) for highlight state
 *  - `nearestPoint` / `resolveCollisions` (core/layout.js) for hover + labels
 *  - `createTooltip` / `showTooltip` / `hideTooltip` / `positionTooltip`
 *    (components/Tooltip.js)
 *
 * Upstream dependencies: d3, core/scales, core/axes, core/colors, core/layout,
 * components/Container, components/Tooltip.
 */

import * as d3 from 'd3';
import { createLinearScale } from '../core/scales.js';
import { createXAxis, createYAxis } from '../core/axes.js';
import {
  createColorManager,
  HIGHLIGHT_COLORS,
  MUTED_COLORS,
  UI_COLORS,
} from '../core/colors.js';
import { nearestPoint, resolveCollisions } from '../core/layout.js';
import { createContainer } from '../components/Container.js';
import {
  createTooltip,
  showTooltip,
  hideTooltip,
  positionTooltip,
} from '../components/Tooltip.js';

/**
 * Creates a multi-series line chart.
 *
 * @param {d3.Selection} parent - Parent element to append the chart to.
 * @param {Object} data - Chart data.
 * @param {Object} [data.metadata] - Title and axis labels.
 * @param {string} [data.metadata.title]
 * @param {string} [data.metadata.xAxisLabel]
 * @param {string} [data.metadata.yAxisLabel]
 * @param {Array<{id:string,name?:string,points:Array<Object>}>} data.series -
 *   One entry per line; each `points` element carries `xKey` and `yKey`.
 * @param {Object} [options] - Configuration options.
 * @param {number} [options.width] - Fixed width (defaults to container width).
 * @param {number} [options.height=500] - Chart height in px.
 * @param {Object} [options.margin] - Chart margins.
 * @param {string} [options.xKey='year'] - Accessor key for the x value on each point.
 * @param {string} [options.yKey='value'] - Accessor key for the y value on each point.
 * @param {boolean} [options.showLegend=true] - Render a clickable legend.
 * @param {boolean} [options.showLabels=true] - Render de-collided end-of-line labels.
 * @param {boolean} [options.showGrid=true] - Draw axis grid lines.
 * @param {string[]} [options.initialHighlights] - Series ids highlighted on load.
 * @param {string[]} [options.palette=HIGHLIGHT_COLORS] - Categorical palette for highlighted series.
 * @param {boolean} [options.yZeroBaseline=false] - Force the y-domain to start at 0.
 * @param {('linear'|'cardinal')} [options.curve='linear'] - Line interpolation.
 * @param {number} [options.hoverSnapRadius=40] - Max px distance for hover snapping.
 * @param {Function} [options.xTickFormat] - Custom x tick formatter.
 * @param {Function} [options.yTickFormat] - Custom y tick formatter.
 * @returns {Object} Chart instance: { container, svg, colorManager, toggleHighlight, updateAll }.
 */
export function createLineChart(parent, data, options = {}) {
  const {
    width,
    height = 500,
    margin = { top: 30, right: 140, bottom: 50, left: 70 },
    xKey = 'year',
    yKey = 'value',
    showLegend = true,
    showLabels = true,
    showGrid = true,
    initialHighlights,
    palette = HIGHLIGHT_COLORS,
    yZeroBaseline = false,
    curve = 'linear',
    hoverSnapRadius = 40,
    xTickFormat,
    yTickFormat,
  } = options;

  const metadata = data?.metadata ?? {};
  const series = Array.isArray(data?.series) ? data.series : [];

  // Default highlights: first three series if not specified.
  const defaultHighlights = series.slice(0, 3).map((s) => s.id);
  const highlights = initialHighlights ?? defaultHighlights;

  // --- Container -----------------------------------------------------------
  const { container, svg, chartArea, dimensions } = createContainer(parent, {
    width,
    height,
    margin,
  });

  // Guard: nothing to draw.
  if (series.length === 0) {
    console.warn('[createLineChart] No series provided; rendering empty chart.');
    return { container, svg, colorManager: createColorManager([]), toggleHighlight() {}, updateAll() {} };
  }

  // --- Highlight state + colour resolution ---------------------------------
  // Reuse createColorManager for highlight STATE; resolve display colours from
  // `palette` ourselves so a custom palette is honoured without mutating
  // core/colors.js. Highlighted series get a stable palette colour assigned in
  // first-highlighted order; non-highlighted series render muted grey.
  const colorManager = createColorManager(highlights);
  const colorAssignments = new Map();
  let nextColorIndex = 0;

  function assignColor(id) {
    if (!colorAssignments.has(id)) {
      colorAssignments.set(id, palette[nextColorIndex % palette.length]);
      nextColorIndex++;
    }
    return colorAssignments.get(id);
  }
  // Pre-assign colours to initial highlights in declared order for stability.
  highlights.forEach((id) => assignColor(id));

  function seriesColor(id) {
    if (colorManager.isHighlighted(id)) return assignColor(id);
    return MUTED_COLORS.line;
  }

  // --- Accessors + extents -------------------------------------------------
  const getX = (p) => p[xKey];
  const getY = (p) => p[yKey];

  const allPoints = series.flatMap((s) => (Array.isArray(s.points) ? s.points : []));
  const finitePoints = allPoints.filter((p) => Number.isFinite(getX(p)) && Number.isFinite(getY(p)));
  if (finitePoints.length < allPoints.length) {
    console.warn(
      `[createLineChart] Dropped ${allPoints.length - finitePoints.length} non-finite point(s).`
    );
  }

  let xMin = d3.min(finitePoints, getX);
  let xMax = d3.max(finitePoints, getX);
  let yMin = d3.min(finitePoints, getY);
  let yMax = d3.max(finitePoints, getY);

  // Degenerate-domain guards (all-equal x or y).
  if (xMin === xMax) {
    xMin -= 1;
    xMax += 1;
  }
  if (yMin === yMax) {
    yMin -= 1;
    yMax += 1;
  }
  if (yZeroBaseline) yMin = Math.min(0, yMin);

  const xScale = createLinearScale({
    domain: [xMin, xMax],
    range: [0, dimensions.innerWidth],
  });

  const yScale = createLinearScale({
    domain: [yMin, yMax],
    range: [dimensions.innerHeight, 0],
    padding: yZeroBaseline ? 0 : 0.05,
    nice: true,
  });

  // --- Axes ----------------------------------------------------------------
  createXAxis(chartArea, xScale, {
    y: dimensions.innerHeight,
    label: metadata.xAxisLabel,
    tickFormat: xTickFormat ?? ((d) => d3.format('d')(d)),
    grid: showGrid,
    gridHeight: dimensions.innerHeight,
  });

  createYAxis(chartArea, yScale, {
    x: 0,
    label: metadata.yAxisLabel,
    labelX: -55,
    tickFormat: yTickFormat,
    grid: showGrid,
    gridWidth: dimensions.innerWidth,
  });

  // --- Line generator ------------------------------------------------------
  const line = d3
    .line()
    .defined((p) => Number.isFinite(getX(p)) && Number.isFinite(getY(p)))
    .x((p) => xScale(getX(p)))
    .y((p) => yScale(getY(p)))
    .curve(curve === 'cardinal' ? d3.curveCardinal.tension(0.5) : d3.curveLinear);

  // Layer for all series so labels/hover marker sit above the grid.
  const seriesLayer = chartArea.append('g').attr('class', 'series-layer');

  // Sort so highlighted series render last (on top).
  const sortedSeries = [...series].sort((a, b) => {
    const aH = colorManager.isHighlighted(a.id) ? 1 : 0;
    const bH = colorManager.isHighlighted(b.id) ? 1 : 0;
    return aH - bH;
  });

  // Build per-series groups.
  sortedSeries.forEach((s) => {
    const points = (Array.isArray(s.points) ? s.points : []).filter(
      (p) => Number.isFinite(getX(p)) && Number.isFinite(getY(p))
    );
    const highlighted = colorManager.isHighlighted(s.id);
    const color = seriesColor(s.id);

    const g = seriesLayer
      .append('g')
      .attr('class', 'series-group')
      .attr('data-series-id', s.id)
      .datum({ ...s, points });

    // Invisible wide hit-area for easier hovering.
    g.append('path')
      .attr('class', 'series-hit-area')
      .attr('d', line(points))
      .style('fill', 'none')
      .style('stroke', 'transparent')
      .style('stroke-width', 16)
      .style('pointer-events', 'stroke');

    // Visible line.
    g.append('path')
      .attr('class', 'series-line')
      .attr('d', line(points))
      .style('fill', 'none')
      .style('stroke', color)
      .style('stroke-width', highlighted ? 2.5 : 1.25)
      .style('stroke-opacity', highlighted ? 1 : 0.5)
      .style('pointer-events', 'none')
      .style('transition', 'stroke-width 0.15s ease, stroke-opacity 0.15s ease, stroke 0.15s ease');

    // End marker (also the sole visible mark for single-point series).
    const last = points[points.length - 1];
    if (last) {
      g.append('circle')
        .attr('class', 'series-end-marker')
        .attr('cx', xScale(getX(last)))
        .attr('cy', yScale(getY(last)))
        .attr('r', highlighted ? 3.5 : 2.5)
        .style('fill', color)
        .style('opacity', highlighted ? 1 : 0.5)
        .style('pointer-events', 'none')
        .style('transition', 'all 0.15s ease');
    }
  });

  // --- End-of-line labels (de-collided) ------------------------------------
  let labelLayer = null;
  if (showLabels) {
    labelLayer = chartArea.append('g').attr('class', 'series-labels');
  }

  // Flattened point index for hover hit-testing. `id` encodes series + index.
  const plotted = [];
  const plottedLookup = new Map();
  series.forEach((s) => {
    const points = (Array.isArray(s.points) ? s.points : []).filter(
      (p) => Number.isFinite(getX(p)) && Number.isFinite(getY(p))
    );
    points.forEach((p, i) => {
      const pid = `${s.id}__${i}`;
      const entry = { id: pid, x: xScale(getX(p)), y: yScale(getY(p)) };
      plotted.push(entry);
      plottedLookup.set(pid, { series: s, point: p });
    });
  });

  // --- Tooltip + hover marker ----------------------------------------------
  createTooltip(container);
  const hoverMarker = chartArea
    .append('circle')
    .attr('class', 'line-hover-marker')
    .attr('r', 4.5)
    .style('fill', 'white')
    .style('stroke-width', 2)
    .style('pointer-events', 'none')
    .style('opacity', 0);

  // Render or refresh end-of-line labels for the highlighted series. Only
  // highlighted series are labelled to keep the right margin uncluttered;
  // their final-point y positions are de-collided via `resolveCollisions`.
  function renderLabels() {
    if (!labelLayer) return;
    labelLayer.selectAll('*').remove();

    // Final-point y for each highlighted series (skip empties).
    const entries = series
      .filter((s) => colorManager.isHighlighted(s.id))
      .map((s) => {
        const points = (Array.isArray(s.points) ? s.points : []).filter(
          (p) => Number.isFinite(getX(p)) && Number.isFinite(getY(p))
        );
        const last = points[points.length - 1];
        if (!last) return null;
        return { id: s.id, name: s.name ?? s.id, y: yScale(getY(last)) };
      })
      .filter(Boolean);

    if (entries.length === 0) return;

    const adjustedY = resolveCollisions(entries.map((e) => e.y), 14);

    entries.forEach((e, i) => {
      labelLayer
        .append('text')
        .attr('x', dimensions.innerWidth + 8)
        .attr('y', adjustedY[i])
        .attr('dy', '0.32em')
        .style('font-family', 'Lato, "Helvetica Neue", Helvetica, Arial, sans-serif')
        .style('font-size', '11px')
        .style('font-weight', '600')
        .style('fill', seriesColor(e.id))
        .text(e.name);
    });
  }

  // Re-style every series + labels from current highlight state.
  function updateAll() {
    seriesLayer.selectAll('.series-group').each(function () {
      const g = d3.select(this);
      const s = g.datum();
      const highlighted = colorManager.isHighlighted(s.id);
      const color = seriesColor(s.id);

      g.select('.series-line')
        .style('stroke', color)
        .style('stroke-width', highlighted ? 2.5 : 1.25)
        .style('stroke-opacity', highlighted ? 1 : 0.5);

      g.select('.series-end-marker')
        .style('fill', color)
        .attr('r', highlighted ? 3.5 : 2.5)
        .style('opacity', highlighted ? 1 : 0.5);
    });

    // Bring highlighted series to the front.
    seriesLayer
      .selectAll('.series-group')
      .sort((a, b) => {
        const aH = colorManager.isHighlighted(a.id) ? 1 : 0;
        const bH = colorManager.isHighlighted(b.id) ? 1 : 0;
        return aH - bH;
      });

    renderLabels();
  }

  // --- Hover interaction (snap to nearest point) ---------------------------
  svg
    .on('mousemove', function (event) {
      const [mx, my] = d3.pointer(event, chartArea.node());
      const hitId = nearestPoint(plotted, mx, my, hoverSnapRadius);

      if (!hitId) {
        hoverMarker.style('opacity', 0);
        hideTooltip(container);
        // Restore base styling.
        seriesLayer.selectAll('.series-line').each(function () {
          const g = d3.select(this.parentNode);
          const s = g.datum();
          const highlighted = colorManager.isHighlighted(s.id);
          d3.select(this).style('stroke-opacity', highlighted ? 1 : 0.5);
        });
        return;
      }

      const { series: hs, point } = plottedLookup.get(hitId);
      const color = colorManager.isHighlighted(hs.id) ? seriesColor(hs.id) : MUTED_COLORS.lineHover;

      // Emphasise hovered series; protect other active highlights.
      seriesLayer.selectAll('.series-group').each(function () {
        const g = d3.select(this);
        const s = g.datum();
        const isHovered = s.id === hs.id;
        const active = colorManager.isHighlighted(s.id);
        if (isHovered) {
          g.select('.series-line').style('stroke-opacity', 1).style('stroke-width', active ? 3 : 2);
          g.raise();
        } else if (active) {
          // Keep visible (do nothing).
        } else {
          g.select('.series-line').style('stroke-opacity', 0.12);
        }
      });

      hoverMarker
        .attr('cx', xScale(getX(point)))
        .attr('cy', yScale(getY(point)))
        .style('stroke', color)
        .style('opacity', 1)
        .raise();

      const name = hs.name ?? hs.id;
      const yVal = getY(point);
      const yLabel = metadata.yAxisLabel ? `${metadata.yAxisLabel}: ` : '';
      showTooltip(
        container,
        `<div style="font-weight:600;margin-bottom:4px;">${name}</div>` +
          `<div style="font-size:12px;color:${UI_COLORS.textLight};">${getX(point)}</div>` +
          `<div style="font-size:13px;">${yLabel}<strong>${formatValue(yVal)}</strong></div>`
      );
      const [cx, cy] = d3.pointer(event, container.node());
      positionTooltip(container, cx, cy, { preferAbove: true });
    })
    .on('mouseleave', function () {
      hoverMarker.style('opacity', 0);
      hideTooltip(container);
      updateAll();
    });

  function formatValue(v) {
    if (!Number.isFinite(v)) return '—';
    return Number.isInteger(v) ? String(v) : v.toFixed(1);
  }

  // --- Legend --------------------------------------------------------------
  if (showLegend) {
    const legend = container
      .append('div')
      .attr('class', 'line-legend')
      .style('position', 'absolute')
      .style('top', `${margin.top + 6}px`)
      .style('right', '12px')
      .style('max-height', `${dimensions.innerHeight}px`)
      .style('overflow-y', 'auto')
      .style('background', 'rgba(255,255,255,0.85)')
      .style('border-radius', '4px')
      .style('padding', '4px 0');

    // Highlighted series first, then the rest alphabetically by name.
    const legendSeries = [...series].sort((a, b) => {
      const aH = colorManager.isHighlighted(a.id) ? 0 : 1;
      const bH = colorManager.isHighlighted(b.id) ? 0 : 1;
      if (aH !== bH) return aH - bH;
      return (a.name ?? a.id).localeCompare(b.name ?? b.id);
    });

    legendSeries.forEach((s) => {
      const item = legend
        .append('div')
        .attr('class', 'line-legend-item')
        .attr('data-series-id', s.id)
        .style('display', 'flex')
        .style('align-items', 'center')
        .style('gap', '7px')
        .style('padding', '3px 12px')
        .style('cursor', 'pointer')
        .style('white-space', 'nowrap');

      item
        .append('span')
        .attr('class', 'line-legend-swatch')
        .style('width', '12px')
        .style('height', '12px')
        .style('border-radius', '2px')
        .style('flex-shrink', 0);

      item
        .append('span')
        .attr('class', 'line-legend-label')
        .style('font-family', 'Lato, "Helvetica Neue", Helvetica, Arial, sans-serif')
        .style('font-size', '12px')
        .text(s.name ?? s.id);

      item.on('click', () => {
        colorManager.toggleHighlight(s.id);
        updateAll();
        updateLegend();
      });
    });

    function updateLegend() {
      legend.selectAll('.line-legend-item').each(function () {
        const item = d3.select(this);
        const id = item.attr('data-series-id');
        const highlighted = colorManager.isHighlighted(id);
        item
          .select('.line-legend-swatch')
          .style('background-color', highlighted ? seriesColor(id) : MUTED_COLORS.line)
          .style('opacity', highlighted ? 1 : 0.5);
        item
          .select('.line-legend-label')
          .style('font-weight', highlighted ? '600' : '400')
          .style('color', highlighted ? UI_COLORS.text : UI_COLORS.textLight);
      });
    }

    updateLegend();
  }

  // Initial label render.
  renderLabels();

  return {
    container,
    svg,
    colorManager,
    toggleHighlight: (id) => {
      colorManager.toggleHighlight(id);
      updateAll();
    },
    updateAll,
  };
}
