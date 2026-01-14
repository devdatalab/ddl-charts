import * as d3 from 'd3';

/**
 * Creates a logarithmic scale for data visualization.
 * Commonly used for GDP, population, or other values spanning multiple orders of magnitude.
 *
 * @param {Object} options - Scale configuration
 * @param {[number, number]} options.domain - Input data range [min, max]
 * @param {[number, number]} options.range - Output pixel range [min, max]
 * @param {number} [options.padding=0] - Fractional padding to add to domain (0.1 = 10%)
 * @param {boolean} [options.nice=false] - Round domain to nice values
 * @param {boolean} [options.clamp=true] - Clamp output to range
 * @returns {d3.ScaleLogarithmic} D3 log scale
 */
export function createLogScale({ domain, range, padding = 0, nice = false, clamp = true }) {
  let [minVal, maxVal] = domain;

  // Apply padding in log space
  if (padding > 0) {
    const logMin = Math.log10(minVal);
    const logMax = Math.log10(maxVal);
    const logRange = logMax - logMin;
    const logPadding = logRange * padding;

    minVal = Math.pow(10, logMin - logPadding);
    maxVal = Math.pow(10, logMax + logPadding);
  }

  const scale = d3.scaleLog().domain([minVal, maxVal]).range(range).clamp(clamp);

  if (nice) {
    scale.nice();
  }

  return scale;
}

/**
 * Creates a linear scale for data visualization.
 *
 * @param {Object} options - Scale configuration
 * @param {[number, number]} options.domain - Input data range [min, max]
 * @param {[number, number]} options.range - Output pixel range [min, max]
 * @param {number} [options.padding=0] - Fractional padding to add to domain
 * @param {boolean} [options.nice=false] - Round domain to nice values
 * @param {boolean} [options.clamp=true] - Clamp output to range
 * @returns {d3.ScaleLinear} D3 linear scale
 */
export function createLinearScale({ domain, range, padding = 0, nice = false, clamp = true }) {
  let [minVal, maxVal] = domain;

  // Apply padding
  if (padding > 0) {
    const dataRange = maxVal - minVal;
    const paddingAmount = dataRange * padding;
    minVal -= paddingAmount;
    maxVal += paddingAmount;
  }

  const scale = d3.scaleLinear().domain([minVal, maxVal]).range(range).clamp(clamp);

  if (nice) {
    scale.nice();
  }

  return scale;
}

/**
 * Creates a time scale for temporal data.
 * Accepts either Date objects or year numbers in the domain.
 *
 * @param {Object} options - Scale configuration
 * @param {[Date|number, Date|number]} options.domain - Time range (Dates or year numbers)
 * @param {[number, number]} options.range - Output pixel range [min, max]
 * @param {boolean} [options.nice=false] - Round domain to nice values
 * @param {boolean} [options.clamp=true] - Clamp output to range
 * @returns {d3.ScaleTime} D3 time scale
 */
export function createTimeScale({ domain, range, nice = false, clamp = true }) {
  // Convert year numbers to Date objects if needed
  const domainDates = domain.map((d) => {
    if (d instanceof Date) {
      return d;
    }
    // Assume it's a year number
    return new Date(d, 0, 1);
  });

  const scale = d3.scaleTime().domain(domainDates).range(range).clamp(clamp);

  if (nice) {
    scale.nice();
  }

  return scale;
}
