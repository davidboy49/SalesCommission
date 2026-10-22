import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { catchError, tap, throwError } from 'rxjs';
import { API_URL } from './api';
import { LoginResponse } from './models';

const STORAGE_KEY = 'sc.session';
const OFFICE_ROLES = ['Admin', 'Finance'];
const REVIEWER_ROLES = [...OFFICE_ROLES, 'Manager', 'Supervisor'];

function loadSession(): LoginResponse | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as LoginResponse;
    return new Date(session.expiresUtc).getTime() > Date.now() ? session : null;
  } catch {
    return null;
  }
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  readonly session = signal<LoginResponse | null>(loadSession());
  readonly isLoggedIn = computed(() => this.session() !== null);
  readonly isOffice = computed(() => this.hasAnyRole(OFFICE_ROLES));
  readonly isReviewer = computed(() => this.hasAnyRole(REVIEWER_ROLES));

  hasAnyRole(roles: string[]): boolean {
    return this.session()?.roles.some((r) => roles.includes(r)) ?? false;
  }

  login(email: string, password: string) {
    return this.http.post<LoginResponse>(`${API_URL}/auth/login`, { email, password }).pipe(
      tap((session) => {
        this.session.set(session);
        try {
          sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
        } catch {
          // Storage can be blocked; the session then lasts until the page reloads.
        }
      }),
    );
  }

  logout() {
    this.session.set(null);
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // nothing to clear
    }
    void this.router.navigate(['/login']);
  }

  /** Where a user lands after signing in: reps get their own phone-friendly view. */
  homeRoute(): string {
    return this.isReviewer() ? '/dashboard' : '/me';
  }
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.session()?.token;
  const authorized = token && req.url.startsWith(API_URL) ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;
  return next(authorized).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && !req.url.endsWith('/auth/login')) auth.logout();
      return throwError(() => error);
    }),
  );
};

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.isLoggedIn() || inject(Router).createUrlTree(['/login']);
};

export function roleGuard(roles: string[]): CanActivateFn {
  return () => {
    const auth = inject(AuthService);
    return auth.hasAnyRole(roles) || inject(Router).createUrlTree([auth.homeRoute()]);
  };
}

export const REVIEWERS = REVIEWER_ROLES;
export const OFFICE = OFFICE_ROLES;
