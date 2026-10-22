import { Component, effect, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api';
import {
  KPI_LABELS,
  ROLE_LABELS,
  achievementClass,
  barWidth,
  formatKpiValue,
  formatMoney,
  formatPercent,
} from '../core/format';
import { ResultDetail } from '../core/models';
import { PeriodState } from '../core/period-state';

@Component({
  selector: 'app-result-detail',
  imports: [RouterLink],
  template: `
    <div class="page">
      <a routerLink="/results">← All results</a>

      @if (error()) {
        <p class="notice bad" role="alert">{{ error() }}</p>
      }

      @if (detail(); as d) {
        <div class="page-head" style="margin-top: 10px">
          <div>
            <h1>{{ d.summary.employeeName }} <span class="muted">· {{ d.summary.employeeCode }}</span></h1>
            <div class="muted">
              {{ roleLabel(d.summary.role) }} · {{ d.summary.region }}
              @if (d.summary.channel) { · {{ d.summary.channel }} }
              @if (d.summary.supervisor) { · reports to {{ d.summary.supervisor }} }
            </div>
            <div class="muted">{{ d.summary.planName }} · {{ d.periodCode }}</div>
          </div>
        </div>

        <section class="grid tiles">
          <div class="card tile">
            <div class="label">Payout</div>
            <div class="value">{{ fmt(d.summary.payout, d.summary.payoutCurrency) }}</div>
            @if (d.summary.payoutCurrency === 'KHR') {
              <div class="muted">≈ {{ fmt(d.summary.payoutUsd, 'USD') }}</div>
            }
          </div>
          <div class="card tile">
            <div class="label">Target incentive</div>
            <div class="value">{{ fmt(d.summary.targetIncentive, d.summary.payoutCurrency) }}</div>
          </div>
          <div class="card tile">
            <div class="label">Overall achievement</div>
            <div class="value">{{ pct(d.summary.overallAchievement) }}</div>
          </div>
          @if (d.gateKpi) {
            <div class="card tile">
              <div class="label">Gate · {{ kpiLabel(d.gateKpi) }}</div>
              <div class="value">
                @if (d.summary.gatePassed) { <span class="chip good">Passed</span> } @else { <span class="chip bad">Blocked</span> }
              </div>
              <div class="muted">
                {{ kpi(d.gateKpi, d.gateActualValue ?? 0, d) }} of required {{ kpi(d.gateKpi, d.gateMinValue ?? 0, d) }}
              </div>
            </div>
          }
        </section>

        @if (!d.summary.gatePassed) {
          <p class="notice bad" style="margin-top: 14px">
            The {{ kpiLabel(d.gateKpi!) }} gate was not met, so no commission is paid this period even though some components reached target.
          </p>
        }

        <div class="card table-wrap" style="margin-top: 14px">
          <h2>How it was calculated</h2>
          <table>
            <thead>
              <tr>
                <th>Component</th>
                <th class="num">Weight</th>
                <th class="num">Actual</th>
                <th class="num">Target</th>
                <th>Achievement</th>
                <th class="num">Pays</th>
                <th class="num">Payout</th>
              </tr>
            </thead>
            <tbody>
              @for (l of d.lines; track l.component) {
                <tr>
                  <td>{{ l.component }}</td>
                  <td class="num">{{ pct(l.weight) }}</td>
                  <td class="num">{{ kpi(l.kpi, l.actual, d) }}</td>
                  <td class="num">{{ kpi(l.kpi, l.target, d) }}</td>
                  <td>
                    <div class="ach">
                      <div [class]="'bar ' + cls(l.achievement)"><span [style.width.%]="width(l.achievement)"></span></div>
                      <span class="num">{{ pct(l.achievement) }}</span>
                    </div>
                  </td>
                  <td class="num">{{ pct(l.payoutFactor) }}</td>
                  <td class="num">{{ fmt(l.payout, d.summary.payoutCurrency) }}</td>
                </tr>
              }
            </tbody>
          </table>
          @if (d.planDescription) {
            <p class="muted">{{ d.planDescription }}</p>
          }
        </div>
      } @else if (!error()) {
        <p class="muted">Loading…</p>
      }
    </div>
  `,
  styles: `
    .ach {
      display: grid;
      grid-template-columns: 90px auto;
      gap: 8px;
      align-items: center;
    }
  `,
})
export class ResultDetailPage {
  private readonly api = inject(ApiService);
  private readonly period = inject(PeriodState);

  /** Bound from the :id route parameter. */
  readonly id = input.required<string>();

  protected readonly detail = signal<ResultDetail | null>(null);
  protected readonly error = signal<string | null>(null);

  constructor() {
    effect(() => {
      const code = this.period.selectedCode();
      const id = Number(this.id());
      if (!code) return;
      this.error.set(null);
      this.api.resultDetail(id, code).subscribe({
        next: (d) => this.detail.set(d),
        error: (e) => {
          this.detail.set(null);
          this.error.set(e.status === 404 ? 'No result for this person in the selected period.' : 'Could not load the result.');
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
  protected roleLabel(role: string) {
    return ROLE_LABELS[role as keyof typeof ROLE_LABELS] ?? role;
  }
  protected kpiLabel(kpi: keyof typeof KPI_LABELS) {
    return KPI_LABELS[kpi];
  }
  protected kpi(kpi: keyof typeof KPI_LABELS, value: number, d: ResultDetail) {
    return formatKpiValue(kpi, value, d.summary.payoutCurrency);
  }
}
