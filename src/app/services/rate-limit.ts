import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { RateLimit } from '../models';

export interface RateLimitPayload {
  org_id: number;
  service_account_id: number | null;
  limit_per_minute: number;
}

@Injectable({ providedIn: 'root' })
export class RateLimitsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.adminApiBase}/rate-limits`;

  getRateLimits(): Promise<RateLimit[]> {
    return firstValueFrom(this.http.get<RateLimit[]>(this.base));
  }

  createRateLimit(payload: RateLimitPayload): Promise<RateLimit> {
    return firstValueFrom(this.http.post<RateLimit>(this.base, payload));
  }

  updateRateLimit(limit: RateLimit, limitPerMinute: number): Promise<RateLimit> {
    return firstValueFrom(
      this.http.put<RateLimit>(`${this.base}/${limit.id}`, {
        ...limit,
        limit_per_minute: limitPerMinute,
        updated_at: new Date().toISOString(),
      }),
    );
  }

  inactivateRateLimit(limit: RateLimit): Promise<RateLimit> {
    return firstValueFrom(
      this.http.put<RateLimit>(`${this.base}/${limit.id}`, {
        ...limit,
        inactivated_at: new Date().toISOString(),
      }),
    );
  }

  reactivateRateLimit(limit: RateLimit): Promise<RateLimit> {
    return firstValueFrom(
      this.http.put<RateLimit>(`${this.base}/${limit.id}`, {
        ...limit,
        inactivated_at: null,
      }),
    );
  }
}
