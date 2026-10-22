import { Component, computed, input } from '@angular/core';
import { achievementClass, barWidth, formatPercent } from '../core/format';

/** Achievement against target. A full bar is 120%, so beating target stays visible; the number is always shown. */
@Component({
  selector: 'app-achievement-bar',
  template: `
    <div class="wrap" role="img" [attr.aria-label]="label()">
      <div class="track" [class]="band()">
        <span class="fill" [style.width.%]="width()"></span>
        <span class="target" aria-hidden="true"></span>
      </div>
      @if (showValue()) {
        <span class="value">{{ text() }}</span>
      }
    </div>
  `,
  styles: `
    .wrap {
      display: flex;
      align-items: center;
      gap: var(--app-space-2);
      min-width: 0;
    }
    .track {
      position: relative;
      flex: 1;
      min-width: 64px;
      height: 8px;
      border-radius: 999px;
      background: var(--mat-sys-surface-container-highest);
    }
    .fill {
      display: block;
      height: 100%;
      border-radius: 999px;
      background: var(--mat-sys-primary);
    }
    .good .fill {
      background: var(--app-good);
    }
    .warn .fill {
      background: var(--app-warning);
    }
    .bad .fill {
      background: var(--app-critical);
    }
    /* the 100% mark sits at 5/6 of the track */
    .target {
      position: absolute;
      top: -3px;
      bottom: -3px;
      left: calc(100% * 100 / 120);
      width: 2px;
      border-radius: 1px;
      background: var(--mat-sys-on-surface-variant);
      opacity: 0.55;
    }
    .value {
      min-width: 3.4ch;
      text-align: right;
      font-variant-numeric: tabular-nums;
    }
  `,
})
export class AchievementBar {
  readonly value = input.required<number>();
  readonly showValue = input(true);
  protected readonly width = computed(() => barWidth(this.value()));
  protected readonly band = computed(() => achievementClass(this.value()));
  protected readonly text = computed(() => formatPercent(this.value(), 0));
  protected readonly label = computed(() => `${this.text()} of target`);
}
