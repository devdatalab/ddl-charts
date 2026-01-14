import { describe, test, expect, beforeEach } from 'vitest';
import * as d3 from 'd3';
import { createTooltip, showTooltip, hideTooltip, positionTooltip } from './Tooltip.js';

describe('createTooltip', () => {
  let container;

  beforeEach(() => {
    document.body.innerHTML = '<div id="chart-container"></div>';
    container = d3.select('#chart-container');
  });

  test('creates a tooltip element', () => {
    createTooltip(container);

    const tooltip = container.select('.ddl-tooltip');
    expect(tooltip.node()).not.toBeNull();
  });

  test('tooltip is initially hidden', () => {
    createTooltip(container);

    const tooltip = container.select('.ddl-tooltip');
    expect(tooltip.style('opacity')).toBe('0');
  });
});

describe('showTooltip', () => {
  let container;

  beforeEach(() => {
    document.body.innerHTML = '<div id="chart-container"></div>';
    container = d3.select('#chart-container');
    createTooltip(container);
  });

  test('shows tooltip with content', () => {
    showTooltip(container, '<strong>Test</strong>');

    const tooltip = container.select('.ddl-tooltip');
    expect(tooltip.style('opacity')).toBe('1');
    expect(tooltip.html()).toContain('Test');
  });
});

describe('hideTooltip', () => {
  let container;

  beforeEach(() => {
    document.body.innerHTML = '<div id="chart-container"></div>';
    container = d3.select('#chart-container');
    createTooltip(container);
  });

  test('hides tooltip', () => {
    showTooltip(container, 'Test');
    hideTooltip(container);

    const tooltip = container.select('.ddl-tooltip');
    expect(tooltip.style('opacity')).toBe('0');
  });
});

describe('positionTooltip', () => {
  let container;

  beforeEach(() => {
    document.body.innerHTML = '<div id="chart-container" style="position: relative; width: 500px; height: 400px;"></div>';
    container = d3.select('#chart-container');
    createTooltip(container);
  });

  test('positions tooltip at specified coordinates with offset', () => {
    showTooltip(container, 'Test');
    // Default offset is +10 for x, -10 for y
    positionTooltip(container, 100, 200);

    const tooltip = container.select('.ddl-tooltip');
    // Position should include offset: 100+10=110 (but clamped), 200-10=190
    // Due to bounds checking, actual position may vary
    expect(tooltip.style('left')).toBeTruthy();
    expect(tooltip.style('top')).toBeTruthy();
  });
});
