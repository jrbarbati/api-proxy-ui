import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AccessToken, InternalAuthTokenRequest } from '../models';
import { environment } from '../../environments/environment';

const TOKEN_KEY    = 'api_proxy_token';
const TOKEN_AT_KEY = 'api_proxy_token_at';
const TOKEN_TTL_KEY = 'api_proxy_token_ttl';

const WARNING_LEAD_MS = 2 * 60 * 1000; // show warning 2 min before expiry
const REFRESH_BUFFER_MS = 5_000;        // re-auth 5s before the 2-min window opens

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly _token = signal<string | null>(localStorage.getItem(TOKEN_KEY));

  private credentials: { email: string; password: string } | null = null;
  private warningTimer: ReturnType<typeof setTimeout> | null = null;

  readonly token = this._token.asReadonly();
  readonly isAuthenticated = computed(() => this._token() !== null);

  // Exposed to app root — true triggers the session warning modal
  readonly showWarning = signal(false);

  constructor() {
    const storedAt  = localStorage.getItem(TOKEN_AT_KEY);
    const storedTtl = localStorage.getItem(TOKEN_TTL_KEY);

    if (this._token() && storedAt && storedTtl) {
      const totalMs  = parseInt(storedTtl, 10);  // full token lifetime in ms
      const elapsed  = Date.now() - parseInt(storedAt, 10);
      const remaining = totalMs - elapsed;

      if (remaining <= 0) {
        // Already expired — clear silently; auth guard redirects on next nav
        this.clearToken();
      } else if (remaining <= WARNING_LEAD_MS) {
        // Inside the warning window — show modal immediately
        this.showWarning.set(true);
      } else {
        // Healthy — schedule the warning
        this.scheduleWarning(remaining - WARNING_LEAD_MS);
      }
    }
  }

  async login(email: string, password: string): Promise<void> {
    const response = await firstValueFrom(
      this.http.post<AccessToken>(environment.loginUri, { email, password } satisfies InternalAuthTokenRequest),
    );
    this.credentials = { email, password };
    this.storeToken(response.access_token, response.expires_in);
    this.scheduleWarning(response.expires_in * 1000 - WARNING_LEAD_MS - REFRESH_BUFFER_MS);
  }

  async extendSession(): Promise<void> {
    if (!this.credentials) {
      this.logout();
      return;
    }
    try {
      const response = await firstValueFrom(
        this.http.post<AccessToken>(environment.loginUri, this.credentials satisfies InternalAuthTokenRequest),
      );
      this.showWarning.set(false);
      this.storeToken(response.access_token, response.expires_in);
      this.scheduleWarning(response.expires_in * 1000 - WARNING_LEAD_MS - REFRESH_BUFFER_MS);
    } catch {
      this.logout();
    }
  }

  logout(): void {
    this.clearWarningTimer();
    this.showWarning.set(false);
    this.credentials = null;
    this.clearToken();
    this.router.navigate(['/login']);
  }

  private storeToken(token: string, expiresIn: number): void {
    this._token.set(token);
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(TOKEN_AT_KEY, String(Date.now()));
    localStorage.setItem(TOKEN_TTL_KEY, String(expiresIn * 1000));
  }

  private clearToken(): void {
    this._token.set(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(TOKEN_AT_KEY);
    localStorage.removeItem(TOKEN_TTL_KEY);
  }

  private scheduleWarning(delayMs: number): void {
    this.clearWarningTimer();
    this.warningTimer = setTimeout(() => this.showWarning.set(true), delayMs);
  }

  private clearWarningTimer(): void {
    if (this.warningTimer !== null) {
      clearTimeout(this.warningTimer);
      this.warningTimer = null;
    }
  }
}
