import * as d3 from 'd3';
import { createLogScale } from '../core/scales.js';
import { createXAxis, createYAxis } from '../core/axes.js';
import { COUNTRY_COLORS, MUTED_COLORS, UI_COLORS, isHighlightedCountry } from '../core/colors.js';
import { smoothValues } from '../core/utils.js';
import { createContainer } from '../components/Container.js';
import { createLegend, updateLegendVisibility } from '../components/Legend.js';
import { createTooltip, showTooltip, hideTooltip, positionTooltip, formatTrajectoryTooltip } from '../components/Tooltip.js';
import { createSearchFilter, filterItems } from '../components/SearchFilter.js';

/**
 * Creates a trajectory chart showing city GDP vs PM2.5 over time.
 *
 * @param {d3.Selection} parent - Parent element to append chart to
 * @param {Object} data - Chart data (from export_trajectory_data.py)
 * @param {Object} [options] - Configuration options
 * @returns {Object} Chart instance with update methods
 */
export function createTrajectoryChart(parent, data, options = {}) {
  const {
    width,
    height = 650,
    margin = { top: 30, right: 250, bottom: 60, left: 80 },
    showSearch = true,
    showLegend = true,
  } = options;

  // Track visibility state
  const visibilityState = {};
  data.cities.forEach((city) => {
    visibilityState[city.iso3] = true;
  });

  // Create container
  const { container, svg, chartArea, dimensions } = createContainer(parent, {
    width,
    height,
    margin,
  });

  // Create scales
  const xScale = createLogScale({
    domain: [data.bounds.gdp.min * 0.9, data.bounds.gdp.max * 1.1],
    range: [0, dimensions.innerWidth],
    nice: true,
  });

  const yScale = createLogScale({
    domain: [data.bounds.pm25.min * 0.9, data.bounds.pm25.max * 1.1],
    range: [dimensions.innerHeight, 0],
    nice: true,
  });

  // Create axes
  createXAxis(svg.select('.chart-area'), xScale, {
    y: dimensions.innerHeight,
    label: data.metadata.xAxis,
    tickFormat: (d) => {
      if (d >= 1000) {
        return `$${d / 1000}K`;
      }
      return `$${d}`;
    },
    grid: true,
    gridHeight: dimensions.innerHeight,
  });

  createYAxis(svg.select('.chart-area'), yScale, {
    x: 0,
    label: data.metadata.yAxis,
    tickFormat: (d) => d.toFixed(0),
    grid: true,
    gridWidth: dimensions.innerWidth,
  });

  // Line generator with smoothing
  const line = d3
    .line()
    .x((d) => xScale(d.gdp))
    .y((d) => yScale(d.pm25))
    .curve(d3.curveCardinal.tension(0.5));

  // Separate highlighted and non-highlighted cities
  const highlightedCities = data.cities.filter((c) => isHighlightedCountry(c.iso3));
  const otherCities = data.cities.filter((c) => !isHighlightedCountry(c.iso3));

  // Render non-highlighted cities first (background)
  const otherGroup = chartArea.append('g').attr('class', 'trajectories-other');

  otherCities.forEach((city) => {
    renderTrajectory(otherGroup, city, xScale, yScale, line, false);
  });

  // Render highlighted cities on top
  const highlightedGroup = chartArea.append('g').attr('class', 'trajectories-highlighted');

  highlightedCities.forEach((city) => {
    renderTrajectory(highlightedGroup, city, xScale, yScale, line, true);
  });

  // Create tooltip
  createTooltip(container);

  // Set up hover interactions
  chartArea
    .selectAll('.city-group')
    .on('mouseenter', function (event, d) {
      const cityData = d3.select(this).datum();
      highlightCity(container, cityData.id);

      const tooltipContent = formatTrajectoryTooltip(cityData);
      showTooltip(container, tooltipContent);
    })
    .on('mousemove', function (event) {
      const [x, y] = d3.pointer(event, container.node());
      positionTooltip(container, x, y);
    })
    .on('mouseleave', function () {
      highlightCity(container, null);
      hideTooltip(container);
    });

  // Create legend if enabled
  if (showLegend) {
    // Build legend items from unique countries
    const countryMap = new Map();
    data.cities.forEach((city) => {
      if (!countryMap.has(city.iso3)) {
        countryMap.set(city.iso3, {
          id: city.iso3,
          label: city.country,
          color: COUNTRY_COLORS[city.iso3] || MUTED_COLORS.marker,
          visible: true,
        });
      }
    });

    // Sort: highlighted countries first, then alphabetically
    const legendItems = Array.from(countryMap.values()).sort((a, b) => {
      const aHighlighted = isHighlightedCountry(a.id);
      const bHighlighted = isHighlightedCountry(b.id);
      if (aHighlighted && !bHighlighted) return -1;
      if (!aHighlighted && bHighlighted) return 1;
      return a.label.localeCompare(b.label);
    });

    // Create legend container positioned to the right
    const legendContainer = container
      .append('div')
      .style('position', 'absolute')
      .style('top', `${margin.top}px`)
      .style('right', '10px')
      .style('max-height', `${dimensions.innerHeight}px`)
      .style('overflow-y', 'auto');

    createLegend(legendContainer, legendItems, {
      onClick: (iso3) => {
        visibilityState[iso3] = !visibilityState[iso3];
        updateVisibility(container, visibilityState);
        updateLegendVisibility(legendContainer, visibilityState);
      },
      onHover: (iso3) => {
        highlightCountry(container, iso3);
      },
      onHoverEnd: () => {
        highlightCountry(container, null);
      },
    });
  }

  // Create search if enabled
  if (showSearch) {
    const searchContainer = container
      .insert('div', ':first-child')
      .style('margin-bottom', '12px');

    createSearchFilter(searchContainer, data.cities, {
      placeholder: 'Search cities or countries...',
      onSearch: (term, results) => {
        if (!term) {
          // Reset all to normal
          chartArea.selectAll('.city-group').style('opacity', 1);
          return;
        }

        const resultIds = new Set(results.map((r) => r.id));
        chartArea.selectAll('.city-group').style('opacity', function () {
          const cityId = d3.select(this).attr('data-city-id');
          return resultIds.has(cityId) ? 1 : 0.1;
        });
      },
    });
  }

  return {
    container,
    svg,
    updateVisibility: (state) => updateVisibility(container, state),
    highlightCity: (id) => highlightCity(container, id),
  };
}

/**
 * Renders a single city trajectory.
 */
function renderTrajectory(group, city, xScale, yScale, lineGenerator, isHighlighted) {
  const color = COUNTRY_COLORS[city.iso3] || MUTED_COLORS.line;

  // Smooth trajectory values (preserve endpoints)
  const gdpValues = city.trajectory.map((p) => p.gdp);
  const pm25Values = city.trajectory.map((p) => p.pm25);
  const smoothedGdp = smoothValues(gdpValues, 3);
  const smoothedPm25 = smoothValues(pm25Values, 3);

  const smoothedTrajectory = city.trajectory.map((p, i) => ({
    ...p,
    gdp: smoothedGdp[i],
    pm25: smoothedPm25[i],
  }));

  const cityGroup = group
    .append('g')
    .attr('class', 'city-group')
    .attr('data-city-id', city.id)
    .attr('data-iso3', city.iso3)
    .datum(city);

  // Draw trajectory line
  cityGroup
    .append('path')
    .attr('class', 'trajectory-line')
    .attr('d', lineGenerator(smoothedTrajectory))
    .style('fill', 'none')
    .style('stroke', color)
    .style('stroke-width', isHighlighted ? 3 : 1.5)
    .style('stroke-opacity', isHighlighted ? 1 : 0.4)
    .style('transition', 'stroke-width 0.15s ease, stroke-opacity 0.15s ease');

  // Draw start marker (solid circle)
  const startPoint = city.trajectory[0];
  cityGroup
    .append('circle')
    .attr('class', 'marker-start')
    .attr('cx', xScale(startPoint.gdp))
    .attr('cy', yScale(startPoint.pm25))
    .attr('r', isHighlighted ? 5 : 3)
    .style('fill', color)
    .style('stroke', 'none')
    .style('opacity', isHighlighted ? 1 : 0.6);

  // Draw end marker (hollow triangle)
  const endPoint = city.trajectory[city.trajectory.length - 1];
  const triangleSize = isHighlighted ? 6 : 4;
  const triangle = d3.symbol().type(d3.symbolTriangle).size(triangleSize * triangleSize * 2);

  cityGroup
    .append('path')
    .attr('class', 'marker-end')
    .attr('d', triangle)
    .attr('transform', `translate(${xScale(endPoint.gdp)},${yScale(endPoint.pm25)})`)
    .style('fill', 'white')
    .style('stroke', color)
    .style('stroke-width', isHighlighted ? 2 : 1.5)
    .style('opacity', isHighlighted ? 1 : 0.6);

  // Add year labels for highlighted cities
  if (isHighlighted) {
    cityGroup
      .append('text')
      .attr('class', 'year-label')
      .attr('x', xScale(startPoint.gdp))
      .attr('y', yScale(startPoint.pm25) - 10)
      .attr('text-anchor', 'middle')
      .style('font-size', '10px')
      .style('fill', color)
      .text(city.yearStart);

    cityGroup
      .append('text')
      .attr('class', 'year-label')
      .attr('x', xScale(endPoint.gdp))
      .attr('y', yScale(endPoint.pm25) - 10)
      .attr('text-anchor', 'middle')
      .style('font-size', '10px')
      .style('fill', color)
      .text(city.yearEnd);
  }
}

/**
 * Updates visibility of trajectories based on country.
 */
export function updateVisibility(container, visibilityState) {
  container.selectAll('.city-group').each(function () {
    const iso3 = d3.select(this).attr('data-iso3');
    const visible = visibilityState[iso3];

    d3.select(this)
      .style('opacity', visible ? 1 : 0)
      .style('pointer-events', visible ? 'all' : 'none');
  });
}

/**
 * Highlights a specific city by ID.
 */
export function highlightCity(container, cityId) {
  container.selectAll('.city-group').each(function () {
    const group = d3.select(this);
    const id = group.attr('data-city-id');
    const iso3 = group.attr('data-iso3');
    const isThisCity = id === cityId;
    const countryIsHighlighted = isHighlightedCountry(iso3);

    if (cityId === null) {
      // Reset to default
      group.select('.trajectory-line').style('stroke-width', countryIsHighlighted ? 3 : 1.5).style('stroke-opacity', countryIsHighlighted ? 1 : 0.4);
    } else if (isThisCity) {
      // Highlight this city
      group.select('.trajectory-line').style('stroke-width', 5).style('stroke-opacity', 1);
      group.raise(); // Bring to front
    } else {
      // Dim other cities
      group.select('.trajectory-line').style('stroke-opacity', 0.1);
    }
  });
}

/**
 * Highlights all cities from a country.
 */
export function highlightCountry(container, iso3) {
  container.selectAll('.city-group').each(function () {
    const group = d3.select(this);
    const cityIso3 = group.attr('data-iso3');
    const isHighlighted = isHighlightedCountry(cityIso3);

    if (iso3 === null) {
      // Reset to default
      group.select('.trajectory-line').style('stroke-width', isHighlighted ? 3 : 1.5).style('stroke-opacity', isHighlighted ? 1 : 0.4);
    } else if (cityIso3 === iso3) {
      // Highlight this country's cities
      group.select('.trajectory-line').style('stroke-width', 4).style('stroke-opacity', 1);
      group.raise();
    } else {
      // Dim other cities
      group.select('.trajectory-line').style('stroke-opacity', 0.1);
    }
  });
}

export { createContainer } from '../components/Container.js';
