export type SalesRole =
  'PreSales' | 'VanSales' | 'KeyAccount' | 'Merchandiser' | 'Supervisor' | 'Manager';
export type Currency = 'USD' | 'KHR';
export type PeriodStatus = 'Open' | 'Calculated' | 'Locked';
export type SalesBase = 'Invoiced' | 'NetOfReturns' | 'Collected';
export type KpiType =
  | 'SalesVolumeCases'
  | 'SalesRevenue'
  | 'ActiveOutlets'
  | 'NewOutlets'
  | 'CollectionRate'
  | 'StrikeRate'
  | 'LinesPerCall'
  | 'VisitCompliance'
  | 'AuditCompliance';

export interface LoginResponse {
  token: string;
  expiresUtc: string;
  displayName: string;
  email: string;
  roles: string[];
  employeeId: number | null;
}

export interface Period {
  id: number;
  code: string;
  startDate: string;
  endDate: string;
  status: PeriodStatus;
  khrPerUsd: number;
  lastCalculatedUtc: string | null;
  totalPayoutUsd: number | null;
  employeeCount: number | null;
}

export interface ResultSummary {
  employeeId: number;
  employeeCode: string;
  employeeName: string;
  role: SalesRole;
  region: string;
  channel: string | null;
  supervisor: string | null;
  planCode: string;
  planName: string;
  payoutCurrency: Currency;
  targetIncentive: number;
  overallAchievement: number;
  gatePassed: boolean;
  payout: number;
  payoutUsd: number;
}

export interface ResultLine {
  component: string;
  kpi: KpiType;
  productGroup: string | null;
  weight: number;
  actual: number;
  target: number;
  achievement: number;
  payoutFactor: number;
  payout: number;
  isRate: boolean;
}

export interface ResultDetail {
  summary: ResultSummary;
  periodCode: string;
  gateKpi: KpiType | null;
  gateMinValue: number | null;
  gateActualValue: number | null;
  planDescription: string | null;
  lines: ResultLine[];
}

export interface PayoutHistory {
  periodCode: string;
  payoutCurrency: Currency;
  payout: number;
  payoutUsd: number;
  overallAchievement: number;
  gatePassed: boolean;
}

export interface DashboardGroup {
  name: string;
  employees: number;
  payoutUsd: number;
  averageAchievement: number;
}

export interface Dashboard {
  periodCode: string;
  employees: number;
  gateBlocked: number;
  totalPayoutUsd: number;
  averagePayoutUsd: number;
  averageAchievement: number;
  byRole: DashboardGroup[];
  byRegion: DashboardGroup[];
  byPlan: DashboardGroup[];
  achievementBuckets: number[];
}

export interface Employee {
  id: number;
  code: string;
  fullName: string;
  role: SalesRole;
  region: string;
  channel: string | null;
  manager: string | null;
  isActive: boolean;
}

export interface PlanTier {
  achievement: number;
  payoutFactor: number;
}

export interface PlanComponent {
  name: string;
  kpi: KpiType;
  weight: number;
  salesBase: SalesBase;
  productGroup: string | null;
  interpolate: boolean;
  tiers: PlanTier[];
}

export interface Plan {
  id: number;
  code: string;
  name: string;
  description: string | null;
  role: SalesRole;
  region: string | null;
  channel: string | null;
  effectiveFrom: string;
  effectiveTo: string | null;
  payoutCurrency: Currency;
  targetIncentive: number;
  gateKpi: KpiType | null;
  gateMinValue: number | null;
  components: PlanComponent[];
}
