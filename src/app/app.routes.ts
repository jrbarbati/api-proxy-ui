import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login';
import { Layout } from './components/layout/layout';
import { Dashboard } from './components/dashboard/dashboard';
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
      { path: 'routes', loadComponent: () => import('./components/routes-page/routes-page').then(m => m.RoutesPage) },
    ],
  },
];
