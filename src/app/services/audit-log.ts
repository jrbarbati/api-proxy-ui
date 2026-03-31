import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuditEntry } from '../models/audit-log';

@Injectable({ providedIn: 'root' })
export class AuditLogService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.adminApiBase}/audit-log`;

  getEntries(limit = 200): Promise<AuditEntry[]> {
    return firstValueFrom(this.http.get<AuditEntry[]>(this.base, { params: { limit } }));
  }
}
