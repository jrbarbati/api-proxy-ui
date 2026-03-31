import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { InternalUser } from '../models';

export interface CreateUserPayload {
  email: string;
  password: string;
}

@Injectable({ providedIn: 'root' })
export class UsersService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.adminApiBase}/users`;

  getUsers(): Promise<InternalUser[]> {
    return firstValueFrom(this.http.get<InternalUser[]>(this.base));
  }

  createUser(payload: CreateUserPayload): Promise<InternalUser> {
    return firstValueFrom(this.http.post<InternalUser>(this.base, payload));
  }

  inactivateUser(user: InternalUser): Promise<InternalUser> {
    return firstValueFrom(
      this.http.put<InternalUser>(`${this.base}/${user.id}`, {
        ...user,
        inactivated_at: new Date().toISOString(),
      }),
    );
  }

  reactivateUser(user: InternalUser): Promise<InternalUser> {
    return firstValueFrom(
      this.http.put<InternalUser>(`${this.base}/${user.id}`, {
        ...user,
        inactivated_at: null,
      }),
    );
  }
}
