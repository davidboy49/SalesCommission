import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormField, MatLabel, MatSuffix } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth';

const DEMO_ACCOUNTS = [
  { email: 'admin@hanuman.local', label: 'Admin' },
  { email: 'finance@hanuman.local', label: 'Finance' },
  { email: 'manager@hanuman.local', label: 'Manager' },
  { email: 'supervisor@hanuman.local', label: 'Supervisor' },
  { email: 'rep@hanuman.local', label: 'Sales rep' },
];

@Component({
  selector: 'app-login',
  imports: [
    FormsModule,
    MatButton,
    MatIconButton,
    MatChipsModule,
    MatFormField,
    MatLabel,
    MatSuffix,
    MatIcon,
    MatInput,
    MatProgressSpinner,
  ],
  template: `
    <main class="wrap">
      <form class="card panel" (ngSubmit)="submit()" #form="ngForm">
        <div class="intro">
          <h1>Sales <span>Commission</span></h1>
          <p class="muted">Sign in to see how commission was calculated.</p>
        </div>

        <mat-form-field appearance="outline">
          <mat-label>Email</mat-label>
          <input
            matInput
            id="email"
            name="email"
            type="email"
            autocomplete="username"
            required
            [(ngModel)]="email"
          />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Password</mat-label>
          <input
            matInput
            id="password"
            name="password"
            autocomplete="current-password"
            required
            [type]="showPassword() ? 'text' : 'password'"
            [(ngModel)]="password"
          />
          <button
            mat-icon-button
            matSuffix
            type="button"
            [attr.aria-label]="showPassword() ? 'Hide password' : 'Show password'"
            [attr.aria-pressed]="showPassword()"
            (click)="showPassword.set(!showPassword())"
          >
            <mat-icon>{{ showPassword() ? 'visibility_off' : 'visibility' }}</mat-icon>
          </button>
        </mat-form-field>

        @if (error()) {
          <p class="error" role="alert">
            <mat-icon aria-hidden="true">error</mat-icon>{{ error() }}
          </p>
        }

        <button mat-flat-button type="submit" class="submit" [disabled]="busy() || form.invalid">
          @if (busy()) {
            <mat-spinner diameter="20" />
          }
          {{ busy() ? 'Signing in…' : 'Sign in' }}
        </button>

        <section class="demo" aria-labelledby="demo-title">
          <h2 id="demo-title">Demo accounts</h2>
          <p class="muted">
            Choose one to fill the email. The shared demo password is in the API's development
            settings.
          </p>
          <mat-chip-set aria-label="Demo accounts">
            @for (a of demoAccounts; track a.email) {
              <mat-chip-option [selected]="email === a.email" (click)="email = a.email">{{
                a.label
              }}</mat-chip-option>
            }
          </mat-chip-set>
        </section>
      </form>
    </main>
  `,
  styles: `
    .wrap {
      min-height: 100dvh;
      display: grid;
      place-items: center;
      padding: var(--app-space-4);
    }
    .panel {
      width: min(420px, 100%);
      display: grid;
      gap: var(--app-space-2);
      padding: var(--app-space-6);
    }
    .intro {
      display: grid;
      gap: var(--app-space-1);
      margin-bottom: var(--app-space-3);
    }
    h1 span {
      color: var(--mat-sys-primary);
    }
    .error {
      display: flex;
      align-items: center;
      gap: var(--app-space-2);
      padding: var(--app-space-3);
      border-radius: var(--mat-sys-corner-small);
      background: var(--app-critical-bg);
    }
    .error mat-icon {
      color: var(--app-critical);
      flex: none;
    }
    .submit {
      --mat-button-filled-container-height: 48px;
      margin-top: var(--app-space-2);
    }
    .demo {
      display: grid;
      gap: var(--app-space-2);
      margin-top: var(--app-space-4);
      padding-top: var(--app-space-4);
      border-top: 1px solid var(--mat-sys-outline-variant);
    }
    .demo h2 {
      font: var(--mat-sys-title-small);
    }
    .demo p {
      font: var(--mat-sys-body-small);
    }
  `,
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly demoAccounts = DEMO_ACCOUNTS;
  protected email = '';
  protected password = '';
  protected readonly showPassword = signal(false);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  submit() {
    this.busy.set(true);
    this.error.set(null);
    this.auth.login(this.email.trim(), this.password).subscribe({
      next: () => void this.router.navigateByUrl(this.auth.homeRoute()),
      error: (e: HttpErrorResponse) => {
        this.busy.set(false);
        this.error.set(
          e.status === 0
            ? 'Cannot reach the server. Check that the API is running.'
            : (e.error?.message ?? 'Sign-in failed. Check your email and password.'),
        );
      },
    });
  }
}
