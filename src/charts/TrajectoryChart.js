import * as d3 from 'd3';
import { createLogScale } from '../core/scales.js';
import { createXAxis, createYAxis } from '../core/axes.js';
import {
  COUNTRY_COLORS,
  MUTED_COLORS,
  UI_COLORS,
  isHighlightedCountry,
  createColorManager,
  createRegionColorManager,
  REGIONS,
  ISO3_TO_REGION,
  REGION_COLORS,
} from '../core/colors.js';
import { smoothValues } from '../core/utils.js';
import { createContainer } from '../components/Container.js';
import { createLegend, updateLegendVisibility } from '../components/Legend.js';
import { createTooltip, showTooltip, hideTooltip, positionTooltip, formatTrajectoryTooltip } from '../components/Tooltip.js';
import { createSearchFilter } from '../components/SearchFilter.js';

/**
 * Creates a trajectory chart showing city GDP vs PM2.5 over time.
 * Features:
 * - Dynamic highlight management (click legend to toggle country highlights)
 * - Active state protection (highlighted countries never fully dim during hover)
 * - Dynamic color assignment for newly highlighted countries
 *
 * @param {d3.Selection} parent - Parent element to append chart to
 * @param {Object} data - Chart data (from export_trajectory_data.py)
 * @param {Object} [options] - Configuration options
 * @param {number} [options.width] - Chart width (defaults to container width)
 * @param {number} [options.height=650] - Chart height
 * @param {Object} [options.margin] - Chart margins
 * @param {boolean} [options.showSearch=true] - Show search input
 * @param {boolean} [options.showLegend=true] - Show legend
 * @param {boolean} [options.showLegendControls=true] - Show legend mode toggle and deselect all button
 * @param {boolean} [options.showGrid=false] - Show grid lines
 * @param {string[]} [options.initialHighlights=['CHN','IND','USA']] - Initial highlighted countries
 * @param {number[]} [options.xTickValues] - Custom X axis tick values
 * @param {number[]} [options.yTickValues] - Custom Y axis tick values
 * @returns {Object} Chart instance with update methods
 */
export function createTrajectoryChart(parent, data, options = {}) {
  const {
    width,
    height = 650,
    margin = { top: 30, right: 250, bottom: 70, left: 90 },
    showSearch = true,
    showLegend = true,
    showLegendControls = true,
    showGrid = false,
    initialHighlights = ['CHN', 'IND', 'USA'],
    xTickValues = [1000, 2000, 5000, 10000, 20000, 50000, 100000, 200000],
    yTickValues = [5, 10, 20, 50, 100, 200],
  } = options;

  // Create color managers for active highlights
  const colorManager = createColorManager(initialHighlights);
  const regionColorManager = createRegionColorManager();

  // Legend mode state: 'country' or 'region'
  let legendMode = 'country';

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

  // Create axes with explicit tick values
  createXAxis(chartArea, xScale, {
    y: dimensions.innerHeight,
    label: data.metadata.xAxis,
    tickFormat: (d) => (d >= 1000 ? `$${d / 1000}K` : `$${d}`),
    tickValues: xTickValues,
    grid: showGrid,
    gridHeight: dimensions.innerHeight,
  });

  createYAxis(chartArea, yScale, {
    x: 0,
    label: data.metadata.yAxis,
    labelX: -15,
    tickFormat: (d) => d,
    tickValues: yTickValues,
    grid: showGrid,
    gridWidth: dimensions.innerWidth,
  });

  // Line generator with smoothing
  const line = d3
    .line()
    .x((d) => xScale(d.gdp))
    .y((d) => yScale(d.pm25))
    .curve(d3.curveCardinal.tension(0.5));

  // Function to check if a city is highlighted (based on current mode)
  function isCityHighlighted(city) {
    if (legendMode === 'country') {
      return colorManager.isHighlighted(city.iso3);
    } else {
      return regionColorManager.isCountryInHighlightedRegion(city.iso3);
    }
  }

  // Function to get color for a city (based on current mode)
  function getCityColor(city) {
    if (legendMode === 'country') {
      return colorManager.getColor(city.iso3);
    } else {
      return regionColorManager.getColor(city.iso3);
    }
  }

  // Function to update all trajectories based on current highlight state
  function updateAllTrajectories() {
    chartArea.selectAll('.city-group').each(function () {
      const g = d3.select(this);
      const city = g.datum();
      const highlighted = isCityHighlighted(city);
      const color = getCityColor(city);

      g.select('.trajectory-line')
        .style('stroke', color)
        .style('stroke-width', highlighted ? 2.5 : 1)
        .style('stroke-opacity', highlighted ? 0.9 : 0.25);

      g.select('.marker-start')
        .style('fill', color)
        .attr('r', highlighted ? 4 : 2)
        .style('opacity', highlighted ? 1 : 0.35);

      g.select('.marker-end')
        .style('stroke', color)
        .style('fill', highlighted ? 'white' : color)
        .style('opacity', highlighted ? 1 : 0.35);

      g.selectAll('.year-label')
        .style('opacity', highlighted ? 1 : 0)
        .style('fill', color);
    });
  }

  // Render all cities (sorted so highlighted are on top)
  const sortedCities = [...data.cities].sort((a, b) => {
    const aH = colorManager.isHighlighted(a.iso3) ? 1 : 0;
    const bH = colorManager.isHighlighted(b.iso3) ? 1 : 0;
    return aH - bH;
  });

  sortedCities.forEach((city) => {
    renderTrajectory(chartArea, city, xScale, yScale, line, colorManager);
  });

  // Create tooltip
  createTooltip(container);

  // Set up hover interactions - RESPECTS ACTIVE STATE
  chartArea
    .selectAll('.city-group')
    .style('cursor', 'pointer')
    .on('mouseenter', function (event) {
      const hoveredCity = d3.select(this).datum();

      chartArea.selectAll('.city-group').each(function () {
        const g = d3.select(this);
        const city = g.datum();
        const isHoveredCity = city.id === hoveredCity.id;
        const cityIsActive = isCityHighlighted(city);

        if (isHoveredCity) {
          // Always highlight the hovered city
          g.select('.trajectory-line')
            .style('stroke-width', 4)
            .style('stroke-opacity', 1);
          g.raise();
        } else if (cityIsActive) {
          // NEVER dim active/highlighted countries - keep them visible
          g.select('.trajectory-line').style('stroke-opacity', 0.5);
        } else {
          // Dim non-active, non-hovered cities
          g.select('.trajectory-line').style('stroke-opacity', 0.05);
        }
      });

      const tooltipContent = formatTrajectoryTooltip(hoveredCity);
      showTooltip(container, tooltipContent);
    })
    .on('mousemove', function (event) {
      const [x, y] = d3.pointer(event, container.node());
      positionTooltip(container, x, y, { preferAbove: true });
    })
    .on('mouseleave', function () {
      updateAllTrajectories();
      hideTooltip(container);
    });

  // Create legend if enabled
  let legendContainerEl = null;
  let legendItemsContainer = null;

  if (showLegend) {
    // Build legend items from unique countries
    const countryMap = new Map();
    data.cities.forEach((city) => {
      if (!countryMap.has(city.iso3)) {
        countryMap.set(city.iso3, {
          iso3: city.iso3,
          name: city.country,
        });
      }
    });

    // Sort: highlighted countries first, then alphabetically
    const sortedCountries = Array.from(countryMap.values()).sort((a, b) => {
      const aHighlighted = colorManager.isHighlighted(a.iso3) ? 0 : 1;
      const bHighlighted = colorManager.isHighlighted(b.iso3) ? 0 : 1;
      if (aHighlighted !== bHighlighted) return aHighlighted - bHighlighted;
      return a.name.localeCompare(b.name);
    });

    // Get unique regions from the data
    const regionsInData = [...new Set(data.cities.map((c) => ISO3_TO_REGION[c.iso3]).filter(Boolean))];
    const sortedRegions = regionsInData.sort((a, b) => a.localeCompare(b));

    // Create legend container positioned to the right
    legendContainerEl = container
      .append('div')
      .style('position', 'absolute')
      .style('top', `${margin.top + 10}px`)
      .style('right', '20px')
      .style('background', 'white')
      .style('border-radius', '4px')
      .style('padding', '8px 0')
      .style('width', '190px');

    // Create controls container (mode toggle + deselect all)
    if (showLegendControls) {
      const controlsContainer = legendContainerEl
        .append('div')
        .style('padding', '0 12px 8px')
        .style('border-bottom', `1px solid ${UI_COLORS.gridLight}`)
        .style('margin-bottom', '8px');

      // Mode toggle buttons
      const modeToggle = controlsContainer.append('div').style('display', 'flex').style('gap', '4px').style('margin-bottom', '8px');

      const countryModeBtn = modeToggle
        .append('button')
        .attr('class', 'mode-btn')
        .style('flex', '1')
        .style('padding', '4px 8px')
        .style('font-size', '11px')
        .style('border', `1px solid ${UI_COLORS.border}`)
        .style('border-radius', '4px')
        .style('cursor', 'pointer')
        .style('background', legendMode === 'country' ? UI_COLORS.text : 'white')
        .style('color', legendMode === 'country' ? 'white' : UI_COLORS.text)
        .style('font-weight', legendMode === 'country' ? '600' : '400')
        .text('Country');

      const regionModeBtn = modeToggle
        .append('button')
        .attr('class', 'mode-btn')
        .style('flex', '1')
        .style('padding', '4px 8px')
        .style('font-size', '11px')
        .style('border', `1px solid ${UI_COLORS.border}`)
        .style('border-radius', '4px')
        .style('cursor', 'pointer')
        .style('background', legendMode === 'region' ? UI_COLORS.text : 'white')
        .style('color', legendMode === 'region' ? 'white' : UI_COLORS.text)
        .style('font-weight', legendMode === 'region' ? '600' : '400')
        .text('Region');

      // Deselect All button
      const deselectAllBtn = controlsContainer
        .append('button')
        .style('width', '100%')
        .style('padding', '4px 8px')
        .style('font-size', '11px')
        .style('border', `1px solid ${UI_COLORS.border}`)
        .style('border-radius', '4px')
        .style('cursor', 'pointer')
        .style('background', 'white')
        .style('color', UI_COLORS.text)
        .text('Deselect All');

      // Mode toggle handlers
      countryModeBtn.on('click', function () {
        if (legendMode !== 'country') {
          legendMode = 'country';
          countryModeBtn.style('background', UI_COLORS.text).style('color', 'white').style('font-weight', '600');
          regionModeBtn.style('background', 'white').style('color', UI_COLORS.text).style('font-weight', '400');
          renderLegendItems();
          updateAllTrajectories();
        }
      });

      regionModeBtn.on('click', function () {
        if (legendMode !== 'region') {
          legendMode = 'region';
          regionModeBtn.style('background', UI_COLORS.text).style('color', 'white').style('font-weight', '600');
          countryModeBtn.style('background', 'white').style('color', UI_COLORS.text).style('font-weight', '400');
          renderLegendItems();
          updateAllTrajectories();
        }
      });

      // Deselect All handler
      deselectAllBtn.on('click', function () {
        if (legendMode === 'country') {
          colorManager.clearHighlights();
        } else {
          regionColorManager.clearHighlights();
        }
        updateLegend();
        updateAllTrajectories();
      });
    }

    // Scrollable legend items container
    legendItemsContainer = legendContainerEl
      .append('div')
      .attr('class', 'legend-items')
      .style('max-height', `${dimensions.innerHeight - (showLegendControls ? 90 : 20)}px`)
      .style('overflow-y', 'auto');

    // Function to update legend appearance
    function updateLegend() {
      if (legendMode === 'country') {
        legendItemsContainer.selectAll('.legend-item').each(function () {
          const item = d3.select(this);
          const iso3 = item.attr('data-iso3');
          const highlighted = colorManager.isHighlighted(iso3);
          const color = colorManager.getColor(iso3);

          item.select('.legend-marker').style('background-color', color).style('opacity', highlighted ? 1 : 0.4);

          item
            .select('.legend-label')
            .style('font-weight', highlighted ? '600' : '400')
            .style('color', highlighted ? UI_COLORS.text : UI_COLORS.textLight);
        });
      } else {
        legendItemsContainer.selectAll('.legend-item').each(function () {
          const item = d3.select(this);
          const region = item.attr('data-region');
          const highlighted = regionColorManager.isRegionHighlighted(region);
          const color = regionColorManager.getRegionColor(region);

          item.select('.legend-marker').style('background-color', highlighted ? color : MUTED_COLORS.line).style('opacity', highlighted ? 1 : 0.4);

          item
            .select('.legend-label')
            .style('font-weight', highlighted ? '600' : '400')
            .style('color', highlighted ? UI_COLORS.text : UI_COLORS.textLight);
        });
      }
    }

    // Function to render legend items based on current mode
    function renderLegendItems() {
      legendItemsContainer.selectAll('.legend-item').remove();

      if (legendMode === 'country') {
        // Render country items
        sortedCountries.forEach((country) => {
          const highlighted = colorManager.isHighlighted(country.iso3);
          const color = colorManager.getColor(country.iso3);

          const item = legendItemsContainer
            .append('div')
            .attr('class', 'legend-item')
            .attr('data-iso3', country.iso3)
            .style('display', 'flex')
            .style('align-items', 'center')
            .style('padding', '5px 12px')
            .style('cursor', 'pointer')
            .style('border-radius', '4px')
            .style('transition', 'background-color 0.15s ease');

          item
            .append('div')
            .attr('class', 'legend-marker')
            .style('width', '12px')
            .style('height', '12px')
            .style('border-radius', '2px')
            .style('margin-right', '8px')
            .style('background-color', color)
            .style('opacity', highlighted ? 1 : 0.4)
            .style('flex-shrink', 0)
            .style('transition', 'all 0.15s ease');

          item
            .append('span')
            .attr('class', 'legend-label')
            .style('font-size', '12px')
            .style('color', highlighted ? UI_COLORS.text : UI_COLORS.textLight)
            .style('font-weight', highlighted ? '600' : '400')
            .style('white-space', 'nowrap')
            .style('overflow', 'hidden')
            .style('text-overflow', 'ellipsis')
            .style('transition', 'all 0.15s ease')
            .text(country.name);

          // Click to toggle highlight
          item.on('click', function () {
            colorManager.toggleHighlight(country.iso3);
            updateAllTrajectories();
            updateLegend();

            // Re-sort: bring highlighted to front
            chartArea.selectAll('.city-group').sort((a, b) => {
              const aH = isCityHighlighted(a) ? 1 : 0;
              const bH = isCityHighlighted(b) ? 1 : 0;
              return aH - bH;
            });
          });

          // LEGEND HOVER - RESPECTS ACTIVE STATE
          item.on('mouseenter', function () {
            d3.select(this).style('background-color', 'rgba(0,0,0,0.05)');

            const hoveredIso3 = country.iso3;

            chartArea.selectAll('.city-group').each(function () {
              const g = d3.select(this);
              const city = g.datum();
              const isHoveredCountry = city.iso3 === hoveredIso3;
              const cityIsActive = isCityHighlighted(city);

              if (isHoveredCountry) {
                g.select('.trajectory-line').style('stroke-width', 3).style('stroke-opacity', 0.9);
                g.raise();
              } else if (cityIsActive) {
                g.select('.trajectory-line').style('stroke-opacity', 0.5);
              } else {
                g.select('.trajectory-line').style('stroke-opacity', 0.05);
              }
            });
          });

          item.on('mouseleave', function () {
            d3.select(this).style('background-color', 'transparent');
            updateAllTrajectories();
          });
        });
      } else {
        // Render region items
        sortedRegions.forEach((region) => {
          const highlighted = regionColorManager.isRegionHighlighted(region);
          const color = highlighted ? regionColorManager.getRegionColor(region) : MUTED_COLORS.line;

          const item = legendItemsContainer
            .append('div')
            .attr('class', 'legend-item')
            .attr('data-region', region)
            .style('display', 'flex')
            .style('align-items', 'center')
            .style('padding', '5px 12px')
            .style('cursor', 'pointer')
            .style('border-radius', '4px')
            .style('transition', 'background-color 0.15s ease');

          item
            .append('div')
            .attr('class', 'legend-marker')
            .style('width', '12px')
            .style('height', '12px')
            .style('border-radius', '2px')
            .style('margin-right', '8px')
            .style('background-color', color)
            .style('opacity', highlighted ? 1 : 0.4)
            .style('flex-shrink', 0)
            .style('transition', 'all 0.15s ease');

          item
            .append('span')
            .attr('class', 'legend-label')
            .style('font-size', '12px')
            .style('color', highlighted ? UI_COLORS.text : UI_COLORS.textLight)
            .style('font-weight', highlighted ? '600' : '400')
            .style('white-space', 'nowrap')
            .style('overflow', 'hidden')
            .style('text-overflow', 'ellipsis')
            .style('transition', 'all 0.15s ease')
            .text(region);

          // Click to toggle region highlight
          item.on('click', function () {
            regionColorManager.toggleRegion(region);
            updateAllTrajectories();
            updateLegend();

            // Re-sort: bring highlighted to front
            chartArea.selectAll('.city-group').sort((a, b) => {
              const aH = isCityHighlighted(a) ? 1 : 0;
              const bH = isCityHighlighted(b) ? 1 : 0;
              return aH - bH;
            });
          });

          // LEGEND HOVER - RESPECTS ACTIVE STATE
          item.on('mouseenter', function () {
            d3.select(this).style('background-color', 'rgba(0,0,0,0.05)');

            const hoveredRegion = region;

            chartArea.selectAll('.city-group').each(function () {
              const g = d3.select(this);
              const city = g.datum();
              const cityRegion = ISO3_TO_REGION[city.iso3];
              const isHoveredRegion = cityRegion === hoveredRegion;
              const cityIsActive = isCityHighlighted(city);

              if (isHoveredRegion) {
                g.select('.trajectory-line').style('stroke-width', 3).style('stroke-opacity', 0.9);
                g.raise();
              } else if (cityIsActive) {
                g.select('.trajectory-line').style('stroke-opacity', 0.5);
              } else {
                g.select('.trajectory-line').style('stroke-opacity', 0.05);
              }
            });
          });

          item.on('mouseleave', function () {
            d3.select(this).style('background-color', 'transparent');
            updateAllTrajectories();
          });
        });
      }
    }

    // Initial render
    renderLegendItems();
  }

  // Create search if enabled
  if (showSearch) {
    const searchContainer = container.insert('div', 'svg').style('margin-bottom', '12px');

    createSearchFilter(searchContainer, data.cities, {
      placeholder: 'Search cities or countries...',
      onSearch: (term, results) => {
        if (!term || term.trim() === '') {
          updateAllTrajectories();
          return;
        }

        const lowerTerm = term.toLowerCase().trim();

        chartArea.selectAll('.city-group').each(function () {
          const g = d3.select(this);
          const city = g.datum();

          const nameMatch = city.name && city.name.toLowerCase().includes(lowerTerm);
          const countryMatch = city.country && city.country.toLowerCase().includes(lowerTerm);
          const iso3Match = city.iso3 && city.iso3.toLowerCase().includes(lowerTerm);
          const match = nameMatch || countryMatch || iso3Match;

          g.select('.trajectory-line')
            .style('stroke-opacity', match ? 0.9 : 0.03)
            .style('stroke-width', match ? 3 : 1);

          g.select('.marker-start').style('opacity', match ? 1 : 0.05);

          g.select('.marker-end').style('opacity', match ? 1 : 0.05);

          g.selectAll('.year-label').style('opacity', match && isCityHighlighted(city) ? 1 : 0);
        });
      },
    });
  }

  return {
    container,
    svg,
    colorManager,
    regionColorManager,
    updateAllTrajectories,
    toggleHighlight: (iso3) => {
      colorManager.toggleHighlight(iso3);
      updateAllTrajectories();
    },
    toggleRegion: (region) => {
      regionColorManager.toggleRegion(region);
      updateAllTrajectories();
    },
    getLegendMode: () => legendMode,
    deselectAll: () => {
      if (legendMode === 'country') {
        colorManager.clearHighlights();
      } else {
        regionColorManager.clearHighlights();
      }
      updateAllTrajectories();
    },
  };
}

/**
 * Renders a single city trajectory.
 */
function renderTrajectory(chartArea, city, xScale, yScale, lineGenerator, colorManager) {
  const highlighted = colorManager.isHighlighted(city.iso3);
  const color = colorManager.getColor(city.iso3);

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

  const cityGroup = chartArea
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
    .style('stroke-width', highlighted ? 2.5 : 1)
    .style('stroke-opacity', highlighted ? 0.9 : 0.25)
    .style('transition', 'stroke-width 0.15s ease, stroke-opacity 0.15s ease, stroke 0.15s ease');

  // Draw start marker (solid circle)
  const startPoint = city.trajectory[0];
  cityGroup
    .append('circle')
    .attr('class', 'marker-start')
    .attr('cx', xScale(startPoint.gdp))
    .attr('cy', yScale(startPoint.pm25))
    .attr('r', highlighted ? 4 : 2)
    .style('fill', color)
    .style('opacity', highlighted ? 1 : 0.35)
    .style('transition', 'all 0.15s ease');

  // Draw end marker (hollow triangle)
  const endPoint = city.trajectory[city.trajectory.length - 1];
  const size = highlighted ? 5 : 3;
  const triangle = d3.symbol().type(d3.symbolTriangle).size(size * size * 2);

  cityGroup
    .append('path')
    .attr('class', 'marker-end')
    .attr('d', triangle)
    .attr('transform', `translate(${xScale(endPoint.gdp)},${yScale(endPoint.pm25)})`)
    .style('fill', highlighted ? 'white' : color)
    .style('stroke', color)
    .style('stroke-width', highlighted ? 1.5 : 1)
    .style('opacity', highlighted ? 1 : 0.35)
    .style('transition', 'all 0.15s ease');

  // Add year labels (always render, opacity controlled by highlight state)
  cityGroup
    .append('text')
    .attr('class', 'year-label year-start')
    .attr('x', xScale(startPoint.gdp))
    .attr('y', yScale(startPoint.pm25) - 8)
    .attr('text-anchor', 'middle')
    .style('font-size', '10px')
    .style('fill', color)
    .style('font-weight', '600')
    .style('opacity', highlighted ? 1 : 0)
    .style('pointer-events', 'none')
    .text(city.yearStart);

  cityGroup
    .append('text')
    .attr('class', 'year-label year-end')
    .attr('x', xScale(endPoint.gdp))
    .attr('y', yScale(endPoint.pm25) - 8)
    .attr('text-anchor', 'middle')
    .style('font-size', '10px')
    .style('fill', color)
    .style('font-weight', '600')
    .style('opacity', highlighted ? 1 : 0)
    .style('pointer-events', 'none')
    .text(city.yearEnd);

  return cityGroup;
}

export { createContainer } from '../components/Container.js';
