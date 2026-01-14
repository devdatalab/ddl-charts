import { describe, test, expect } from 'vitest';
import { formatNumber, formatCurrency, formatPM25, percentChange, groupBy, smoothValues } from './utils.js';

describe('formatNumber', () => {
  test('formats billions', () => {
    expect(formatNumber(1500000000)).toBe('1.50B');
  });

  test('formats millions', () => {
    expect(formatNumber(2500000)).toBe('2.50M');
  });

  test('formats thousands', () => {
    expect(formatNumber(5000)).toBe('5.00K');
  });

  test('formats small numbers', () => {
    expect(formatNumber(0.123)).toBe('0.12');
  });

  test('handles null/undefined', () => {
    expect(formatNumber(null)).toBe('N/A');
    expect(formatNumber(undefined)).toBe('N/A');
  });
});

describe('formatCurrency', () => {
  test('formats with dollar sign', () => {
    expect(formatCurrency(50000)).toBe('$50.00K');
  });

  test('handles null', () => {
    expect(formatCurrency(null)).toBe('N/A');
  });
});

describe('formatPM25', () => {
  test('formats with units', () => {
    expect(formatPM25(25.5)).toBe('25.5 μg/m³');
  });

  test('handles null', () => {
    expect(formatPM25(null)).toBe('N/A');
  });
});

describe('percentChange', () => {
  test('calculates positive change', () => {
    expect(percentChange(100, 150)).toBe(50);
  });

  test('calculates negative change', () => {
    expect(percentChange(100, 50)).toBe(-50);
  });

  test('handles zero start', () => {
    expect(percentChange(0, 100)).toBe(0);
  });
});

describe('groupBy', () => {
  test('groups items by key', () => {
    const items = [
      { country: 'USA', city: 'NYC' },
      { country: 'USA', city: 'LA' },
      { country: 'CHN', city: 'Beijing' },
    ];

    const grouped = groupBy(items, (i) => i.country);

    expect(grouped.get('USA').length).toBe(2);
    expect(grouped.get('CHN').length).toBe(1);
  });
});

describe('smoothValues', () => {
  test('preserves first and last values', () => {
    const values = [10, 20, 30, 40, 50];
    const smoothed = smoothValues(values, 3);

    expect(smoothed[0]).toBe(10);
    expect(smoothed[smoothed.length - 1]).toBe(50);
  });

  test('smooths middle values', () => {
    const values = [10, 100, 10, 100, 10];
    const smoothed = smoothValues(values, 3);

    // Middle value should be averaged
    expect(smoothed[2]).toBeCloseTo((100 + 10 + 100) / 3);
  });

  test('handles short arrays', () => {
    const values = [10, 20];
    const smoothed = smoothValues(values, 3);

    expect(smoothed).toEqual([10, 20]);
  });
});
