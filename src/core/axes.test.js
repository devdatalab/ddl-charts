import { describe, test, expect, beforeEach } from 'vitest';
import * as d3 from 'd3';
import { createXAxis, createYAxis, AXIS_DEFAULTS } from './axes.js';

describe('AXIS_DEFAULTS', () => {
  test('contains OWID-style default values', () => {
    expect(AXIS_DEFAULTS.tickSize).toBeDefined();
    expect(AXIS_DEFAULTS.tickPadding).toBeDefined();
    expect(AXIS_DEFAULTS.fontFamily).toContain('Lato');
    expect(AXIS_DEFAULTS.fontSize).toBeDefined();
    expect(AXIS_DEFAULTS.color).toBeDefined();
  });
});

describe('createXAxis', () => {
  let svg;
  let scale;

  beforeEach(() => {
    document.body.innerHTML = '<svg id="test-svg"></svg>';
    svg = d3.select('#test-svg');
    scale = d3.scaleLog().domain([100, 100000]).range([0, 500]);
  });

  test('creates an axis group element', () => {
    const axis = createXAxis(svg, scale, { y: 400 });
    expect(axis.node().tagName).toBe('g');
  });

  test('positions axis at specified y coordinate', () => {
    const axis = createXAxis(svg, scale, { y: 400 });
    expect(axis.attr('transform')).toContain('translate(0,400)');
  });

  test('renders tick marks', () => {
    const axis = createXAxis(svg, scale, { y: 400 });
    const ticks = axis.selectAll('.tick');
    expect(ticks.size()).toBeGreaterThan(0);
  });

  test('applies custom tick format', () => {
    const axis = createXAxis(svg, scale, {
      y: 400,
      tickFormat: (d) => `$${d}`,
    });
    const tickText = axis.select('.tick text').text();
    expect(tickText).toContain('$');
  });

  test('renders axis label when provided', () => {
    const axis = createXAxis(svg, scale, {
      y: 400,
      label: 'GDP per capita',
    });
    const label = svg.select('.x-axis-label');
    expect(label.text()).toBe('GDP per capita');
  });
});

describe('createYAxis', () => {
  let svg;
  let scale;

  beforeEach(() => {
    document.body.innerHTML = '<svg id="test-svg"></svg>';
    svg = d3.select('#test-svg');
    scale = d3.scaleLog().domain([1, 100]).range([400, 0]);
  });

  test('creates an axis group element', () => {
    const axis = createYAxis(svg, scale, { x: 60 });
    expect(axis.node().tagName).toBe('g');
  });

  test('positions axis at specified x coordinate', () => {
    const axis = createYAxis(svg, scale, { x: 60 });
    expect(axis.attr('transform')).toContain('translate(60,0)');
  });

  test('renders tick marks', () => {
    const axis = createYAxis(svg, scale, { x: 60 });
    const ticks = axis.selectAll('.tick');
    expect(ticks.size()).toBeGreaterThan(0);
  });

  test('renders axis label when provided', () => {
    const axis = createYAxis(svg, scale, {
      x: 60,
      label: 'PM2.5 (μg/m³)',
    });
    const label = svg.select('.y-axis-label');
    expect(label.text()).toBe('PM2.5 (μg/m³)');
  });
});
