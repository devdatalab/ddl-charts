/**
 * Utility functions for data transformation and formatting.
 */

/**
 * Format a number with appropriate precision for display.
 * Uses SI notation for large numbers.
 *
 * @param {number} value - Number to format
 * @param {number} [precision=2] - Number of significant figures
 * @returns {string} Formatted string
 */
export function formatNumber(value, precision = 2) {
  if (value === null || value === undefined || isNaN(value)) {
    return 'N/A';
  }

  if (Math.abs(value) >= 1e9) {
    return `${(value / 1e9).toFixed(precision)}B`;
  }
  if (Math.abs(value) >= 1e6) {
    return `${(value / 1e6).toFixed(precision)}M`;
  }
  if (Math.abs(value) >= 1e3) {
    return `${(value / 1e3).toFixed(precision)}K`;
  }
  if (Math.abs(value) < 1) {
    return value.toFixed(precision);
  }

  return value.toLocaleString(undefined, {
    maximumFractionDigits: precision,
  });
}

/**
 * Format a currency value (GDP per capita).
 *
 * @param {number} value - Value to format
 * @returns {string} Formatted currency string
 */
export function formatCurrency(value) {
  if (value === null || value === undefined || isNaN(value)) {
    return 'N/A';
  }

  return `$${formatNumber(value)}`;
}

/**
 * Format a PM2.5 value with units.
 *
 * @param {number} value - PM2.5 value
 * @returns {string} Formatted string with units
 */
export function formatPM25(value) {
  if (value === null || value === undefined || isNaN(value)) {
    return 'N/A';
  }

  return `${value.toFixed(1)} μg/m³`;
}

/**
 * Calculate percentage change between two values.
 *
 * @param {number} start - Starting value
 * @param {number} end - Ending value
 * @returns {number} Percentage change
 */
export function percentChange(start, end) {
  if (!start || start === 0) {
    return 0;
  }
  return ((end - start) / start) * 100;
}

/**
 * Group array elements by a key function.
 *
 * @param {Array} array - Array to group
 * @param {Function} keyFn - Function to extract group key
 * @returns {Map} Map of key -> array of elements
 */
export function groupBy(array, keyFn) {
  return array.reduce((map, item) => {
    const key = keyFn(item);
    if (!map.has(key)) {
      map.set(key, []);
    }
    map.get(key).push(item);
    return map;
  }, new Map());
}

/**
 * Smoothing function using rolling average.
 * Preserves first and last values.
 *
 * @param {number[]} values - Array of values to smooth
 * @param {number} [windowSize=5] - Size of rolling window
 * @returns {number[]} Smoothed values
 */
export function smoothValues(values, windowSize = 5) {
  if (values.length <= 2) {
    return [...values];
  }

  const result = [];
  const halfWindow = Math.floor(windowSize / 2);

  for (let i = 0; i < values.length; i++) {
    // Preserve first and last values
    if (i === 0 || i === values.length - 1) {
      result.push(values[i]);
      continue;
    }

    // Calculate rolling average
    let sum = 0;
    let count = 0;
    for (let j = Math.max(0, i - halfWindow); j <= Math.min(values.length - 1, i + halfWindow); j++) {
      sum += values[j];
      count++;
    }
    result.push(sum / count);
  }

  return result;
}

/**
 * Debounce a function to limit how often it can be called.
 *
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle a function to limit call frequency.
 *
 * @param {Function} func - Function to throttle
 * @param {number} limit - Minimum time between calls in milliseconds
 * @returns {Function} Throttled function
 */
export function throttle(func, limit) {
  let lastFunc;
  let lastRan;
  return function executedFunction(...args) {
    if (!lastRan) {
      func(...args);
      lastRan = Date.now();
    } else {
      clearTimeout(lastFunc);
      lastFunc = setTimeout(
        () => {
          if (Date.now() - lastRan >= limit) {
            func(...args);
            lastRan = Date.now();
          }
        },
        limit - (Date.now() - lastRan)
      );
    }
  };
}
