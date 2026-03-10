/**
 * Branded chart container component.
 * Wraps any chart with DDL branding: title, subtitle, source line, and logo mark.
 *
 * Inspired by OWID's chart frames — consistent branded chrome around every chart.
 *
 * @example
 * const container = createChartContainer(d3.select('#my-chart'), {
 *   title: 'Building Heights Across Cities',
 *   subtitle: '2023, confidence threshold 0.34',
 *   source: 'Google Open Buildings 2.5D Temporal',
 *   sourceUrl: 'https://sites.research.google/gr/open-buildings/temporal/',
 * });
 * // Render your chart inside container.body
 */

import { UI_COLORS } from '../core/colors.js';

/**
 * Creates a branded chart container with title, source, and DDL mark.
 *
 * @param {d3.Selection|HTMLElement} parent - Parent element
 * @param {Object} options - Configuration
 * @param {string} [options.title] - Chart title
 * @param {string} [options.subtitle] - Optional subtitle
 * @param {string} [options.source] - Source attribution text
 * @param {string} [options.sourceUrl] - Link for source text
 * @param {boolean} [options.showBranding=true] - Show DDL mark in footer
 * @param {string} [options.className=''] - Additional CSS class
 * @returns {Object} { container, header, body, footer }
 */
export function createChartContainer(parent, options = {}) {
  const {
    title,
    subtitle,
    source,
    sourceUrl,
    showBranding = true,
    className = '',
  } = options;

  // Handle both d3 selections and raw DOM elements
  const parentEl = parent.node ? parent.node() : parent;

  const container = document.createElement('div');
  container.className = `ddl-branded-container ${className}`.trim();

  // Header (title + subtitle)
  const header = document.createElement('div');
  header.className = 'ddl-branded-header';

  if (title) {
    const titleEl = document.createElement('h3');
    titleEl.className = 'ddl-branded-title';
    titleEl.textContent = title;
    header.appendChild(titleEl);
  }

  if (subtitle) {
    const subtitleEl = document.createElement('p');
    subtitleEl.className = 'ddl-branded-subtitle';
    subtitleEl.textContent = subtitle;
    header.appendChild(subtitleEl);
  }

  container.appendChild(header);

  // Body (chart content goes here)
  const body = document.createElement('div');
  body.className = 'ddl-branded-body';
  container.appendChild(body);

  // Footer (source + branding)
  const footer = document.createElement('div');
  footer.className = 'ddl-branded-footer';

  if (source) {
    const sourceEl = document.createElement('span');
    sourceEl.className = 'ddl-branded-source';
    if (sourceUrl) {
      sourceEl.innerHTML = `Source: <a href="${sourceUrl}" target="_blank" rel="noopener">${source}</a>`;
    } else {
      sourceEl.textContent = `Source: ${source}`;
    }
    footer.appendChild(sourceEl);
  }

  if (showBranding) {
    const brandEl = document.createElement('span');
    brandEl.className = 'ddl-branded-mark';
    brandEl.textContent = 'DDL';
    brandEl.title = 'Dev Data Lab';
    footer.appendChild(brandEl);
  }

  container.appendChild(footer);
  parentEl.appendChild(container);

  return { container, header, body, footer };
}
