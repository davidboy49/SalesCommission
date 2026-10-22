import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { ApiService } from '../../core/api';
import {
  KPI_LABELS,
  ROLE_LABELS,
  formatKpiValue,
  formatMoney,
  formatPercent,
} from '../../core/format';
import { KpiType, ResultDetail } from '../../core/models';
import { PeriodState } from '../../core/period-state';
import { AchievementBar } from '../../shared/achievement-bar';
import { PageHeader } from '../../shared/page-header';
import { KpiValuePipe, MoneyPipe, PercentPipe } from '../../shared/pipes';
import { StatTile } from '../../shared/stat-tile';
import { StateView } from '../../shared/state-view';
import { StatusChip } from '../../shared/status-chip';

@Component({
  selector: 'app-result-detail',
  imports: [
    MatButton,
    MatTableModule,
    PageHeader,
    StatTile,
    StateView,
    StatusChip,
    AchievementBar,
    KpiValuePipe,
    MoneyPipe,
    PercentPipe,
  ],
  template: `
    <div class="page">
      @if (error()) {
        <app-page-header title="Result" back="/results" backLabel="All results" />
        <app-state
          [kind]="notFound() ? 'empty' : 'error'"
          icon="person_off"
          [title]="notFound() ? 'No result for this person' : 'Could not load the result'"
          [message]="
            notFound()
              ? 'They have no calculated commission in the selected period.'
              : 'Check that the API is running, then try again.'
          "
        >
          @if (!notFound()) {
            <button mat-stroked-button type="button" (click)="load()">Try again</button>
          }
        </app-state>
      } @else if (detail(); as d) {
        <app-page-header
          [title]="d.summary.employeeName"
          [subtitle]="subtitle(d)"
          back="/results"
          backLabel="All results"
        />

        <section class="grid tiles" aria-label="Summary">
          <app-stat-tile
            icon="payments"
            label="Payout"
            [value]="d.summary.payout | money: d.summary.payoutCurrency"
            [hint]="
              d.summary.payoutCurrency === 'KHR' ? '≈ ' + (d.summary.payoutUsd | money) : undefined
            "
          />
          <app-stat-tile
            icon="flag"
            label="Target incentive"
            [value]="d.summary.targetIncentive | money: d.summary.payoutCurrency"
            hint="Paid in full at 100%"
          />
          <app-stat-tile
            icon="track_changes"
            label="Overall achievement"
            [value]="d.summary.overallAchievement | pct"
          />
        </section>

        @if (d.gateKpi) {
          <section
            class="card gate"
            [class.blocked]="!d.summary.gatePassed"
            aria-label="Payout gate"
          >
            <app-status-chip
              [tone]="d.summary.gatePassed ? 'good' : 'bad'"
              [label]="
                kpiLabel(d.gateKpi) + (d.summary.gatePassed ? ' gate passed' : ' gate not met')
              "
            />
            <p>
              {{ d.gateActualValue ?? 0 | kpiValue: d.gateKpi : d.summary.payoutCurrency }}
              achieved; at least
              {{ d.gateMinValue ?? 0 | kpiValue: d.gateKpi : d.summary.payoutCurrency }} is required
              to be paid.
              @if (!d.summary.gatePassed) {
                <strong>No commission is paid this period</strong>, even though some components
                reached target.
              }
            </p>
          </section>
        }

        <section class="card table-card" aria-labelledby="calc-title">
          <h2 id="calc-title" class="title">How it was calculated</h2>
          <div class="table-scroll">
            <table mat-table [dataSource]="d.lines">
              <ng-container matColumnDef="component">
                <th mat-header-cell *matHeaderCellDef>Component</th>
                <td mat-cell *matCellDef="let l">
                  {{ l.component }}
                </td>
                <td mat-footer-cell *matFooterCellDef>Total</td>
              </ng-container>
              <ng-container matColumnDef="weight">
                <th mat-header-cell *matHeaderCellDef class="num">Weight</th>
                <td mat-cell *matCellDef="let l" class="num">{{ l.weight | pct }}</td>
                <td mat-footer-cell *matFooterCellDef class="num">{{ totalWeight(d) | pct }}</td>
              </ng-container>
              <ng-container matColumnDef="actual">
                <th mat-header-cell *matHeaderCellDef class="num">Actual</th>
                <td mat-cell *matCellDef="let l" class="num">
                  {{ l.actual | kpiValue: l.kpi : d.summary.payoutCurrency }}
                </td>
                <td mat-footer-cell *matFooterCellDef></td>
              </ng-container>
              <ng-container matColumnDef="target">
                <th mat-header-cell *matHeaderCellDef class="num">Target</th>
                <td mat-cell *matCellDef="let l" class="num">
                  {{ l.target | kpiValue: l.kpi : d.summary.payoutCurrency }}
                </td>
                <td mat-footer-cell *matFooterCellDef></td>
              </ng-container>
              <ng-container matColumnDef="achievement">
                <th mat-header-cell *matHeaderCellDef>Achievement</th>
                <td mat-cell *matCellDef="let l" class="ach">
                  <app-achievement-bar [value]="l.achievement" />
                </td>
                <td mat-footer-cell *matFooterCellDef class="ach">
                  <app-achievement-bar [value]="d.summary.overallAchievement" />
                </td>
              </ng-container>
              <ng-container matColumnDef="factor">
                <th mat-header-cell *matHeaderCellDef class="num">Pays</th>
                <td mat-cell *matCellDef="let l" class="num">{{ l.payoutFactor | pct }}</td>
                <td mat-footer-cell *matFooterCellDef></td>
              </ng-container>
              <ng-container matColumnDef="payout">
                <th mat-header-cell *matHeaderCellDef class="num">Payout</th>
                <td mat-cell *matCellDef="let l" class="num">
                  {{ l.payout | money: d.summary.payoutCurrency }}
                </td>
                <td mat-footer-cell *matFooterCellDef class="num">
                  {{ d.summary.payout | money: d.summary.payoutCurrency }}
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="columns"></tr>
              <tr mat-row *matRowDef="let l; columns: columns"></tr>
              <tr mat-footer-row *matFooterRowDef="columns"></tr>
            </table>
          </div>
          @if (d.planDescription) {
            <p class="muted note">{{ d.planDescription }}</p>
          }
        </section>
      } @else {
        <app-state kind="loading" title="Loading result" />
      }
    </div>
  `,
  styles: `
    .gate {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--app-space-3) var(--app-space-4);
    }
    .gate.blocked {
      border-color: var(--app-critical);
    }
    .gate p {
      flex: 1 1 280px;
    }
    .table-card {
      padding: var(--app-space-4) 0 0;
      overflow: hidden;
    }
    .title,
    .note {
      padding-inline: var(--app-space-5);
    }
    .title {
      margin-bottom: var(--app-space-3);
    }
    .note {
      padding-block: var(--app-space-3) var(--app-space-4);
      font: var(--mat-sys-body-small);
    }
    table {
      width: 100%;
      background: transparent;
    }
    .ach {
      min-width: 170px;
    }
    th.num {
      text-align: right;
    }
    td[mat-footer-cell],
    tr[mat-footer-row] td {
      font-weight: 600;
    }
  `,
})
export class ResultDetailPage {
  private readonly api = inject(ApiService);
  private readonly period = inject(PeriodState);

  /** Bound from the :id route parameter. */
  readonly id = input.required<string>();

  protected readonly columns = [
    'component',
    'weight',
    'actual',
    'target',
    'achievement',
    'factor',
    'payout',
  ];
  protected readonly detail = signal<ResultDetail | null>(null);
  protected readonly error = signal(false);
  protected readonly notFound = signal(false);

  constructor() {
    effect(() => {
      this.period.selectedCode();
      this.id();
      this.load();
    });
  }

  protected load() {
    const code = this.period.selectedCode();
    if (!code) return;
    this.error.set(false);
    this.notFound.set(false);
    this.api.resultDetail(Number(this.id()), code).subscribe({
      next: (d) => this.detail.set(d),
      error: (e) => {
        this.detail.set(null);
        this.notFound.set(e.status === 404);
        this.error.set(true);
      },
    });
  }

  protected subtitle(d: ResultDetail) {
    const s = d.summary;
    return [
      s.employeeCode,
      ROLE_LABELS[s.role],
      s.region,
      s.channel,
      s.planName,
      d.periodCode,
      s.supervisor ? `reports to ${s.supervisor}` : null,
    ]
      .filter(Boolean)
      .join(' · ');
  }

  protected totalWeight = (d: ResultDetail) => d.lines.reduce((sum, l) => sum + l.weight, 0);
  protected kpiLabel = (kpi: KpiType) => KPI_LABELS[kpi];
  protected readonly money = formatMoney;
  protected readonly pct = formatPercent;
  protected readonly kpiValue = formatKpiValue;
  protected readonly gateTone = computed(() =>
    this.detail()?.summary.gatePassed ? 'good' : 'bad',
  );
}
