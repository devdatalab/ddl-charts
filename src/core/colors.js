/**
 * OWID-inspired color palette for DDL charts.
 */

/**
 * Primary chart colors - used for highlighted elements.
 */
export const PRIMARY_COLORS = {
  red: '#E53935', // China
  gold: '#FFD700', // India
  blue: '#1E88E5', // USA
  green: '#43A047',
  purple: '#8E24AA',
  orange: '#FB8C00',
  teal: '#00ACC1',
  pink: '#D81B60',
};

/**
 * Country-specific colors for trajectory chart.
 */
export const COUNTRY_COLORS = {
  CHN: PRIMARY_COLORS.red,
  IND: PRIMARY_COLORS.gold,
  USA: PRIMARY_COLORS.blue,
};

/**
 * Continent colors for grouping.
 */
export const CONTINENT_COLORS = {
  Africa: '#9C27B0',
  Asia: '#E53935',
  Europe: '#1E88E5',
  'North America': '#43A047',
  Oceania: '#FF9800',
  'South America': '#00BCD4',
};

/**
 * UI colors for chart elements.
 */
export const UI_COLORS = {
  background: '#ffffff',
  text: '#5b5b5b',
  textLight: '#999999',
  grid: '#e0e0e0',
  gridLight: '#f0f0f0',
  border: '#cccccc',
  hover: 'rgba(0, 0, 0, 0.05)',
};

/**
 * Colors for non-highlighted/background elements.
 */
export const MUTED_COLORS = {
  line: 'rgba(150, 150, 150, 0.2)',
  lineHover: 'rgba(150, 150, 150, 0.6)',
  marker: 'rgba(150, 150, 150, 0.4)',
};

/**
 * Highlight colors array for dynamically assigning colors to countries.
 * Used when countries beyond the default set (CHN, IND, USA) are highlighted.
 */
export const HIGHLIGHT_COLORS = [
  '#E53935', // Red
  '#1E88E5', // Blue
  '#43A047', // Green
  '#FB8C00', // Orange
  '#8E24AA', // Purple
  '#00ACC1', // Teal
  '#D81B60', // Pink
  '#FFD700', // Gold
];

/**
 * Get color for a country by ISO3 code.
 * Falls back to muted color if not in COUNTRY_COLORS.
 *
 * @param {string} iso3 - ISO3 country code
 * @returns {string} Color value
 */
export function getCountryColor(iso3) {
  return COUNTRY_COLORS[iso3] || MUTED_COLORS.line;
}

/**
 * Get color for a continent.
 *
 * @param {string} continent - Continent name
 * @returns {string} Color value
 */
export function getContinentColor(continent) {
  return CONTINENT_COLORS[continent] || UI_COLORS.textLight;
}

/**
 * Check if a country is in the default highlighted set.
 *
 * @param {string} iso3 - ISO3 country code
 * @returns {boolean} Whether country is in default highlights
 */
export function isHighlightedCountry(iso3) {
  return iso3 in COUNTRY_COLORS;
}

/**
 * Creates a color manager for managing active highlights and color assignments.
 * This manages state for which countries are highlighted and their assigned colors.
 *
 * @param {string[]} [initialHighlights=['CHN', 'IND', 'USA']] - Initial highlighted countries
 * @returns {Object} Color manager with methods to manage highlights
 */
export function createColorManager(initialHighlights = ['CHN', 'IND', 'USA']) {
  const activeHighlights = new Set(initialHighlights);
  const colorAssignments = new Map();
  let nextColorIndex = 3; // Start after default colors

  // Initialize color assignments for default highlights
  initialHighlights.forEach((iso3) => {
    if (COUNTRY_COLORS[iso3]) {
      colorAssignments.set(iso3, COUNTRY_COLORS[iso3]);
    }
  });

  return {
    /**
     * Check if a country is currently highlighted.
     * @param {string} iso3 - ISO3 country code
     * @returns {boolean}
     */
    isHighlighted(iso3) {
      return activeHighlights.has(iso3);
    },

    /**
     * Get the color for a country. Returns muted color if not highlighted.
     * @param {string} iso3 - ISO3 country code
     * @returns {string}
     */
    getColor(iso3) {
      if (activeHighlights.has(iso3)) {
        if (!colorAssignments.has(iso3)) {
          // Assign a new color
          if (COUNTRY_COLORS[iso3]) {
            colorAssignments.set(iso3, COUNTRY_COLORS[iso3]);
          } else {
            colorAssignments.set(iso3, HIGHLIGHT_COLORS[nextColorIndex % HIGHLIGHT_COLORS.length]);
            nextColorIndex++;
          }
        }
        return colorAssignments.get(iso3);
      }
      return MUTED_COLORS.line;
    },

    /**
     * Toggle highlight state for a country.
     * @param {string} iso3 - ISO3 country code
     * @returns {boolean} New highlight state
     */
    toggleHighlight(iso3) {
      if (activeHighlights.has(iso3)) {
        activeHighlights.delete(iso3);
        return false;
      } else {
        activeHighlights.add(iso3);
        // Ensure color is assigned
        this.getColor(iso3);
        return true;
      }
    },

    /**
     * Add a country to highlights.
     * @param {string} iso3 - ISO3 country code
     */
    addHighlight(iso3) {
      activeHighlights.add(iso3);
      this.getColor(iso3);
    },

    /**
     * Remove a country from highlights.
     * @param {string} iso3 - ISO3 country code
     */
    removeHighlight(iso3) {
      activeHighlights.delete(iso3);
    },

    /**
     * Get all currently highlighted countries.
     * @returns {string[]}
     */
    getHighlightedCountries() {
      return Array.from(activeHighlights);
    },
  };
}
