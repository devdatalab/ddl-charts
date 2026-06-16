# @devdatalab/ddl-charts

D3-based charting library for publication-quality, OWID-inspired interactive data visualizations.

## Installation

```bash
npm install @devdatalab/ddl-charts
```

## Usage

```javascript
import { TrajectoryChart } from '@devdatalab/ddl-charts';
// The stylesheet is not auto-imported — include it once in your app:
import '@devdatalab/ddl-charts/styles/ddl-theme.css';

const chart = TrajectoryChart(document.getElementById('chart'), data, {
  initialHighlights: ['CHN', 'IND', 'USA'],
  showSearch: true,
  showLegend: true
});
```

## Architecture

```
src/
├── core/           # Foundation utilities
│   ├── scales.js   # D3 scale factories (log, linear, time)
│   ├── axes.js     # OWID-styled axis generators
│   ├── colors.js   # Color palettes, country/region highlighting
│   └── utils.js    # Formatting, data processing, debounce
├── components/     # Reusable UI elements
│   ├── Tooltip.js  # Smart-positioned hover tooltips
│   ├── Legend.js   # Interactive legend with state
│   ├── SearchFilter.js  # Search input with filtering
│   └── Container.js     # Responsive SVG containers
├── charts/         # Chart implementations
│   └── TrajectoryChart.js  # GDP vs PM2.5 trajectory visualization
└── styles/
    └── ddl-theme.css  # DDL / OWID-inspired theming
```

## Core Modules

### Scales (`core/scales.js`)
- `createLogScale(domain, range, options)` - Logarithmic scales for GDP, population
- `createLinearScale(domain, range, options)` - Linear scales with padding
- `createTimeScale(domain, range, options)` - Temporal scales

### Axes (`core/axes.js`)
- `createXAxis(scale, options)` - Horizontal axis with grid lines
- `createYAxis(scale, options)` - Vertical axis with grid lines

### Colors (`core/colors.js`)
- `createColorManager(highlights)` - Dynamic country highlighting
- `createRegionColorManager()` - Region-based color assignment
- Built-in palettes: `PRIMARY_COLORS`, `CONTINENT_COLORS`, `REGION_COLORS`

### Utilities (`core/utils.js`)
- `formatNumber(n)` - SI notation (1.2M, 3.4B)
- `formatCurrency(n)` - Dollar formatting
- `formatPM25(n)` - µg/m³ formatting
- `smoothValues(arr, window)` - Rolling average

## Components

### Tooltip
```javascript
import { createTooltip, showTooltip, hideTooltip } from '@devdatalab/ddl-charts';

const tooltip = createTooltip(container);
showTooltip(tooltip, x, y, content);
```

### Legend
```javascript
import { createLegend } from '@devdatalab/ddl-charts';

const legend = createLegend(container, items, {
  onItemClick: (item) => console.log('clicked', item),
  onItemHover: (item) => console.log('hovered', item)
});
```

### SearchFilter
```javascript
import { createSearchFilter } from '@devdatalab/ddl-charts';

const search = createSearchFilter(container, {
  placeholder: 'Search cities...',
  onFilter: (query) => filterData(query)
});
```

## TrajectoryChart

The main chart implementation showing city trajectories over time.

```javascript
import { TrajectoryChart } from '@devdatalab/ddl-charts';

const chart = TrajectoryChart(container, data, {
  initialHighlights: ['CHN', 'IND', 'USA'],
  showSearch: true,
  showLegend: true,
  showLegendControls: true,
  showGrid: true
});
```

### Data Format

```json
{
  "metadata": {
    "title": "City GDP vs PM2.5",
    "xAxisLabel": "GDP per capita (USD)",
    "yAxisLabel": "PM2.5 (µg/m³)",
    "yearRange": [2013, 2023]
  },
  "bounds": {
    "xMin": 100, "xMax": 100000,
    "yMin": 1, "yMax": 200
  },
  "cities": [
    {
      "id": "IND_Mumbai",
      "name": "Mumbai",
      "country": "India",
      "iso3": "IND",
      "region": "South Asia",
      "trajectory": [
        { "year": 2013, "x": 5000, "y": 45 },
        { "year": 2023, "x": 8000, "y": 35 }
      ]
    }
  ]
}
```

## Development

```bash
npm install
npm run dev      # Start dev server
npm test         # Run tests
npm run build    # Build for production
```

## Example

See `examples/city_gdp_pm25.html` for a complete working example with 205+ cities.

## License

MIT
