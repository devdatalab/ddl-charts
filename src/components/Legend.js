import * as d3 from 'd3';
import { UI_COLORS } from '../core/colors.js';

/**
 * Creates an interactive legend component.
 *
 * @param {d3.Selection} container - Container element to append legend to
 * @param {Array} items - Legend items
 * @param {string} items[].id - Unique identifier for the item
 * @param {string} items[].label - Display label
 * @param {string} items[].color - Color for the marker
 * @param {boolean} items[].visible - Whether the item is currently visible
 * @param {Object} [options] - Configuration options
 * @param {Function} [options.onClick] - Called when item is clicked (receives id)
 * @param {Function} [options.onHover] - Called when item is hovered (receives id)
 * @param {Function} [options.onHoverEnd] - Called when hover ends
 * @param {string} [options.position='right'] - Legend position: 'right', 'top', 'bottom'
 * @returns {d3.Selection} The legend element
 */
export function createLegend(container, items, options = {}) {
  const { onClick, onHover, onHoverEnd, position = 'right' } = options;

  // Remove existing legend if present
  container.select('.ddl-legend').remove();

  // Create legend container
  const legend = container
    .append('div')
    .attr('class', `ddl-legend ddl-legend--${position}`)
    .style('font-family', 'Lato, "Helvetica Neue", Helvetica, Arial, sans-serif')
    .style('font-size', '13px');

  // Create legend items
  const legendItems = legend
    .selectAll('.legend-item')
    .data(items)
    .join('div')
    .attr('class', (d) => `legend-item ${d.visible ? '' : 'legend-item--hidden'}`)
    .attr('data-id', (d) => d.id)
    .style('display', 'flex')
    .style('align-items', 'center')
    .style('padding', '4px 8px')
    .style('cursor', 'pointer')
    .style('border-radius', '4px')
    .style('transition', 'background-color 0.15s ease')
    .style('opacity', (d) => (d.visible ? 1 : 0.4));

  // Add color marker
  legendItems
    .append('div')
    .attr('class', 'legend-marker')
    .style('width', '12px')
    .style('height', '12px')
    .style('border-radius', '2px')
    .style('margin-right', '8px')
    .style('background-color', (d) => d.color)
    .style('flex-shrink', '0');

  // Add label
  legendItems
    .append('span')
    .attr('class', 'legend-label')
    .style('color', UI_COLORS.text)
    .style('white-space', 'nowrap')
    .text((d) => d.label);

  // Add hover effects
  legendItems
    .on('mouseenter', function (event, d) {
      d3.select(this).style('background-color', UI_COLORS.hover);
      if (onHover) {
        onHover(d.id);
      }
    })
    .on('mouseleave', function (event, d) {
      d3.select(this).style('background-color', 'transparent');
      if (onHoverEnd) {
        onHoverEnd(d.id);
      }
    });

  // Add click handler
  if (onClick) {
    legendItems.on('click', function (event, d) {
      onClick(d.id);
    });
  }

  return legend;
}

/**
 * Updates the visibility state of legend items.
 *
 * @param {d3.Selection} container - Container with legend
 * @param {Object} visibilityMap - Map of id -> visible boolean
 */
export function updateLegendVisibility(container, visibilityMap) {
  container.selectAll('.legend-item').each(function () {
    const item = d3.select(this);
    const id = item.attr('data-id');
    const visible = visibilityMap[id];

    item.classed('legend-item--hidden', !visible).style('opacity', visible ? 1 : 0.4);
  });
}

/**
 * Highlights a specific legend item.
 *
 * @param {d3.Selection} container - Container with legend
 * @param {string} id - ID of item to highlight (null to clear)
 */
export function highlightLegendItem(container, id) {
  container.selectAll('.legend-item').each(function () {
    const item = d3.select(this);
    const itemId = item.attr('data-id');

    if (id === null) {
      // Clear highlighting
      item.style('font-weight', 'normal');
    } else {
      // Highlight matching item
      item.style('font-weight', itemId === id ? 'bold' : 'normal');
    }
  });
}
