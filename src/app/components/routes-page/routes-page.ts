import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { NgClass } from '@angular/common';
import { RoutesService, RoutePayload } from '../../services/routes';
import { ToastService } from '../../services/toast';
import { Route } from '../../models';
import { parseUTC } from '../../utils/date';

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

@Component({
  selector: 'app-routes-page',
  imports: [NgClass],
  templateUrl: './routes-page.html',
  styleUrl: './routes-page.css',
})
export class RoutesPage implements OnInit {
  private readonly routesSvc = inject(RoutesService);
  private readonly toast = inject(ToastService);

  readonly methods = METHODS;
  readonly routes = signal<Route[]>([]);
  readonly loading = signal(true);
  readonly showInactivated = signal(false);

  readonly visibleRoutes = computed(() => {
    const show = this.showInactivated();
    return this.routes().filter(r => show || !r.inactivated_at);
  });

  readonly activeCount = computed(() => this.routes().filter(r => !r.inactivated_at).length);
  readonly inactiveCount = computed(() => this.routes().filter(r => !!r.inactivated_at).length);

  // Form state
  readonly formOpen = signal(false);
  readonly editingRoute = signal<Route | null>(null);
  readonly formMethod = signal('GET');
  readonly formPattern = signal('');
  readonly formBackendUrl = signal('');
  readonly formSaving = signal(false);

  async ngOnInit(): Promise<void> {
    await this.loadRoutes();
  }

  private async loadRoutes(): Promise<void> {
    try {
      this.routes.set(await this.routesSvc.getRoutes());
    } catch {
      this.toast.error('Failed to load routes', 'Could not reach the API proxy.');
    } finally {
      this.loading.set(false);
    }
  }

  openAdd(): void {
    this.editingRoute.set(null);
    this.formMethod.set('GET');
    this.formPattern.set('');
    this.formBackendUrl.set('');
    this.formOpen.set(true);
  }

  openEdit(route: Route): void {
    this.editingRoute.set(route);
    this.formMethod.set(route.method);
    this.formPattern.set(route.pattern);
    this.formBackendUrl.set(route.backend_url);
    this.formOpen.set(true);
  }

  closeForm(): void {
    this.formOpen.set(false);
  }

  async saveForm(): Promise<void> {
    const id = !!this.editingRoute() ? this.editingRoute()!.id : null;
    const pattern = this.formPattern().trim();
    const backend_url = this.formBackendUrl().trim();

    if (!pattern || !backend_url) {
      this.toast.warning('Missing fields', 'Pattern and backend URL are required.');
      return;
    }

    const payload: RoutePayload = { id, pattern, backend_url, method: this.formMethod() };
    this.formSaving.set(true);
    try {
      const editing = this.editingRoute();
      if (editing) {
        const updated = await this.routesSvc.updateRoute(editing, payload);
        this.routes.update(rs => rs.map(r => (r.id === updated.id ? updated : r)));
        this.toast.success('Route updated');
      } else {
        const created = await this.routesSvc.createRoute(payload);
        this.routes.update(rs => [...rs, created]);
        this.toast.success('Route created');
      }
      this.formOpen.set(false);
    } catch {
      this.toast.error('Save failed', 'Could not save the route.');
    } finally {
      this.formSaving.set(false);
    }
  }

  async inactivate(route: Route): Promise<void> {
    try {
      const updated = await this.routesSvc.inactivateRoute(route);
      this.routes.update(rs => rs.map(r => (r.id === updated.id ? updated : r)));
      this.toast.warning('Route inactivated', route.pattern);
    } catch {
      this.toast.error('Failed to inactivate route');
    }
  }

  async reactivate(route: Route): Promise<void> {
    try {
      const updated = await this.routesSvc.reactivateRoute(route);
      this.routes.update(rs => rs.map(r => (r.id === updated.id ? updated : r)));
      this.toast.success('Route reactivated', route.pattern);
    } catch {
      this.toast.error('Failed to reactivate route');
    }
  }

  formatDate(iso: string): string {
    return parseUTC(iso).toLocaleString([], {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }
}
