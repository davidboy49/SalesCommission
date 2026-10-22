import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, effect, inject, signal } from '@angular/core';
import { ApiService } from '../core/api';
import { AuthService } from '../core/auth';
import { ROLE_LABELS, formatMoney, formatPercent } from '../core/format';
import { Dashboard, DashboardGroup, SalesRole } from '../core/models';
import { PeriodState } from '../core/period-state';

const BUCKET_LABELS = ['< 60%', '60–80%', '80–100%', '100–120%', '120–150%', '150%+'];

@Component({
  selector: 'app-dashboard',
  imports: [DatePipe, DecimalPipe],
  template: `
    <div class="page">
      <div class="page-head">
        <div>
          <h1>Dashboard</h1>
          <div class="muted">
            @if (period.selected(); as p) {
              {{ p.code }} · {{ p.status }}
              @if (p.lastCalculatedUtc) {
                · calculated {{ p.lastCalculatedUtc | date: 'medium' }} · 1 USD = ៛{{ p.khrPerUsd | number: '1.0-0' }}
              }
            }
          </div>
        </div>
        @if (auth.isOffice() && period.selected(); as p) {
          <button
            class="btn primary"
            type="button"
            (click)="period.calculate()"
            [disabled]="period.calculating() || p.status === 'Locked'"
          >
            {{ period.calculating() ? 'Calculating…' : p.status === 'Open' ? 'Calculate ' + p.code : 'Recalculate ' + p.code }}
          </button>
        }
      </div>

      @if (period.error()) {
        <p class="notice bad" role="alert">{{ period.error() }}</p>
      }
      @if (error()) {
        <p class="notice bad" role="alert">{{ error() }}</p>
      }

      @if (data(); as d) {
        @if (d.employees === 0) {
          <p class="notice">No results for {{ d.periodCode }} yet.
            @if (auth.isOffice()) { Use the button above to run the calculation. }
          </p>
        } @else {
          <section class="grid tiles" aria-label="Summary">
            <div class="card tile"><div class="label">People paid</div><div class="value">{{ d.employees }}</div></div>
            <div class="card tile"><div class="label">Total payout</div><div class="value">{{ money(d.totalPayoutUsd) }}</div></div>
            <div class="card tile"><div class="label">Average payout</div><div class="value">{{ money(d.averagePayoutUsd) }}</div></div>
            <div class="card tile"><div class="label">Avg achievement</div><div class="value">{{ pct(d.averageAchievement) }}</div></div>
            <div class="card tile">
              <div class="label">Blocked by gate</div>
              <div class="value">{{ d.gateBlocked }}</div>
            </div>
          </section>

          <section class="grid cols-2" style="margin-top: 14px">
            <div class="card">
              <h2>Payout by role</h2>
              @for (g of d.byRole; track g.name) {
                <div class="row">
                  <span>{{ roleLabel(g.name) }} <span class="muted">· {{ g.employees }}</span></span>
                  <div class="bar"><span [style.width.%]="share(g, d.byRole)"></span></div>
                  <span class="num">{{ money(g.payoutUsd) }}</span>
                </div>
              }
            </div>
            <div class="card">
              <h2>Payout by region</h2>
              @for (g of d.byRegion; track g.name) {
                <div class="row">
                  <span>{{ g.name }} <span class="muted">· {{ g.employees }}</span></span>
                  <div class="bar"><span [style.width.%]="share(g, d.byRegion)"></span></div>
                  <span class="num">{{ money(g.payoutUsd) }}</span>
                </div>
              }
            </div>
            <div class="card">
              <h2>Payout by plan</h2>
              @for (g of d.byPlan; track g.name) {
                <div class="row">
                  <span>{{ g.name }} <span class="muted">· {{ g.employees }}</span></span>
                  <div class="bar"><span [style.width.%]="share(g, d.byPlan)"></span></div>
                  <span class="num">{{ money(g.payoutUsd) }}</span>
                </div>
              }
            </div>
            <div class="card">
              <h2>How achievement is spread</h2>
              <div class="histogram" role="img" aria-label="Number of people in each achievement band">
                @for (count of d.achievementBuckets; track $index) {
                  <div class="col">
                    <span class="count">{{ count }}</span>
                    <div class="stick" [style.height.%]="bucketHeight(count, d.achievementBuckets)"></div>
                    <span class="lbl">{{ bucketLabels[$index] }}</span>
                  </div>
                }
              </div>
            </div>
          </section>
        }
      } @else if (loading()) {
        <p class="muted">Loading…</p>
      }
    </div>
  `,
  styles: `
    .row {
      display: grid;
      grid-template-columns: minmax(120px, 1.3fr) 1.2fr auto;
      gap: 12px;
      align-items: center;
      padding: 6px 0;
    }
    .histogram {
      display: flex;
      gap: 10px;
      align-items: flex-end;
      height: 170px;
    }
    .col {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-end;
      height: 100%;
      gap: 4px;
    }
    .stick {
      width: 100%;
      background: var(--accent);
      border-radius: 6px 6px 0 0;
      min-height: 2px;
    }
    .count {
      font-weight: 600;
      font-variant-numeric: tabular-nums;
    }
    .lbl {
      font-size: 0.72rem;
      color: var(--muted);
      white-space: nowrap;
    }
  `,
})
export class DashboardPage {
  protected readonly api = inject(ApiService);
  protected readonly auth = inject(AuthService);
  protected readonly period = inject(PeriodState);

  protected readonly data = signal<Dashboard | null>(null);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly bucketLabels = BUCKET_LABELS;

  constructor() {
    effect(() => {
      const code = this.period.selectedCode();
      this.period.version();
      if (!code) return;
      this.loading.set(true);
      this.error.set(null);
      this.api.dashboard(code).subscribe({
        next: (d) => {
          this.data.set(d);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.error.set('Could not load the dashboard.');
        },
      });
    });
  }

  protected money(v: number) {
    return formatMoney(v, 'USD');
  }

  protected pct(v: number) {
    return formatPercent(v, 1);
  }

  protected roleLabel(name: string) {
    return ROLE_LABELS[name as SalesRole] ?? name;
  }

  protected share(group: DashboardGroup, all: DashboardGroup[]) {
    const max = Math.max(...all.map((g) => g.payoutUsd), 1);
    return Math.round((group.payoutUsd / max) * 100);
  }

  protected bucketHeight(count: number, all: number[]) {
    const max = Math.max(...all, 1);
    return Math.round((count / max) * 78);
  }
}
