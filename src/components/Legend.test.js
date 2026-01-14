import { describe, test, expect, beforeEach, vi } from 'vitest';
import * as d3 from 'd3';
import { createLegend, updateLegendVisibility } from './Legend.js';

describe('createLegend', () => {
  let container;

  beforeEach(() => {
    document.body.innerHTML = '<div id="chart-container"></div>';
    container = d3.select('#chart-container');
  });

  test('creates a legend container', () => {
    const items = [
      { id: 'CHN', label: 'China', color: '#E53935', visible: true },
      { id: 'IND', label: 'India', color: '#FFD700', visible: true },
    ];

    createLegend(container, items);

    const legend = container.select('.ddl-legend');
    expect(legend.node()).not.toBeNull();
  });

  test('renders all legend items', () => {
    const items = [
      { id: 'CHN', label: 'China', color: '#E53935', visible: true },
      { id: 'IND', label: 'India', color: '#FFD700', visible: true },
      { id: 'USA', label: 'United States', color: '#1E88E5', visible: true },
    ];

    createLegend(container, items);

    const legendItems = container.selectAll('.legend-item');
    expect(legendItems.size()).toBe(3);
  });

  test('applies correct colors to legend markers', () => {
    const items = [{ id: 'CHN', label: 'China', color: '#E53935', visible: true }];

    createLegend(container, items);

    const marker = container.select('.legend-marker');
    expect(marker.style('background-color')).toBe('rgb(229, 57, 53)');
  });

  test('shows correct labels', () => {
    const items = [{ id: 'CHN', label: 'China', color: '#E53935', visible: true }];

    createLegend(container, items);

    const label = container.select('.legend-label');
    expect(label.text()).toBe('China');
  });

  test('calls onClick handler when item clicked', () => {
    const onClick = vi.fn();
    const items = [{ id: 'CHN', label: 'China', color: '#E53935', visible: true }];

    createLegend(container, items, { onClick });

    const item = container.select('.legend-item');
    item.dispatch('click');

    expect(onClick).toHaveBeenCalledWith('CHN');
  });

  test('calls onHover handler when item hovered', () => {
    const onHover = vi.fn();
    const items = [{ id: 'CHN', label: 'China', color: '#E53935', visible: true }];

    createLegend(container, items, { onHover });

    const item = container.select('.legend-item');
    item.dispatch('mouseenter');

    expect(onHover).toHaveBeenCalledWith('CHN');
  });

  test('marks hidden items with dimmed style', () => {
    const items = [{ id: 'CHN', label: 'China', color: '#E53935', visible: false }];

    createLegend(container, items);

    const item = container.select('.legend-item');
    expect(item.classed('legend-item--hidden')).toBe(true);
  });
});

describe('updateLegendVisibility', () => {
  let container;

  beforeEach(() => {
    document.body.innerHTML = '<div id="chart-container"></div>';
    container = d3.select('#chart-container');
  });

  test('updates visibility state of items', () => {
    const items = [
      { id: 'CHN', label: 'China', color: '#E53935', visible: true },
      { id: 'IND', label: 'India', color: '#FFD700', visible: true },
    ];

    createLegend(container, items);
    updateLegendVisibility(container, { CHN: false, IND: true });

    const chnItem = container.select('[data-id="CHN"]');
    const indItem = container.select('[data-id="IND"]');

    expect(chnItem.classed('legend-item--hidden')).toBe(true);
    expect(indItem.classed('legend-item--hidden')).toBe(false);
  });
});
