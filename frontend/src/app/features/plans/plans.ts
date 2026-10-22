import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { ApiService } from '../../core/api';
import { KPI_LABELS, ROLE_LABELS, SALES_BASE_LABELS, formatKpiValue } from '../../core/format';
import { KpiType, Plan, SalesBase, SalesRole } from '../../core/models';
import { PageHeader } from '../../shared/page-header';
import { MoneyPipe, PercentPipe } from '../../shared/pipes';
import { StateView } from '../../shared/state-view';
import { StatusChip } from '../../shared/status-chip';

@Component({
  selector: 'app-plans',
  imports: [
    DatePipe,
    MatButton,
    MatExpansionModule,
    PageHeader,
    StateView,
    StatusChip,
    MoneyPipe,
    PercentPipe,
  ],
  template: `
    <div class="page">
      <app-page-header
        title="Commission plans"
        subtitle="Read-only for now. When several plans fit a person, the one with the most specific region and channel wins."
      />

      @if (error()) {
        <app-state
          kind="error"
          title="Could not load plans"
          message="Check that the API is running, then try again."
        >
          <button mat-stroked-button type="button" (click)="load()">Try again</button>
        </app-state>
      } @else if (plans().length) {
        <mat-accordion multi>
          @for (p of plans(); track p.id; let first = $first) {
            <mat-expansion-panel [expanded]="first">
              <mat-expansion-panel-header>
                <mat-panel-title>{{ p.name }}</mat-panel-title>
                <mat-panel-description>
                  {{ roleLabel(p.role) }} · {{ p.targetIncentive | money: p.payoutCurrency }} /
                  month
                </mat-panel-description>
              </mat-expansion-panel-header>

              <div class="facts">
                <app-status-chip tone="neutral" icon="badge" [label]="p.code" />
                @if (p.region) {
                  <app-status-chip tone="neutral" icon="place" [label]="p.region + ' only'" />
                }
                @if (p.channel) {
                  <app-status-chip tone="neutral" icon="storefront" [label]="p.channel + ' only'" />
                }
                @if (p.gateKpi) {
                  <app-status-chip
                    tone="warn"
                    icon="lock"
                    [label]="'Gate: ' + kpiLabel(p.gateKpi) + ' ≥ ' + gate(p)"
                  />
                }
                <span class="muted">
                  From {{ p.effectiveFrom | date: 'mediumDate' }}
                  @if (p.effectiveTo) {
                    to {{ p.effectiveTo | date: 'mediumDate' }}
                  }
                </span>
              </div>
              @if (p.description) {
                <p class="muted desc">{{ p.description }}</p>
              }

              <div class="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th scope="col">Component</th>
                      <th scope="col" class="num">Weight</th>
                      <th scope="col">Based on</th>
                      <th scope="col">Payout curve: achievement → pays</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (c of p.components; track c.name) {
                      <tr>
                        <th scope="row">{{ c.name }}</th>
                        <td class="num">{{ c.weight | pct }}</td>
                        <td>
                          {{ kpiLabel(c.kpi) }}
                          @if (c.kpi === 'SalesRevenue') {
                            <span class="muted">({{ baseLabel(c.salesBase) }})</span>
                          }
                        </td>
                        <td>
                          <span class="tiers">
                            @for (t of c.tiers; track t.achievement) {
                              <span class="tier"
                                >{{ t.achievement | pct }} → {{ t.payoutFactor | pct }}</span
                              >
                            }
                            <span class="muted">{{
                              c.interpolate ? 'smooth between points' : 'in steps'
                            }}</span>
                          </span>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </mat-expansion-panel>
          }
        </mat-accordion>
      } @else {
        <app-state kind="loading" title="Loading plans" />
      }
    </div>
  `,
  styles: `
    .facts {
      display: flex;
      flex-wrap: wrap;
      gap: var(--app-space-2) var(--app-space-3);
      align-items: center;
      margin-bottom: var(--app-space-3);
    }
    .desc {
      margin-bottom: var(--app-space-3);
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th,
    td {
      padding: var(--app-space-2) var(--app-space-3);
      text-align: left;
      border-bottom: 1px solid var(--mat-sys-outline-variant);
      font-weight: 400;
      vertical-align: top;
    }
    thead th {
      font: var(--mat-sys-label-medium);
      color: var(--mat-sys-on-surface-variant);
    }
    tbody th {
      font-weight: 500;
    }
    .tiers {
      display: flex;
      flex-wrap: wrap;
      gap: var(--app-space-2);
      align-items: center;
    }
    .tier {
      padding: 2px var(--app-space-2);
      border-radius: var(--mat-sys-corner-small);
      background: var(--mat-sys-surface-container-high);
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
    }
  `,
})
export class PlansPage {
  private readonly api = inject(ApiService);
  protected readonly plans = signal<Plan[]>([]);
  protected readonly error = signal(false);

  constructor() {
    this.load();
  }

  protected load() {
    this.error.set(false);
    this.api
      .plans()
      .subscribe({ next: (plans) => this.plans.set(plans), error: () => this.error.set(true) });
  }

  protected roleLabel = (role: SalesRole) => ROLE_LABELS[role] ?? role;
  protected kpiLabel = (kpi: KpiType) => KPI_LABELS[kpi];
  protected baseLabel = (base: SalesBase) => SALES_BASE_LABELS[base];
  protected gate = (p: Plan) => formatKpiValue(p.gateKpi!, p.gateMinValue ?? 0, p.payoutCurrency);
}
