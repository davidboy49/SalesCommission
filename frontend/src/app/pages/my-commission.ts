import { Component, effect, inject, signal } from '@angular/core';
import { ApiService } from '../core/api';
import { KPI_LABELS, achievementClass, barWidth, formatKpiValue, formatMoney, formatPercent } from '../core/format';
import { PayoutHistory, ResultDetail } from '../core/models';
import { PeriodState } from '../core/period-state';

/** The rep's own view: designed for a phone, one column, big numbers, no tables. */
@Component({
  selector: 'app-my-commission',
  template: `
    <div class="page">
      @if (error()) {
        <p class="notice">{{ error() }}</p>
      }

      @if (detail(); as d) {
        <section class="card hero">
          <div class="muted">{{ d.periodCode }} · {{ d.summary.planName }}</div>
          <div class="amount">{{ fmt(d.summary.payout, d.summary.payoutCurrency) }}</div>
          @if (d.summary.payoutCurrency === 'KHR') {
            <div class="muted">≈ {{ fmt(d.summary.payoutUsd, 'USD') }}</div>
          }
          <div class="meta">
            <span class="chip" [class]="'chip ' + cls(d.summary.overallAchievement)">{{ pct(d.summary.overallAchievement) }} of target</span>
            @if (d.gateKpi) {
              <span class="chip" [class]="d.summary.gatePassed ? 'chip good' : 'chip bad'">
                {{ kpiLabel(d.gateKpi) }} gate {{ d.summary.gatePassed ? 'passed' : 'not met' }}
              </span>
            }
          </div>
          <div class="muted">Full payout at 100% would be {{ fmt(d.summary.targetIncentive, d.summary.payoutCurrency) }}.</div>
        </section>

        @if (!d.summary.gatePassed && d.gateKpi) {
          <p class="notice bad">
            Your {{ kpiLabel(d.gateKpi) }} was {{ kpi(d.gateKpi, d.gateActualValue ?? 0, d) }}, but at least
            {{ kpi(d.gateKpi, d.gateMinValue ?? 0, d) }} is needed to receive commission.
          </p>
        }

        <h2 class="section">Where your commission comes from</h2>
        @for (l of d.lines; track l.component) {
          <section class="card line">
            <div class="line-head">
              <strong>{{ l.component }}</strong>
              <span class="pay">{{ fmt(l.payout, d.summary.payoutCurrency) }}</span>
            </div>
            <div [class]="'bar ' + cls(l.achievement)"><span [style.width.%]="width(l.achievement)"></span></div>
            <div class="line-foot muted">
              <span>{{ kpi(l.kpi, l.actual, d) }} of {{ kpi(l.kpi, l.target, d) }}</span>
              <span>{{ pct(l.achievement) }} · worth {{ pct(l.weight) }}</span>
            </div>
          </section>
        }
      } @else if (!error()) {
        <p class="muted">Loading…</p>
      }

      @if (history().length) {
        <h2 class="section">Earlier months</h2>
        <section class="card">
          @for (h of history(); track h.periodCode) {
            <div class="hist">
              <span>{{ h.periodCode }}</span>
              <span class="muted">{{ pct(h.overallAchievement) }}</span>
              <strong class="num">{{ fmt(h.payout, h.payoutCurrency) }}</strong>
            </div>
          }
        </section>
      }
    </div>
  `,
  styles: `
    .page {
      max-width: 560px;
    }
    .hero {
      display: grid;
      gap: 6px;
      text-align: center;
      padding: 22px 16px;
    }
    .amount {
      font-size: 2.4rem;
      font-weight: 700;
      color: var(--accent);
      font-variant-numeric: tabular-nums;
    }
    .meta {
      display: flex;
      gap: 8px;
      justify-content: center;
      flex-wrap: wrap;
    }
    .section {
      margin: 22px 0 10px;
    }
    .line {
      margin-bottom: 10px;
      display: grid;
      gap: 8px;
    }
    .line-head,
    .line-foot {
      display: flex;
      justify-content: space-between;
      gap: 10px;
    }
    .line-foot {
      font-size: 0.85rem;
    }
    .pay {
      font-weight: 650;
      font-variant-numeric: tabular-nums;
    }
    .hist {
      display: grid;
      grid-template-columns: 1fr auto auto;
      gap: 14px;
      padding: 9px 0;
      border-bottom: 1px solid var(--border);
    }
    .hist:last-child {
      border-bottom: 0;
    }
    .notice {
      margin-top: 12px;
    }
  `,
})
export class MyCommissionPage {
  private readonly api = inject(ApiService);
  private readonly period = inject(PeriodState);

  protected readonly detail = signal<ResultDetail | null>(null);
  protected readonly history = signal<PayoutHistory[]>([]);
  protected readonly error = signal<string | null>(null);

  constructor() {
    this.api.myHistory().subscribe({ next: (h) => this.history.set(h), error: () => this.history.set([]) });

    effect(() => {
      const code = this.period.selectedCode();
      if (!code) return;
      this.error.set(null);
      this.api.myCommission(code).subscribe({
        next: (d) => this.detail.set(d),
        error: (e) => {
          this.detail.set(null);
          this.error.set(
            e.status === 404 ? `There is no commission result for ${code} yet.` : 'Could not load your commission.',
          );
        },
      });
    });
  }

  protected fmt = formatMoney;
  protected cls = achievementClass;
  protected width = barWidth;
  protected pct(v: number) {
    return formatPercent(v, 0);
  }
  protected kpiLabel(kpi: keyof typeof KPI_LABELS) {
    return KPI_LABELS[kpi];
  }
  protected kpi(kpi: keyof typeof KPI_LABELS, value: number, d: ResultDetail) {
    return formatKpiValue(kpi, value, d.summary.payoutCurrency);
  }
}
