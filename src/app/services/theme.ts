import { Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly _isDark = signal(this.resolveInitialTheme());
  readonly isDark = this._isDark.asReadonly();

  constructor() {
    this.applyTheme(this._isDark());
  }

  toggle(): void {
    const next = !this._isDark();
    this._isDark.set(next);
    localStorage.setItem(STORAGE_KEY, next ? 'dark' : 'light');
    this.applyTheme(next);
  }

  private resolveInitialTheme(): boolean {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return stored === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  private applyTheme(isDark: boolean): void {
    document.documentElement.classList.toggle('dark', isDark);
  }
}
