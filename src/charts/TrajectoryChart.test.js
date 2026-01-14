import { describe, test, expect, beforeEach } from 'vitest';
import * as d3 from 'd3';
import { createTrajectoryChart } from './TrajectoryChart.js';

// Sample test data
const sampleData = {
  metadata: {
    title: 'Test Chart',
    xAxis: 'GDP per capita',
    yAxis: 'PM2.5',
  },
  bounds: {
    gdp: { min: 1000, max: 100000 },
    pm25: { min: 5, max: 100 },
  },
  highlightedCountries: ['CHN', 'USA'],
  cities: [
    {
      id: '1',
      name: 'Beijing',
      iso3: 'CHN',
      country: 'China',
      continent: 'Asia',
      population: 20000000,
      yearStart: 2013,
      yearEnd: 2020,
      gdpStart: 15000,
      gdpEnd: 25000,
      pm25Start: 80,
      pm25End: 50,
      trajectory: [
        { year: 2013, gdp: 15000, pm25: 80 },
        { year: 2015, gdp: 18000, pm25: 70 },
        { year: 2018, gdp: 22000, pm25: 55 },
        { year: 2020, gdp: 25000, pm25: 50 },
      ],
    },
    {
      id: '2',
      name: 'New York',
      iso3: 'USA',
      country: 'United States',
      continent: 'North America',
      population: 8000000,
      yearStart: 2013,
      yearEnd: 2020,
      gdpStart: 60000,
      gdpEnd: 70000,
      pm25Start: 15,
      pm25End: 10,
      trajectory: [
        { year: 2013, gdp: 60000, pm25: 15 },
        { year: 2020, gdp: 70000, pm25: 10 },
      ],
    },
    {
      id: '3',
      name: 'London',
      iso3: 'GBR',
      country: 'United Kingdom',
      continent: 'Europe',
      population: 9000000,
      yearStart: 2013,
      yearEnd: 2020,
      gdpStart: 45000,
      gdpEnd: 48000,
      pm25Start: 12,
      pm25End: 10,
      trajectory: [
        { year: 2013, gdp: 45000, pm25: 12 },
        { year: 2020, gdp: 48000, pm25: 10 },
      ],
    },
  ],
};

describe('createTrajectoryChart', () => {
  let container;

  beforeEach(() => {
    document.body.innerHTML = '<div id="chart-container" style="width: 800px;"></div>';
    container = d3.select('#chart-container');
  });

  test('creates SVG element', () => {
    createTrajectoryChart(container, sampleData);

    const svg = container.select('svg');
    expect(svg.node()).not.toBeNull();
  });

  test('renders trajectory lines for each city', () => {
    createTrajectoryChart(container, sampleData);

    const trajectories = container.selectAll('.trajectory-line');
    expect(trajectories.size()).toBe(3);
  });

  test('renders start and end markers', () => {
    createTrajectoryChart(container, sampleData);

    const startMarkers = container.selectAll('.marker-start');
    const endMarkers = container.selectAll('.marker-end');

    expect(startMarkers.size()).toBe(3);
    expect(endMarkers.size()).toBe(3);
  });

  test('creates legend items', () => {
    createTrajectoryChart(container, sampleData);

    const legendItems = container.selectAll('.legend-item');
    expect(legendItems.size()).toBeGreaterThan(0);
  });

  test('creates tooltip', () => {
    createTrajectoryChart(container, sampleData);

    const tooltip = container.select('.ddl-tooltip');
    expect(tooltip.node()).not.toBeNull();
  });

  test('creates axes', () => {
    createTrajectoryChart(container, sampleData);

    const xAxis = container.select('.x-axis');
    const yAxis = container.select('.y-axis');

    expect(xAxis.node()).not.toBeNull();
    expect(yAxis.node()).not.toBeNull();
  });

  test('returns colorManager with highlight methods', () => {
    const chart = createTrajectoryChart(container, sampleData);

    expect(chart.colorManager).toBeDefined();
    expect(typeof chart.colorManager.isHighlighted).toBe('function');
    expect(typeof chart.colorManager.toggleHighlight).toBe('function');
    expect(typeof chart.colorManager.getColor).toBe('function');
  });

  test('returns toggleHighlight function', () => {
    const chart = createTrajectoryChart(container, sampleData);

    expect(typeof chart.toggleHighlight).toBe('function');
  });
});

describe('colorManager', () => {
  let container;
  let chart;

  beforeEach(() => {
    document.body.innerHTML = '<div id="chart-container" style="width: 800px;"></div>';
    container = d3.select('#chart-container');
    chart = createTrajectoryChart(container, sampleData);
  });

  test('default countries are highlighted', () => {
    expect(chart.colorManager.isHighlighted('CHN')).toBe(true);
    expect(chart.colorManager.isHighlighted('IND')).toBe(true);
    expect(chart.colorManager.isHighlighted('USA')).toBe(true);
  });

  test('non-default countries are not highlighted', () => {
    expect(chart.colorManager.isHighlighted('GBR')).toBe(false);
  });

  test('toggleHighlight toggles highlight state', () => {
    // Toggle off
    chart.colorManager.toggleHighlight('CHN');
    expect(chart.colorManager.isHighlighted('CHN')).toBe(false);

    // Toggle on
    chart.colorManager.toggleHighlight('CHN');
    expect(chart.colorManager.isHighlighted('CHN')).toBe(true);
  });

  test('getColor returns color for highlighted country', () => {
    const color = chart.colorManager.getColor('CHN');
    expect(color).toBe('#E53935'); // Red for China
  });

  test('getColor returns muted color for non-highlighted country', () => {
    const color = chart.colorManager.getColor('GBR');
    expect(color).toContain('rgba'); // Muted color
  });

  test('assigns new color when country is highlighted', () => {
    chart.colorManager.toggleHighlight('GBR'); // Highlight UK
    const color = chart.colorManager.getColor('GBR');
    expect(color).not.toContain('rgba'); // Should be a solid color now
  });
});

describe('chart.toggleHighlight', () => {
  let container;
  let chart;

  beforeEach(() => {
    document.body.innerHTML = '<div id="chart-container" style="width: 800px;"></div>';
    container = d3.select('#chart-container');
    chart = createTrajectoryChart(container, sampleData);
  });

  test('toggles country highlight and updates trajectories', () => {
    // Initially CHN is highlighted
    expect(chart.colorManager.isHighlighted('CHN')).toBe(true);

    // Toggle off
    chart.toggleHighlight('CHN');
    expect(chart.colorManager.isHighlighted('CHN')).toBe(false);

    // The trajectory should now have lower opacity
    const chnLine = container.select('[data-iso3="CHN"] .trajectory-line');
    const opacity = parseFloat(chnLine.style('stroke-opacity'));
    expect(opacity).toBeLessThan(0.5);
  });

  test('can highlight non-default country', () => {
    // Initially GBR is not highlighted
    expect(chart.colorManager.isHighlighted('GBR')).toBe(false);

    // Toggle on
    chart.toggleHighlight('GBR');
    expect(chart.colorManager.isHighlighted('GBR')).toBe(true);

    // The trajectory should now have higher opacity
    const gbrLine = container.select('[data-iso3="GBR"] .trajectory-line');
    const opacity = parseFloat(gbrLine.style('stroke-opacity'));
    expect(opacity).toBeGreaterThan(0.5);
  });
});
