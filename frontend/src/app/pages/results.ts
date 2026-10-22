import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../core/api';
import { ROLE_LABELS, achievementClass, barWidth, formatMoney, formatPercent } from '../core/format';
import { ResultSummary, SalesRole } from '../core/models';
import { PeriodState } from '../core/period-state';

type SortKey = 'employeeCode' | 'employeeName' | 'overallAchievement' | 'payoutUsd';

@Component({
  selector: 'app-results',
  imports: [FormsModule],
  template: `
    <div class="page">
      <div class="page-head">
        <div>
          <h1>Results</h1>
          <div class="muted">{{ filtered().length }} of {{ rows().length }} people · payout total {{ money(total()) }}</div>
        </div>
        <div class="filters">
          <label class="field">Search
            <input type="search" placeholder="Name or code" [ngModel]="search()" (ngModelChange)="search.set($event)" />
          </label>
          <label class="field">Role
            <select [ngModel]="role()" (ngModelChange)="role.set($event)">
              <option value="">All roles</option>
              @for (r of roles(); track r) { <option [value]="r">{{ roleLabel(r) }}</option> }
            </select>
          </label>
          <label class="field">Region
            <select [ngModel]="region()" (ngModelChange)="region.set($event)">
              <option value="">All regions</option>
              @for (r of regions(); track r) { <option [value]="r">{{ r }}</option> }
            </select>
          </label>
        </div>
      </div>

      @if (error()) { <p class="notice bad" role="alert">{{ error() }}</p> }

      <div class="card table-wrap">
        <table>
          <thead>
            <tr>
              <th><button class="th" type="button" (click)="sortBy('employeeCode')">Code</button></th>
              <th><button class="th" type="button" (click)="sortBy('employeeName')">Name</button></th>
              <th>Role</th>
              <th>Region</th>
              <th>Plan</th>
              <th><button class="th" type="button" (click)="sortBy('overallAchievement')">Achievement</button></th>
              <th>Gate</th>
              <th class="num">Payout</th>
              <th class="num"><button class="th" type="button" (click)="sortBy('payoutUsd')">≈ USD</button></th>
            </tr>
          </thead>
          <tbody>
            @for (r of filtered(); track r.employeeId) {
              <tr class="clickable" tabindex="0" (click)="open(r)" (keydown.enter)="open(r)">
                <td>{{ r.employeeCode }}</td>
                <td>{{ r.employeeName }}</td>
                <td>{{ roleLabel(r.role) }}</td>
                <td>{{ r.region }}</td>
                <td>{{ r.planName }}</td>
                <td>
                  <div class="ach">
                    <div class="bar" [class]="'bar ' + cls(r.overallAchievement)"><span [style.width.%]="width(r.overallAchievement)"></span></div>
                    <span class="num">{{ pct(r.overallAchievement) }}</span>
                  </div>
                </td>
                <td>
                  @if (r.gatePassed) { <span class="chip good">Passed</span> } @else { <span class="chip bad">Blocked</span> }
                </td>
                <td class="num">{{ fmt(r.payout, r.payoutCurrency) }}</td>
                <td class="num">{{ money(r.payoutUsd) }}</td>
              </tr>
            } @empty {
              <tr><td colspan="9" class="muted">{{ loading() ? 'Loading…' : 'No results to show.' }}</td></tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: `
    .filters {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }
    .ach {
      display: grid;
      grid-template-columns: 90px auto;
      gap: 8px;
      align-items: center;
    }
    .th {
      all: unset;
      cursor: pointer;
      font: inherit;
      text-transform: inherit;
      letter-spacing: inherit;
    }
    .th:hover {
      color: var(--text);
    }
    tbody tr:focus-visible {
      outline: 2px solid var(--accent);
      outline-offset: -2px;
    }
  `,
})
export class ResultsPage {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly period = inject(PeriodState);

  protected readonly rows = signal<ResultSummary[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly search = signal('');
  protected readonly role = signal('');
  protected readonly region = signal('');
  private readonly sort = signal<{ key: SortKey; dir: 1 | -1 }>({ key: 'employeeCode', dir: 1 });

  protected readonly roles = computed(() => [...new Set(this.rows().map((r) => r.role))]);
  protected readonly regions = computed(() => [...new Set(this.rows().map((r) => r.region))].sort());

  protected readonly filtered = computed(() => {
    const q = this.search().trim().toLowerCase();
    const { key, dir } = this.sort();
    return this.rows()
      .filter((r) => !this.role() || r.role === this.role())
      .filter((r) => !this.region() || r.region === this.region())
      .filter((r) => !q || r.employeeName.toLowerCase().includes(q) || r.employeeCode.toLowerCase().includes(q))
      .sort((a, b) => {
        const av = a[key];
        const bv = b[key];
        return (av < bv ? -1 : av > bv ? 1 : 0) * dir;
      });
  });

  protected readonly total = computed(() => this.filtered().reduce((sum, r) => sum + r.payoutUsd, 0));

  constructor() {
    effect(() => {
      const code = this.period.selectedCode();
      this.period.version();
      if (!code) return;
      this.loading.set(true);
      this.error.set(null);
      this.api.results(code).subscribe({
        next: (rows) => {
          this.rows.set(rows);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.error.set('Could not load results.');
        },
      });
    });
  }

  protected sortBy(key: SortKey) {
    this.sort.update((s) => (s.key === key ? { key, dir: s.dir === 1 ? -1 : 1 } : { key, dir: key === 'employeeCode' || key === 'employeeName' ? 1 : -1 }));
  }

  protected open(r: ResultSummary) {
    void this.router.navigate(['/results', r.employeeId]);
  }

  protected roleLabel(role: string) {
    return ROLE_LABELS[role as SalesRole] ?? role;
  }

  protected fmt = formatMoney;
  protected cls = achievementClass;
  protected width = barWidth;

  protected pct(v: number) {
    return formatPercent(v, 0);
  }

  protected money(v: number) {
    return formatMoney(v, 'USD');
  }
}
