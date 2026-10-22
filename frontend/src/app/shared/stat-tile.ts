import { Component, input } from '@angular/core';
import { MatIcon } from '@angular/material/icon';

/** One headline number with its label. Use sparingly: only for figures that are the point of the page. */
@Component({
  selector: 'app-stat-tile',
  imports: [MatIcon],
  template: `
    <div class="card tile">
      <div class="label">
        @if (icon()) {
          <mat-icon aria-hidden="true">{{ icon() }}</mat-icon>
        }
        <span>{{ label() }}</span>
      </div>
      <div class="value">{{ value() }}</div>
      @if (hint()) {
        <div class="hint muted">{{ hint() }}</div>
      }
    </div>
  `,
  styles: `
    .tile {
      display: grid;
      gap: var(--app-space-1);
      align-content: start;
      height: 100%;
      padding-inline: var(--app-space-4);
    }
    .label {
      display: flex;
      align-items: center;
      gap: var(--app-space-2);
      font: var(--mat-sys-label-large);
      color: var(--mat-sys-on-surface-variant);
    }
    .label mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
    }
    .value {
      font: var(--mat-sys-headline-medium);
      font-variant-numeric: tabular-nums;
      /* a figure must never split across lines */
      white-space: nowrap;
    }
    .hint {
      font: var(--mat-sys-body-small);
    }
  `,
})
export class StatTile {
  readonly label = input.required<string>();
  readonly value = input.required<string>();
  readonly hint = input<string>();
  readonly icon = input<string>();
}
