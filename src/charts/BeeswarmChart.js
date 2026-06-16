/**
 * Single-track beeswarm (1D dot strip) chart factory for the ddl-charts
 * catalogue.
 *
 * Plots one value per entity along a horizontal axis, packing overlapping dots
 * into stacked rows via the deterministic `beeswarmLayout` already landed in
 * core/layout.js. Built in the same imperative-factory style as the other
 * charts: construct DOM up front, return an instance object with update
 * methods. A handful of entities can be highlighted (coloured + raised); the
 * rest render as muted background dots. Hover snaps to the nearest dot via
 * `nearestPoint` and shows a tooltip.
 *
 * Multi-track figures are composed by instantiating several charts in stacked
 * containers — the scatter<->beeswarm toggle and linked cross-track hover are
 * intentionally out of scope here.
 *
 * Reuses existing primitives:
 *  - `createContainer` (components/Container.js)
 *  - `createLinearScale` (core/scales.js)
 *  - `createXAxis` (core/axes.js)
 *  - `createColorManager` (core/colors.js) for highlight state
 *  - `beeswarmLayout` / `nearestPoint` (core/layout.js)
 *  - `createTooltip` / `showTooltip` / `hideTooltip` / `positionTooltip`
 *    (components/Tooltip.js)
 *
 * Upstream dependencies: d3, core/scales, core/axes, core/colors, core/layout,
 * components/Container, components/Tooltip.
 */

import * as d3 from 'd3';
import { createLinearScale } from '../core/scales.js';
import { createXAxis } from '../core/axes.js';
import {
  createColorManager,
  HIGHLIGHT_COLORS,
  MUTED_COLORS,
  UI_COLORS,
} from '../core/colors.js';
import { beeswarmLayout, nearestPoint } from '../core/layout.js';
import { createContainer } from '../components/Container.js';
import {
  createTooltip,
  showTooltip,
  hideTooltip,
  positionTooltip,
} from '../components/Tooltip.js';

/**
 * Creates a single-track beeswarm chart.
 *
 * @param {d3.Selection} parent - Parent element to append the chart to.
 * @param {Object} data - Chart data.
 * @param {Object} [data.metadata] - Title and axis label.
 * @param {string} [data.metadata.title]
 * @param {string} [data.metadata.axisLabel]
 * @param {Array<Object>} data.items - One entry per dot; carries `idKey` and `valueKey`.
 * @param {Object} [options] - Configuration options.
 * @param {number} [options.width] - Fixed width (defaults to container width).
 * @param {number} [options.height=240] - Chart height in px.
 * @param {Object} [options.margin] - Chart margins.
 * @param {string} [options.valueKey='value'] - Accessor key for the numeric value.
 * @param {string} [options.idKey='id'] - Accessor key for the stable id.
 * @param {string} [options.nameKey='name'] - Accessor key for the display name.
 * @param {string} [options.label] - Axis label (falls back to metadata.axisLabel).
 * @param {number} [options.dotRadius=3] - Dot radius in px.
 * @param {number} [options.rowSpacing] - Vertical row spacing (default dotRadius*2.2 inside layout).
 * @param {string[]} [options.highlights=[]] - Ids to highlight.
 * @param {boolean} [options.showMedian=true] - Draw a median reference line.
 * @param {number} [options.hoverSnapRadius=13] - Max px distance for hover snapping.
 * @param {string[]} [options.palette=HIGHLIGHT_COLORS] - Categorical palette for highlights.
 * @param {Function} [options.valueFormat] - Custom value formatter for tooltip/median.
 * @param {Function} [options.tickFormat] - Custom x tick formatter.
 * @returns {Object} Chart instance: { container, svg, setHighlights, update }.
 */
export function createBeeswarmChart(parent, data, options = {}) {
  const {
    width,
    height = 240,
    margin = { top: 30, right: 30, bottom: 56, left: 30 },
    valueKey = 'value',
    idKey = 'id',
    nameKey = 'name',
    label,
    dotRadius = 3,
    rowSpacing,
    highlights = [],
    showMedian = true,
    hoverSnapRadius = 13,
    palette = HIGHLIGHT_COLORS,
    valueFormat,
    tickFormat,
  } = options;

  const metadata = data?.metadata ?? {};
  const axisLabel = label ?? metadata.axisLabel;
  const rawItems = Array.isArray(data?.items) ? data.items : [];

  const getValue = (d) => d[valueKey];
  const getId = (d) => d[idKey];
  const getName = (d) => d[nameKey] ?? d[idKey];

  // --- Container -----------------------------------------------------------
  const { container, svg, chartArea, dimensions } = createContainer(parent, {
    width,
    height,
    margin,
  });

  // --- Filter non-finite values (documented requirement of beeswarmLayout) --
  const items = rawItems.filter((d) => Number.isFinite(getValue(d)));
  if (items.length < rawItems.length) {
    console.warn(
      `[createBeeswarmChart] Dropped ${rawItems.length - items.length} item(s) with non-finite values.`
    );
  }

  if (items.length === 0) {
    console.warn('[createBeeswarmChart] No finite items provided; rendering empty chart.');
    return { container, svg, setHighlights() {}, update() {} };
  }

  // --- Highlight state + colour resolution ---------------------------------
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
  highlights.forEach((id) => assignColor(id));
  function itemColor(id) {
    if (colorManager.isHighlighted(id)) return assignColor(id);
    return MUTED_COLORS.line;
  }

  // --- Scale ---------------------------------------------------------------
  const values = items.map(getValue);
  let vMin = d3.min(values);
  let vMax = d3.max(values);
  if (vMin === vMax) {
    vMin -= 1;
    vMax += 1;
  }

  const xScale = createLinearScale({
    domain: [vMin, vMax],
    range: [0, dimensions.innerWidth],
    nice: true,
  });

  // --- Beeswarm packing ----------------------------------------------------
  const trackCenterY = dimensions.innerHeight / 2;
  const positions = beeswarmLayout(values, xScale, dotRadius, trackCenterY, rowSpacing);

  // Combine source items with their packed positions; keep input order.
  const dots = items.map((d, i) => ({
    item: d,
    id: getId(d),
    x: positions[i].x,
    y: positions[i].y,
  }));

  // --- Axis ----------------------------------------------------------------
  createXAxis(chartArea, xScale, {
    y: dimensions.innerHeight,
    label: axisLabel,
    tickFormat,
    grid: false,
  });

  // --- Median reference line -----------------------------------------------
  if (showMedian) {
    const median = d3.median(values);
    const mx = xScale(median);
    const medianGroup = chartArea.append('g').attr('class', 'beeswarm-median');

    medianGroup
      .append('line')
      .attr('x1', mx)
      .attr('x2', mx)
      .attr('y1', -4)
      .attr('y2', dimensions.innerHeight)
      .style('stroke', UI_COLORS.text)
      .style('stroke-width', 1)
      .style('stroke-dasharray', '3,3')
      .style('opacity', 0.6);

    medianGroup
      .append('text')
      .attr('x', mx)
      .attr('y', -8)
      .attr('text-anchor', 'middle')
      .style('font-family', 'Lato, "Helvetica Neue", Helvetica, Arial, sans-serif')
      .style('font-size', '10px')
      .style('fill', UI_COLORS.textLight)
      .text(`median ${formatValue(median)}`);
  }

  // --- Dot layers (background -> highlighted -> hovered) --------------------
  const backgroundLayer = chartArea.append('g').attr('class', 'beeswarm-background');
  const highlightLayer = chartArea.append('g').attr('class', 'beeswarm-highlight');
  const hoverLayer = chartArea.append('g').attr('class', 'beeswarm-hover');

  function renderDots() {
    backgroundLayer.selectAll('circle').remove();
    highlightLayer.selectAll('circle').remove();

    const background = dots.filter((d) => !colorManager.isHighlighted(d.id));
    const highlighted = dots.filter((d) => colorManager.isHighlighted(d.id));

    backgroundLayer
      .selectAll('circle')
      .data(background, (d) => d.id)
      .join('circle')
      .attr('cx', (d) => d.x)
      .attr('cy', (d) => d.y)
      .attr('r', dotRadius)
      .style('fill', MUTED_COLORS.line)
      .style('stroke', 'none');

    highlightLayer
      .selectAll('circle')
      .data(highlighted, (d) => d.id)
      .join('circle')
      .attr('cx', (d) => d.x)
      .attr('cy', (d) => d.y)
      .attr('r', dotRadius + 0.5)
      .style('fill', (d) => itemColor(d.id))
      .style('stroke', 'white')
      .style('stroke-width', 0.75);
  }

  // --- Tooltip + hover -----------------------------------------------------
  createTooltip(container);

  function showHover(dot) {
    hoverLayer.selectAll('circle').remove();
    hoverLayer
      .append('circle')
      .attr('cx', dot.x)
      .attr('cy', dot.y)
      .attr('r', dotRadius + 2.5)
      .style('fill', 'none')
      .style('stroke', colorManager.isHighlighted(dot.id) ? itemColor(dot.id) : MUTED_COLORS.lineHover)
      .style('stroke-width', 2)
      .style('pointer-events', 'none');

    const name = getName(dot.item);
    const val = getValue(dot.item);
    const unit = axisLabel ? `<div style="font-size:12px;color:${UI_COLORS.textLight};">${axisLabel}</div>` : '';
    showTooltip(
      container,
      `<div style="font-weight:600;margin-bottom:2px;">${name}</div>` +
        `<div style="font-size:14px;">${formatValue(val)}</div>${unit}`
    );
  }

  function clearHover() {
    hoverLayer.selectAll('circle').remove();
    hideTooltip(container);
  }

  // `nearestPoint` works on {id, x, y} in chartArea space.
  const hitPoints = dots.map((d) => ({ id: d.id, x: d.x, y: d.y }));
  const dotById = new Map(dots.map((d) => [d.id, d]));

  svg
    .on('mousemove', function (event) {
      const [mx, my] = d3.pointer(event, chartArea.node());
      const hitId = nearestPoint(hitPoints, mx, my, hoverSnapRadius);
      if (!hitId) {
        clearHover();
        return;
      }
      const dot = dotById.get(hitId);
      showHover(dot);
      const [cx, cy] = d3.pointer(event, container.node());
      positionTooltip(container, cx, cy, { preferAbove: true });
    })
    .on('mouseleave', clearHover);

  function formatValue(v) {
    if (valueFormat) return valueFormat(v);
    if (!Number.isFinite(v)) return '—';
    return Number.isInteger(v) ? String(v) : v.toFixed(1);
  }

  // --- Initial render ------------------------------------------------------
  renderDots();

  return {
    container,
    svg,
    /**
     * Replace the highlighted set and re-render the dot layers.
     * @param {string[]} ids
     */
    setHighlights(ids) {
      colorManager.setHighlights(ids);
      renderDots();
    },
    /** Re-render dot layers from current highlight state. */
    update() {
      renderDots();
    },
  };
}
