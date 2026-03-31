import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { Org } from '../models';

export interface OrgPayload {
  name: string;
}

@Injectable({ providedIn: 'root' })
export class OrgsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.adminApiBase}/orgs`;

  getOrgs(): Promise<Org[]> {
    return firstValueFrom(this.http.get<Org[]>(this.base));
  }

  async createOrg(name: string): Promise<Org> {
    return firstValueFrom(this.http.post<Org>(this.base, { name }));
  }

  async updateOrg(org: Org, name: string): Promise<Org> {
    return firstValueFrom(
      this.http.put<Org>(`${this.base}/${org.id}`, {
        ...org,
        name,
        updated_at: new Date().toISOString(),
      }),
    );
  }

  async inactivateOrg(org: Org): Promise<Org> {
    return firstValueFrom(
      this.http.put<Org>(`${this.base}/${org.id}`, {
        ...org,
        inactivated_at: new Date().toISOString(),
      }),
    );
  }

  async reactivateOrg(org: Org): Promise<Org> {
    return firstValueFrom(
      this.http.put<Org>(`${this.base}/${org.id}`, {
        ...org,
        inactivated_at: null,
      }),
    );
  }
}
