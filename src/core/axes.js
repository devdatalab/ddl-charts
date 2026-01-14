import * as d3 from 'd3';

/**
 * OWID-inspired default axis styling.
 */
export const AXIS_DEFAULTS = {
  tickSize: 6,
  tickPadding: 8,
  fontFamily: 'Lato, "Helvetica Neue", Helvetica, Arial, sans-serif',
  fontSize: 12,
  color: '#5b5b5b',
  gridColor: '#e0e0e0',
};

/**
 * Creates an X-axis with OWID-style formatting.
 *
 * @param {d3.Selection} svg - SVG selection to append axis to
 * @param {d3.Scale} scale - D3 scale for the axis
 * @param {Object} options - Axis configuration
 * @param {number} options.y - Y position for the axis
 * @param {string} [options.label] - Axis label text
 * @param {Function} [options.tickFormat] - Custom tick format function
 * @param {number} [options.tickCount] - Approximate number of ticks
 * @param {number[]} [options.tickValues] - Explicit tick values
 * @param {boolean} [options.grid=false] - Whether to draw grid lines
 * @param {number} [options.gridHeight] - Height of grid lines (for grid=true)
 * @returns {d3.Selection} The axis group element
 */
export function createXAxis(svg, scale, options = {}) {
  const {
    y = 0,
    label,
    tickFormat,
    tickCount,
    tickValues,
    grid = false,
    gridHeight = 0,
  } = options;

  // Create axis generator
  let axis = d3.axisBottom(scale).tickSize(AXIS_DEFAULTS.tickSize).tickPadding(AXIS_DEFAULTS.tickPadding);

  if (tickFormat) {
    axis = axis.tickFormat(tickFormat);
  }

  if (tickValues) {
    axis = axis.tickValues(tickValues);
  } else if (tickCount) {
    axis = axis.ticks(tickCount);
  }

  // Create and position axis group
  const axisGroup = svg
    .append('g')
    .attr('class', 'x-axis')
    .attr('transform', `translate(0,${y})`)
    .call(axis);

  // Style axis elements
  axisGroup
    .selectAll('text')
    .style('font-family', AXIS_DEFAULTS.fontFamily)
    .style('font-size', `${AXIS_DEFAULTS.fontSize}px`)
    .style('fill', AXIS_DEFAULTS.color);

  axisGroup.selectAll('line, path').style('stroke', AXIS_DEFAULTS.color);

  // Add grid lines if requested
  if (grid && gridHeight > 0) {
    axisGroup
      .selectAll('.tick')
      .append('line')
      .attr('class', 'grid-line')
      .attr('y1', 0)
      .attr('y2', -gridHeight)
      .style('stroke', AXIS_DEFAULTS.gridColor)
      .style('stroke-dasharray', '2,2');
  }

  // Add label if provided
  if (label) {
    const range = scale.range();
    const labelX = (range[0] + range[1]) / 2;

    svg
      .append('text')
      .attr('class', 'x-axis-label')
      .attr('x', labelX)
      .attr('y', y + 45)
      .attr('text-anchor', 'middle')
      .style('font-family', AXIS_DEFAULTS.fontFamily)
      .style('font-size', `${AXIS_DEFAULTS.fontSize}px`)
      .style('fill', AXIS_DEFAULTS.color)
      .text(label);
  }

  return axisGroup;
}

/**
 * Creates a Y-axis with OWID-style formatting.
 *
 * @param {d3.Selection} svg - SVG selection to append axis to
 * @param {d3.Scale} scale - D3 scale for the axis
 * @param {Object} options - Axis configuration
 * @param {number} options.x - X position for the axis
 * @param {string} [options.label] - Axis label text
 * @param {Function} [options.tickFormat] - Custom tick format function
 * @param {number} [options.tickCount] - Approximate number of ticks
 * @param {number[]} [options.tickValues] - Explicit tick values
 * @param {boolean} [options.grid=false] - Whether to draw grid lines
 * @param {number} [options.gridWidth] - Width of grid lines (for grid=true)
 * @returns {d3.Selection} The axis group element
 */
export function createYAxis(svg, scale, options = {}) {
  const {
    x = 0,
    label,
    tickFormat,
    tickCount,
    tickValues,
    grid = false,
    gridWidth = 0,
  } = options;

  // Create axis generator
  let axis = d3.axisLeft(scale).tickSize(AXIS_DEFAULTS.tickSize).tickPadding(AXIS_DEFAULTS.tickPadding);

  if (tickFormat) {
    axis = axis.tickFormat(tickFormat);
  }

  if (tickValues) {
    axis = axis.tickValues(tickValues);
  } else if (tickCount) {
    axis = axis.ticks(tickCount);
  }

  // Create and position axis group
  const axisGroup = svg.append('g').attr('class', 'y-axis').attr('transform', `translate(${x},0)`).call(axis);

  // Style axis elements
  axisGroup
    .selectAll('text')
    .style('font-family', AXIS_DEFAULTS.fontFamily)
    .style('font-size', `${AXIS_DEFAULTS.fontSize}px`)
    .style('fill', AXIS_DEFAULTS.color);

  axisGroup.selectAll('line, path').style('stroke', AXIS_DEFAULTS.color);

  // Add grid lines if requested
  if (grid && gridWidth > 0) {
    axisGroup
      .selectAll('.tick')
      .append('line')
      .attr('class', 'grid-line')
      .attr('x1', 0)
      .attr('x2', gridWidth)
      .style('stroke', AXIS_DEFAULTS.gridColor)
      .style('stroke-dasharray', '2,2');
  }

  // Add label if provided
  if (label) {
    const range = scale.range();
    const labelY = (range[0] + range[1]) / 2;

    svg
      .append('text')
      .attr('class', 'y-axis-label')
      .attr('x', -labelY)
      .attr('y', x - 50)
      .attr('transform', 'rotate(-90)')
      .attr('text-anchor', 'middle')
      .style('font-family', AXIS_DEFAULTS.fontFamily)
      .style('font-size', `${AXIS_DEFAULTS.fontSize}px`)
      .style('fill', AXIS_DEFAULTS.color)
      .text(label);
  }

  return axisGroup;
}
