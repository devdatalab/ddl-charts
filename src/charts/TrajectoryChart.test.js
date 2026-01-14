import { describe, test, expect, beforeEach } from 'vitest';
import * as d3 from 'd3';
import { createTrajectoryChart, updateVisibility, highlightCity } from './TrajectoryChart.js';

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
    expect(trajectories.size()).toBe(2);
  });

  test('renders start and end markers', () => {
    createTrajectoryChart(container, sampleData);

    const startMarkers = container.selectAll('.marker-start');
    const endMarkers = container.selectAll('.marker-end');

    expect(startMarkers.size()).toBe(2);
    expect(endMarkers.size()).toBe(2);
  });

  test('creates legend', () => {
    createTrajectoryChart(container, sampleData);

    const legend = container.select('.ddl-legend');
    expect(legend.node()).not.toBeNull();
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
});

describe('updateVisibility', () => {
  let container;
  let chart;

  beforeEach(() => {
    document.body.innerHTML = '<div id="chart-container" style="width: 800px;"></div>';
    container = d3.select('#chart-container');
    chart = createTrajectoryChart(container, sampleData);
  });

  test('hides trajectories for hidden countries', () => {
    updateVisibility(container, { CHN: false, USA: true });

    const chnLine = container.select('[data-iso3="CHN"]');
    expect(chnLine.style('opacity')).toBe('0');
  });

  test('shows trajectories for visible countries', () => {
    updateVisibility(container, { CHN: true, USA: true });

    const usaLine = container.select('[data-iso3="USA"]');
    expect(parseFloat(usaLine.style('opacity'))).toBeGreaterThan(0);
  });
});

describe('highlightCity', () => {
  let container;

  beforeEach(() => {
    document.body.innerHTML = '<div id="chart-container" style="width: 800px;"></div>';
    container = d3.select('#chart-container');
    createTrajectoryChart(container, sampleData);
  });

  test('increases line width for highlighted city', () => {
    highlightCity(container, '1');

    const line = container.select('[data-city-id="1"] .trajectory-line');
    const strokeWidth = parseFloat(line.style('stroke-width'));
    expect(strokeWidth).toBeGreaterThan(2);
  });

  test('clears highlight when id is null', () => {
    highlightCity(container, '1');
    highlightCity(container, null);

    // All lines should return to normal
    const lines = container.selectAll('.trajectory-line');
    lines.each(function () {
      const strokeWidth = parseFloat(d3.select(this).style('stroke-width'));
      expect(strokeWidth).toBeLessThanOrEqual(3);
    });
  });
});
