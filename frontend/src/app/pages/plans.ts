import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { ApiService } from '../core/api';
import { KPI_LABELS, ROLE_LABELS, SALES_BASE_LABELS, formatKpiValue, formatMoney, formatPercent } from '../core/format';
import { Plan } from '../core/models';

@Component({
  selector: 'app-plans',
  imports: [DatePipe],
  template: `
    <div class="page">
      <div class="page-head">
        <div>
          <h1>Commission plans</h1>
          <div class="muted">Read-only for now. When several plans fit a person, the most specific region/channel wins.</div>
        </div>
      </div>

      @for (p of plans(); track p.id) {
        <section class="card plan">
          <div class="head">
            <div>
              <h2>{{ p.name }} <span class="muted">· {{ p.code }}</span></h2>
              <div class="muted">
                {{ roleLabel(p.role) }}
                @if (p.region) { · {{ p.region }} only }
                @if (p.channel) { · {{ p.channel }} only }
                · from {{ p.effectiveFrom | date: 'mediumDate' }}
                @if (p.effectiveTo) { to {{ p.effectiveTo | date: 'mediumDate' }} }
              </div>
              @if (p.description) { <div class="muted">{{ p.description }}</div> }
            </div>
            <div class="incentive">
              <div class="muted">Target incentive / month</div>
              <strong>{{ fmt(p.targetIncentive, p.payoutCurrency) }}</strong>
              @if (p.gateKpi) {
                <div class="muted">Gate: {{ kpiLabel(p.gateKpi) }} ≥ {{ gate(p) }}</div>
              }
            </div>
          </div>

          <div class="table-wrap">
            <table>
              <thead>
                <tr><th>Component</th><th class="num">Weight</th><th>Based on</th><th>Payout curve (achievement → pays)</th></tr>
              </thead>
              <tbody>
                @for (c of p.components; track c.name) {
                  <tr>
                    <td>{{ c.name }}</td>
                    <td class="num">{{ pct(c.weight) }}</td>
                    <td>
                      {{ kpiLabel(c.kpi) }}
                      @if (c.kpi === 'SalesRevenue') { <span class="muted">({{ baseLabel(c.salesBase) }})</span> }
                    </td>
                    <td>
                      @for (t of c.tiers; track t.achievement) {
                        <span class="chip tier">{{ pct(t.achievement) }} → {{ pct(t.payoutFactor) }}</span>
                      }
                      <span class="muted">{{ c.interpolate ? 'smooth' : 'steps' }}</span>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </section>
      } @empty {
        <p class="muted">Loading…</p>
      }
    </div>
  `,
  styles: `
    .plan {
      margin-bottom: 14px;
    }
    .head {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      flex-wrap: wrap;
      margin-bottom: 8px;
    }
    .incentive {
      text-align: right;
    }
    .incentive strong {
      font-size: 1.3rem;
    }
    .tier {
      margin-right: 4px;
    }
  `,
})
export class PlansPage {
  protected readonly plans = signal<Plan[]>([]);

  constructor() {
    inject(ApiService)
      .plans()
      .subscribe((plans) => this.plans.set(plans));
  }

  protected fmt = formatMoney;
  protected pct(v: number) {
    return formatPercent(v, 0);
  }
  protected roleLabel(role: string) {
    return ROLE_LABELS[role as keyof typeof ROLE_LABELS] ?? role;
  }
  protected kpiLabel(kpi: keyof typeof KPI_LABELS) {
    return KPI_LABELS[kpi];
  }
  protected baseLabel(base: keyof typeof SALES_BASE_LABELS) {
    return SALES_BASE_LABELS[base];
  }
  protected gate(p: Plan) {
    return formatKpiValue(p.gateKpi!, p.gateMinValue ?? 0, p.payoutCurrency);
  }
}
