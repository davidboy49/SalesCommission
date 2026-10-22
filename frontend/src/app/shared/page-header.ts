import { Component, input } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { RouterLink } from '@angular/router';

/** Title block for every page: optional back link, title, one line of context, and actions on the right. */
@Component({
  selector: 'app-page-header',
  imports: [RouterLink, MatButton, MatIcon],
  template: `
    <header>
      <div class="titles">
        @if (back()) {
          <a mat-button class="back" [routerLink]="back()">
            <mat-icon>arrow_back</mat-icon>
            {{ backLabel() }}
          </a>
        }
        <h1>{{ title() }}</h1>
        @if (subtitle()) {
          <p class="muted">{{ subtitle() }}</p>
        }
      </div>
      <div class="actions"><ng-content /></div>
    </header>
  `,
  styles: `
    header {
      display: flex;
      flex-wrap: wrap;
      gap: var(--app-space-3) var(--app-space-4);
      align-items: flex-end;
      justify-content: space-between;
    }
    .titles {
      display: grid;
      gap: var(--app-space-1);
      min-width: 0;
    }
    .back {
      justify-self: start;
      margin-left: calc(var(--app-space-3) * -1);
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: var(--app-space-2);
      align-items: center;
    }
  `,
})
export class PageHeader {
  readonly title = input.required<string>();
  readonly subtitle = input<string>();
  readonly back = input<string | string[]>();
  readonly backLabel = input('Back');
}
