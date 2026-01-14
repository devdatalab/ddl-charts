import { describe, test, expect } from 'vitest';
import {
  PRIMARY_COLORS,
  COUNTRY_COLORS,
  MUTED_COLORS,
  HIGHLIGHT_COLORS,
  UI_COLORS,
  getCountryColor,
  isHighlightedCountry,
  createColorManager,
} from './colors.js';

describe('color constants', () => {
  test('PRIMARY_COLORS has required colors', () => {
    expect(PRIMARY_COLORS.red).toBeDefined();
    expect(PRIMARY_COLORS.gold).toBeDefined();
    expect(PRIMARY_COLORS.blue).toBeDefined();
  });

  test('COUNTRY_COLORS has default highlighted countries', () => {
    expect(COUNTRY_COLORS.CHN).toBe(PRIMARY_COLORS.red);
    expect(COUNTRY_COLORS.IND).toBe(PRIMARY_COLORS.gold);
    expect(COUNTRY_COLORS.USA).toBe(PRIMARY_COLORS.blue);
  });

  test('HIGHLIGHT_COLORS is an array of colors', () => {
    expect(Array.isArray(HIGHLIGHT_COLORS)).toBe(true);
    expect(HIGHLIGHT_COLORS.length).toBeGreaterThan(0);
    HIGHLIGHT_COLORS.forEach((color) => {
      expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });
  });

  test('MUTED_COLORS has required properties', () => {
    expect(MUTED_COLORS.line).toBeDefined();
    expect(MUTED_COLORS.marker).toBeDefined();
  });

  test('UI_COLORS has required properties', () => {
    expect(UI_COLORS.text).toBeDefined();
    expect(UI_COLORS.textLight).toBeDefined();
    expect(UI_COLORS.background).toBeDefined();
  });
});

describe('getCountryColor', () => {
  test('returns color for default highlighted countries', () => {
    expect(getCountryColor('CHN')).toBe(PRIMARY_COLORS.red);
    expect(getCountryColor('USA')).toBe(PRIMARY_COLORS.blue);
  });

  test('returns muted color for non-highlighted countries', () => {
    expect(getCountryColor('GBR')).toBe(MUTED_COLORS.line);
    expect(getCountryColor('FRA')).toBe(MUTED_COLORS.line);
  });
});

describe('isHighlightedCountry', () => {
  test('returns true for default highlighted countries', () => {
    expect(isHighlightedCountry('CHN')).toBe(true);
    expect(isHighlightedCountry('IND')).toBe(true);
    expect(isHighlightedCountry('USA')).toBe(true);
  });

  test('returns false for non-highlighted countries', () => {
    expect(isHighlightedCountry('GBR')).toBe(false);
    expect(isHighlightedCountry('FRA')).toBe(false);
  });
});

describe('createColorManager', () => {
  test('creates manager with default highlights', () => {
    const manager = createColorManager();
    expect(manager.isHighlighted('CHN')).toBe(true);
    expect(manager.isHighlighted('IND')).toBe(true);
    expect(manager.isHighlighted('USA')).toBe(true);
  });

  test('creates manager with custom highlights', () => {
    const manager = createColorManager(['GBR', 'FRA']);
    expect(manager.isHighlighted('GBR')).toBe(true);
    expect(manager.isHighlighted('FRA')).toBe(true);
    expect(manager.isHighlighted('CHN')).toBe(false);
  });

  test('isHighlighted returns correct state', () => {
    const manager = createColorManager(['CHN']);
    expect(manager.isHighlighted('CHN')).toBe(true);
    expect(manager.isHighlighted('USA')).toBe(false);
  });

  test('getColor returns correct color for highlighted country', () => {
    const manager = createColorManager(['CHN']);
    expect(manager.getColor('CHN')).toBe(COUNTRY_COLORS.CHN);
  });

  test('getColor returns muted color for non-highlighted country', () => {
    const manager = createColorManager(['CHN']);
    const color = manager.getColor('GBR');
    expect(color).toBe(MUTED_COLORS.line);
  });

  test('toggleHighlight toggles state correctly', () => {
    const manager = createColorManager(['CHN']);

    expect(manager.isHighlighted('CHN')).toBe(true);

    manager.toggleHighlight('CHN');
    expect(manager.isHighlighted('CHN')).toBe(false);

    manager.toggleHighlight('CHN');
    expect(manager.isHighlighted('CHN')).toBe(true);
  });

  test('toggleHighlight can add new highlights', () => {
    const manager = createColorManager(['CHN']);

    expect(manager.isHighlighted('GBR')).toBe(false);

    manager.toggleHighlight('GBR');
    expect(manager.isHighlighted('GBR')).toBe(true);

    // Should have assigned a color
    const color = manager.getColor('GBR');
    expect(color).not.toBe(MUTED_COLORS.line);
  });

  test('addHighlight adds country to highlights', () => {
    const manager = createColorManager(['CHN']);

    manager.addHighlight('GBR');
    expect(manager.isHighlighted('GBR')).toBe(true);
  });

  test('removeHighlight removes country from highlights', () => {
    const manager = createColorManager(['CHN', 'USA']);

    manager.removeHighlight('CHN');
    expect(manager.isHighlighted('CHN')).toBe(false);
    expect(manager.isHighlighted('USA')).toBe(true);
  });

  test('getHighlightedCountries returns all highlighted countries', () => {
    const manager = createColorManager(['CHN', 'USA', 'IND']);

    const highlighted = manager.getHighlightedCountries();
    expect(highlighted).toContain('CHN');
    expect(highlighted).toContain('USA');
    expect(highlighted).toContain('IND');
    expect(highlighted.length).toBe(3);
  });

  test('assigns unique colors to newly highlighted countries', () => {
    const manager = createColorManager(['CHN']);

    manager.toggleHighlight('GBR');
    manager.toggleHighlight('FRA');
    manager.toggleHighlight('DEU');

    const colors = [manager.getColor('GBR'), manager.getColor('FRA'), manager.getColor('DEU')];

    // All colors should be different
    const uniqueColors = new Set(colors);
    expect(uniqueColors.size).toBe(3);
  });

  test('preserves color assignment after toggle off/on', () => {
    const manager = createColorManager([]);

    manager.toggleHighlight('GBR');
    const originalColor = manager.getColor('GBR');

    manager.toggleHighlight('GBR'); // off
    manager.toggleHighlight('GBR'); // on

    const newColor = manager.getColor('GBR');
    expect(newColor).toBe(originalColor);
  });
});
