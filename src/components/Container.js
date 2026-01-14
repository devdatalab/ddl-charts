import * as d3 from 'd3';
import { debounce } from '../core/utils.js';

/**
 * Creates a responsive SVG container with proper margins.
 *
 * @param {d3.Selection} parent - Parent element to append to
 * @param {Object} options - Configuration options
 * @param {number} [options.width] - Fixed width (if not set, uses parent width)
 * @param {number} [options.height=600] - Height
 * @param {Object} [options.margin] - Margins
 * @param {number} [options.margin.top=30]
 * @param {number} [options.margin.right=40]
 * @param {number} [options.margin.bottom=60]
 * @param {number} [options.margin.left=80]
 * @param {boolean} [options.responsive=true] - Auto-resize on window resize
 * @param {Function} [options.onResize] - Called when container resizes
 * @returns {Object} { container, svg, chartArea, dimensions }
 */
export function createContainer(parent, options = {}) {
  const {
    width: fixedWidth,
    height = 600,
    margin = {},
    responsive = true,
    onResize,
  } = options;

  const finalMargin = {
    top: margin.top ?? 30,
    right: margin.right ?? 40,
    bottom: margin.bottom ?? 60,
    left: margin.left ?? 80,
  };

  // Create container div
  const container = parent
    .append('div')
    .attr('class', 'ddl-chart-container')
    .style('position', 'relative')
    .style('width', '100%');

  // Get width from parent if not fixed
  const parentNode = parent.node();
  let width = fixedWidth || (parentNode ? parentNode.getBoundingClientRect().width : 800);

  // Calculate inner dimensions
  const innerWidth = width - finalMargin.left - finalMargin.right;
  const innerHeight = height - finalMargin.top - finalMargin.bottom;

  // Create SVG
  const svg = container
    .append('svg')
    .attr('class', 'ddl-chart-svg')
    .attr('width', width)
    .attr('height', height)
    .style('display', 'block');

  // Create chart area group (translated by margins)
  const chartArea = svg
    .append('g')
    .attr('class', 'chart-area')
    .attr('transform', `translate(${finalMargin.left},${finalMargin.top})`);

  // Store dimensions
  const dimensions = {
    width,
    height,
    innerWidth,
    innerHeight,
    margin: finalMargin,
  };

  // Set up responsive resize
  if (responsive && !fixedWidth) {
    const handleResize = debounce(() => {
      const newWidth = parentNode ? parentNode.getBoundingClientRect().width : width;
      if (newWidth !== dimensions.width) {
        dimensions.width = newWidth;
        dimensions.innerWidth = newWidth - finalMargin.left - finalMargin.right;

        svg.attr('width', newWidth);

        if (onResize) {
          onResize(dimensions);
        }
      }
    }, 100);

    window.addEventListener('resize', handleResize);

    // Store cleanup function
    container.on('remove', () => {
      window.removeEventListener('resize', handleResize);
    });
  }

  return { container, svg, chartArea, dimensions };
}

/**
 * Creates a clip path for the chart area.
 *
 * @param {d3.Selection} svg - SVG element
 * @param {string} id - Unique ID for the clip path
 * @param {number} width - Clip width
 * @param {number} height - Clip height
 * @returns {string} The clip path URL reference
 */
export function createClipPath(svg, id, width, height) {
  svg
    .append('defs')
    .append('clipPath')
    .attr('id', id)
    .append('rect')
    .attr('width', width)
    .attr('height', height);

  return `url(#${id})`;
}
