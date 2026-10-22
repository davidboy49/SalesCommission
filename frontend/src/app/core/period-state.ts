import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { ApiService } from './api';
import { formatMoney } from './format';
import { Period } from './models';
import { Notifier } from './notifier';

/** The period every screen is looking at, shared so switching it in the header updates the page. */
@Injectable({ providedIn: 'root' })
export class PeriodState {
  private readonly api = inject(ApiService);
  private readonly notifier = inject(Notifier);

  readonly periods = signal<Period[]>([]);
  readonly selectedCode = signal<string | null>(null);
  readonly selected = computed(
    () => this.periods().find((p) => p.code === this.selectedCode()) ?? null,
  );

  /** Bumped after a calculation so pages reload the new results. */
  readonly version = signal(0);
  readonly calculating = signal(false);

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
    this.api.calculate(code).subscribe({
      next: (period) => {
        this.calculating.set(false);
        this.refresh();
        this.version.update((v) => v + 1);
        this.notifier.success(
          `Calculated ${period.code}: ${period.employeeCount} people, ${formatMoney(period.totalPayoutUsd ?? 0, 'USD')} in total.`,
        );
      },
      error: (e: HttpErrorResponse) => {
        this.calculating.set(false);
        this.notifier.error(e.error?.message ?? `Could not calculate ${code}. Try again.`);
      },
    });
  }
}
