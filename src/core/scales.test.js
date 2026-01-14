import { describe, test, expect } from 'vitest';
import { createLogScale, createLinearScale, createTimeScale } from './scales.js';

describe('createLogScale', () => {
  test('creates a log scale with correct domain and range', () => {
    const scale = createLogScale({
      domain: [100, 100000],
      range: [0, 500],
    });

    expect(scale(100)).toBe(0);
    expect(scale(100000)).toBe(500);
  });

  test('handles domain padding', () => {
    const scale = createLogScale({
      domain: [100, 100000],
      range: [0, 500],
      padding: 0.1,
    });

    // With 10% padding, domain should extend beyond input values
    expect(scale.domain()[0]).toBeLessThan(100);
    expect(scale.domain()[1]).toBeGreaterThan(100000);
  });

  test('clamps values by default', () => {
    const scale = createLogScale({
      domain: [100, 100000],
      range: [0, 500],
    });

    // Values outside domain should be clamped
    expect(scale(10)).toBe(0);
    expect(scale(1000000)).toBe(500);
  });

  test('applies nice ticks when requested', () => {
    const scale = createLogScale({
      domain: [123, 98765],
      range: [0, 500],
      nice: true,
    });

    // Domain should be "nice" round numbers
    expect(scale.domain()[0]).toBe(100);
    expect(scale.domain()[1]).toBe(100000);
  });
});

describe('createLinearScale', () => {
  test('creates a linear scale with correct domain and range', () => {
    const scale = createLinearScale({
      domain: [0, 100],
      range: [0, 500],
    });

    expect(scale(0)).toBe(0);
    expect(scale(50)).toBe(250);
    expect(scale(100)).toBe(500);
  });

  test('handles negative values', () => {
    const scale = createLinearScale({
      domain: [-50, 50],
      range: [0, 500],
    });

    expect(scale(-50)).toBe(0);
    expect(scale(0)).toBe(250);
    expect(scale(50)).toBe(500);
  });
});

describe('createTimeScale', () => {
  test('creates a time scale with Date objects', () => {
    const scale = createTimeScale({
      domain: [new Date(2010, 0, 1), new Date(2020, 0, 1)],
      range: [0, 500],
    });

    expect(scale(new Date(2010, 0, 1))).toBe(0);
    expect(scale(new Date(2020, 0, 1))).toBe(500);
  });

  test('handles year numbers as input', () => {
    const scale = createTimeScale({
      domain: [2010, 2020],
      range: [0, 500],
    });

    expect(scale(new Date(2010, 0, 1))).toBe(0);
    expect(scale(new Date(2020, 0, 1))).toBe(500);
  });
});
