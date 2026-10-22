import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api';
import { ROLE_LABELS } from '../core/format';
import { Employee } from '../core/models';

@Component({
  selector: 'app-employees',
  imports: [FormsModule],
  template: `
    <div class="page">
      <div class="page-head">
        <div>
          <h1>Employees</h1>
          <div class="muted">Mock data for the demo — later synced from the HR system.</div>
        </div>
        <label class="field">Search
          <input type="search" placeholder="Name or code" [ngModel]="search()" (ngModelChange)="search.set($event)" />
        </label>
      </div>

      <div class="card table-wrap">
        <table>
          <thead>
            <tr><th>Code</th><th>Name</th><th>Role</th><th>Region</th><th>Channel</th><th>Reports to</th><th>Status</th></tr>
          </thead>
          <tbody>
            @for (e of filtered(); track e.id) {
              <tr>
                <td>{{ e.code }}</td>
                <td>{{ e.fullName }}</td>
                <td>{{ roleLabel(e.role) }}</td>
                <td>{{ e.region }}</td>
                <td>{{ e.channel ?? '—' }}</td>
                <td>{{ e.manager ?? '—' }}</td>
                <td>@if (e.isActive) { <span class="chip good">Active</span> } @else { <span class="chip">Inactive</span> }</td>
              </tr>
            } @empty {
              <tr><td colspan="7" class="muted">No employees found.</td></tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  `,
})
export class EmployeesPage {
  protected readonly employees = signal<Employee[]>([]);
  protected readonly search = signal('');
  protected readonly filtered = computed(() => {
    const q = this.search().trim().toLowerCase();
    return this.employees().filter((e) => !q || e.fullName.toLowerCase().includes(q) || e.code.toLowerCase().includes(q));
  });

  constructor() {
    inject(ApiService)
      .employees()
      .subscribe((list) => this.employees.set(list));
  }

  protected roleLabel(role: string) {
    return ROLE_LABELS[role as keyof typeof ROLE_LABELS] ?? role;
  }
}
