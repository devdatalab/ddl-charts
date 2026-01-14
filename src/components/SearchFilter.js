import * as d3 from 'd3';
import { UI_COLORS } from '../core/colors.js';
import { debounce } from '../core/utils.js';

/**
 * Creates a search/filter input component.
 *
 * @param {d3.Selection} container - Container to append search to
 * @param {Array} items - Items that can be searched (for autocomplete)
 * @param {Object} [options] - Configuration options
 * @param {string} [options.placeholder='Search...'] - Input placeholder
 * @param {Function} [options.onSearch] - Called when search term changes
 * @param {Function} [options.onClear] - Called when search is cleared
 * @param {number} [options.debounceMs=150] - Debounce delay
 * @returns {d3.Selection} The search container element
 */
export function createSearchFilter(container, items, options = {}) {
  const { placeholder = 'Search...', onSearch, onClear, debounceMs = 150 } = options;

  // Remove existing search if present
  container.select('.ddl-search').remove();

  const searchContainer = container
    .append('div')
    .attr('class', 'ddl-search')
    .style('display', 'flex')
    .style('align-items', 'center')
    .style('margin-bottom', '12px');

  // Search icon (using SVG)
  searchContainer
    .append('svg')
    .attr('width', '16')
    .attr('height', '16')
    .attr('viewBox', '0 0 24 24')
    .style('margin-right', '8px')
    .style('flex-shrink', '0')
    .html(`
      <path fill="${UI_COLORS.textLight}" d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
    `);

  // Input element
  const input = searchContainer
    .append('input')
    .attr('type', 'text')
    .attr('class', 'ddl-search-input')
    .attr('placeholder', placeholder)
    .style('flex', '1')
    .style('border', `1px solid ${UI_COLORS.border}`)
    .style('border-radius', '4px')
    .style('padding', '8px 12px')
    .style('font-family', 'Lato, "Helvetica Neue", Helvetica, Arial, sans-serif')
    .style('font-size', '13px')
    .style('color', UI_COLORS.text)
    .style('outline', 'none');

  // Focus styling
  input
    .on('focus', function () {
      d3.select(this).style('border-color', '#1E88E5');
    })
    .on('blur', function () {
      d3.select(this).style('border-color', UI_COLORS.border);
    });

  // Clear button
  const clearBtn = searchContainer
    .append('button')
    .attr('class', 'ddl-search-clear')
    .style('display', 'none')
    .style('border', 'none')
    .style('background', 'transparent')
    .style('cursor', 'pointer')
    .style('padding', '4px')
    .style('margin-left', '4px')
    .style('color', UI_COLORS.textLight)
    .style('font-size', '16px')
    .text('×')
    .on('click', () => {
      input.property('value', '');
      clearBtn.style('display', 'none');
      if (onClear) {
        onClear();
      }
      if (onSearch) {
        onSearch('', items);
      }
    });

  // Debounced search handler
  const debouncedSearch = debounce((term) => {
    const results = filterItems(items, term);
    if (onSearch) {
      onSearch(term, results);
    }
  }, debounceMs);

  // Input handler
  input.on('input', function () {
    const term = this.value;
    clearBtn.style('display', term ? 'block' : 'none');
    debouncedSearch(term);
  });

  return searchContainer;
}

/**
 * Filters items based on search term.
 * Searches city name and country.
 *
 * @param {Array} items - Items to filter
 * @param {string} term - Search term
 * @returns {Array} Filtered items
 */
export function filterItems(items, term) {
  if (!term || term.trim() === '') {
    return items;
  }

  const lowerTerm = term.toLowerCase();

  return items.filter((item) => {
    const nameMatch = item.name && item.name.toLowerCase().includes(lowerTerm);
    const countryMatch = item.country && item.country.toLowerCase().includes(lowerTerm);
    const iso3Match = item.iso3 && item.iso3.toLowerCase().includes(lowerTerm);

    return nameMatch || countryMatch || iso3Match;
  });
}

/**
 * Clears the search input.
 *
 * @param {d3.Selection} container - Container with search
 */
export function clearSearch(container) {
  const input = container.select('.ddl-search input');
  input.property('value', '');

  const clearBtn = container.select('.ddl-search-clear');
  clearBtn.style('display', 'none');
}

/**
 * Sets the search input value programmatically.
 *
 * @param {d3.Selection} container - Container with search
 * @param {string} value - Value to set
 */
export function setSearchValue(container, value) {
  const input = container.select('.ddl-search input');
  input.property('value', value);

  const clearBtn = container.select('.ddl-search-clear');
  clearBtn.style('display', value ? 'block' : 'none');
}
