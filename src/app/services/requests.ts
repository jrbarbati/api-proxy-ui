import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Request } from '../models';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class RequestsService {
  private readonly http = inject(HttpClient);

  async getRequests(from: Date, to: Date): Promise<Request[]> {
    const params = new HttpParams()
      .set('from', from.toISOString())
      .set('to', to.toISOString());
    return firstValueFrom(
      this.http.get<Request[]>(`${environment.adminApiBase}/requests`, { params }),
    );
  }
}
