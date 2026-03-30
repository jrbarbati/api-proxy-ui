import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Route } from '../models';
import { environment } from '../../environments/environment';

export interface RoutePayload {
  id: number | null;
  pattern: string;
  backend_url: string;
  method: string;
}

@Injectable({ providedIn: 'root' })
export class RoutesService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.adminApiBase}/routes`;

  async getRoutes(): Promise<Route[]> {
    return firstValueFrom(this.http.get<Route[]>(this.base));
  }

  async createRoute(payload: RoutePayload): Promise<Route> {
    return firstValueFrom(this.http.post<Route>(this.base, payload));
  }

  async updateRoute(route: Route, payload: RoutePayload): Promise<Route> {
    return firstValueFrom(this.http.put<Route>(`${this.base}/${route.id}`, payload));
  }

  async inactivateRoute(route: Route): Promise<Route> {
    return firstValueFrom(
      this.http.put<Route>(`${this.base}/${route.id}`, {
        ...route,
        inactivated_at: new Date().toISOString(),
      }),
    );
  }

  async reactivateRoute(route: Route): Promise<Route> {
    return firstValueFrom(
      this.http.put<Route>(`${this.base}/${route.id}`, {
        ...route,
        inactivated_at: null,
      }),
    );
  }
}
