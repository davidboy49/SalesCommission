import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatFormField, MatLabel, MatPrefix, MatSuffix } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatOption, MatSelect } from '@angular/material/select';
import { MatSort, MatSortHeader, Sort } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../core/api';
import { ROLE_LABELS } from '../../core/format';
import { ResultSummary, SalesRole } from '../../core/models';
import { PeriodState } from '../../core/period-state';
import { AchievementBar } from '../../shared/achievement-bar';
import { PageHeader } from '../../shared/page-header';
import { MoneyPipe } from '../../shared/pipes';
import { StateView } from '../../shared/state-view';
import { StatusChip } from '../../shared/status-chip';

type SortKey = keyof Pick<
  ResultSummary,
  | 'employeeCode'
  | 'employeeName'
  | 'role'
  | 'region'
  | 'planName'
  | 'overallAchievement'
  | 'payoutUsd'
>;

@Component({
  selector: 'app-results',
  imports: [
    FormsModule,
    RouterLink,
    MatButton,
    MatIconButton,
    MatFormField,
    MatLabel,
    MatPrefix,
    MatSuffix,
    MatIcon,
    MatInput,
    MatSelect,
    MatOption,
    MatTableModule,
    MatSort,
    MatSortHeader,
    MatPaginator,
    PageHeader,
    StateView,
    StatusChip,
    AchievementBar,
    MoneyPipe,
  ],
  template: `
    <div class="page">
      <app-page-header title="Results" [subtitle]="summary()" />

      <section class="toolbar-row" aria-label="Filters">
        <mat-form-field class="compact-field grow" appearance="outline" subscriptSizing="dynamic">
          <mat-label>Search name or code</mat-label>
          <mat-icon matPrefix>search</mat-icon>
          <input
            matInput
            id="results-search"
            type="search"
            [ngModel]="search()"
            (ngModelChange)="setSearch($event)"
          />
          @if (search()) {
            <button
              mat-icon-button
              matSuffix
              type="button"
              aria-label="Clear search"
              (click)="setSearch('')"
            >
              <mat-icon>close</mat-icon>
            </button>
          }
        </mat-form-field>
        <mat-form-field class="compact-field" appearance="outline" subscriptSizing="dynamic">
          <mat-label>Role</mat-label>
          <mat-select [value]="role()" (selectionChange)="setRole($event.value)">
            <mat-option value="">All roles</mat-option>
            @for (r of roles(); track r) {
              <mat-option [value]="r">{{ roleLabel(r) }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <mat-form-field class="compact-field" appearance="outline" subscriptSizing="dynamic">
          <mat-label>Region</mat-label>
          <mat-select [value]="region()" (selectionChange)="setRegion($event.value)">
            <mat-option value="">All regions</mat-option>
            @for (r of regions(); track r) {
              <mat-option [value]="r">{{ r }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <mat-form-field class="compact-field" appearance="outline" subscriptSizing="dynamic">
          <mat-label>Gate</mat-label>
          <mat-select [value]="gate()" (selectionChange)="setGate($event.value)">
            <mat-option value="">All</mat-option>
            <mat-option value="blocked">Blocked only</mat-option>
            <mat-option value="passed">Passed only</mat-option>
          </mat-select>
        </mat-form-field>
        @if (hasFilters()) {
          <button mat-button type="button" (click)="clearFilters()">
            <mat-icon>filter_alt_off</mat-icon>Clear filters
          </button>
        }
      </section>

      @if (error()) {
        <app-state
          kind="error"
          title="Could not load results"
          message="Check that the API is running, then try again."
        >
          <button mat-stroked-button type="button" (click)="load()">Try again</button>
        </app-state>
      } @else if (loading() && !rows().length) {
        <app-state kind="loading" title="Loading results" />
      } @else if (!filtered().length) {
        <app-state
          icon="search_off"
          [title]="
            rows().length ? 'No one matches these filters' : 'No results for this period yet'
          "
          [message]="
            rows().length
              ? 'Try a different search or clear the filters.'
              : 'Results appear once the period has been calculated.'
          "
        >
          @if (hasFilters()) {
            <button mat-stroked-button type="button" (click)="clearFilters()">Clear filters</button>
          }
        </app-state>
      } @else {
        <div class="card table-card">
          <div class="table-scroll">
            <table
              mat-table
              [dataSource]="pageRows()"
              matSort
              [matSortActive]="sort().active"
              [matSortDirection]="sort().direction"
              (matSortChange)="onSort($event)"
            >
              <ng-container matColumnDef="employeeCode">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>Code</th>
                <td mat-cell *matCellDef="let r">{{ r.employeeCode }}</td>
              </ng-container>
              <ng-container matColumnDef="employeeName">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>Name</th>
                <td mat-cell *matCellDef="let r">
                  <a [routerLink]="['/results', r.employeeId]">{{ r.employeeName }}</a>
                </td>
              </ng-container>
              <ng-container matColumnDef="role">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>Role</th>
                <td mat-cell *matCellDef="let r">{{ roleLabel(r.role) }}</td>
              </ng-container>
              <ng-container matColumnDef="region">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>Region</th>
                <td mat-cell *matCellDef="let r">{{ r.region }}</td>
              </ng-container>
              <ng-container matColumnDef="planName">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>Plan</th>
                <td mat-cell *matCellDef="let r">{{ r.planName }}</td>
              </ng-container>
              <ng-container matColumnDef="overallAchievement">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>Achievement</th>
                <td mat-cell *matCellDef="let r" class="ach">
                  <app-achievement-bar [value]="r.overallAchievement" />
                </td>
              </ng-container>
              <ng-container matColumnDef="gate">
                <th mat-header-cell *matHeaderCellDef>Gate</th>
                <td mat-cell *matCellDef="let r">
                  @if (r.gatePassed) {
                    <app-status-chip tone="good" label="Passed" />
                  } @else {
                    <app-status-chip tone="bad" label="Blocked" />
                  }
                </td>
              </ng-container>
              <ng-container matColumnDef="payout">
                <th mat-header-cell *matHeaderCellDef class="num">Payout</th>
                <td mat-cell *matCellDef="let r" class="num">
                  {{ r.payout | money: r.payoutCurrency }}
                </td>
              </ng-container>
              <ng-container matColumnDef="payoutUsd">
                <th
                  mat-header-cell
                  *matHeaderCellDef
                  mat-sort-header
                  arrowPosition="before"
                  class="num"
                >
                  ≈ USD
                </th>
                <td mat-cell *matCellDef="let r" class="num">{{ r.payoutUsd | money }}</td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="columns; sticky: true"></tr>
              <tr
                mat-row
                *matRowDef="let r; columns: columns"
                class="clickable"
                (click)="open(r)"
              ></tr>
            </table>
          </div>
          <mat-paginator
            [length]="filtered().length"
            [pageIndex]="pageIndex()"
            [pageSize]="pageSize()"
            [pageSizeOptions]="[10, 25, 50, 100]"
            (page)="onPage($event)"
            aria-label="Select page of results"
          />
        </div>
      }
    </div>
  `,
  styles: `
    .table-card {
      padding: 0;
      overflow: hidden;
    }
    table {
      width: 100%;
      background: transparent;
    }
    .table-scroll {
      max-height: calc(100dvh - 330px);
      min-height: 160px;
    }
    .clickable {
      cursor: pointer;
    }
    .clickable:hover {
      background: var(--mat-sys-surface-container-high);
    }
    .ach {
      min-width: 170px;
    }
    th.num {
      text-align: right;
    }
    mat-paginator {
      background: transparent;
      border-top: 1px solid var(--mat-sys-outline-variant);
    }
  `,
})
export class ResultsPage {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly period = inject(PeriodState);

  protected readonly columns = [
    'employeeCode',
    'employeeName',
    'role',
    'region',
    'planName',
    'overallAchievement',
    'gate',
    'payout',
    'payoutUsd',
  ];

  protected readonly rows = signal<ResultSummary[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal(false);

  protected readonly search = signal('');
  protected readonly role = signal('');
  protected readonly region = signal('');
  protected readonly gate = signal('');
  protected readonly sort = signal<Sort>({ active: 'employeeCode', direction: 'asc' });
  protected readonly pageIndex = signal(0);
  protected readonly pageSize = signal(25);

  protected readonly roles = computed(() => [...new Set(this.rows().map((r) => r.role))]);
  protected readonly regions = computed(() =>
    [...new Set(this.rows().map((r) => r.region))].sort(),
  );
  protected readonly hasFilters = computed(
    () => !!(this.search() || this.role() || this.region() || this.gate()),
  );

  protected readonly filtered = computed(() => {
    const q = this.search().trim().toLowerCase();
    const { active, direction } = this.sort();
    const dir = direction === 'desc' ? -1 : 1;
    return this.rows()
      .filter((r) => !this.role() || r.role === this.role())
      .filter((r) => !this.region() || r.region === this.region())
      .filter((r) => !this.gate() || (this.gate() === 'passed') === r.gatePassed)
      .filter(
        (r) =>
          !q ||
          r.employeeName.toLowerCase().includes(q) ||
          r.employeeCode.toLowerCase().includes(q),
      )
      .sort((a, b) => {
        const key = active as SortKey;
        const av = a[key];
        const bv = b[key];
        return (av < bv ? -1 : av > bv ? 1 : 0) * dir;
      });
  });

  protected readonly pageRows = computed(() => {
    const start = this.pageIndex() * this.pageSize();
    return this.filtered().slice(start, start + this.pageSize());
  });

  protected readonly summary = computed(() => {
    const total = this.filtered().reduce((sum, r) => sum + r.payoutUsd, 0);
    return `${this.filtered().length} of ${this.rows().length} people · ${total.toLocaleString('en-US', { style: 'currency', currency: 'USD' })} total`;
  });

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
    this.loading.set(true);
    this.error.set(false);
    this.api.results(code).subscribe({
      next: (rows) => {
        this.rows.set(rows);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set(true);
      },
    });
  }

  protected setSearch(value: string) {
    this.search.set(value);
    this.pageIndex.set(0);
  }
  protected setRole(value: string) {
    this.role.set(value);
    this.pageIndex.set(0);
  }
  protected setRegion(value: string) {
    this.region.set(value);
    this.pageIndex.set(0);
  }
  protected setGate(value: string) {
    this.gate.set(value);
    this.pageIndex.set(0);
  }
  protected clearFilters() {
    this.search.set('');
    this.role.set('');
    this.region.set('');
    this.gate.set('');
    this.pageIndex.set(0);
  }

  protected onSort(sort: Sort) {
    this.sort.set(sort.direction ? sort : { active: 'employeeCode', direction: 'asc' });
    this.pageIndex.set(0);
  }

  protected onPage(event: PageEvent) {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
  }

  protected open(r: ResultSummary) {
    void this.router.navigate(['/results', r.employeeId]);
  }

  protected roleLabel(role: string) {
    return ROLE_LABELS[role as SalesRole] ?? role;
  }
}
