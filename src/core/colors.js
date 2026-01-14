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
  line: 'rgba(150, 150, 150, 0.3)',
  lineHover: 'rgba(150, 150, 150, 0.6)',
  marker: 'rgba(150, 150, 150, 0.7)',
};

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
 * Check if a country is in the highlighted set.
 *
 * @param {string} iso3 - ISO3 country code
 * @returns {boolean} Whether country is highlighted
 */
export function isHighlightedCountry(iso3) {
  return iso3 in COUNTRY_COLORS;
}
