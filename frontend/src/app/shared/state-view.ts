import { Component, input } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { MatProgressSpinner } from '@angular/material/progress-spinner';

export type StateKind = 'loading' | 'empty' | 'error';

/** The three non-happy states of any data view, so none of them is ever a blank screen. */
@Component({
  selector: 'app-state',
  imports: [MatIcon, MatProgressSpinner],
  template: `
    <div class="state" [attr.role]="kind() === 'error' ? 'alert' : 'status'">
      @switch (kind()) {
        @case ('loading') {
          <mat-spinner diameter="32" />
        }
        @case ('error') {
          <mat-icon class="error" aria-hidden="true">error</mat-icon>
        }
        @default {
          <mat-icon aria-hidden="true">{{ icon() }}</mat-icon>
        }
      }
      <div class="text">
        <strong>{{ title() }}</strong>
        @if (message()) {
          <p class="muted">{{ message() }}</p>
        }
      </div>
      <div class="actions"><ng-content /></div>
    </div>
  `,
  styles: `
    .state {
      display: grid;
      justify-items: center;
      text-align: center;
      gap: var(--app-space-3);
      padding: var(--app-space-7) var(--app-space-4);
      color: var(--mat-sys-on-surface-variant);
    }
    mat-icon {
      font-size: 40px;
      width: 40px;
      height: 40px;
    }
    mat-icon.error {
      color: var(--app-critical);
    }
    strong {
      font: var(--mat-sys-title-medium);
      color: var(--mat-sys-on-surface);
    }
    .text {
      display: grid;
      gap: var(--app-space-1);
      max-width: 46ch;
    }
    .actions:empty {
      display: none;
    }
  `,
})
export class StateView {
  readonly kind = input<StateKind>('empty');
  readonly title = input.required<string>();
  readonly message = input<string>();
  readonly icon = input('inbox');
}
