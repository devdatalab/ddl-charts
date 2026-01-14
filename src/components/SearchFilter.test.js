import { describe, test, expect, beforeEach, vi } from 'vitest';
import * as d3 from 'd3';
import { createSearchFilter, filterItems, clearSearch } from './SearchFilter.js';

describe('createSearchFilter', () => {
  let container;

  beforeEach(() => {
    document.body.innerHTML = '<div id="chart-container"></div>';
    container = d3.select('#chart-container');
  });

  test('creates a search input', () => {
    createSearchFilter(container, []);

    const input = container.select('.ddl-search input');
    expect(input.node()).not.toBeNull();
  });

  test('has placeholder text', () => {
    createSearchFilter(container, [], { placeholder: 'Search cities...' });

    const input = container.select('.ddl-search input');
    expect(input.attr('placeholder')).toBe('Search cities...');
  });

  test('calls onSearch when input changes', async () => {
    const onSearch = vi.fn();
    createSearchFilter(container, [], { onSearch });

    const input = container.select('.ddl-search input');
    input.property('value', 'Beijing');
    input.dispatch('input');

    // Wait for debounce
    await new Promise((resolve) => setTimeout(resolve, 200));

    expect(onSearch).toHaveBeenCalled();
  });
});

describe('filterItems', () => {
  const items = [
    { id: '1', name: 'Beijing', country: 'China' },
    { id: '2', name: 'Shanghai', country: 'China' },
    { id: '3', name: 'New York', country: 'United States' },
    { id: '4', name: 'Los Angeles', country: 'United States' },
  ];

  test('filters by city name', () => {
    const results = filterItems(items, 'Beijing');
    expect(results.length).toBe(1);
    expect(results[0].id).toBe('1');
  });

  test('filters case-insensitively', () => {
    const results = filterItems(items, 'beijing');
    expect(results.length).toBe(1);
  });

  test('filters by country', () => {
    const results = filterItems(items, 'China');
    expect(results.length).toBe(2);
  });

  test('returns all items for empty query', () => {
    const results = filterItems(items, '');
    expect(results.length).toBe(4);
  });

  test('handles partial matches', () => {
    const results = filterItems(items, 'ang');
    expect(results.length).toBe(2); // Shanghai, Los Angeles
  });
});

describe('clearSearch', () => {
  let container;

  beforeEach(() => {
    document.body.innerHTML = '<div id="chart-container"></div>';
    container = d3.select('#chart-container');
    createSearchFilter(container, []);
  });

  test('clears the input value', () => {
    const input = container.select('.ddl-search input');
    input.property('value', 'test');

    clearSearch(container);

    expect(input.property('value')).toBe('');
  });
});
