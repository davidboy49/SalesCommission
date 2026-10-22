import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../core/auth';

@Component({
  selector: 'app-login',
  imports: [FormsModule],
  template: `
    <main class="wrap">
      <form class="card" (ngSubmit)="submit()" #form="ngForm">
        <h1>Sales <span class="accent">Commission</span></h1>
        <p class="muted">Sign in to see commission results.</p>

        <label class="field">
          Email
          <input name="email" type="email" autocomplete="username" required [(ngModel)]="email" />
        </label>
        <label class="field">
          Password
          <input name="password" type="password" autocomplete="current-password" required [(ngModel)]="password" />
        </label>

        @if (error()) {
          <p class="notice bad" role="alert">{{ error() }}</p>
        }

        <button class="btn primary" type="submit" [disabled]="busy() || form.invalid">
          {{ busy() ? 'Signing in…' : 'Sign in' }}
        </button>

        <details>
          <summary class="muted">Demo accounts</summary>
          <ul class="muted">
            <li>admin&#64;hanuman.local — full access</li>
            <li>finance&#64;hanuman.local — run calculations</li>
            <li>manager&#64;hanuman.local — one region</li>
            <li>supervisor&#64;hanuman.local — one team</li>
            <li>rep&#64;hanuman.local — own commission (mobile view)</li>
          </ul>
          <p class="muted">The shared demo password is set in the API's appsettings.Development.json.</p>
        </details>
      </form>
    </main>
  `,
  styles: `
    .wrap {
      min-height: 100dvh;
      display: grid;
      place-items: center;
      padding: 16px;
    }
    form {
      width: min(400px, 100%);
      display: grid;
      gap: 14px;
    }
    .accent {
      color: var(--accent);
    }
    h1 {
      margin: 0;
    }
    p {
      margin: 0;
    }
    ul {
      padding-left: 18px;
      margin: 8px 0;
    }
  `,
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected email = '';
  protected password = '';
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
            ? 'Cannot reach the server. Is the API running?'
            : (e.error?.message ?? 'Sign-in failed.'),
        );
      },
    });
  }
}
