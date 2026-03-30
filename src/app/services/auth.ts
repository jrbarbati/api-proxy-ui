import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AccessToken, InternalAuthTokenRequest } from '../models';
import { environment } from '../../environments/environment';

const TOKEN_KEY = 'api_proxy_token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly _token = signal<string | null>(localStorage.getItem(TOKEN_KEY));

  readonly token = this._token.asReadonly();
  readonly isAuthenticated = computed(() => this._token() !== null);

  async login(email: string, password: string): Promise<void> {
    const body: InternalAuthTokenRequest = { email, password };
    const response = await firstValueFrom(
      this.http.post<AccessToken>(environment.loginUri, body),
    );
    this._token.set(response.access_token);
    localStorage.setItem(TOKEN_KEY, response.access_token);
  }

  logout(): void {
    this._token.set(null);
    localStorage.removeItem(TOKEN_KEY);
    this.router.navigate(['/login']);
  }
}
