import { Component, computed, input } from '@angular/core';
import { MatIcon } from '@angular/material/icon';

export type Tone = 'good' | 'warn' | 'bad' | 'neutral';

const ICONS: Record<Tone, string> = {
  good: 'check_circle',
  warn: 'warning',
  bad: 'error',
  neutral: 'info',
};

/** A status is always an icon plus a word, never colour alone. */
@Component({
  selector: 'app-status-chip',
  imports: [MatIcon],
  template: `
    <span class="chip" [class]="tone()">
      <mat-icon aria-hidden="true">{{ glyph() }}</mat-icon>
      {{ label() }}
    </span>
  `,
  styles: `
    .chip {
      display: inline-flex;
      align-items: center;
      gap: var(--app-space-1);
      padding: 2px var(--app-space-3) 2px var(--app-space-2);
      border-radius: 999px;
      font: var(--mat-sys-label-large);
      white-space: nowrap;
      background: var(--mat-sys-surface-container-high);
      color: var(--mat-sys-on-surface);
    }
    mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }
    .good {
      background: var(--app-good-bg);
    }
    .good mat-icon {
      color: var(--app-good);
    }
    .warn {
      background: var(--app-warning-bg);
    }
    .warn mat-icon {
      color: var(--app-warning);
    }
    .bad {
      background: var(--app-critical-bg);
    }
    .bad mat-icon {
      color: var(--app-critical);
    }
    .neutral mat-icon {
      color: var(--mat-sys-on-surface-variant);
    }
  `,
})
export class StatusChip {
  readonly tone = input<Tone>('neutral');
  readonly label = input.required<string>();
  readonly icon = input<string>();
  protected readonly glyph = computed(() => this.icon() ?? ICONS[this.tone()]);
}
