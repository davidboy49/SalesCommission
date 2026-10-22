import { Component, effect, inject, signal } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { ApiService } from '../../core/api';
import { KPI_LABELS, achievementClass } from '../../core/format';
import { KpiType, PayoutHistory, ResultDetail } from '../../core/models';
import { PeriodState } from '../../core/period-state';
import { AchievementBar } from '../../shared/achievement-bar';
import { KpiValuePipe, MoneyPipe, PercentPipe } from '../../shared/pipes';
import { StateView } from '../../shared/state-view';
import { StatusChip } from '../../shared/status-chip';

/** The rep's own view: one column, large numbers, no tables. Designed for a phone first. */
@Component({
  selector: 'app-my-commission',
  imports: [MatButton, StateView, StatusChip, AchievementBar, KpiValuePipe, MoneyPipe, PercentPipe],
  template: `
    <div class="page narrow">
      @if (error()) {
        <app-state
          [kind]="notFound() ? 'empty' : 'error'"
          icon="hourglass_empty"
          [title]="
            notFound() ? 'No commission for ' + code() + ' yet' : 'Could not load your commission'
          "
          [message]="
            notFound()
              ? 'It appears here once Finance has calculated this month.'
              : 'Check your connection, then try again.'
          "
        >
          @if (!notFound()) {
            <button mat-stroked-button type="button" (click)="load()">Try again</button>
          }
        </app-state>
      } @else if (detail(); as d) {
        <section class="card hero" aria-labelledby="hero-title">
          <p id="hero-title" class="muted">{{ d.periodCode }} · {{ d.summary.planName }}</p>
          <p class="amount">{{ d.summary.payout | money: d.summary.payoutCurrency }}</p>
          @if (d.summary.payoutCurrency === 'KHR') {
            <p class="muted">≈ {{ d.summary.payoutUsd | money }}</p>
          }
          <div class="chips">
            <app-status-chip
              [tone]="band(d.summary.overallAchievement)"
              [label]="(d.summary.overallAchievement | pct) + ' of target'"
            />
            @if (d.gateKpi) {
              <app-status-chip
                [tone]="d.summary.gatePassed ? 'good' : 'bad'"
                [label]="
                  kpiLabel(d.gateKpi) + (d.summary.gatePassed ? ' gate passed' : ' gate not met')
                "
              />
            }
          </div>
          <p class="muted">
            Paid in full at 100%: {{ d.summary.targetIncentive | money: d.summary.payoutCurrency }}
          </p>
        </section>

        @if (!d.summary.gatePassed && d.gateKpi) {
          <section class="card blocked" role="note">
            <strong>Why you were not paid this month</strong>
            <p>
              Your {{ kpiLabel(d.gateKpi) }} was
              {{ d.gateActualValue ?? 0 | kpiValue: d.gateKpi : d.summary.payoutCurrency }}. At
              least {{ d.gateMinValue ?? 0 | kpiValue: d.gateKpi : d.summary.payoutCurrency }} is
              needed to receive commission.
            </p>
          </section>
        }

        <h2>Where it comes from</h2>
        <ul class="lines">
          @for (l of d.lines; track l.component) {
            <li class="card line">
              <div class="line-head">
                <strong>{{ l.component }}</strong>
                <span class="pay">{{ l.payout | money: d.summary.payoutCurrency }}</span>
              </div>
              <app-achievement-bar [value]="l.achievement" />
              <div class="line-foot muted">
                <span
                  >{{ l.actual | kpiValue: l.kpi : d.summary.payoutCurrency }} of
                  {{ l.target | kpiValue: l.kpi : d.summary.payoutCurrency }}</span
                >
                <span>worth {{ l.weight | pct }} of the total</span>
              </div>
            </li>
          }
        </ul>
      } @else {
        <app-state kind="loading" title="Loading your commission" />
      }

      @if (history().length > 1) {
        <h2>Earlier months</h2>
        <section class="card history">
          @for (h of history(); track h.periodCode) {
            <div class="row">
              <span>{{ h.periodCode }}</span>
              <span class="muted">{{ h.overallAchievement | pct }}</span>
              <strong class="num">{{ h.payout | money: h.payoutCurrency }}</strong>
            </div>
          }
        </section>
      }
    </div>
  `,
  styles: `
    .narrow {
      max-width: 560px;
    }
    .hero {
      display: grid;
      gap: var(--app-space-2);
      justify-items: center;
      text-align: center;
      padding-block: var(--app-space-6);
    }
    .amount {
      font: var(--mat-sys-display-medium);
      color: var(--mat-sys-primary);
      font-variant-numeric: tabular-nums;
      overflow-wrap: anywhere;
    }
    .chips {
      display: flex;
      flex-wrap: wrap;
      gap: var(--app-space-2);
      justify-content: center;
    }
    .blocked {
      border-color: var(--app-critical);
      display: grid;
      gap: var(--app-space-1);
    }
    h2 {
      margin-bottom: calc(var(--app-space-2) * -1);
    }
    .lines {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      gap: var(--app-space-3);
    }
    .line {
      display: grid;
      gap: var(--app-space-2);
    }
    .line-head,
    .line-foot {
      display: flex;
      justify-content: space-between;
      gap: var(--app-space-3);
    }
    .line-foot {
      font: var(--mat-sys-body-small);
      flex-wrap: wrap;
    }
    .pay {
      font-weight: 600;
      font-variant-numeric: tabular-nums;
    }
    .row {
      display: grid;
      grid-template-columns: 1fr auto auto;
      gap: var(--app-space-4);
      padding: var(--app-space-2) 0;
      border-bottom: 1px solid var(--mat-sys-outline-variant);
    }
    .row:last-child {
      border-bottom: 0;
    }
  `,
})
export class MyCommissionPage {
  private readonly api = inject(ApiService);
  private readonly period = inject(PeriodState);

  protected readonly code = this.period.selectedCode;
  protected readonly detail = signal<ResultDetail | null>(null);
  protected readonly history = signal<PayoutHistory[]>([]);
  protected readonly error = signal(false);
  protected readonly notFound = signal(false);

  constructor() {
    this.api
      .myHistory()
      .subscribe({ next: (h) => this.history.set(h), error: () => this.history.set([]) });
    effect(() => {
      this.period.selectedCode();
      this.load();
    });
  }

  protected load() {
    const code = this.period.selectedCode();
    if (!code) return;
    this.error.set(false);
    this.notFound.set(false);
    this.api.myCommission(code).subscribe({
      next: (d) => this.detail.set(d),
      error: (e) => {
        this.detail.set(null);
        this.notFound.set(e.status === 404);
        this.error.set(true);
      },
    });
  }

  protected kpiLabel = (kpi: KpiType) => KPI_LABELS[kpi];
  protected band(achievement: number) {
    const tone = achievementClass(achievement);
    return tone === 'good' ? 'good' : tone === 'warn' ? 'warn' : 'bad';
  }
}
