import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatFormField, MatLabel, MatPrefix, MatSuffix } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatOption, MatSelect } from '@angular/material/select';
import { MatSort, MatSortHeader, Sort } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { ApiService } from '../../core/api';
import { ROLE_LABELS } from '../../core/format';
import { Employee, SalesRole } from '../../core/models';
import { PageHeader } from '../../shared/page-header';
import { StateView } from '../../shared/state-view';
import { StatusChip } from '../../shared/status-chip';

type SortKey = 'code' | 'fullName' | 'role' | 'region' | 'channel' | 'manager';

@Component({
  selector: 'app-employees',
  imports: [
    FormsModule,
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
  ],
  template: `
    <div class="page">
      <app-page-header
        title="Employees"
        subtitle="Mock data for the demo. Later this comes from the HR system."
      />

      <section class="toolbar-row" aria-label="Filters">
        <mat-form-field class="compact-field grow" appearance="outline" subscriptSizing="dynamic">
          <mat-label>Search name or code</mat-label>
          <mat-icon matPrefix>search</mat-icon>
          <input
            matInput
            id="employees-search"
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
      </section>

      @if (error()) {
        <app-state
          kind="error"
          title="Could not load employees"
          message="Check that the API is running, then try again."
        >
          <button mat-stroked-button type="button" (click)="load()">Try again</button>
        </app-state>
      } @else if (loading()) {
        <app-state kind="loading" title="Loading employees" />
      } @else if (!filtered().length) {
        <app-state
          icon="search_off"
          title="No employees match"
          message="Try a different search or role."
        />
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
              <ng-container matColumnDef="code">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>Code</th>
                <td mat-cell *matCellDef="let e">{{ e.code }}</td>
              </ng-container>
              <ng-container matColumnDef="fullName">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>Name</th>
                <td mat-cell *matCellDef="let e">{{ e.fullName }}</td>
              </ng-container>
              <ng-container matColumnDef="role">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>Role</th>
                <td mat-cell *matCellDef="let e">{{ roleLabel(e.role) }}</td>
              </ng-container>
              <ng-container matColumnDef="region">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>Region</th>
                <td mat-cell *matCellDef="let e">{{ e.region }}</td>
              </ng-container>
              <ng-container matColumnDef="channel">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>Channel</th>
                <td mat-cell *matCellDef="let e">{{ e.channel ?? '—' }}</td>
              </ng-container>
              <ng-container matColumnDef="manager">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>Reports to</th>
                <td mat-cell *matCellDef="let e">{{ e.manager ?? '—' }}</td>
              </ng-container>
              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef>Status</th>
                <td mat-cell *matCellDef="let e">
                  @if (e.isActive) {
                    <app-status-chip tone="good" label="Active" />
                  } @else {
                    <app-status-chip tone="neutral" icon="pause_circle" label="Inactive" />
                  }
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="columns; sticky: true"></tr>
              <tr mat-row *matRowDef="let e; columns: columns"></tr>
            </table>
          </div>
          <mat-paginator
            [length]="filtered().length"
            [pageIndex]="pageIndex()"
            [pageSize]="pageSize()"
            [pageSizeOptions]="[10, 25, 50, 100]"
            (page)="onPage($event)"
            aria-label="Select page of employees"
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
    mat-paginator {
      background: transparent;
      border-top: 1px solid var(--mat-sys-outline-variant);
    }
  `,
})
export class EmployeesPage {
  private readonly api = inject(ApiService);

  protected readonly columns = [
    'code',
    'fullName',
    'role',
    'region',
    'channel',
    'manager',
    'status',
  ];
  protected readonly employees = signal<Employee[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal(false);

  protected readonly search = signal('');
  protected readonly role = signal('');
  protected readonly sort = signal<Sort>({ active: 'code', direction: 'asc' });
  protected readonly pageIndex = signal(0);
  protected readonly pageSize = signal(25);

  protected readonly roles = computed(() => [...new Set(this.employees().map((e) => e.role))]);

  protected readonly filtered = computed(() => {
    const q = this.search().trim().toLowerCase();
    const { active, direction } = this.sort();
    const dir = direction === 'desc' ? -1 : 1;
    return this.employees()
      .filter((e) => !this.role() || e.role === this.role())
      .filter((e) => !q || e.fullName.toLowerCase().includes(q) || e.code.toLowerCase().includes(q))
      .sort((a, b) => {
        const key = active as SortKey;
        const av = a[key] ?? '';
        const bv = b[key] ?? '';
        return (av < bv ? -1 : av > bv ? 1 : 0) * dir;
      });
  });

  protected readonly pageRows = computed(() => {
    const start = this.pageIndex() * this.pageSize();
    return this.filtered().slice(start, start + this.pageSize());
  });

  constructor() {
    this.load();
  }

  protected load() {
    this.loading.set(true);
    this.error.set(false);
    this.api.employees().subscribe({
      next: (list) => {
        this.employees.set(list);
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
  protected onSort(sort: Sort) {
    this.sort.set(sort.direction ? sort : { active: 'code', direction: 'asc' });
    this.pageIndex.set(0);
  }
  protected onPage(event: PageEvent) {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
  }
  protected roleLabel = (role: string) => ROLE_LABELS[role as SalesRole] ?? role;
}
