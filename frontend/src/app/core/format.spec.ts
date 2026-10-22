import { describe, expect, it } from 'vitest';
import { achievementClass, barWidth, formatKpiValue, formatMoney, formatPercent } from './format';

describe('format', () => {
  it('formats USD to cents and KHR to whole riel', () => {
    expect(formatMoney(1234.5, 'USD')).toBe('$1,234.50');
    expect(formatMoney(1234567.4, 'KHR')).toBe('៛1,234,567');
  });

  it('formats fractions as percentages', () => {
    expect(formatPercent(0.857)).toBe('86%');
    expect(formatPercent(0.857, 1)).toBe('85.7%');
  });

  it('formats KPI values in their own unit', () => {
    expect(formatKpiValue('SalesVolumeCases', 1050.4, 'USD')).toBe('1,050 cs');
    expect(formatKpiValue('CollectionRate', 0.915, 'USD')).toBe('91.5%');
    expect(formatKpiValue('SalesRevenue', 70000000, 'KHR')).toBe('៛70,000,000');
    expect(formatKpiValue('LinesPerCall', 2.345, 'USD')).toBe('2.35');
    expect(formatKpiValue('ActiveOutlets', 18, 'USD')).toBe('18');
  });

  it('bands achievement as good, warn or bad', () => {
    expect(achievementClass(1)).toBe('good');
    expect(achievementClass(0.85)).toBe('warn');
    expect(achievementClass(0.5)).toBe('bad');
  });

  it('caps the bar at 120% and floors it at zero', () => {
    expect(barWidth(1.2)).toBe(100);
    expect(barWidth(3)).toBe(100);
    expect(barWidth(-1)).toBe(0);
    expect(barWidth(0.6)).toBe(50);
  });
});
