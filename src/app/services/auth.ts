import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AccessToken, InternalAuthTokenRequest } from '../models';
import { environment } from '../../environments/environment';

const TOKEN_KEY = 'api_proxy_token';
const TOKEN_AT_KEY = 'api_proxy_token_at';
const TOKEN_TTL_KEY = 'api_proxy_token_ttl';
const REFRESH_BUFFER_MS = 60_000; // re-auth 60s before expiry

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly _token = signal<string | null>(localStorage.getItem(TOKEN_KEY));

  private credentials: { email: string; password: string } | null = null;
  private refreshTimer: ReturnType<typeof setTimeout> | null = null;

  readonly token = this._token.asReadonly();
  readonly isAuthenticated = computed(() => this._token() !== null);

  constructor() {
    const storedAt = localStorage.getItem(TOKEN_AT_KEY);
    const storedTtl = localStorage.getItem(TOKEN_TTL_KEY);
    if (this._token() && storedAt && storedTtl) {
      const refreshMs = parseInt(storedTtl, 10);
      const elapsed = Date.now() - parseInt(storedAt, 10);
      if (elapsed >= refreshMs) {
        // Already expired — clear silently; auth guard will redirect on next navigation
        this._token.set(null);
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(TOKEN_AT_KEY);
        localStorage.removeItem(TOKEN_TTL_KEY);
      } else {
        // Valid token but no credentials in memory after a page reload —
        // schedule a logout at the natural expiry point
        this.scheduleExpiry(refreshMs - elapsed);
      }
    }
  }

  async login(email: string, password: string): Promise<void> {
    const body: InternalAuthTokenRequest = { email, password };
    const response = await firstValueFrom(
      this.http.post<AccessToken>(environment.loginUri, body),
    );
    this.credentials = { email, password };
    this.storeToken(response.access_token, response.expires_in);
    this.scheduleRefresh(response.expires_in);
  }

  logout(): void {
    this.clearTimer();
    this.credentials = null;
    this._token.set(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(TOKEN_AT_KEY);
    localStorage.removeItem(TOKEN_TTL_KEY);
    this.router.navigate(['/login']);
  }

  private async refresh(): Promise<void> {
    if (!this.credentials) {
      this.logout();
      return;
    }
    try {
      const body: InternalAuthTokenRequest = this.credentials;
      const response = await firstValueFrom(
        this.http.post<AccessToken>(environment.loginUri, body),
      );
      this.storeToken(response.access_token, response.expires_in);
      this.scheduleRefresh(response.expires_in);
    } catch {
      this.logout();
    }
  }

  private storeToken(token: string, expiresIn: number): void {
    const refreshMs = expiresIn * 1000 - REFRESH_BUFFER_MS;
    this._token.set(token);
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(TOKEN_AT_KEY, String(Date.now()));
    localStorage.setItem(TOKEN_TTL_KEY, String(refreshMs));
  }

  private scheduleRefresh(expiresIn: number): void {
    this.clearTimer();
    const refreshMs = expiresIn * 1000 - REFRESH_BUFFER_MS;
    this.refreshTimer = setTimeout(() => this.refresh(), refreshMs);
  }

  private scheduleExpiry(ms: number): void {
    this.clearTimer();
    this.refreshTimer = setTimeout(() => this.logout(), ms);
  }

  private clearTimer(): void {
    if (this.refreshTimer !== null) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }
}
