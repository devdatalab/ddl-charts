import * as d3 from 'd3';
import { UI_COLORS } from '../core/colors.js';

/**
 * Creates a tooltip element for displaying hover information.
 *
 * @param {d3.Selection} container - Container to append tooltip to
 * @param {Object} [options] - Configuration options
 * @returns {d3.Selection} The tooltip element
 */
export function createTooltip(container, options = {}) {
  // Remove existing tooltip if present
  container.select('.ddl-tooltip').remove();

  const tooltip = container
    .append('div')
    .attr('class', 'ddl-tooltip')
    .style('position', 'absolute')
    .style('pointer-events', 'none')
    .style('background-color', 'rgba(255, 255, 255, 0.97)')
    .style('border', `1px solid ${UI_COLORS.border}`)
    .style('border-radius', '4px')
    .style('padding', '10px 12px')
    .style('box-shadow', '0 2px 8px rgba(0, 0, 0, 0.15)')
    .style('font-family', 'Lato, "Helvetica Neue", Helvetica, Arial, sans-serif')
    .style('font-size', '13px')
    .style('color', UI_COLORS.text)
    .style('line-height', '1.5')
    .style('opacity', '0')
    .style('transition', 'opacity 0.15s ease')
    .style('z-index', '1000')
    .style('max-width', '300px');

  return tooltip;
}

/**
 * Shows the tooltip with specified content.
 *
 * @param {d3.Selection} container - Container with tooltip
 * @param {string} content - HTML content to display
 */
export function showTooltip(container, content) {
  const tooltip = container.select('.ddl-tooltip');
  tooltip.html(content).style('opacity', '1');
}

/**
 * Hides the tooltip.
 *
 * @param {d3.Selection} container - Container with tooltip
 */
export function hideTooltip(container) {
  const tooltip = container.select('.ddl-tooltip');
  tooltip.style('opacity', '0');
}

/**
 * Positions the tooltip at specified coordinates.
 * Adjusts position to avoid overlapping the data and keep within container bounds.
 * By default, positions above and to the side of the cursor to avoid hiding trajectory lines.
 *
 * @param {d3.Selection} container - Container with tooltip
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {Object} [options] - Positioning options
 * @param {number} [options.offsetX=20] - X offset from pointer
 * @param {number} [options.offsetY=10] - Y offset from pointer (when placing above)
 * @param {boolean} [options.preferAbove=true] - Prefer placing tooltip above cursor
 */
export function positionTooltip(container, x, y, options = {}) {
  const { offsetX = 20, offsetY = 10, preferAbove = true } = options;

  const tooltip = container.select('.ddl-tooltip');
  const containerNode = container.node();
  const tooltipNode = tooltip.node();

  if (!containerNode || !tooltipNode) return;

  const containerRect = containerNode.getBoundingClientRect();
  const tooltipRect = tooltipNode.getBoundingClientRect();

  let left, top;

  // Horizontal positioning: prefer right side of cursor, fallback to left
  if (x + tooltipRect.width + offsetX < containerRect.width) {
    left = x + offsetX;
  } else {
    left = x - tooltipRect.width - offsetX;
  }

  // Vertical positioning: prefer above cursor to avoid hiding trajectory lines
  if (preferAbove && y - tooltipRect.height - offsetY > 0) {
    top = y - tooltipRect.height - offsetY;
  } else if (y + tooltipRect.height + offsetY < containerRect.height) {
    top = y + offsetY;
  } else {
    top = y - tooltipRect.height - offsetY;
  }

  // Ensure not negative
  left = Math.max(0, left);
  top = Math.max(0, top);

  tooltip.style('left', `${left}px`).style('top', `${top}px`);
}

/**
 * Creates formatted tooltip content for a city trajectory.
 *
 * @param {Object} data - City data
 * @param {string} data.name - City name
 * @param {string} data.country - Country name
 * @param {number} data.yearStart - Start year
 * @param {number} data.yearEnd - End year
 * @param {number} data.gdpStart - Starting GDP per capita
 * @param {number} data.gdpEnd - Ending GDP per capita
 * @param {number} data.pm25Start - Starting PM2.5
 * @param {number} data.pm25End - Ending PM2.5
 * @returns {string} HTML content
 */
export function formatTrajectoryTooltip(data) {
  const gdpChange = (((data.gdpEnd - data.gdpStart) / data.gdpStart) * 100).toFixed(0);
  const pm25Change = (((data.pm25End - data.pm25Start) / data.pm25Start) * 100).toFixed(0);

  const gdpArrow = gdpChange >= 0 ? '↑' : '↓';
  const pm25Arrow = pm25Change >= 0 ? '↑' : '↓';

  const gdpColor = gdpChange >= 0 ? '#43A047' : '#E53935';
  const pm25Color = pm25Change <= 0 ? '#43A047' : '#E53935'; // Lower PM2.5 is better

  return `
    <div style="font-weight: 600; margin-bottom: 6px;">${data.name}</div>
    <div style="color: ${UI_COLORS.textLight}; margin-bottom: 8px;">${data.country}</div>
    <div style="display: grid; grid-template-columns: auto 1fr; gap: 4px 12px; font-size: 12px;">
      <span style="color: ${UI_COLORS.textLight};">Period:</span>
      <span>${data.yearStart} → ${data.yearEnd}</span>
      <span style="color: ${UI_COLORS.textLight};">GDP/capita:</span>
      <span>$${Math.round(data.gdpStart).toLocaleString()} → $${Math.round(data.gdpEnd).toLocaleString()} <span style="color: ${gdpColor};">${gdpArrow}${Math.abs(gdpChange)}%</span></span>
      <span style="color: ${UI_COLORS.textLight};">PM2.5:</span>
      <span>${data.pm25Start.toFixed(1)} → ${data.pm25End.toFixed(1)} μg/m³ <span style="color: ${pm25Color};">${pm25Arrow}${Math.abs(pm25Change)}%</span></span>
    </div>
  `;
}
