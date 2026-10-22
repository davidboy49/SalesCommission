import { Currency, KpiType, SalesBase, SalesRole } from './models';

export const ROLE_LABELS: Record<SalesRole, string> = {
  PreSales: 'Pre-sales',
  VanSales: 'Van sales',
  KeyAccount: 'Key account',
  Merchandiser: 'Merchandiser',
  Supervisor: 'Supervisor',
  Manager: 'Manager',
};

export const KPI_LABELS: Record<KpiType, string> = {
  SalesVolumeCases: 'Sales volume',
  SalesRevenue: 'Sales revenue',
  ActiveOutlets: 'Active outlets',
  NewOutlets: 'New outlets',
  CollectionRate: 'Collection rate',
  StrikeRate: 'Strike rate',
  LinesPerCall: 'Lines per call',
  VisitCompliance: 'Visit compliance',
  AuditCompliance: 'Audit compliance',
};

export const SALES_BASE_LABELS: Record<SalesBase, string> = {
  Invoiced: 'Invoiced',
  NetOfReturns: 'Invoiced − returns',
  Collected: 'Collected cash',
};

const RATE_KPIS: KpiType[] = ['CollectionRate', 'StrikeRate', 'VisitCompliance', 'AuditCompliance'];

export function formatMoney(value: number, currency: Currency): string {
  return currency === 'KHR'
    ? `៛${Math.round(value).toLocaleString('en-US')}`
    : `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Fractions (0.85) shown as percentages. */
export function formatPercent(fraction: number, digits = 0): string {
  return `${(fraction * 100).toFixed(digits)}%`;
}

/** Colour band for an achievement ratio: on/over target, close, or well short. */
export function achievementClass(achievement: number): 'good' | 'warn' | 'bad' {
  return achievement >= 1 ? 'good' : achievement >= 0.8 ? 'warn' : 'bad';
}

/** Bar fill (0–100) where a full bar means 120% achievement, so over-performance stays visible. */
export function barWidth(achievement: number): number {
  return Math.round((Math.min(Math.max(achievement, 0), 1.2) / 1.2) * 100);
}

/** A KPI value in its natural unit: cases, money in the plan currency, a count, or a percentage. */
export function formatKpiValue(kpi: KpiType, value: number, currency: Currency): string {
  if (RATE_KPIS.includes(kpi)) return formatPercent(value, 1);
  switch (kpi) {
    case 'SalesRevenue':
      return formatMoney(value, currency);
    case 'SalesVolumeCases':
      return `${Math.round(value).toLocaleString('en-US')} cs`;
    case 'LinesPerCall':
      return value.toFixed(2);
    default:
      return Math.round(value).toLocaleString('en-US');
  }
}
