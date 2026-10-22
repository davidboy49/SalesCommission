import { formatDate } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { ApiService } from '../../core/api';
import { AuthService } from '../../core/auth';
import { ROLE_LABELS, formatMoney, formatPercent } from '../../core/format';
import { Dashboard, DashboardGroup, Period, SalesRole } from '../../core/models';
import { PeriodState } from '../../core/period-state';
import { ChartCard, ChartRow } from '../../shared/chart-card';
import { Confirm } from '../../shared/confirm-dialog';
import { PageHeader } from '../../shared/page-header';
import { StatTile } from '../../shared/stat-tile';
import { StateView } from '../../shared/state-view';

const BUCKET_LABELS = ['< 60%', '60–80%', '80–100%', '100–120%', '120–150%', '150%+'];
/** Index of the first band at or above target (100%). */
const TARGET_BAND = 3;

@Component({
  selector: 'app-dashboard',
  imports: [MatButton, MatIcon, MatProgressSpinner, PageHeader, StatTile, StateView, ChartCard],
  template: `
    <div class="page">
      <app-page-header title="Dashboard" [subtitle]="subtitle()">
        @if (auth.isOffice() && period.selected(); as p) {
          <button
            mat-flat-button
            type="button"
            (click)="calculate(p)"
            [disabled]="period.calculating() || p.status === 'Locked'"
          >
            @if (period.calculating()) {
              <mat-spinner diameter="18" />
            } @else {
              <mat-icon>calculate</mat-icon>
            }
            {{
              period.calculating()
                ? 'Calculating…'
                : p.status === 'Open'
                  ? 'Calculate ' + p.code
                  : 'Recalculate ' + p.code
            }}
          </button>
        }
      </app-page-header>

      @if (error()) {
        <app-state
          kind="error"
          title="Could not load the dashboard"
          message="Check that the API is running, then try again."
        >
          <button mat-stroked-button type="button" (click)="load()">Try again</button>
        </app-state>
      } @else if (data(); as d) {
        @if (d.employees === 0) {
          <app-state
            icon="calculate"
            [title]="'No results for ' + d.periodCode + ' yet'"
            [message]="
              auth.isOffice()
                ? 'Use Calculate in the top right to run the commission calculation.'
                : 'Results appear here once Finance has calculated the period.'
            "
          />
        } @else {
          <section class="grid tiles" aria-label="Summary">
            <app-stat-tile icon="groups" label="People paid" [value]="d.employees.toString()" />
            <app-stat-tile
              icon="payments"
              label="Total payout"
              [value]="money(d.totalPayoutUsd)"
              hint="All currencies, in USD"
            />
            <app-stat-tile
              icon="functions"
              label="Average payout"
              [value]="money(d.averagePayoutUsd)"
            />
            <app-stat-tile
              icon="track_changes"
              label="Average achievement"
              [value]="pct(d.averageAchievement)"
            />
            <app-stat-tile
              icon="block"
              label="Blocked by gate"
              [value]="d.gateBlocked.toString()"
              [hint]="
                d.gateBlocked ? 'Earn nothing until the gate is met' : 'Everyone passed the gate'
              "
            />
          </section>

          <section class="grid cols-2" aria-label="Breakdowns">
            <app-chart-card
              kind="columns"
              title="How achievement is spread"
              subtitle="People per achievement band. The dashed line is target."
              labelHeader="Band"
              valueHeader="People"
              [rows]="spread()"
              [markerBefore]="targetBand"
            />
            <app-chart-card
              title="Payout by role"
              subtitle="Total in USD"
              labelHeader="Role"
              valueHeader="Payout"
              [rows]="rows(d.byRole, roleLabel)"
            />
            <app-chart-card
              title="Payout by region"
              subtitle="Total in USD"
              labelHeader="Region"
              valueHeader="Payout"
              [rows]="rows(d.byRegion)"
            />
            <app-chart-card
              title="Payout by plan"
              subtitle="Total in USD"
              labelHeader="Plan"
              valueHeader="Payout"
              [rows]="rows(d.byPlan)"
            />
          </section>
        }
      } @else {
        <app-state kind="loading" title="Loading dashboard" />
      }
    </div>
  `,
})
export class DashboardPage {
  private readonly api = inject(ApiService);
  private readonly confirm = inject(Confirm);
  protected readonly auth = inject(AuthService);
  protected readonly period = inject(PeriodState);

  protected readonly data = signal<Dashboard | null>(null);
  protected readonly error = signal(false);
  protected readonly targetBand = TARGET_BAND;

  protected readonly subtitle = computed(() => {
    const p = this.period.selected();
    if (!p) return '';
    const parts = [`${p.code} · ${p.status}`];
    if (p.lastCalculatedUtc)
      parts.push(`calculated ${formatDate(p.lastCalculatedUtc, 'MMM d, y, h:mm a', 'en-US')}`);
    parts.push(`1 USD = ៛${Math.round(p.khrPerUsd).toLocaleString('en-US')}`);
    return parts.join(' · ');
  });

  protected readonly spread = computed<ChartRow[]>(() =>
    (this.data()?.achievementBuckets ?? []).map((count, i) => ({
      label: BUCKET_LABELS[i],
      value: count,
      display: count.toString(),
      detail: `${count} ${count === 1 ? 'person' : 'people'} at ${BUCKET_LABELS[i]} of target`,
    })),
  );

  constructor() {
    effect(() => {
      this.period.selectedCode();
      this.period.version();
      this.load();
    });
  }

  protected load() {
    const code = this.period.selectedCode();
    if (!code) return;
    this.error.set(false);
    this.api.dashboard(code).subscribe({
      next: (d) => this.data.set(d),
      error: () => this.error.set(true),
    });
  }

  /** Recalculating replaces the period's current results, so ask first. */
  protected calculate(p: Period) {
    if (p.status === 'Open') {
      this.period.calculate();
      return;
    }
    this.confirm
      .ask({
        title: `Recalculate ${p.code}?`,
        message: 'This runs the calculation again and replaces the current results for the period.',
        confirmLabel: 'Recalculate',
      })
      .subscribe((ok) => ok && this.period.calculate());
  }

  protected money = (v: number) => formatMoney(v, 'USD');
  protected pct = (v: number) => formatPercent(v, 1);
  protected roleLabel = (name: string) => ROLE_LABELS[name as SalesRole] ?? name;

  protected rows(groups: DashboardGroup[], label: (name: string) => string = (n) => n): ChartRow[] {
    return groups.map((g) => ({
      label: label(g.name),
      value: g.payoutUsd,
      display: formatMoney(g.payoutUsd, 'USD'),
      detail: `${g.employees} ${g.employees === 1 ? 'person' : 'people'} · average achievement ${formatPercent(g.averageAchievement, 0)}`,
    }));
  }
}
