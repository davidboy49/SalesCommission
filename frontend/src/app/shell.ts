import { Component, OnInit, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from './core/auth';
import { PeriodState } from './core/period-state';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, FormsModule],
  template: `
    <header class="top">
      <div class="brand">Hanuman <span>Commission</span></div>

      <nav aria-label="Main">
        @if (auth.isReviewer()) {
          <a routerLink="/dashboard" routerLinkActive="active">Dashboard</a>
          <a routerLink="/results" routerLinkActive="active">Results</a>
        } @else {
          <a routerLink="/me" routerLinkActive="active">My commission</a>
        }
        @if (auth.isOffice()) {
          <a routerLink="/plans" routerLinkActive="active">Plans</a>
          <a routerLink="/employees" routerLinkActive="active">Employees</a>
        }
      </nav>

      <div class="right">
        <label class="period">
          <span class="sr">Period</span>
          <select
            [ngModel]="period.selectedCode()"
            (ngModelChange)="period.selectedCode.set($event)"
            aria-label="Period"
          >
            @for (p of period.periods(); track p.code) {
              <option [value]="p.code">{{ p.code }} · {{ p.status }}</option>
            }
          </select>
        </label>
        <span class="who">{{ auth.session()?.displayName }}</span>
        <button class="btn" type="button" (click)="auth.logout()">Sign out</button>
      </div>
    </header>

    <main><router-outlet /></main>
  `,
  styles: `
    .top {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 10px 20px;
      padding: 10px 16px;
      background: var(--surface);
      border-bottom: 1px solid var(--border);
      position: sticky;
      top: 0;
      z-index: 5;
    }
    .brand {
      font-weight: 700;
      font-size: 1.05rem;
    }
    .brand span {
      color: var(--accent);
    }
    nav {
      display: flex;
      gap: 4px;
      flex: 1;
      flex-wrap: wrap;
    }
    nav a {
      padding: 7px 12px;
      border-radius: 8px;
      text-decoration: none;
      color: var(--muted);
      font-weight: 550;
    }
    nav a:hover {
      background: var(--surface-2);
    }
    nav a.active {
      background: var(--accent-soft);
      color: var(--accent);
    }
    .right {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }
    .who {
      color: var(--muted);
      font-size: 0.9rem;
    }
    .sr {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip: rect(0 0 0 0);
    }
    @media (max-width: 640px) {
      .who {
        display: none;
      }
      nav {
        order: 3;
        flex-basis: 100%;
      }
    }
  `,
})
export class Shell implements OnInit {
  protected readonly auth = inject(AuthService);
  protected readonly period = inject(PeriodState);

  ngOnInit() {
    this.period.refresh();
  }
}
