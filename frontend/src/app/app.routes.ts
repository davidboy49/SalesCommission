import { Routes } from '@angular/router';
import { Shell } from './shell';
import { OFFICE, REVIEWERS, authGuard, roleGuard } from './core/auth';
import { DashboardPage } from './pages/dashboard';
import { EmployeesPage } from './pages/employees';
import { Login } from './pages/login';
import { MyCommissionPage } from './pages/my-commission';
import { PlansPage } from './pages/plans';
import { ResultDetailPage } from './pages/result-detail';
import { ResultsPage } from './pages/results';

export const routes: Routes = [
  { path: 'login', component: Login, title: 'Sign in' },
  {
    path: '',
    component: Shell,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'dashboard', component: DashboardPage, title: 'Dashboard', canActivate: [roleGuard(REVIEWERS)] },
      { path: 'results', component: ResultsPage, title: 'Results', canActivate: [roleGuard(REVIEWERS)] },
      { path: 'results/:id', component: ResultDetailPage, title: 'Result', canActivate: [roleGuard(REVIEWERS)] },
      { path: 'me', component: MyCommissionPage, title: 'My commission' },
      { path: 'plans', component: PlansPage, title: 'Plans', canActivate: [roleGuard(OFFICE)] },
      { path: 'employees', component: EmployeesPage, title: 'Employees', canActivate: [roleGuard(OFFICE)] },
    ],
  },
  { path: '**', redirectTo: '' },
];
