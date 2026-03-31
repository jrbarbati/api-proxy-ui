import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { ServiceAccount } from '../models';

@Injectable({ providedIn: 'root' })
export class ServiceAccountsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.adminApiBase}/service-accounts`;

  getServiceAccounts(): Promise<ServiceAccount[]> {
    return firstValueFrom(this.http.get<ServiceAccount[]>(this.base));
  }

  createServiceAccount(orgId: number, identifier: string): Promise<ServiceAccount> {
    return firstValueFrom(this.http.post<ServiceAccount>(this.base, { org_id: orgId, identifier }));
  }

  inactivateServiceAccount(sa: ServiceAccount): Promise<ServiceAccount> {
    return firstValueFrom(
      this.http.put<ServiceAccount>(`${this.base}/${sa.id}`, {
        ...sa,
        inactivated_at: new Date().toISOString(),
      }),
    );
  }

  reactivateServiceAccount(sa: ServiceAccount): Promise<ServiceAccount> {
    return firstValueFrom(
      this.http.put<ServiceAccount>(`${this.base}/${sa.id}`, {
        ...sa,
        inactivated_at: null,
      }),
    );
  }
}
