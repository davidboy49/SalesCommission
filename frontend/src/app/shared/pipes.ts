import { Pipe, PipeTransform } from '@angular/core';
import { formatKpiValue, formatMoney, formatPercent } from '../core/format';
import { Currency, KpiType } from '../core/models';

@Pipe({ name: 'money' })
export class MoneyPipe implements PipeTransform {
  transform(value: number | null | undefined, currency: Currency = 'USD'): string {
    return value == null ? '—' : formatMoney(value, currency);
  }
}

@Pipe({ name: 'pct' })
export class PercentPipe implements PipeTransform {
  transform(value: number | null | undefined, digits = 0): string {
    return value == null ? '—' : formatPercent(value, digits);
  }
}

@Pipe({ name: 'kpiValue' })
export class KpiValuePipe implements PipeTransform {
  transform(value: number | null | undefined, kpi: KpiType, currency: Currency = 'USD'): string {
    return value == null ? '—' : formatKpiValue(kpi, value, currency);
  }
}
