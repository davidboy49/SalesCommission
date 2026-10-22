import { Routes } from '@angular/router';
import { OFFICE, REVIEWERS, authGuard, roleGuard } from './core/auth';

const TITLE = 'Sales Commission';

// Every page is lazy-loaded, so someone opening only their own commission never downloads the admin screens.
export const routes: Routes = [
  {
    path: 'login',
    title: `Sign in · ${TITLE}`,
    loadComponent: () => import('./features/auth/login').then((m) => m.Login),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/shell').then((m) => m.Shell),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        title: `Dashboard · ${TITLE}`,
        canActivate: [roleGuard(REVIEWERS)],
        loadComponent: () => import('./features/dashboard/dashboard').then((m) => m.DashboardPage),
      },
      {
        path: 'results',
        title: `Results · ${TITLE}`,
        canActivate: [roleGuard(REVIEWERS)],
        loadComponent: () => import('./features/results/results').then((m) => m.ResultsPage),
      },
      {
        path: 'results/:id',
        title: `Result · ${TITLE}`,
        canActivate: [roleGuard(REVIEWERS)],
        loadComponent: () =>
          import('./features/results/result-detail').then((m) => m.ResultDetailPage),
      },
      {
        path: 'me',
        title: `My commission · ${TITLE}`,
        loadComponent: () => import('./features/me/my-commission').then((m) => m.MyCommissionPage),
      },
      {
        path: 'plans',
        title: `Plans · ${TITLE}`,
        canActivate: [roleGuard(OFFICE)],
        loadComponent: () => import('./features/plans/plans').then((m) => m.PlansPage),
      },
      {
        path: 'employees',
        title: `Employees · ${TITLE}`,
        canActivate: [roleGuard(OFFICE)],
        loadComponent: () => import('./features/employees/employees').then((m) => m.EmployeesPage),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
