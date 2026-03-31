import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login';
import { Layout } from './components/layout/layout';
import { authGuard } from './guards/auth';
import { guestGuard } from './guards/guest';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'login', component: LoginComponent, canActivate: [guestGuard] },
  {
    path: '',
    component: Layout,
    canActivate: [authGuard],
    children: [
      { path: 'dashboard', loadComponent: () => import('./components/dashboard/dashboard').then(m => m.Dashboard) },
      { path: 'log', loadComponent: () => import('./components/request-log-page/request-log-page').then(m => m.RequestLogPage) },
      { path: 'routes', loadComponent: () => import('./components/routes-page/routes-page').then(m => m.RoutesPage) },
      { path: 'rate-limits', loadComponent: () => import('./components/rate-limits-page/rate-limits-page').then(m => m.RateLimitsPage) },
      { path: 'orgs', loadComponent: () => import('./components/orgs-page/orgs-page').then(m => m.OrgsPage) },
      { path: 'service-accounts', loadComponent: () => import('./components/service-accounts-page/service-accounts-page').then(m => m.ServiceAccountsPage) },
      { path: 'users', loadComponent: () => import('./components/users-page/users-page').then(m => m.UsersPage) },
      { path: 'audit', loadComponent: () => import('./components/audit-log-page/audit-log-page').then(m => m.AuditLogPage) },
    ],
  },
];
