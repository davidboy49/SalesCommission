import { BreakpointObserver } from '@angular/cdk/layout';
import { Component, ElementRef, OnInit, computed, inject, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { MatFormField } from '@angular/material/form-field';
import { MatOption, MatSelect, MatSelectTrigger } from '@angular/material/select';
import { MatSidenav, MatSidenavContainer, MatSidenavContent } from '@angular/material/sidenav';
import { MatToolbar } from '@angular/material/toolbar';
import { MatListItem, MatListItemIcon, MatListItemTitle, MatNavList } from '@angular/material/list';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { AuthService } from '../core/auth';
import { PeriodState } from '../core/period-state';
import { ThemeMode, ThemeService } from '../core/theme';

interface NavItem {
  label: string;
  path: string;
  icon: string;
}

const THEME_OPTIONS: { mode: ThemeMode; label: string; icon: string }[] = [
  { mode: 'system', label: 'Match system', icon: 'brightness_auto' },
  { mode: 'light', label: 'Light', icon: 'light_mode' },
  { mode: 'dark', label: 'Dark', icon: 'dark_mode' },
];

@Component({
  selector: 'app-shell',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatToolbar,
    MatIcon,
    MatButton,
    MatIconButton,
    MatMenu,
    MatMenuItem,
    MatMenuTrigger,
    MatFormField,
    MatSelect,
    MatSelectTrigger,
    MatOption,
    MatSidenav,
    MatSidenavContainer,
    MatSidenavContent,
    MatNavList,
    MatListItem,
    MatListItemIcon,
    MatListItemTitle,
  ],
  template: `
    <div class="shell">
      <button type="button" class="skip" (click)="focusMain()">Skip to content</button>

      <mat-toolbar class="top">
        @if (showSidenav() && handset()) {
          <button
            mat-icon-button
            type="button"
            aria-label="Open navigation"
            (click)="drawer()?.toggle()"
          >
            <mat-icon>menu</mat-icon>
          </button>
        }
        <a class="brand" [routerLink]="auth.homeRoute()">Sales <span>Commission</span></a>

        <span class="spacer"></span>

        <mat-form-field class="compact-field period" appearance="outline" subscriptSizing="dynamic">
          <mat-select
            aria-label="Period"
            [value]="period.selectedCode()"
            (selectionChange)="period.selectedCode.set($event.value)"
          >
            <mat-select-trigger>{{ period.selectedCode() }}</mat-select-trigger>
            @for (p of period.periods(); track p.code) {
              <mat-option [value]="p.code">{{ p.code }} · {{ p.status }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <button
          mat-button
          type="button"
          class="user"
          [matMenuTriggerFor]="userMenu"
          aria-label="Account menu"
        >
          <span class="avatar" aria-hidden="true">{{ initial() }}</span>
          @if (!handset()) {
            <span class="name">{{ auth.session()?.displayName }}</span>
          }
        </button>
        <mat-menu #userMenu="matMenu">
          <div
            class="who"
            (click)="$event.stopPropagation()"
            (keydown)="$event.stopPropagation()"
            tabindex="-1"
          >
            <strong>{{ auth.session()?.displayName }}</strong>
            <span class="muted">{{ auth.session()?.email }}</span>
            <span class="muted">{{ auth.session()?.roles?.join(', ') }}</span>
          </div>
          <div class="menu-label" role="presentation">Theme</div>
          @for (t of themeOptions; track t.mode) {
            <button
              mat-menu-item
              type="button"
              role="menuitemradio"
              [attr.aria-checked]="theme.mode() === t.mode"
              (click)="theme.mode.set(t.mode)"
            >
              <mat-icon>{{ t.icon }}</mat-icon>
              <span>{{ t.label }}</span>
              @if (theme.mode() === t.mode) {
                <mat-icon class="check">check</mat-icon>
              }
            </button>
          }
          <hr class="menu-divider" />
          <button mat-menu-item type="button" (click)="auth.logout()">
            <mat-icon>logout</mat-icon>
            <span>Sign out</span>
          </button>
        </mat-menu>
      </mat-toolbar>

      <mat-sidenav-container class="body">
        @if (showSidenav()) {
          <mat-sidenav
            #drawer
            [mode]="handset() ? 'over' : 'side'"
            [opened]="!handset()"
            [attr.aria-label]="'Main navigation'"
          >
            <mat-nav-list>
              @for (item of navItems(); track item.path) {
                <a
                  mat-list-item
                  [routerLink]="item.path"
                  routerLinkActive="active"
                  #rla="routerLinkActive"
                  [activated]="rla.isActive"
                >
                  <mat-icon matListItemIcon>{{ item.icon }}</mat-icon>
                  <span matListItemTitle>{{ item.label }}</span>
                </a>
              }
            </mat-nav-list>
          </mat-sidenav>
        }
        <mat-sidenav-content>
          <main #main tabindex="-1"><router-outlet /></main>
        </mat-sidenav-content>
      </mat-sidenav-container>
    </div>
  `,
  styles: `
    .shell {
      display: flex;
      flex-direction: column;
      height: 100dvh;
    }
    .skip {
      position: absolute;
      left: var(--app-space-2);
      top: -48px;
      z-index: 20;
      padding: var(--app-space-2) var(--app-space-3);
      border-radius: var(--mat-sys-corner-small);
      border: 0;
      background: var(--mat-sys-primary);
      color: var(--mat-sys-on-primary);
      font: var(--mat-sys-label-large);
    }
    .skip:focus {
      top: var(--app-space-2);
    }
    .top {
      flex: none;
      gap: var(--app-space-2);
      padding-inline: max(var(--app-space-3), env(safe-area-inset-left, 0px))
        max(var(--app-space-3), env(safe-area-inset-right, 0px));
      background: var(--mat-sys-surface-container-low);
      border-bottom: 1px solid var(--mat-sys-outline-variant);
      --mat-toolbar-container-background-color: var(--mat-sys-surface-container-low);
    }
    .brand {
      font: var(--mat-sys-title-large);
      font-weight: 700;
      color: var(--mat-sys-on-surface);
      text-decoration: none;
      white-space: nowrap;
    }
    .brand span {
      color: var(--mat-sys-primary);
    }
    .spacer {
      flex: 1;
    }
    .period {
      width: 132px;
      flex: none;
    }
    .user {
      gap: var(--app-space-2);
      padding-inline: var(--app-space-2);
    }
    .avatar {
      display: inline-grid;
      place-items: center;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: var(--mat-sys-primary-container);
      color: var(--mat-sys-on-primary-container);
      font: var(--mat-sys-label-large);
    }
    .check {
      margin-left: auto;
      margin-right: 0;
    }
    .menu-label {
      padding: var(--app-space-3) var(--app-space-4) var(--app-space-1);
      font: var(--mat-sys-label-medium);
      color: var(--mat-sys-on-surface-variant);
    }
    .menu-divider {
      border: 0;
      border-top: 1px solid var(--mat-sys-outline-variant);
      margin: var(--app-space-1) 0;
    }
    .who {
      display: grid;
      gap: 2px;
      padding: var(--app-space-3) var(--app-space-4);
      border-bottom: 1px solid var(--mat-sys-outline-variant);
      font: var(--mat-sys-body-medium);
      min-width: 220px;
    }
    .body {
      flex: 1;
      min-height: 0;
      background: var(--mat-sys-surface);
    }
    mat-sidenav {
      width: 232px;
      background: var(--mat-sys-surface);
      border-right: 1px solid var(--mat-sys-outline-variant);
    }
    mat-nav-list {
      padding: var(--app-space-3);
    }
    main {
      outline: none;
    }
    @media (max-width: 600px) {
      .period {
        width: 112px;
      }
    }
  `,
})
export class Shell implements OnInit {
  protected readonly auth = inject(AuthService);
  protected readonly period = inject(PeriodState);
  protected readonly theme = inject(ThemeService);
  private readonly router = inject(Router);

  protected readonly themeOptions = THEME_OPTIONS;
  /** Absent for users with a single page (reps), who get no sidebar. */
  protected readonly drawer = viewChild<MatSidenav>('drawer');
  private readonly main = viewChild.required<ElementRef<HTMLElement>>('main');

  protected readonly handset = toSignal(
    inject(BreakpointObserver)
      .observe('(max-width: 899.98px)')
      .pipe(map((state) => state.matches)),
    { initialValue: false },
  );

  protected readonly navItems = computed<NavItem[]>(() => {
    const items: NavItem[] = [];
    if (this.auth.isReviewer()) {
      items.push({ label: 'Dashboard', path: '/dashboard', icon: 'dashboard' });
      items.push({ label: 'Results', path: '/results', icon: 'table_view' });
    } else {
      items.push({ label: 'My commission', path: '/me', icon: 'payments' });
    }
    if (this.auth.isOffice()) {
      items.push({ label: 'Plans', path: '/plans', icon: 'rule' });
      items.push({ label: 'Employees', path: '/employees', icon: 'groups' });
    }
    return items;
  });

  /** A rep has one page, so the sidebar would only be in the way. */
  protected readonly showSidenav = computed(() => this.navItems().length > 1);
  protected readonly initial = computed(() =>
    (this.auth.session()?.displayName ?? '?').charAt(0).toUpperCase(),
  );

  constructor() {
    // On a phone the drawer covers the page, so close it once a destination is chosen.
    this.router.events.pipe(filter((e) => e instanceof NavigationEnd)).subscribe(() => {
      if (this.handset()) void this.drawer()?.close();
    });
  }

  ngOnInit() {
    this.period.refresh();
  }

  protected focusMain() {
    this.main().nativeElement.focus();
  }
}
