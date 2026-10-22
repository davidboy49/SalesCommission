import { describe, expect, it } from 'vitest';
import { KpiValuePipe, MoneyPipe, PercentPipe } from './pipes';

describe('pipes', () => {
  it('formats money in the given currency and defaults to USD', () => {
    const money = new MoneyPipe();
    expect(money.transform(12.5)).toBe('$12.50');
    expect(money.transform(481700, 'KHR')).toBe('៛481,700');
  });

  it('shows a dash instead of "null" or "undefined"', () => {
    expect(new MoneyPipe().transform(null)).toBe('—');
    expect(new PercentPipe().transform(undefined)).toBe('—');
    expect(new KpiValuePipe().transform(null, 'SalesRevenue')).toBe('—');
  });

  it('formats percentages with optional decimals', () => {
    const pct = new PercentPipe();
    expect(pct.transform(0.984)).toBe('98%');
    expect(pct.transform(0.984, 1)).toBe('98.4%');
  });

  it('formats a KPI value by its own unit', () => {
    const kpi = new KpiValuePipe();
    expect(kpi.transform(890, 'SalesVolumeCases')).toBe('890 cs');
    expect(kpi.transform(0.492, 'StrikeRate')).toBe('49.2%');
  });
});
