import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { ApiService } from './api';
import { Period } from './models';

/** The period every screen is looking at, shared so switching it in the header updates the page. */
@Injectable({ providedIn: 'root' })
export class PeriodState {
  private readonly api = inject(ApiService);

  readonly periods = signal<Period[]>([]);
  readonly selectedCode = signal<string | null>(null);
  readonly selected = computed(() => this.periods().find((p) => p.code === this.selectedCode()) ?? null);

  /** Bumped after a calculation so pages reload the new results. */
  readonly version = signal(0);
  readonly calculating = signal(false);
  readonly error = signal<string | null>(null);

  refresh() {
    this.api.periods().subscribe((periods) => {
      this.periods.set(periods);
      const current = this.selectedCode();
      if (!current || !periods.some((p) => p.code === current)) {
        const latestCalculated = periods.find((p) => p.status !== 'Open');
        this.selectedCode.set((latestCalculated ?? periods[0])?.code ?? null);
      }
    });
  }

  calculate() {
    const code = this.selectedCode();
    if (!code || this.calculating()) return;
    this.calculating.set(true);
    this.error.set(null);
    this.api.calculate(code).subscribe({
      next: () => {
        this.calculating.set(false);
        this.refresh();
        this.version.update((v) => v + 1);
      },
      error: (e: HttpErrorResponse) => {
        this.calculating.set(false);
        this.error.set(e.error?.message ?? 'The calculation failed.');
      },
    });
  }
}
